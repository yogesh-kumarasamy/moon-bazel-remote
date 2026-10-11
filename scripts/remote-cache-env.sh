# shellcheck shell=bash disable=SC2317
# Source this before running moon on a dev machine:
#   source scripts/remote-cache-env.sh
#
# Exports MOON_REMOTE_TOKEN, a Google ID token for your gcloud account. The
# Cloud Run service only accepts identities with roles/run.invoker
# (see infra/gcp/02-deploy.sh, DEV_MEMBERS). Tokens last about 1 hour;
# re-source when moon starts logging 401/403 from the remote cache.

if ! MOON_REMOTE_TOKEN="$(gcloud auth print-identity-token 2>/dev/null)"; then
  echo "Could not mint an ID token. Run: gcloud auth login" >&2
  unset MOON_REMOTE_TOKEN
  return 1 2>/dev/null || exit 1
fi
export MOON_REMOTE_TOKEN
echo "MOON_REMOTE_TOKEN set for $(gcloud config get-value account 2>/dev/null) (valid ~1h)"
