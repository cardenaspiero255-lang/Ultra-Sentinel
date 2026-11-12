#!/usr/bin/env bash
# Independent oracle is compiled and run ONLY after frozen predictions are published.
set -euo pipefail
[ "$#" -eq 5 ] || exit 2
compose=$(realpath "$1")
compiler=$(realpath "$2")
repo=$(realpath "$3")
sealed=$(realpath "$4")
verdict=$(realpath "$5")
[ -d "$sealed" ] && [ -d "$verdict" ] && [ -z "$(find "$verdict" -mindepth 1 -maxdepth 1 -print -quit)" ] || exit 2
[ -x "$compiler/bin/kotlinc" ] && [ -x "$compiler/bin/kotlin" ] || exit 2
oracle="$repo/tests/fixtures/phase2-frozen-kmp-20261112/IndependentPluralOracle.kt"
[ "$(sha256sum "$oracle" | cut -d' ' -f1)" = 0e74b367c33f65f01d67c96b35fcda0185f9b49d410f9cfeb00f960bfde4155c ] || exit 2
( cd "$sealed" && sha256sum --check --status SHA256SUMS.txt )
[ -f "$sealed/jvm-method-probe.json" ] && [ -f "$sealed/source-only-seal.json" ] || exit 2
src="$compose/components/resources/library/src/commonMain/kotlin/org/jetbrains/compose/resources/plural"
git -C "$compose" -c core.hooksPath=/dev/null rev-parse HEAD > /tmp/phase2-original-compose-head
[ "$(cat /tmp/phase2-original-compose-head)" = 8431de3fdab6251ce5a0d7ab07303f5c85b13827 ] || exit 2
[ "$(git -C "$compose" rev-parse HEAD:components/resources/library/src/commonMain/kotlin/org/jetbrains/compose/resources/plural/PluralRule.kt)" = a5723bab593674e421c935862961ce23e0bff541 ] || exit 2
[ "$(git -C "$compose" rev-parse HEAD:components/resources/library/src/commonMain/kotlin/org/jetbrains/compose/resources/plural/PluralCategory.kt)" = 6640784432d6b59284133ed7e160c99267489d15 ] || exit 2
[ -z "$(git -C "$compose" status --porcelain --untracked-files=all)" ] || exit 2
work=$(mktemp -d "$RUNNER_TEMP/phase2-original-plural-XXXXXX")
trap 'rm -rf "$work" /tmp/phase2-original-compose-head' EXIT
mkdir "$work/red" "$work/green" "$work/wrong"
"$compiler/bin/kotlinc" -jvm-target 17 "$src/PluralRule.kt" "$src/PluralCategory.kt" "$oracle" -d "$work/red"
if "$compiler/bin/kotlin" -classpath "$work/red" independent.prospective.IndependentPluralOracleKt > "$work/red.log" 2>&1; then
 echo ORIGINAL_CLDR_OVERFLOW_NOT_REPRODUCED >&2;exit 1
fi
grep -Fq 'ORIGINAL_CLDR_ABSOLUTE_INT_MIN_OVERFLOW' "$work/red.log" || { cat "$work/red.log" >&2;exit 1; }
python3 - "$src/PluralRule.kt" "$work" <<'PY'
from pathlib import Path
import sys
source=Path(sys.argv[1]).read_text()
work=Path(sys.argv[2])
parts=[
 ("Operand.N, Operand.I -> n.absoluteValue\n                    else -> 0",
  "Operand.N, Operand.I -> n.toLong().absoluteValue\n                    else -> 0L"),
 ("expressionOperandValue % operandDivisor","expressionOperandValue % operandDivisor.toLong()"),
 ("return ranges.any { moduloAppliedValue in it } != comparisonIsNegated",
  "return ranges.any { moduloAppliedValue >= it.first.toLong() && moduloAppliedValue <= it.last.toLong() } != comparisonIsNegated")
]
candidate=source
for old,new in parts:
 if candidate.count(old)!=1: raise SystemExit('ORIGINAL_KOTLIN_CANDIDATE_DRIFT')
 candidate=candidate.replace(old,new,1)
if source.count("Operand.N, Operand.I -> n.absoluteValue")!=1:
 raise SystemExit('WRONG_PATCH_ANCHOR_DRIFT')
bad=source.replace("Operand.N, Operand.I -> n.absoluteValue","Operand.N, Operand.I -> 0",1)
(work/'candidate.kt').write_text(candidate)
(work/'wrong.kt').write_text(bad)
PY
"$compiler/bin/kotlinc" -jvm-target 17 "$work/candidate.kt" "$src/PluralCategory.kt" "$oracle" -d "$work/green"
"$compiler/bin/kotlin" -classpath "$work/green" independent.prospective.IndependentPluralOracleKt > "$work/green.log"
grep -Fxq 'INDEPENDENT_ORIGINAL_PLURAL_JVM_GREEN' "$work/green.log"
"$compiler/bin/kotlinc" -jvm-target 17 "$work/wrong.kt" "$src/PluralCategory.kt" "$oracle" -d "$work/wrong"
if "$compiler/bin/kotlin" -classpath "$work/wrong" independent.prospective.IndependentPluralOracleKt > "$work/wrong.log" 2>&1; then
 echo 'WRONG_PLURAL_PATCH_EVADED_ORACLE_VETO' >&2;exit 1
