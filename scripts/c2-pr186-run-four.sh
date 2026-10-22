#!/usr/bin/env bash
set -euo pipefail
suite="$1";root="$(realpath "$2")";repo="$(cd "$(dirname "$0")/.." && pwd)"
test "$GITHUB_ACTIONS" = true
test "$C2_OWNER_SANDBOX" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
command -v bwrap >/dev/null
test -f "$root/original.kt" && test ! -L "$root/original.kt"
case "$suite" in
 json)
  test "$(git hash-object "$root/original.kt")" = 886c104effd553cd60f8222bfb05b8505fe7c4b8
  oracle=c2-pr186-json-boundary-oracle.kt
  abi=("$repo/tests/oracles/c2-pr152-json-abi.kt")
  python3 "$repo/scripts/c2-pr152-json-counterfactual.py" "$root/original.kt" "$root/repaired.kt";;
 rollback)
  test "$(git hash-object "$root/original.kt")" = ed936aa687b08cf8d964d54f9d88e68bb12344ec
  oracle=c2-pr186-rollback-isolation-oracle.kt
  abi=("$repo/tests/oracles/c2-run20-android-preferences-abi.kt" "$repo/tests/oracles/c2-run20-profile-domain-abi.kt");;
 thermal)
  test "$(git hash-object "$root/original.kt")" = 0d18a43a8e36ea3edacc2cad72071d96aa31626e
  test "$(git hash-object "$root/battery.kt")" = 8696360219231f3f1477d5ad21c93bca2197e281
  oracle=c2-pr186-thermal-age-oracle.kt
  abi=("$root/battery.kt" "$repo/tests/oracles/c2-pr158-domain-abi.kt" "$repo/tests/oracles/c2-pr158-ai-abi.kt")
  python3 "$repo/scripts/c2-pr158-advanced-ttl-counterfactual.py" "$root/original.kt" "$root/repaired.kt";;
 query)
  test "$(git hash-object "$root/original.kt")" = 0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f
  oracle=c2-pr186-query-freshness-oracle.kt
  abi=("$repo/tests/oracles/c2-run22-parser-abi.kt");;
 *) echo C2_PR186_UNKNOWN_SUITE >&2; exit 2;;
esac
python3 - "$suite" "$root" <<'PY'
from pathlib import Path
import sys
s,r=sys.argv[1],Path(sys.argv[2])
o=(r/'original.kt').read_text()
def once(txt,a,b):
 assert txt.count(a)==1, 'C2_PR186_FROZEN_ANCHOR_DRIFT'
 return txt.replace(a,b,1)
if s=='rollback':
 f=once(o,'        require(proposal.version > 0) { "proposal version must be positive" }',
 '        require(proposal.version > 0) { "proposal version must be positive" }\n'
 '        if (proposal.version < preferences.getInt(versionKey(cleanPackage), 0)) return')
 (r/'repaired.kt').write_text(f)
elif s=='query':
 f=once(o,'requiresFreshData = currentDataPattern.containsMatchIn(clean),',
  'requiresFreshData = currentDataPattern.containsMatchIn(clean) ||\n'
  '                        currentQualifierPattern.containsMatchIn(clean),')
 (r/'repaired.kt').write_text(f)
else:f=(r/'repaired.kt').read_text()
if s=='json':
 bad=once(f,'val body = json.substring(start, end)',
  "val body = json.substring(start, json.lastIndexOf(']'))")
elif s=='rollback':
 bad=once(f,'if (proposal.version < preferences.getInt(versionKey(cleanPackage), 0)) return',
  'if (proposal.version < preferences.getInt(versionKey("game.alpha"), 0)) return')
elif s=='thermal':
 bad=once(f,'                previousAge <= ADVANCED_SIGNAL_MAX_AGE_MILLIS',
  '                previousAge <= ADVANCED_SIGNAL_MAX_AGE_MILLIS &&\n'
  '                context.sessionActive')
else:
 bad=once(f,'requiresFreshData = currentDataPattern.containsMatchIn(clean) ||\n'
  '                        currentQualifierPattern.containsMatchIn(clean),',
  'requiresFreshData = true,')
