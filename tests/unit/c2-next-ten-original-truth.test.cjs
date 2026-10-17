'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {NEW}=require('../../packages/quality-gates/c2-next-five-source-truth.cjs');
const {POSITIVES,NEGATIVES}=require('../../packages/quality-gates/c2-next-four-scoped-truth.cjs');
const {SAFE}=require('../../packages/quality-gates/c2-next-seven-source-truth.cjs');
const {ADD,LAST_SEVEN}=require('../../packages/quality-gates/c2-next-nine-source-truth.cjs');
const {sealTenOriginalTruth}=require('../../packages/quality-gates/c2-next-ten-original-truth.cjs');
const clean=({pr,headSha,blobSha,rule,path,line,positive})=>
 ({pr,headSha,blobSha,rule,path,line,positive});
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function prior(){
 const labels=[...ADD.map(clean),NEW,...POSITIVES,...SAFE.map(clean),...NEGATIVES.map(clean)].map(clean);
 const sealedTruthDigest=digest({
  schema:'ultra-sentinel-c2-next-nine-original-source-truth/v1',
  packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
  engineSourceSha:'547938ed88804e25bbabecf74a3c3d91b74cf1a4',
  previousTruthDigest:LAST_SEVEN,labels});
 assert.equal(sealedTruthDigest,'63ec7f1888e7923b02b0a2ed1e0f841b7f799e930bc6b46b374f68da7ac7c828');
 return {
 schema:'ultra-sentinel-c2-next-nine-original-source-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
 sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
 engineSourceSha:'547938ed88804e25bbabecf74a3c3d91b74cf1a4',
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 previousTruthDigest:LAST_SEVEN,
 evidence:{previousSealRun:38970396948,previousSealArtifact:12076436893,
  newWitnessRun:38982855937,newWitnessArtifact:12082061520},
 labels,prsWithAtLeastOneSourceScopedLabel:8,
 sourcePositiveLabels:4,verifiedScopedNegativeLabels:5,verifiedNegativeFindingLabels:5,
 benchmarkScoredLabels:0,neededAdditionalPositiveLabelsAtLeast:44,
 neededAdditionalNegativeLabelsAtLeast:43,neededAdditionalLabelsAtLeast:111,
 includesPredictions:false,includesBaseline:false,sealedTruthDigest,
 precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
 tripleSPlusCertified:false,canMerge:false,canRepair:false,
 verdict:'TRUTH_CORPUS_INCOMPLETE',limitation:'Nine original-source bounded labels and no measured detector predictions or 95% metrics, full semantic file coverage, or Triple S+ certification in this cohort.'};
}
function witness(){return {
 schema:'ultra-sentinel-c2-pr150-negative-history-source-oracle/v1',
 pr:150,headSha:'4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',
 sourceGitBlob:'37866fd3dbfcd19d9daaf29a5e1e426391c723d4',
 rule:'NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE',line:251,
 originalBadHistoryHigh:true,emptyHistoryMedium:true,
 executedOriginalSource:true,mutantKilled:false,newTruthLabelsSealed:0,
 candidateInspected:false,baselineCompared:false,
 precision:null,recall:null,f1:null,tripleSPlusCertified:false
};}
test('owner witnessed original code extends nine to exactly ten authentic scoped labels',()=>{
 const r=sealTenOriginalTruth({previous:prior(),witness:witness()});
 assert.equal(r.labels.length,10);
 assert.equal(r.labels[0].rule,'NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE');
 assert.equal(r.sourcePositiveLabels,5);
 assert.equal(r.verifiedScopedNegativeLabels,5);
 assert.equal(r.neededAdditionalPositiveLabelsAtLeast,43);
 assert.equal(r.neededAdditionalNegativeLabelsAtLeast,43);
 assert.equal(r.neededAdditionalLabelsAtLeast,110);
 assert.equal(r.benchmarkScoredLabels,0);
 assert.equal(r.precision,null);
 assert.equal(r.fpNonRegressionVerified,false);
 assert.equal(r.tripleSPlusCertified,false);
 assert.equal(r.prsWithAtLeastOneSourceScopedLabel,8);
 assert.equal(new Set(r.labels.map(x=>[x.pr,x.rule,x.path,x.line].join(':'))).size,10);
});
test('tampered witness or previous truth, fake predictions cannot be sealed',()=>{
 const changes=[
 x=>x.previous.labels[0].positive=false,
 x=>x.previous.sealedTruthDigest='f'.repeat(64),
 x=>x.previous.labels.push({...x.previous.labels[0]}),
 x=>x.previous.sourcePositiveLabels=99,
 x=>x.witness.originalBadHistoryHigh=false,
 x=>x.witness.emptyHistoryMedium=false,
 x=>x.witness.headSha='f'.repeat(40),
 x=>x.witness.mutantKilled=true,
 x=>x.witness.candidateInspected=true,
 x=>x.witness.baselineCompared=true,
 x=>x.witness.precision=1,
 x=>x.witness.newTruthLabelsSealed=1,
 x=>x.witness.extra=true
 ];
 for(const change of changes){
  const obj={previous:structuredClone(prior()),witness:witness()};change(obj);
  assert.throws(()=>sealTenOriginalTruth(obj),/C2_TEN_ORIGINAL_TRUTH_BLOCKED/);
 }
});
