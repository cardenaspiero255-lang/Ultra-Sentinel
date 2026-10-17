#!/usr/bin/env bash
# Original-source proof only: no detector, training or GitHub writes.
set -euo pipefail
root="${1:?absolute evidence directory required}"
root="$(realpath "$root")"
repo="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/155.kt" && test ! -L "$root/155.kt"
test -f "$root/158.kt" && test ! -L "$root/158.kt"
test "$(git hash-object "$root/155.kt")" = 8696360219231f3f1477d5ad21c93bca2197e281
test "$(git hash-object "$root/158.kt")" = e1423d747bdeeb556c4633febcfc9455e1f3cef6
test "$(sha256sum "$root/155.kt" | cut -d' ' -f1)" = cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b
test "$(sha256sum "$root/158.kt" | cut -d' ' -f1)" = 921bf26b622392d06021ada2635a2a44d226c45c379156322ceb08892ed85430
python3 - "$root" <<'PY'
from pathlib import Path
import sys
root=Path(sys.argv[1])
battery=(root/'155.kt').read_text(encoding='utf8')
old='require(highDrainPercentPerHour > 0f)'
assert battery.count(old)==1,'C2_155_FROZEN_SOURCE_PATTERN_DRIFT'
(root/'155-counterfactual.kt').write_text(battery.replace(old,
 'require(highDrainPercentPerHour.isFinite() && highDrainPercentPerHour > 0f)',1),encoding='utf8')
query=(root/'158.kt').read_text(encoding='utf8')
old='UltraVerificationMode.LOCAL -> localOnly(localChat)'
assert query.count(old)==1,'C2_158_FROZEN_SOURCE_PATTERN_DRIFT'
(root/'158-mutant.kt').write_text(query.replace(old,
 'UltraVerificationMode.LOCAL -> researchOnly(request)',1),encoding='utf8')
PY
test "$(git hash-object "$root/155-counterfactual.kt")" != 8696360219231f3f1477d5ad21c93bca2197e281
test "$(git hash-object "$root/158-mutant.kt")" != e1423d747bdeeb556c4633febcfc9455e1f3cef6
for pr in 155 158; do
  if [ "$pr" = 155 ]; then
    stubs=( "$repo/tests/oracles/c2-run17-battery-abi.kt" "$repo/tests/oracles/c2-run17-battery-oracle.kt" )
    phases=( original counterfactual )
  else
    stubs=( "$repo/tests/oracles/c2-run17-query-abi.kt" "$repo/tests/oracles/c2-run17-query-oracle.kt" )
    phases=( original mutant )
  fi
  for phase in "${phases[@]}"; do
    if [ "$phase" = original ]; then source="$root/$pr.kt"; else source="$root/$pr-$phase.kt"; fi
    kotlinc "$source" "${stubs[@]}" -include-runtime -d "$root/$pr-$phase.jar" > "$root/$pr-$phase.compile.log" 2>&1
    test -s "$root/$pr-$phase.jar"
  done
done
run_jar() {
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
    elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
    else return 2; fi
  done
  env -i PATH=/usr/bin:/bin HOME=/tmp bwrap --die-with-parent --unshare-all --new-session \
    --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
    "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
    --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
    -- /jdk/bin/java -jar "/workspace/$name.jar"
}
set +e
run_jar 155-original > "$root/155-original.log" 2>&1
battery_result=$?
set -e
test "$battery_result" -ne 0
grep -q '^C2_BATTERY_VALID_THRESHOLD_CONTROL_PASS$' "$root/155-original.log"
grep -q 'IllegalStateException: C2_BATTERY_INFINITE_THRESHOLD_UNRESTRICTED' "$root/155-original.log"
run_jar 155-counterfactual > "$root/155-counterfactual.log" 2>&1
grep -q '^C2_BATTERY_VALID_THRESHOLD_CONTROL_PASS$' "$root/155-counterfactual.log"
grep -q '^C2_BATTERY_FINITE_THRESHOLD_REQUIRED_PASS$' "$root/155-counterfactual.log"
run_jar 158-original > "$root/158-original.log" 2>&1
grep -q '^C2_LOCAL_NO_REMOTE_GATEWAY_PASS$' "$root/158-original.log"
grep -q '^C2_REQUIRED_BOUNDARY_PASS$' "$root/158-original.log"
set +e
run_jar 158-mutant > "$root/158-mutant.log" 2>&1
query_result=$?
set -e
test "$query_result" -ne 0
grep -q 'IllegalStateException: C2_LOCAL_MUST_NOT_CALL_REMOTE_RESEARCH' "$root/158-mutant.log"
python3 - "$root" "$repo" <<'PY'
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]);repo=Path(sys.argv[2]);digest=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
for pr,oracle,variant,head,blob in [
 (155,'c2-run17-battery-oracle.kt','counterfactual','2289f4e4cda55ddaa50f2016113ded82dc17203c','8696360219231f3f1477d5ad21c93bca2197e281'),
 (158,'c2-run17-query-oracle.kt','mutant','9d8572afedc634ac07dae58a0da326ea62bdc1da','e1423d747bdeeb556c4633febcfc9455e1f3cef6')
]:
 obj={
  'schema':'ultra-sentinel-c2-run17-witness/v1','pr':pr,'headSha':head,'blobSha':blob,
  'sourceSha256':digest(root/f'{pr}.kt'),
  'oracleSha256':digest(repo/'tests/oracles'/oracle),
  'originalLogSha256':digest(root/f'{pr}-original.log'),
  'counterfactualLogSha256':digest(root/f'{pr}-{variant}.log'),
  'originalControlPassed':True,'behaviorObserved':True,'mutationSensitive':True,
  'callsitePinned':True,'candidateRead':False,'baselineRead':False
 }
 (root/f'{pr}-witness.json').write_text(json.dumps(obj,sort_keys=True)+'\n')
print('C2_RUN17_TWO_ORIGINAL_SOURCE_WITNESSES_PASS')
PY
