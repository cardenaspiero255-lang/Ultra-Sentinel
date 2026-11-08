'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const {draftBoundedReadProgressRepair}=
 require('../../packages/investigation/bounded-read-progress-repair.cjs');
const {makeUnsafeReadProgressControl}=
 require('../../packages/recovery/bounded-read-progress-functional-judge.cjs');
const {bindPinnedBoundedReadFunctionalEvidence}=
 require('../../packages/recovery/pinned-bounded-read-local-bridge.cjs');
const COMMIT='747c14b5d97750a7b2736968e2d516f02448558d';
const PATH='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStream.kt';
const source=fs.readFileSync(path.join(__dirname,
 '../fixtures/jarvis-bounded-image/BoundedImageInputStream.kt'),'utf8');
const draft=draftBoundedReadProgressRepair({expectedCommitSha:COMMIT,
 file:{path:PATH,source,expectedBlobSha:blobSha(source)}});
const candidateSource=draft.candidateSource;
const unsafeSource=makeUnsafeReadProgressControl(candidateSource);
function outcomes(){return {
 original:{oracleExit:1,oracleLog:'ZERO_PROGRESS_ACCEPTED\n',junitExit:0,junitLog:'OK (6 tests)\n'},
 candidate:{oracleExit:0,oracleLog:'READ_PROGRESS_ORACLE_PASS\n',junitExit:0,junitLog:'OK (6 tests)\n'},
 unsafe:{oracleExit:1,oracleLog:'BENIGN_READ_REJECTED\n',junitExit:1,junitLog:'FAILURES!!!\n'}
};}
function input(){return {source,candidateSource,unsafeSource,results:outcomes()};}
test('binds same pinned Fixer candidate to functional RED GREEN veto and exact local rollback',()=>{
 const res=bindPinnedBoundedReadFunctionalEvidence(input());
 assert.equal(res.status,'PINNED_FIXER_LOCAL_FUNCTIONAL_JUDGE_MATCHED_UNATTESTED');
 assert.equal(res.sourceBlobSha,blobSha(source));
 assert.equal(res.candidateBlobSha,blobSha(candidateSource));
 assert.equal(res.functionalEvidenceConsistent,true);
 assert.equal(res.unsafeCandidateRejected,true);
 assert.equal(res.localGitRollbackVerified,true);
 assert.equal(res.originalJVMExecutionAuthenticated,false);
 assert.equal(res.remoteRepositoryAuthenticated,false);
 assert.equal(res.remoteWrites,false);
 assert.equal(res.mergeAllowed,false);
});
test('rejects modified candidate, altered original, wrong unsafe control and forged JVM evidence',()=>{
 const variations=[
  x=>{x.source+='// forged\n';},
  x=>{x.candidateSource=x.unsafeSource;},
  x=>{x.unsafeSource=x.candidateSource;},
  x=>{x.results.original.oracleExit=0;},
  x=>{x.results.candidate.junitLog='OK (5 tests)\n';},
  x=>{x.results.unsafe.oracleExit=0;},
  x=>{x.results.unsafe.junitExit=0;},
  x=>{x.results.unsafe.junitLog='OK (6 tests)\n';}
 ];
 for(const mutate of variations){
  const payload=input();mutate(payload);
  const outcome=bindPinnedBoundedReadFunctionalEvidence(payload);
  assert.match(outcome.status,/^BLOCKED_/,outcome.status);
  assert.equal(outcome.localGitRollbackVerified,false);
  assert.equal(outcome.remoteWrites,false);
 }
});
test('rejects getters and proxies at root or nested JVM evidence without executing attacker code',()=>{
 let invoked=0;
 const bad=()=>{invoked++;throw Error('UNTRUSTED_GETTER');};
 for(const level of ['root','results','nested']){
  const payload=input();
  if(level==='root')Object.defineProperty(payload,'source',{get:bad,enumerable:true});
  if(level==='results')Object.defineProperty(payload,'results',{get:bad,enumerable:true});
  if(level==='nested')Object.defineProperty(payload.results.candidate,'oracleExit',{get:bad,enumerable:true});
  assert.match(bindPinnedBoundedReadFunctionalEvidence(payload).status,/^BLOCKED_/);
 }
 const proxied=new Proxy(input(),{get(){invoked++;throw Error('UNTRUSTED_PROXY');}});
 assert.match(bindPinnedBoundedReadFunctionalEvidence(proxied).status,/^BLOCKED_/);
 assert.equal(invoked,0);
});
