'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {assessSourceOnlyObservation}=require('../../packages/quality-gates/c2-tasks-source-only-observation.cjs');
const {attestTasksExternalDevelopmentWitness}=require('../../packages/quality-gates/c2-external-original-attestor.cjs');
const H='3936c221aea180b795085d7402286373b5d3f6d2';
const B='0e472cfd73510ab11a396ee5eba9968d57172050';
const ROOT='app/src/main/java/org/tasks/notifications/Throttle.kt';
const hash=x=>createHash('sha256').update(x).digest('hex');
const runtime=()=>({
 schema:'c2-tasks-throttle-external-jvm/v1',
 productionSourceExecuted:true,executorThreadIsNotCaller:true,
 callerReturnedBeforeWorkerCompletion:true,secondCallbackOnExecutorThread:true,
 defaultSleeperElapsedMillis:350,allTasksComplete:true,
 abiStubsForAndroidAndCoroutine:true,
 counterfactualSameOriginalProductionSource:true,
 counterfactualExecutedOnCaller:true,counterfactualCompletedSynchronously:true,
 independentOriginalTruth:false
});
function input(){
 const bytes=Buffer.from(JSON.stringify(runtime())+'\n');
 const sourceContentSha256='e'.repeat(64);
 return {
  originalWorkerBytes:bytes,
  producerReport:{
   ...assessSourceOnlyObservation(runtime()),
   sourceRepository:'tasks/tasks',originalHeadSha:H,
   originalBaseSha:'5624816cac6ecab701969d24e6d3387ccd21a773',
   originalSourcePath:ROOT,originalSourceGitBlob:B,
   originalSourceContentSha256:sourceContentSha256,
   runtimeWitnessSha256:hash(bytes),
   originalSourceVerifiedByGitInThisProcess:true,
   runtimeExecutionAuthenticatedByThisProcess:false,
   originalSourceIncludedInArtifact:false,
   trainingExcludedAsKnownDevelopment:true
  },
  independentUpstream:{
   repository:'tasks/tasks',headSha:H,
   path:ROOT,gitBlobSha:B,
   sourceSha256:sourceContentSha256,
   commitAncestorChecked:true,
   sourceFetchedFromPinnedGit:true
  }
 };
}
test('known real external Tasks source witness can be re-attested without becoming GOLD',()=>{
 const x=attestTasksExternalDevelopmentWitness(input());
 assert.equal(x.status,'KNOWN_EXTERNAL_DEVELOPMENT_SOURCE_WITNESS_BYTES_VERIFIED');
 assert.equal(x.repository,'tasks/tasks');
 assert.equal(x.ruleId,'BLOCKING_ANDROID_CALL');
 assert.equal(x.originalWorkerDigestVerified,true);
 assert.equal(x.sourceDigestCrossChecked,true);
 assert.equal(x.externalPrNumber,null);
 assert.equal(x.originalPrIdentityAuthenticated,false);
 assert.equal(Object.hasOwn(x,'originalPRIdentityAuthenticated'),false);
 assert.equal(x.candidatePredictionsRead,false);
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.remaining,111);
 assert.equal(x.truthSealed,false);
 assert.equal(x.tripleSPlusCertified,false);
});
test('any tampering to worker bytes, witness digests or source git identity fails closed',()=>{
 const basic=input();
 for(const alter of [
  x=>{x.originalWorkerBytes=Buffer.from('{"tainted":true}')},
  x=>{x.producerReport.runtimeWitnessSha256='f'.repeat(64)},
  x=>{x.producerReport.originalHeadSha='f'.repeat(40)},
  x=>{x.producerReport.originalSourceGitBlob='f'.repeat(40)},
  x=>{x.independentUpstream.sourceSha256='a'.repeat(64)},
  x=>{x.independentUpstream.commitAncestorChecked=false},
  x=>{x.independentUpstream.sourceFetchedFromPinnedGit=false},
  x=>{x.independentUpstream.gitBlobSha='f'.repeat(40)},
 ]) {
  const x=input();alter(x);
  assert.throws(()=>attestTasksExternalDevelopmentWitness(x),/C2_EXTERNAL_SOURCE_ATTESTATION_BLOCKED/);
 }
});
test('rejects fake positives, external PR association, prediction exposure and counterfeit source status',()=>{
 for(const bad of [
  x=>{x.producerReport.newGoldLabels=1},
  x=>{x.producerReport.candidatePredictionsRead=true},
  x=>{x.producerReport.falsePositiveIndependentlyCertified=true},
  x=>{x.producerReport.trainingExcludedAsKnownDevelopment=false},
  x=>{x.producerReport.sourceRepository='nextcloud/talk-android'},
  x=>{x.originalWorkerBytes=Buffer.from('[]')},
  x=>{x.independentUpstream.externalPrNumber=99},
  x=>{x.producerReport.independentProspectiveTruthAttested=true},
 ]) {
  const x=input();bad(x);
  assert.throws(()=>attestTasksExternalDevelopmentWitness(x),/C2_EXTERNAL_SOURCE_ATTESTATION_BLOCKED/);
 }
});
test('rejects source scope changes and corrupted runtime claims even with recomputed hashes',()=>{
 const x=input();
 const edited={...runtime(),executorThreadIsNotCaller:false};
 x.originalWorkerBytes=Buffer.from(JSON.stringify(edited)+'\n');
 x.producerReport.runtimeWitnessSha256=hash(x.originalWorkerBytes);
 assert.throws(()=>attestTasksExternalDevelopmentWitness(x),/C2_EXTERNAL_SOURCE_ATTESTATION_BLOCKED/);
});
