#!/usr/bin/env bash
set -euo pipefail
root="$(realpath "$1")";repo="$(cd "$(dirname "$0")/.." && pwd)"
stage=preconditions
report_failure(){
 local rc=$?
 echo "C2_PR181_ADVERSARIAL_PROBE_FAILED stage=$stage exit=$rc" >&2
 for f in "$root"/*.compile;do
  if [ -f "$f" ];then
   if grep -Eq '(error:|Exception)' "$f";then
    echo "C2_PR181_COMPILER_DIAGNOSTIC_FILE=$(basename "$f")" >&2
    grep -E '(error:|Exception)' "$f" | head -12 >&2 || :
   fi
  fi
 done
 exit "$rc"
}
trap report_failure ERR
test "$GITHUB_ACTIONS" = true
test "$C2_OWNER_SANDBOX" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
command -v bwrap >/dev/null
test -s "$root/reconciled-twelve-oracles.json"
stage=baseline-152-and-151
bash "$repo/scripts/c2-run20-owner-original-oracles.sh" "$root"
stage=baseline-158
bash "$repo/scripts/c2-pr158-owner-oracle.sh" "$root"
stage=baseline-154-and-150
bash "$repo/scripts/c2-run18-owner-original-oracles.sh" "$root"
stage=build-overbroad-control
python3 - "$root" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1]);s=(r/'UltraFrontierWorldState.kt').read_text()
a='                previousAge <= ADVANCED_SIGNAL_MAX_AGE_MILLIS'
assert s.count(a)==1
(r/'158-blanket-clear.kt').write_text(s.replace(a,a+' &&\n                context.sessionActive',1))
PY
for label in 152 154 158;do
 if [ "$label" = 152 ];then
  oracle="$repo/tests/oracles/c2-pr181-proposal-cross-package-oracle.kt"
  abi=( "$repo/tests/oracles/c2-run20-android-preferences-abi.kt" "$repo/tests/oracles/c2-run20-profile-domain-abi.kt" )
  first="$root/152.kt";repaired="$root/152-counterfactual.kt"
 elif [ "$label" = 154 ];then
  oracle="$repo/tests/oracles/c2-pr181-math-large-input-oracle.kt";abi=()
  first="$root/154.kt";repaired="$root/154-counterfactual.kt"
 else
  oracle="$repo/tests/oracles/c2-pr181-ttl-fresh-idle-oracle.kt"
  abi=( "$root/BatteryAwareGamingEngine.kt" "$repo/tests/oracles/c2-pr158-domain-abi.kt" "$repo/tests/oracles/c2-pr158-ai-abi.kt" )
  first="$root/UltraFrontierWorldState.kt";repaired="$root/counterfactual.kt"
 fi
 stage="compile-$label-extra-original"
 kotlinc "$first" ${abi[@]} "$oracle" -include-runtime -d "$root/$label-extra-original.jar" > "$root/$label-extra-original.compile" 2>&1
 stage="compile-$label-extra-fixed"
 kotlinc "$repaired" ${abi[@]} "$oracle" -include-runtime -d "$root/$label-extra-fixed.jar" > "$root/$label-extra-fixed.compile" 2>&1
done
stage=compile-158-blanket
kotlinc "$root/158-blanket-clear.kt" "$root/BatteryAwareGamingEngine.kt" \
 "$repo/tests/oracles/c2-pr158-domain-abi.kt" "$repo/tests/oracles/c2-pr158-ai-abi.kt" \
 "$repo/tests/oracles/c2-pr181-ttl-fresh-idle-oracle.kt" -include-runtime \
 -d "$root/158-blanket.jar" > "$root/158-blanket.compile" 2>&1
run_jar(){
 local name="$1";local jdk
 jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
 local mounts=(--ro-bind /usr /usr)
 for mount in /bin /lib /lib64;do
  if [ -L "$mount" ];then
   local target;target="$(readlink "$mount")"
   [[ "$target" != /* && "$target" != *..* ]] || return 2
   mounts+=(--symlink "$target" "$mount")
  elif [ -d "$mount" ];then mounts+=(--ro-bind "$mount" "$mount")
  else return 2;fi
 done
 env -i PATH=/usr/bin:/bin HOME=/tmp bwrap --die-with-parent \
  --unshare-all --new-session --clearenv --setenv PATH /usr/bin:/bin \
  --setenv HOME /tmp ${mounts[@]} --ro-bind "$jdk" /jdk \
  --ro-bind "$root" /workspace --proc /proc --dev /dev --tmpfs /tmp \
  --dir /home --chdir /workspace -- /jdk/bin/java -jar "/workspace/$name.jar"
}
for label in 152 154 158;do
 set +e
 stage="run-$label-extra-original"
 run_jar "$label-extra-original" > "$root/$label-extra-original.log" 2>&1
 original_exit=$?
 set -e
 test "$original_exit" -ne 0
 stage="run-$label-extra-fixed"
 run_jar "$label-extra-fixed" > "$root/$label-extra-fixed.log" 2>&1
done
stage=assert-adversarial-logs
grep -Fq 'C2_PR181_TWO_PACKAGES_INITIAL_CONTROL_PASS' "$root/152-extra-original.log"
grep -Fq 'C2_PR181_STALE_ALPHA_SHOULD_NOT_OVERWRITE_CURRENT_PROFILE' "$root/152-extra-original.log"
grep -Fq 'C2_PR181_INTERLEAVED_VERSION_CONTROL_PASS' "$root/152-extra-fixed.log"
grep -Fq 'C2_PR181_MATH_NORMAL_CONTROL_PASS' "$root/154-extra-original.log"
grep -Fq 'C2_PR181_MATH_NONFINITE_EXCEPTION' "$root/154-extra-original.log"
grep -Fq 'C2_PR181_MATH_UNHANDLED_EXCEPTION_GUARD_PASS' "$root/154-extra-fixed.log"
grep -Fq 'C2_PR181_FRESH_IDLE_RETAINED_PASS' "$root/158-extra-original.log"
grep -Fq 'C2_PR181_TTL_SHOULD_USE_ORIGINAL_OBSERVATION_AGE' "$root/158-extra-original.log"
grep -Fq 'C2_PR181_EXPIRED_SIGNAL_REJECTED_PASS' "$root/158-extra-fixed.log"
set +e
run_jar 158-blanket > "$root/158-blanket.log" 2>&1
blanket_exit=$?
set -e
test "$blanket_exit" -ne 0
grep -Fq 'C2_PR181_WRONG_BLANKET_CLEAR_DISCARDS_STILL_FRESH_SIGNAL' "$root/158-blanket.log"
stage=sign-probe-receipts
python3 - "$root" <<'PY'
from pathlib import Path
import sys,json,hashlib
r=Path(sys.argv[1]);sha=lambda p:hashlib.sha256((r/p).read_bytes()).hexdigest()
pr180=json.loads((r/'reconciled-twelve-oracles.json').read_text())
out=[]
for pr,line,original,repaired,adversarial in [
 (152,41,'152-original.log','152-counterfactual.log','152-extra-fixed.log'),
 (158,114,'original.log','counterfactual.log','158-blanket.log'),
 (154,100,'154-original.log','154-counterfactual.log','154-extra-fixed.log')
]:
 entries=[x for x in pr180['entries'] if x['pr']==pr and x['line']==line]
 assert len(entries)==1
 x=entries[0]
 out.append({
  'identity':x['identity'],'originalHeadSha':x['headSha'],'originalBlobSha':x['blobSha'],
  'originalLogSha256':sha(original),'firstRepairLogSha256':sha(repaired),
  'adversarialControlLogSha256':sha(adversarial),
  'originalSourceUnmodified':True,'originalFailureReproduced':True,
  'firstRepairPassed':True,'adversarialControlPassed':True,
  'sourceBehaviorScoped':True,'candidatePredictionsRead':False,'baselinePredictionsRead':False
 })
(r/'new-trials.json').write_text(json.dumps(out,sort_keys=True)+'\n')
print('C2_PR181_THREE_ORIGINAL_JVM_REPRODUCTIONS_AND_ADVERSARIAL_CONTROLS_PASS')
PY
