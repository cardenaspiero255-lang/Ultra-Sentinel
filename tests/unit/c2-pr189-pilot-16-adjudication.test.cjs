'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {PILOT,RETRIES,SOURCE_BASE,adjudicatePilot}=require('../../packages/quality-gates/c2-pr189-pilot-16-adjudication.cjs');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const observed=new Set(['detekt_detekt-4205','detekt_detekt-4249',
  'detekt_detekt-4628','detekt_detekt-4728','detekt_detekt-4733',
  'detekt_detekt-4738','pinterest_ktlint-2029','pinterest_ktlint-2091','GradleUp_shadow-1313']);
const baselineObserved=new Set(['detekt_detekt-4205','detekt_detekt-4249','GradleUp_shadow-1313']);
const missingRegression=new Set(['pinterest_ktlint-2053','oss-review-toolkit_ort-10179',
  'ankidroid_Anki-Android-18903','Kotlin_dataframe-1072']);
const mismatch=new Set(['pinterest_ktlint-2029','pinterest_ktlint-2091','linreal_cascade-editor-16']);
function fixture(){
 const original={},retry={};let n=0;
 const mock=(task,status)=>{
  n++;
  const receipt={task,sourceCommit:'b9025d86f7ae634901396766bd61f6d4ae6d2165',
   status,newPositiveLabels:0,newNegativeLabels:0};
  let proof=null,proofBytes=null;
  if(status==='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'){
   const before=SOURCE_BASE[task];
   const after=digest('temporary-upstream-patch-'+task).slice(0,40);
   proof={schema:'ultra-sentinel-c2-upstream-junit-evidence/v1',task,status,
    declaredBeforeCommit:before,declaredAfterCommit:after,
    verifiedFailToPassCount:task==='detekt_detekt-4249'?2:1,
    verifiedNewOrSkippedToPassCount:0,
    sourceCommitProvenanceVerified:false,rawJUnitAuthenticityVerified:false,
    rootCauseVerified:false,independentReviewVerified:false,
    detectorApplicabilityVerified:false,
    newPositiveLabels:0,newNegativeLabels:0,benchmarkScoredLabels:0,tripleSPlusCertified:false};
   proofBytes=Buffer.from(JSON.stringify(proof)+'\n');
   Object.assign(receipt,{candidateTransitions:proof.verifiedFailToPassCount,
    sourceCommitClaim:before,fixedCommitClaim:after,receiptSha256:digest(proofBytes)});
  } else if(status!=='NO_DECLARED_REGRESSION')receipt.reason=status+' downstream original test not shown';
  return {receipt,proof,proofDigest:proofBytes?digest(proofBytes):null,
   artifactDigest:digest(task+'-archive-'+n)};
 };
 for(const entry of PILOT){
  const task=entry.task;
  const status=baselineObserved.has(task)?'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED':
   missingRegression.has(task)?'NO_DECLARED_REGRESSION':
   mismatch.has(task)?'REPRODUCTION_MISMATCH':'INFRA_BLOCKED';
  original[task]=mock(task,status);
 }
 for(const task of RETRIES)retry[task]=mock(task,observed.has(task)?
  'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED':'INFRA_BLOCKED');
 return {original,retry};
}
test('RED: authenticate 16 exact identities, 9 observed source transitions, 2 infra, 1 mismatch, 4 undeclared; zero labels',()=>{
 const f=fixture(),before=JSON.stringify(f),out=adjudicatePilot(structuredClone(f));
 assert.equal(JSON.stringify(f),before);
 assert.equal(out.totalCandidates,16);
 assert.equal(out.originalReproductionsAccountedFor,16);
 assert.equal(out.selectedRepeatRuns,6);
 assert.deepEqual(out.classifications,{
  TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED:9,
  INFRA_BLOCKED:2,
  REPRODUCTION_MISMATCH:1,
  NO_DECLARED_REGRESSION:4
 });
 assert.equal(out.records.length,16);
 assert.equal(new Set(out.records.map(x=>x.task)).size,16);
 assert.equal(out.records.filter(x=>x.selectedEvidenceRun==='retry').length,6);
 assert.ok(out.records.every(x=>x.groundTruthAdmitted===false &&
  x.causalIndependent===false && x.detectorApplicabilityVerified===false &&
  x.historicalRootCauseDedupVerified===false && x.blindHoldoutEligible===false));
 assert.equal(out.historicalLabels,23);assert.equal(out.additionalTargetLowerBound,97);
 assert.equal(out.newPositiveLabels,0);assert.equal(out.newNegativeLabels,0);
 assert.equal(out.unknownCausalLabelsToAdmit,9);
 assert.equal(out.blindHoldout,false);assert.equal(out.tripleSPlusCertified,false);
 assert.equal(out.precision,null);assert.equal(out.recall,null);assert.equal(out.f1,null);
});
test('RED: original and retry may be contradictory, but only a source-backed retry overrides a blocked attempt',()=>{
 const f=fixture();
 assert.equal(adjudicatePilot(f).records.find(x=>x.task==='detekt_detekt-4628').status,
  'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED');
 const broken=fixture();broken.retry['detekt_detekt-4628'].proofDigest='0'.repeat(64);
 assert.throws(()=>adjudicatePilot(broken),/C2_PR189_PILOT_BLOCKED/);
});
test('RED: deny invented labels, forged source bases, shared proof hashes, unknown candidate and missing JUnit',()=>{
 const attacks=[
  x=>{x.original['detekt_detekt-4205'].receipt.newPositiveLabels=1;},
  x=>{x.original['detekt_detekt-4205'].receipt.sourceCommitClaim='0'.repeat(40);},
  x=>{x.original['detekt_detekt-4205'].receipt.receiptSha256='0'.repeat(64);},
  x=>{x.original['detekt_detekt-4205'].proof.rootCauseVerified=true;},
  x=>{x.original['detekt_detekt-4205'].proof.rawJUnitAuthenticityVerified=true;},
  x=>{x.original['detekt_detekt-4205'].proof=null;},
  x=>{x.retry['detekt_detekt-4738'].receipt.status='NO_DECLARED_REGRESSION';},
  x=>{delete x.retry['detekt_detekt-4728'];},
  x=>{x.original['attacker-case']=structuredClone(x.original['detekt_detekt-4205']);},
  x=>{x.original['detekt_detekt-4205'].receipt.causalIndependent=true;},
  x=>{x.original['detekt_detekt-4628'].receipt.candidateTransitions=1;},
  x=>{x.retry['pinterest_ktlint-2029'].receipt.fixedCommitClaim=
   x.retry['pinterest_ktlint-2029'].receipt.sourceCommitClaim;}
 ];
 for(const mutate of attacks){const data=fixture();mutate(data);
  assert.throws(()=>adjudicatePilot(data),/C2_PR189_PILOT_BLOCKED/);}
});
test('RED: leave the other 90 out, retain exactly 16 and six explicit repetitions',()=>{
 assert.equal(PILOT.length,16);assert.equal(RETRIES.length,6);
 assert.deepEqual(PILOT.filter(x=>x.repository==='detekt/detekt').length,6);
 assert.deepEqual(PILOT.filter(x=>x.repository==='pinterest/ktlint').length,3);
 assert.equal(new Set(PILOT.map(x=>x.repository)).size,9);
});
