#!/usr/bin/env bash
# Deploys bazel-remote to Cloud Run with the GCS bucket as its backing store,
# grants cache access, points .moon/workspace.yml at the service and smoke tests it.
set -euo pipefail
# shellcheck source=infra/gcp/config.sh
source "$(dirname "$0")/config.sh"

# Notes on the flags:
# --no-allow-unauthenticated  only identities with roles/run.invoker can call it;
#                             moon passes a Google ID token as the bearer token.
# --no-cpu-throttling         bazel-remote uploads to GCS asynchronously after
#                             responding; with request-based billing the CPU is
#                             throttled between requests and uploads would stall.
# --max-instances 1           one local LRU, predictable cost. GCS is the
#                             durable layer, so scale-to-zero loses nothing.
log "Deploying ${SERVICE} (${IMAGE}) to ${REGION}"
gcloud run deploy "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE" \
  --service-account "$RUNTIME_SA" \
  --no-allow-unauthenticated \
  --port 8080 \
  --cpu 1 \
  --memory "$MEMORY" \
  --no-cpu-throttling \
  --min-instances 0 \
  --max-instances 1 \
  --concurrency 80 \
  --timeout 300 \
  --execution-environment gen2 \
  --args="--dir=/data,--max_size=${LOCAL_CACHE_GIB},--http_address=0.0.0.0:8080,--gcs_proxy.bucket=${BUCKET},--gcs_proxy.use_default_credentials"

url="$(gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format 'value(status.url)')"
echo "Service URL: ${url}"

log "Granting roles/run.invoker"
members=("user:$(gcloud config get-value account 2>/dev/null)")
if [[ -n "$DEV_MEMBERS" ]]; then
  IFS=',' read -r -a extra <<<"$DEV_MEMBERS"
  members+=("${extra[@]}")
fi
for member in "${members[@]}"; do
  echo "  ${member}"
  gcloud run services add-iam-policy-binding "$SERVICE" \
    --project "$PROJECT_ID" --region "$REGION" \
    --member "$member" --role roles/run.invoker >/dev/null
done

log "Pointing .moon/workspace.yml at ${url}"
sed -i.bak -E "s#^  host: '.*'#  host: '${url}'#" "${REPO_ROOT}/.moon/workspace.yml"
rm -f "${REPO_ROOT}/.moon/workspace.yml.bak"
grep -n "host:" "${REPO_ROOT}/.moon/workspace.yml"
echo "Commit this change: every machine must share the exact same workspace.yml,"
echo "because moon includes it in every task hash."

log "Smoke test (first call may cold-start)"
curl -fsS -H "Authorization: Bearer $(gcloud auth print-identity-token)" "${url}/status"
echo
