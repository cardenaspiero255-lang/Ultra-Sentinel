'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {drillTwoSourceKotlinSandbox}=
 require('../../packages/recovery/two-source-kotlin-sandbox.cjs');
const root='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const blob=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
function sample(){
 const a='package com.test\nclass A { fun allowed() = false }\n';
 const b='package com.test\nclass B { fun allowed() = false }\n';
 return [
  {path:root+'ContractA.kt',before:a,after:a.replace('false','true'),
   beforeBlobSha:blob(a),afterBlobSha:blob(a.replace('false','true'))},
  {path:root+'ContractB.kt',before:b,after:b.replace('false','true'),
   beforeBlobSha:blob(b),afterBlobSha:blob(b.replace('false','true'))}
 ];
}
test('two-file Kotlin candidate gets independent local Git Judge and exact tree rollback',()=>{
 const x=drillTwoSourceKotlinSandbox({files:sample()});
 assert.equal(x.status,'TWO_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED');
 assert.equal(x.checkedFiles,2);
 assert.equal(x.exactTreeRollbackVerified,true);
 assert.equal(x.originalOracleVerifiedByThisFunction,false);
 assert.equal(x.ownerAuthorizationVerified,false);
 assert.equal(x.remoteWrites,false);
 assert.equal(x.mergeAllowed,false);
});
test('forged Git blobs, duplicate paths, traversal, unchanged patches and missing files fail closed',()=>{
 const variants=[
  x=>x[0].beforeBlobSha='0'.repeat(40),
  x=>x[1].afterBlobSha='f'.repeat(40),
  x=>x[0].after=x[0].before,
  x=>x[1].path=x[0].path,
  x=>x[0].path='../untrusted.kt',
  x=>x.pop(),
  x=>x[1].after+='//tamper\n'
 ];
 for(const mutate of variants){
  const files=sample();mutate(files);
  const result=drillTwoSourceKotlinSandbox({files});
  assert.match(result.status,/^BLOCKED_/);
  assert.equal(result.remoteWrites,false);
 }
});
