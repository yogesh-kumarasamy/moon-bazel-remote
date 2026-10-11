#!/usr/bin/env bash
# Enables APIs, creates the cache bucket and the runtime service account that
# bazel-remote uses to read/write the bucket. Safe to re-run.
set -euo pipefail
# shellcheck source=infra/gcp/config.sh
source "$(dirname "$0")/config.sh"

log "Enabling APIs in ${PROJECT_ID}"
gcloud services enable \
  run.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project "$PROJECT_ID"

log "Creating bucket gs://${BUCKET} in ${REGION}"
if gcloud storage buckets describe "gs://${BUCKET}" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "bucket already exists"
else
  gcloud storage buckets create "gs://${BUCKET}" \
    --project "$PROJECT_ID" \
    --location "$REGION" \
    --default-storage-class STANDARD \
    --uniform-bucket-level-access \
    --public-access-prevention
fi

log "Expiring cache objects after ${CACHE_RETENTION_DAYS} days"
lifecycle_file="$(mktemp)"
trap 'rm -f "$lifecycle_file"' EXIT
cat >"$lifecycle_file" <<EOF
{"rule": [{"action": {"type": "Delete"}, "condition": {"age": ${CACHE_RETENTION_DAYS}}}]}
EOF
gcloud storage buckets update "gs://${BUCKET}" --lifecycle-file "$lifecycle_file" --project "$PROJECT_ID"

log "Creating runtime service account ${RUNTIME_SA}"
if ! gcloud iam service-accounts describe "$RUNTIME_SA" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
    --project "$PROJECT_ID" \
    --display-name "bazel-remote Cloud Run runtime"
fi

log "Granting ${RUNTIME_SA} object access on gs://${BUCKET}"
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member "serviceAccount:${RUNTIME_SA}" \
  --role roles/storage.objectAdmin \
  --project "$PROJECT_ID" >/dev/null

log "Done. Next: ./infra/gcp/02-deploy.sh"
