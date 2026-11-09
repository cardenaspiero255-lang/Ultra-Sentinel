'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const investigation=require('../../packages/investigation/committed-kotlin-semantic-claims.cjs');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-claim-graph-'));
 git(directory,'init','-q','-b','main');
 git(directory,'config','user.name','Local Fixture');
 git(directory,'config','user.email','local@example.invalid');
 const paths=Array.from({length:8},(_,i)=>`app/src/main/kotlin/demo/Step${i}.kt`);
 for(let i=0;i<paths.length;i++){
  const dest=path.join(directory,paths[i]);fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,`package demo\nfun step${i}() = ${i<7?`step${i+1}()`:'1'}\n`);
 }
 git(directory,'add','.');git(directory,'commit','-qm','fixture');
 const expectedCommitSha=git(directory,'rev-parse','HEAD');
 const location=i=>({path:path.join(directory,paths[i]),line:2,column:1,
  gitBlobSha:git(directory,'rev-parse',`HEAD:${paths[i]}`)});
 const claims=paths.slice(1).map((_,i)=>({calledName:`step${i+1}`,kind:'FUNCTION',
  identity:`demo.step${i+1}`,callSite:location(i),declarationSite:location(i+1),
  origin:'SOURCE_UNAUTHENTICATED',dispatch:'STATIC'}));
 return {directory,expectedCommitSha,paths,seeds:[paths[0]],maxFiles:8,maxDepth:7,claims};
}
test('plans eight same-package files from locally bound call claims without attesting them',()=>{
 assert.equal(typeof investigation.planCommittedKotlinCallClaims,'function');
 const f=fixture();try{
  const r=investigation.planCommittedKotlinCallClaims(f);
  assert.equal(r.status,'LOCAL_COMMITTED_CALL_CLAIMS_REQUIRE_COMPILER_ATTESTATION');
  assert.deepEqual(r.plan.files.map(x=>x.path),f.paths);
  assert.equal(r.plan.files[7].depth,7);
  assert.equal(r.uniqueEdges,7);
  assert.equal(r.sourceFilesVerified,8);
  assert.equal(r.sourceCommitMembershipVerified,true);
  assert.equal(r.compilerExecutionVerified,false);
  assert.equal(r.symbolResolutionVerified,false);
  assert.equal(r.causalityVerified,false);
  assert.equal(r.externalRepositoryAuthenticated,false);
  assert.equal(r.commitAllowed,false);
  assert.equal(r.mergeAllowed,false);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('reports file and depth limits instead of silently shortening a claim chain',()=>{
 const f=fixture();try{
  const depth=investigation.planCommittedKotlinCallClaims({...f,maxDepth:4});
  assert.equal(depth.plan.status,'INCOMPLETE_DEPTH');assert.equal(depth.plan.files.length,5);
  const files=investigation.planCommittedKotlinCallClaims({...f,maxFiles:4});
  assert.equal(files.plan.status,'INCOMPLETE_BUDGET');assert.equal(files.plan.files.length,4);
  assert.equal(files.sourceFilesVerified,8);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('deduplicates identical claims independently of input ordering',()=>{
 const f=fixture();try{
  const a=investigation.planCommittedKotlinCallClaims(f);
  const b=investigation.planCommittedKotlinCallClaims({...f,claims:[...f.claims,...f.claims].reverse()});
  assert.equal(b.uniqueEdges,7);assert.deepEqual(b.plan,a.plan);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects dirty sources, forged blob identities and unresolved dispatch without claiming proof',()=>{
 const f=fixture();try{
  for(const claim of [
   {...f.claims[0],callSite:{...f.claims[0].callSite,gitBlobSha:'0'.repeat(40)}},
   {...f.claims[0],dispatch:'OPEN'},
   {...f.claims[0],origin:'EXTERNAL_OR_UNAVAILABLE'}
  ])assert.throws(()=>investigation.planCommittedKotlinCallClaims({...f,claims:[claim]}),/COMMITTED_KOTLIN_CALL_GRAPH_REJECTED/);
  fs.appendFileSync(path.join(f.directory,f.paths[0]),'//dirty\n');
  assert.throws(()=>investigation.planCommittedKotlinCallClaims(f),/COMMITTED_KOTLIN_CALL_GRAPH_REJECTED/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects a seed that is not one of the commit-verified source files',()=>{
 const f=fixture();try{
  assert.throws(()=>investigation.planCommittedKotlinCallClaims({...f,
   seeds:['app/src/main/kotlin/demo/Unverified.kt']}),/COMMITTED_KOTLIN_CALL_GRAPH_REJECTED/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects attacker-controlled getters and proxies without executing them',()=>{
 const f=fixture();try{
  let effects=0;const claim={...f.claims[0]};
  Object.defineProperty(claim,'identity',{get(){effects++;return 'forged';}});
  assert.throws(()=>investigation.planCommittedKotlinCallClaims({...f,claims:[claim]}),/COMMITTED_KOTLIN_CALL_GRAPH_REJECTED/);
  assert.throws(()=>investigation.planCommittedKotlinCallClaims(new Proxy(f,{get(){effects++;}})),/COMMITTED_KOTLIN_CALL_GRAPH_REJECTED/);
  assert.equal(effects,0);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
