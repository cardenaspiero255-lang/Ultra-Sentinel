'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const roster=require('../fixtures/c2-upstream-106-task-tree.json');
const {metadataOnlyCandidateIndex}=require('../../packages/quality-gates/c2-kotlin-upstream-candidate-index.cjs');
const {reviewCampaign}=require('../../packages/quality-gates/c2-upstream-acceptance.cjs');
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
function index(){
 const dirs=roster.entries.map(e=>({type:'dir',name:e.name,path:'tasks/'+e.name,sha:e.sha,_links:{git:'https://api.github.com/git/trees/'+e.sha}}));
 return metadataOnlyCandidateIndex(Buffer.from(JSON.stringify(dirs)));
}
function observed(name){
 return {task:name,status:'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED',
  candidateTransitions:1,sourceCommit:'b9025d86f7ae634901396766bd61f6d4ae6d2165',
  sourceCommitClaim:'a'.repeat(40),fixedCommitClaim:'b'.repeat(40),
  receiptSha256:digest(name),newPositiveLabels:0,newNegativeLabels:0};
}
test('all four gates remain unverified and no original transition mints truth',()=>{
 const a=index(),good=observed('GradleUp_shadow-1313');
 const report=reviewCampaign(a,[good]);
 assert.equal(report.receiptsSeen,1);assert.equal(report.missing,105);
 assert.equal(report.classifications.TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED,1);
 assert.equal(report.classifications.NO_DECLARED_REGRESSION,0);
 assert.equal(report.newLabels,0);assert.equal(report.admitted,0);
 assert.equal(report.precision,null);assert.equal(report.tripleSPlusCertified,false);
 const decision=report.candidates.find(c=>c.task===good.task);
 assert.equal(decision.originalTests,'TRANSITION_OBSERVED_UNATTESTED');
 assert.equal(decision.rootCause,'ROOT_CAUSE_UNVERIFIED');
 assert.equal(decision.detector,'DETECTOR_APPLICABILITY_UNVERIFIED');
 assert.equal(decision.historical,'HISTORICAL_INDEPENDENCE_UNVERIFIED');
 assert.equal(decision.admittedLabel,false);
});
test('claiming an applicable rule or authenticated history cannot bypass attestation',()=>{
 const a=index(),r=observed('detekt_detekt-4205');
 for(const mutation of [
  {rootCauseVerified:true},{detectorApplicabilityVerified:true},
  {historicalIndependenceVerified:true},{independentReviewVerified:true},
  {newPositiveLabels:1},{newNegativeLabels:1},{tripleSPlusCertified:true},
  {blindHoldout:true},{status:'CERTIFIED'}
 ]){
  assert.throws(()=>reviewCampaign(a,[{...r,...mutation}]),/C2_ACCEPTANCE_REVIEW_REJECTED/);
 }
});
test('no regression, infra and mismatch stay distinct, never create negative labels',()=>{
 const a=index(),n=roster.entries.map(x=>x.name);
 const records=[
  {task:n[0],status:'NO_DECLARED_REGRESSION'},
  {task:n[1],status:'INFRA_BLOCKED'},
  {task:n[2],status:'REPRODUCTION_MISMATCH'}
 ];
 const x=reviewCampaign(a,records);
 assert.equal(x.classifications.NO_DECLARED_REGRESSION,1);
 assert.equal(x.classifications.INFRA_BLOCKED,1);
 assert.equal(x.classifications.REPRODUCTION_MISMATCH,1);
 assert.equal(x.newNegativeLabels,0);
 assert.equal(x.candidates.find(y=>y.task===n[0]).originalTests,'NO_F2P_DECLARED');
});
test('conflicting, tampered and missing transitions fail closed',()=>{
 const a=index(),r=observed('GradleUp_shadow-1313');
 assert.throws(()=>reviewCampaign(a,[r,r]),/C2_ACCEPTANCE_REVIEW_REJECTED/);
 for(const m of [
  {task:'fake_project-1'},{receiptSha256:'f'},
  {candidateTransitions:0},{candidateTransitions:1.5},
  {sourceCommit:'f'.repeat(40)},{sourceCommitClaim:'xyz'},
  {fixedCommitClaim:'a'.repeat(40)},{newPositiveLabels:undefined}
 ]){
  assert.throws(()=>reviewCampaign(a,[{...r,...m}]),/C2_ACCEPTANCE_REVIEW_REJECTED/);
 }
 assert.throws(()=>reviewCampaign(a,[r],{requireComplete:true}),/C2_ACCEPTANCE_REVIEW_REJECTED/);
});
test('exact complete 106 task classification is allowed but cannot certify',()=>{
 const a=index();
 const records=roster.entries.map(e=>({task:e.name,status:'NO_DECLARED_REGRESSION',newPositiveLabels:0,newNegativeLabels:0}));
 const x=reviewCampaign(a,records,{requireComplete:true});
 assert.equal(x.receiptsSeen,106);assert.equal(x.missing,0);
 assert.equal(x.classifications.NO_DECLARED_REGRESSION,106);
 assert.equal(x.admitted,0);assert.equal(x.remaining,97);
 assert.equal(x.blindHoldout,false);
});

test('offline four-gate report reads batch receipts but never manufactures labels',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {spawnSync}=require('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-four-gate-'));
 try{
  const batch=path.join(root,'c2-kotlin-batch-1');
  fs.mkdirSync(batch);
  const r=observed('GradleUp_shadow-1313');
  fs.writeFileSync(path.join(batch,r.task+'.json'),JSON.stringify(r));
  const report=path.join(root,'four-gate.json');
  const cli=path.join(__dirname,'../../scripts/c2-review-kotlin-candidates.cjs');
  const run=spawnSync(process.execPath,[cli,'--receipts',root,'--mode','smoke','--output',report],{encoding:'utf8',timeout:20000});
  assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(fs.readFileSync(report,'utf8'));
  assert.equal(result.receiptsSeen,1);
  assert.equal(result.admitted,0);
  assert.equal(result.candidates.find(x=>x.task===r.task).detector,'DETECTOR_APPLICABILITY_UNVERIFIED');
  const fail=spawnSync(process.execPath,[cli,'--receipts',root,'--mode','full','--output',path.join(root,'full.json')],{encoding:'utf8',timeout:20000});
  assert.equal(fail.status,2);
  assert.equal(fs.existsSync(path.join(root,'full.json')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
