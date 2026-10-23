#!/usr/bin/env bash
set -euo pipefail
umask 077
test "$GITHUB_ACTIONS" = true
test "$C2_OWNER_SANDBOX" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
suite="$1";root="$(realpath "$2")"
test -d "$root" && test ! -L "$root"
for c in gh jq kotlinc bwrap git python3 node java;do command -v "$c" >/dev/null;done
get_source(){
 local tag="$1" blob="$2"
 gh api "/repos/cardenaspiero255-lang/gamehub-ultra/git/blobs/$blob" > "$root/meta.json"
 jq -e --arg b "$blob" '.sha==$b and .encoding=="base64" and .size>100 and .size<1000000' "$root/meta.json" >/dev/null
 jq -r .content "$root/meta.json" | base64 --decode > "$root/$tag-original.kt"
 test "$(git hash-object "$root/$tag-original.kt")" = "$blob"
 rm "$root/meta.json"
}
case "$suite" in
 ttl-thermal)
  first=ttl;second=thermal;id1=158:114;id2=151:264
  blob1=0d18a43a8e36ea3edacc2cad72071d96aa31626e
  blob2=adb11032b9b7f62f865228dfa1c27258ca3fa0df
  abis=(tests/oracles/c2-cross-ttl-thermal-abi.kt tests/oracles/c2-pr158-ai-abi.kt tests/oracles/c2-cross-ttl-thermal.kt);;
 query-confidence)
  first=query;second=confidence;id1=158:144;id2=150:251
  blob1=0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f
  blob2=37866fd3dbfcd19d9daaf29a5e1e426391c723d4
  abis=(tests/oracles/c2-run22-parser-abi.kt tests/oracles/c2-next-pr150-confidence-domain-abi.kt tests/oracles/c2-cross-query-confidence.kt);;
 json-confidence)
  first=json;second=confidence;id1=152:110;id2=150:252
  blob1=886c104effd553cd60f8222bfb05b8505fe7c4b8
  blob2=37866fd3dbfcd19d9daaf29a5e1e426391c723d4
  abis=(tests/oracles/c2-pr152-json-abi.kt tests/oracles/c2-next-pr150-confidence-domain-abi.kt tests/oracles/c2-cross-json-confidence.kt);;
 refresh-battery)
  first=refresh;second=battery;id1=152:207;id2=155:12
  blob1=549e3b1d619b83e59bc37b31b4860191c25528f1
  blob2=8696360219231f3f1477d5ad21c93bca2197e281
  abis=(tests/oracles/c2-cross-refresh-battery-abi.kt tests/oracles/c2-cross-refresh-battery.kt);;
 *) echo C2_UNKNOWN_SUITE >&2;exit 2;;
esac
get_source "$first" "$blob1"
get_source "$second" "$blob2"
if [ "$first" = ttl ];then
 python3 scripts/c2-pr158-advanced-ttl-counterfactual.py "$root/$first-original.kt" "$root/$first-repair.kt"
elif [ "$first" = json ];then
 python3 scripts/c2-pr152-json-counterfactual.py "$root/$first-original.kt" "$root/$first-repair.kt"
else
 python3 - "$suite" "$root/$first-original.kt" "$root/$first-repair.kt" <<'PY'
from pathlib import Path
import sys
suite=sys.argv[1];source=Path(sys.argv[2]).read_text()
if suite=='query-confidence':
 before='requiresFreshData = currentDataPattern.containsMatchIn(clean),'
 after='requiresFreshData = currentDataPattern.containsMatchIn(clean) ||\n                        currentQualifierPattern.containsMatchIn(clean),'
else:
 before='val candidate = grouped.maxByOrNull { it.value } ?: return null'
 after='val candidate = grouped.filterKeys { it in capabilities.supportedRefreshRatesHz }.maxByOrNull { it.value } ?: return null'
assert source.count(before)==1,'FIRST_ORIGINAL_SOURCE_DRIFT'
Path(sys.argv[3]).write_text(source.replace(before,after,1))
PY
fi
if [ "$second" = confidence ];then
 node - "$root/confidence-original.kt" "$root/confidence-repair.kt" <<'NODE'
