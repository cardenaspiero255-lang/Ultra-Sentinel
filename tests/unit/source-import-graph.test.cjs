'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {planSourceImports}=require('../../packages/family-hunter/source-import-graph.cjs');
const blob=s=>crypto.createHash('sha1').update(`blob ${Buffer.byteLength(s)}\0`).update(s).digest('hex');
const source=(path,content)=>({path,content,blobSha:blob(content)});
const sources=[source('src/A.kt','package app\nimport lib.B\nimport lib.Missing\nclass A\n'),source('src/B.kt','package lib\nclass B\n')];
const input=()=>({headSha:'a'.repeat(40),sources,seeds:['src/A.kt'],maxFiles:5,maxDepth:2});
test('resolves explicit imports from verified declared blob IDs and plans traversal',()=>{
 const r=planSourceImports(input());
 assert.deepEqual(r.plan.files.map(x=>x.path),['src/A.kt','src/B.kt']);
 assert.deepEqual(r.unresolved.map(x=>x.import),['lib.Missing']);
 assert.equal(r.status,'INCOMPLETE_UNRESOLVED_IMPORTS');
 assert.equal(r.semanticAnalysisPerformed,false);assert.equal(r.causalityVerified,false);
});
test('ignores declarations in comments and strings and reports ambiguous or wildcard imports',()=>{
 const s=[source('A.kt','package app\nimport lib.B\nimport lib.*\nclass A\n'),source('B.kt','package lib\n// class Fake\nclass B\n'),source('C.kt','package lib\nclass B\nval s = "class Fake"\n')];
 const r=planSourceImports({...input(),sources:s,seeds:['A.kt']});
 assert.equal(r.edges.length,0);assert.deepEqual(r.unresolved.map(x=>x.reason),['WILDCARD','AMBIGUOUS']);
});
test('rejects forged blobs, unsafe paths, invalid encoding and malformed lexical input',()=>{
 const invalid=Buffer.from([255]),invalidBlob=crypto.createHash('sha1').update('blob 1\0').update(invalid).digest('hex');
 for(const s of [[{...sources[0],blobSha:'0'.repeat(40)}],[source('../A.kt','class A')],[source('A.kt','/* unterminated')],[{path:'A.kt',content:invalid,blobSha:invalidBlob}],[sources[0],sources[0]]])
  assert.throws(()=>planSourceImports({...input(),sources:s}),/INVALID_SOURCE_IMPORT_GRAPH/);
});
test('reports complete only when all supplied imports resolve and the planner finishes',()=>{
 const s=[source('A.kt','package app\nimport lib.B\nclass A\n'),source('B.kt','package lib\nclass B\n')];
 assert.equal(planSourceImports({...input(),sources:s,seeds:['A.kt']}).status,'COMPLETE_WITHIN_SUPPORTED_IMPORTS');
 assert.equal(planSourceImports({...input(),sources:s,seeds:['A.kt'],maxFiles:1}).status,'INCOMPLETE_PLANNER');
});

test('reads fixture files as data and verifies each Git blob ID',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'source-graph-'));
 try{
  for(const s of sources) {const file=path.join(dir,s.path);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,s.content);}
  const disk=sources.map(s=>({...s,content:fs.readFileSync(path.join(dir,s.path))}));
  const r=planSourceImports({...input(),sources:disk});
  assert.equal(r.edges.length,1);assert.equal(r.repositoryMembershipVerified,false);
  disk[1].content=Buffer.from('changed');assert.throws(()=>planSourceImports({...input(),sources:disk}),/INVALID_SOURCE_IMPORT_GRAPH/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('reports missing JVM dependencies in the pinned original JARVIS Kotlin fixture',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const filename='tests/fixtures/jarvis-bounded-image/BoundedImageInputStream.kt';
 const content=fs.readFileSync(path.resolve(__dirname,'../..',filename));
 const result=planSourceImports({headSha:'6b4475885dd55db2bbdce592467200c4634572e0',
  sources:[{path:filename,content,blobSha:'fd061b9dad636684184ccf2e96f87084d3b99df5'}],
  seeds:[filename],maxFiles:1,maxDepth:1});
 assert.equal(result.status,'INCOMPLETE_UNRESOLVED_IMPORTS');
 assert.deepEqual(result.unresolved.map(x=>x.import),['java.io.FilterInputStream','java.io.IOException','java.io.InputStream']);
 assert.equal(result.repositoryMembershipVerified,false);
});
test('enforces source bounds and requires supplied seeds',()=>{
 assert.throws(()=>planSourceImports({...input(),sources:[source('A.kt','x'.repeat(262145))],seeds:['A.kt']}),/INVALID_SOURCE_IMPORT_GRAPH/);
 assert.throws(()=>planSourceImports({...input(),seeds:['missing.kt']}),/INVALID_SOURCE_IMPORT_GRAPH/);
});

test('reports duplicate declarations in one source as ambiguous',()=>{
 const s=[source('A.kt','package app\nimport lib.B\nclass A\n'),source('B.kt','package lib\nclass B\nclass B\n')];
 const r=planSourceImports({...input(),sources:s,seeds:['A.kt']});
 assert.equal(r.edges.length,0);assert.equal(r.unresolved[0].reason,'AMBIGUOUS');
});

