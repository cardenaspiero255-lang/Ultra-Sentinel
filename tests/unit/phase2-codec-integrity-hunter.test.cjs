'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {scanCodecIntegrityHypotheses}=require('../../packages/family-hunter/phase2-codec-integrity-hunter.cjs');
const head='a'.repeat(40);
const path='app/src/main/java/com/cardenaspiero255/gamehubultra/data/GameSessionStore.kt';
const risk='fun field(i: Int): String = String(Base64.getDecoder().decode(fields[i]), StandardCharsets.UTF_8)';
function gitBlob(source){const bytes=Buffer.from(source);return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');}
function file(source,p=path){return {path:p,source,expectedBlobSha:gitBlob(source)};}
function input(source){return {expectedCommitSha:head,files:[file(source)]};}
test('recognizes a previously unregistered source-only codec-integrity hypothesis',()=>{
 const src='package sample\n'+risk+'\n';
 const r=scanCodecIntegrityHypotheses(input(src));
 assert.equal(r.status,'CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE');
 assert.deepEqual(r.findings.map(f=>[f.rule,f.path,f.line,f.expectedBlobSha]),[
  ['LOSSY_BASE64_UTF8_DECODE',path,2,gitBlob(src)]
 ]);
 for(const k of ['sourceRepositoryAuthenticated','originalFunctionalOracleVerified','causalityVerified','generalizationVerified','remoteWrites','mergeAllowed'])
  assert.equal(r[k],false,k);
 assert.equal(r.sourceByteIntegrityVerified,true);
});
test('recognizes diverse identifiers and URL decoder without committing to a target path',()=>{
 const src='package sample\nval text = String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8)\n';
 const r=scanCodecIntegrityHypotheses({expectedCommitSha:head,files:[file(src,'module/src/main/kotlin/Codec.kt')]});
 assert.equal(r.findings.length,1);
});
test('ignores benign strict UTF-8 decoders and harmless encoded strings',()=>{
 for(const text of [
  '// '+risk,
  '/* '+risk+' */',
  'val example = "'+risk.replaceAll('"','')+'"',
  'val safe = StandardCharsets.UTF_8.newDecoder().decode(bytes)',
  'val input = Base64.getDecoder().decode(encoded)',
  'val message = String(bytes, StandardCharsets.UTF_8)'
 ]){
  const r=scanCodecIntegrityHypotheses(input('package sample\n'+text+'\n'));
  assert.equal(r.findings.length,0,text);
 }
});
test('rejects modified blobs, duplicate paths, unsafe files and malformed head',()=>{
 const src='package sample\n'+risk+'\n';
 for(const change of [
  r=>r.files[0].source+='// altered\n',
  r=>r.files[0].expectedBlobSha='f'.repeat(40),
  r=>r.files.push(file(src)),
  r=>r.files[0].path='../else.kt',
  r=>r.expectedCommitSha='invalid',
  r=>r.files[0].source='x'.repeat(160010)+'\n',
  r=>r.files[0].source='package sample\n',
  r=>r.files[0].source+='x\0',
  r=>r.files=[]
 ]){
  const r=input(src);change(r);
  const verdict=scanCodecIntegrityHypotheses(r);
  assert.match(verdict.status,/^BLOCKED_/);assert.equal(verdict.findings.length,0);
 }
});
test('refuses all hostile accessors and proxies without evaluating them',()=>{
 let reads=0;
 const a=input('package sample\n'+risk+'\n');
 Object.defineProperty(a.files[0],'source',{get(){reads++;throw Error('getter');},enumerable:true});
 assert.match(scanCodecIntegrityHypotheses(a).status,/^BLOCKED_/);
 const b=new Proxy(input('package sample\n'+risk+'\n'),{ownKeys(){reads++;throw Error('proxy');}});
 assert.match(scanCodecIntegrityHypotheses(b).status,/^BLOCKED_/);
 assert.equal(reads,0);
});
test('orders source observations deterministically and keeps outputs immutable',()=>{
 const a='package sample\n'+risk+'\n';
 const f1=file(a,'module/src/main/kotlin/Z.kt'),f2=file(a,'module/src/main/kotlin/A.kt');
 const r=scanCodecIntegrityHypotheses({expectedCommitSha:head,files:[f1,f2]});
 assert.deepEqual(r.findings.map(f=>f.path),[f2.path,f1.path]);
 assert.equal(Object.isFrozen(r.findings),true);
});

test('nested Kotlin block and raw literals cannot fabricate findings',()=>{
 const raw='package sample\n'+
 '/* outer\n /* nested '+risk+' */\n '+risk+'\n */\n'+
 'val example = """\n'+risk+'\n"""\n';
 const r=scanCodecIntegrityHypotheses(input(raw));
 assert.equal(r.findings.length,0);
});
test('string escapes, char literal and inline comments are ignored',()=>{
 const src='package sample\n'+
 'val a = "\\\" String(Base64.getDecoder().decode(fields[i]), StandardCharsets.UTF_8)"\n'+
 "val quote = '\\''\n"+
 '// '+risk+'\n'+
 'val active = 1 /* '+risk+' */ // '+risk+'\n';
 const r=scanCodecIntegrityHypotheses(input(src));
 assert.equal(r.findings.length,0);
});
test('refuses unsafe field types before generating observations',()=>{
 const src='package sample\n'+risk+'\n';
 for(const mutate of [
  x=>x.files[0].expectedBlobSha=123,
  x=>x.files[0].path=123,
  x=>x.files[0].source=null,
  x=>x.files[0].source='short\n',
  x=>x.files[0].source=src.replace(/\n/g,'\r\n'),
  x=>x.files[0].path='app/src/test/java/Foo.kt',
  x=>x.expectedCommitSha=42,
  x=>x.files[0].source='package sample\n'+risk+'\n\0'
 ]){
  const r=input(src);mutate(r);
  assert.match(scanCodecIntegrityHypotheses(r).status,/^BLOCKED_/);
 }
});

test('valid Kotlin without terminal newline preserves exact Git blob identity',()=>{
 const src='package sample\n'+risk;
 const result=scanCodecIntegrityHypotheses(input(src));
 assert.equal(result.status,'CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE');
 assert.equal(result.findings.length,1);
 assert.equal(result.findings[0].expectedBlobSha,gitBlob(src));
});

test('finds multiline Kotlin Base64 decoder expressions without losing source location',()=>{
 const src=[
  'package sample',
  'val harmless = String(bytes, StandardCharsets.UTF_8)',
  'val repaired = String(',
  '  Base64.getUrlDecoder()',
  '    .decode(payload),',
  '  StandardCharsets.UTF_8',
  ')',
  ''
 ].join('\n');
 const out=scanCodecIntegrityHypotheses(input(src));
 assert.equal(out.status,'CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE');
 assert.deepEqual(out.findings.map(f=>[f.rule,f.line,f.expectedBlobSha]),[
  ['LOSSY_BASE64_UTF8_DECODE',3,gitBlob(src)]
 ]);
 assert.equal(out.causalityVerified,false);
});
test('multiline literals, comments and benign decoders cannot fabricate codec findings',()=>{
 const src=[
  'package sample',
  '/* String(',
  ' Base64.getDecoder().decode(data),',
  ' StandardCharsets.UTF_8)',
  '*/',
  'val escaped = """String(',
  ' Base64.getDecoder().decode(data),',
  ' StandardCharsets.UTF_8)"""',
  'val safe = String(',
  ' bytes,',
  ' StandardCharsets.UTF_8)',
  ''
 ].join('\n');
 const out=scanCodecIntegrityHypotheses(input(src));
 assert.deepEqual(out.findings,[]);
});

test('rejects lossy UTF-16 source with a matching replacement-byte Git blob',()=>{
 const malformed='package sample\nval name = "\\uD800"\n'+risk+'\n';
 const verdict=scanCodecIntegrityHypotheses(input(malformed));
 assert.equal(verdict.status,'BLOCKED_SOURCE');
 assert.deepEqual(verdict.findings,[]);
 assert.equal(verdict.sourceByteIntegrityVerified,false);
});
test('accepts exact UTF-8 supplementary characters without weakening source checks',()=>{
 const source='package sample\n// 😀 supplementary code point\n'+risk+'\n';
 const verdict=scanCodecIntegrityHypotheses(input(source));
 assert.equal(verdict.status,'CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE');
 assert.equal(verdict.findings.length,1);
 assert.equal(verdict.findings[0].expectedBlobSha,gitBlob(source));
});
