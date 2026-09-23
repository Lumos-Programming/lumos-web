#!/usr/bin/env bash

set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
guard="$script_dir/check-release-deployment.sh"
test_root=$(mktemp -d)
trap 'rm -rf "$test_root"' EXIT
mkdir "$test_root/bin"

# The API stub checks read-only requests, filtering, and pagination, then returns
# JSON pages from fixtures. A fixture ending in .error simulates an API failure.
cat > "$test_root/bin/gh" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
[[ $1 == api ]] || exit 91
shift
method=GET
paginated=false
endpoint=
environment=
per_page=
event=
branch=
status=
while [[ $# -gt 0 ]]; do
  case "$1" in
    --method) method=$2; shift 2 ;;
    --paginate) paginated=true; shift ;;
    -f)
      case "$2" in
        environment=*) environment=${2#environment=} ;;
        per_page=*) per_page=${2#per_page=} ;;
        event=*) event=${2#event=} ;;
        branch=*) branch=${2#branch=} ;;
        status=*) status=${2#status=} ;;
        *) exit 92 ;;
      esac
      shift 2 ;;
    *) [[ -z "$endpoint" ]] || exit 93; endpoint=$1; shift ;;
  esac
done
[[ $method == GET && $paginated == true ]] || exit 94
case "$endpoint" in
  repos/example/repository/deployments)
    [[ $environment == "$TEST_ENVIRONMENT" && $per_page == 100 ]] || exit 95
    fixture=deployments ;;
  repos/example/repository/deployments/*/statuses\?per_page=100)
    fixture=${endpoint#repos/example/repository/deployments/}
    fixture=statuses-${fixture%/statuses\?per_page=100} ;;
  repos/example/repository/actions/workflows/*/runs)
    [[ $event == release && $branch == "$TEST_TAG" && $status == success && $per_page == 100 ]] || exit 97
    case "$TEST_ENVIRONMENT" in
      production) expected_workflow=deploy-cloudrun-release.yaml ;;
      staging) expected_workflow=deploy-cloudrun-stg.yaml ;;
      *) exit 98 ;;
    esac
    [[ $endpoint == "repos/example/repository/actions/workflows/$expected_workflow/runs" ]] || exit 99
    fixture=workflow-runs ;;
  repos/example/repository/actions/runs/*/jobs\?filter=all\&per_page=100)
    fixture=${endpoint#repos/example/repository/actions/runs/}
    fixture=jobs-${fixture%/jobs\?filter=all\&per_page=100} ;;
  *) exit 96 ;;
esac
echo "$fixture" >> "$TEST_CASE_DIR/calls"
if [[ -f "$TEST_CASE_DIR/$fixture.error" ]]; then
  # Output before failure exercises a failure after a successful earlier page.
  [[ ! -f "$TEST_CASE_DIR/$fixture.json" ]] || cat "$TEST_CASE_DIR/$fixture.json"
  echo 'Simulated API failure' >&2
  exit 1
fi
cat "$TEST_CASE_DIR/$fixture.json"
STUB
chmod +x "$test_root/bin/gh"

case_number=0
run_case() {
  local expected=$1
  local name=$2
  local environment=$3
  local tag=$4
  local deployments=$5
  shift 5

  case_number=$((case_number + 1))
  local case_dir="$test_root/case-$case_number"
  mkdir "$case_dir"
  printf '%s\n' "$deployments" > "$case_dir/deployments.json"
  printf '%s\n' '{"workflow_runs":[]}' > "$case_dir/workflow-runs.json"
  while [[ $# -gt 0 ]]; do
    if [[ $2 == API_ERROR ]]; then
      : > "$case_dir/$1.error"
    else
      printf '%s\n' "$2" > "$case_dir/$1.json"
    fi
    shift 2
  done
  : > "$case_dir/github-output"

  local output status=0
  output=$(
    PATH="$test_root/bin:$PATH" TEST_CASE_DIR="$case_dir" TEST_ENVIRONMENT="$environment" TEST_TAG="$tag" \
      GITHUB_REPOSITORY=example/repository GITHUB_OUTPUT="$case_dir/github-output" \
      bash "$guard" "$environment" "$tag" 2>&1
  ) || status=$?

  if [[ $expected == pass && $status -ne 0 ]] || [[ $expected == fail && $status -eq 0 ]]; then
    echo "FAIL: $name (expected $expected, status $status)"
    echo "$output"
    exit 1
  fi
  if [[ -s "$case_dir/github-output" ]]; then
    echo "FAIL: $name changed GITHUB_OUTPUT and could trigger release cleanup"
    exit 1
  fi
  if [[ $expected == fail && $output != *'::error title='* ]]; then
    echo "FAIL: $name did not report a deployment guard error"
    echo "$output"
    exit 1
  fi
  echo "PASS: $name ($expected)"
}

deployment='[{"id":1,"ref":"v2.0.2","environment":"production"}]'
run_case pass 'first deployment' production v2.0.2 '[]'
run_case pass 'failed deployment retry' production v2.0.2 "$deployment" \
  statuses-1 '[{"state":"failure"},{"state":"in_progress"}]'
run_case pass 'current deployment in progress' production v2.0.2 "$deployment" \
  statuses-1 '[{"state":"in_progress"},{"state":"queued"},{"state":"pending"}]'
run_case pass 'deployment without statuses' production v2.0.2 "$deployment" statuses-1 '[]'
run_case fail 'successful deployment' production v2.0.2 "$deployment" statuses-1 '[{"state":"success"}]'
run_case fail 'inactive deployment with past success' production v2.0.2 "$deployment" \
  statuses-1 '[{"state":"inactive"},{"state":"success"}]'
run_case fail 'past success followed by failure' production v2.0.2 "$deployment" \
  statuses-1 '[{"state":"failure"},{"state":"success"}]'
run_case pass 'different tag and environment ignored' production v2.0.2 \
  '[{"id":1,"ref":"v2.0.1","environment":"production"},{"id":2,"ref":"v2.0.2","environment":"staging"}]'
run_case fail 'fully qualified tag and staging RC' staging v2.0.2-rc.0 \
  '[{"id":1,"ref":"refs/tags/v2.0.2-rc.0","environment":"staging"}]' \
  statuses-1 '[{"state":"success"}]'
run_case pass 'fully qualified branch does not match tag' production v2.0.2 \
  '[{"id":1,"ref":"refs/heads/v2.0.2","environment":"production"}]'
run_case fail 'older successful deployment on later page' production v2.0.2 \
  $'[{"id":2,"ref":"v2.0.2","environment":"production"}]\n[{"id":1,"ref":"v2.0.2","environment":"production"}]' \
  statuses-2 '[{"state":"failure"}]' statuses-1 '[{"state":"success"}]'
run_case fail 'success on later status page' production v2.0.2 "$deployment" \
  statuses-1 $'[{"state":"inactive"}]\n[{"state":"success"}]'
run_case fail 'deployment API failure' production v2.0.2 '[]' deployments API_ERROR
run_case fail 'status API failure' production v2.0.2 "$deployment" statuses-1 API_ERROR
run_case fail 'status API failure after earlier page' production v2.0.2 "$deployment" \
  statuses-1 '[{"state":"failure"}]' statuses-1 API_ERROR
run_case fail 'invalid deployment JSON' production v2.0.2 'invalid json'
run_case fail 'invalid status JSON' production v2.0.2 "$deployment" statuses-1 'invalid json'
run_case fail 'missing deployment ID' production v2.0.2 \
  '[{"ref":"v2.0.2","environment":"production"}]'

successful_run='{"workflow_runs":[{"id":1,"event":"release","head_branch":"v2.0.2","conclusion":"success"}]}'
run_case fail 'legacy deployment without deployment records' production v2.0.2 '[]' \
  workflow-runs "$successful_run" jobs-1 '{"jobs":[{"name":"build-and-deploy","conclusion":"success"}]}'
run_case pass 'successful workflow with skipped deployment' production v2.0.2 '[]' \
  workflow-runs "$successful_run" \
  jobs-1 '{"jobs":[{"name":"validate-release-tag","conclusion":"success"},{"name":"build-and-deploy","conclusion":"skipped"}]}'
run_case pass 'failed legacy deployment remains retryable' production v2.0.2 '[]' \
  workflow-runs "$successful_run" jobs-1 '{"jobs":[{"name":"build-and-deploy","conclusion":"failure"}]}'
run_case pass 'failed workflow and unrelated releases ignored' production v2.0.2 '[]' \
  workflow-runs '{"workflow_runs":[{"id":1,"event":"release","head_branch":"v2.0.2","conclusion":"failure"},{"id":2,"event":"release","head_branch":"v2.0.1","conclusion":"success"},{"id":3,"event":"push","head_branch":"v2.0.2","conclusion":"success"}]}'
run_case fail 'legacy staging deployment uses staging workflow' staging v2.0.2-rc.0 '[]' \
  workflow-runs '{"workflow_runs":[{"id":1,"event":"release","head_branch":"v2.0.2-rc.0","conclusion":"success"}]}' \
  jobs-1 '{"jobs":[{"name":"build-and-deploy","conclusion":"success"}]}'
run_case fail 'successful deployment on later workflow page' production v2.0.2 '[]' \
  workflow-runs $'{"workflow_runs":[{"id":2,"event":"release","head_branch":"v2.0.2","conclusion":"success"}]}\n{"workflow_runs":[{"id":1,"event":"release","head_branch":"v2.0.2","conclusion":"success"}]}' \
  jobs-2 '{"jobs":[{"name":"build-and-deploy","conclusion":"skipped"}]}' \
  jobs-1 '{"jobs":[{"name":"build-and-deploy","conclusion":"success"}]}'
run_case fail 'successful deployment on later jobs page' production v2.0.2 '[]' \
  workflow-runs "$successful_run" \
  jobs-1 $'{"jobs":[{"name":"validate-release-tag","conclusion":"success"}]}\n{"jobs":[{"name":"build-and-deploy","conclusion":"success"}]}'
run_case fail 'workflow runs API failure' production v2.0.2 '[]' workflow-runs API_ERROR
run_case fail 'workflow jobs API failure' production v2.0.2 '[]' \
  workflow-runs "$successful_run" jobs-1 API_ERROR
run_case fail 'workflow jobs API failure after earlier page' production v2.0.2 '[]' \
  workflow-runs "$successful_run" \
  jobs-1 '{"jobs":[{"name":"build-and-deploy","conclusion":"failure"}]}' jobs-1 API_ERROR
run_case fail 'invalid workflow JSON' production v2.0.2 '[]' workflow-runs 'invalid json'
run_case fail 'invalid jobs JSON' production v2.0.2 '[]' \
  workflow-runs "$successful_run" jobs-1 'invalid json'
run_case fail 'missing workflow run ID' production v2.0.2 '[]' \
  workflow-runs '{"workflow_runs":[{"event":"release","head_branch":"v2.0.2","conclusion":"success"}]}'
run_case fail 'unsupported deployment environment' development v2.0.2 '[]'

echo "All $case_number deployment guard tests passed."
