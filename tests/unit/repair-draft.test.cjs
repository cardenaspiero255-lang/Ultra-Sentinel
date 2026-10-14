'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {stageRepairDraft}=require('../../packages/recovery/repair-draft.cjs');
const repo='cardenaspiero255-lang/gamehub-ultra',sha='a'.repeat(40),before='b'.repeat(40),after='c'.repeat(40);
const at=Date.parse('2026-10-14T19:00:00Z');
const path='app/src/main/java/com/example/Engine.kt';
const approval={schemaVersion:1,mode:'REPAIR_COMMITS_AUTHORIZED',repository:repo,
 prNumber:201,headSha:sha,actor:'human-owner',scope:[path],
 expiresAt:'2026-10-14T19:05:00Z',nonce:'noncerepair123456789',
 budget:{maxCommits:1,maxCiRuns:3,maxDurationSeconds:900,maxFilesChanged:1,maxPatchBytes:1024}};
const change={path,beforeBlobSha:before,afterBlobSha:after,patchBytes:512};
const call=overrides=>stageRepairDraft({authorization:approval,prNumber:201,expectedHeadSha:sha,changes:[change],now:at,...overrides});
test('bounded request produces no real execution privilege',()=>{
 const r=call({});
 assert.equal(r.status,'REVIEW_READY_NO_EXECUTOR');
 assert.equal(r.commitAllowed,false);assert.equal(r.mergeAllowed,false);
 assert.equal(r.executionGranted,false);assert.ok(Object.isFrozen(r.changes));
});
test('schema, actor scope, SHA or expiry cannot authorize changes',()=>{
 assert.equal(call({authorization:{...approval,headSha:before}}).status,'WRONG_TARGET_OR_SHA');
 assert.equal(call({authorization:{...approval,actor:''}}).status,'INVALID_AUTHORIZATION_SCHEMA');
 assert.equal(call({now:at+360000}).status,'EXPIRED_OR_UNBOUNDED_APPROVAL');
 assert.equal(call({prNumber:202}).status,'WRONG_TARGET_OR_SHA');
});
test('cross-directory paths, traversal and SHA mismatch are rejected',()=>{
 for(const bad of ['.github/workflows/ci.yml','app/src/main/../unsafe.kt','/app/src/main/abc.kt']){
  const r=call({changes:[{...change,path:bad}]});
  assert.equal(r.status,'UNTRUSTED_PATCH_TARGET');
 }
 assert.equal(call({changes:[{...change,beforeBlobSha:after}]}).status,'UNTRUSTED_PATCH_TARGET');
 assert.equal(call({changes:[{...change,patchBytes:2048}]}).status,'PATCH_BUDGET_EXCEEDED');
});
test('duplicate files, missing blob hashes and extra fields fail conservatively',()=>{
 const double=call({changes:[change,change]});
 assert.equal(double.status,'PATCH_BUDGET_EXCEEDED');
 assert.equal(call({changes:[{...change,afterBlobSha:'bad'}]}).status,'UNTRUSTED_PATCH_TARGET');
 assert.equal(call({authorization:{...approval,unaudited:true}}).status,'INVALID_AUTHORIZATION_SCHEMA');
});
