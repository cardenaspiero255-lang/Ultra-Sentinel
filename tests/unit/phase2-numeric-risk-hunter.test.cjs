'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {scanKotlinNumericRisks}=require('../../packages/family-hunter/phase2-numeric-risk-hunter.cjs');
const path='app/src/main/java/com/example/Numeric.kt';
const commit='b'.repeat(40);
const gitBlob=src=>{const bytes=Buffer.from(src);return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');};
const file=(source,p=path)=>({path:p,source,expectedBlobSha:gitBlob(source)});
const request=(source)=>({expectedCommitSha:commit,files:[file(source)]});
const line='val percent = ((level.toLong() * 100L) / scale).toInt().coerceIn(0, 100)';

test('discovers a source-only narrowing-before-clamping numeric hypothesis with exact blob binding',()=>{
 const output=scanKotlinNumericRisks(request('package example\n'+line+'\n'));
 assert.equal(output.status,'NUMERIC_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE');
 assert.equal(output.findings.length,1);
 assert.equal(output.findings[0].rule,'WIDE_NUMERIC_NARROWED_BEFORE_CLAMP');
 assert.equal(output.findings[0].line,2);
 assert.equal(output.findings[0].expectedBlobSha,gitBlob('package example\n'+line+'\n'));
 assert.equal(output.sourceByteIntegrityVerified,true);
 for(const k of ['sourceRepositoryAuthenticated','originalFunctionalOracleVerified','causalityVerified','generalizationVerified','remoteWrites','mergeAllowed'])assert.equal(output[k],false,k);
});

test('detects syntactically different bounded numeric conversions without hardcoded variable names or paths',()=>{
 const src='package sample\nfun check(x: Int, s: Int) = ((x.toLong() * 200L) / s).toInt().coerceIn(-20, 250)\n';
 const output=scanKotlinNumericRisks({expectedCommitSha:commit,files:[file(src,'module/src/main/kotlin/org/test/Counter.kt')]});
 assert.equal(output.findings.length,1);
 assert.equal(output.findings[0].path,'module/src/main/kotlin/org/test/Counter.kt');
});

test('discovers narrowing and clamping split across lines with the correct source line',()=>{
 for(const src of [
  'package sample\nval value = ((amount * 100L) / limit)\n    .toInt()\n    .coerceIn(0, 100)\n',
  'package sample\nval value = ((amount\n * 100L) / limit).toInt()\n    .coerceIn(0, 100)\n',
  'package sample\nimport kotlin.ranges.coerceIn as bound\nval value = ((amount * 100L) / limit)\n .toInt()\n .bound(0, 100)\n'
 ]){
  const r=scanKotlinNumericRisks(request(src));
  const expectedLine=src.slice(0,src.indexOf('.toInt()')).split('\n').length;
  assert.deepEqual(r.findings.map(f=>[f.line,f.rule]),[[expectedLine,'WIDE_NUMERIC_NARROWED_BEFORE_CLAMP']]);
  assert.equal(r.originalFunctionalOracleVerified,false);
 }
});

test('multiline scanning does not borrow numeric evidence from unrelated statements or literals',()=>{
 for(const body of [
  'val other = x * 100L\nval safe = y\n .toInt()\n .coerceIn(0, 100)',
  'val safe = (x * 100L)\n .coerceIn(0L, 100L)\n .toInt()',
  '/* val x = (y * 100L)\n .toInt()\n .coerceIn(0, 100) */',
  'val text = """(y * 100L)\n .toInt()\n .coerceIn(0, 100)"""'
 ])assert.equal(scanKotlinNumericRisks(request('package sample\n'+body+'\n')).findings.length,0,body);
});

test('finds Kotlin standard clamp imports under aliases as unverified hypotheses',()=>{
 for(const alias of ['clamp','limitValue','bound_2']){
  const src='package sample\nimport kotlin.ranges.coerceIn as '+alias+'\n'+
   'fun sample(x: Long) = (x + 100L).toInt().'+alias+'(0, 100)\n';
  const out=scanKotlinNumericRisks(request(src));
  assert.equal(out.status,'NUMERIC_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE');
  assert.deepEqual(out.findings.map(f=>[f.line,f.rule]),[[3,'WIDE_NUMERIC_NARROWED_BEFORE_CLAMP']]);
  assert.equal(out.originalFunctionalOracleVerified,false);
 }
});
test('does not infer an alias from comments, strings, unrelated imports or arbitrary calls',()=>{
 const expression='fun sample(x: Long) = (x + 100L).toInt().clamp(0, 100)\n';
 for(const prefix of ['','// import kotlin.ranges.coerceIn as clamp\n',
  'import other.coerceIn as clamp\n','val text = "import kotlin.ranges.coerceIn as clamp"\n']){
  const out=scanKotlinNumericRisks(request('package sample\n'+prefix+expression));
  assert.equal(out.findings.length,0,prefix);
  assert.equal(out.generalizationVerified,false);
 }
});
test('blocks excessive imported aliases instead of silently truncating the inventory',()=>{
 const imports=Array.from({length:33},(_,i)=>`import kotlin.ranges.coerceIn as clamp${i}\n`).join('');
 const out=scanKotlinNumericRisks(request('package sample\n'+imports+line+'\n'));
 assert.match(out.status,/^BLOCKED_/);
 assert.equal(out.findings.length,0);
});

test('detects multiplication before widening as a separate, unverified numeric hypothesis',()=>{
 const src='package sample\nval result = (samples * 500).toLong()\n';
 const output=scanKotlinNumericRisks(request(src));
 assert.deepEqual(output.findings.map(f=>f.rule),['INT_MULTIPLICATION_BEFORE_WIDENING']);
});
test('accepts a bounded Kotlin blob with no final newline without changing its identity',()=>{
 const src='package sample\nval result = (samples * 500).toLong()';
 const output=scanKotlinNumericRisks(request(src));
 assert.equal(output.findings.length,1);
 assert.equal(output.findings[0].expectedBlobSha,gitBlob(src));
 assert.equal(output.sourceByteIntegrityVerified,true);
});

test('does not classify safe widening before clamp, comment text, strings, or unrelated safe methods',()=>{
 for(const src of [
  'val value = ((level.toLong() * 100L) / scale).coerceIn(0L, 100L).toInt()',
  '// '+line,
  'val note = "'+line+'"',
  '/*\n'+line+'\n*/',
  'val note = """\n'+line+'\n"""',
  'val value = (samples.toLong() * 500L)',
  'val result = (samples * 500L).toLong()',
  'val result = (samples * 500).toInt()',
  'val safe = x.coerceIn(0, 100).toInt()',
  'val note = "not a bug" // '+line
 ]){
  const output=scanKotlinNumericRisks(request('package sample\n'+src+'\n'));
  assert.equal(output.findings.length,0,src);
  assert.equal(output.status,'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED');
 }
});

test('rejects modified blobs, duplicate paths, malformed hashes, unsafe paths and excessive data',()=>{
 const ok='package sample\n'+line+'\n';
 const cases=[
  x=>{x.files[0].source+='// altered\n';},
  x=>{x.files[0].expectedBlobSha='a'.repeat(40);},
  x=>{x.files.push(file(ok));},
  x=>{x.files[0].path='../Numeric.kt';},
  x=>{x.expectedCommitSha='invalid';},
  x=>{x.files[0].source='x'.repeat(65536)+'\n';x.files[0].expectedBlobSha=gitBlob(x.files[0].source);},
  x=>{x.files[0].source='';x.files[0].expectedBlobSha=gitBlob(x.files[0].source);},
  x=>{x.files[0].source=ok+'\0';x.files[0].expectedBlobSha=gitBlob(x.files[0].source);},
  x=>{x.files[0].source=ok+'\ud800';x.files[0].expectedBlobSha=gitBlob(x.files[0].source);},
  x=>{x.files[0].source=ok.replace(/\n/g,'\r\n');x.files[0].expectedBlobSha=gitBlob(x.files[0].source);},
  x=>{x.files=[];},
  x=>{x.files[0].path=17;}
 ];
 for(const mutate of cases){const input=request(ok);mutate(input);const r=scanKotlinNumericRisks(input);assert.match(r.status,/^BLOCKED_/,JSON.stringify(input).slice(0,200));assert.equal(r.findings.length,0);}
});

test('rejects getters and proxies before running input code',()=>{
 let touched=0;
 const payload=request('package sample\n'+line+'\n');
 Object.defineProperty(payload.files[0],'source',{enumerable:true,get(){touched++;throw Error('bad getter');}});
 assert.match(scanKotlinNumericRisks(payload).status,/^BLOCKED_/);
 const prox=new Proxy(request('package sample\n'+line+'\n'),{get(){touched++;throw Error('bad proxy');}});
 assert.match(scanKotlinNumericRisks(prox).status,/^BLOCKED_/);
 assert.equal(touched,0);
});

test('returns deterministic ordered findings and does not duplicate observations',()=>{
 const src='package sample\n'+line+'\n'+line+'\n';
 const r=scanKotlinNumericRisks({expectedCommitSha:commit,files:[file(src,'module/src/main/kotlin/z/Z.kt'),file(src,'module/src/main/kotlin/a/A.kt')]});
 assert.equal(r.findings.length,4);
 assert.deepEqual(r.findings.map(x=>[x.path,x.line]),[
  ['module/src/main/kotlin/a/A.kt',2],['module/src/main/kotlin/a/A.kt',3],
  ['module/src/main/kotlin/z/Z.kt',2],['module/src/main/kotlin/z/Z.kt',3]
 ]);
 assert.equal(Object.isFrozen(r.findings),true);
});
