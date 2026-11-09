'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const {screenOwnerKotlinSource}=require('../../packages/investigation/phase1-owner-kotlin-source-screen.cjs');
const REPO='cardenaspiero255-lang/Ultra-Sentinel';
const SOURCE_PATH='packages/kotlin-semantic/C2OptionalKotlinSemantic.kt';
const COMMIT='084f11899401503ab46e533ee7c699ed11c66f57';
const SOURCE=fs.readFileSync(path.join(__dirname,'../../',SOURCE_PATH),'utf8');
function payload(source=SOURCE){
 return {repository:REPO,commit:COMMIT,path:SOURCE_PATH,source,
  expectedBlobSha:blobSha(source)};
}
test('screen historical main original source from own production Kotlin code without inventing a defect',()=>{
 const result=screenOwnerKotlinSource(payload());
 assert.equal(result.status,'NO_ELIGIBLE_KOTLIN_HYPOTHESIS_NOT_CERTIFIED');
 assert.equal(result.checkedFiles,1);
 assert.equal(result.originalBlobSha,blobSha(SOURCE));
 assert.equal(result.findings.length,0);
 assert.equal(result.originalJVMOracleVerified,false);
 assert.equal(result.causalDefectProven,false);
 assert.equal(result.phaseOneClosed,false);
 assert.equal(result.remoteWrites,false);
});
test('advisory scanner recognizes an isolated test-only candidate but never asserts real causal proof',()=>{
 const controlled=SOURCE+'\nval pattern = Regex("^abc")\nval isVerified = pattern.containsMatchIn(value.trim())\n';
 const result=screenOwnerKotlinSource(payload(controlled));
 assert.equal(result.status,'UNVERIFIED_KOTLIN_HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE');
 assert.equal(result.findings.length,1);
 assert.equal(result.findings[0].rule,'REGEX_PREFIX_AS_COMPLETE_VALIDATION');
 assert.equal(result.originalJVMOracleVerified,false);
 assert.equal(result.novelDefectProven,false);
 assert.equal(result.phaseOneClosed,false);
});
test('rejects source metadata substitution and counterfeit blob digests',()=>{
 for(const modify of [
  v=>{v.repository='cardenaspiero255-lang/JARVIS';},
  v=>{v.path='tests/fixtures/jarvis-bounded-image/BoundedImageInputStream.kt';},
  v=>{v.expectedBlobSha='0'.repeat(40);},
  v=>{v.commit='not-a-git-commit';},
  v=>{v.source+='//drift';}
 ]){const obj=payload();modify(obj);
  const result=screenOwnerKotlinSource(obj);
  assert.match(result.status,/^BLOCKED_/);
  assert.equal(result.phaseOneClosed,false);
 }}
);
test('getters, nested accessors and proxies fail closed without executing callbacks',()=>{
 let invoked=0;
 const malicious=()=>{invoked++;throw Error('executed');};
 for(const key of ['repository','source','expectedBlobSha']){
  const obj=payload();Object.defineProperty(obj,key,{enumerable:true,get:malicious});
  assert.match(screenOwnerKotlinSource(obj).status,/^BLOCKED_/);
 }
 const proxy=new Proxy(payload(),{get:malicious,ownKeys:malicious,getPrototypeOf:malicious});
 assert.match(screenOwnerKotlinSource(proxy).status,/^BLOCKED_/);
 assert.equal(invoked,0);
});
test('caller cannot add authorization, novelty or success claims',()=>{
 for(const name of ['ownerAuthorized','originalJVMOracleVerified','novelDefectProven','phaseOneClosed']){
  const obj=payload();obj[name]=true;
  assert.match(screenOwnerKotlinSource(obj).status,/^BLOCKED_/);
 }
});