test('rejects changing accessors and proxies without invoking them',()=>{
 let reads=0;
 const a=source('A.kt','package app\nimport lib.B\nclass A\n');
 const b=source('B.kt','package lib\nclass B\n');
 Object.defineProperty(a,'blobSha',{enumerable:true,get(){reads++;return reads<=3?blob(a.content):'f'.repeat(40);}});
 assert.throws(()=>planSourceImports({...input(),sources:[a,b],seeds:['A.kt']}),/INVALID_SOURCE_IMPORT_GRAPH/);
 assert.equal(reads,0);
 assert.throws(()=>planSourceImports({...input(),sources:[new Proxy(b,{})],seeds:['B.kt']}),/INVALID_SOURCE_IMPORT_GRAPH/);
 const list=[b];Object.defineProperty(list,'0',{get(){throw Error('getter called');}});
 assert.throws(()=>planSourceImports({...input(),sources:list,seeds:['B.kt']}),/INVALID_SOURCE_IMPORT_GRAPH/);
 const seeds=['B.kt'];Object.defineProperty(seeds,'0',{get(){throw Error('getter called');}});
 assert.throws(()=>planSourceImports({...input(),sources:[b],seeds}),/INVALID_SOURCE_IMPORT_GRAPH/);
 const options={...input()};Object.defineProperty(options,'headSha',{get(){throw Error('getter called');}});
 assert.throws(()=>planSourceImports(options),/INVALID_SOURCE_IMPORT_GRAPH/);
});

test('snapshots real Buffers without calling user hooks and rejects shared backing',()=>{
 const content=Buffer.from('class A');
 const s={path:'A.kt',blobSha:blob(content),content};
 content.valueOf=()=>{throw Error('user hook called');};
 const opts={...input(),sources:[s],seeds:['A.kt']};
 assert.equal(planSourceImports(opts).blobIdsVerified,true);
 content[0]=88;
 assert.throws(()=>planSourceImports(opts),/INVALID_SOURCE_IMPORT_GRAPH/);
 const shared=Buffer.from(new SharedArrayBuffer(7));shared.set(Buffer.from('class A'));
 assert.throws(()=>planSourceImports({...opts,sources:[{...s,content:shared}]}),/INVALID_SOURCE_IMPORT_GRAPH/);
 assert.throws(()=>planSourceImports({...opts,sources:new Proxy([s],{})}),/INVALID_SOURCE_IMPORT_GRAPH/);
});

test('indexes supported top-level functions and properties without treating members or comments as declarations',()=>{
 const s=[source('A.kt','package app\nimport lib.work as execute\nimport lib.count\nimport lib.hidden\nimport lib.fake\nclass A\n'),
  source('Functions.kt','package lib\n// fun fake() {}\nfun work() {}\nclass Container {\n fun hidden() {}\n}\n'),
  source('Properties.kt','package lib\nval count: Int = 1\n')];
 const r=planSourceImports({...input(),sources:s,seeds:['A.kt']});
 assert.deepEqual(r.plan.files.map(x=>x.path),['A.kt','Functions.kt','Properties.kt']);
 assert.deepEqual(r.unresolved.map(x=>x.import),['lib.fake','lib.hidden']);
 assert.equal(r.semanticAnalysisPerformed,false);
});

test('keeps overloaded functions ambiguous and does not resolve receiver declarations',()=>{
 const s=[source('A.kt','package app\nimport lib.work\nimport lib.extend\nclass A\n'),
  source('B.kt','package lib\nfun work() {}\nfun work(x: Int) {}\nfun String.extend() {}\n')];
 const r=planSourceImports({...input(),sources:s,seeds:['A.kt']});
 assert.deepEqual(r.unresolved.map(x=>[x.import,x.reason]),[['lib.extend','UNSUPPORTED_DECLARATION'],['lib.work','UNSUPPORTED_DECLARATION']]);
 assert.equal(r.edges.length,0);
});

test('unsupported generic and receiver overloads prevent a falsely unique callable edge',()=>{
 for(const declaration of ['fun <T> work(x: T) {}','fun String.work() {}']){
  const s=[source('A.kt','package app\nimport lib.work\nclass A\n'),
   source('B.kt','package lib\nfun work() {}\n'),source('C.kt',`package lib\n${declaration}\n`)];
  const r=planSourceImports({...input(),sources:s,seeds:['A.kt']});
  assert.equal(r.edges.length,0);
  assert.deepEqual(r.unresolved,[{from:'A.kt',import:'lib.work',reason:'UNSUPPORTED_DECLARATION'}]);
  assert.equal(r.status,'INCOMPLETE_UNRESOLVED_IMPORTS');
 }
});

test('annotated declarations conservatively block imports from their package',()=>{
 for(const declaration of ['@Deprecated("old") fun <T> work(x: T) {}','@A @B fun String.work() {}','@JvmField val work: Int = 1']){
  const s=[source('A.kt','package app\nimport lib.work\nclass A\n'),source('B.kt','package lib\nfun work() {}\n'),source('C.kt',`package lib\n${declaration}\n`)];
  const r=planSourceImports({...input(),sources:s,seeds:['A.kt']});
  assert.equal(r.edges.length,0);
  assert.equal(r.unresolved[0].reason,'UNSUPPORTED_DECLARATION');
  assert.equal(r.status,'INCOMPLETE_UNRESOLVED_IMPORTS');
 }
});
