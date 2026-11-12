#!/usr/bin/env bash
# Only invoked AFTER the frozen source-only reports have been sealed.
set -euo pipefail
[ "$#" -eq 5 ] || exit 2
poet=$(realpath "$1")
android=$(realpath "$2")
compiler=$(realpath "$3")
repo=$(realpath "$4")
output=$(realpath "$5")
[ -d "$output" ] && [ -f "$output/sealed-receipt.json" ] || exit 2
[ -x "$compiler/bin/kotlinc" ] && [ -x "$compiler/bin/kotlin" ] || exit 2
oracle="$repo/tests/fixtures/phase2-external-dual-20261111"
python3 - "$oracle" <<'PY'
import hashlib,pathlib,sys
root=pathlib.Path(sys.argv[1])
names=['IndependentNameAllocatorOracle.kt','TestOnlyCodePointSupport.kt','IndependentTaskOracle.kt']
actual=hashlib.sha256(b''.join(x.encode()+b'\0'+(root/x).read_bytes() for x in names)).hexdigest()
if actual!='aa4743fb6aedcef5c347a6adfc69c407b8c5496124436afa0ef094b09b8cc5b9':
    raise SystemExit('PRECOMMITTED_ORACLE_PREIMAGE_MISMATCH')
print('INDEPENDENT_ORACLE_PRECOMMITMENT_VERIFIED')
PY
srcName="$poet/kotlinpoet/src/commonMain/kotlin/com/squareup/kotlinpoet/NameAllocator.kt"
srcTask="$android/app/src/main/java/com/example/android/architecture/blueprints/todoapp/data/Task.kt"
srcStats="$android/app/src/main/java/com/example/android/architecture/blueprints/todoapp/statistics/StatisticsUtils.kt"
[ "$(git -C "$poet" rev-parse HEAD:kotlinpoet/src/commonMain/kotlin/com/squareup/kotlinpoet/NameAllocator.kt)" = 32d4a1e348c23a7369a5dd81fbd71aafb52846a4 ] || exit 2
[ "$(git -C "$android" rev-parse HEAD:app/src/main/java/com/example/android/architecture/blueprints/todoapp/data/Task.kt)" = 91377071c9d49deab552fc685a8668a791fae051 ] || exit 2
work=$(mktemp -d "$RUNNER_TEMP/dual-independent-oracle-XXXXXX")
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/red" "$work/green" "$work/wrong" "$work/negative"
support="$oracle/TestOnlyCodePointSupport.kt"
positive="$oracle/IndependentNameAllocatorOracle.kt"
"$compiler/bin/kotlinc" -jvm-target 17 "$srcName" "$support" "$positive" -d "$work/red"
if "$compiler/bin/kotlin" -classpath "$work/red" independent.holdout.IndependentNameAllocatorOracleKt > "$work/red.log" 2>&1; then
 echo "ORIGINAL_UNEXPECTED_GREEN" >&2;exit 1
fi
grep -Fq 'FAILURE_ATOMICITY_VIOLATED' "$work/red.log" || { cat "$work/red.log" >&2; exit 1; }
python3 - "$srcName" "$work" <<'PY'
from pathlib import Path
import sys
source=Path(sys.argv[1]).read_text()
work=Path(sys.argv[2])
anchor='    var result = toJavaIdentifier(suggestion)'
wrong='    while (!allocatedNames.add(result)) {'
if source.count(anchor)!=1 or source.count(wrong)!=1:
    raise SystemExit('ORIGINAL_PATCH_ANCHOR_DRIFT')
candidate=source.replace(anchor,
 '    if (tagToName.containsKey(tag)) throw IllegalArgumentException("duplicate tag")\n'+anchor,1)