fi
grep -Fq 'BENIGN_PLURAL_REGRESSION' "$work/wrong.log" || { cat "$work/wrong.log" >&2;exit 1; }
[ -z "$(git -C "$compose" status --porcelain --untracked-files=all)" ] || exit 2
node - "$repo/docs/quality/PHASE2-NEW-KMP-PROSPECTIVE-FREEZE-20261112.json" "$sealed" "$verdict" <<'JS'
'use strict';
const fs=require('node:fs'),path=require('node:path');
const [manifest,source,output]=process.argv.slice(2);
const m=JSON.parse(fs.readFileSync(manifest,'utf8'));
const seal=JSON.parse(fs.readFileSync(path.join(source,'source-only-seal.json'),'utf8'));
const jvm=JSON.parse(fs.readFileSync(path.join(source,'jvm-method-probe.json'),'utf8'));
if(seal.engineSha!==m.engine.commitSha||seal.originalKotlinFiles!==38||
 seal.reports.length!==9||seal.scored!==false||
 jvm.sourceAuthenticated!==false||jvm.oracleVerified!==false||
 jvm.novelFamilyVerified!==false||jvm.remoteWrites!==false||jvm.mergeAllowed!==false||
 !Array.isArray(jvm.findings))throw Error('UNTRUSTED_OR_INCOMPLETE_FROZEN_PREORACLE_REPORTS');
const bound=new Map(m.cohorts[1].scopes[0].files.map(x=>[x.path,x.blobSha]));
const truth=m.truth.scopedPositive,control=m.truth.scopedBenignControl;
if(bound.get(truth.path)!==truth.sourceBlobSha||
 bound.get(control.path)!==control.sourceBlobSha)throw Error('SCOPED_TRUTH_SOURCE_MISMATCH');
let caseFindings=[],benignFindings=[];
for(const spec of seal.reports){
 const bytes=fs.readFileSync(path.join(source,spec.id+'-'+spec.kind+'.json'));
 const r=JSON.parse(bytes);
 for(const f of r.findings){
  if(f.path===truth.path&&f.line===truth.line)caseFindings.push({kind:spec.kind,rule:f.rule});
  if(f.path===control.path&&f.line===control.line)benignFindings.push({kind:spec.kind,rule:f.rule});
 }
}
const report={
 schema:'ultra-sentinel-phase2-frozen-kmp-independent-original-oracle/v1',
 frozenEngineSha:seal.engineSha,
 filesEligible:38,workerReports:9,
 originalSourcesAuthentic:true,independentOracleSha256Verified:true,
 scopedOriginalRed:true,manuallyScopedCandidateGreen:true,wrongPatchVeto:true,
 benignControlsPass:true,unmodifiedOriginalCheckout:true,
 sourceOnlyUnverifiedFindings:seal.unverifiedFindings,
 exactScopePositiveAlertCount:caseFindings.length,
 exactScopeNegativeAlertCount:benignFindings.length,
 verifiedScopedFalseNegative:caseFindings.length===0?1:null,
 verifiedScopedTruePositive:caseFindings.length===0?0:null,
 dynamicJvmMethodsProbed:jvm.methodsProbed,
 dynamicJvmUnsupportedMethods:jvm.unsupportedMethods,
 dynamicJvmHypotheses:jvm.findings.length,
 labelUniverseComplete:false,independentHumanAdjudication:false,
 globalFalsePositives:null,globalFalseNegatives:null,
 globalPrecision:null,globalRecall:null,globalF1:null,
 automatedFixerVerified:false,
 unknownFamilyBlindDiscoveryVerified:false,tripleSPlusCertified:false,
 remoteWrites:false,mergeAllowed:false,
 limitation:'A precommitted original CLDR boundary oracle checks one source-specific positive and one benign control. The evaluator did not label every valid defect or negative in 38 original files. A manually scoped candidate is not an autonomous Fixer. The dynamic probe may abstain on boolean-return APIs. No global performance claims.'
};
fs.writeFileSync(path.join(output,'original-oracle-verdict.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('SCOPED_CLDR_ORIGINAL_JVM_RED_GREEN_WRONG_PATCH_VETO_PASS');
console.log('ORIGINAL_SCOPE_FALSE_NEGATIVE='+report.verifiedScopedFalseNegative);
console.log('DYNAMIC_METHODS_PROBED='+report.dynamicJvmMethodsProbed);
JS
