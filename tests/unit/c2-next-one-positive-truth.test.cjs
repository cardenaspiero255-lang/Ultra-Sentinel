'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {sealNextSourceTruth,WITNESS_SHA256}=require('../../packages/quality-gates/c2-next-one-positive-truth.cjs');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const packet=()=>({
 schema:'ultra-sentinel-c2-next-holdout-freeze/v1',
 status:'FROZEN_INPUT_ONLY',repository:NEW_LOCK.repository,
 engineSourceSha:NEW_LOCK.engineSourceSha,
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 cases:NEW_LOCK.cases.map(x=>({...x})),
 knownCaseTrainingOverlap:0,currentFindingsCount:0,labelsVerified:0,
 candidateInspected:false,truthLabelsInspected:false,baselineInspected:false,
 precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
 tripleSPlusCertified:false,canMerge:false,canRepair:false,
 limitations:'Eight PR identities are preregistered; no blind defects or negatives have yet been validated. Compare a fixed baseline and candidate only AFTER technical ground-truth oracles are frozen. This is not certification.'
});
const witness=()=>({
 schema:'ultra-sentinel-c2-next-original-pr153-rollback-witness/v1',
 pr:153,sourceGitBlob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',
 rule:'PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE',line:71,
 normalSuccessControlPassed:true,prewriteFailureControlPassed:true,
 failureAfterHandledReproduced:true,replayProfileStateDiverged:true,
 idempotentHandledControlPassed:true,reproduced:true,
 candidateInspected:false,baselineCompared:false,
 negativeFindingLabelsEstablished:0,precision:null,recall:null,f1:null,
 tripleSPlusCertified:false
});
test('new independent original-source defect seals as ONE potential positive without FP claims',()=>{
 const r=sealNextSourceTruth({freeze:packet(),witness:witness()});
 assert.equal(r.status,'SOURCE_BEHAVIOR_TRUTH_PARTIAL');
 assert.equal(r.sourcePositiveLabels,1);
 assert.equal(r.verifiedNegativeFindingLabels,0);
 assert.equal(r.benchmarkScoredLabels,0);
 assert.equal(r.labels.length,1);
 assert.deepEqual(r.labels[0],{
  pr:153,headSha:'6508cc124076b9dea437ea1efc213d3ce55d7baf',
  blobSha:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',
  rule:'PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/PerGameAdaptiveRuntime.kt',
  line:71,positive:true
 });
 assert.equal(r.includesPredictions,false);
 assert.equal(r.includesBaseline,false);
 assert.equal(r.precision,null);assert.equal(r.recall,null);assert.equal(r.f1,null);
 assert.equal(r.fpNonRegressionVerified,false);assert.equal(r.tripleSPlusCertified,false);
 assert.match(r.sealedTruthDigest,/^[0-9a-f]{64}$/);
 assert.deepEqual(r,sealNextSourceTruth({freeze:packet(),witness:witness()}));
});
test('reject coerced controls, unsupported labels, changed original SHA or model comparison',()=>{
 const muts=[
  z=>z.freeze.engineSourceSha='f'.repeat(40),
  z=>z.freeze.packetDigest='f'.repeat(64),
  z=>z.freeze.labelsVerified=1,
  z=>z.freeze.currentFindingsCount=1,
  z=>z.freeze.candidateInspected=true,
  z=>z.freeze.cases[3].headSha='f'.repeat(40),
  z=>z.freeze.cases[3].baseSha='f'.repeat(40),
  z=>z.witness.sourceGitBlob='f'.repeat(40),
  z=>z.witness.pr=152,
  z=>z.witness.line=72,
  z=>z.witness.reproduced=false,
  z=>z.witness.replayProfileStateDiverged=false,
  z=>z.witness.normalSuccessControlPassed=false,
  z=>z.witness.negativeFindingLabelsEstablished=9,
  z=>z.witness.candidateInspected=true,
  z=>z.witness.baselineCompared=true,
  z=>z.witness.extraLabels=[]
 ];
 for(const mutate of muts){const x={freeze:packet(),witness:witness()};mutate(x);
  assert.throws(()=>sealNextSourceTruth(x),/C2_NEXT_TRUTH_UNVERIFIED/);
 }
});
test('witness exact JSON bytes pinned independently of model predictions',()=>{
 assert.equal(WITNESS_SHA256,'a3e3d28a8bf3d4b0a59541efd96f698002deea355ec35dd8e17e5662a9830cba');
});
