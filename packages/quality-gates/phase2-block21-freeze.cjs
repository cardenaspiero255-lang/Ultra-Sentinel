'use strict';
/** Prospective Block 2.1 freeze. Verifies a precommitted byte-exact manifest;
 * never loads external Kotlin, predicts defects, reveals oracles, scores or repairs.
 * Git object validation is provided by the separate local verifier. */
const {createHash}=require('node:crypto');
const {TextDecoder}=require('node:util');
const MANIFEST_BLOB='3c1a8036ec8e880c0d474ce9de6cd263feefc862';
const ENGINE='3668a4ff860c49c5aaf69a594efc4fa48d94def3';
const TREE='09b8e8a9e598c4c1184fb0b97617cc3b2ff9c73e';
const COHORT='ead082131ceb45b8e4fda027c74471103c1cd09f';
const SHA=/^[a-f0-9]{40}$/;
function blocked(){return Object.freeze({status:'BLOCKED_INVALID_BLOCK21_FREEZE',engineExecuted:false,mergeAllowed:false,remoteWrites:false});}
function keys(o,expected){
 return o!==null&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).sort().join('\0')===expected.slice().sort().join('\0');
}
function parseBlock21Freeze(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<2000||bytes.length>12000)throw Error('INVALID_FREEZE_BYTES');
 const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(blob!==MANIFEST_BLOB)throw Error('UNPINNED_MANIFEST_BYTES');
 const x=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!keys(x,['schema','block','engine','cohort','protocol','limitations'])||
  x.schema!=='ultra-sentinel-phase2-block21-prospective-freeze/v1'||x.block!=='2.1')throw Error('INVALID_FREEZE_SCHEMA');
 const e=x.engine,c=x.cohort,p=x.protocol;
 if(!keys(e,['repository','commitSha','treeSha','relevantBlobs','completeDependencyClosure'])||
  e.repository!=='cardenaspiero255-lang/Ultra-Sentinel'||e.commitSha!==ENGINE||e.treeSha!==TREE||
  e.completeDependencyClosure!=='ALL_GIT_BLOBS_IN_PINNED_ENGINE_TREE')throw Error('INVALID_ENGINE_IDENTITY');
 if(!Array.isArray(e.relevantBlobs)||e.relevantBlobs.length!==11)throw Error('INVALID_MODULE_INVENTORY');
 let prev='';
 for(const m of e.relevantBlobs){
  if(!keys(m,['path','blobSha'])||typeof m.path!=='string'||
    !/^packages\/(family-hunter|investigation)\/[A-Za-z0-9_.-]+\.(cjs|java)$/.test(m.path)||
    !SHA.test(m.blobSha)||m.path<=prev)throw Error('INVALID_MODULE_BLOB');
  prev=m.path;
 }
 if(!keys(c,['repository','commitSha','treeSha','scope','scopeTreeSha','selection','files'])||
  c.repository!=='Kotlin/kotlinx.coroutines'||c.commitSha!==COHORT||
  c.treeSha!=='6c999bde5fe9f473d1418e67127d06dbb4306426'||
  c.scopeTreeSha!=='3937a995d91588afdba190d90755c347a4afa80a'||
  c.scope!=='kotlinx-coroutines-core/common/src/flow'||
  c.selection!=='ALL_IMMEDIATE_DOT_KT_BLOBS_IN_SCOPE_AT_PINNED_TREE'||
  !Array.isArray(c.files)||c.files.length!==8)throw Error('INVALID_SOURCE_METADATA');
 prev='';
 for(const f of c.files){
  if(!keys(f,['path','blobSha','sizeBytes'])||typeof f.path!=='string'||
   !/^kotlinx-coroutines-core\/common\/src\/flow\/[A-Za-z0-9_.-]+\.kt$/.test(f.path)||
   !SHA.test(f.blobSha)||!Number.isSafeInteger(f.sizeBytes)||f.sizeBytes<1||f.sizeBytes>65536||
   f.path<=prev)throw Error('INVALID_SOURCE_ENTRY');
  prev=f.path;
 }
 const expectedPolicy={
  sourceBodiesReadBeforeFreeze:false,oracleAnswersReadBeforeFreeze:false,
  hunterPredictionsRunBeforeFreeze:false,trainingOrRetuningOnThisCohortForbidden:true,
  requireIndependentOracleCommitmentBeforePrediction:true,requireSealedPredictionsBeforeOracleReveal:true,
  requireOriginalJvmFunctionalControls:true,requireBenignNegativeControls:true,
  unscoredUntilFullLabeledUniverse:true,notYetProvenTrainingDisjointness:true,
  preserveUnsupportedAndAbstentions:true,requiresExternalGitTreeAndBlobAuthentication:true,
  allowSourceInspectionInBlock21:false,allowHunterExecutionInBlock21:false,
  allowScoringInBlock21:false,allowRepairInBlock21:false,allowRemoteWritesInBlock21:false
 };
 if(!keys(p,Object.keys(expectedPolicy))||
  Object.entries(expectedPolicy).some(([k,v])=>p[k]!==v)||
  typeof x.limitations!=='string'||x.limitations.length<150)throw Error('INVALID_FREEZE_POLICY');
 return Object.freeze(x);
}
function inspectBlock21Freeze(bytes){
 try{
  const m=parseBlock21Freeze(bytes);
  return Object.freeze({
   schema:'ultra-sentinel-phase2-block21-inspection/v1',
   status:'FROZEN_METADATA_ONLY_NOT_EVALUATED',
   manifestBlobSha:MANIFEST_BLOB,engineCommitSha:ENGINE,engineTreeSha:TREE,
   cohortCommitSha:COHORT,sourceCount:m.cohort.files.length,
   sourceBodiesAuthenticated:false,independentTruthSealed:false,
   engineExecuted:false,novelFamilyVerified:false,automatedRepairVerified:false,
   precision:null,recall:null,f1:null,falsePositives:null,falseNegatives:null,
   mergeAllowed:false,remoteWrites:false,
   limitation:'External Git source identities are only preregistered metadata; no source, truth, predictions, coverage, or novelty has been validated.'
  });
 }catch{return blocked();}
}
module.exports=Object.freeze({inspectBlock21Freeze,parseBlock21Freeze});
