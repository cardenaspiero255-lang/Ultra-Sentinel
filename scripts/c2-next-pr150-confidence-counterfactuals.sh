#!/usr/bin/env bash
set -euo pipefail
root="$RUNNER_TEMP/c2-pr150"
source="$root/SmartRecommendationExplanation.kt"
test "$(git hash-object "$source")" = 37866fd3dbfcd19d9daaf29a5e1e426391c723d4
build="$root/mutants"
mkdir -p "$build/fixed-positive" "$build/broken-negative"
python3 - "$source" "$build" <<'PY'
import pathlib,sys
src=pathlib.Path(sys.argv[1]).read_text(encoding="utf8")
out=pathlib.Path(sys.argv[2])
cases={
 "fixed-positive":("input.externalEvidence.any { it.fresh && it.authoritative } ->",
     "input.externalEvidence.any { it.fresh && it.authoritative && it.supportsRecommendation == true } ->"),
 "broken-negative":("weakExternalEvidence || unavailable.isNotEmpty() -> RecommendationConfidenceBand.MEDIUM",
     "unavailable.isNotEmpty() -> RecommendationConfidenceBand.MEDIUM")
}
for label,(old,new) in cases.items():
    if src.count(old)!=1:
        raise SystemExit("C2_PR150_SOURCE_DRIFT")
    (out/label/"SmartRecommendationExplanation.kt").write_text(src.replace(old,new,1),encoding="utf8")
PY
