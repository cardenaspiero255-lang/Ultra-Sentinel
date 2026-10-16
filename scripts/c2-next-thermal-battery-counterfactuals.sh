#!/usr/bin/env bash
set -euo pipefail
root="$RUNNER_TEMP/c2-next-kotlin-pinned"
build="$RUNNER_TEMP/c2-next-thermal-battery-counterfactual-build"
mkdir -p "$build"
chmod 0700 "$build"
test "$(git hash-object "$root/154/ThermalPredictionAdvisor.kt")" = b2e15247536ecc00d4811021774ab2f34608ac3e
test "$(git hash-object "$root/155/BatteryAwareGamingEngine.kt")" = 8696360219231f3f1477d5ad21c93bca2197e281
python3 - "$root" "$build" <<'PY'
import pathlib,sys
src=pathlib.Path(sys.argv[1]);dst=pathlib.Path(sys.argv[2])
for pr,file,old,new in [
 (154,'ThermalPredictionAdvisor.kt',
  'if (!prediction.allowPreventiveSignal) return null',
  'if (false && !prediction.allowPreventiveSignal) return null'),
 (155,'BatteryAwareGamingEngine.kt',
  '.takeWhile { it.batteryCharging != true }',
  '.takeWhile { true }')
]:
    original=(src/str(pr)/file).read_text(encoding='utf-8')
    if original.count(old)!=1:
        raise SystemExit('C2_THERMAL_BATTERY_ORIGINAL_SOURCE_DRIFT')
    mutated=original.replace(old,new,1)
    if mutated==original:
        raise SystemExit('C2_THERMAL_BATTERY_MUTATION_NOT_APPLIED')
    (dst/file).write_text(mutated,encoding='utf-8')
PY
kotlinc "$build/ThermalPredictionAdvisor.kt" \
  tests/oracles/c2-next-pr154-pr155-domain-abi.kt \
  tests/oracles/c2-next-pr154-thermal-controls.kt \
  -include-runtime -d "$build/mutant154.jar"
kotlinc "$build/BatteryAwareGamingEngine.kt" \
  tests/oracles/c2-next-pr154-pr155-domain-abi.kt \
  tests/oracles/c2-next-pr155-battery-controls.kt \
  -include-runtime -d "$build/mutant155.jar"
test -s "$build/mutant154.jar" && test -s "$build/mutant155.jar"
chmod 0400 "$build/mutant154.jar" "$build/mutant155.jar"
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
test -x "$jdk/bin/java"
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
  if [ -L "$mount" ]; then
    target="$(readlink "$mount")"
    [[ "$target" != /* && "$target" != *..* ]] || exit 2
    mounts+=(--symlink "$target" "$mount")
  elif [ -d "$mount" ]; then
    mounts+=(--ro-bind "$mount" "$mount")
  else
    exit 2
  fi
done
for pr in 154 155; do
  set +e
  env -i PATH=/usr/bin:/bin HOME=/tmp \
    /usr/bin/bwrap --die-with-parent --unshare-all --new-session --clearenv \
    --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
    "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$build" /workspace \
    --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
    -- /jdk/bin/java -jar "/workspace/mutant$pr.jar" \
    > "$build/mutant$pr.log" 2>&1
  status=$?
  set -e
  test "$status" -ne 0 || { echo "C2_THERMAL_BATTERY_MUTANT_SURVIVED_$pr"; exit 2; }
  case "$pr" in
    154) grep -F 'C2_NEXT_154_CONTROL_FAILED_NO_WARNING_WHEN_NOT_ALLOWED' "$build/mutant154.log" >/dev/null ;;
    155) grep -F 'C2_NEXT_155_CONTROL_FAILED_CHARGING_DISCARDS_PRIOR_DRAIN' "$build/mutant155.log" >/dev/null ;;
    *) exit 2 ;;
  esac
done
cat > "$RUNNER_TEMP/c2-next-thermal-battery-negatives.json" <<'JSON'
{"schema":"ultra-sentinel-c2-next-scoped-original-thermal-battery-negatives/v1",
"sourceRepository":"cardenaspiero255-lang/gamehub-ultra",
"frozenPacketDigest":"f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34",
"cases":[
{"pr":154,"headSha":"858c9ce5cb6a7916d63f2348432013e49d02ba79","blobSha":"b2e15247536ecc00d4811021774ab2f34608ac3e","rule":"THERMAL_WARNING_WITHOUT_PREVENTIVE_PERMISSION","path":"app/src/main/java/com/cardenaspiero255/gamehubultra/domain/ThermalPredictionAdvisor.kt","line":22,"positive":false,"originalControlPassed":true,"counterfactualFailedAtTarget":true},
{"pr":155,"headSha":"2289f4e4cda55ddaa50f2016113ded82dc17203c","blobSha":"8696360219231f3f1477d5ad21c93bca2197e281","rule":"BATTERY_DRAIN_CROSSES_CHARGING_BOUNDARY","path":"app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt","line":47,"positive":false,"originalControlPassed":true,"counterfactualFailedAtTarget":true}
],
"negativeFindingLabelsProvenUnderControlScope":2,
"negativeFindingLabelsEstablished":0,
"candidateInspected":false,"baselineCompared":false,
"precision":null,"recall":null,"f1":null,
"fpNonRegressionVerified":false,"tripleSPlusCertified":false,
"limitation":"Two distinct bounded original Kotlin defenses with sensitive counterfactual mutants. No whole-PR clean finding universe, baseline or TN scores."}
JSON
jq -e '.schema == "ultra-sentinel-c2-next-scoped-original-thermal-battery-negatives/v1" and
 (.cases|length) == 2 and .cases[0].pr == 154 and .cases[0].positive == false and
 .cases[1].pr == 155 and .cases[1].positive == false and
 .negativeFindingLabelsProvenUnderControlScope == 2 and
 .negativeFindingLabelsEstablished == 0 and
 .candidateInspected == false and .baselineCompared == false and
 .precision == null and .recall == null and .f1 == null and
 .fpNonRegressionVerified == false and .tripleSPlusCertified == false' \
 "$RUNNER_TEMP/c2-next-thermal-battery-negatives.json" >/dev/null
