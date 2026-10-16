#!/usr/bin/env bash
set -euo pipefail
root="$RUNNER_TEMP/c2-pr150"
source="$root/SmartRecommendationExplanation.kt"
test "$(git hash-object "$source")" = 37866fd3dbfcd19d9daaf29a5e1e426391c723d4
