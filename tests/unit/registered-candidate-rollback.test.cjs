'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {runRegisteredCandidateRollback}=require('../../packages/recovery/registered-candidate-rollback.cjs');
const P='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/Engine.kt';
function git(root,...args){return execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();}
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'registered-candidate-'));
 const base=path.join(root,'base'),candidate=path.join(root,'candidate');
 for(const dir of [base,candidate]){
  fs.mkdirSync(path.dirname(path.join(dir,P)),{recursive:true});
  git(dir,'init','-q','-b','main');git(dir,'config','user.email','test@example.invalid');
  git(dir,'config','user.name','Fixture');
  fs.writeFileSync(path.join(dir,P),dir===base?'fun f() = 1\n':'fun f() = 2\n');
  git(dir,'add','.');git(dir,'commit','-qm','pinned source');
 }
 const plan={id:'registered-example',targetRepo:'cardenaspiero255-lang/gamehub-ultra',
  baseSha:git(base,'rev-parse','HEAD'),baseBlob:git(base,'rev-parse','HEAD:'+P),
  candidateSha:git(candidate,'rev-parse','HEAD'),candidateBlob:git(candidate,'rev-parse','HEAD:'+P),
  targetFile:P,maxChangedFiles:1,remoteWrites:false,mergeAllowed:false};
 return {root,base,candidate,plan,dispose:()=>fs.rmSync(root,{recursive:true,force:true})};
}
test('fresh actual source + candidate blobs revert to exact original Git tree, zero remote writes',()=>{
 const x=fixture();
 try{
  const r=runRegisteredCandidateRollback({baseRoot:x.base,candidateRoot:x.candidate,plan:x.plan});
  assert.equal(r.status,'REGISTERED_GIT_CANDIDATE_ROLLBACK_VERIFIED');
  assert.equal(r.originalBlob,x.plan.baseBlob);
  assert.equal(r.proposedBlob,x.plan.candidateBlob);
  assert.equal(r.originalTree,r.restoredTree);
  assert.equal(r.remoteWrites,false);assert.equal(r.mergeAllowed,false);
  assert.equal(fs.readFileSync(path.join(x.base,P),'utf8'),'fun f() = 1\n');
 }finally{x.dispose();}
});
test('wrong source, dirty files or extra remote must fail closed',()=>{
 const x=fixture();
 try{
  assert.throws(()=>runRegisteredCandidateRollback({
   baseRoot:x.base,candidateRoot:x.candidate,plan:{...x.plan,baseBlob:'f'.repeat(40)}
  }),/REGISTERED_ROLLBACK_DENIED/);
  git(x.candidate,'remote','add','origin','https://example.invalid/evil.git');
  assert.throws(()=>runRegisteredCandidateRollback({
   baseRoot:x.base,candidateRoot:x.candidate,plan:x.plan
  }),/REGISTERED_ROLLBACK_DENIED/);
  git(x.candidate,'remote','remove','origin');
  fs.writeFileSync(path.join(x.candidate,P),'tampered\n');
  assert.throws(()=>runRegisteredCandidateRollback({
   baseRoot:x.base,candidateRoot:x.candidate,plan:x.plan
  }),/REGISTERED_ROLLBACK_DENIED/);
 }finally{x.dispose();}
});
