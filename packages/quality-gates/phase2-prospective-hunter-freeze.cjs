'use strict';
/**
 * Metadata-only prospective Hunter freeze. Its SHA-pinned Git blob exists in
 * this repository before source, predictions or independent truth are read.
 * A hash is neither a signature nor evidence of network or Git provenance.
 * Without precommitted independent truth, NEVER emit accuracy/repair claims.
 */
const {createHash}=require('node:crypto');
const {TextDecoder,types}=require('node:util');
const FROZEN_MANIFEST_BLOB='9679e6063491d9a16a5e2d5679982400d400b917';
const ENGINE='2db0d9890d437ea407b61349203c94e3d76f2d5b';
const HOLDOUT='2982e63cb691ad49cd009aab43dc206fee6699c2';
const SHA=/^[a-f0-9]{40}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
function invalid(){throw Error('UNTRUSTED_PROSPECTIVE_INPUT');}
function record(v,keys){
 if(!v||typeof v!=='object'||types.isProxy(v)||Array.isArray(v)||
  Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).length!==keys.length)invalid();
 const out={};
 for(const k of keys){
  const d=Object.getOwnPropertyDescriptor(v,k);
  if(!d||!Object.hasOwn(d,'value'))invalid();
  out[k]=d.value;
 }
 return out;
}
function array(v,max,min=0){
 if(!Array.isArray(v)||types.isProxy(v)||Object.getPrototypeOf(v)!==Array.prototype||
   v.length<min||v.length>max||Reflect.ownKeys(v).length!==v.length+1)invalid();
 const out=[];
 for(let i=0;i<v.length;i++){
  const d=Object.getOwnPropertyDescriptor(v,String(i));
  if(!d||!Object.hasOwn(d,'value'))invalid();
  out.push(d.value);
 }
 return out;
}
const failReport=()=>Object.freeze({
 status:'BLOCKED_UNTRUSTED_FREEZE',manifestBlobSha:null,sourceCount:null,
 authenticatedSourceEvidence:false,independentTruthSealed:false,
 trainingDisjointnessAuthenticated:false,novelFamilyVerified:false,
 precision:null,recall:null,f1:null,falsePositiveCount:null,
 tripleSPlusCertified:false,remoteWrites:false,mergeAllowed:false
});
const failPrediction=()=>Object.freeze({
 status:'BLOCKED_PROSPECTIVE_PREDICTIONS',filesCovered:0,unverifiedFindings:0,
 verifiableFalsePositives:null,falsePositiveCount:null,
 precision:null,recall:null,f1:null,falsePositiveRate:null,
 verifiedPositiveLabels:0,verifiedNegativeLabels:0,verifiedRepairs:0,
 engineExecutedAndAuthenticated:false,tripleSPlusCertified:false,
 remoteWrites:false,mergeAllowed:false
});
const blobHash=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function parseFreeze(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>20000||
  blobHash(bytes)!==FROZEN_MANIFEST_BLOB)invalid();
 const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 const r=record(parsed,['schema','freezeId','engine','holdout','protocol','note']);
 const engine=record(r.engine,['repository','commitSha','treeSha','modules']);
 const holdout=record(r.holdout,['repository','commitSha','treeSha','selection','files']);
 const policy=record(r.protocol,['unit','noTrainingAfterFreeze','sourceReadBeforeFreeze',
  'labelsReadBeforeFreeze','predictionsReadBeforeFreeze','truthCommitmentSha256',
  'oracleEvidenceBeforePredictions','baselineEngineSha','requiresIndependentOriginalKotlinOracle',
  'requiresMatchedBenignNegativeOracle','requiresUnseenFamilyProvenance',
  'requiresCompleteLabeledUniverseForPrecision','unverifiedFindingsAreNotFalsePositives',
  'releaseClaimsForbidden']);
 if(r.schema!=='ultra-sentinel-phase2-prospective-hunter-freeze/v1'||
  r.freezeId!=='P2-NOWINANDROID-20261111-APP-MAIN-KOTLIN'||
  typeof r.note!=='string'||r.note.length<100||
  engine.repository!=='cardenaspiero255-lang/Ultra-Sentinel'||
  engine.commitSha!==ENGINE||engine.treeSha!=='d1281730ff0bbddd15f99ba9954dddb8327c02de'||
  holdout.repository!=='android/nowinandroid'||holdout.commitSha!==HOLDOUT||
  holdout.treeSha!=='83650553ea17c41794eff36c317e8ab408835c26'||
  holdout.selection!=='ALL_APP_SRC_MAIN_KOTLIN_BLOBS_AT_FROZEN_TREE'||
  policy.unit!=='PER_FILE_SOURCE_FINDING_ADVISORY'||
  policy.noTrainingAfterFreeze!==true||
  policy.sourceReadBeforeFreeze!==false||
  policy.labelsReadBeforeFreeze!==false||
  policy.predictionsReadBeforeFreeze!==false||
  policy.truthCommitmentSha256!==null||
  policy.oracleEvidenceBeforePredictions!==false||
  policy.baselineEngineSha!==null||
  policy.requiresIndependentOriginalKotlinOracle!==true||
  policy.requiresMatchedBenignNegativeOracle!==true||
  policy.requiresUnseenFamilyProvenance!==true||
  policy.requiresCompleteLabeledUniverseForPrecision!==true||
  policy.unverifiedFindingsAreNotFalsePositives!==true||
  policy.releaseClaimsForbidden!==true)invalid();
 const modules=array(engine.modules,7,7),files=array(holdout.files,9,9);
 let last='';
 for(const row of modules){
  const x=record(row,['path','blobSha']);
  if(typeof x.path!=='string'||!/^packages\/family-hunter\/[a-z0-9-]+\.cjs$/.test(x.path)||
   !SHA.test(x.blobSha)||x.path<=last)invalid();
  last=x.path;
 }
 last='';
 for(const row of files){
  const x=record(row,['path','blobSha']);
  if(typeof x.path!=='string'||!x.path.startsWith('app/src/main/kotlin/')||
   !/^app\/src\/main\/kotlin\/[A-Za-z0-9_/]+\.kt$/.test(x.path)||
   x.path.includes('//')||x.path.split('/').includes('..')||
   !SHA.test(x.blobSha)||x.path<=last)invalid();
  last=x.path;
 }
 return {engine,holdout,files};
}
function inspectProspectiveFreeze(bytes){
 try{
  const {engine,holdout,files}=parseFreeze(bytes);
  return Object.freeze({
   schema:'ultra-sentinel-phase2-prospective-freeze-inspection/v1',
   status:'FROZEN_SOURCE_METADATA_ONLY',manifestBlobSha:FROZEN_MANIFEST_BLOB,
   engineCommitSha:engine.commitSha,holdoutRepository:holdout.repository,
   holdoutCommitSha:holdout.commitSha,sourceCount:files.length,
   authenticatedSourceEvidence:false,independentTruthSealed:false,
   trainingDisjointnessAuthenticated:false,novelFamilyVerified:false,
   precision:null,recall:null,f1:null,falsePositiveCount:null,
   tripleSPlusCertified:false,remoteWrites:false,mergeAllowed:false,
   limitation:'Immutable public Git metadata only; the holdout has no preregistered truth commitment. No source authenticity, novelty, coverage or test authority is proved by this parser.'
  });
 }catch{return failReport();}
}
function captureProspectivePredictions(bytes,input){
 try{
  const {files}=parseFreeze(bytes);
  const raw=record(input,['schema','manifestBlobSha','engineCommitSha','holdoutCommitSha','snapshots']);
  if(raw.schema!=='ultra-sentinel-phase2-prospective-predictions/v1'||
   raw.manifestBlobSha!==FROZEN_MANIFEST_BLOB||
   raw.engineCommitSha!==ENGINE||raw.holdoutCommitSha!==HOLDOUT)invalid();
  const snapshots=array(raw.snapshots,files.length,files.length),normalized=[],summaries=[];
  let total=0;
  for(let i=0;i<files.length;i++){
   const row=record(snapshots[i],['path','expectedBlobSha','findings']),expected=files[i];
   if(row.path!==expected.path||row.expectedBlobSha!==expected.blobSha)invalid();
   const findings=array(row.findings,40),unique=new Set(),ids=[];
   for(const f of findings){
    const v=record(f,['rule','path','line','expectedBlobSha','status']);
    if(typeof v.rule!=='string'||!RULE.test(v.rule)||v.path!==expected.path||
      v.expectedBlobSha!==expected.blobSha||!Number.isSafeInteger(v.line)||
      v.line<1||v.line>100000||
      v.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE')invalid();
    const id=v.rule+'\0'+v.line;
    if(unique.has(id))invalid();unique.add(id);
    ids.push(Object.freeze({rule:v.rule,line:v.line}));
   }
   ids.sort((a,b)=>a.line-b.line||a.rule.localeCompare(b.rule));
   normalized.push({path:expected.path,blobSha:expected.blobSha,findings:ids});
   summaries.push(Object.freeze({path:expected.path,count:ids.length}));
   total+=ids.length;
  }
  const predictionDigest=createHash('sha256').update(JSON.stringify({
   manifestBlobSha:FROZEN_MANIFEST_BLOB,engineCommitSha:ENGINE,
   holdoutCommitSha:HOLDOUT,snapshots:normalized
  })).digest('hex');
  return Object.freeze({
   schema:'ultra-sentinel-phase2-prospective-prediction-receipt/v1',
   status:'PREDICTIONS_SEALED_NO_INDEPENDENT_TRUTH',
   manifestBlobSha:FROZEN_MANIFEST_BLOB,engineCommitSha:ENGINE,
   holdoutCommitSha:HOLDOUT,predictionDigest,
   filesCovered:files.length,unverifiedFindings:total,
   findingsByCase:Object.freeze(summaries),
   verifiableFalsePositives:null,falsePositiveCount:null,
   precision:null,recall:null,f1:null,falsePositiveRate:null,
   verifiedPositiveLabels:0,verifiedNegativeLabels:0,verifiedRepairs:0,
   engineExecutedAndAuthenticated:false,independentSourceOracleVerified:false,
   trainingDisjointnessAuthenticated:false,novelFamilyVerified:false,
   tripleSPlusCertified:false,remoteWrites:false,mergeAllowed:false,
   limitation:'Checksum-only source advisory capture; no independent truth was precommitted. Unlabelled alerts are not false positives, and no performance or repair rate can be estimated.'
  });
 }catch{return failPrediction();}
}
module.exports=Object.freeze({inspectProspectiveFreeze,captureProspectivePredictions});
