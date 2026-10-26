'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {verifyHunterRepairBinding}=require('../../packages/recovery/hunter-repair-binding.cjs');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {fingerprint}=require('../../packages/family-hunter/ultra_sentinel_family_fingerprints.cjs');
const SOURCE='app/src/main/Engine.kt';
function git(dir,...args){return execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();}
function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hunter-binding-'));
 git(directory,'init','-q','-b','main');
 git(directory,'config','user.name','Fixture');
 git(directory,'config','user.email','fixture@example.invalid');
 const raw='GlobalScope.launch { work() }\n';
 fs.mkdirSync(path.dirname(path.join(directory,SOURCE)),{recursive:true});
 fs.writeFileSync(path.join(directory,SOURCE),raw);
 git(directory,'add','.');git(directory,'commit','-qm','pinned vulnerable source');
 git(directory,'switch','-q','-c','sandbox/repair');
 const expectedHeadSha=git(directory,'rev-parse','HEAD');
 const previous=git(directory,'rev-parse','HEAD:'+SOURCE);
 const proposed='scope.launch { work() }\n';
 const tmp=path.join(os.tmpdir(),'sentinel-proposed-'+Date.now()+'-'+process.pid);
 fs.writeFileSync(tmp,proposed);
 const after=git(directory,'hash-object',tmp);
 fs.unlinkSync(tmp);
 const rawAnalysis=analyze([{filename:SOURCE,status:'added',changes:1,additions:1,deletions:0,
  patch:'@@ -0,0 +1 @@\n+GlobalScope.launch { work() }\n',fullSource:raw}],{sha:expectedHeadSha});
 assert.ok(rawAnalysis.findings.length>0,'real Core must detect baseline finding');
 const finding=rawAnalysis.findings[0];
 const plan={status:'REVIEW_READY_NO_EXECUTOR',expectedHeadSha,branch:'sandbox/repair',
  commitAllowed:false,mergeAllowed:false,authorizationNonce:'nonce-12345678901234',
  patchBytes:1024,changes:[{path:SOURCE,beforeBlobSha:previous,afterBlobSha:after,patchBytes:64}],
  hunterFinding:{rule:finding.rule,path:finding.path,line:finding.line,familyId:fingerprint(finding)}};
 return {directory,plan,expectedHeadSha};
}
test('Hunter recomputes source finding from baseline Git blob and binds authorized plan',()=>{
 const f=fixture();
 try{
  const result=verifyHunterRepairBinding(f);
  assert.equal(result.bound,true);
  assert.equal(result.status,'HUNTER_SOURCE_BOUND_NOT_CAUSAL_TRUTH');
  assert.equal(result.headSha,f.expectedHeadSha);
  assert.equal(result.externalOracleVerified,false);
  assert.equal(result.commitAllowed,false);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('forged family, changed line and unrelated repair target are rejected',()=>{
 const f=fixture();
 try{
  for(const hunterFinding of [
   {...f.plan.hunterFinding,familyId:'f'.repeat(24)},
   {...f.plan.hunterFinding,line:987},
   {...f.plan.hunterFinding,path:'app/src/main/Other.kt'}
  ])assert.throws(()=>verifyHunterRepairBinding({...f,plan:{...f.plan,hunterFinding}}),/HUNTER_/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('stale head and mismatched before blob cannot be accepted',()=>{
 const f=fixture();
 try{
  assert.throws(()=>verifyHunterRepairBinding({...f,expectedHeadSha:'f'.repeat(40)}),/HUNTER_/);
  const plan={...f.plan,changes:[{...f.plan.changes[0],beforeBlobSha:'a'.repeat(40)}]};
  assert.throws(()=>verifyHunterRepairBinding({...f,plan}),/HUNTER_/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('partial or absent source finding is not evidence of a repairable defect',()=>{
 const f=fixture();
 try{
  fs.writeFileSync(path.join(f.directory,SOURCE),'safe no warning\n');
  assert.throws(()=>verifyHunterRepairBinding(f),/HUNTER_/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('no original-code file symlinks or forged remotes are allowed',()=>{
 const f=fixture();
 try{
  const target=path.join(f.directory,SOURCE);
  const actual=fs.readFileSync(target);fs.unlinkSync(target);
  const outside=path.join(f.directory,'imposter.kt');fs.writeFileSync(outside,actual);
  fs.symlinkSync(outside,target);
  assert.throws(()=>verifyHunterRepairBinding(f),/HUNTER_/);
  fs.unlinkSync(target);fs.writeFileSync(target,actual);
  git(f.directory,'remote','add','origin','https://example.invalid/not-owner.git');
  assert.throws(()=>verifyHunterRepairBinding(f),/HUNTER_/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
