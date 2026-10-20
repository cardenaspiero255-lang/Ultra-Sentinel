'use strict';
// TDD source contract fixtures are LOCAL ILLUSTRATIONS, not Detekt upstream gold.
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {TARGETS,assessTarget,staticCounterfactualWitness,gitBlobString,
  captureDetektSix,decodeGitBlob}=require('../../packages/quality-gates/c2-detekt-rule-applicability.cjs');
const PATH='detekt-rules-exceptions/src/main/kotlin/io/gitlab/arturbosch/detekt/rules/exceptions/ThrowingExceptionsWithoutMessageOrCause.kt';
const BAD='if (exceptions.any { calleeExpressionText?.equals(it, ignoreCase = true) == true } && expression.valueArguments.isEmpty()) {';
const GOOD='if (exceptions.any { calleeExpressionText == it } && expression.valueArguments.isEmpty()) {';
function blob(s){
 const bytes=Buffer.from(s,'utf8');
 const sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 return {sha,size:bytes.length,encoding:'base64',content:bytes.toString('base64')};
}
function fixture(){
 const before='override fun visitCallExpression(expression: KtCallExpression) {\n'+BAD+'\n}\n';
 const after='override fun visitCallExpression(expression: KtCallExpression) {\n'+GOOD+'\n}\n';
 const original=blob(before),fixed=blob(after);
 const target={pr:7715,baseSha:'b'.repeat(40),headSha:'a'.repeat(40),
   path:PATH,baseBlob:original.sha,headBlob:fixed.sha,changedFiles:1,focus:true};
 const compare={status:'ahead',base_commit:{sha:target.baseSha},
   merge_base_commit:{sha:target.baseSha},commits:[{sha:target.headSha}],
   files:[{filename:PATH,status:'modified',sha:fixed.sha,additions:1,deletions:1,changes:2,
     patch:'@@ -2,1 +2,1 @@\n-'+BAD+'\n+'+GOOD+'\n'}]};
 return {target,compare,original,fixed};
}
test('six exact upstream PR targets remain explicitly locked and none is a GOLD label',()=>{
 assert.deepEqual(TARGETS.map(x=>x.pr),[7625,7635,7667,7715,7718,7888]);
 for(const t of TARGETS){
  assert.match(t.baseSha,/^[a-f0-9]{40}$/);
  assert.match(t.headSha,/^[a-f0-9]{40}$/);
  assert.match(t.baseBlob,/^[a-f0-9]{40}$/);
  assert.match(t.headBlob,/^[a-f0-9]{40}$/);
  assert.ok(t.path.includes('/src/main/kotlin/'));
  assert.notEqual(t.baseSha,t.headSha);
  assert.ok(!Object.hasOwn(t,'gold'));
 }
});
test('real Core in experimental Kotlin mode scans an attested PR target but does not fabricate a ruleId',()=>{
 const {target,compare,original,fixed}=fixture();
 const r=assessTarget(target,{compare,before:original,after:fixed});
 assert.equal(r.pr,7715);
 assert.equal(r.sourceVerified,true);
 assert.equal(r.sourceKind,'PINNED_UPSTREAM_PR_TARGET_DIFF');
 assert.equal(r.partial,false);
 assert.equal(r.analyzedFiles,1);
 assert.equal(r.coreMode,'experimental-kotlin-jvm-v3-source-scope');
 assert.deepEqual(r.detectorFindings,[]);
 assert.equal(r.verifiedApplicableRuleId,null);
 assert.equal(r.detectorApplicabilityVerified,false);
 assert.equal(r.counterfactual.kind,'SOURCE_STATIC_CONTRAST_ONLY');
 assert.equal(r.counterfactual.changeObserved,true);
 assert.equal(r.newLabels,0);
 assert.equal(r.blindHoldout,false);
 assert.equal(r.sssPlusCertified,false);
});
test('rejects a correct-looking source body with forged Git blob SHA',()=>{
 const {target,compare,original,fixed}=fixture();
 assert.throws(()=>assessTarget(target,{compare,before:original,after:{...fixed,sha:'0'.repeat(40)}}),
  /DETEKT_APPLICABILITY_BLOCKED/);
});
test('rejects wrong historical base / head, and unpinned patch Git blob',()=>{
 for(const mutation of [
  e=>{e.compare.base_commit.sha='1'.repeat(40)},
  e=>{e.compare.commits[0].sha='1'.repeat(40)},
  e=>{e.compare.files[0].sha='1'.repeat(40)},
  e=>{e.compare.files[0].patch='@@ -2,1 +2,1 @@\n-old\n+forged\n'},
 ]){
  const e=fixture();mutation(e);
  assert.throws(()=>assessTarget(e.target,{compare:e.compare,before:e.original,after:e.fixed}),
   /DETEKT_APPLICABILITY_BLOCKED/);
 }
});
test('diverged original PR bases remain explicit and cannot be described as unchanged merge base',()=>{
 const e=fixture();e.compare.status='diverged';
 e.compare.merge_base_commit.sha='c'.repeat(40);
 const r=assessTarget(e.target,{compare:e.compare,before:e.original,after:e.fixed});
 assert.equal(r.historyDiverged,true);
 assert.equal(r.sourceVerified,true);
});
test('counterfactual 7715: vulnerable ignores identifier case; fix and benign exact match do not',()=>{
 const bad='fun visit() {\n  '+BAD+'\n}';
 const good='fun visit() {\n  '+GOOD+'\n}';
 const x=staticCounterfactualWitness(7715,bad,good);
 assert.equal(x.changeObserved,true);
 assert.equal(x.kind,'SOURCE_STATIC_CONTRAST_ONLY');
 assert.equal(staticCounterfactualWitness(7715,good,good).changeObserved,false);
 assert.equal(staticCounterfactualWitness(7715,'// '+BAD,good).changeObserved,false);
 assert.equal(staticCounterfactualWitness(7715,bad,'// '+GOOD).changeObserved,false);
});
test('counterfactual 7888: hard-coded operator set differs from actual configurable rule',()=>{
 const bad=['class UnusedImport {','private val additionalOperatorSet = setOf(',' "assign"',')',
  '!additionalOperatorSet.contains(identifier)','}'].join('\n');
 const good=['class UnusedImport {','private val additionalOperatorSet: List<String> by config(emptyList())',
  'UnusedImportVisitor(bindingContext, additionalOperatorSet)',
  '!additionalOperatorSet.contains(identifier)','}'].join('\n');
 const x=staticCounterfactualWitness(7888,bad,good);
 assert.equal(x.changeObserved,true);
 assert.equal(staticCounterfactualWitness(7888,good,good).changeObserved,false);
 assert.equal(staticCounterfactualWitness(7888,bad,good.replace('by config(emptyList())','by config(123)')).changeObserved,false);
 assert.equal(staticCounterfactualWitness(7888,bad.replace('"assign"','"somethingElse"'),good).changeObserved,false);
});
test('tampered source and missing hunk never produce an apparent clean detection',()=>{
 const e=fixture();
 e.compare.files[0].patch=null;
 assert.throws(()=>assessTarget(e.target,{compare:e.compare,before:e.original,after:e.fixed}),
  /DETEKT_APPLICABILITY_BLOCKED/);
});
test('one case cannot create six labels or fake benchmark metrics',()=>{
 const e=fixture();
 const t=assessTarget(e.target,{compare:e.compare,before:e.original,after:e.fixed});
 assert.equal(t.newLabels,0);
 assert.equal(t.detectorApplicabilityVerified,false);
 assert.equal(t.verifiedApplicableRuleId,null);
 assert.equal(t.blindHoldout,false);
 assert.equal(t.sssPlusCertified,false);
});
test('full matrix fails closed on missing any pinned PR instead of implying complete coverage',()=>{
 const e=fixture();
 assert.throws(()=>captureDetektSix({7715:{compare:e.compare,before:e.original,after:e.fixed}}),
  /DETEKT_APPLICABILITY_BLOCKED/);
});

test('source-verified deletion-only SARIF fix is explicitly unscanned, never counted as a detection',()=>{
 const e=fixture();
 e.target={...e.target,pr:7667,focus:false,
   path:'detekt-report-sarif/src/main/kotlin/io/github/detekt/report/sarif/SarifOutputReport.kt'};
 const original=blob('fun original() {\n    val unused = 1\n}\n');
 const corrected=blob('fun original() {\n}\n');
 e.target.baseBlob=original.sha;
 e.target.headBlob=corrected.sha;
 e.compare.files=[{filename:e.target.path,status:'modified',sha:corrected.sha,
  additions:0,deletions:1,changes:1,
  patch:'@@ -1,3 +1,2 @@\n fun original() {\n-    val unused = 1\n }\n'}];
 const row=assessTarget(e.target,{compare:e.compare,before:original,after:corrected});
 assert.equal(row.sourceVerified,true);
 assert.equal(row.analyzedFiles,0);
 assert.equal(row.partial,true);
 assert.equal(row.limitedReason,'DELETION_ONLY_NO_ADDED_LINES');
 assert.equal(row.verifiedApplicableRuleId,null);
 assert.equal(row.detectorApplicabilityVerified,false);
 assert.equal(row.newLabels,0);
});
