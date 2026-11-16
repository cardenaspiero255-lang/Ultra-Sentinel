'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {prepareCohort}=require('../../scripts/phase2-block26-object-eval.cjs');
test('extended staging retains authenticated original Unicode and spaced Kotlin paths without rewriting bytes',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kotlin-api-v2-'));
 const git=(dir,...args)=>cp.execFileSync('git',['-C',dir,'-c','core.hooksPath=/dev/null',...args],{encoding:'utf8'}).trim();
 try{
  const engine=path.join(tmp,'engine'),source=path.join(tmp,'source');
  for(const dir of [engine,source]){fs.mkdirSync(dir);git(dir,'init','-q');}
  const p='src/main/kotlin/área/Clase con espacios.kt',bytes=Buffer.from('/* original */\nfun main() = 1\n');
  fs.mkdirSync(path.dirname(path.join(source,p)),{recursive:true});fs.writeFileSync(path.join(source,p),bytes);
  git(source,'add','.');
  for(const dir of [engine,source])git(dir,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid',
   '-c','commit.gpgsign=false','commit','-q','--allow-empty','-m','fixture');
  const m={engine:{commitSha:git(engine,'rev-parse','HEAD'),treeSha:git(engine,'rev-parse','HEAD^{tree}')},
   source:{commitSha:git(source,'rev-parse','HEAD'),treeSha:git(source,'rev-parse','HEAD^{tree}'),files:[
    {path:p,blobSha:git(source,'rev-parse','HEAD:'+p),sizeBytes:bytes.length}]}};
  assert.throws(()=>prepareCohort(engine,source,path.join(tmp,'old'),m));
  prepareCohort(engine,source,path.join(tmp,'new'),m,{extendedKotlinPaths:true});
  assert.deepEqual(fs.readFileSync(path.join(tmp,'new',p)),bytes);
  fs.writeFileSync(path.join(source,p),'changed');
  assert.throws(()=>prepareCohort(engine,source,path.join(tmp,'dirty'),m,{extendedKotlinPaths:true}));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('extended compiler mode quotes source arguments and preserves kernel isolation',()=>{
 const root=path.resolve(__dirname,'../..');
 const script=fs.readFileSync(path.join(root,'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh'),'utf8');
 assert.match(script,/compile-v2/);
 assert.match(script,/JSON\.stringify/);
 for(const term of ['--unshare-all','--clearenv','MemoryMax=512M','MemorySwapMax=0','TasksMax=32','assert-cgroup-and-exec.sh'])
  assert.ok(script.includes(term));
});
