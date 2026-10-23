'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {bindHistoricalLedgerToOriginalOwnerManifest}=require('../../packages/quality-gates/c2-original-manifest-binding.cjs');
const {STAGES}=require('../../packages/quality-gates/c2-twelve-original-oracle-reconciliation.cjs');
const {ORIGINS,EXPECTED}=require('../../packages/quality-gates/c2-run23-ten-receipt-recovery.cjs');
const H40='a'.repeat(40),H64='b'.repeat(64);
function fixture(){
 const rows=[];
 for(const stage of STAGES)for(const c of stage.cases)
  rows.push({witnessCategory:'RUN23_ARCHIVED_AND_12_QUEUE',pr:c.pr,line:c.line,
   rule:c.rule,positive:c.positive,headSha:H40,blobSha:H40,path:'app/original.kt',
   sourceRunId:null,originalEvidenceSha256:H64});
 for(const expected of EXPECTED){
  const origin=ORIGINS.find(o=>o.ids.includes(expected.id));
  assert.ok(origin);
  rows.push({witnessCategory:'RECOVERED_ORIGINAL_WITNESS',
   pr:expected.pr,line:expected.line,rule:expected.ruleId,
   positive:expected.positive,headSha:expected.headSha,
   blobSha:expected.blobSha,path:expected.path,
   sourceRunId:origin.runId,originalArtifactId:origin.artifactId,
   archiveDigestSha256:origin.archiveSha256,originalWitnessSha256:H64});
 }
 rows.push({witnessCategory:'RUN23_ARCHIVED_RESIDUAL_UNADJUDICATED',pr:153,line:777,
  rule:'UNCLAIMED_RESIDUAL',positive:false,headSha:H40,blobSha:H40,
  path:'app/residual.kt',sourceRunId:null,originalEvidenceSha256:H64});
 return {schema:'c2-historical-23-traceability-ledger/v1',historicalIdentities:23,
  queueMatchedEmbeddedReceipts:12,recoveredExternalReceiptLinks:10,
  residualEmbeddedReceipts:1,newGoldLabels:0,
  nextcloudSourceReleaseAuthorized:false,entries:rows};
}
test('RED P2: bind each of 22 identities to the exact existing original stage or recovered owner artifact',()=>{
 const proof=bindHistoricalLedgerToOriginalOwnerManifest(fixture());
 assert.equal(proof.schema,'c2-historical-23-original-manifest-binding/v1');
 assert.equal(proof.originalStageCasesBound,12);
 assert.equal(proof.originalRecoveredCasesBound,10);
 assert.equal(proof.originalGroupsAuthenticatedByThisPureFunction,false);
 assert.equal(proof.causalIndependenceCertified,false);
 assert.equal(proof.nextcloudSourceReleaseAuthorized,false);
 assert.equal(proof.newGoldLabels,0);
});
test('RED P2: valid but unrelated owner archives must fail, not merely pass length/digest formatting checks',()=>{
 const mutations=[
  x=>x.entries[0].rule='UNRELATED_RULE',
  x=>x.entries[0].line=999,
  x=>x.entries[12].sourceRunId=12345,
  x=>x.entries[12].archiveDigestSha256='c'.repeat(64),
  x=>x.entries[12].originalArtifactId=12345,
  x=>x.entries[12].headSha='c'.repeat(40),
  x=>x.entries[12].blobSha='c'.repeat(40),
  x=>x.entries[12].positive=!x.entries[12].positive,
  x=>x.entries[12].path='app/elsewhere.kt',
  x=>x.entries[13]={...x.entries[12]},
  x=>x.entries[22].witnessCategory='RECOVERED_ORIGINAL_WITNESS'
 ];
 for(const mutate of mutations){
  const x=fixture();mutate(x);
  assert.throws(()=>bindHistoricalLedgerToOriginalOwnerManifest(x),/C2_ORIGINAL_OWNER_MANIFEST_BINDING_BLOCKED/);
 }
});
