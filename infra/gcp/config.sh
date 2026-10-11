# shellcheck shell=bash disable=SC2034
# Shared settings for the infra/gcp scripts. Sourced, not executed.
# Override any value with an env var, e.g. `PROJECT_ID=my-proj ./infra/gcp/01-bootstrap.sh`.

: "${PROJECT_ID:?Set PROJECT_ID to your GCP project id (gcloud projects list)}"

# us-central1 / us-east1 / us-west1 are the regions covered by the GCS free tier.
REGION="${REGION:-us-central1}"

SERVICE="${SERVICE:-bazel-remote}"
BUCKET="${BUCKET:-${PROJECT_ID}-bazel-remote-cache}"
IMAGE="${IMAGE:-docker.io/buchgr/bazel-remote-cache:v2.6.2}"

# bazel-remote keeps a local LRU in front of GCS. Cloud Run's disk is in-memory,
# so this counts against the container memory limit below.
LOCAL_CACHE_GIB="${LOCAL_CACHE_GIB:-1}"
MEMORY="${MEMORY:-2Gi}"

# GCS objects older than this are deleted by a lifecycle rule.
CACHE_RETENTION_DAYS="${CACHE_RETENTION_DAYS:-30}"

RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-bazel-remote-runtime}"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

CI_SA_NAME="${CI_SA_NAME:-moon-ci}"
CI_SA="${CI_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

GITHUB_REPO="${GITHUB_REPO:-yogesh-kumarasamy/moon-bazel-remote}"
WIF_POOL="${WIF_POOL:-github}"
WIF_PROVIDER="${WIF_PROVIDER:-github-oidc}"

# Extra identities allowed to use the cache, comma separated,
# e.g. DEV_MEMBERS="user:alice@gmail.com,user:bob@gmail.com"
DEV_MEMBERS="${DEV_MEMBERS:-}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
