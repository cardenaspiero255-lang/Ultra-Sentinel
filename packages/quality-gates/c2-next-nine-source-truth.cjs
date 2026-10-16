'use strict';
// A truth-only seal. No candidate/baseline prediction access, model training or scoring.
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const {PACKET_DIGEST}=require('./c2-next-one-positive-truth.cjs');
const {NEW}=require('./c2-next-five-source-truth.cjs');
const {POSITIVES,NEGATIVES}=require('./c2-next-four-scoped-truth.cjs');
const {SAFE}=require('./c2-next-seven-source-truth.cjs');
const LAST_SEVEN='1a8938be1716ec67162bf6bad4f164da527f734e75499326ab912cae95f56cd7';
const HEAD='4c6912d7ca17df0669f8a0d9667f34d2f2b205a9';
const BLOB='37866fd3dbfcd19d9daaf29a5e1e426391c723d4';
const PATH='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/SmartRecommendationExplanation.kt';
const ADD=Object.freeze([
 Object.freeze({pr:150,headSha:HEAD,blobSha:BLOB,
  rule:'ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION',
  path:PATH,line:252,positive:true}),
 Object.freeze({pr:150,headSha:HEAD,blobSha:BLOB,
  rule:'WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE',
  path:PATH,line:250,positive:false})
]);
function fail(){throw Error('C2_NINE_ORIGINAL_TRUTH_BLOCKED');}
function exact(o,fields){return !!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===fields.length&&fields.every(k=>Object.hasOwn(o,k));}
function matching(o,e){
 if(!exact(o,Object.keys(e)))fail();
 for(const [k,v] of Object.entries(e))if(o[k]!==v)fail();
}
function canonical(x){return crypto.createHash('sha256').update(JSON.stringify(x),'utf8').digest('hex');}
const clean=({pr,headSha,blobSha,rule,path,line,positive})=>
 ({pr,headSha,blobSha,rule,path,line,positive});
