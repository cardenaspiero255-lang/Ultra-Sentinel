'use strict';
/*
 * Per-project worker receipt contract. Self-test only: byte verification of
 * three known fixtures MUST NEVER be confused with external source provenance,
 * actual sandbox authentication, causal truth or certified GOLD.
 * No Core, prediction, baseline, or repository-write imports.
 */
const {createHash}=require('node:crypto');
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const PHASES=['original','fixed','benign'];
const EXPECTED_EXIT=[1,0,0];
const INPUT=['mode','workerCommitSha','projectId','isolation','phases'];
const ISOLATION=['networkUnshared','credentialsAbsent','rootReadOnly','unprivileged'];
const PHASE=['phase','sourceBlobSha','sourceSha256','logSha256','exitCode'];
const RECEIPT=[...INPUT,'schema','receiptDigestSha256'];
const blocked=()=>{throw Error('C2_PROJECT_ORACLE_BLOCKED');};
const exact=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const sha256=b=>createHash('sha256').update(b).digest('hex');
function sourceGitBlob(b){
 return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}
function inputValid(x){
 if(!exact(x,INPUT)||x.mode!=='TRUSTED_SELFTEST_ONLY'||
  !SHA.test(x.workerCommitSha)||x.projectId!=='ultra-sentinel-sandbox-fixture'||
  !exact(x.isolation,ISOLATION)||ISOLATION.some(k=>x.isolation[k]!==true)||
  !Array.isArray(x.phases)||x.phases.length!==3)blocked();
 const uniques=new Set();
 for(let i=0;i<3;i++){
  const q=x.phases[i];
  if(!exact(q,PHASE)||q.phase!==PHASES[i]||
   q.exitCode!==EXPECTED_EXIT[i]||
   !SHA.test(q.sourceBlobSha)||!DIGEST.test(q.sourceSha256)||
   !DIGEST.test(q.logSha256)||
   uniques.has(q.sourceSha256)||uniques.has(q.logSha256))blocked();
  uniques.add(q.sourceSha256);uniques.add(q.logSha256);
 }
}
function createProjectOracleReceipt(input){
 inputValid(input);
 const data={
  schema:'c2-project-isolated-oracle-selftest-receipt/v1',
  mode:input.mode,workerCommitSha:input.workerCommitSha,
  projectId:input.projectId,isolation:{...input.isolation},
  phases:input.phases.map(x=>({...x}))
 };
 return Object.freeze({...data,receiptDigestSha256:sha256(Buffer.from(JSON.stringify(data)))});
}
function verifyProjectOracleReceipt({receipt,sourceBytes,logBytes,expectedCommitSha}={}){
 if(!exact(receipt,RECEIPT)||receipt.schema!=='c2-project-isolated-oracle-selftest-receipt/v1'||
  !SHA.test(expectedCommitSha)||receipt.workerCommitSha!==expectedCommitSha||
  !sourceBytes||!logBytes||typeof sourceBytes!=='object'||typeof logBytes!=='object')blocked();
 const {schema,receiptDigestSha256,...rest}=receipt;
 const regenerated=createProjectOracleReceipt(rest);
 if(regenerated.schema!==schema||
  regenerated.receiptDigestSha256!==receiptDigestSha256)blocked();
 if(!exact(sourceBytes,PHASES)||!exact(logBytes,PHASES))blocked();
 for(const p of receipt.phases){
  const source=sourceBytes[p.phase],log=logBytes[p.phase];
  if(!Buffer.isBuffer(source)||!Buffer.isBuffer(log)||
   source.length<10||source.length>262144||log.length<8||log.length>262144||
   sourceGitBlob(source)!==p.sourceBlobSha||
   sha256(source)!==p.sourceSha256||
   sha256(log)!==p.logSha256)blocked();
 }
 return Object.freeze({
  schema:'c2-project-oracle-byte-evidence-verification/v1',
  status:'SELFTEST_BYTES_VERIFIED_PROVENANCE_NOT_ATTESTED',
  receiptDigestSha256,workerCommitSha:receipt.workerCommitSha,
  actualBytesVerified:true,sourceGitBlobsRehashed:3,phaseLogsRehashed:3,
  phaseExitContractObserved:true,
  runtimeIsolationAuthenticated:false,
  ownerArtifactAndRunProvenanceAuthenticated:false,
  externalOriginalSourceAuthenticated:false,
  sourceBehaviorCertified:false,causalIndependenceCertified:false,
  newGoldLabels:0,previousDocumentedTruth:9,remaining:111,
  truthSealed:false,holdoutFrozen:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  precision:null,recall:null,f1:null,
  tripleSPlusCertified:false,mergeAllowed:false,autoRepairAllowed:false,
  warning:'This checks only byte integrity of claimed worker outputs. Sandbox isolation, GitHub run/actor, external original source, upstream JUnit and causal validity must be independently authenticated in an owner-only workflow before any GOLD admission.'
 });
}
module.exports={sourceGitBlob,createProjectOracleReceipt,verifyProjectOracleReceipt};
