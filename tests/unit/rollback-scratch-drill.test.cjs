'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const SOURCE='app/src/main/java/com/example/Engine.kt';
function git(cwd,...args){
 const r=spawnSync('git',args,{cwd,encoding:'utf8',
  env:{...process.env,GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1'},
  timeout:10000,maxBuffer:1024*1024});
 if(r.error||r.status!==0)throw Error('scratch-git command failed');
 return r.stdout.trim();
}
test('disposable local git: stale CAS is rejected and revert restores exact tree',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-sentinel-rollback-'));
 try{
  git(dir,'init','-q','-b','main');
  git(dir,'config','user.name','Rollback Fixture');
  git(dir,'config','user.email','fixture@example.invalid');
  const source=path.join(dir,SOURCE);
  fs.mkdirSync(path.dirname(source),{recursive:true});
  const original='class Engine { val safe = true }\n';
  fs.writeFileSync(source,original);
  git(dir,'add','--',SOURCE);
  git(dir,'commit','-qm','baseline');
  const baseline=git(dir,'rev-parse','HEAD');
  const baselineTree=git(dir,'rev-parse','HEAD^{tree}');
  git(dir,'switch','-q','-c','drill/isolated');
  fs.writeFileSync(source,'class Engine { val safe = false }\n');
  git(dir,'add','--',SOURCE);
  git(dir,'commit','-qm','proposed repair (synthetic)');
  const proposed=git(dir,'rev-parse','HEAD');
  assert.notEqual(proposed,baseline);
  const stale=spawnSync('git',['update-ref','refs/heads/drill/isolated',
   baseline,baseline],{cwd:dir,encoding:'utf8',timeout:10000});
  assert.notEqual(stale.status,0,'stale compare-and-swap must not move HEAD');
  assert.equal(git(dir,'rev-parse','HEAD'),proposed);
  git(dir,'revert','--no-edit',proposed);
  assert.equal(fs.readFileSync(source,'utf8'),original);
  assert.equal(git(dir,'rev-parse','HEAD^{tree}'),baselineTree);
  assert.equal(git(dir,'branch','--show-current'),'drill/isolated');
  assert.notEqual(git(dir,'rev-parse','HEAD'),baseline);
  const remotes=git(dir,'remote');
  assert.equal(remotes,'','no network remote or production repository may be linked');
 }finally{
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
