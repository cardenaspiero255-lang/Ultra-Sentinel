'use strict';
// Adds only ONE independently executed original-source predicate to owner-sealed nine.
// No production score, candidate/baseline access, training, or shortcut certification.
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const {PACKET_DIGEST}=require('./c2-next-one-positive-truth.cjs');
const {NEW}=require('./c2-next-five-source-truth.cjs');
const {POSITIVES,NEGATIVES}=require('./c2-next-four-scoped-truth.cjs');
const {SAFE}=require('./c2-next-seven-source-truth.cjs');
const {ADD,LAST_SEVEN}=require('./c2-next-nine-source-truth.cjs');
const NINE='63ec7f1888e7923b02b0a2ed1e0f841b7f799e930bc6b46b374f68da7ac7c828';
const PR=150,HEAD='4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',
 BLOB='37866fd3dbfcd19d9daaf29a5e1e426391c723d4',
 PATH='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/SmartRecommendationExplanation.kt';
const NEW_LABEL=Object.freeze({pr:PR,headSha:HEAD,blobSha:BLOB,
 rule:'NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE',path:PATH,line:251,positive:true});
function fail(){throw Error('C2_TEN_ORIGINAL_TRUTH_BLOCKED');}
function exact(o,fields){return !!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===fields.length&&fields.every(k=>Object.hasOwn(o,k));}
function match(o,exp){if(!exact(o,Object.keys(exp)))fail();
 for(const [k,v] of Object.entries(exp))if(o[k]!==v)fail();}
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x),'utf8').digest('hex');
const clean=({pr,headSha,blobSha,rule,path,line,positive})=>
 ({pr,headSha,blobSha,rule,path,line,positive});
function validatePrior(p){
 const fields=['schema','status','sourceRepository','engineSourceSha','packetDigest',
  'previousTruthDigest','evidence','labels','prsWithAtLeastOneSourceScopedLabel',
  'sourcePositiveLabels','verifiedScopedNegativeLabels','verifiedNegativeFindingLabels',
  'benchmarkScoredLabels','neededAdditionalPositiveLabelsAtLeast',
  'neededAdditionalNegativeLabelsAtLeast','neededAdditionalLabelsAtLeast',
  'includesPredictions','includesBaseline','sealedTruthDigest',
  'precision','recall','f1','fpNonRegressionVerified','tripleSPlusCertified',
  'canMerge','canRepair','verdict','limitation'];
 if(!exact(p,fields)||p.schema!=='ultra-sentinel-c2-next-nine-original-source-truth-seal/v1'||
 p.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||p.sourceRepository!==NEW_LOCK.repository||
 p.engineSourceSha!==NEW_LOCK.engineSourceSha||p.packetDigest!==PACKET_DIGEST||
 p.previousTruthDigest!==LAST_SEVEN||p.sealedTruthDigest!==NINE||
 p.prsWithAtLeastOneSourceScopedLabel!==8||
 !Array.isArray(p.labels)||p.labels.length!==9||
 p.sourcePositiveLabels!==4||p.verifiedScopedNegativeLabels!==5||
 p.verifiedNegativeFindingLabels!==5||p.benchmarkScoredLabels!==0||
 p.neededAdditionalPositiveLabelsAtLeast!==44||p.neededAdditionalNegativeLabelsAtLeast!==43||
 p.neededAdditionalLabelsAtLeast!==111||p.includesPredictions!==false||
 p.includesBaseline!==false||p.precision!==null||p.recall!==null||p.f1!==null||
 p.fpNonRegressionVerified!==false||p.tripleSPlusCertified!==false||
 p.canMerge!==false||p.canRepair!==false||p.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
 typeof p.limitation!=='string'||p.limitation.length<90)fail();
 match(p.evidence,{previousSealRun:38970396948,previousSealArtifact:12076436893,
  newWitnessRun:38982855937,newWitnessArtifact:12082061520});
 const expect=[...ADD.map(clean),NEW,...POSITIVES,...SAFE.map(clean),...NEGATIVES.map(clean)].map(clean);
 for(let i=0;i<9;i++)match(p.labels[i],expect[i]);
 const actual=hash({schema:'ultra-sentinel-c2-next-nine-original-source-truth/v1',
  packetDigest:PACKET_DIGEST,engineSourceSha:NEW_LOCK.engineSourceSha,
  previousTruthDigest:LAST_SEVEN,labels:p.labels});
 if(actual!==NINE)fail();
}
function validateWitness(w){
 match(w,{
 schema:'ultra-sentinel-c2-pr150-negative-history-source-oracle/v1',
 pr:150,headSha:HEAD,sourceGitBlob:BLOB,
 rule:'NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE',line:251,
 originalBadHistoryHigh:true,emptyHistoryMedium:true,
 executedOriginalSource:true,mutantKilled:false,newTruthLabelsSealed:0,
 candidateInspected:false,baselineCompared:false,
 precision:null,recall:null,f1:null,tripleSPlusCertified:false});
}
function sealTenOriginalTruth({previous,witness}={}){
 validatePrior(previous);validateWitness(witness);
 const labels=Object.freeze([NEW_LABEL,...previous.labels].map(x=>Object.freeze({...x})));
 if(labels.length!==10||
  new Set(labels.map(x=>JSON.stringify([x.pr,x.rule,x.path,x.line]))).size!==10||
  new Set(labels.map(x=>x.pr)).size!==8)fail();
 const sealedTruthDigest=hash({schema:'ultra-sentinel-c2-next-ten-original-source-truth/v1',
  packetDigest:PACKET_DIGEST,engineSourceSha:NEW_LOCK.engineSourceSha,
  previousTruthDigest:NINE,labels});
 return Object.freeze({
 schema:'ultra-sentinel-c2-next-ten-original-source-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',sourceRepository:NEW_LOCK.repository,
 engineSourceSha:NEW_LOCK.engineSourceSha,packetDigest:PACKET_DIGEST,
 previousTruthDigest:NINE,
 evidence:Object.freeze({previousSealRun:38983286401,previousSealArtifact:12082091255,
  newWitnessRun:38988102205,newWitnessArtifact:12083843392}),
 labels,prsWithAtLeastOneSourceScopedLabel:8,
 sourcePositiveLabels:5,verifiedScopedNegativeLabels:5,verifiedNegativeFindingLabels:5,
 benchmarkScoredLabels:0,neededAdditionalPositiveLabelsAtLeast:43,
 neededAdditionalNegativeLabelsAtLeast:43,neededAdditionalLabelsAtLeast:110,
 includesPredictions:false,includesBaseline:false,sealedTruthDigest,
 precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
 tripleSPlusCertified:false,canMerge:false,canRepair:false,
 verdict:'TRUTH_CORPUS_INCOMPLETE',
 limitation:'Five independently reproduced original-code positive source predicates and five bounded negatives. '
 +'This new PR150 history-only signal is a distinct source branch from prior fresh-authoritative-external evidence. '
 +'No original-hardware frequency evidence or deployment incidence is claimed. '
 +'Missing at least 110 authentic representative independent source labels, full compatible frozen-Core coverage, '
 +'old/new complete benchmark predictions, critical-rule populations, actual 95% metrics and FP nonregression proof. '
 +'Synthetic counterfactuals are sensitivity controls only. Internal Triple S+ NOT_CERTIFIED.'
 });
}
module.exports={sealTenOriginalTruth,NEW_LABEL,NINE};
