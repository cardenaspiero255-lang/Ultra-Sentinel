'use strict';
/*
 * Match the 22 linked historical records to the actual fixed owner-run source
 * manifests, NOT just plausible GitHub artifact metadata. This module
 * authenticates NO transport and adds NO independent causal claims.
 */
const {createHash}=require('node:crypto');
const {STAGES}=require('./c2-twelve-original-oracle-reconciliation.cjs');
const {ORIGINS,EXPECTED}=require('./c2-run23-ten-receipt-recovery.cjs');
const fail=()=>{throw Error('C2_ORIGINAL_OWNER_MANIFEST_BINDING_BLOCKED');};
const hex40=/^[a-f0-9]{40}$/,hex64=/^[a-f0-9]{64}$/;
function bindHistoricalLedgerToOriginalOwnerManifest(report,originalStageProofs){
 if(!report||report.schema!=='c2-historical-23-traceability-ledger/v1'||
  report.historicalIdentities!==23||report.queueMatchedEmbeddedReceipts!==12||
  report.recoveredExternalReceiptLinks!==10||report.residualEmbeddedReceipts!==1||
  report.newGoldLabels!==0||report.nextcloudSourceReleaseAuthorized!==false||
  !Array.isArray(report.entries)||report.entries.length!==23||
  STAGES.length!==8||ORIGINS.length!==7||EXPECTED.length!==10||
  !Array.isArray(originalStageProofs)||originalStageProofs.length!==12)fail();
 const stages=new Map(),expected=new Map(),originById=new Map(),stageProofs=new Map();
 const key=e=>JSON.stringify([e.pr,e.line,e.rule,e.positive]);
 for(const stage of STAGES){
  if(!Number.isSafeInteger(stage.run)||stage.run<1||!hex64.test(stage.digest)||
   !hex40.test(stage.head)||!Array.isArray(stage.cases))fail();
  for(const c of stage.cases){
   const k=key(c);if(stages.has(k))fail();stages.set(k,stage);
  }
 }
 for(const origin of ORIGINS){
  if(!Number.isSafeInteger(origin.runId)||origin.runId<1||
   !Number.isSafeInteger(origin.artifactId)||origin.artifactId<1||
   !hex64.test(origin.archiveSha256)||!Array.isArray(origin.ids))fail();
  for(const id of origin.ids){
   if(originById.has(id))fail();originById.set(id,origin);
  }
 }
 for(const e of EXPECTED){
  const k=key({pr:e.pr,line:e.line,rule:e.ruleId,positive:e.positive});
  if(expected.has(k)||!originById.has(e.id)||!hex40.test(e.headSha)||
     !hex40.test(e.blobSha))fail();
  expected.set(k,e);
 }
 if(stages.size!==12||originById.size!==10||expected.size!==10)fail();
 for(const proof of originalStageProofs){
  if(!proof||typeof proof!=='object'||!Number.isSafeInteger(proof.pr)||
   !Number.isSafeInteger(proof.line)||proof.line<1||
   typeof proof.rule!=='string'||typeof proof.positive!=='boolean'||
   !hex40.test(proof.headSha)||!hex40.test(proof.blobSha)||
   typeof proof.path!=='string'||!proof.path.startsWith('app/')||
   !hex64.test(proof.evidenceSha256))fail();
  const k=key(proof),stage=stages.get(k);
  if(!stage||stageProofs.has(k)||proof.originalOwnerRunId!==stage.run||
   proof.originalArchiveDigestSha256!==stage.digest)fail();
  stageProofs.set(k,proof);
 }
 if(stageProofs.size!==12)fail();
 let stageCount=0,recoveryCount=0,residualCount=0;
 const seen=new Set(),mapped=[];
 for(const e of report.entries){
  if(!e||typeof e!=='object'||!Number.isSafeInteger(e.pr)||
   !Number.isSafeInteger(e.line)||e.line<1||
   typeof e.rule!=='string'||typeof e.positive!=='boolean'||
   !hex40.test(e.headSha)||!hex40.test(e.blobSha)||
   typeof e.path!=='string'||!e.path.startsWith('app/'))fail();
  const id=JSON.stringify([e.pr,e.headSha,e.blobSha,e.rule,e.path,e.line,e.positive]);
  if(seen.has(id))fail();seen.add(id);
  const k=key(e);
  if(e.witnessCategory==='RUN23_ARCHIVED_AND_12_QUEUE'){
   const s=stages.get(k),proof=stageProofs.get(k);
   if(!s||!proof||!hex64.test(e.originalEvidenceSha256)||e.sourceRunId!==null||
     e.headSha!==proof.headSha||e.blobSha!==proof.blobSha||
     e.path!==proof.path||e.originalEvidenceSha256!==proof.evidenceSha256)fail();
   mapped.push([id,'ORIGINAL_STAGE',s.run,s.artifact,s.digest]);
   stageCount++;
  }else if(e.witnessCategory==='RECOVERED_ORIGINAL_WITNESS'){
   const ex=expected.get(k);if(!ex)fail();
   const o=originById.get(ex.id);
   if(!o||ex.headSha!==e.headSha||ex.blobSha!==e.blobSha||
      ex.path!==e.path||
      o.runId!==e.sourceRunId||o.artifactId!==e.originalArtifactId||
      o.archiveSha256!==e.archiveDigestSha256||
      !hex64.test(e.originalWitnessSha256))fail();
   mapped.push([id,'ORIGINAL_RECOVERED',o.runId,o.artifactId,o.archiveSha256]);
   recoveryCount++;
  }else if(e.witnessCategory==='RUN23_ARCHIVED_RESIDUAL_UNADJUDICATED'){
   if(stages.has(k)||expected.has(k)||!hex64.test(e.originalEvidenceSha256)||
     e.sourceRunId!==null)fail();
   mapped.push([id,'RUN23_ARCHIVE_ONLY',39077240648,12117128918,
    '31ea72b3231fe73fb97e815ff70d88f3a5ddeb1d7fd7a3324584de9b7fbe3400']);
   residualCount++;
  }else fail();
 }
 if(stageCount!==12||recoveryCount!==10||residualCount!==1)fail();
 mapped.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 return Object.freeze({
  schema:'c2-historical-23-original-manifest-binding/v1',
  status:'ORIGINAL_OWNER_ARCHIVE_IDENTITIES_MATCH_ONLY_CAUSAL_INDEPENDENCE_OPEN',
  originalStageCasesBound:12,originalRecoveredCasesBound:10,
  residualArchiveOnly:1,
  originalGroupsAuthenticatedByThisPureFunction:false,
  causalIndependenceCertified:false,
  nextcloudSourceReleaseAuthorized:false,newGoldLabels:0,
  manifestBindingSha256:createHash('sha256').update(JSON.stringify(mapped)).digest('hex'),
  ownerOriginalManifestLinks:Object.freeze(mapped)
 });
}
module.exports={bindHistoricalLedgerToOriginalOwnerManifest};
