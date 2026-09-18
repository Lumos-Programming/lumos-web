#!/usr/bin/env bash
# リリースタグ検証スクリプトの命名規則とバージョン遷移をテーブルテストする。

set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
validator="$script_dir/validate-release-tag.sh"
test_root=$(mktemp -d)
trap 'rm -rf "$test_root"' EXIT
case_number=0

run_case() {
  local expected=$1
  local mode=$2
  local candidate=$3
  shift 3

  case_number=$((case_number + 1))
  github_output="$test_root/case-$case_number-output"
  : > "$github_output"
  release_tags=$(printf '%s\n' "$@")

  set +e
  output=$(GITHUB_OUTPUT="$github_output" bash "$validator" "$mode" "$candidate" <<< "$release_tags" 2>&1)
  status=$?
  set -e

  if [[ "$expected" == "pass" && $status -ne 0 ]]; then
    echo "FAIL: expected $mode $candidate to pass"
    echo "$output"
    exit 1
  fi

  if [[ "$expected" == "fail" && $status -eq 0 ]]; then
    echo "FAIL: expected $mode $candidate to fail"
    echo "$output"
    exit 1
  fi

  if [[ "$expected" == "fail" ]] && ! grep -qx 'invalid=true' "$github_output"; then
    echo "FAIL: expected $mode $candidate to report an invalid tag"
    echo "$output"
    exit 1
  fi

  if [[ "$expected" == "pass" && -s "$github_output" ]]; then
    echo "FAIL: expected $mode $candidate not to report an invalid tag"
    cat "$github_output"
    exit 1
  fi

  echo "PASS: $mode $candidate ($expected)"
}

# History contains preceding published releases, including release candidates.
run_case pass release v2.0.2 v2.0.1
run_case pass release v2.1.0 v2.0.1
run_case pass release v3.0.0 v2.0.1
run_case fail release v2.0.2 v2.0.1 v2.0.2
run_case fail release v2.0.0 v2.0.0 v2.0.1
run_case fail release v2.0.3 v2.0.1
run_case fail release v2.1.1 v2.0.1
run_case fail release v2.1.1 v2.0.10
run_case fail release v2.0.2-rc.0 v2.0.1

run_case pass prerelease v2.0.2-rc.0 v2.0.1
run_case pass prerelease v2.0.2-rc.1 v2.0.1 v2.0.2-rc.0
run_case pass prerelease v2.0.2-rc.2 v2.0.1 v2.0.2-rc.0
run_case pass prerelease v2.0.2-rc.10 v2.0.2-rc.9 v2.0.1 v2.0.2-rc.2
run_case fail prerelease v2.0.2-rc.0 v2.0.1 v2.0.2-rc.0
run_case fail prerelease v2.0.2-rc.1 v2.0.1 v2.0.2-rc.2
run_case fail prerelease v2.0.3-rc.0 v2.0.1
run_case fail prerelease v2.0.2 v2.0.1
run_case fail prerelease v2.0.2-beta.1 v2.0.1

# A release candidate can be promoted to the stable version of the same base.
run_case pass prerelease v2.0.0-rc.0 v1.9.0
run_case pass prerelease v2.0.0-rc.1 v1.9.0 v2.0.0-rc.0
run_case pass release v2.0.0 v1.9.0 v2.0.0-rc.0 v2.0.0-rc.1
run_case fail release v2.0.0 v1.9.0 v2.0.0-rc.1 v2.0.0
run_case fail prerelease v2.0.0-rc.2 v1.9.0 v2.0.0-rc.1 v2.0.0
run_case pass prerelease v2.0.1-rc.0 v2.0.0-rc.1 v2.0.0

# A patch release can progress through RCs after the preceding stable release.
run_case pass prerelease v3.0.2-rc.0 v3.0.1
run_case pass prerelease v3.0.2-rc.1 v3.0.1 v3.0.2-rc.0
run_case pass release v3.0.2 v3.0.1 v3.0.2-rc.0 v3.0.2-rc.1
run_case fail release v3.0.2 v3.0.1 v3.0.2-rc.0 v3.0.2-rc.1 v3.0.2
run_case fail prerelease v3.0.2-rc.2 v3.0.1 v3.0.2-rc.1 v3.0.2

# The same sequence works before the first stable release.
run_case pass prerelease v2.0.0-rc.0
run_case pass prerelease v2.0.0-rc.1 v2.0.0-rc.0
run_case pass release v2.0.0 v2.0.0-rc.0 v2.0.0-rc.1
run_case fail prerelease v2.0.0-rc.0 v2.0.0-rc.1
run_case fail prerelease v2.0.0-rc.1 v2.0.0-rc.1
run_case fail release v2.0.0 v2.0.0

# A higher prerelease also prevents moving back to a lower version series.
run_case fail release v2.0.2 v2.0.1 v2.1.0-rc.0
run_case fail prerelease v2.0.2-rc.5 v2.0.1 v2.1.0-rc.0
run_case pass prerelease v2.1.0-rc.0 v2.0.1 v2.0.2-rc.5
run_case pass release v2.0.10 v2.0.9 v2.0.10-rc.10
run_case pass release v2.10.0 v2.9.0 v2.10.0-rc.0

run_case pass auto v2.0.2 v2.0.1 v2.0.2-rc.5
run_case pass auto v2.0.2-rc.1 v2.0.1 v2.0.2-rc.0
run_case fail auto v2.0.2 v2.0.1 v2.0.2
run_case fail auto v2.0.2-rc.1 v2.0.1 v2.0.2-rc.1
run_case fail auto v2.0.2-rc.0 v2.0.1 v2.0.2-rc.1
run_case fail auto v2.0.3 v2.0.1
run_case fail auto v2.0.2-beta.1 v2.0.1

# Irrelevant or malformed historical tags do not affect version precedence.
run_case pass release v2.0.2 unrelated v02.0.3 v2.0.2-beta.1 v2.0.1
run_case fail prerelease v2.0.2-rc.01 v2.0.1

echo "All $case_number release tag validation tests passed."
