#!/usr/bin/env bash
# Deletes everything the other scripts created. The bucket and its cache
# contents are deleted permanently.
set -euo pipefail
# shellcheck source=infra/gcp/config.sh
source "$(dirname "$0")/config.sh"

echo "This permanently deletes in ${PROJECT_ID}:"
echo "  Cloud Run service ${SERVICE} (${REGION})"
echo "  bucket gs://${BUCKET} and all cached artifacts"
echo "  service accounts ${RUNTIME_SA}, ${CI_SA}"
echo "  workload identity pool ${WIF_POOL}"
read -r -p "Type the project id to continue: " answer
[[ "$answer" == "$PROJECT_ID" ]] || { echo "aborted"; exit 1; }

gcloud run services delete "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --quiet || true
gcloud storage rm --recursive "gs://${BUCKET}" --project "$PROJECT_ID" --quiet || true
gcloud iam service-accounts delete "$RUNTIME_SA" --project "$PROJECT_ID" --quiet || true
gcloud iam service-accounts delete "$CI_SA" --project "$PROJECT_ID" --quiet || true
gcloud iam workload-identity-pools delete "$WIF_POOL" --project "$PROJECT_ID" --location global --quiet || true
