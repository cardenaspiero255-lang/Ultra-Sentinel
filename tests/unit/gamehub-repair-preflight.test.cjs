'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {preflightRepair,approvedPath,REPO}=require('../../adapters/gamehub/ultra_sentinel_repair_authorization.cjs');
const SHA='a'.repeat(40),BAD='b'.repeat(40);
const context=()=>({repository:REPO,headRepo:REPO,number:200,headSha:SHA,draft:false,
 changedFiles:2,files:['app/src/main/java/voice/Ultra.kt','app/src/test/UltraTest.kt'],
 checkInventoryComplete:true,requiredChecks:['Android build','Ultra Sentinel Core Tests'],
 checks:[{name:'Android build',sha:SHA,status:'completed',conclusion:'success'},
 {name:'Ultra Sentinel Core Tests',sha:SHA,status:'completed',conclusion:'success'}],
 now:2000000});
const verified=async()=>({repository:REPO,prNumber:200,sha:SHA,actor:'cardenaspiero255-lang',
 scope:'repair:commit-to-pr-branch',signedApprovalVerified:true,
 independentReviewVerified:true,nonceUnused:true,issuedAt:1999000});
test('RED migration #200: a trusted external attestation only permits manual handoff',async()=>{
 const r=await preflightRepair(context(),verified);
 assert.equal(r.status,'ELIGIBLE_FOR_HUMAN_COMMIT');
 assert.equal(r.autoCommitAllowed,false);assert.equal(r.autoMergeAllowed,false);
 assert.equal(r.manualCommitRequired,true);
});
test('fail closed without an external verifier or if it throws',async()=>{
 for(const auth of [null,async()=>{throw Error('not trusted')},async()=>null]){
  const r=await preflightRepair(context(),auth);
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.autoCommitAllowed,false);
 }
});
test('reject stale identity, SHA, review, replay, wrong target and time window',async()=>{
 const valid=await verified();
 for(const changed of [
 {...valid,actor:'intruder'}, {...valid,sha:BAD}, {...valid,signedApprovalVerified:false},
 {...valid,independentReviewVerified:false},{...valid,nonceUnused:false},
 {...valid,issuedAt:1},{...valid,issuedAt:2000001},
 {...valid,scope:'repair:merge-to-main'}
 ])assert.equal((await preflightRepair(context(),async()=>changed)).status,'BLOCKED');
});
test('reject incomplete or duplicate required checks and any pending failure',async()=>{
 for(const change of [
 {headSha:BAD},{checkInventoryComplete:false},{draft:true},{headRepo:'intruder/fork'},
 {changedFiles:3},{requiredChecks:[]},
 {checks:[{name:'Android build',sha:SHA,status:'queued',conclusion:null}]},
 {checks:[{name:'Android build',sha:SHA,status:'completed',conclusion:'success'},
 {name:'Android build',sha:SHA,status:'completed',conclusion:'success'}]}
 ])assert.equal((await preflightRepair({...context(),...change},verified)).status,'BLOCKED');
});
test('strictly exclude workflow, manifest, symlink-shaped and Gradle targets',()=>{
 assert.equal(approvedPath('app/src/main/java/voice/Ultra.kt'),true);
 for(const path of ['.github/workflows/ci.yml','app/src/main/AndroidManifest.xml',
  'app/build.gradle.kts','app/src/main/java/../../config.kt',
  '/app/src/main/java/Unsafe.kt','app/src/main/java\\bad.kt']){
  assert.equal(approvedPath(path),false,path);
 }
});
