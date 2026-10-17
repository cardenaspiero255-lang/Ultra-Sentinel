#!/usr/bin/env bash
# Executes only after authenticated owner CI fetched SHA-pinned original Kotlin.
set -euo pipefail
root="${1:?usage: c2-run18-owner-oracle.sh /absolute/root}"
root="$(realpath "$root")"
repo="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/154.kt" && test ! -L "$root/154.kt"
test -f "$root/150.kt" && test ! -L "$root/150.kt"
test "$(git hash-object "$root/154.kt")" = 063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a
test "$(git hash-object "$root/150.kt")" = f661289c8fb9d5ca59687f156923971f4cc4672d
test "$(sha256sum "$root/154.kt" | cut -d' ' -f1)" = f9fbdbd7aabd2dffbadc4b04b31280779bd7359624c081b9e64d532d8c40f65a
test "$(sha256sum "$root/150.kt" | cut -d' ' -f1)" = b3147996af60bb304f65c400ca535ee07ad828921d0df870f9117d19422f49dc
python3 - "$root" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1])
math=(r/'154.kt').read_text(encoding='utf8')
before='''        val sqrtDiscriminant = BigDecimal.valueOf(
            kotlin.math.sqrt(discriminant.toDouble())
        ).round(mathContext)'''
after='''        val discriminantAsDouble = discriminant.toDouble()
        if (!discriminantAsDouble.isFinite()) return null
        val sqrtDiscriminant = BigDecimal.valueOf(
            kotlin.math.sqrt(discriminantAsDouble)
        ).round(mathContext)'''
assert math.count(before)==1,'C2_RUN18_ORIGINAL_MATH_DRIFT'
(r/'154-counterfactual.kt').write_text(math.replace(before,after,1),encoding='utf8')
voice=(r/'150.kt').read_text(encoding='utf8')
safe='''            UltraWakeStopSpeakingIntent.matches(transcript) ->
                UltraWakeRecognitionDisposition.STOP_TTS
            UltraWakeWordMatcher.isExplicitInvocation(transcript) ->
                UltraWakeRecognitionDisposition.INTERRUPT_TTS'''
mutant='''            UltraWakeWordMatcher.isExplicitInvocation(transcript) ->
                UltraWakeRecognitionDisposition.INTERRUPT_TTS
            UltraWakeStopSpeakingIntent.matches(transcript) ->
                UltraWakeRecognitionDisposition.STOP_TTS'''
assert voice.count(safe)==1,'C2_RUN18_ORIGINAL_VOICE_DRIFT'
(r/'150-mutant.kt').write_text(voice.replace(safe,mutant,1),encoding='utf8')
PY
test "$(git hash-object "$root/154-counterfactual.kt")" != 063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a
test "$(git hash-object "$root/150-mutant.kt")" != f661289c8fb9d5ca59687f156923971f4cc4672d
for pr in 154 150; do
  if [ "$pr" = 154 ]; then
    stubs=( "$repo/tests/oracles/c2-run18-math-oracle.kt" )
    phases=( original counterfactual )
  else
    stubs=( "$repo/tests/oracles/c2-run18-voice-parser-abi.kt"
      "$repo/tests/oracles/c2-run18-voice-oracle.kt" )
    phases=( original mutant )
  fi
  for phase in "${phases[@]}"; do
    if [ "$phase" = original ]; then source="$root/$pr.kt"
    else source="$root/$pr-$phase.kt"; fi
    kotlinc "$source" "${stubs[@]}" -include-runtime -d "$root/$pr-$phase.jar" \
      > "$root/$pr-$phase.compile.log" 2>&1
    test -s "$root/$pr-$phase.jar"
  done
done
run_jar(){
  local name="$1"
  test "${C2_OWNER_SANDBOX:-0}" = 1
  test "${GITHUB_ACTIONS:-}" = true
  test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
  command -v bwrap >/dev/null
  local jdk
  jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
  local mounts=(--ro-bind /usr /usr)
  for mount in /bin /lib /lib64; do
    if [ -L "$mount" ]; then
      local target
      target="$(readlink "$mount")"
      [[ "$target" != /* && "$target" != *..* ]] || return 2
      mounts+=(--symlink "$target" "$mount")
    elif [ -d "$mount" ]; then
      mounts+=(--ro-bind "$mount" "$mount")
    else return 2; fi
  done
  env -i PATH=/usr/bin:/bin HOME=/tmp bwrap --die-with-parent --unshare-all --new-session \
    --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
    "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
    --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
    -- /jdk/bin/java -jar "/workspace/$name.jar"
}
set +e
run_jar 154-original > "$root/154-original.log" 2>&1
math_result=$?
set -e
test "$math_result" -ne 0
grep -q '^C2_MATH_NORMAL_CONTROL_PASS$' "$root/154-original.log"
grep -q 'IllegalStateException: C2_MATH_UNHANDLED_LARGE_DISCRIMINANT_EXCEPTION' "$root/154-original.log"
run_jar 154-counterfactual > "$root/154-counterfactual.log" 2>&1
grep -q '^C2_MATH_NORMAL_CONTROL_PASS$' "$root/154-counterfactual.log"
grep -q '^C2_MATH_BOUNDED_OVERFLOW_PASS$' "$root/154-counterfactual.log"
run_jar 150-original > "$root/150-original.log" 2>&1
grep -q '^C2_VOICE_NORMAL_CONTROLS_PASS$' "$root/150-original.log"
grep -q '^C2_VOICE_STOP_PRIORITY_PASS$' "$root/150-original.log"
set +e
run_jar 150-mutant > "$root/150-mutant.log" 2>&1
voice_result=$?
set -e
test "$voice_result" -ne 0
grep -q '^C2_VOICE_NORMAL_CONTROLS_PASS$' "$root/150-mutant.log"
grep -q 'IllegalStateException: C2_VOICE_STOP_PRECEDENCE_CONTRACT_FAILED' "$root/150-mutant.log"
python3 - "$root" "$repo" <<'PY'
from pathlib import Path
import hashlib,json,sys
r=Path(sys.argv[1]);repo=Path(sys.argv[2]);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for pr,head,blob,oracle,variant in [
 (154,'858c9ce5cb6a7916d63f2348432013e49d02ba79',
  '063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a',
  'c2-run18-math-oracle.kt','counterfactual'),
 (150,'4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',
  'f661289c8fb9d5ca59687f156923971f4cc4672d',
  'c2-run18-voice-oracle.kt','mutant')
]:
 w={'schema':'ultra-sentinel-c2-run18-original-witness/v1',
    'pr':pr,'headSha':head,'blobSha':blob,
    'sourceSha256':sha(r/f'{pr}.kt'),
    'oracleSha256':sha(repo/'tests/oracles'/oracle),
    'originalLogSha256':sha(r/f'{pr}-original.log'),
    'counterfactualLogSha256':sha(r/f'{pr}-{variant}.log'),
    'normalControlPassed':True,'behaviorWitnessed':True,
    'sensitivityProven':True,'originalCallsitePinned':True,
    'candidateRead':False,'baselineRead':False}
 (r/f'{pr}-witness.json').write_text(json.dumps(w,sort_keys=True)+'\n')
print('C2_RUN18_ORIGINAL_MATH_OVERFLOW_AND_VOICE_STOP_EVIDENCE_PASS')
PY
