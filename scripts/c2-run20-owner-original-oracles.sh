#!/usr/bin/env bash
# Immutable original Kotlin + temporary variants; fail-closed in tokenless, networkless JVM.
set -euo pipefail
root="${1:?Usage: /absolute/witness/root}"
root="$(realpath "$root")"
repo="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/152.kt" && test ! -L "$root/152.kt"
test -f "$root/151.kt" && test ! -L "$root/151.kt"
test "$(git hash-object "$root/152.kt")" = ed936aa687b08cf8d964d54f9d88e68bb12344ec
test "$(git hash-object "$root/151.kt")" = 742e440004d51743e8e4b02c40171f951edfd125
test "$(sha256sum "$root/152.kt" | cut -d' ' -f1)" = f06604f1bdd7bba80d060adac49d99d9edfb38234e47a91d2f861af3997435da
test "$(sha256sum "$root/151.kt" | cut -d' ' -f1)" = d8dbd5fadac170ed7b36c844f2480a03185046f381f64fd30feee0d20c219a70
python3 - "$root" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1]);s=(r/'152.kt').read_text()
anchor='''        require(proposal.version > 0) { "proposal version must be positive" }'''
assert s.count(anchor)==1,'C2_PR152_STALE_SOURCE_ANCHOR'
(r/'152-counterfactual.kt').write_text(s.replace(anchor,anchor+'''
        if (proposal.version < preferences.getInt(versionKey(cleanPackage), 0)) return''',1))
s=(r/'151.kt').read_text()
anchor='''        if (expectedSessionId != null && active.sessionId != expectedSessionId) return null'''
assert s.count(anchor)==1,'C2_PR151_WRONG_SESSION_SOURCE_ANCHOR'
(r/'151-mutant.kt').write_text(s.replace(anchor,'        // Intentional negative-case mutant removed the session identity guard',1))
PY
test "$(git hash-object "$root/152-counterfactual.kt")" != ed936aa687b08cf8d964d54f9d88e68bb12344ec
test "$(git hash-object "$root/151-mutant.kt")" != 742e440004d51743e8e4b02c40171f951edfd125
for pr in 152 151; do
 if [ "$pr" = 152 ]; then
  stubs=("$repo/tests/oracles/c2-run20-android-preferences-abi.kt"
    "$repo/tests/oracles/c2-run20-profile-domain-abi.kt"
    "$repo/tests/oracles/c2-run20-proposal-oracle.kt")
  phases=(original counterfactual)
 else
  stubs=("$repo/tests/oracles/c2-run20-android-preferences-abi.kt"
    "$repo/tests/oracles/c2-run20-session-domain-abi.kt"
    "$repo/tests/oracles/c2-run20-session-oracle.kt")
  phases=(original mutant)
 fi
 for phase in "${phases[@]}";do
  if [ "$phase" = original ];then source="$root/$pr.kt"
  else source="$root/$pr-$phase.kt";fi
  kotlinc "$source" "${stubs[@]}" -include-runtime -d "$root/$pr-$phase.jar" \
   > "$root/$pr-$phase.compile.log" 2>&1
  test -s "$root/$pr-$phase.jar"
 done
done
run_jar(){
 local name="$1"
 test "${GITHUB_ACTIONS:-}" = true
 test "${C2_OWNER_SANDBOX:-0}" = 1
 test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
 command -v bwrap >/dev/null
 local jdk
 jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
 local mounts=(--ro-bind /usr /usr)
 for mount in /bin /lib /lib64;do
  if [ -L "$mount" ];then
   local target
   target="$(readlink "$mount")"
   [[ "$target" != /* && "$target" != *..* ]] || return 2
   mounts+=(--symlink "$target" "$mount")
  elif [ -d "$mount" ];then mounts+=(--ro-bind "$mount" "$mount")
  else return 2;fi
 done
 env -i PATH=/usr/bin:/bin HOME=/tmp bwrap --die-with-parent --unshare-all --new-session \
  --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
  "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
  --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
  -- /jdk/bin/java -jar "/workspace/$name.jar"
}
set +e
run_jar 152-original > "$root/152-original.log" 2>&1
original_result=$?
set -e
test "$original_result" -ne 0
grep -q '^C2_PR152_VALID_VERSION_CONTROL_PASS$' "$root/152-original.log"
grep -q 'IllegalStateException: C2_PR152_STALE_PROPOSAL_CAN_OVERWRITE_NEWER_ROLLBACK_STATE' "$root/152-original.log"
run_jar 152-counterfactual > "$root/152-counterfactual.log" 2>&1
grep -q '^C2_PR152_VALID_VERSION_CONTROL_PASS$' "$root/152-counterfactual.log"
grep -q '^C2_PR152_MONOTONIC_ROLLBACK_STATE_PASS$' "$root/152-counterfactual.log"
run_jar 151-original > "$root/151-original.log" 2>&1
grep -q '^C2_PR151_SESSION_DATA_CONTROL_PASS$' "$root/151-original.log"
grep -q '^C2_PR151_WRONG_SESSION_CLOSE_REJECTED$' "$root/151-original.log"
set +e
run_jar 151-mutant > "$root/151-mutant.log" 2>&1
mutant_result=$?
set -e
test "$mutant_result" -ne 0
grep -q '^C2_PR151_SESSION_DATA_CONTROL_PASS$' "$root/151-mutant.log"
grep -q 'IllegalStateException: C2_PR151_EXPECTED_SESSION_ID_MISMATCH_MUST_NOT_FINISH' "$root/151-mutant.log"
python3 - "$root" "$repo" <<'PY'
from pathlib import Path
import hashlib,json,sys
r=Path(sys.argv[1]);repo=Path(sys.argv[2]);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for pr,head,blob,oracle,other in [
 (152,'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
  'ed936aa687b08cf8d964d54f9d88e68bb12344ec','c2-run20-proposal-oracle.kt','counterfactual'),
 (151,'9ad983576c16c6c34d59283979d83c69ede50dce',
  '742e440004d51743e8e4b02c40171f951edfd125','c2-run20-session-oracle.kt','mutant')
]:
 w={'schema':'ultra-sentinel-c2-run20-original-witness/v1','pr':pr,
    'headSha':head,'blobSha':blob,'sourceSha256':sha(r/f'{pr}.kt'),
    'oracleSha256':sha(repo/'tests/oracles'/oracle),
    'originalLogSha256':sha(r/f'{pr}-original.log'),
    'counterfactualLogSha256':sha(r/f'{pr}-{other}.log'),
    'normalControlPassed':True,'behaviorWitnessed':True,'sensitivityProven':True,
    'productionCallsitePinned':True,
    'candidatePredictionsRead':False,'baselinePredictionsRead':False}
 (r/f'{pr}-witness.json').write_text(json.dumps(w,sort_keys=True)+'\n')
print('C2_RUN20_VALID_ORIGINAL_SOURCE_BEHAVIOR_AND_MUTANT_SENSITIVITY')
PY
