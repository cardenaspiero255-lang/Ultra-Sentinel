'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const {scanAndDraftAnchoredRegexCase}=
 require('../../packages/investigation/external-kotlin-anchored-regex-case.cjs');
const {drillOneSourceKotlinSandbox}=
 require('../../packages/recovery/two-source-kotlin-sandbox.cjs');
const repo='iamkurtgoz/ECommerceAndroidCompose';
const commit='57f7a95021a125e0cdae4924c32891f6b70b0c5a';
const filename='domain/src/main/java/com/iamkurtgoz/domain/util/Validator.kt';
const source=fs.readFileSync(path.join(__dirname,'../fixtures/mit-external-validator/Validator.kt'),'utf8');
const originalBlobSha='5b8af35cf6393dc9dbc6217b8d00329bda7bc196';
function input(text=source){return {repository:repo,expectedCommitSha:commit,
 path:filename,source:text,expectedBlobSha:blobSha(text)};}
test('exact original MIT Kotlin source is pinned before any hypothesis',()=>{
 assert.equal(blobSha(source),originalBlobSha);
 assert.match(fs.readFileSync(path.join(__dirname,'../fixtures/mit-external-validator/LICENSE.upstream'),'utf8'),/MIT License/);
});
test('Hunter finds three anchored substring validations and Fixer drafts one bounded edit per finding',()=>{
 const r=scanAndDraftAnchoredRegexCase(input());
 assert.equal(r.status,'ADVISORY_CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM');
 assert.equal(r.rule,'ANCHORED_END_LINE_TERMINATOR_ACCEPTED');
 assert.equal(r.findings.length,3);
 assert.deepEqual(r.findings.map(f=>f.line),[7,12,17]);
 assert.equal(r.originalBlobSha,originalBlobSha);
 assert.equal(blobSha(r.candidateSource),r.candidateBlobSha);
 assert.equal(r.candidateSource.split('containsMatchIn(value)').length,1);
 assert.equal(r.candidateSource.split('regex.matches(value)').length,4);
 assert.match(r.unsafeSource,/return false/);
 assert.equal(r.originalJVMOracleVerified,false);
 assert.equal(r.remoteRepositoryAuthenticated,false);
 assert.equal(r.phaseOneClosed,false);
 assert.equal(r.remoteWrites,false);
 assert.equal(r.mergeAllowed,false);
});
test('candidate and unsafe control are each Git-Judged and rolled back in disposable sandbox',()=>{
 const r=scanAndDraftAnchoredRegexCase(input());
 for(const after of [r.candidateSource,r.unsafeSource]){
  const judged=drillOneSourceKotlinSandbox({file:{path:filename,
   before:source,after,beforeBlobSha:originalBlobSha,afterBlobSha:blobSha(after)}});
  assert.equal(judged.status,'ONE_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED');
  assert.equal(judged.exactTreeRollbackVerified,true);
  assert.equal(judged.originalOracleVerifiedByThisFunction,false);
  assert.equal(judged.remoteWrites,false);
 }
});
test('original safe controls, altered hash, path and false proven claims are rejected',()=>{
 const alreadySafe=source.replaceAll('regex.containsMatchIn(value)','regex.matches(value)');
 assert.match(scanAndDraftAnchoredRegexCase(input(alreadySafe)).status,/^BLOCKED_/);
 for(const change of [
  x=>{x.repository='cardenaspiero255-lang/JARVIS';},
  x=>{x.expectedBlobSha='0'.repeat(40);},
  x=>{x.path='../Validator.kt';},
  x=>{x.source+='// unpinned\n';},
  x=>{x.originalJVMOracleVerified=true;}
 ]){const x=input();change(x);const result=scanAndDraftAnchoredRegexCase(x);
  assert.match(result.status,/^BLOCKED_/);
  assert.equal(result.phaseOneClosed,false);
 }
});
test('getter and Proxy input never executes caller-controlled code',()=>{
 let count=0;const bad=()=>{count++;throw Error('called');};
 for(const key of ['source','repository','expectedBlobSha']){
  const x=input();Object.defineProperty(x,key,{enumerable:true,get:bad});
  assert.match(scanAndDraftAnchoredRegexCase(x).status,/^BLOCKED_/);
 }
 assert.match(scanAndDraftAnchoredRegexCase(new Proxy(input(),{
  get:bad,ownKeys:bad,getPrototypeOf:bad
 })).status,/^BLOCKED_/);
 assert.equal(count,0);
});
