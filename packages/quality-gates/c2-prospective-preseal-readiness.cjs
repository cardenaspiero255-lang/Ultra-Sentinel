'use strict';
/*
 * Metadata-only prospective pre-registration. Existing Core source blobs are
 * pinned, but neither future truth nor baseline provenance is established.
 * No benchmark input, detector predictions or PR code are read here.
 */
const {createHash}=require('node:crypto');
const {buildExecutableRuleInventory}=require('./c2-executable-rule-inventory.cjs');
const {screenCandidates,CUTOFF}=require('./c2-causal-prospective-preflight.cjs');
const fail=()=>{throw Error('PROSPECTIVE_PRESEAL_BLOCKED');};
const sha=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
function prepareProspectivePreseal(historical,candidates){
 if(!Array.isArray(candidates)||candidates.length>2000)fail();
 const inventory=buildExecutableRuleInventory();
 if(inventory.ruleCount!==17||inventory.detectorSourceShaPinned!==true||
   inventory.certifiedRules!==0||inventory.sssPlusCertified!==false)fail();
 const examined=screenCandidates(historical,candidates);
 const sources=new Set(),bases=new Set();
 for(const x of candidates){
  // Never allow one Git tree to straddle independently named prospectives.
  if(sources.has(x.headSha)||bases.has(x.headSha))fail();
  sources.add(x.headSha);
  if(sources.has(x.baseSha))fail();
  bases.add(x.baseSha);
 }
 const records=examined.candidates.map(x=>({
  repository:x.repository,pr:x.pr,headSha:x.headSha,decision:x.decision
 })).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 const counts={};
 for(const x of records)counts[x.decision]=(counts[x.decision]||0)+1;
 const proposals=counts.PROSPECTIVE_METADATA_ONLY_NOT_FROZEN||0;
 return Object.freeze({
  schema:'c2-prospective-preseal-metadata-only/v1',
  status:candidates.length===0?'NO_PROSPECTIVE_METADATA':'NO_ATTESTED_TRUTH_OR_ISOLATED_HOLDOUT',
  recordedAtCutoff:CUTOFF,
  detector:Object.freeze({engineHeadSha:inventory.engineHeadSha,ruleCount:17,
   sourceShaPinned:true,ruleVocabularyOnly:true,predictionRead:false}),
  historical:Object.freeze({count:examined.historicalStatus==='INCOMPLETE'?historical.length:23,
   inventoryDigest:examined.historicalInventoryDigest,
   authenticated:false,causalIndependenceVerified:false}),
  candidateCount:candidates.length,candidateProposals:proposals,
  candidateMetadataSha256:sha(records),
  decisionCounts:Object.freeze(counts),
  prospectiveRecords:Object.freeze(records.map(Object.freeze)),
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  baselineAuthenticated:false,truthSealed:false,
  independentCausalTruthVerified:false,trainingAndHoldoutSeparated:false,
  cohortMetadataFrozen:false,blindHoldout:false,
  frozenLabelCount:0,negativeFindingLabelsAdmitted:0,
  newGoldLabels:0,falsePositiveRate:null,precision:null,recall:null,f1:null,
  sssPlusCertified:false,
  limitations:Object.freeze([
   'The 23 historical records remain development data, not independently authenticated labels.',
   'A metadata SHA does not freeze prospectively collected source, truth, splits or predictions.',
   'No genuine rule-specific negative Core finding has been independently adjudicated.',
   'Owner-only sealed source controls, lineage split, truth-before-prediction and baseline are required.'
  ])
 });
}
module.exports={prepareProspectivePreseal};
