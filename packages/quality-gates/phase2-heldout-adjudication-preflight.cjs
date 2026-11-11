'use strict';
/**
 * Fail-closed scoring preflight for a frozen, prospective Kotlin holdout.
 * A SHA-256 checksum and user-supplied "verified" booleans are NOT proof of
 * independent adjudication. This gate validates completeness, binding and
 * temporal ordering but NEVER asserts oracle authenticity or scores cases.
 * A separate trusted verifier must authenticate original JVM traces, the
 * negative universe, novelty lineage and signed evidence before unblinding.
 */
const {createHash}=require('node:crypto');
const {types}=require('node:util');
const {inspectProspectiveFreeze}=require('./phase2-prospective-hunter-freeze.cjs');
const SHA256=/^[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const blocked=reason=>Object.freeze({
 schema:'ultra-sentinel-phase2-heldout-adjudication-preflight/v1',
 status:'BLOCKED_INDEPENDENT_ADJUDICATION',reason,
 sourceUniverseComplete:false,negativeUniverseComplete:false,
 truthPrecommittedBeforePredictions:false,oracleIndependenceAuthenticated:false,
 novelFamilyProvenanceVerified:false,repairsVerified:0,
 findingsVerified:0,falsePositiveCount:null,precision:null,recall:null,f1:null,
 falsePositiveRate:null,novelFamilyDiscoveryRate:null,repairSuccessRate:null,
 tripleSPlusCertified:false,remoteWrites:false,mergeAllowed:false
});
function fail(code){throw Error(code);}
function record(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value)||types.isProxy(value)||
  Object.getPrototypeOf(value)!==Object.prototype||
  Reflect.ownKeys(value).length!==keys.length)fail('INVALID_RECORD');
 const out={};
 for(const key of keys){
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('ACCESSOR_FORBIDDEN');
  out[key]=descriptor.value;
 }
 return out;
}
function array(value,min,max){
 if(!Array.isArray(value)||types.isProxy(value)||
  Object.getPrototypeOf(value)!==Array.prototype||
  value.length<min||value.length>max||Reflect.ownKeys(value).length!==value.length+1)
  fail('INVALID_ARRAY');
 const out=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))fail('ACCESSOR_FORBIDDEN');
  out.push(d.value);
 }
 return out;
}
function inspectIndependentAdjudication({manifestBytes,predictions,adjudication}={}){
 try{
  if(!Buffer.isBuffer(manifestBytes))fail('INVALID_FREEZE');
  const freeze=inspectProspectiveFreeze(manifestBytes);
  if(freeze.status!=='FROZEN_SOURCE_METADATA_ONLY')fail('INVALID_FREEZE');
  const manifest=JSON.parse(manifestBytes.toString('utf8'));
  const p=record(predictions,['schema','status','manifestBlobSha','engineCommitSha',
   'holdoutCommitSha','predictionDigest','filesCovered','unverifiedFindings',
   'findingsByCase','verifiableFalsePositives','falsePositiveCount',
   'precision','recall','f1','falsePositiveRate','verifiedPositiveLabels',
   'verifiedNegativeLabels','verifiedRepairs','engineExecutedAndAuthenticated',
   'independentSourceOracleVerified','trainingDisjointnessAuthenticated',
   'novelFamilyVerified','tripleSPlusCertified','remoteWrites','mergeAllowed','limitation']);
  if(p.schema!=='ultra-sentinel-phase2-prospective-prediction-receipt/v1'||
   p.status!=='PREDICTIONS_SEALED_NO_INDEPENDENT_TRUTH'||
   p.manifestBlobSha!==freeze.manifestBlobSha||
   p.engineCommitSha!==freeze.engineCommitSha||
   p.holdoutCommitSha!==freeze.holdoutCommitSha||
   typeof p.predictionDigest!=='string'||!SHA256.test(p.predictionDigest)||
   p.filesCovered!==manifest.holdout.files.length||
   !Number.isSafeInteger(p.unverifiedFindings)||p.unverifiedFindings<0||
   p.falsePositiveCount!==null||p.precision!==null||p.recall!==null||
   p.f1!==null||p.falsePositiveRate!==null||p.verifiableFalsePositives!==null||
   p.verifiedPositiveLabels!==0||p.verifiedNegativeLabels!==0||
   p.verifiedRepairs!==0||p.engineExecutedAndAuthenticated!==false||
   p.independentSourceOracleVerified!==false||
   p.trainingDisjointnessAuthenticated!==false||p.novelFamilyVerified!==false||
   p.tripleSPlusCertified!==false||p.remoteWrites!==false||p.mergeAllowed!==false)
   fail('PREDICTION_RECEIPT_UNTRUSTED');
  const predictionsByFile=array(p.findingsByCase,manifest.holdout.files.length,manifest.holdout.files.length);
  let sum=0;
  for(let i=0;i<predictionsByFile.length;i++){
   const x=record(predictionsByFile[i],['path','count']);
   if(x.path!==manifest.holdout.files[i].path||
    !Number.isSafeInteger(x.count)||x.count<0||x.count>120)fail('PREDICTION_UNIVERSE_INVALID');
   sum+=x.count;
  }
  if(sum!==p.unverifiedFindings)fail('PREDICTION_COUNTS_INVALID');
  if(adjudication==null)return blocked('INDEPENDENT_ORACLE_TRUTH_NOT_SUPPLIED');
  const a=record(adjudication,['schema','freezeManifestBlobSha','predictionDigest',
   'truthCommitmentSha256','truthCommitmentGitSha','truthCommittedBeforePrediction',
   'independentOracleEvidence','negativeUniverse','novelFamilyLineage','repairEvidence',
   'cases']);
  if(a.schema!=='ultra-sentinel-phase2-independent-adjudication/v1'||
   a.freezeManifestBlobSha!==freeze.manifestBlobSha||
   a.predictionDigest!==p.predictionDigest||
   typeof a.truthCommitmentSha256!=='string'||!SHA256.test(a.truthCommitmentSha256)||
   typeof a.truthCommitmentGitSha!=='string'||!SHA.test(a.truthCommitmentGitSha)||
   a.truthCommittedBeforePrediction!==true)fail('NO_PRECOMMITTED_TRUTH');
  // These are evidence references, not attestations. Do not trust user-supplied
  // strings or timestamps as proof that any JVM actually ran independently.
  for(const name of ['independentOracleEvidence','negativeUniverse','novelFamilyLineage','repairEvidence']){
   const value=a[name];
   if(typeof value!=='string'||!SHA256.test(value))fail('EVIDENCE_REFERENCE_INVALID');
  }
  const cases=array(a.cases,manifest.holdout.files.length,manifest.holdout.files.length);
  let negatives=0,positives=0;
  for(let i=0;i<cases.length;i++){
   const x=record(cases[i],['path','sourceBlobSha','oracleWitnessSha256',
    'positiveLabels','negativeLabels','completeFindingUniverse']);
   const original=manifest.holdout.files[i];
   if(x.path!==original.path||x.sourceBlobSha!==original.blobSha||
    typeof x.oracleWitnessSha256!=='string'||!SHA256.test(x.oracleWitnessSha256)||
    x.completeFindingUniverse!==true)fail('INCOMPLETE_CASE_UNIVERSE');
   const seen=new Set();
   for(const [kind,items] of [['positive',x.positiveLabels],['negative',x.negativeLabels]]){
    for(const label of array(items,0,200)){
     const y=record(label,['rule','line']);
     if(typeof y.rule!=='string'||!RULE.test(y.rule)||
      !Number.isSafeInteger(y.line)||y.line<1||y.line>100000)fail('INVALID_LABEL');
     const key=y.rule+'\0'+y.line;
     if(seen.has(key))fail('CONTRADICTORY_OR_DUPLICATE_LABEL');
     seen.add(key);
     if(kind==='positive')positives++;else negatives++;
    }
   }
  }
  // A complete list of labels is not necessarily a complete universe of
  // valid findings. Independent executable oracles and provenance are needed.
  return Object.freeze({...blocked('EVIDENCE_REFERENCES_REQUIRE_TRUSTED_EXTERNAL_VERIFICATION'),
   sourceUniverseComplete:true,negativeUniverseComplete:negatives>0,
   truthPrecommittedBeforePredictions:false,
   assertedPositiveLabels:positives,assertedNegativeLabels:negatives,
   evidenceReferenceCount:4+cases.length});
 }catch{return blocked('UNTRUSTED_OR_INCOMPLETE_ADJUDICATION');}
}
module.exports=Object.freeze({inspectIndependentAdjudication});
