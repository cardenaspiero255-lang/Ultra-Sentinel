'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {evaluateSealedV11Evidence}=require('../../scripts/phase2-block26-v11-independent-adjudicate.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const cohorts=[{id:1,rank:276,source:{repository:'runetopic/cryptography'},effectiveMethodsProbed:1,
  completedTriples:8,successfulInvocations:48},
 {id:2,rank:280,source:{repository:'SebastianAigner/dhash-kotlin'},effectiveMethodsProbed:3,
  completedTriples:24,successfulInvocations:144}];
function evidence(){
 const prediction={schema:'ultra-sentinel-generic-jvm-metamorphic/v1',
  artifactSha256:'a'.repeat(64),methodsProbed:3,completedTriples:24,
  oracleVerified:false,novelFamilyVerified:false,repairAuthorized:false,
  remoteWrites:false,mergeAllowed:false,
  successfulInvocations:144,findings:[
   {class:'DHash',method:'distanceTo-FO9zg7A(long;long;)int',argument:0,
    otherArguments:1,inputs:['0','1','9223372036854775807'],
    observed:['1','0','62'],status:'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'},
   {class:'DHash',method:'hashCode-impl(long;)int',argument:0,
    otherArguments:1,inputs:['0','1','9223372036854775807'],
    observed:['0','1','-2147483648'],status:'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'}]};
 const zero={schema:'ultra-sentinel-generic-jvm-metamorphic/v1',
  artifactSha256:'b'.repeat(64),methodsProbed:1,completedTriples:8,
  oracleVerified:false,novelFamilyVerified:false,repairAuthorized:false,
  remoteWrites:false,mergeAllowed:false,
  successfulInvocations:48,findings:[]};
 const p1=Buffer.from(JSON.stringify(zero)+'\n'),p2=Buffer.from(JSON.stringify(prediction)+'\n');
 const manifest={schema:'ultra-sentinel-v11-full-predictions-first/v1',
  frozenEngineCommit:'689583c23277807345edb715d8c2d277a3d4bda7',
  poolSha256:'6f894f51f2b657d3be139abca683878deeb2bbf3620d6cfa8b76f846f6b15f24',
  originalRepositories:9,allPredictionsSealedBeforeSelection:true,
  oracleExecuted:false,hunterRetuned:false,
  reportFiles:[
   {rank:276,scope:'com.runetopic',jarSha256:zero.artifactSha256,
    reportSha256:hash(p1),path:'candidate-276/scope-0/discovery.json'},
   {rank:280,scope:'.',jarSha256:prediction.artifactSha256,
    reportSha256:hash(p2),path:'candidate-280/scope-0/discovery.json'}]};
 const raw=Buffer.from(JSON.stringify(manifest)+'\n');
 return {manifestBytes:raw,reports:new Map([[manifest.reportFiles[0].path,p1],
  [manifest.reportFiles[1].path,p2]]),selected:cohorts.map(c=>({...c,source:{...c.source}})),
  expectedManifestSha256:hash(raw),
  expectedOriginalReportReferences:cohorts.map(c=>({rank:c.rank,
   sha:hash(Buffer.from(JSON.stringify(manifest.reportFiles.filter(r=>r.rank===c.rank))))}))};
}
test('V11 sees eight-bit-count contract witnesses while separately retaining compiler helper abstentions',()=>{
 const e=evidence(),v=evaluateSealedV11Evidence(e);
 assert.equal(v.originalDefectsConfirmed,0);
 assert.equal(v.scopedReferenceMatches,1);
 assert.equal(v.unadjudicated,1);
 assert.equal(v.scopedReferenceMismatches,0);
 assert.equal(v.independentTargetReplayExecuted,false);
 assert.equal(v.block26Closed,false);
});
test('all archived prediction report bytes must match their SHA before being parsed',()=>{
 const e=evidence();
 e.reports.set('candidate-280/scope-0/discovery.json',Buffer.from('{}'));
 assert.throws(()=>evaluateSealedV11Evidence(e),/REPORT_HASH/);
});
test('historical prediction manifest SHA cannot be substituted',()=>{
 const e=evidence();e.expectedManifestSha256='c'.repeat(64);
 assert.throws(()=>evaluateSealedV11Evidence(e),/MANIFEST_HASH/);
});
test('report identities and counters must match original admitted repository receipt',()=>{
 const e=evidence();e.selected[1]={...e.selected[1],effectiveMethodsProbed:4};
 assert.throws(()=>evaluateSealedV11Evidence(e),/ADMISSION_COUNTERS/);
});
test('do not claim full original truth or defect from missing oracles',()=>{
 const e=evidence(),r=evaluateSealedV11Evidence(e);
 assert.equal(r.status,'PARTIAL_INDEPENDENT_REFERENCE_ONLY');
 assert.equal(r.fullyAdjudicated,false);
 assert.equal(r.independentOriginalOracleExecuted,false);
 assert.equal(r.engineRetuned,false);
});
