'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {rankPool155,remainingCandidates155}=require('../../packages/quality-gates/c2-155-integrity-first-ranker.cjs');
const {assessOneShotAdmission}=require('../../packages/quality-gates/c2-one-shot-111-admission.cjs');
const root='../../docs/quality/';
const prereg={
 roster:require(root+'C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json'),
 eight:require(root+'C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json'),
 dispositions:[
 require(root+'C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json'),
 require(root+'C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json'),
 require(root+'C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024.json')],
 nextcloud:require(root+'C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024.json'),
 excluded:[
 require(root+'C2-NEXTCLOUD-TALK6946-AUTHENTICATED-DISPOSITION-20261024.json'),
 require(root+'C2-NEXTCLOUD6945-POSTSOURCE-20261024.json')]
};
const mk=(c,files=[],status='API_ERROR')=>({
 repository:c.repository,pr:c.pr,baseSha:c.baseSha,headSha:c.headSha,createdAt:c.createdAt,status,files
});
const metadata=(path)=>({filename:path,status:'modified',sha:'f'.repeat(40),additions:3,deletions:1,changes:4});
const build=()=>rankPool155({...prereg,observations:remainingCandidates155(prereg).map(c=>mk(c))});
test('RED: one run organizes all 155, zero source reads, zero fabricated GOLD, 111 deficit',()=>{
 const r=assessOneShotAdmission(build());
 assert.equal(r.status,'BLOCKED_NO_RULE_ADMISSIBLE_SOURCE');
 assert.equal(r.sourceCandidates,155);
 assert.equal(r.totalBatchShards,32);
 assert.equal(r.previousDocumentedLabels,9);
 assert.equal(r.newGoldLabels,0);
 assert.equal(r.documentedLabelTotal,9);
 assert.equal(r.missingAuthenticLabels,111);
 assert.equal(r.authorizedSourceReads,0);
 assert.equal(r.originalFixBenignExecuted,0);
 assert.equal(r.truthSealed,false);
 assert.equal(r.detectorPredictionsRead,false);
 assert.equal(r.baselinePredictionsRead,false);
 assert.equal(r.candidateSourceInspected,false);
 assert.equal(r.autoGoldAdmissionAllowed,false);
 assert.equal(r.sssPlusCertified,false);
 assert.equal(r.shards.reduce((sum,s)=>sum+s.candidates.length,0),155);
 assert.equal(r.metadataRetryCount,155);
});
test('RED: plausible filename does not become release or GOLD without separate authenticated owner gate',()=>{
 const items=remainingCandidates155(prereg);
 const observations=items.map(c=>mk(c));
 observations[0]=mk(items[0],[metadata('app/src/main/java/example/coroutines/CoroutineScopeManager.kt')],'MATCHED');
 const input=rankPool155({...prereg,observations});
 const r=assessOneShotAdmission(input);
 assert.equal(r.mechanismHinted,1);
 assert.equal(r.ownerReleaseEligibleAutomatically,0);
 assert.equal(r.authorizedSourceReads,0);
 assert.equal(r.newGoldLabels,0);
 assert.equal(r.ownerGateRequiredCount,1);
 assert.equal(r.shards.reduce((n,s)=>n+s.candidates.length,0),155);
});
test('RED: detect forged output counts, fake GOLD, source access and omitted observations',()=>{
 const original=build();
 const checks=[
 x=>x.newGoldLabels=111,
 x=>x.truthSealed=true,
 x=>x.sourceReadAuthorized=true,
 x=>x.originalOracleExecuted=true,
 x=>x.shortlist=[{candidate:{repository:'untrusted/example',pr:1},rankScore:100}],
 x=>x.observations.pop(),
 x=>x.candidatesExamined=156,
 x=>x.candidatePredictionsRead=true,
 x=>x.observations[0].candidate.headSha='0'.repeat(40),
 ];
 for(const mutate of checks){
  const x=JSON.parse(JSON.stringify(original));mutate(x);
  assert.throws(()=>assessOneShotAdmission(x),/C2_ONE_SHOT_ADMISSION_BLOCKED/);
 }
});
test('RED: existing corpus never provides a source-release permit in this batch',()=>{
 const r=assessOneShotAdmission(build());
 assert.deepEqual(r.ownerReleasePermitArtifacts,[]);
 assert.deepEqual(r.externalOracleReceipts,[]);
 assert.equal(r.originalOracleAuthenticated,false);
 assert.equal(r.causalIndependenceCertified,false);
 assert.equal(r.candidateSourceInspected,false);
 assert.equal(r.sourcePreviouslyExposed,14);
 assert.equal(r.originalProspectivePool,169);
});
