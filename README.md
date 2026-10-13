# moon-bazel-remote

A [moon](https://moonrepo.dev) v2 monorepo used to try out **remote caching** with
[bazel-remote](https://github.com/buchgr/bazel-remote) running on **Cloud Run**,
backed by a **GCS bucket**. The goal is to see how cached task results move
between CI → CI, CI → dev, dev → CI and dev → dev.

## Layout

```
packages/            reusable libraries
  shared-utils/      formatting, grouping, money helpers
  logger/            structured JSON logger            (-> shared-utils)
  api-client/        domain types + typed fetch client (-> shared-utils)
services/
  users-api/         node:http service (-> api-client, logger, shared-utils)
  orders-api/        node:http service (-> api-client, logger, shared-utils)
  widget-server-java/  Java 25 / Gradle service, moon-cached (see its README)
  gradlew, *.gradle  Gradle root for the Java services (../gradlew :<project>:<task>)
apps/
  web/               esbuild browser bundle (-> api-client, shared-utils)
  admin-cli/         terminal report        (-> api-client, logger, shared-utils)
infra/gcp/           scripts that create the bucket, Cloud Run service and CI auth
scripts/             dev token helper and cache experiment/report scripts
.github/workflows/   CI: seed job + fresh-runner verification job
```

Every project inherits `build` (tsc → `dist/`) and `test` (`node --test`) from
`.moon/tasks/all.yml`; `web` overrides them with `typecheck` + esbuild.
Toolchain versions are pinned in `.prototools` and `.moon/toolchains.yml`.

```sh
moon run :build :test          # everything
moon run users-api:start       # http://localhost:3001/users
moon run orders-api:start      # http://localhost:3002/orders
moon run widget-server-java:serve  # http://localhost:3003/api/client/get/script/demo
moon run admin-cli:report      # needs both services running
```

## How the cache is wired

```
 dev laptop ──┐  Authorization: Bearer <Google ID token>
              ├──────────────► Cloud Run (private, IAM)  ──►  GCS bucket
 GitHub CI ───┘  HTTP /moon-outputs/{ac,cas}/<sha256>       bazel-remote      (durable store,
                                                            1 GiB in-memory    30-day expiry)
                                                            LRU in front
```

- `.moon/workspace.yml` → `remote.api: http`, `remote.host: <Cloud Run URL>`,
  `remote.auth.token: MOON_REMOTE_TOKEN`. moon sends that env var as a bearer token.
- Cloud Run only lets through identities holding `roles/run.invoker`, so no
  htpasswd or shared secret is needed. bazel-remote itself runs without auth.
- **Devs** get a token from `gcloud auth print-identity-token`
  (`source scripts/remote-cache-env.sh`).
- **CI** uses GitHub OIDC → Workload Identity Federation → the `moon-ci` service
  account → an ID token for the service URL. No JSON keys anywhere.
- bazel-remote's GCS proxy checks its local LRU first, then the bucket, and
  writes new blobs to both. Scaling to zero loses only the LRU.

## 1. Try it locally first (no GCP)

```sh
colima start
docker run -d --name bazel-remote-local -p 8080:8080 -v bazel-remote-data:/data \
  buchgr/bazel-remote-cache:v2.6.2 --dir=/data --max_size=1 --http_address=0.0.0.0:8080
# or `docker compose up -d` if the compose plugin is installed

# temporarily, do not commit:
sed -i '' "s#^  host: .*#  host: 'http://127.0.0.1.nip.io:8080'#" .moon/workspace.yml
export MOON_REMOTE_TOKEN=anything

scripts/cache-experiment.sh seed                    # executes and uploads
scripts/cache-experiment.sh fresh --expect remote   # wipes local cache, all remote hits
```

## 2. Deploy to GCP

One-time account setup (new free-trial account):

```sh
gcloud auth login                                  # the account that owns the project
gcloud projects create <project-id>                # or pick an existing one
gcloud billing accounts list
gcloud billing projects link <project-id> --billing-account <ACCOUNT_ID>
export PROJECT_ID=<project-id>
```

Then:

```sh
./infra/gcp/01-bootstrap.sh     # APIs, bucket + lifecycle rule, runtime service account
./infra/gcp/02-deploy.sh        # Cloud Run service, invoker grants, rewrites .moon/workspace.yml, smoke test
./infra/gcp/03-github-oidc.sh   # CI service account + Workload Identity Federation, sets GitHub repo variables
git add .moon/workspace.yml && git commit -m "chore: point moon at the remote cache"
```

To let teammates use the cache: `DEV_MEMBERS="user:a@x.com,user:b@y.com" ./infra/gcp/02-deploy.sh`.
Everything is configurable via env vars in `infra/gcp/config.sh` (region, bucket, memory, retention…).

Tear down with `./infra/gcp/99-teardown.sh` (asks for the project id; deletes the bucket contents).

## 3. Experiments

Each run of `scripts/cache-experiment.sh <label>` starts from an empty local
cache, runs `moon run :build :test`, prints where each task result came from
(`remote hit` / `local hit` / `executed`) and saves JSON to `experiments/results/`.

| Scenario | How | Expect |
| --- | --- | --- |
| **CI → CI** | Push to a branch. Job `build` seeds, job `verify-remote-hits` runs on a fresh runner with `--expect remote`. Re-run the workflow for a third data point. | 15/15 remote hits in the verify job; step summary shows the table. |
| **CI → dev** | After CI is green on `main`: `git pull && source scripts/remote-cache-env.sh && scripts/cache-experiment.sh ci-to-dev --expect remote` | All remote hits, `dist/` restored. |
| **dev → CI** | Change a package locally, `scripts/cache-experiment.sh dev-change`, push the same commit. | CI `build` job shows remote hits for the changed tasks. |
| **dev → dev** | Dev A runs a change. Dev B (or a second clone on the same laptop) checks out the same commit and runs `scripts/cache-experiment.sh dev-to-dev --expect remote`. | All remote hits. |
| **Invalidation** | Edit only `packages/logger/src/index.ts`. | logger, users-api, orders-api, admin-cli rebuild; shared-utils, api-client, web stay remote hits. |
| **CI-only writes** | Set `remote.cache.localReadOnly: true` and repeat dev → dev. | Devs download but never upload; only CI populates the cache. |

`moon run … --force` re-executes and re-uploads (also `bust_cache` input on the workflow).

## Results against the deployed GCP cache (2026-10-11)

Cloud Run `us-central1`, bucket in `us-central1`, dev machine in India.

| Scenario | Producer → consumer | Result |
| --- | --- | --- |
| dev → dev (same machine) | macOS seed → macOS with wiped local cache | 15/15 remote hits |
| dev → CI | macOS seed → GitHub `ubuntu-latest` build job | 15/15 remote hits, same hashes |
| CI → CI | build job → fresh runner job | 15/15 remote hits (asserted in CI) |
| CI → dev | CI builds a new commit → clean Linux container clones it | 15/15 remote hits |
| dev → dev | dev A builds an **uncommitted** logger change → dev B, same patch | A: 8 executed / 7 hits; B: 15/15 hits |

- A remote hit costs about 120 ms per task on GitHub runners and about 550 ms from India. For tasks this
  small, a remote hit is only slightly faster than running the task. The gain grows with task cost.
  Put Cloud Run and the bucket near your developers if latency matters; the GCS free tier only
  covers US regions.
- Uncommitted work is shareable: the hash is computed from file contents, not commits.

## Findings so far (validated locally against bazel-remote v2.6.2)

- macOS-built results are **remote hits on Linux** (`node:24-bookworm`): task hashes
  are identical across OSes when the inputs and pinned toolchain match.
- **`.moon/workspace.yml` is part of every task hash.** A per-machine edit
  (e.g. a different `remote.host`) invalidates the whole cache. Commit the real
  host once; never override it locally.
- Seed run ~6.7s → fresh-clone run ~0.75s with 15/15 remote hits.
- Invalidation follows the project graph exactly (8 executed / 7 hits for a logger change).
- moon disables a `localhost` remote when it thinks it runs in CI. It treats
  some agent env vars (e.g. `AI_AGENT`) as CI, hence the `127.0.0.1.nip.io` trick above.
- moon's pnpm plugin fails on a pnpm 8 (`lockfileVersion: 6.0`) lockfile
  (`Failed to parse a version … esbuild/freebsd-arm64@0.28.2`); `.prototools` pins pnpm 10.
- **Dev-machine drift:** inside moon, pnpm's global bin directory (`~/Library/pnpm` on macOS)
  comes before the proto-pinned pnpm on PATH. An old standalone pnpm there silently rewrites the
  lockfile. `engines.pnpm: ">=10"` makes this fail with `ERR_PNPM_UNSUPPORTED_ENGINE` instead.
  Fix it by removing the old binary or running `pnpm self-update`.

## Gotchas and costs

- ID tokens expire after ~1 hour; re-source `scripts/remote-cache-env.sh` on 401/403.
- Cloud Run caps HTTP/1 request bodies at 32 MiB. Fine for this repo; for big
  artifacts switch to gRPC (`--use-http2`, port 9092, `grpcs://` host).
- `--no-cpu-throttling` (instance-based billing) keeps background GCS uploads
  running. With `--min-instances 0` you pay only while an instance is up
  (it idles out ~15 min after the last request). Set a billing budget alert.
- GCS free tier: 5 GB-months in `us-central1`, `us-east1`, `us-west1`.
- Cold start on the first request after idle adds a second or two.
