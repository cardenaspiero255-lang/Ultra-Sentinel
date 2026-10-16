'use strict';
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const {PACKET_DIGEST}=require('./c2-next-one-positive-truth.cjs');
const {EXPECTED_PRIOR_DIGEST}=require('./c2-next-two-original-truth.cjs');
const PREVIOUS_SEAL='c4a573927259fd4c2a66c8b1cf9c58c2a0010bcb23e9412d7026c1a4693a6b65';
const ROOT='app/src/main/java/com/cardenaspiero255/gamehubultra/';
const POSITIVES=Object.freeze([
 Object.freeze({pr:152,headSha:NEW_LOCK.cases[2].headSha,
 blobSha:'549e3b1d619b83e59bc37b31b4860191c25528f1',
 rule:'SUPPORTED_REFRESH_CANDIDATE_STARVED_BY_UNSUPPORTED_PLURALITY',
 path:ROOT+'domain/AiProfileBuilder.kt',line:207,positive:true}),
 Object.freeze({pr:153,headSha:NEW_LOCK.cases[3].headSha,
 blobSha:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',
 rule:'PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE',
 path:ROOT+'PerGameAdaptiveRuntime.kt',line:71,positive:true})
]);
const NEGATIVES=Object.freeze([
 Object.freeze({pr:157,headSha:NEW_LOCK.cases[6].headSha,
 blobSha:'a4361860bc51d5473766b6fb82f10bdca2b154ce',
 rule:'MUTATION_EXECUTES_WITHOUT_TOOL_AUTHORIZATION',
 path:ROOT+'ai/UltraFrontierToolGateway.kt',line:32,positive:false,
 originalControlPassed:true,counterfactualFailedAtTarget:true}),
 Object.freeze({pr:158,headSha:NEW_LOCK.cases[7].headSha,
 blobSha:'d1af5d8c6574c325fdacadec54748cb730c3aacd',
 rule:'UNBOUNDED_AUDIT_TRAIL_RETENTION',
 path:ROOT+'ai/UltraFrontierAuditTrail.kt',line:60,positive:false,
 originalControlPassed:true,counterfactualFailedAtTarget:true})
]);
function blocked(){throw Error('C2_FOUR_SOURCE_TRUTH_BLOCKED');}
function exact(o,keys){
 return o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(x=>Object.hasOwn(o,x));
}
function same(o,e){if(!exact(o,Object.keys(e)))blocked();
 for(const [k,v] of Object.entries(e))if(o[k]!==v)blocked();}
