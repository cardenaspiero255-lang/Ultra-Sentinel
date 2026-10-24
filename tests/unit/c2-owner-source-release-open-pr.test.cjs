'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const exposure=require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const request=require('../../docs/quality/C2-OWNER-ONE-PR-SOURCE-RELEASE-BITWARDEN7499-20261024.json');
const {validateOwnerRelease}=require('../../packages/quality-gates/c2-owner-source-release.cjs');
const c=request.candidate;
const trusted={repositoryId:1418338512,actorId:322222186,ref:'refs/heads/main',eventName:'push',headCommit:'e'.repeat(40)};
const api={number:c.pr,created_at:c.createdAt,state:'open',base:{sha:c.baseSha,repo:{full_name:c.repository}},head:{sha:c.headSha}};
test('owner source inspection allows exact still-open public PR only on protected main, never a verified fix',()=>{
 const x=validateOwnerRelease({roster,exposures:exposure,request,api,event:trusted});
 assert.equal(x.sourceReadPermitted,true);
 assert.equal(x.truthSealed,false);
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.originalGithubGitProvenanceAuthenticated,false);
});
test('open PR head/base drift, unauthorized actor, invalid status or forged source permission fails closed',()=>{
 for(const [event,pr] of [
  [{...trusted,actorId:199175422},api],
  [trusted,{...api,head:{sha:'a'.repeat(40)}}],
  [trusted,{...api,base:{...api.base,sha:'a'.repeat(40)}}],
  [trusted,{...api,state:'draft'}],
  [trusted,{...api,state:'garbage'}]
 ])assert.throws(()=>validateOwnerRelease({roster,exposures:exposure,request,api:pr,event}),/C2_OWNER_SOURCE_RELEASE_BLOCKED/);
});
