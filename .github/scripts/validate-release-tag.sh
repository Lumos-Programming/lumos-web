#!/usr/bin/env bash

set -euo pipefail

mode=${1:-}
current_tag=${2:-}
stable_pattern='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
prerelease_pattern='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)-rc\.(0|[1-9][0-9]*)$'

case "$mode" in
  release)
    error_title="Invalid release tag"
    expected_format="vMAJOR.MINOR.PATCH"
    candidate_pattern=$stable_pattern
    ;;
  prerelease)
    error_title="Invalid pre-release tag"
    expected_format="vMAJOR.MINOR.PATCH-rc.N"
    candidate_pattern=$prerelease_pattern
    ;;
  auto)
    # Tag 作成イベントでは Release の種別を参照できないため、タグ形式から判定する。
    error_title="Invalid release tag"
    if [[ "$current_tag" =~ $stable_pattern ]]; then
      mode=release
      expected_format="vMAJOR.MINOR.PATCH"
      candidate_pattern=$stable_pattern
    elif [[ "$current_tag" =~ $prerelease_pattern ]]; then
      mode=prerelease
      expected_format="vMAJOR.MINOR.PATCH-rc.N"
      candidate_pattern=$prerelease_pattern
    else
      expected_format="vMAJOR.MINOR.PATCH or vMAJOR.MINOR.PATCH-rc.N"
      candidate_pattern='a^'
    fi
    ;;
  *)
    echo "Usage: $0 <release|prerelease|auto> <tag>" >&2
    exit 2
    ;;
esac

fail_validation() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "invalid=true" >> "$GITHUB_OUTPUT"
  fi
  echo "::error title=$error_title::$1"
  exit 1
}

if [[ ! "$current_tag" =~ $candidate_pattern ]]; then
  fail_validation "Expected $expected_format, got '$current_tag'"
fi

current_major=${BASH_REMATCH[1]}
current_minor=${BASH_REMATCH[2]}
current_patch=${BASH_REMATCH[3]}

latest_stable_tag=""
latest_major=-1
latest_minor=-1
latest_patch=-1

while IFS= read -r tag; do
  if [[ "$tag" == "$current_tag" || ! "$tag" =~ $stable_pattern ]]; then
    continue
  fi

  tag_major=${BASH_REMATCH[1]}
  tag_minor=${BASH_REMATCH[2]}
  tag_patch=${BASH_REMATCH[3]}

  if ((tag_major > latest_major ||
    (tag_major == latest_major && tag_minor > latest_minor) ||
    (tag_major == latest_major && tag_minor == latest_minor && tag_patch > latest_patch))); then
    latest_stable_tag=$tag
    latest_major=$tag_major
    latest_minor=$tag_minor
    latest_patch=$tag_patch
  fi
done

if [[ -n "$latest_stable_tag" ]]; then
  if ! ((
    (current_major == latest_major && current_minor == latest_minor && current_patch == latest_patch + 1) ||
      (current_major == latest_major && current_minor == latest_minor + 1 && current_patch == 0) ||
      (current_major == latest_major + 1 && current_minor == 0 && current_patch == 0)
  )); then
    expected_patch="v$latest_major.$latest_minor.$((latest_patch + 1))"
    expected_minor="v$latest_major.$((latest_minor + 1)).0"
    expected_major="v$((latest_major + 1)).0.0"

    if [[ "$mode" == "prerelease" ]]; then
      expected_patch+="-rc.N"
      expected_minor+="-rc.N"
      expected_major+="-rc.N"
    fi

    fail_validation "After $latest_stable_tag, expected $expected_patch, $expected_minor, or $expected_major; got '$current_tag'"
  fi
fi

echo "Validated release tag: $current_tag"