function priorTruth(p){
 const keys=['schema','status','sourceRepository','engineSourceSha','packetDigest',
 'previousTruthDigest','witnessSha256','evidence','labels','sourcePositiveLabels',
 'verifiedNegativeFindingLabels','benchmarkScoredLabels',
 'neededAdditionalPositiveLabelsAtLeast','neededAdditionalNegativeLabelsAtLeast',
 'includesPredictions','includesBaseline','sealedTruthDigest',
 'precision','recall','f1','fpNonRegressionVerified','tripleSPlusCertified',
 'canMerge','canRepair','verdict','limitation'];
 if(!exact(p,keys)||p.schema!=='ultra-sentinel-c2-next-two-source-truth-seal/v1'||
 p.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
 p.sourceRepository!==NEW_LOCK.repository||p.engineSourceSha!==NEW_LOCK.engineSourceSha||
 p.packetDigest!==PACKET_DIGEST||p.previousTruthDigest!==EXPECTED_PRIOR_DIGEST||
 p.witnessSha256!=='f0c1bd296d028312d16bd128b0fc407bc48e07207256e210467d7e9659bf2c73'||
 p.sealedTruthDigest!==PREVIOUS_SEAL||
 !Array.isArray(p.labels)||p.labels.length!==2||
 p.sourcePositiveLabels!==2||p.verifiedNegativeFindingLabels!==0||
 p.benchmarkScoredLabels!==0||
 p.neededAdditionalPositiveLabelsAtLeast!==46||
 p.neededAdditionalNegativeLabelsAtLeast!==48||
 p.includesPredictions!==false||p.includesBaseline!==false||
 p.precision!==null||p.recall!==null||p.f1!==null||
 p.fpNonRegressionVerified!==false||p.tripleSPlusCertified!==false||
 p.canMerge!==false||p.canRepair!==false||p.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
 typeof p.limitation!=='string'||p.limitation.length<80)blocked();
 same(p.evidence,{previousSealRun:38890454291,previousSealArtifact:12041790611,
 newWitnessRun:38930244332,newWitnessArtifact:12057454797});
 for(let i=0;i<2;i++)same(p.labels[i],POSITIVES[i]);
}
function scopedControls(n){
 const keys=['schema','sourceRepository','frozenPacketDigest','cases',
 'negativeFindingLabelsProvenUnderControlScope','negativeFindingLabelsEstablished',
 'candidateInspected','baselineCompared','precision','recall','f1',
 'fpNonRegressionVerified','tripleSPlusCertified','limitation'];
 if(!exact(n,keys)||n.schema!=='ultra-sentinel-c2-next-scoped-original-negatives/v1'||
 n.sourceRepository!==NEW_LOCK.repository||n.frozenPacketDigest!==PACKET_DIGEST||
 !Array.isArray(n.cases)||n.cases.length!==2||
 n.negativeFindingLabelsProvenUnderControlScope!==2||
 n.negativeFindingLabelsEstablished!==0||
 n.candidateInspected!==false||n.baselineCompared!==false||
 n.precision!==null||n.recall!==null||n.f1!==null||
 n.fpNonRegressionVerified!==false||n.tripleSPlusCertified!==false||
 typeof n.limitation!=='string'||n.limitation.length<80)blocked();
 for(let i=0;i<2;i++)same(n.cases[i],NEGATIVES[i]);
}
function combineSourceTruth({prior,negativeWitness}={}){
 priorTruth(prior);scopedControls(negativeWitness);
 const labels=Object.freeze([...POSITIVES,...NEGATIVES.map(({pr,headSha,blobSha,rule,path,line,positive})=>
  Object.freeze({pr,headSha,blobSha,rule,path,line,positive}))]);
 const digest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-next-four-scoped-source-truth/v1',
  packetDigest:PACKET_DIGEST,engineSourceSha:NEW_LOCK.engineSourceSha,
  previousSeal:PREVIOUS_SEAL,labels
 }),'utf8').digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-next-four-scoped-source-truth-seal/v1',
  sourceRepository:NEW_LOCK.repository,engineSourceSha:NEW_LOCK.engineSourceSha,
  packetDigest:PACKET_DIGEST,previousTruthDigest:PREVIOUS_SEAL,
  evidence:Object.freeze({positiveTruthRun:38931168454,
   positiveTruthArtifact:12058802148,
   negativeControlRun:38946358219,
   negativeControlArtifact:12066196917}),
  labels,sourcePositiveLabels:2,verifiedScopedNegativeLabels:2,
  verifiedNegativeFindingLabels:2,benchmarkScoredLabels:0,
  neededAdditionalPositiveLabelsAtLeast:46,
  neededAdditionalNegativeLabelsAtLeast:46,
  neededAdditionalLabelsAtLeast:116,
  includesPredictions:false,includesBaseline:false,sealedTruthDigest:digest,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  tripleSPlusCertified:false,canMerge:false,canRepair:false,
  verdict:'TRUTH_CORPUS_INCOMPLETE',
  limitation:'Two original-source positive defects plus two bounded, mutation-sensitive negatives. '
   +'Unverified other findings and incomplete eight-PR coverage block global scoring. '
   +'Negative labels cover only precise test predicates, not a whole PR or all rules. '
   +'Neither detector nor baseline has been compared. 120-label, critical and false-positive '
   +'non-regression gates remain open.'
 });
}
module.exports={combineSourceTruth,POSITIVES,NEGATIVES,PREVIOUS_SEAL};
