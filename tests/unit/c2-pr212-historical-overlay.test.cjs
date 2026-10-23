'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {overlayPr212OnHistorical}=require('../../packages/quality-gates/c2-pr212-historical-overlay.cjs');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const pairs=[
 ['ttl-thermal','158:114','151:264'],
 ['query-confidence','158:144','150:251'],
 ['json-confidence','152:110','150:252'],
 ['refresh-battery','152:207','155:12']
];
const source=[
 [158,114,'ADVANCED_SIGNAL_TTL_REFRESH_EXTENSION','0d18a43a8e36ea3edacc2cad72071d96aa31626e','9d8572afedc634ac07dae58a0da326ea62bdc1da'],
 [158,144,'CURRENT_COMPARISON_FRESHNESS_QUALIFIER_NOT_RESPECTED','0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f','9d8572afedc634ac07dae58a0da326ea62bdc1da'],
 [152,110,'JSON_SOURCE_ARRAY_EARLY_CLOSING_BRACKET','886c104effd553cd60f8222bfb05b8505fe7c4b8','104b7dc33e4c0341cec3fca81e3c8fbe3625357f'],
 [152,207,'SUPPORTED_REFRESH_CANDIDATE_STARVED_BY_UNSUPPORTED_PLURALITY','549e3b1d619b83e59bc37b31b4860191c25528f1','104b7dc33e4c0341cec3fca81e3c8fbe3625357f']
];
function fixture(){
 const entries=source.map(([pr,line,rule,blobSha,headSha])=>({pr,line,rule,blobSha,headSha,positive:true,
  identity:JSON.stringify([pr,headSha,rule,'test.kt',line,true]),path:'test.kt',
  experimentalProvisionalMechanism:null,originalProvisionalRootCauseGroup:null,
  eligibleForGold:false,causalIndependenceCertified:false}));
 for(let i=0;i<5;i++)entries.push({pr:150,line:i+240,rule:'EXISTING_'+i,
  blobSha:(100+i).toString(16).padStart(40,'0'),headSha:'1'.repeat(40),
  path:'existing.kt',positive:true,identity:'existing_'+i,
  experimentalProvisionalMechanism:i<2?'CONFIDENCE_POLICY':'NONFINITE_NUMERIC_BOUNDARY',
  originalProvisionalRootCauseGroup:null,eligibleForGold:false,causalIndependenceCertified:false});
 entries.push({pr:152,line:41,positive:true,originalProvisionalRootCauseGroup:'state_version_monotonicity',
  experimentalProvisionalMechanism:null,identity:'original-existing',eligibleForGold:false,causalIndependenceCertified:false});
 entries.push({pr:153,line:71,positive:true,originalProvisionalRootCauseGroup:null,
  experimentalProvisionalMechanism:null,identity:'remaining-positive',eligibleForGold:false,causalIndependenceCertified:false});
 for(let i=0;i<12;i++)entries.push({pr:155,line:100+i,positive:false,
  originalProvisionalRootCauseGroup:i===0?'session_ownership_guard':null,
  experimentalProvisionalMechanism:null,identity:'negative_'+i,
  eligibleForGold:false,causalIndependenceCertified:false});
 const prior={schema:'c2-historical-development-causal-evidence-overlay/v1',
  sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
  sourceHistoricalLedgerSha256:hash('ledger'),
  sourceRealJVMReceiptSha256:hash('ten-jvm'),
  historicalIdentitiesPreserved:23,originalWithoutProvisionalMechanism:21,
  newProvisionalAssignmentsSupportedByExecutedJVM:5,remainingWithoutProvisionalMechanism:16,
  stillWithoutIndependentCausalCertification:21,independentCausalFamiliesCertified:0,
  externalGoldLabelsCreated:0,externalSourceReleasePermitted:false,
  detectorPredictionsRead:false,holdoutFrozen:false,precision:null,recall:null,f1:null,sssPlusCertified:false,
  entries};
 prior.overlaySha256=hash(prior);
 const cross={schema:'c2-four-direct-original-kotlin-causal-crosses/v1',
  status:'FOUR_TRUE_SHARED_JVM_REPAIR_PAIRS_NONINTERFERING_LOCAL_NO_CAUSAL_FAMILY_INDEPENDENCE',
  originalSourcePairExperiments:4,realJointKotlinJvmExecutions:16,
  scopedNoninterferencePairs:4,benignControlsFailed:0,totalOriginalSourcePairs:8,
  sourcePairResults:pairs.map(([suite,a,b])=>({suite,identities:[a,b],
    conclusion:'FOUR_JOINT_JVMS_LOCAL_REPAIR_EFFECTS_ORTHOGONAL_GLOBAL_CAUSE_UNCERTIFIED'})),
  unresolvedGlobalCausalIndependence:true,causalFamiliesIndependentlyCertified:0,
  historicalCausalAssignmentsCertifiedClosed:0,externalGoldLabelsCreated:0,
  externalCandidateSourceRead:false,detectorPredictionsRead:false,holdoutFrozen:false,
  precision:null,recall:null,f1:null,sssPlusCertified:false,
  sourceTrialSha256s:[1,2,3,4].map(hash)};
 cross.evidenceSha256=hash(cross);
 return {prior,cross};
}
test('RED: 4 real #212 source identities become provisional without changing historic labels',()=>{
 const result=overlayPr212OnHistorical(fixture());
 assert.equal(result.schema,'c2-pr212-integrated-historical-23-cross-overlay/v1');
 assert.equal(result.historicalIdentityCount,23);
 assert.equal(result.historicalPositives,11);
 assert.equal(result.historicalNegatives,12);
 assert.equal(result.additionalExperimentallyGroupedPositives,4);
 assert.equal(result.previouslyUngrouped,16);
 assert.equal(result.remainingUngrouped,12);
 assert.equal(result.independentCausalAssignmentsStillPending,21);
 assert.equal(result.verifiedIndependentCausalFamilies,0);
 assert.equal(result.externalGoldLabelsCreated,0);
 assert.equal(result.candidateSourceRead,false);
 assert.equal(result.holdoutFrozen,false);
 assert.equal(result.precision,null);
 assert.equal(result.sssPlusCertified,false);
 assert.match(result.overlaySha256,/^[a-f0-9]{64}$/);
});
test('RED: reject source identity drift, null safety promotions and forged causal family certification',()=>{
 const bad=[
 x=>x.prior.entries[0].blobSha='a'.repeat(40),
 x=>x.prior.entries[0].positive=false,
 x=>x.prior.entries[0].experimentalProvisionalMechanism='INDEPENDENT',
 x=>x.prior.entries[4].eligibleForGold=true,
 x=>x.prior.entries[15].positive=true,
 x=>x.prior.historicalIdentitiesPreserved=24,
 x=>x.prior.overlaySha256='0'.repeat(64),
 x=>x.cross.realJointKotlinJvmExecutions=15,
 x=>x.cross.sourcePairResults[0].identities.reverse(),
 x=>x.cross.sourcePairResults[2].conclusion='CERTIFIED',
 x=>x.cross.evidenceSha256='f'.repeat(64),
 x=>x.cross.detectorPredictionsRead=true,
 x=>x.cross.causalFamiliesIndependentlyCertified=4
 ];
 for(const mutate of bad){const input=fixture();mutate(input);
  assert.throws(()=>overlayPr212OnHistorical(input),/C2_PR212_OVERLAY_BLOCKED/);
 }
});