const fs=require('node:fs'),{buildCausalVariants}=require('./packages/quality-gates/c2-pr150-causal-matrix.cjs');
const v=buildCausalVariants(fs.readFileSync(process.argv[2],'utf8'));
fs.writeFileSync(process.argv[3],v.both,{flag:'wx',mode:0o600});
NODE
else
 python3 - "$suite" "$root/$second-original.kt" "$root/$second-repair.kt" <<'PY'
from pathlib import Path
import sys
source=Path(sys.argv[2]).read_text()
if sys.argv[1]=='ttl-thermal':
 before='!current.thermalHeadroom.isNaN() &&';after='current.thermalHeadroom.isFinite() &&'
else:
 before='require(highDrainPercentPerHour > 0f)';after='require(highDrainPercentPerHour.isFinite() && highDrainPercentPerHour > 0f)'
assert source.count(before)==1,'SECOND_ORIGINAL_SOURCE_DRIFT'
Path(sys.argv[3]).write_text(source.replace(before,after,1))
PY
fi
test "$(git hash-object "$root/$first-original.kt")" = "$blob1"
test "$(git hash-object "$root/$second-original.kt")" = "$blob2"
test "$(git hash-object "$root/$first-repair.kt")" != "$blob1"
test "$(git hash-object "$root/$second-repair.kt")" != "$blob2"
mkdir -p "$root/output"
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
for mode in 00 01 10 11;do
 firstFile="$root/$first-original.kt";secondFile="$root/$second-original.kt"
 case "$mode" in 10|11) firstFile="$root/$first-repair.kt";;esac
 case "$mode" in 01|11) secondFile="$root/$second-repair.kt";;esac
 kotlinc "$firstFile" "$secondFile" "${abis[@]}" -include-runtime -d "$root/$mode.jar" > "$root/$mode.compile" 2>&1 || {
  grep -E 'error:|Exception' "$root/$mode.compile"|head -14 >&2 || :;exit 2;
 }
 env -i PATH=/usr/bin:/bin HOME=/tmp bwrap --die-with-parent \
  --unshare-all --new-session --clearenv --setenv PATH /usr/bin:/bin \
  --setenv HOME /tmp "${mounts[@]}" --ro-bind "$jdk" /jdk \
  --ro-bind "$root" /workspace --proc /proc --dev /dev --tmpfs /tmp \
  --dir /home --chdir /workspace -- /jdk/bin/java -jar "/workspace/$mode.jar" "$mode" \
  > "$root/$mode.log" 2>&1 || {
   grep -E 'Exception|C2_CROSS' "$root/$mode.log"|head -14 >&2 || :;exit 2;
  }
 grep -Fxq "C2_CROSS_SUITE $suite" "$root/$mode.log"
 grep -Fxq C2_CROSS_NORMAL_CONTROLS_PASS "$root/$mode.log"
 a=false;c=false
 case "$mode" in 10|11) a=true;;esac
 case "$mode" in 01|11) c=true;;esac
 grep -Fxq "C2_CROSS_VECTOR mode=$mode first=$a second=$c" "$root/$mode.log"
done
python3 - "$root" "$suite" "$id1" "$id2" "$blob1" "$blob2" <<'PY'
import json,hashlib,sys
from pathlib import Path
root=Path(sys.argv[1]);suite,id1,id2,blob1,blob2=sys.argv[2:]
h=lambda f:hashlib.sha256((root/f).read_bytes()).hexdigest()
rows=[]
for mode in ('00','01','10','11'):
 rows.append(dict(mode=mode,firstRepaired=mode[0]=='1',secondRepaired=mode[1]=='1',
 firstCorrect=mode[0]=='1',secondCorrect=mode[1]=='1',benignControlsPassed=True,
 actualJointKotlinJvm=True,javaArtifactSha256=h(mode+'.jar'),executionLogSha256=h(mode+'.log')))
report=dict(schema='c2-two-real-sources-four-jvm-repair-states/v1',suite=suite,
 identities=[id1,id2],originalSourceGitBlobs=[blob1,blob2],
 originalSourcesVerified=True,originalSourcesUnmodified=True,networkIsolatedJVM=True,
 rows=rows,detectorPredictionsRead=False,externalCandidateSourceRead=False,
 newGoldLabels=0,causalFamiliesCertified=0,holdoutFrozen=False,sssPlusCertified=False)
(root/'output'/'receipt.json').write_text(json.dumps(report,sort_keys=True,indent=2)+'\n')
print('C2_FOUR_REAL_JVM_CROSS_SUITE_OK '+suite)
PY
