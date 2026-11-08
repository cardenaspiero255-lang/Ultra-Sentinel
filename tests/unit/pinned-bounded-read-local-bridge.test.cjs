'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {draftBoundedReadProgressRepair}=
 require('../../packages/investigation/bounded-read-progress-repair.cjs');
const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const {bindPinnedBoundedReadCandidate}=
 require('../../packages/recovery/pinned-bounded-read-local-bridge.cjs');

const SHA='747c14b5d97750a7b2736968e2d516f02448558d';
const FILE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStream.kt';
const SOURCE=fs.readFileSync(path.join(__dirname,
 '../fixtures/jarvis-bounded-image/BoundedImageInputStream.kt'),'utf8');
const candidate=draftBoundedReadProgressRepair({expectedCommitSha:SHA,
 file:{path:FILE,source:SOURCE,expectedBlobSha:blobSha(SOURCE)}}).candidateSource;

test('pinned original bytes match the generated Fixer candidate without claiming a JVM oracle or rollback',()=>{
 const r=bindPinnedBoundedReadCandidate({source:SOURCE,candidateSource:candidate});
 assert.equal(r.status,'PINNED_LOCAL_FIXER_CANDIDATE_MATCHED_NOT_JVM_ATTESTED');
 assert.equal(r.originalBlobSha,'fd061b9dad636684184ccf2e96f87084d3b99df5');
 assert.equal(r.candidateBlobSha,blobSha(candidate));
 assert.equal(r.localGitRollbackVerified,false);
 assert.equal(r.sourcePinnedBytesMatched,true);
 assert.equal(r.fixerCandidateGenerationVerified,true);
 assert.equal(r.originalJVMExecutionAuthenticated,false);
 assert.equal(r.externalRepositoryAuthenticated,false);
 assert.equal(r.causalityVerified,false);
 assert.equal(r.remoteWrites,false);
 assert.equal(r.mergeAllowed,false);
});
test('rejects altered original and alternate unsafe or suppressed-fix candidates',()=>{
 for(const input of [
  {source:SOURCE+'// altered\n',candidateSource:candidate},
  {source:SOURCE,candidateSource:SOURCE},
  {source:SOURCE,candidateSource:candidate.replace('actual == 0','true')},
  {source:SOURCE,candidateSource:'class Fake {}\n'}
 ]){
  const r=bindPinnedBoundedReadCandidate(input);
  assert.match(r.status,/^BLOCKED_/);
  assert.equal(r.localGitRollbackVerified,false);
  assert.equal(r.remoteWrites,false);
  assert.equal(r.mergeAllowed,false);
 }
});
test('rejects malicious getters and proxies without executing caller code',()=>{
 let invoked=0;
 const bad=()=>{invoked++;throw Error('executed');};
 const x={source:SOURCE,candidateSource:candidate};
 Object.defineProperty(x,'source',{enumerable:true,get:bad});
 assert.match(bindPinnedBoundedReadCandidate(x).status,/^BLOCKED_/);
 assert.match(bindPinnedBoundedReadCandidate(new Proxy({source:SOURCE,candidateSource:candidate},{
  get(){invoked++;throw Error('executed');}
 })).status,/^BLOCKED_/);
 assert.equal(invoked,0);
});
