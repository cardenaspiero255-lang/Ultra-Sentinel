'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const exposures=require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const request=require('../../docs/quality/C2-OWNER-ONE-PR-SOURCE-RELEASE-20261024.json');
const {validateOwnerRelease,verifySourceFileScope}=require('../../packages/quality-gates/c2-owner-source-release.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
const candidate=request.candidate;
const api={
 number:candidate.pr,created_at:candidate.createdAt,
 base:{sha:candidate.baseSha,repo:{full_name:candidate.repository}},
 head:{sha:candidate.headSha},
 state:'closed'
};
const event={repositoryId:1418338512,actorId:322222186,ref:'refs/heads/main',eventName:'push',headCommit:'a'.repeat(40)};
test('owner-only GitHub actor + immutable PR identity grants source READ only, not truth or scoring',()=>{
 const r=validateOwnerRelease({roster,exposures,request,api,event});
 assert.equal(r.status,'OWNER_AUTHENTICATED_SOURCE_READ_ONLY');
 assert.equal(r.sourceReadPermitted,true);
 assert.equal(r.sourceExecuted,false);
 assert.equal(r.causalIndependenceCertified,false);
 assert.equal(r.trainingIndependenceCertified,false);
 assert.equal(r.truthSealed,false);
 assert.equal(r.newGoldLabels,0);
 assert.equal(r.precision,null);
 assert.equal(r.detectorPredictionsRead,false);
 assert.equal(r.candidate.repository,candidate.repository);
 assert.equal(r.candidate.headSha,candidate.headSha);
 assert.match(r.requestDigestSha256,/^[0-9a-f]{64}$/);
});
test('every reused or altered source/release permission fails CLOSED',()=>{
 for(const invalid of [
  [{...event,actorId:2},api,request,exposures],
  [{...event,ref:'refs/heads/dev'},api,request,exposures],
  [{...event,eventName:'pull_request'},api,request,exposures],
  [event,{...api,head:{sha:'b'.repeat(40)}},request,exposures],
  [event,{...api,base:{...api.base,sha:'b'.repeat(40)}},request,exposures],
  [event,{...api,created_at:'2026-10-20T00:00:00Z'},request,exposures],
  [event,api,{...request,ownerApproval:'YES'},exposures],
  [event,api,{...request,newGoldLabels:1},exposures],
  [event,api,{...request,truthSealed:true},exposures],
  [event,api,{...request,candidatePredictionsRead:true},exposures],
  [event,api,{...request,privateToken:'do_not_grant'},exposures],
  [event,api,{...request,candidate:{...candidate,pr:23430}},exposures],
  [event,api,request,{...exposures,disclosures:[...exposures.disclosures,{repository:candidate.repository,pr:candidate.pr,reason:'ALREADY_READ'}]}]
 ]) assert.throws(()=>validateOwnerRelease({roster,exposures:invalid[3],request:invalid[2],api:invalid[1],event:invalid[0]}),/C2_OWNER_SOURCE_RELEASE_BLOCKED/);
});
test('source scope is separate: exact changed-file git blob metadata, no runnable code, no inferred rule',()=>{
 const auth=validateOwnerRelease({roster,exposures,request,api,event});
 const result=verifySourceFileScope(auth,[{filename:'app/src/main/kotlin/Example.kt',status:'modified',sha:'b'.repeat(40),additions:1,deletions:1,changes:2}]);
 assert.equal(result.changedFiles,1);
 assert.equal(result.ruleCompatibilityAuthenticated,false);
 assert.equal(result.sourceOracleAuthenticated,false);
 assert.equal(result.truthSealed,false);
 assert.equal(result.newGoldLabels,0);
});
test('changed-file admission fails closed if partial or invalid, rather than claiming an original oracle',()=>{
 const auth=validateOwnerRelease({roster,exposures,request,api,event});
 for(const files of [[],null,[{filename:'../private',status:'modified',sha:'b'.repeat(40),additions:1,deletions:1,changes:2}],
 [{filename:'Main.kt',status:'modified',sha:'x',additions:1,deletions:1,changes:2}],
 [{filename:'Main.kt',status:'removed',sha:'b'.repeat(40),additions:0,deletions:1,changes:1}],
 [{filename:'Main.kt',status:'modified',sha:'b'.repeat(40),additions:1,deletions:1,changes:2,source:'injected'}]])
 assert.throws(()=>verifySourceFileScope(auth,files),/C2_OWNER_SOURCE_RELEASE_BLOCKED/);
});
