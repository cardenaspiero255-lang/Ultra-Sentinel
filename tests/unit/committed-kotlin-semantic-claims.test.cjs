'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {bindCommittedKotlinSemanticClaims}=require('../../packages/investigation/committed-kotlin-semantic-claims.cjs');
const git=(dir,...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-semantic-bind-'));
 git(directory,'init','-q','-b','main');git(directory,'config','user.name','Local Fixture');git(directory,'config','user.email','local@example.invalid');
 const paths=['app/src/main/kotlin/a/Caller.kt','app/src/main/kotlin/b/Target.kt'];
 for(const [i,p] of paths.entries()){
  fs.mkdirSync(path.dirname(path.join(directory,p)),{recursive:true});
  fs.writeFileSync(path.join(directory,p),i?'package b\nfun work() = 1\n':'package a\nimport b.work\nfun run() = work()\n');
 }
 git(directory,'add','.');git(directory,'commit','-qm','fixture');
 const expectedCommitSha=git(directory,'rev-parse','HEAD');
 const location=i=>({path:path.join(directory,paths[i]),line:2,column:1,gitBlobSha:git(directory,'rev-parse',`HEAD:${paths[i]}`)});
 const claim={calledName:'work',kind:'FUNCTION',identity:'b.work fun work(): kotlin.Int',
  callSite:location(0),declarationSite:location(1),origin:'SOURCE_UNAUTHENTICATED',dispatch:'STATIC'};
 return {directory,paths,expectedCommitSha,claim};
}
function run(f,claim=f.claim){return bindCommittedKotlinSemanticClaims({directory:f.directory,
 expectedCommitSha:f.expectedCommitSha,paths:f.paths,seeds:[f.paths[0]],maxFiles:8,maxDepth:4,claims:[claim]});}
test('binds claimed call and declaration bytes to a clean local commit without attesting the claim',()=>{
 const f=fixture();try{
  const r=run(f);
  assert.equal(r.sourceCommitMembershipVerified,true);
  assert.equal(r.compilerExecutionVerified,false);assert.equal(r.symbolResolutionVerified,false);
  assert.equal(r.causalityVerified,false);assert.equal(r.externalRepositoryAuthenticated,false);
  assert.equal(r.originalFunctionalOracleVerified,false);assert.equal(r.commitAllowed,false);
  assert.equal(r.relations[0].callPath,f.paths[0]);assert.equal(r.relations[0].declarationPath,f.paths[1]);
  assert.equal(r.relations[0].callBlobSha,f.claim.callSite.gitBlobSha);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects missing, altered, ambiguous, external, and open-dispatch claims',()=>{
 const f=fixture();try{
  for(const claim of [
   {...f.claim,callSite:{...f.claim.callSite,gitBlobSha:'0'.repeat(40)}},
   {...f.claim,declarationSite:{...f.claim.declarationSite,path:'/tmp/other.kt'}},
   {...f.claim,identity:null},{...f.claim,dispatch:'OPEN'},
   {...f.claim,origin:'EXTERNAL_OR_UNAVAILABLE'},
   {...f.claim,declarationSite:null},
  ])assert.throws(()=>run(f,claim),/KOTLIN_SEMANTIC_CLAIM_REJECTED/);
  fs.appendFileSync(path.join(f.directory,f.paths[0]),'// dirty\n');
  assert.throws(()=>run(f),/KOTLIN_SEMANTIC_CLAIM_REJECTED/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects getters and proxies without invoking them',()=>{
 const f=fixture();try{
  let read=false;const claim={...f.claim};
  Object.defineProperty(claim,'identity',{enumerable:true,get(){read=true;return 'forged';}});
  assert.throws(()=>run(f,claim),/KOTLIN_SEMANTIC_CLAIM_REJECTED/);assert.equal(read,false);
  assert.throws(()=>run(f,new Proxy(f.claim,{})),/KOTLIN_SEMANTIC_CLAIM_REJECTED/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('does not bind a claimed relation outside the bounded investigation plan',()=>{
 const f=fixture();try{
  assert.throws(()=>bindCommittedKotlinSemanticClaims({directory:f.directory,expectedCommitSha:f.expectedCommitSha,
   paths:f.paths,seeds:[f.paths[0]],maxFiles:1,maxDepth:4,claims:[f.claim]}),/KOTLIN_SEMANTIC_CLAIM_REJECTED/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
