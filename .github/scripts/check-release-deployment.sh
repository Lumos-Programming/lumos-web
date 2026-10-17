#!/usr/bin/env bash
# Reject redeployments after success while allowing failed deployments to be retried.

set -euo pipefail

if [[ $# -ne 2 || -z $1 || -z $2 ]]; then
  echo "Usage: $0 <environment> <tag>" >&2
  exit 1
fi

environment=$1
release_tag=$2
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}"
case "$environment" in
  production) workflow_file=deploy-cloudrun-release.yaml ;;
  staging) workflow_file=deploy-cloudrun-stg.yaml ;;
  *)
    echo "::error title=Unknown deployment environment::Unsupported environment: $environment." >&2
    exit 1 ;;
esac

if ! deployment_ids=$(
  gh api --method GET --paginate "repos/$GITHUB_REPOSITORY/deployments" \
    -f environment="$environment" -f per_page=100 |
    jq -r --arg environment "$environment" --arg tag "$release_tag" '
      .[] | select(.environment == $environment and
        (.ref == $tag or .ref == ("refs/tags/" + $tag))) | .id'
); then
  echo "::error title=Deployment history unavailable::Could not read deployment history." >&2
  exit 1
fi

while IFS= read -r deployment_id; do
  [[ -n "$deployment_id" ]] || continue
  if [[ ! "$deployment_id" =~ ^[0-9]+$ ]]; then
    echo "::error title=Deployment history unavailable::Invalid deployment ID in API response." >&2
    exit 1
  fi

  if ! deployment_states=$(
    gh api --paginate "repos/$GITHUB_REPOSITORY/deployments/$deployment_id/statuses?per_page=100" |
      jq -r '.[] | .state'
  ); then
    echo "::error title=Deployment history unavailable::Could not read deployment statuses." >&2
    exit 1
  fi

  # Successful deployments can later become inactive, so inspect every status.
  if grep -qx success <<< "$deployment_states"; then
    echo "::error title=Release already deployed::$release_tag has already been deployed successfully to $environment." >&2
    exit 1
  fi
done <<< "$deployment_ids"

# Releases deployed before GitHub Environments were configured have no deployment
# records. Check their workflow jobs as well; a skipped deployment is not success.
if ! run_ids=$(
  gh api --method GET --paginate "repos/$GITHUB_REPOSITORY/actions/workflows/$workflow_file/runs" \
    -f event=release -f branch="$release_tag" -f status=success -f per_page=100 |
    jq -r --arg tag "$release_tag" '
      .workflow_runs[] | select(.event == "release" and
        .head_branch == $tag and .conclusion == "success") | .id'
); then
  echo "::error title=Deployment history unavailable::Could not read release workflow history." >&2
  exit 1
fi

while IFS= read -r run_id; do
  [[ -n "$run_id" ]] || continue
  if [[ ! "$run_id" =~ ^[0-9]+$ ]]; then
    echo "::error title=Deployment history unavailable::Invalid workflow run ID in API response." >&2
    exit 1
  fi

  if ! job_conclusions=$(
    gh api --paginate "repos/$GITHUB_REPOSITORY/actions/runs/$run_id/jobs?filter=all&per_page=100" |
      jq -r '.jobs[] | select(.name == "build-and-deploy") | .conclusion'
  ); then
    echo "::error title=Deployment history unavailable::Could not read release workflow jobs." >&2
    exit 1
  fi

  if grep -qx success <<< "$job_conclusions"; then
    echo "::error title=Release already deployed::$release_tag has already been deployed successfully to $environment." >&2
    exit 1
  fi
done <<< "$run_ids"

echo "No successful deployment of $release_tag to $environment; deployment may proceed."
