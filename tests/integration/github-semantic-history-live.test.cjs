'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const fs=require('node:fs'),os=require('node:os'),{execFileSync}=require('node:child_process');
const {verifyPinnedGithubSemanticHistory}=
 require('../../packages/investigation/github-semantic-history-verifier.cjs');
test('live GitHub evidence and an isolated original checkout verify only the pinned historical call sites',async()=>{
 const directory=process.env.ULTRA_SENTINEL_SEMANTIC_SOURCE_DIR;
 assert.ok(directory,'ULTRA_SENTINEL_SEMANTIC_SOURCE_DIR must point to an isolated original checkout');
 const archivePath=path.resolve(__dirname,'../fixtures/phase2-github-semantic-main.zip');
 let substituted=0;
 const previous=globalThis.fetch;
 let result;
 try{
  globalThis.fetch=()=>{substituted++;throw Error('untrusted transport');};
  result=await verifyPinnedGithubSemanticHistory({directory,archivePath});
 }finally{globalThis.fetch=previous;}
 assert.equal(substituted,0,'a later global fetch substitution must not replace the trusted transport');
 assert.equal(result.status,'PINNED_GITHUB_HISTORICAL_SEMANTIC_OBSERVATION_VERIFIED');
 assert.equal(result.githubApiTlsOriginVerified,true);
 assert.equal(result.compilerExecutionVerified,true);assert.equal(result.symbolResolutionVerified,true);
 assert.equal(result.verifiedCalls.length,2);assert.deepEqual(result.verifiedCalls.map(c=>c.callLine),[24,29]);
 assert.equal(result.graph.files.length,2);assert.equal(result.graph.files[1].depth,1);
 assert.equal(result.freshnessVerified,false);assert.equal(result.replayProtectionForNewRuns,false);
 assert.equal(result.causalityVerified,false);assert.equal(result.commitAllowed,false);
 assert.ok(Object.isFrozen(result.graph));assert.ok(Object.isFrozen(result.graph.files));
 assert.ok(result.graph.files.every(Object.isFrozen));
});
test('a modified original checkout cannot reuse the historical proof',async()=>{
 const source=process.env.ULTRA_SENTINEL_SEMANTIC_SOURCE_DIR;
 assert.ok(source,'ULTRA_SENTINEL_SEMANTIC_SOURCE_DIR must point to an isolated original checkout');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'semantic-history-dirty-'));
 try{
  const copy=path.join(dir,'source');
  execFileSync('git',['clone','-q','--no-hardlinks',source,copy]);
  execFileSync('git',['-C',copy,'remote','remove','origin']);
  fs.appendFileSync(path.join(copy,'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/GameAccountValidation.kt'),'// modified\n');
  const archivePath=path.resolve(__dirname,'../fixtures/phase2-github-semantic-main.zip');
  await assert.rejects(verifyPinnedGithubSemanticHistory({directory:copy,archivePath}),/SEMANTIC_HISTORY_EVIDENCE_REJECTED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
