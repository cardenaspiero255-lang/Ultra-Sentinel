'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {inspectIndependentAdjudication:inspect}=
 require('../../packages/quality-gates/phase2-heldout-adjudication-preflight.cjs');
const {captureProspectivePredictions}=
 require('../../packages/quality-gates/phase2-prospective-hunter-freeze.cjs');
const manifestBytes=fs.readFileSync(path.join(__dirname,'../../docs/quality/PHASE2-PROSPECTIVE-HUNTER-FREEZE-20261111.json'));
const manifest=JSON.parse(manifestBytes);
const sha='a'.repeat(64),git='b'.repeat(40);
function predictions(){
 const x={schema:'ultra-sentinel-phase2-prospective-predictions/v1',
  manifestBlobSha:'9679e6063491d9a16a5e2d5679982400d400b917',
  engineCommitSha:manifest.engine.commitSha,holdoutCommitSha:manifest.holdout.commitSha,
  snapshots:manifest.holdout.files.map(f=>({path:f.path,expectedBlobSha:f.blobSha,findings:[]}))};
 return captureProspectivePredictions(manifestBytes,x);
}
function adjudication(p=predictions()){
 return {schema:'ultra-sentinel-phase2-independent-adjudication/v1',
  freezeManifestBlobSha:p.manifestBlobSha,predictionDigest:p.predictionDigest,
  truthCommitmentSha256:sha,truthCommitmentGitSha:git,
  truthCommittedBeforePrediction:true,independentOracleEvidence:sha,
  negativeUniverse:sha,novelFamilyLineage:sha,repairEvidence:sha,
  cases:manifest.holdout.files.map(f=>({path:f.path,sourceBlobSha:f.blobSha,
   oracleWitnessSha256:sha,positiveLabels:[],negativeLabels:[],
   completeFindingUniverse:true}))};
}
function check(p=predictions(),a=adjudication(p)){
 return inspect({manifestBytes,predictions:p,adjudication:a});
}
test('real sealed frozen predictions cannot produce metrics without independent truth',()=>{
 const r=inspect({manifestBytes,predictions:predictions()});
 assert.equal(r.status,'BLOCKED_INDEPENDENT_ADJUDICATION');
 assert.equal(r.reason,'INDEPENDENT_ORACLE_TRUTH_NOT_SUPPLIED');
 for(const k of ['falsePositiveCount','precision','recall','f1','falsePositiveRate',
  'novelFamilyDiscoveryRate','repairSuccessRate'])assert.equal(r[k],null);
 assert.equal(r.mergeAllowed,false);
});
test('a complete but self-asserted nine-source truth cannot be mistaken for verified evidence',()=>{
 const p=predictions(),a=adjudication(p);
 a.cases[0].positiveLabels.push({rule:'UNSEEN_FAMILY',line:18});
 a.cases[1].negativeLabels.push({rule:'BENIGN_CONTROL',line:3});
 const r=check(p,a);
 assert.equal(r.reason,'EVIDENCE_REFERENCES_REQUIRE_TRUSTED_EXTERNAL_VERIFICATION');
 assert.equal(r.sourceUniverseComplete,true);
 assert.equal(r.negativeUniverseComplete,true);
 assert.equal(r.assertedPositiveLabels,1);
 assert.equal(r.assertedNegativeLabels,1);
 assert.equal(r.oracleIndependenceAuthenticated,false);
 assert.equal(r.truthPrecommittedBeforePredictions,false);
 assert.equal(r.novelFamilyProvenanceVerified,false);
 assert.equal(r.repairsVerified,0);
 assert.equal(r.precision,null);
});
test('reject forged truth timing, missing commitment, forged prediction digest and unrelated manifest',()=>{
 for(const mutate of [
  a=>a.truthCommittedBeforePrediction=false,
  a=>a.truthCommitmentGitSha='x',
  a=>a.truthCommitmentSha256='x',
  a=>a.predictionDigest='f'.repeat(64),
  a=>a.freezeManifestBlobSha='f'.repeat(40),
  a=>a.schema='other',
  a=>a.independentOracleEvidence='invalid',
  a=>a.negativeUniverse='invalid',
  a=>a.novelFamilyLineage='invalid',
  a=>a.repairEvidence='invalid'
 ]){
  const p=predictions(),a=adjudication(p);mutate(a);
  assert.equal(check(p,a).reason,'UNTRUSTED_OR_INCOMPLETE_ADJUDICATION');
 }
});
test('reject partial, swapped, duplicate, and contradictory case labels',()=>{
 for(const mutate of [
  a=>a.cases.pop(),
  a=>a.cases[0]=a.cases[1],
  a=>a.cases[0].sourceBlobSha='f'.repeat(40),
  a=>a.cases[0].oracleWitnessSha256='no',
  a=>a.cases[0].completeFindingUniverse=false,
  a=>a.cases[0].positiveLabels.push({rule:'bad',line:1}),
  a=>a.cases[0].positiveLabels.push({rule:'VALID',line:0}),
  a=>a.cases[0].positiveLabels.push({rule:'VALID',line:1,verified:true}),
  a=>a.cases[0].positiveLabels.push({rule:'VALID',line:1},{rule:'VALID',line:1}),
  a=>{a.cases[0].positiveLabels.push({rule:'VALID',line:1});a.cases[0].negativeLabels.push({rule:'VALID',line:1});},
  a=>a.cases[0].negativeLabels.push({rule:'NEG',line:100001}),
  a=>a.cases[0].negativeLabels='not an array'
 ]){
  const p=predictions(),a=adjudication(p);mutate(a);
  assert.equal(check(p,a).reason,'UNTRUSTED_OR_INCOMPLETE_ADJUDICATION');
 }
});
test('reject forged prediction summaries, coverage, metrics and fake engine authentication',()=>{
 for(const mutate of [
  p=>p.status='SCORED',
  p=>p.manifestBlobSha='f'.repeat(40),
  p=>p.engineCommitSha='f'.repeat(40),
  p=>p.holdoutCommitSha='f'.repeat(40),
  p=>p.predictionDigest='bad',
  p=>p.filesCovered=8,
  p=>p.unverifiedFindings=1,
  p=>p.findingsByCase[0].count=1,
  p=>p.findingsByCase[0].path='wrong.kt',
  p=>p.findingsByCase.pop(),
  p=>p.precision=1,
  p=>p.recall=1,
  p=>p.f1=1,
  p=>p.falsePositiveCount=0,
  p=>p.falsePositiveRate=0,
  p=>p.verifiableFalsePositives=0,
  p=>p.verifiedRepairs=1,
  p=>p.verifiedPositiveLabels=1,
  p=>p.verifiedNegativeLabels=1,
  p=>p.engineExecutedAndAuthenticated=true,
  p=>p.independentSourceOracleVerified=true,
  p=>p.trainingDisjointnessAuthenticated=true,
  p=>p.novelFamilyVerified=true,
  p=>p.tripleSPlusCertified=true,
  p=>p.remoteWrites=true,
  p=>p.mergeAllowed=true,
  p=>p.schema='wrong'
 ]){
  const p=JSON.parse(JSON.stringify(predictions()));mutate(p);
  assert.equal(inspect({manifestBytes,predictions:p}).reason,'UNTRUSTED_OR_INCOMPLETE_ADJUDICATION');
 }
});
test('reject active getters and proxies before invoking them',()=>{
 let reads=0;
 const p=JSON.parse(JSON.stringify(predictions()));
 Object.defineProperty(p,'schema',{enumerable:true,get(){reads++;throw Error('active getter');}});
 assert.equal(inspect({manifestBytes,predictions:p}).reason,'UNTRUSTED_OR_INCOMPLETE_ADJUDICATION');
 const proxy=new Proxy(predictions(),{ownKeys(){reads++;throw Error('proxy');}});
 assert.equal(inspect({manifestBytes,predictions:proxy}).reason,'UNTRUSTED_OR_INCOMPLETE_ADJUDICATION');
 const a=adjudication();
 Object.defineProperty(a.cases[0],'path',{enumerable:true,get(){reads++;throw Error('getter');}});
 assert.equal(check(predictions(),a).reason,'UNTRUSTED_OR_INCOMPLETE_ADJUDICATION');
 assert.equal(reads,0);
});
test('reject tampered manifest and missing required fields',()=>{
 const altered=Buffer.concat([manifestBytes,Buffer.from(' ')]);
 assert.equal(inspect({manifestBytes:altered,predictions:predictions()}).status,'BLOCKED_INDEPENDENT_ADJUDICATION');
 assert.equal(inspect({manifestBytes:'not bytes',predictions:predictions()}).status,'BLOCKED_INDEPENDENT_ADJUDICATION');
 assert.equal(inspect({manifestBytes,predictions:{}}).status,'BLOCKED_INDEPENDENT_ADJUDICATION');
 assert.equal(inspect({manifestBytes,predictions:predictions(),adjudication:{}}).status,'BLOCKED_INDEPENDENT_ADJUDICATION');
});
