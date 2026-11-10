'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const entry=path.resolve(__dirname,'../../scripts/evaluate-private-edition-readiness.cjs');
test('offline CLI emits incomplete report, not release approval',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-private-'));
 try{
  const file=path.join(dir,'input.json');
  fs.writeFileSync(file,JSON.stringify({schema:'ultra-sentinel-private-edition-input/v1',
   repository:'cardenaspiero255-lang/Ultra-Sentinel',headSha:'a'.repeat(40),
   openBlockingFindings:0,proofs:[]}));
  const run=spawnSync(process.execPath,[entry,file],{encoding:'utf8'});
  assert.equal(run.status,0);
  const out=JSON.parse(run.stdout);
  assert.equal(out.verdict,'MISSING_OPERATIONAL_EVIDENCE');
  assert.equal(out.releaseAuthorized,false);
  const link=path.join(dir,'link.json');fs.symlinkSync(file,link);
  const rejected=spawnSync(process.execPath,[entry,link],{encoding:'utf8'});
  assert.notEqual(rejected.status,0);
  assert.match(rejected.stderr,/PRIVATE_READINESS_INVALID_OR_INCOMPLETE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('CLI rejects a symlink substituted between file inspection and opening',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-private-race-'));
 try{
  const file=path.join(dir,'input.json'),target=path.join(dir,'other.json'),preload=path.join(dir,'swap.cjs');
  const data=headSha=>JSON.stringify({schema:'ultra-sentinel-private-edition-input/v1',
   repository:'cardenaspiero255-lang/Ultra-Sentinel',headSha,openBlockingFindings:0,proofs:[]});
  fs.writeFileSync(file,data('a'.repeat(40)));
  fs.writeFileSync(target,data('b'.repeat(40)));
  fs.writeFileSync(preload,`const fs=require('node:fs'),original=fs.lstatSync;
   fs.lstatSync=function(p,...args){const stat=original.call(this,p,...args);
    if(p===process.env.TEST_RACE_PATH){fs.renameSync(p,p+'.saved');fs.symlinkSync(process.env.TEST_RACE_TARGET,p);}
    return stat;};\n`);
  const run=spawnSync(process.execPath,['--require',preload,entry,file],{
   env:{...process.env,TEST_RACE_PATH:file,TEST_RACE_TARGET:target},encoding:'utf8'});
  assert.notEqual(run.status,0);
  assert.equal(run.stdout,'');
  assert.match(run.stderr,/PRIVATE_READINESS_INVALID_OR_INCOMPLETE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('CLI rejects malformed arguments, nonregular files, hard links and invalid input',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-private-invalid-'));
 try{
  const file=path.join(dir,'data.json'),hardlink=path.join(dir,'hardlink.json');
  fs.writeFileSync(file,JSON.stringify({schema:'ultra-sentinel-private-edition-input/v1',
   repository:'cardenaspiero255-lang/Ultra-Sentinel',headSha:'a'.repeat(40),
   openBlockingFindings:0,proofs:[]}));fs.linkSync(file,hardlink);
  const commands=[[],['relative.json'],[dir],[file],[hardlink],[file,'unexpected']];
  for(const args of commands){
   const run=spawnSync(process.execPath,[entry,...args],{encoding:'utf8'});
   assert.notEqual(run.status,0);assert.equal(run.stdout,'');
   assert.match(run.stderr,/PRIVATE_READINESS_INVALID_OR_INCOMPLETE/);
  }
  fs.unlinkSync(hardlink);fs.writeFileSync(file,'{}');
  assert.notEqual(spawnSync(process.execPath,[entry,file],{encoding:'utf8'}).status,0);
  fs.writeFileSync(file,'not valid json');
  const malformed=spawnSync(process.execPath,[entry,file],{encoding:'utf8'});
  assert.notEqual(malformed.status,0);assert.equal(malformed.stdout,'');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('CLI rejects file replacement and content modification during the read',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-private-races-'));
 try{
  const file=path.join(dir,'input.json'),other=path.join(dir,'other.json'),preload=path.join(dir,'race.cjs');
  const data=headSha=>JSON.stringify({schema:'ultra-sentinel-private-edition-input/v1',
   repository:'cardenaspiero255-lang/Ultra-Sentinel',headSha,openBlockingFindings:0,proofs:[]});
  for(const mode of ['replace','mutate']){
   fs.writeFileSync(file,data('a'.repeat(40)));fs.writeFileSync(other,data('b'.repeat(40)));
   fs.writeFileSync(preload,`const fs=require('node:fs');
    const stat=fs.lstatSync,read=fs.readFileSync;
    fs.lstatSync=function(p,...a){const r=stat.call(this,p,...a);
     if(process.env.TEST_RACE_MODE==='replace'&&p===process.env.TEST_RACE_PATH){
      fs.renameSync(process.env.TEST_RACE_OTHER,p);}
     return r;};
    fs.readFileSync=function(p,...a){if(process.env.TEST_RACE_MODE==='mutate'&&typeof p==='number'){
     fs.writeFileSync(process.env.TEST_RACE_PATH,fs.readFileSync(process.env.TEST_RACE_OTHER));
     const t=Date.now()/1000+5;fs.utimesSync(process.env.TEST_RACE_PATH,t,t);}
     return read.call(this,p,...a);};\n`);
   const run=spawnSync(process.execPath,['--require',preload,entry,file],{
    env:{...process.env,TEST_RACE_MODE:mode,TEST_RACE_PATH:file,TEST_RACE_OTHER:other},encoding:'utf8'});
   assert.notEqual(run.status,0,mode);assert.equal(run.stdout,'',mode);
   assert.match(run.stderr,/PRIVATE_READINESS_INVALID_OR_INCOMPLETE/);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
