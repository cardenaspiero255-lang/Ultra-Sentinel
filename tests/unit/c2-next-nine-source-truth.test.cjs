'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {sealNineSourceTruth}=require('../../packages/quality-gates/c2-next-nine-source-truth.cjs');
const {NEW}=require('../../packages/quality-gates/c2-next-five-source-truth.cjs');
const {POSITIVES,NEGATIVES}=require('../../packages/quality-gates/c2-next-four-scoped-truth.cjs');
const {SAFE}=require('../../packages/quality-gates/c2-next-seven-source-truth.cjs');
const crypto=require('node:crypto');
const root='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/';
function seven(){
 const clean=x=>({pr:x.pr,headSha:x.headSha,blobSha:x.blobSha,rule:x.rule,
  path:x.path,line:x.line,positive:x.positive});
 const labels=[NEW,...POSITIVES,...SAFE.map(clean),...NEGATIVES.map(clean)].map(x=>({...x}));
 const raw={
  schema:'ultra-sentinel-c2-next-seven-original-source-truth/v1',
  packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
  engineSourceSha:'547938ed88804e25bbabecf74a3c3d91b74cf1a4',
  previousTruthDigest:'c1806b94f2ddeb026a2d8eb0009398cc5a660445220abfd2dde4f391a7d4a8d0',labels
 };
 const digest=crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex');
 assert.equal(digest,'1a8938be1716ec67162bf6bad4f164da527f734e75499326ab912cae95f56cd7');
 return {schema:'ultra-sentinel-c2-next-seven-original-source-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
  engineSourceSha:raw.engineSourceSha,packetDigest:raw.packetDigest,
  previousTruthDigest:raw.previousTruthDigest,
  evidence:{previousSealRun:38969278857,previousSealArtifact:12075338764,
   newWitnessRun:38969804193,newWitnessArtifact:12076406708},
  labels,sourcePositiveLabels:3,verifiedScopedNegativeLabels:4,verifiedNegativeFindingLabels:4,
  benchmarkScoredLabels:0,neededAdditionalPositiveLabelsAtLeast:45,
  neededAdditionalNegativeLabelsAtLeast:44,neededAdditionalLabelsAtLeast:113,
  includesPredictions:false,includesBaseline:false,sealedTruthDigest:digest,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  tripleSPlusCertified:false,canMerge:false,canRepair:false,
  verdict:'TRUTH_CORPUS_INCOMPLETE',
  limitation:'Three reproduced positives and four bounded negatives, no whole-file completeness or measured old/new benchmark and no SSS+.'};
}
function witness(){return{
 schema:'ultra-sentinel-c2-next-pr150-confidence-original-oracle/v1',
 pr:150,headSha:'4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',
 sourceGitBlob:'37866fd3dbfcd19d9daaf29a5e1e426391c723d4',
 executedOriginalSource:true,allAuthoritativeSourcesOpposeButConfidenceHigh:true,
 weakExternalEvidenceDowngradesConfidence:true,affirmativeControlHigh:true,
 candidateInspected:false,baselineCompared:false,
 precision:null,recall:null,f1:null,tripleSPlusCertified:false};}
test('owner-run PR150 source witnesses add only two exact independent predicates to 7-label seal',()=>{
 const s=sealNineSourceTruth({previous:seven(),witness:witness()});
 assert.deepEqual(s.labels.map(x=>[x.pr,x.positive]),[[150,true],[150,false],
 [151,true],[152,true],[153,true],[154,false],[155,false],[157,false],[158,false]]);
 assert.equal(s.sourcePositiveLabels,4);
 assert.equal(s.verifiedScopedNegativeLabels,5);
 assert.equal(s.neededAdditionalPositiveLabelsAtLeast,44);
 assert.equal(s.neededAdditionalNegativeLabelsAtLeast,43);
 assert.equal(s.neededAdditionalLabelsAtLeast,111);
 assert.equal(s.benchmarkScoredLabels,0);
 assert.equal(s.includesPredictions,false);assert.equal(s.includesBaseline,false);
 assert.equal(s.precision,null);assert.equal(s.recall,null);assert.equal(s.f1,null);
 assert.equal(s.tripleSPlusCertified,false);
 assert.match(s.sealedTruthDigest,/^[a-f0-9]{64}$/);
 assert.equal(new Set(s.labels.map(x=>[x.pr,x.rule,x.path,x.line].join('|'))).size,9);
});
test('tampering previous 7, source evidence and prediction fields fails closed',()=>{
 const edits=[
 x=>x.previous.labels[2].positive=false,
 x=>x.previous.labels[0].rule='INVALID',
 x=>x.previous.sealedTruthDigest='f'.repeat(64),
 x=>x.previous.neededAdditionalLabelsAtLeast=0,
 x=>x.previous.extra=true,
 x=>x.witness.pr=151,
 x=>x.witness.headSha='f'.repeat(40),
 x=>x.witness.sourceGitBlob='f'.repeat(40),
 x=>x.witness.executedOriginalSource=false,
 x=>x.witness.allAuthoritativeSourcesOpposeButConfidenceHigh=false,
 x=>x.witness.weakExternalEvidenceDowngradesConfidence=false,
 x=>x.witness.affirmativeControlHigh=false,
 x=>x.witness.candidateInspected=true,
 x=>x.witness.baselineCompared=true,
 x=>x.witness.precision=1,
 x=>x.witness.more=true];
 for(const edit of edits){const x={previous:seven(),witness:witness()};edit(x);
  assert.throws(()=>sealNineSourceTruth(x),/C2_NINE_ORIGINAL_TRUTH_BLOCKED/);}
});
