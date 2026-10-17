#!/usr/bin/env bash
set -euo pipefail
root="$RUNNER_TEMP/c2-pr150-bad-history"
source="$root/SmartRecommendationExplanation.kt"
build="$root/mutants"
test "$(git hash-object "$source")" = 37866fd3dbfcd19d9daaf29a5e1e426391c723d4
mkdir -p "$build"
python3 - "$source" "$build/SmartRecommendationExplanation.kt" <<'PY'
import pathlib,sys
src=pathlib.Path(sys.argv[1]).read_text(encoding='utf8')
needle='input.historicalObservations.isNotEmpty() ||'
replacement='measuredGood.isNotEmpty() || acceptedFeedback.isNotEmpty() ||'
if src.count(needle)!=1:
    raise SystemExit('C2_PR150_NEGATIVE_HISTORY_SOURCE_DRIFT')
pathlib.Path(sys.argv[2]).write_text(src.replace(needle,replacement,1),encoding='utf8')
PY
kotlinc "$build/SmartRecommendationExplanation.kt" \
  tests/oracles/c2-next-pr150-confidence-domain-abi.kt \
  tests/oracles/c2-next-pr150-negative-history.kt \
  -include-runtime -d "$build/mutant.jar"
test -s "$build/mutant.jar"
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
 if [ -L "$mount" ]; then
  symlink="$(readlink "$mount")"
  [[ "$symlink" != /* && "$symlink" != *..* ]] || exit 2
  mounts+=(--symlink "$symlink" "$mount")
 elif [ -d "$mount" ]; then
  mounts+=(--ro-bind "$mount" "$mount")
 else exit 2; fi
done
set +e
env -i PATH=/usr/bin:/bin HOME=/tmp \
 /usr/bin/bwrap --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
 "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$build" /workspace \
 --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
 -- /jdk/bin/java -jar /workspace/mutant.jar > "$build/mutant.log" 2>&1
code=$?
set -e
test "$code" -ne 0 || { echo C2_PR150_NEGATIVE_HISTORY_COUNTERFACTUAL_SURVIVED; exit 2; }
grep -F 'java.lang.IllegalStateException: C2_PR150_BAD_HISTORY_ORACLE_FAILED_NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE' \
 "$build/mutant.log" >/dev/null
! grep -F 'C2_PR150_BAD_HISTORY_ORACLE_FAILED_NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE_' \
 "$build/mutant.log" >/dev/null
echo C2_PR150_NEGATIVE_ONLY_HISTORY_COUNTERFACTUAL_KILLED