invalid=source.replace(wrong,'    while (false) {',1)
(work/'candidate.kt').write_text(candidate)
(work/'invalid.kt').write_text(invalid)
PY
"$compiler/bin/kotlinc" -jvm-target 17 "$work/candidate.kt" "$support" "$positive" -d "$work/green"
"$compiler/bin/kotlin" -classpath "$work/green" independent.holdout.IndependentNameAllocatorOracleKt > "$work/green.log"
grep -Fxq 'INDEPENDENT_NAME_ALLOCATOR_ORACLE_GREEN' "$work/green.log"
"$compiler/bin/kotlinc" -jvm-target 17 "$work/invalid.kt" "$support" "$positive" -d "$work/wrong"
if "$compiler/bin/kotlin" -classpath "$work/wrong" independent.holdout.IndependentNameAllocatorOracleKt > "$work/wrong.log" 2>&1; then
 echo 'INCORRECT_PATCH_NOT_VETOED' >&2;exit 1
fi
grep -Fq 'BENIGN_COLLISION_REGRESSION' "$work/wrong.log" || { cat "$work/wrong.log" >&2;exit 1; }
"$compiler/bin/kotlinc" -jvm-target 17 "$srcTask" "$srcStats" "$oracle/IndependentTaskOracle.kt" -d "$work/negative"
"$compiler/bin/kotlin" -classpath "$work/negative" independent.holdout.IndependentTaskOracleKt > "$work/negative.log"
grep -Fxq 'INDEPENDENT_TASK_NEGATIVE_ORACLE_GREEN' "$work/negative.log"
[ -z "$(git -C "$poet" status --porcelain --untracked-files=all)" ] || exit 2
[ -z "$(git -C "$android" status --porcelain --untracked-files=all)" ] || exit 2
node - "$output" <<'JS'
'use strict';
const fs=require('node:fs'),path=require('node:path');
const out=process.argv[2],seal=JSON.parse(fs.readFileSync(path.join(out,'sealed-receipt.json'),'utf8'));
if(seal.sourceCount!==33||seal.unsupportedSourceCount!==9||
 seal.workerReports.length!==3||seal.scored!==false)throw Error('UNSEALED_OR_PARTIAL_PRE_ORACLE_CAPTURE');
const lock=JSON.parse(fs.readFileSync('docs/quality/PHASE2-DOUBLE-EXTERNAL-HOLDOUT-FREEZE-20261111.json','utf8'));
const task=lock.protocol.oracleLabelsPlanned[1];
let possibleFalsePositive=false;
for(const kind of ['numeric','codec','identity']){
 const report=JSON.parse(fs.readFileSync(path.join(out,'android-'+kind+'.json'),'utf8'));
 if(report.findings.some(f=>f.path===task.path&&f.line===task.line))possibleFalsePositive=true;
}
const result={schema:'ultra-sentinel-phase2-double-external-independent-adjudication/v1',
 engineSha:seal.engineSha,originalKotlinSourcesScanned:33,unsupportedPathAbstentions:9,
 independentlyReproducedPositiveOutsideSupportedPath:1,
 independentlyVerifiedNegativeControls:1,
 originalRed:true,scopedCandidateGreen:true,incorrectCandidateVeto:true,
 originalCheckoutPreserved:true,scopedBenignFindingAtLine44:possibleFalsePositive,
 verifiedFalsePositiveCount:possibleFalsePositive?null:0,
 verifiedTruePositiveCount:null,verifiedFalseNegativeCount:null,
 globalPrecision:null,globalRecall:null,globalF1:null,
 fullUniverseLabeled:false,novelFamilyBlindDiscoveryVerified:false,
 tripleSPlusCertified:false,mergeAllowed:false,remoteWrites:false,
 limitation:'KotlinPoet commonMain is outside the frozen path policy: its reproduced behavior is not an evaluated Hunter false negative. Only the Task line 44 benign control was adjudicated; no global detection metrics can be inferred.'};
fs.writeFileSync(path.join(out,'adjudication.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log('ORIGINAL_JVM_POSITIVE_RED_GREEN_VETO_AND_NEGATIVE_CONTROL_VERIFIED');
JS
