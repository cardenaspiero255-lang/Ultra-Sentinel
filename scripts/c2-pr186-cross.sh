#!/usr/bin/env bash
set -euo pipefail
root="$(realpath "$1")"; suite="$2";repo="$(cd "$(dirname "$0")/.." && pwd)"
test "$GITHUB_ACTIONS" = true && test "$C2_OWNER_SANDBOX" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
command -v bwrap >/dev/null && command -v kotlinc >/dev/null
if [ "$suite" = json-query ];then
 first=json;second=query
 test "$(git hash-object "$root/json-original.kt")" = 886c104effd553cd60f8222bfb05b8505fe7c4b8
 test "$(git hash-object "$root/query-original.kt")" = 0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f
 python3 "$repo/scripts/c2-pr152-json-counterfactual.py" "$root/json-original.kt" "$root/json-repair.kt"
 python3 - "$root" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1]);s=(r/'query-original.kt').read_text()
old='requiresFreshData = currentDataPattern.containsMatchIn(clean),'
new='requiresFreshData = currentDataPattern.containsMatchIn(clean) ||\n                        currentQualifierPattern.containsMatchIn(clean),'
assert s.count(old)==1,'QUERY_ANCHOR_DRIFT'
(r/'query-repair.kt').write_text(s.replace(old,new,1))
PY
 oracles=("$repo/tests/oracles/c2-pr186-json-query-abi.kt" "$repo/tests/oracles/c2-run22-parser-abi.kt" "$repo/tests/oracles/c2-pr186-json-query-oracle.kt")
else
 test "$suite" = rollback-ttl
 first=rollback;second=ttl
 test "$(git hash-object "$root/rollback-original.kt")" = ed936aa687b08cf8d964d54f9d88e68bb12344ec
 test "$(git hash-object "$root/ttl-original.kt")" = 0d18a43a8e36ea3edacc2cad72071d96aa31626e
 test "$(git hash-object "$root/battery-original.kt")" = 8696360219231f3f1477d5ad21c93bca2197e281
 python3 - "$root" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1]);s=(r/'rollback-original.kt').read_text()
a='        require(proposal.version > 0) { "proposal version must be positive" }'
assert s.count(a)==1,'ROLLBACK_ANCHOR_DRIFT'
(r/'rollback-repair.kt').write_text(s.replace(a,a+'\n        if (proposal.version < preferences.getInt(versionKey(cleanPackage), 0)) return',1))
PY
 python3 "$repo/scripts/c2-pr158-advanced-ttl-counterfactual.py" "$root/ttl-original.kt" "$root/ttl-repair.kt"
 oracles=("$root/battery-original.kt" "$repo/tests/oracles/c2-run20-android-preferences-abi.kt" "$repo/tests/oracles/c2-pr186-rollback-ttl-domain-abi.kt" "$repo/tests/oracles/c2-pr158-ai-abi.kt" "$repo/tests/oracles/c2-pr186-rollback-ttl-oracle.kt")
fi
test "$(git hash-object "$root/$first-original.kt")" != "$(git hash-object "$root/$first-repair.kt")"
test "$(git hash-object "$root/$second-original.kt")" != "$(git hash-object "$root/$second-repair.kt")"
for mode in 00 01 10 11;do
 firstFile="$root/$first-original.kt";secondFile="$root/$second-original.kt"
 case "$mode" in 10|11) firstFile="$root/$first-repair.kt";;esac
 case "$mode" in 01|11) secondFile="$root/$second-repair.kt";;esac
 kotlinc "$firstFile" "$secondFile" "${oracles[@]}" -include-runtime -d "$root/$mode.jar" > "$root/$mode.compile" 2>&1 || {
  echo "C2_PR186_COMPILE_ERROR suite=$suite mode=$mode" >&2
  grep 'error:' "$root/$mode.compile" | head -10 >&2 || :
  exit 1
 }
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
 env -i PATH=/usr/bin:/bin HOME=/tmp bwrap --die-with-parent --unshare-all --new-session \
  --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp "${mounts[@]}" \
  --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace --proc /proc --dev /dev \
  --tmpfs /tmp --dir /home --chdir /workspace \
  -- /jdk/bin/java -jar "/workspace/$mode.jar" "$mode"
}
for mode in 00 01 10 11;do
 run_jar "$mode" > "$root/$mode.log" 2>&1
 f=false;s=false
 case "$mode" in 10|11) f=true;;esac
 case "$mode" in 01|11) s=true;;esac
 if [ "$suite" = json-query ];then
  grep -Fxq 'C2_PR186_NORMAL_JSON_QUERY_PASS' "$root/$mode.log"
  grep -Fxq "C2_PR186_VECTOR mode=$mode json=$f query=$s" "$root/$mode.log"
 else
  grep -Fxq 'C2_PR186_ROLLBACK_TTL_ORDINARY_PASS' "$root/$mode.log"
  grep -Fxq "C2_PR186_VECTOR mode=$mode rollback=$f ttl=$s" "$root/$mode.log"
 fi
done
python3 - "$root" "$suite" "$first" "$second" <<'PY'
from pathlib import Path
import hashlib,json,sys
r=Path(sys.argv[1]);suite=sys.argv[2];names=sys.argv[3:5]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for mode in ('00','01','10','11'):
 rows.append({'mode':mode,'firstRepaired':mode[0]=='1','secondRepaired':mode[1]=='1',
 'firstBehaviorCorrect':mode[0]=='1','secondBehaviorCorrect':mode[1]=='1',
 'normalControlsPassed':True,'originalKotlinExecuted':True,
 'jarSha256':sha(r/f'{mode}.jar'),'logSha256':sha(r/f'{mode}.log')})
result={'schema':'c2-pr186-orthogonal-original-kotlin/v1','suite':suite,'rows':rows,
 'sources':[{'name':name,'originalSha256':sha(r/f'{name}-original.kt'),
            'repairSha256':sha(r/f'{name}-repair.kt')} for name in names],
 'candidatePredictionsRead':False,'baselineRead':False,
 'newLabels':0,'certifiedIndependentCausesAdded':0,'sssPlusCertified':False}
(r/'output'/'proof.json').write_text(json.dumps(result,sort_keys=True,indent=2)+'\n')
print('C2_PR186_ORTHOGONAL_JVM_FOUR_VARIANTS_PASS '+suite)
PY
