'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {prepare,parseTreeRow,decodeSource,requireBudget}=require('../fixtures/gamehub-blind-numeric/prepare-inventory.cjs');
const scope='app/src/main/java/com/example';
function repo(t){
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'num-git-tdd-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
 const git=(...args)=>{const r=spawnSync('git',['-C',d,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 git('init','-q');git('config','user.name','Test');git('config','user.email','test@example.com');
 const p=path.join(d,scope,'A.kt');fs.mkdirSync(path.dirname(p),{recursive:true});
 fs.writeFileSync(p,'package example\nval a = (b * 500).toLong()\n');
 fs.writeFileSync(path.join(d,scope,'Big.kt'),'package example\n'+('a'.repeat(61000))+'\n');
 git('add','.');git('commit','-qm','fixture');
 return {d,p,git,head:git('rev-parse','HEAD')};
}
function output(t,name){const d=fs.mkdtempSync(path.join(os.tmpdir(),'num-output-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return path.join(d,name+'.json');}
test('derives original sources from clean Git objects without defect hints',t=>{
 const x=repo(t),out=output(t,'valid');
 const r=prepare([x.d,x.head,scope,out]);
 assert.deepEqual(r,{files:1,skippedOversized:1,allKotlin:2});
 const v=JSON.parse(fs.readFileSync(out,'utf8'));assert.equal(v.files[0].path,scope+'/A.kt');assert.equal(v.skippedOversized,1);
});
test('dirty checkout, mismatched SHA, invalid scopes and non-Git roots fail closed',t=>{
 const x=repo(t),out=output(t,'blocked');
 fs.appendFileSync(x.p,'// altered\n');
 assert.throws(()=>prepare([x.d,x.head,scope,out]),/DIRTY/);
 assert.throws(()=>prepare([x.d,'b'.repeat(40),scope,out]),/DIRTY/);
 for(const args of [[],[x.d,x.head,scope],['relative',x.head,scope,out],[x.d,x.head,scope,'relative'],
  [x.d,'wrong',scope,out],[x.d,x.head,scope+'|bad',out],[x.d,x.head,'apps/src/other',out],
  [x.d,x.head,'/apps/src/main/a',out],[x.d,x.head,'apps/src/main/a//x',out],
  [x.d,x.head,'apps/../src/main/foo',out]])assert.throws(()=>prepare(args));
 const invalid=fs.mkdtempSync(path.join(os.tmpdir(),'not-git-'));t.after(()=>fs.rmSync(invalid,{recursive:true,force:true}));
 assert.throws(()=>prepare([invalid,x.head,scope,out]));
});
test('no Kotlin file and staged Kotlin symlink are not silently accepted',t=>{
 const x=repo(t),out=output(t,'missing');
 x.git('rm','-q','-r',scope);fs.writeFileSync(path.join(x.d,'README.md'),'readme\n');
 x.git('add','.');x.git('commit','-qm','no Kotlin');
 assert.throws(()=>prepare([x.d,x.git('rev-parse','HEAD'),scope,out]),/EMPTY_OR_OVERSIZED/);
});
test('original Git source invalidities reject instead of scanning arbitrary bytes',t=>{
 const x=repo(t),out=output(t,'sources');
 const cases=[['small','x'],['no_lf','package example\nval x = 1'],
  ['crlf','package example\r\nval x=1\r\n'],['nul','package example\nval x="\0"\n'],
  ['lines','package example\n'+('val x=1\n').repeat(4001)]];
 for(const [label,content] of cases){
  fs.writeFileSync(x.p,content);x.git('add','.');x.git('commit','-qm',label);
  assert.throws(()=>prepare([x.d,x.git('rev-parse','HEAD'),scope,out]),label);
 }
 fs.writeFileSync(x.p,Buffer.from([0x70,0x61,0x63,0x6b,0x61,0x67,0x65,0x20,0xff,0x0a]));
 x.git('add','.');x.git('commit','-qm','invalid utf8');
 assert.throws(()=>prepare([x.d,x.git('rev-parse','HEAD'),scope,out]));
});
test('all Kotlin files being oversized yields a blocked inventory',t=>{
 const x=repo(t),out=output(t,'oversized');
 fs.writeFileSync(x.p,'package example\n'+'x'.repeat(61000)+'\n');
 x.git('add','.');x.git('commit','-qm','too large');
 assert.throws(()=>prepare([x.d,x.git('rev-parse','HEAD'),scope,out]),/EMPTY_OR_OVERSIZED/);
});
test('tree-entry classifier rejects unsafe paths, types and modes',()=>{
 const sha='a'.repeat(40),entry=(name,mode='100644',type='blob')=>mode+' '+type+' '+sha+'\t'+name;
 assert.deepEqual(parseTreeRow(entry(scope+'/Q.kt'),scope),{name:scope+'/Q.kt',blob:sha});
 assert.equal(parseTreeRow(entry(scope+'/README.md'),scope),null);
 for(const row of ['not a git tree record',entry(scope+'/L.kt','120000'),entry(scope+'/A.kt','100644','tree'),
  entry('unrelated/src/main/Other.kt'),entry(scope+'/Bad Name.kt'),entry(scope+'/./Bad.kt'),
  entry(scope+'/../Bad.kt'),entry(scope+'//Bad.kt'),entry(scope+'/'+('x/'.repeat(180))+'A.kt')])
  assert.throws(()=>parseTreeRow(row,scope),row.slice(0,90));
});
test('original blob decoder rejects mismatches, malformed UTF-8, CR, NUL and unsafe line counts',()=>{
 const sha=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
 const valid=Buffer.from('package x\nval k=3\n');assert.equal(decodeSource(valid,sha(valid)),valid.toString());
 const invalid=[Buffer.from('a'),Buffer.alloc(60001,0x41),Buffer.from('package x\r\nval k=3\n'),
  Buffer.from('package x\nval k="\0"\n'),Buffer.from('package x\nval k=3'),
  Buffer.from('package x\n'+('val k=3\n').repeat(4001)),
  Buffer.from([0x70,0x61,0x63,0x6b,0x61,0x67,0x65,0x20,0xff,0x0a])];
 for(const b of invalid)assert.throws(()=>decodeSource(b,sha(b)));
 assert.throws(()=>decodeSource(valid,'b'.repeat(40)));
 assert.throws(()=>decodeSource('not a buffer','b'.repeat(40)));
});
test('resource budgets enforce maximum Kotlin file count and byte size',()=>{
 assert.doesNotThrow(()=>requireBudget(4096,4096,'files'));
 assert.doesNotThrow(()=>requireBudget(40*1024*1024,40*1024*1024,'bytes'));
 for(const n of [-1,4097,1.5,NaN,'9',Infinity])assert.throws(()=>requireBudget(n,4096,'budget'),/budget/);
 assert.throws(()=>requireBudget(40*1024*1024+1,40*1024*1024,'bytes'),/bytes/);
});
test('standalone preparer creates exclusive source inventory and blocks a forged commit',t=>{
 const x=repo(t),out=output(t,'standalone');
 const script=path.resolve(__dirname,'../fixtures/gamehub-blind-numeric/prepare-inventory.cjs');
 const good=spawnSync(process.execPath,[script,x.d,x.head,scope,out],{encoding:'utf8'});
 assert.equal(good.status,0,good.stderr);
 assert.match(good.stdout,/blind_numeric_inventory_files=1/);
 assert.match(good.stdout,/blind_numeric_inventory_skipped=1/);
 assert.equal(JSON.parse(fs.readFileSync(out,'utf8')).files.length,1);
 assert.notEqual(spawnSync(process.execPath,[script,x.d,x.head,scope,out],{encoding:'utf8'}).status,0);
 assert.notEqual(spawnSync(process.execPath,[script,x.d,'f'.repeat(40),scope,out],{encoding:'utf8'}).status,0);
});
