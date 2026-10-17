#!/usr/bin/env bash
# Trusted owner CI only: execute SHA-pinned original Kotlin, never upstream build scripts.
set -euo pipefail
root="$1"
[[ "$root" = /* && -d "$root" && ! -L "$root" ]]
root="$(realpath "$root")"
repo="$(cd "$(dirname "$0")/.." && pwd)"
test "$C2_OWNER_SANDBOX" = 1
test "$GITHUB_ACTIONS" = true
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
command -v bwrap >/dev/null
command -v kotlinc >/dev/null
for pr in 151 154; do
  test -f "$root/$pr.kt" && test ! -L "$root/$pr.kt"
done
test "$(git hash-object "$root/151.kt")" = adb11032b9b7f62f865228dfa1c27258ca3fa0df
test "$(git hash-object "$root/154.kt")" = 3ecb3b3893d8f710dd7f5203f8378bc784841baf

python3 - "$root" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1])
for number,normal,mutant in [
  ('151','        if (!crossedLowBatteryThreshold && !meaningfulDrop) return null',
    '        if (false) return null'),
  ('154','        require(minimumSamples >= 3)',
    '        require(minimumSamples >= 2)')
]:
    original=(r/(number+'.kt')).read_text(encoding='utf-8')
    assert original.count(normal)==1, 'C2_RUN21_ORIGINAL_SOURCE_ANCHOR_MISMATCH'
    (r/(number+'-mutant.kt')).write_text(original.replace(normal,mutant,1),encoding='utf-8')
PY
test "$(git hash-object "$root/151-mutant.kt")" != adb11032b9b7f62f865228dfa1c27258ca3fa0df
test "$(git hash-object "$root/154-mutant.kt")" != 3ecb3b3893d8f710dd7f5203f8378bc784841baf

for phase in original mutant; do
  if [[ "$phase" == original ]]; then
    session="$root/151.kt"; thermal="$root/154.kt"
  else
    session="$root/151-mutant.kt"; thermal="$root/154-mutant.kt"
  fi
  kotlinc "$session" \
    "$repo/tests/oracles/c2-run21-gaming-readiness-abi.kt" \
    "$repo/tests/oracles/c2-run21-session-battery-oracle.kt" \
    -include-runtime -d "$root/151-$phase.jar" \
    > "$root/151-$phase.compile.log" 2>&1
  # The unchanged session source supplies the real snapshot type to thermal.
  kotlinc "$root/151.kt" "$thermal" \
    "$repo/tests/oracles/c2-run21-gaming-readiness-abi.kt" \
    "$repo/tests/oracles/c2-run21-thermal-policy-oracle.kt" \
    -include-runtime -d "$root/154-$phase.jar" \
    > "$root/154-$phase.compile.log" 2>&1
done

run_jar() {
  local name="$1"
  local jdk
  jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
  local mounts=(--ro-bind /usr /usr)
  for mount in /bin /lib /lib64; do
    if [[ -L "$mount" ]]; then
      local target
      target="$(readlink "$mount")"
      [[ "$target" != /* && "$target" != *..* ]] || return 2
      mounts+=(--symlink "$target" "$mount")
    elif [[ -d "$mount" ]]; then
      mounts+=(--ro-bind "$mount" "$mount")
    else return 2; fi
  done
  env -i PATH=/usr/bin:/bin HOME=/tmp bwrap \
    --die-with-parent --unshare-all --new-session \
    --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
    "${mounts[@]}" --ro-bind "$jdk" /jdk \
    --ro-bind "$root" /workspace --proc /proc --dev /dev \
    --tmpfs /tmp --dir /home --chdir /workspace \
    -- /jdk/bin/java -jar "/workspace/$name.jar"
}
for pr in 151 154; do
  run_jar "$pr-original" > "$root/$pr-original.log" 2>&1
  case "$pr" in
    151)
      grep -qx 'C2_SESSION_NORMAL_DROP_CONTROL_PASS' "$root/151-original.log"
      grep -qx 'C2_SESSION_BATTERY_INCREASE_SAFE_PASS' "$root/151-original.log"
      ;;
    154)
      grep -qx 'C2_THERMAL_NORMAL_POLICY_CONTROL_PASS' "$root/154-original.log"
      grep -qx 'C2_THERMAL_UNDERSAMPLED_POLICY_SAFE_PASS' "$root/154-original.log"
      ;;
  esac
  set +e
  run_jar "$pr-mutant" > "$root/$pr-mutant.log" 2>&1
  code=$?
  set -e
  test "$code" -ne 0
  case "$pr" in
    151)
      grep -qx 'C2_SESSION_NORMAL_DROP_CONTROL_PASS' "$root/151-mutant.log"
      grep -q 'C2_SESSION_BATTERY_INCREASE_FALSE_DROP_ALARM' "$root/151-mutant.log"
      ;;
    154)
      grep -qx 'C2_THERMAL_NORMAL_POLICY_CONTROL_PASS' "$root/154-mutant.log"
      grep -q 'C2_THERMAL_UNDERSAMPLED_POLICY_ALLOWED' "$root/154-mutant.log"
      ;;
  esac
done

python3 - "$root" "$repo" <<'PY'
import hashlib,json,sys
from pathlib import Path
root=Path(sys.argv[1]);repo=Path(sys.argv[2])
sha=lambda x: hashlib.sha256(x.read_bytes()).hexdigest()
for pr,head,blob,oracle in [
  (151,'9ad983576c16c6c34d59283979d83c69ede50dce',
   'adb11032b9b7f62f865228dfa1c27258ca3fa0df',
   'c2-run21-session-battery-oracle.kt'),
  (154,'858c9ce5cb6a7916d63f2348432013e49d02ba79',
   '3ecb3b3893d8f710dd7f5203f8378bc784841baf',
   'c2-run21-thermal-policy-oracle.kt')
]:
    w={'schema':'ultra-sentinel-c2-run21-original-negative-witness/v1',
       'pr':pr,'headSha':head,'blobSha':blob,
       'sourceSha256':sha(root/f'{pr}.kt'),
       'oracleSha256':sha(repo/'tests'/'oracles'/oracle),
       'originalLogSha256':sha(root/f'{pr}-original.log'),
       'counterfactualLogSha256':sha(root/f'{pr}-mutant.log'),
       'normalControlPassed':True,'behaviorWitnessed':True,
       'sensitivityProven':True,'originalCallsitePinned':True,
       'candidateRead':False,'baselineRead':False}
    (root/f'{pr}-witness.json').write_text(json.dumps(w,sort_keys=True)+'\n')
print('C2_RUN21_TWO_INDEPENDENT_ORIGINAL_NEGATIVE_ORACLES_PASS')
PY
