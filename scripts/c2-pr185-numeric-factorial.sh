#!/usr/bin/env bash
set -euo pipefail
root="$(realpath "$1")";repo="$(cd "$(dirname "$0")/.." && pwd)"
test "$GITHUB_ACTIONS" = true
test "$C2_OWNER_SANDBOX" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
command -v bwrap >/dev/null
command -v kotlinc >/dev/null
test -f "$root/math-original.kt" && test ! -L "$root/math-original.kt"
test -f "$root/battery-original.kt" && test ! -L "$root/battery-original.kt"
test "$(git hash-object "$root/math-original.kt")" = 063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a
test "$(git hash-object "$root/battery-original.kt")" = 8696360219231f3f1477d5ad21c93bca2197e281
test "$(sha256sum "$root/math-original.kt" | cut -d' ' -f1)" = f9fbdbd7aabd2dffbadc4b04b31280779bd7359624c081b9e64d532d8c40f65a
test "$(sha256sum "$root/battery-original.kt" | cut -d' ' -f1)" = cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b
python3 - "$root" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1])
m=(r/'math-original.kt').read_text(encoding='utf8')
before='''        val sqrtDiscriminant = BigDecimal.valueOf(
            kotlin.math.sqrt(discriminant.toDouble())
        ).round(mathContext)'''
after='''        val discriminantAsDouble = discriminant.toDouble()
        if (!discriminantAsDouble.isFinite()) return null
        val sqrtDiscriminant = BigDecimal.valueOf(
            kotlin.math.sqrt(discriminantAsDouble)
        ).round(mathContext)'''
assert m.count(before)==1,'C2_PR185_MATH_FROZEN_ANCHOR_DRIFT'
(r/'math-repair.kt').write_text(m.replace(before,after,1),encoding='utf8')
b=(r/'battery-original.kt').read_text(encoding='utf8')
old='require(highDrainPercentPerHour > 0f)'
new='require(highDrainPercentPerHour.isFinite() && highDrainPercentPerHour > 0f)'
assert b.count(old)==1,'C2_PR185_BATTERY_FROZEN_ANCHOR_DRIFT'
(r/'battery-repair.kt').write_text(b.replace(old,new,1),encoding='utf8')
PY
test "$(git hash-object "$root/math-repair.kt")" != 063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a
test "$(git hash-object "$root/battery-repair.kt")" != 8696360219231f3f1477d5ad21c93bca2197e281
for mode in 00 01 10 11;do
 case "$mode" in 10|11) math="$root/math-repair.kt";; *) math="$root/math-original.kt";;esac
 case "$mode" in 01|11) battery="$root/battery-repair.kt";; *) battery="$root/battery-original.kt";;esac
 kotlinc "$math" "$battery" "$repo/tests/oracles/c2-run17-battery-abi.kt" \
  "$repo/tests/oracles/c2-pr185-numeric-factorial-oracle.kt" -include-runtime \
  -d "$root/matrix-$mode.jar" > "$root/compile-$mode.log" 2>&1 || {
   grep -E '(error:|Exception)' "$root/compile-$mode.log" | head -12 >&2 || :
   echo "C2_PR185_KOTLIN_COMPILE_FAILED mode=$mode" >&2
   exit 1
  }
 test -s "$root/matrix-$mode.jar"
done
run_jar(){
 local mode="$1";local jdk
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
 env -i PATH=/usr/bin:/bin HOME=/tmp bwrap --die-with-parent --unshare-all \
  --new-session --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
  "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
  --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
  -- /jdk/bin/java -jar "/workspace/matrix-$mode.jar" "$mode"
}
for mode in 00 01 10 11;do
 run_jar "$mode" > "$root/run-$mode.log" 2>&1
 grep -Fxq 'C2_PR185_ORDINARY_CONTROLS_PASS' "$root/run-$mode.log"
 case "$mode" in
  00) expected='C2_PR185_VECTOR mode=00 math=false battery=false';;
  01) expected='C2_PR185_VECTOR mode=01 math=false battery=true';;
  10) expected='C2_PR185_VECTOR mode=10 math=true battery=false';;
  11) expected='C2_PR185_VECTOR mode=11 math=true battery=true';;
 esac
 grep -Fxq "$expected" "$root/run-$mode.log"
 grep -Fxq 'C2_PR185_FACTORIAL_SCOPE_PASS' "$root/run-$mode.log"
done
python3 - "$root" <<'PY'
import hashlib,json,sys
from pathlib import Path
r=Path(sys.argv[1])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources=[
 {'id':'154:100','head':'858c9ce5cb6a7916d63f2348432013e49d02ba79',
 'blob':'063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a',
 'sourceSha256':sha(r/'math-original.kt')},
 {'id':'155:12','head':'2289f4e4cda55ddaa50f2016113ded82dc17203c',
 'blob':'8696360219231f3f1477d5ad21c93bca2197e281',
 'sourceSha256':sha(r/'battery-original.kt')}
]
rows=[]
for mode in ['00','01','10','11']:
 m=bool(int(mode[0]));b=bool(int(mode[1]))
 rows.append({'mathRepair':m,'batteryRepair':b,'mathGuardedSuccess':m,
 'batteryPolicyRejectsNonfinite':b,'normalMathControlPassed':True,
 'normalBatteryControlPassed':True,'actualJVMExecution':True,
 'jarSha256':sha(r/f'matrix-{mode}.jar'),'logSha256':sha(r/f'run-{mode}.log')})
x={'schema':'c2-pr185-numeric-factorial-kotlin-replay/v1',
 'sourceRepository':'cardenaspiero255-lang/gamehub-ultra','sources':sources,
 'variantSha256s':[sha(r/'math-repair.kt'),sha(r/'battery-repair.kt')],
 'originalSourceUnmodified':True,'rows':rows,'originalOperatorPatchScoped':True,
 'modelPredictionsRead':False,'baselineRead':False,'repositoryWritePerformed':False}
(r/'output'/'factorial-source-evidence.json').write_text(json.dumps(x,indent=2,sort_keys=True)+'\n')
print('C2_PR185_FOUR_KOTLIN_FACTORIAL_JVM_VARIANTS_PASS')
PY
