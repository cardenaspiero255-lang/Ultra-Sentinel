'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {runBlindNumericInventory:run}=require('../../packages/family-hunter/blind-numeric-worker.cjs');
const commit='a'.repeat(40),p='app/src/main/java/com/example/';
const sha=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const f=(name,source)=>({path:p+name+'.kt',source,expectedBlobSha:sha(source)});
const sourceA='package example\nfun p(level:Int,scale:Int) = ((level.toLong() * 100L) / scale).toInt().coerceIn(0, 100)\n';
const sourceB='package example\nfun q(samples:Int) = (samples * 500).toLong()\n';
const sourceC='package example\nfun safe(samples:Int) = (samples.toLong() * 500L)\n';
const input=()=>({expectedCommitSha:commit,files:[f('Z',sourceC),f('B',sourceB),f('A',sourceA)],skippedOversized:0});
test('blindly scans all source files without a target or oracle input',()=>{
 const result=run(input());assert.equal(result.status,'NUMERIC_BLIND_HYPOTHESES_UNVERIFIED');
 assert.deepEqual(result.findings.map(x=>[x.path,x.rule]),[
 [p+'A.kt','WIDE_NUMERIC_NARROWED_BEFORE_CLAMP'],
 [p+'B.kt','INT_MULTIPLICATION_BEFORE_WIDENING']]);
 assert.equal(result.filesScanned,3);
 for(const flag of ['compilerAuthenticated','sourceRepositoryAuthenticated','originalOracleVerified','repairAuthorized','remoteWrites','mergeAllowed'])assert.equal(result[flag],false,flag);
});
test('partial or safe inventory never certifies absence of defects',()=>{
 const x=input();x.skippedOversized=3;
 const r=run(x);assert.equal(r.status,'NUMERIC_BLIND_PARTIAL_INVENTORY_UNVERIFIED');assert.equal(r.skippedOversized,3);
 const safe=input();safe.files=[f('C',sourceC)];
 assert.equal(run(safe).status,'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED');
});
test('invalid inventories, duplicate paths, unsupported and altered blobs block',()=>{
 for(const change of [
 x=>x.files.push(x.files[0]),x=>{x.files[0].source+='// tampered\n';},x=>x.expectedCommitSha='x',
 x=>x.skippedOversized=-1,x=>x.skippedOversized=1.5,x=>x.files=[],
 x=>{x.files[0].path='../bad.kt';},x=>{x.files[0].expectedBlobSha='b'.repeat(40);},
 ]){const x=input();change(x);const r=run(x);assert.match(r.status,/^BLOCKED_/);assert.equal(r.findings.length,0);}
});
test('getters and proxies are rejected without execution',()=>{
 let count=0;
 for(const which of [0,1,2]){
  const x=input();
  if(which===0)Object.defineProperty(x,'files',{enumerable:true,get(){count++;throw Error('getter');}});
  if(which===1)x.files=new Proxy(x.files,{get(){count++;throw Error('proxy');}});
  if(which===2)Object.defineProperty(x.files[0],'source',{enumerable:true,get(){count++;throw Error('getter');}});
  assert.match(run(x).status,/^BLOCKED_/);
 }
 assert.equal(count,0);
});
test('standalone source-only worker emits a sealed report and refuses bad argc or existing output',t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {spawnSync}=require('node:child_process');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'numeric-blind-tdd-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const inpath=path.join(dir,'inventory.json'),outpath=path.join(dir,'sealed.json');
 fs.writeFileSync(inpath,JSON.stringify(input()));
 const worker=path.resolve(__dirname,'../../packages/family-hunter/blind-numeric-worker.cjs');
 const r=spawnSync(process.execPath,[worker,inpath,outpath],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/blind_numeric_hypotheses=2/);
 assert.equal(JSON.parse(fs.readFileSync(outpath,'utf8')).findings.length,2);
 assert.notEqual(spawnSync(process.execPath,[worker],{encoding:'utf8'}).status,0);
 assert.notEqual(spawnSync(process.execPath,[worker,inpath,outpath],{encoding:'utf8'}).status,0);
});
test('bounded inference refuses array holes, excessive data and unexpected fields',()=>{
 const cases=[];
 const extra=input();extra.unexpected=1;cases.push(extra);
 const holes=input();delete holes.files[1];cases.push(holes);
 const excess=input();excess.files=Array.from({length:4097},(_,i)=>f('Sample'+i,sourceC));cases.push(excess);
 const giant=input();giant.files=[f('Giant','package example\n'+('fun x()= (x.toLong() * 100L).toInt().coerceIn(0,100)\n').repeat(300))];cases.push(giant);
 cases.push({expectedCommitSha:commit,files:[f('C',sourceC)],skippedOversized:4097});
 for(const c of cases)assert.match(run(c).status,/^BLOCKED_/);
});
test('more than 256 findings are rejected instead of silently truncated',()=>{
 const code='package sample\n'+Array.from({length:280},(_,i)=>'val v'+i+' = ((x.toLong() * 100L) / n).toInt().coerceIn(0, 100)').join('\n')+'\n';
 const r=run({expectedCommitSha:commit,files:[f('Many',code)],skippedOversized:0});
 assert.match(r.status,/^BLOCKED_/);assert.equal(r.findings.length,0);
});
test('standalone rejects malformed, symlinked or oversized inventory files',t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'numeric-blind-adversary-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const worker=path.resolve(__dirname,'../../packages/family-hunter/blind-numeric-worker.cjs'),out=path.join(dir,'out');
 const invalid=path.join(dir,'bad');fs.writeFileSync(invalid,JSON.stringify({...input(),files:[]}));
 assert.notEqual(spawnSync(process.execPath,[worker,invalid,out],{encoding:'utf8'}).status,0);
 const link=path.join(dir,'link');fs.symlinkSync(invalid,link);
 assert.notEqual(spawnSync(process.execPath,[worker,link,out],{encoding:'utf8'}).status,0);
 const tooLarge=path.join(dir,'giant');fs.writeFileSync(tooLarge,Buffer.alloc(40*1024*1024+1,0x41));
 assert.notEqual(spawnSync(process.execPath,[worker,tooLarge,out],{encoding:'utf8'}).status,0);
});
