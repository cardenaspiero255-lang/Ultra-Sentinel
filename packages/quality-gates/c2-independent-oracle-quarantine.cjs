'use strict';
/*
 * PROSPECTIVE ORIGINAL TRUTH QUARANTINE
 * No pull-request patch, file, test, issue, finding or truth is an input here.
 * GitHub metadata admission is not root-cause independent truth.
 * The detector must never read an unadjudicated oracle receipt.
 */
const {createHash}=require('node:crypto');
const {prevalidateProspectiveMetadata}=require('./c2-four-prospective-metadata.cjs');
const {buildExecutableRuleInventory}=require('./c2-executable-rule-inventory.cjs');
const MANIFEST_SHA256='e9d43a9c62a7e82d9a50212c297e61aff72d8ea78a46b0a23796a9d4787fa9f3';
const H40=/^[0-9a-f]{40}$/,H64=/^[0-9a-f]{64}$/;
const fail=()=>{throw Error('C2_INDEPENDENT_ORACLE_QUARANTINE_BLOCKED');};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const pinnedSourcePaths=[
 'packages/core/ultra_sentinel_core.cjs',
 'packages/core/c2-semantic-patterns.cjs',
 'packages/core/c2-known-defect-regressions.cjs'
];
function prepareIndependentOracleQuarantine(metadata){
 let accepted,inventory;
 try{
  accepted=prevalidateProspectiveMetadata(metadata);
  inventory=buildExecutableRuleInventory();
 }catch{fail()}
 if(accepted.metadataSha256!==MANIFEST_SHA256||
    accepted.count!==4||accepted.uniqueRepositories!==4||
    accepted.cohortFrozen!==false||accepted.potentialDefectsConfirmed!==0||
    accepted.coreInspectedCandidatePatches!==false||
    inventory.ruleCount!==17||inventory.detectorSourceShaPinned!==true||
    inventory.sssPlusCertified!==false||
    inventory.certifiedRules!==0||inventory.ruleSpecificScoredNegatives!==0||
    Object.keys(inventory.sourceBlobs).length!==3||
    pinnedSourcePaths.some(p=>!H40.test(inventory.sourceBlobs[p]||'')))fail();
 const snapshot=pinnedSourcePaths.map(p=>[p,inventory.sourceBlobs[p]]);
 const stable=accepted.candidates.map(x=>({
  repository:x.repository,pr:x.pr,createdAt:x.createdAt,
  baseSha:x.baseSha,headSha:x.headSha
 }));
 const slots=stable.map(x=>Object.freeze({
  identitySha256:hash([x.repository,x.pr,x.baseSha,x.headSha]),
  repository:x.repository,pr:x.pr,
  state:'AWAITING_EXTERNAL_ORIGINAL_SOURCE_ORACLE'
 }));
 const selection=hash({
  metadataSha256:accepted.metadataSha256,cutoff:metadata.cutoff,
  engineHeadSha:inventory.engineHeadSha,blobs:snapshot,
  candidates:stable,excludedKnownDevelopment:[
   'cardenaspiero255-lang/gamehub-ultra',
   'cardenaspiero255-lang/ultra-sentinel','tasks/tasks',
   'ankidroid/anki-android','public-kotlin-swe-bench'
  ]
 });
 return Object.freeze({
  schema:'c2-prospective-independent-truth-quarantine/v1',
  status:'METADATA_IDENTITY_PRECOMMIT_AWAITING_ORIGINAL_ORACLES',
  candidateCount:4,selectionSha256:selection,
  externalMetadataSha256:MANIFEST_SHA256,
  engineHeadSha:inventory.engineHeadSha,emitterCount:17,
  detectorSourceSha256:hash(snapshot),sourceBlobsPinned:true,
  originalGitTreesAttestedByThisModule:false,
  candidateSourceRead:false,candidatePredictionsRead:false,
  baselinePredictionsRead:false,trainingSeparationAttested:false,
  sourceTruthReviewExecuted:false,originalOraclesAttested:0,
  truthStatus:'NO_INDEPENDENT_ORIGINAL_ORACLES',
  oracleSlots:Object.freeze(slots),sourceEligibleForFutureIsolatedOracle:true,
  genuineDefectsVerified:0,independentlyBenignVerified:0,
  scoredNegatives:0,scoredPositives:0,newGoldLabels:0,
  truthSealed:false,baselineAuthenticated:false,
  holdoutFrozen:false,precision:null,recall:null,f1:null,
  falsePositiveRate:null,sssPlusCertified:false
 });
}
function inspectUntrustedTruthClaim(locked,receipt){
 const fields=['schema','identitySha256','sourceBlobSha','witnessSha256',
  'githubOwnerRunId','independentFromDetector','originalTestsPassed',
  'correctFixAttested','positive','rule'];
 if(!locked||locked.schema!=='c2-prospective-independent-truth-quarantine/v1'||
    locked.truthSealed!==false||locked.holdoutFrozen!==false||
    !Array.isArray(locked.oracleSlots)||locked.oracleSlots.length!==4||
    !receipt||typeof receipt!=='object'||Array.isArray(receipt)||
    Object.keys(receipt).length!==fields.length||
    fields.some(k=>!Object.hasOwn(receipt,k))||
    receipt.schema!=='c2-original-oracle-receipt-proposal/v1'||
    !H64.test(receipt.identitySha256)||!H40.test(receipt.sourceBlobSha)||
    !H64.test(receipt.witnessSha256)||
    !Number.isSafeInteger(receipt.githubOwnerRunId)||receipt.githubOwnerRunId<1||
    typeof receipt.independentFromDetector!=='boolean'||
    typeof receipt.originalTestsPassed!=='boolean'||
    typeof receipt.correctFixAttested!=='boolean'||
    typeof receipt.positive!=='boolean'||
    typeof receipt.rule!=='string'||!/^[A-Z][A-Z0-9_]{2,100}$/.test(receipt.rule)||
    !locked.oracleSlots.some(x=>x.identitySha256===receipt.identitySha256))fail();
 return Object.freeze({
  schema:'c2-untrusted-oracle-proposal-not-admitted/v1',
  status:'UNTRUSTED_RECEIPT_NOT_A_TRUTH_LABEL',
  selectionSha256:locked.selectionSha256,
  unverifiedWitnessProposals:1,
  originalGitSourceAttestedByThisModule:false,
  executableOracleReplayedByThisModule:false,
  independentCausalAdjudication:false,
  attestedTruthLabels:0,scoredNegatives:0,
  predictionsRead:false,truthSealed:false,
  precision:null,recall:null,f1:null,
  falsePositiveRate:null,sssPlusCertified:false
 });
}
module.exports={prepareIndependentOracleQuarantine,inspectUntrustedTruthClaim};