function checkPrevious(p){
 const fields=['schema','status','sourceRepository','engineSourceSha','packetDigest',
 'previousTruthDigest','evidence','labels','sourcePositiveLabels','verifiedScopedNegativeLabels',
 'verifiedNegativeFindingLabels','benchmarkScoredLabels','neededAdditionalPositiveLabelsAtLeast',
 'neededAdditionalNegativeLabelsAtLeast','neededAdditionalLabelsAtLeast','includesPredictions',
 'includesBaseline','sealedTruthDigest','precision','recall','f1','fpNonRegressionVerified',
 'tripleSPlusCertified','canMerge','canRepair','verdict','limitation'];
 if(!exact(p,fields)||p.schema!=='ultra-sentinel-c2-next-seven-original-source-truth-seal/v1'||
 p.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
 p.sourceRepository!==NEW_LOCK.repository||
 p.engineSourceSha!==NEW_LOCK.engineSourceSha||
 p.packetDigest!==PACKET_DIGEST||
 p.previousTruthDigest!=='c1806b94f2ddeb026a2d8eb0009398cc5a660445220abfd2dde4f391a7d4a8d0'||
 p.sealedTruthDigest!==LAST_SEVEN||
 !Array.isArray(p.labels)||p.labels.length!==7||
 p.sourcePositiveLabels!==3||p.verifiedScopedNegativeLabels!==4||
 p.verifiedNegativeFindingLabels!==4||p.benchmarkScoredLabels!==0||
 p.neededAdditionalPositiveLabelsAtLeast!==45||p.neededAdditionalNegativeLabelsAtLeast!==44||
 p.neededAdditionalLabelsAtLeast!==113||
 p.includesPredictions!==false||p.includesBaseline!==false||
 p.precision!==null||p.recall!==null||p.f1!==null||
 p.fpNonRegressionVerified!==false||p.tripleSPlusCertified!==false||
 p.canMerge!==false||p.canRepair!==false||p.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
 typeof p.limitation!=='string'||p.limitation.length<90)fail();
 matching(p.evidence,{previousSealRun:38969278857,previousSealArtifact:12075338764,
 newWitnessRun:38969804193,newWitnessArtifact:12076406708});
 const old=[NEW,...POSITIVES,...SAFE.map(clean),...NEGATIVES.map(clean)].map(clean);
 for(let i=0;i<7;i++)matching(p.labels[i],old[i]);
 const check=canonical({schema:'ultra-sentinel-c2-next-seven-original-source-truth/v1',
  packetDigest:PACKET_DIGEST,engineSourceSha:NEW_LOCK.engineSourceSha,
  previousTruthDigest:p.previousTruthDigest,labels:p.labels});
 if(check!==LAST_SEVEN)fail();
}
function checkWitness(w){
 const fields=['schema','pr','headSha','sourceGitBlob','executedOriginalSource',
 'allAuthoritativeSourcesOpposeButConfidenceHigh',
 'weakExternalEvidenceDowngradesConfidence','affirmativeControlHigh',
 'candidateInspected','baselineCompared','precision','recall','f1','tripleSPlusCertified'];
 if(!exact(w,fields))fail();
 matching(w,{
 schema:'ultra-sentinel-c2-next-pr150-confidence-original-oracle/v1',
 pr:150,headSha:HEAD,sourceGitBlob:BLOB,executedOriginalSource:true,
 allAuthoritativeSourcesOpposeButConfidenceHigh:true,
 weakExternalEvidenceDowngradesConfidence:true,affirmativeControlHigh:true,
 candidateInspected:false,baselineCompared:false,precision:null,recall:null,f1:null,
 tripleSPlusCertified:false});
}
function sealNineSourceTruth({previous,witness}={}){
 checkPrevious(previous);checkWitness(witness);
 const labels=Object.freeze([...ADD,...previous.labels].map(x=>Object.freeze({...x})));
 if(new Set(labels.map(x=>JSON.stringify([x.pr,x.rule,x.path,x.line]))).size!==9||
 new Set(labels.map(x=>x.pr)).size!==8)fail();
 const sealedTruthDigest=canonical({schema:'ultra-sentinel-c2-next-nine-original-source-truth/v1',
 packetDigest:PACKET_DIGEST,engineSourceSha:NEW_LOCK.engineSourceSha,
 previousTruthDigest:LAST_SEVEN,labels});
 return Object.freeze({
 schema:'ultra-sentinel-c2-next-nine-original-source-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',sourceRepository:NEW_LOCK.repository,
 engineSourceSha:NEW_LOCK.engineSourceSha,packetDigest:PACKET_DIGEST,
 previousTruthDigest:LAST_SEVEN,
 evidence:Object.freeze({previousSealRun:38970396948,previousSealArtifact:12076436893,
 newWitnessRun:38982855937,newWitnessArtifact:12082061520}),
 labels,prsWithAtLeastOneSourceScopedLabel:8,
 sourcePositiveLabels:4,verifiedScopedNegativeLabels:5,verifiedNegativeFindingLabels:5,
 benchmarkScoredLabels:0,neededAdditionalPositiveLabelsAtLeast:44,
 neededAdditionalNegativeLabelsAtLeast:43,neededAdditionalLabelsAtLeast:111,
 includesPredictions:false,includesBaseline:false,sealedTruthDigest,
 precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
 tripleSPlusCertified:false,canMerge:false,canRepair:false,
 verdict:'TRUTH_CORPUS_INCOMPLETE',
 limitation:'Four distinct reproduced source-original positive predicates plus five bounded negatives across eight frozen PRs. '
 +'Nine PR/rule/path/line identities are attested only within their individual technical oracle scope, not whole-PR '
 +'review. Missing 111 authentic diverse labels, complete eligible-file scanning, legacy/new prediction parity, '
 +'critical-population measurement and zero-false-positive-regression evidence. Mutants are NOT original-source '
 +'positive examples and no precision, recall, F1 or internal Triple S+ certification is available.'
 });
}
module.exports={sealNineSourceTruth,ADD,LAST_SEVEN};
