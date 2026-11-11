'use strict';
/**
 * Join only exact output schemas of three previously frozen, source-only
 * workers. The sources/labels/oracle never enter this evaluator. No metrics
 * are emitted until independent source and truth evidence exist.
 */
const {types}=require('node:util');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const {inspectProspectiveFreeze,captureProspectivePredictions}=
 require('./phase2-prospective-hunter-freeze.cjs');
const SHA=/^[a-f0-9]{40}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const NUM=['schema','status','findings','filesScanned','skippedOversized','skippedNoncanonical',
 'sourceByteIntegrityVerified','compilerAuthenticated','sourceRepositoryAuthenticated',
 'originalOracleVerified','repairAuthorized','remoteWrites','mergeAllowed'];
const CODEC=['schema','status','findings','sourceByteIntegrityVerified',
 'sourceRepositoryAuthenticated','originalFunctionalOracleVerified','causalityVerified',
 'generalizationVerified','ownerAuthorizationGranted','remoteWrites','mergeAllowed','filesScanned'];
const NUM_FIND=['rule','path','line','expectedBlobSha'];
const CODEC_FIND=['rule','path','line','expectedBlobSha','status'];
const blocked=()=>Object.freeze({
 status:'BLOCKED_PROSPECTIVE_HUNTER_REPORT',filesCovered:0,unverifiedFindings:0,
 precision:null,recall:null,f1:null,falsePositiveCount:null,
 falsePositiveRate:null,verifiedRepairs:0,engineExecutedAndAuthenticated:false,
 tripleSPlusCertified:false,remoteWrites:false,mergeAllowed:false
});
function invalid(){throw Error('UNTRUSTED_HUNTER_REPORT');}
function array(value,max){
 if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||
  value.length>max||Reflect.ownKeys(value).length!==value.length+1)invalid();
 const out=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))invalid();
  out.push(d.value);
 }
 return out;
}
function validateWorker(worker,kind,expectedFiles){
 const isNumeric=kind==='numeric';
 const r=snapshotRecord(worker,isNumeric?NUM:CODEC);
 if(typeof r.filesScanned!=='number'||!Number.isSafeInteger(r.filesScanned)||
  r.filesScanned!==expectedFiles||r.sourceByteIntegrityVerified!==true||
  r.sourceRepositoryAuthenticated!==false||r.remoteWrites!==false||r.mergeAllowed!==false)
  invalid();
 if(isNumeric){
  if(r.schema!=='ultra-sentinel-blind-numeric/v1'||
   r.compilerAuthenticated!==false||r.originalOracleVerified!==false||
   r.repairAuthorized!==false||r.skippedOversized!==0||r.skippedNoncanonical!==0)invalid();
 } else if(r.schema!==(
   kind==='codec'?'ultra-sentinel-codec-integrity-hunter/v1':
   'ultra-sentinel-identity-delimiter-hunter/v1')||
   r.originalFunctionalOracleVerified!==false||r.causalityVerified!==false||
   r.generalizationVerified!==false||r.ownerAuthorizationGranted!==false)invalid();
 const rows=array(r.findings,256).map(x=>snapshotRecord(x,isNumeric?NUM_FIND:CODEC_FIND));
 const onHit=isNumeric?'NUMERIC_BLIND_HYPOTHESES_UNVERIFIED':
  kind==='codec'?'CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE':
  'IDENTITY_DELIMITER_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE';
 const onEmpty=isNumeric?'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED':
  kind==='codec'?'NO_CODEC_INTEGRITY_HYPOTHESES_NOT_CERTIFIED':
  'NO_IDENTITY_DELIMITER_HYPOTHESES_NOT_CERTIFIED';
 if(r.status!==(rows.length?onHit:onEmpty))invalid();
 for(const f of rows){
  if(typeof f.rule!=='string'||!RULE.test(f.rule)||typeof f.path!=='string'||
   typeof f.expectedBlobSha!=='string'||!SHA.test(f.expectedBlobSha)||
   !Number.isSafeInteger(f.line)||f.line<1||f.line>100000||
   (!isNumeric&&f.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'))invalid();
 }
 return rows;
}
function aggregateFrozenHunterReports(manifestBytes,sourceReports){
 try{
  const freeze=inspectProspectiveFreeze(manifestBytes);
  if(freeze.status!=='FROZEN_SOURCE_METADATA_ONLY')invalid();
  const root=snapshotRecord(sourceReports,['numeric','codec','identity']);
  const files=JSON.parse(manifestBytes.toString('utf8')).holdout.files;
  if(files.length!==9)invalid();
  const gathered=[...validateWorker(root.numeric,'numeric',files.length),
   ...validateWorker(root.codec,'codec',files.length),
   ...validateWorker(root.identity,'identity',files.length)];
  const map=new Map(files.map(f=>[f.path,{path:f.path,expectedBlobSha:f.blobSha,findings:[]}]));
  for(const row of gathered){
   const target=map.get(row.path);
   if(!target||row.expectedBlobSha!==target.expectedBlobSha)invalid();
   target.findings.push({
    rule:row.rule,path:row.path,line:row.line,expectedBlobSha:row.expectedBlobSha,
    status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'
   });
  }
  const sealed=captureProspectivePredictions(manifestBytes,{
   schema:'ultra-sentinel-phase2-prospective-predictions/v1',
   manifestBlobSha:freeze.manifestBlobSha,
   engineCommitSha:freeze.engineCommitSha,
   holdoutCommitSha:freeze.holdoutCommitSha,
   snapshots:files.map(f=>map.get(f.path))
  });
  if(sealed.status!=='PREDICTIONS_SEALED_NO_INDEPENDENT_TRUTH')invalid();
  return sealed;
 }catch{return blocked();}
}
module.exports=Object.freeze({aggregateFrozenHunterReports});
