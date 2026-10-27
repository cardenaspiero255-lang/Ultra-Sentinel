'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {investigateUnregisteredRepairs}=require('../../packages/recovery/dynamic-repair-investigation.cjs');
const HEAD='b'.repeat(40);
const sha256=s=>createHash('sha256').update(s,'utf8').digest('hex');
const P='app/src/main/java/com/example/UnseenRenderer.kt';
const Q='app/src/main/java/com/example/UnseenSession.kt';
const source=body=>'package com.example\nclass Engine {\n  fun update() {\n'+body+'\n  }\n}\n';
const entry=(path,body)=>({path,source:body,expectedSha256:sha256(body)});

test('unregistered Kotlin path connects Core, Hunter and Fixer to a byte-pinned draft',()=>{
 const original=source('    System.gc()');
 const result=investigateUnregisteredRepairs({headSha:HEAD,files:[entry(P,original)]});
 assert.equal(result.status,'LOCAL_DRAFTS_REQUIRE_ORIGINAL_ORACLE');
 assert.equal(result.coreEngine,'Ultra Sentinel Core');
 assert.equal(result.familyEngine,'Ultra Sentinel Family Hunter');
 assert.equal(result.repairPlanStatus,'HUMAN_REVIEW_REQUIRED');
 assert.equal(result.cases.length,1);
 const candidate=result.cases[0];
 assert.equal(candidate.rule,'FORCED_GC');
 assert.equal(candidate.path,P);
 assert.match(candidate.familyId,/^[a-f0-9]{24}$/);
 assert.equal(candidate.beforeSha256,sha256(original));
 assert.equal(candidate.afterSha256,sha256(candidate.candidateSource));
 assert.equal(candidate.candidateSource.includes('System.gc()'),false);
 assert.equal(candidate.sourceBytesMatched,true);
 assert.equal(candidate.coreFindingGoneAfterDraft,true);
 assert.equal(result.originalOracleVerified,false);
 assert.equal(result.rootCauseVerified,false);
 assert.equal(result.commitAllowed,false);
 assert.equal(result.mergeAllowed,false);
 assert.equal(result.productionReleaseAllowed,false);
});

test('two unrelated previously unseen paths are independent repair candidates, not a registered pair',()=>{
 const result=investigateUnregisteredRepairs({headSha:HEAD,files:[
  entry(Q,source('    System.gc()')),
  entry(P,source('    System.gc()'))
 ]});
 assert.deepEqual(result.cases.map(c=>c.path),[P,Q]);
 assert.equal(result.cases.length,2);
 assert.equal(result.crossFileCausalityVerified,false);
});

test('strings and comments do not create actionable repair candidates',()=>{
 const input=source('    // System.gc()\n    val message = "System.gc()"');
 const result=investigateUnregisteredRepairs({headSha:HEAD,files:[entry(P,input)]});
 assert.equal(result.cases.length,0);
 assert.equal(result.commitAllowed,false);
});

test('a different risky construct remains a finding but is never blanket-patched',()=>{
 const result=investigateUnregisteredRepairs({headSha:HEAD,files:[
  entry(P,source('    GlobalScope.launch { update() }'))
 ]});
 assert.equal(result.cases.length,0);
 assert.equal(result.commitAllowed,false);
});

test('rejects changed bytes, duplicate paths, traversal, invalid commit and excessive source',()=>{
 const valid=entry(P,source('    System.gc()'));
 for(const options of [
  {headSha:HEAD,files:[{...valid,expectedSha256:'f'.repeat(64)}]},
  {headSha:HEAD,files:[valid,valid]},
  {headSha:HEAD,files:[{...valid,path:'app/src/main/../outside.kt'}]},
  {headSha:'not-a-sha',files:[valid]},
  {headSha:HEAD,files:[{...valid,source:'x'.repeat(50000)}]},
  {headSha:HEAD,files:[{...valid,source:valid.source.replace(/\n/g,'\r\n')}]},
  {headSha:HEAD,files:[{...valid,source:valid.source+'//tampered\n'}]},
  {headSha:HEAD,files:[]}
 ]){
  const result=investigateUnregisteredRepairs(options);
  assert.equal(result.status.startsWith('BLOCKED_'),true);
  assert.equal(result.commitAllowed,false);
  assert.equal(result.cases.length,0);
 }
});

test('no candidate may claim a compilation, run, trusted origin or production authorization',()=>{
 const result=investigateUnregisteredRepairs({headSha:HEAD,files:[entry(P,source('    System.gc()'))]});
 for(const row of result.cases){
  assert.equal(row.kotlinCompilationVerified,false);
  assert.equal(row.functionalRegressionVerified,false);
  assert.equal(row.remotelyAuthenticatedSource,false);
  assert.equal(row.autofix,false);
 }
 assert.equal(result.remoteWrites,false);
 assert.equal(result.ownerAuthorizationGranted,false);
 assert.equal(result.originalOracleVerified,false);
});
