#!/usr/bin/env bash
# Lets GitHub Actions in GITHUB_REPO call the cache without any stored keys:
# GitHub OIDC -> Workload Identity Federation -> impersonate the CI service
# account -> mint an ID token for the Cloud Run URL.
set -euo pipefail
# shellcheck source=infra/gcp/config.sh
source "$(dirname "$0")/config.sh"

project_number="$(gcloud projects describe "$PROJECT_ID" --format 'value(projectNumber)')"
url="$(gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format 'value(status.url)')"

log "Creating CI service account ${CI_SA}"
if ! gcloud iam service-accounts describe "$CI_SA" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$CI_SA_NAME" \
    --project "$PROJECT_ID" \
    --display-name "moon CI (GitHub Actions)"
fi

log "Allowing ${CI_SA} to invoke ${SERVICE}"
gcloud run services add-iam-policy-binding "$SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" \
  --member "serviceAccount:${CI_SA}" --role roles/run.invoker >/dev/null

log "Creating workload identity pool '${WIF_POOL}' and provider '${WIF_PROVIDER}'"
if ! gcloud iam workload-identity-pools describe "$WIF_POOL" --project "$PROJECT_ID" --location global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$WIF_POOL" \
    --project "$PROJECT_ID" --location global \
    --display-name "GitHub Actions"
fi
if ! gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
  --project "$PROJECT_ID" --location global --workload-identity-pool "$WIF_POOL" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
    --project "$PROJECT_ID" --location global --workload-identity-pool "$WIF_POOL" \
    --display-name "GitHub OIDC" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository == '${GITHUB_REPO}'"
fi

log "Letting ${GITHUB_REPO} impersonate ${CI_SA}"
gcloud iam service-accounts add-iam-policy-binding "$CI_SA" \
  --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${project_number}/locations/global/workloadIdentityPools/${WIF_POOL}/attribute.repository/${GITHUB_REPO}" >/dev/null

provider="projects/${project_number}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}"

log "GitHub Actions variables (not secrets) for ${GITHUB_REPO}"
echo "GCP_WIF_PROVIDER=${provider}"
echo "GCP_CI_SERVICE_ACCOUNT=${CI_SA}"
echo "BAZEL_REMOTE_URL=${url}"

if command -v gh >/dev/null 2>&1; then
  read -r -p "Set these as repository variables with gh now? [y/N] " answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    gh variable set GCP_WIF_PROVIDER --repo "$GITHUB_REPO" --body "$provider"
    gh variable set GCP_CI_SERVICE_ACCOUNT --repo "$GITHUB_REPO" --body "$CI_SA"
    gh variable set BAZEL_REMOTE_URL --repo "$GITHUB_REPO" --body "$url"
  fi
fi
