'use strict';
// No production scoring, training, or blind-set promotion. Owner CI must authenticate inputs.
const crypto=require('node:crypto');
const PREV_DIGEST='8caeb151cc191132cad2afa088b4a46e419ed72518f80cbeb9626a91ad8f0112';
const PACKET='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34';
const HEAD='104b7dc33e4c0341cec3fca81e3c8fbe3625357f';
const BLOB='886c104effd553cd60f8222bfb05b8505fe7c4b8';
const SOURCE_SHA256='642d4f0a991bdcbe78c1be408fe49de9b04b72255f345fa59a8f7054cd72b4d2';
const PATH='app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraResearchJsonCodec.kt';
const RULE='JSON_SOURCE_ARRAY_EARLY_CLOSING_BRACKET';
const HEX64=/^[0-9a-f]{64}$/;
const EXPECTED_WITNESS_KEYS=['schema','pr','headSha','blobSha','sourceSha256','oracleSha256','originalFailure','positiveControlPassed','counterfactualPassed','originalLogSha256','counterfactualLogSha256','candidateRead','baselineRead'];
const EXPECTED_PRIOR_KEYS=['schema','status','sourceRepository','engineSourceSha','packetDigest','previousTruthDigest','evidence','labels','prsWithAtLeastOneSourceScopedLabel','sourcePositiveLabels','verifiedScopedNegativeLabels','verifiedNegativeFindingLabels','benchmarkScoredLabels','neededAdditionalPositiveLabelsAtLeast','neededAdditionalNegativeLabelsAtLeast','neededAdditionalLabelsAtLeast','includesPredictions','includesBaseline','sealedTruthDigest','precision','recall','f1','fpNonRegressionVerified','tripleSPlusCertified','canMerge','canRepair','verdict','limitation'];
function block(){throw Error('C2_OWNER_PR152_TRUTH_BLOCKED');}
function exact(obj,keys){return obj!==null && typeof obj==='object' && !Array.isArray(obj) && Object.keys(obj).length===keys.length && keys.every(k=>Object.hasOwn(obj,k));}
function identity(x){return JSON.stringify([x.pr,x.rule,x.path,x.line]);}
function reviewEleven({prior,witness}={}){
 if(!exact(prior,EXPECTED_PRIOR_KEYS)||
    prior.schema!=='ultra-sentinel-c2-next-ten-original-source-truth-seal/v1'||
    prior.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
    prior.sealedTruthDigest!==PREV_DIGEST||prior.packetDigest!==PACKET||
    prior.sourceRepository!=='cardenaspiero255-lang/gamehub-ultra'||
    prior.sourcePositiveLabels!==5||prior.verifiedScopedNegativeLabels!==5||
    prior.neededAdditionalLabelsAtLeast!==110||prior.labels?.length!==10||
    prior.benchmarkScoredLabels!==0||prior.includesPredictions!==false||
    prior.includesBaseline!==false||prior.precision!==null||prior.recall!==null||
    prior.f1!==null||prior.tripleSPlusCertified!==false||
    prior.verdict!=='TRUTH_CORPUS_INCOMPLETE') block();
 if(prior.labels.some(x=>!Number.isInteger(x.pr)||!Number.isInteger(x.line)||
    typeof x.rule!=='string'||typeof x.path!=='string'||typeof x.headSha!=='string'||
    typeof x.blobSha!=='string'||typeof x.positive!=='boolean'))block();
 const oldKeys=new Set(prior.labels.map(identity));
 if(oldKeys.size!==10||prior.labels.filter(x=>x.positive).length!==5||
    prior.labels.filter(x=>!x.positive).length!==5)block();
 if(!exact(witness,EXPECTED_WITNESS_KEYS)||
    witness.schema!=='ultra-sentinel-c2-pr152-original-json-witness/v1'||
    witness.pr!==152||witness.headSha!==HEAD||witness.blobSha!==BLOB||
    witness.sourceSha256!==SOURCE_SHA256||
    witness.originalFailure!==true||witness.positiveControlPassed!==true||
    witness.counterfactualPassed!==true||
    witness.candidateRead!==false||witness.baselineRead!==false||
    !HEX64.test(witness.oracleSha256)||
    !HEX64.test(witness.originalLogSha256)||!HEX64.test(witness.counterfactualLogSha256))block();
 const label={pr:152,headSha:HEAD,blobSha:BLOB,rule:RULE,path:PATH,line:110,positive:true};
 if(oldKeys.has(identity(label)))block();
 const evidenceSha256=crypto.createHash('sha256')
   .update(JSON.stringify({source:SOURCE_SHA256,oracle:witness.oracleSha256,
      original:witness.originalLogSha256,control:witness.counterfactualLogSha256}),'utf8').digest('hex');
 const labels=[Object.freeze({...label,evidenceSha256}),...prior.labels.map(x=>Object.freeze({...x}))];
 const digest=crypto.createHash('sha256').update(JSON.stringify({schema:'ultra-sentinel-c2-pr152-owner-preseal/v1',previousTruthDigest:PREV_DIGEST,labels}), 'utf8').digest('hex');
 return Object.freeze({schema:'ultra-sentinel-c2-pr152-owner-preseal/v1',status:'OWNER_CI_ATTESTATION_REQUIRED',
  repository:prior.sourceRepository,packetDigest:PACKET,previousTruthDigest:PREV_DIGEST,
  evidenceSha256,sourcePositiveLabels:6,verifiedScopedNegativeLabels:5,
  labels,neededAdditionalLabelsAtLeast:109,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  tripleSPlusCertified:false,canMerge:false,presealDigest:digest});
}
module.exports={reviewEleven};
