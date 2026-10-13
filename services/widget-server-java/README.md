# Widget Server (Java)

A small Java 25 service that serves a ChatSupport-style **widget loader script** and a demo page. It copies the layout of [`chatsupport-enterprise/engineering/services/widget-server`](https://github.com/Adaptavant/chatsupport-enterprise/tree/main/engineering/services/widget-server) (a TypeScript/Express service) and the Gradle setup of that repo's Java services (`widget-api`, `dashboard-api`). Its purpose is to show how a **Gradle project behaves with moon's remote cache**.

It uses only the JDK (`com.sun.net.httpserver`) and JUnit 5. There is no Spring, so builds stay small. A Spring Boot `bootJar` would be cached the same way.

## Layout

| widget-server (TS)                  | widget-server-java                                                 |
| ----------------------------------- | ------------------------------------------------------------------ |
| `server.ts`                         | `src/main/java/com/cs/widgetserver/WidgetServerApplication.java`   |
| `src/router.ts`                     | `src/main/java/com/cs/widgetserver/Router.java`                    |
| `src/controller/ClientController.ts`| `src/main/java/com/cs/widgetserver/controller/ClientController.java` |
| `src/services/ProjectService.ts`    | `src/main/java/com/cs/widgetserver/services/ProjectService.java` (in-memory, no Datastore) |
| `src/common/{Constants,Utils}.ts`   | `src/main/java/com/cs/widgetserver/common/{Constants,Utils}.java`  |
| `src/pages/*.html`                  | `src/main/resources/pages/*.html` (bundled into the jar)           |
| `*.test.ts` next to sources         | `src/test/java/...Test.java` (Gradle convention)                   |
| `package.json` scripts              | `build.gradle` + shared Gradle root in `services/`                 |
| `moon.yml`, `Dockerfile`, `.gcloudignore`, `catalog-info.yaml`, `catalog/` | same files |

The Gradle root (`services/settings.gradle`, `services/build.gradle`, `services/gradlew`, `services/gradle/`) matches `engineering/services` in chatsupport-enterprise: same wrapper (Gradle 9.1.0), same daemon JVM pin (`toolchainVersion=25`), same foojay toolchain resolver. moon tasks call `../gradlew :widget-server-java:<task>`.

## Quick start

Needs a JDK 25 on `PATH` or `JAVA_HOME`. Gradle can also download one through foojay.

```bash
moon run widget-server-java:serve        # builds (or restores) the jar, serves on :3003
curl localhost:3003/api/client/get/script/demo
```

| Task   | Command                            | Cached | Description                                    |
| ------ | ---------------------------------- | ------ | ---------------------------------------------- |
| Build  | `moon run widget-server-java:build`| yes    | `gradlew assemble` → `build/libs/widget-server-java.jar` |
| Test   | `moon run widget-server-java:test` | yes    | `gradlew test` (+ JaCoCo XML), runs after build |
| Serve  | `moon run widget-server-java:serve`| no     | `java -jar` on the built jar, `PORT=3003`      |
| Image  | `moon run widget-server-java:image`| no     | `docker build` that copies the prebuilt jar    |

Endpoints: `GET /api/client/get/script/{projectId}` and `/client/get/script/{projectId}` (seeded ids: `demo`, `acme`), `GET /health`, `GET /` (demo page).

## How moon caching is set up for Java

moon has no Java toolchain, so the tasks use `toolchains: 'system'` and call the Gradle wrapper. In chatsupport-enterprise, every Java task sets `options.cache: false`, so moon always starts Gradle and only Gradle's own up-to-date checks help. Here moon caching is turned on:

1. **Inputs**: `src/**/*`, the project `build.gradle`, and the shared Gradle root (`/services/build.gradle`, `/services/settings.gradle`, `/services/gradle/**/*`), excluding `**/*.md`. A wrapper or JDK pin change invalidates every Java task. A README edit invalidates nothing.
2. **Outputs**: `build/libs` for `build`; `build/test-results/test` and the JaCoCo XML for `test`. moon archives these per hash and uploads them to bazel-remote.
3. **Reproducible jars**: `services/build.gradle` sets `preserveFileTimestamps = false` and `reproducibleFileOrder = true`. The same sources then give a byte-identical jar on every machine, so a restored jar and a freshly built one cannot differ.
4. **Inherited tasks dropped**: `.moon/tasks/all.yml` defines `build`/`test` as tsc/node tasks. Same-named project tasks would *merge* with those (inputs and deps append), so `workspace.inheritedTasks.exclude` removes them.
5. **`test` depends on `build`** so two Gradle runs never share `build/` at the same time. widget-api hit that race when both ran in parallel in CI.
6. **CI** installs Temurin 25 with `actions/setup-java` in `.github/actions/setup-moon-remote-cache`.

### Measured (2026-10-13, macOS, deployed Cloud Run cache)

| Scenario                                            | build                    | test                     |
| --------------------------------------------------- | ------------------------ | ------------------------ |
| Cold (Gradle download + compile)                    | executed, 9.9 s          | executed, 9.8 s          |
| Rerun, nothing changed                              | local hit                | local hit                |
| `rm -rf build/`                                     | local hit, jar restored  | local hit                |
| README-only change                                  | local hit                | local hit                |
| Source change (non-breaking)                        | executed, 1.1 s          | executed, 10.7 s         |
| Revert that change                                  | local hit                | local hit                |
| No `.moon/cache`, no `build/` (fresh machine)       | **remote hit**, 1.1 s    | **remote hit**, 0.9 s    |

The restored jar's sha256 matched the forced rebuild's (`de1b273f…`).

### Things to know

- **The JDK is not part of the hash.** moon hashes no Java toolchain version. The major version is pinned through `build.gradle` (an input), but a JDK patch upgrade will not invalidate the cache. Add the JDK version to the inputs or `env` if that matters.
- **A failed run blocks hydration once.** After a task fails, moon logs `Previous run failed, avoiding hydration` and runs the next attempt even if that hash is in the cache. Failed runs are never archived.
- **On a hit, Gradle never starts.** That saves the ~1 s client/daemon start-up and the configuration phase. On a miss, Gradle still uses its own incremental compile, so the two caches stack.
- **Gradle's build cache is separate.** Outputs moon does not declare (`build/classes`, `build/tmp`) are not restored. A later Gradle run after a moon hit recompiles from scratch, which is fine for CI but slower for local `gradlew` use.
- JDK 25 prints `WARNING: A restricted method in java.lang.System has been called` from Gradle's native platform library. It is harmless.

## Deploy

The Dockerfile does not compile anything. It copies `build/libs/widget-server-java.jar` into `gcr.io/distroless/java25-debian13`, so the jar comes from moon's cache when it is warm. widget-server does the same with its `dist/` artifact.
