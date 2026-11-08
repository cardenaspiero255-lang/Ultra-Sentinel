'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const {draftBoundedReadProgressRepair}=
 require('../../packages/investigation/bounded-read-progress-repair.cjs');
const {assessPhaseOneCase}=
 require('../../packages/recovery/phase1-same-case-evidence-gate.cjs');
const HEAD='747c14b5d97750a7b2736968e2d516f02448558d';
const FILE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStream.kt';
const ORIGINAL=fs.readFileSync(path.join(__dirname,
 '../fixtures/jarvis-bounded-image/BoundedImageInputStream.kt'),'utf8');
function candidate(source=ORIGINAL){
 return draftBoundedReadProgressRepair({expectedCommitSha:HEAD,
  file:{path:FILE,source,expectedBlobSha:blobSha(source)}});
}
function envelope(source=ORIGINAL){
 const draft=candidate(source);
 return {expectedCommitSha:HEAD,
  files:[{path:FILE,source,expectedBlobSha:blobSha(source)}],
  proposals:[{path:FILE,rule:draft.rule,candidateSource:draft.candidateSource,
   expectedCandidateBlobSha:draft.candidateBlobSha}],
  localEvidence:[{path:FILE,rule:draft.rule,originalBlobSha:blobSha(source),
   candidateBlobSha:draft.candidateBlobSha}]};
}
test('same-case gate reruns Hunter Fixer intake and actual disposable local Judge',()=>{
 const result=assessPhaseOneCase(envelope());
 assert.equal(result.status,'LOCAL_HISTORICAL_CASE_VERIFIED_NOT_PHASE_ONE_CLOSED');
 assert.equal(result.checkedCases,1);
 assert.equal(result.sourceAndCandidateLinked,true);
 assert.equal(result.localGitRollbackVerified,true);
 assert.equal(result.historicalSourceCase,true);
 assert.equal(result.originalJVMExecutionAuthenticated,false);
 assert.equal(result.independentCausalityVerified,false);
 assert.equal(result.novelCaseProven,false);
 assert.equal(result.phaseOneClosed,false);
 assert.equal(result.remoteWrites,false);
 assert.equal(result.mergeAllowed,false);
});
test('a novel-looking renamed input is local-only and never qualifies as proved novelty',()=>{
 const changed=ORIGINAL.replace(/\bactual\b/g,'got').replace(/\ballowed\b/g,'budget');
 const result=assessPhaseOneCase(envelope(changed));
 assert.equal(result.status,'LOCAL_UNREGISTERED_CASE_REQUIRES_TRUSTED_ORIGINAL_ORACLE');
 assert.equal(result.checkedCases,1);
 assert.equal(result.sourceAndCandidateLinked,true);
 assert.equal(result.localGitRollbackVerified,true);
 assert.equal(result.historicalSourceCase,false);
 assert.equal(result.novelCaseProven,false);
 assert.equal(result.phaseOneClosed,false);
});
test('crossed blobs, mismatched family and changed candidate fail closed before any success',()=>{
 for(const modify of [
  x=>{x.localEvidence[0].candidateBlobSha='0'.repeat(40);},
  x=>{x.localEvidence[0].originalBlobSha='1'.repeat(40);},
  x=>{x.localEvidence[0].rule='OTHER_RULE';},
  x=>{x.localEvidence[0].path='app/src/main/java/Other.kt';},
  x=>{x.proposals[0].candidateSource=ORIGINAL;},
  x=>{x.files[0].source+='//changed\n';},
  x=>{x.localEvidence.push({...x.localEvidence[0]});}
 ]){
  const x=envelope();modify(x);
  const result=assessPhaseOneCase(x);
  assert.match(result.status,/^BLOCKED_/,result.status);
  assert.equal(result.phaseOneClosed,false);
  assert.equal(result.localGitRollbackVerified,false);
 }
});
test('claims of execution, novelty or authorization cannot be smuggled into receipts',()=>{
 for(const key of ['novelCaseProven','remoteWrites','ownerAuthorized','originalJVMExecutionAuthenticated']){
  const x=envelope();x[key]=true;
  const result=assessPhaseOneCase(x);
  assert.match(result.status,/^BLOCKED_/);
  assert.equal(result.phaseOneClosed,false);
 }
});
test('getter, Proxy and custom array iterator inputs are inert and vetoed',()=>{
 let invoked=0;
 const evil=()=>{invoked++;throw Error('EXTERNAL_EXECUTION');};
 for(const kind of ['root','nested','receipt','array','proxy','iterator']){
  const x=envelope();
  if(kind==='root')Object.defineProperty(x,'files',{enumerable:true,get:evil});
  if(kind==='nested')Object.defineProperty(x.files[0],'source',{enumerable:true,get:evil});
  if(kind==='receipt')Object.defineProperty(x.localEvidence[0],'candidateBlobSha',{enumerable:true,get:evil});
  if(kind==='array')Object.defineProperty(x.proposals,'0',{get:evil});
  if(kind==='proxy')x.files[0]=new Proxy(x.files[0],{get:evil,ownKeys:evil,getPrototypeOf:evil});
  if(kind==='iterator')x.files[Symbol.iterator]=evil;
  const result=assessPhaseOneCase(x);
  assert.match(result.status,/^BLOCKED_/,kind);
  assert.equal(result.phaseOneClosed,false);
 }
 assert.equal(invoked,0);
});
