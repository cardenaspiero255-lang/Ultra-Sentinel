'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {prepare}=require('../fixtures/gamehub-blind-numeric/prepare-inventory.cjs');
const codec=path.join(__dirname,'../fixtures/gamehub-codec/prepare-blind-inventory.cjs');
function mkRepo(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-kmp-source-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const git=(...args)=>{const r=spawnSync('git',['-C',dir,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 git('init','-q');git('config','user.name','Test');git('config','user.email','test@example.com');
 for(const mode of ['commonMain','jvmMain','androidMain']){
  const file=path.join(dir,'module/src',mode,'kotlin/org/example/Foo.kt');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,'package org.example\ninternal fun sample(x:Int)=x\n');
 }
 git('add','.');git('commit','-qm','original source');
 return {dir,git,head:git('rev-parse','HEAD')};
}
test('both authenticated Git inventory builders admit commonMain, jvmMain and androidMain original Kotlin sources',t=>{
 const {dir,head}=mkRepo(t),temp=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-kmp-out-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 for(const sourceSet of ['commonMain','jvmMain','androidMain']){
  const scope='module/src/'+sourceSet+'/kotlin';
  const numFile=path.join(temp,'numeric-'+sourceSet+'.json');
  assert.deepEqual(prepare([dir,head,scope,numFile]),{files:1,skippedOversized:0,skippedNoncanonical:0,allKotlin:1});
  const numeric=JSON.parse(fs.readFileSync(numFile,'utf8'));
  assert.equal(numeric.files.length,1);assert.equal(numeric.files[0].path,scope+'/org/example/Foo.kt');
  const codecFile=path.join(temp,'codec-'+sourceSet+'.json');
  const r=spawnSync(process.execPath,[codec,dir,head,scope,codecFile],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  const data=JSON.parse(fs.readFileSync(codecFile,'utf8'));
  assert.equal(data.files.length,1);assert.equal(data.files[0].expectedBlobSha,numeric.files[0].expectedBlobSha);
 }
});
test('neither inventory builder admits tests, arbitrary directories, double separators or traversal',t=>{
 const {dir,head}=mkRepo(t),temp=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-kmp-out-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 for(const scope of ['module/src/commonTest/kotlin','module/src/jvmTest/kotlin','module/src/test/kotlin',
  'module/src/commonMain/java','module/src/commonMain/kotlin/..','module/src/commonMain/kotlin//x',
  'module/src/otherMain/kotlin','arbitrary/src/commonMain/kotlin../../']){
  assert.throws(()=>prepare([dir,head,scope,path.join(temp,'negative.json')]),scope);
  const r=spawnSync(process.execPath,[codec,dir,head,scope,path.join(temp,'negative-codec.json')],{encoding:'utf8'});
  assert.notEqual(r.status,0,scope);
 }
});