(r/'wrong.kt').write_text(bad)
assert o!=f and f!=bad and o!=bad
PY
for phase in original repaired wrong;do
 kotlinc "$root/$phase.kt" "${abi[@]}" "$repo/tests/oracles/$oracle" \
  -include-runtime -d "$root/$phase.jar" > "$root/$phase.compile.log" 2>&1 || {
   grep -E '(error:|Exception)' "$root/$phase.compile.log" | head -12 >&2 || :
   echo "C2_PR186_COMPILATION_FAILURE=$suite:$phase" >&2;exit 1;
  }
done
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
mounts=(--ro-bind /usr /usr)
for m in /bin /lib /lib64;do
 if [ -L "$m" ];then
  target="$(readlink "$m")"
  [[ "$target" != /* && "$target" != *..* ]] || exit 2
  mounts+=(--symlink "$target" "$m")
 elif [ -d "$m" ];then mounts+=(--ro-bind "$m" "$m")
 else exit 2;fi
done
for phase in original repaired wrong;do
 if env -i PATH=/usr/bin:/bin HOME=/tmp bwrap --die-with-parent \
   --unshare-all --new-session --clearenv --setenv PATH /usr/bin:/bin \
   --setenv HOME /tmp "${mounts[@]}" --ro-bind "$jdk" /jdk \
   --ro-bind "$root" /workspace --proc /proc --dev /dev --tmpfs /tmp \
   --dir /home --chdir /workspace -- /jdk/bin/java -jar "/workspace/$phase.jar" \
   > "$root/$phase.log" 2>&1;then rc=0;else rc=$?;fi
 if [ "$phase" = repaired ];then
  test "$rc" -eq 0
  grep -Fxq C2_PR186_NORMAL_CONTROL_PASS "$root/$phase.log"
  grep -Fxq C2_PR186_DISCRIMINATIVE_GUARD_PASS "$root/$phase.log"
 else
  test "$rc" -ne 0
  case "$suite:$phase" in
   json:*) marker=C2_PR186_JSON_UNBOUNDED_OR_PREMATURE_ARRAY_SPAN;;
   rollback:original) marker=C2_PR186_ROLLBACK_STALE_VERSION_OVERWRITE;;
   rollback:wrong) marker=C2_PR186_ROLLBACK_GLOBAL_GUARD_REJECTED_INDEPENDENT_GAME;;
   thermal:original) marker=C2_PR186_THERMAL_TTL_RESET_EXTENDED_STALE_SIGNAL;;
   thermal:wrong) marker=C2_PR186_THERMAL_BLANKET_CLEAR_DISCARDED_FRESH_SIGNAL;;
   query:original) marker=C2_PR186_QUERY_CURRENT_QUALIFIER_LOST;;
   query:wrong) marker=C2_PR186_QUERY_STATIC_COMPARISON_BROKEN;;
  esac
  grep -Fq "$marker" "$root/$phase.log"
 fi
done
python3 - "$suite" "$root" <<'PY'
import sys,json,hashlib
from pathlib import Path
s,r=sys.argv[1],Path(sys.argv[2])
h=lambda x:hashlib.sha256((r/x).read_bytes()).hexdigest()
cases={'json':('152:110','JSON_ARRAY_TERMINATION_HYPOTHESIS'),
'rollback':('152:41','ROLLBACK_VERSION_MONOTONICITY_HYPOTHESIS'),
'thermal':('158:114','ADVANCED_SIGNAL_OBSERVATION_AGE_HYPOTHESIS'),
'query':('158:144','FRESHNESS_QUALIFIER_PARSING_HYPOTHESIS')}
ident,key=cases[s]
out={'schema':'c2-pr186-discriminative-original-kotlin-source/v1','suite':s,
'identityKey':ident,'mechanismHypothesisKey':key,'originalGitBlobVerified':True,
'sourceOriginalSha256':h('original.kt'),'repairedSha256':h('repaired.kt'),
'wrongFixSha256':h('wrong.kt'),'originalFailureLogSha256':h('original.log'),
'repairSuccessLogSha256':h('repaired.log'),
'adversarialWrongFixFailureLogSha256':h('wrong.log'),
'normalControlPassedOnRepair':True,'wrongFixKilled':True,'originalDefectObserved':True,
'sourceBehaviorOnly':True,'detectorPredictionsRead':False,
'newGoldLabels':0,'certifiedIndependentCauseAdded':False}
(r/'output').mkdir(exist_ok=True)
(r/'output/receipt.json').write_text(json.dumps(out,sort_keys=True)+'\n')
print('C2_PR186_DISCRIMINATIVE_JVM_SUCCESS='+s)
PY
