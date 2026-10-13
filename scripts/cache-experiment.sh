#!/usr/bin/env bash
# Runs build+test the way a brand-new machine would (no local moon cache, no
# dist or Gradle build folders) and reports which tasks came from the remote cache.
#
#   scripts/cache-experiment.sh <label> [--expect remote|cached] [--keep-local]
#
# Results are appended to experiments/results/ for comparing runs.
set -euo pipefail
cd "$(dirname "$0")/.."

label="${1:?usage: scripts/cache-experiment.sh <label> [--expect remote|cached] [--keep-local]}"
shift
expect=()
keep_local=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --expect) expect=(--expect "$2"); shift 2 ;;
    --keep-local) keep_local=true; shift ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done

if [[ -z "${MOON_REMOTE_TOKEN:-}" && -z "${GITHUB_ACTIONS:-}" ]]; then
  echo "MOON_REMOTE_TOKEN is not set; run: source scripts/remote-cache-env.sh" >&2
  exit 1
fi

if [[ "$keep_local" == false ]]; then
  rm -rf .moon/cache
  find apps services packages -maxdepth 2 -name dist -type d -prune -exec rm -rf {} +
  find services -maxdepth 2 -name build -type d -prune -exec rm -rf {} +  # Gradle
fi

moon run :build :test
node scripts/cache-report.mjs --label "$label" --out experiments/results "${expect[@]}"
