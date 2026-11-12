'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {scanCancellationPropagationHypotheses}=
 require('../../packages/family-hunter/phase2-cancellation-propagation-hunter.cjs');
const head='a'.repeat(40), path='feature/src/commonMain/kotlin/org/example/Loader.kt';
const sha=source=>{const bytes=Buffer.from(source,'utf8');return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');};
function req(source,p=path){
 return {expectedCommitSha:head,files:[{path:p,source,expectedBlobSha:sha(source)}]};
}
test('bounded control flow finds swallowed explicit Kotlin CancellationException in original byte-authenticated source',()=>{
 const src='package sample\nsuspend fun work() {\n try { doWork() }\n catch (cause: CancellationException) {\n  audit(cause)\n  return\n }\n}\n';
 const r=scanCancellationPropagationHypotheses(req(src));
 assert.equal(r.status,'CANCELLATION_PROPAGATION_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE');
 assert.equal(r.sourceByteIntegrityVerified,true);
 assert.deepEqual(r.findings.map(x=>[x.rule,x.path,x.line,x.expectedBlobSha]),[
  ['CANCELLATION_EXCEPTION_SWALLOWED',path,4,sha(src)]
 ]);
 for(const k of ['sourceRepositoryAuthenticated','originalFunctionalOracleVerified','causalityVerified','generalizationVerified','remoteWrites','mergeAllowed'])
  assert.equal(r[k],false,k);
});
test('explicit rethrow and any other throw are conservative non-findings, including nested branches',()=>{
 for(const catchBody of [
  'throw cause',
  'if (recoverable) throw cause else throw CancellationException("again")',
  'throw IllegalStateException("translated")',
  'try { work() } catch (other: RuntimeException) { throw other }'
 ]){
  const src='package sample\nfun work() { try { risky() } catch (cause: CancellationException) { '+catchBody+' } }\n';
  const r=scanCancellationPropagationHypotheses(req(src));
  assert.equal(r.findings.length,0,catchBody);
  assert.equal(r.sourceByteIntegrityVerified,true,catchBody);
 }
});
test('nested blocks and fully qualified CancellationException preserve original source line and original Git hash',()=>{
 const src='package sample\nfun run() {\n try { first() }\n catch (err: kotlinx.coroutines.CancellationException) {\n  if (flag) { log("cancel") }\n  fallback()\n }\n}\n';
 const r=scanCancellationPropagationHypotheses(req(src,'service/common/src/api/Service.kt'));
 assert.equal(r.findings.length,1);
 assert.equal(r.findings[0].line,4);
});
test('avoid hits inside nested comments, raw strings, quoted examples, unrelated catch types',()=>{
 const suspicious='catch (e: CancellationException) { log(e) }';
 const safe=[
  'package sample\n// '+suspicious+'\n',
  'package sample\n/* '+suspicious+' /* nested */ */\n',
  'package sample\nval example = """'+suspicious+'"""\n',
  'package sample\nval example = "'+suspicious.replaceAll('"','')+'"\n',
  'package sample\ntry { run() } catch (e: Exception) { log(e) }\n',
  'package sample\ntry { run() } catch (e: Throwable) { log(e) }\n'
 ];
 for(const src of safe)assert.equal(scanCancellationPropagationHypotheses(req(src)).findings.length,0,src);
});
test('reject duplicate/modified blobs, traversal, noncanonical, overbudget and incomplete catch without false success',()=>{
 const src='package sample\ntry { run() } catch (e: CancellationException) { log(e) }\n';
 for(const change of [
  r=>r.expectedCommitSha='no',
  r=>r.files[0].source+='// modified',
  r=>r.files[0].expectedBlobSha='0'.repeat(40),
  r=>r.files[0].path='feature/src/test/kotlin/Leak.kt',
  r=>r.files[0].path='feature/src/commonMain/kotlin/../Leak.kt',
  r=>r.files.push({...r.files[0]}),
  r=>r.files[0].source='x'.repeat(65537),
  r=>r.files[0].source+='x\0',
  r=>r.files=[],
 ]){
  const r=req(src);change(r);
  const v=scanCancellationPropagationHypotheses(r);
  assert.match(v.status,/^BLOCKED_/);
  assert.equal(v.findings.length,0);
 }
 const partial='package sample\ntry { run() } catch (e: CancellationException) { log(e)\n';
 assert.match(scanCancellationPropagationHypotheses(req(partial)).status,/^BLOCKED_/);
});
test('proxy and accessor inputs are rejected without triggering user-defined code',()=>{
 let invoked=0;
 const x=req('package sample\ntry { run() } catch (e: CancellationException) { log(e) }\n');
 Object.defineProperty(x.files[0],'source',{enumerable:true,get(){invoked++;throw Error('getter');}});
 const r=scanCancellationPropagationHypotheses(x);
 assert.match(r.status,/^BLOCKED_/);
 assert.equal(invoked,0);
 const p=new Proxy(req('package sample\nfun f() = Unit\n'),{ownKeys(){invoked++;throw Error('proxy');}});
 assert.match(scanCancellationPropagationHypotheses(p).status,/^BLOCKED_/);
 assert.equal(invoked,0);
});

test('Kotlin templates with nested quoted strings and apostrophes never abort a valid source scan',()=>{
 const nested='val message = "${if (ok) "can\'t proceed" else "unknown"}"\n';
 const src='package sample\n'+nested+
  'suspend fun work() { try { task() } catch (e: CancellationException) { log(e) } }\n';
 const r=scanCancellationPropagationHypotheses(req(src));
 assert.equal(r.sourceByteIntegrityVerified,true,JSON.stringify(r));
 assert.equal(r.findings.length,1,JSON.stringify(r));
 assert.equal(r.findings[0].line,3);
});

test('template expressions and nested string templates do not fabricate cancellation findings',()=>{
 const inside='val message = "${run { try { task() } catch (e: CancellationException) { log(e) } }}"\n';
 const raw='val raw = """${if (ok) "the word catch (c: CancellationException) { suppressed() }" else "none"}"""\n';
 const nested='val nested = "${"before ${if (ok) "after" else "none"}"}"\n';
 const src='package sample\n'+inside+raw+nested;
 const r=scanCancellationPropagationHypotheses(req(src));
 assert.equal(r.sourceByteIntegrityVerified,true,JSON.stringify(r));
 assert.equal(r.findings.length,0,JSON.stringify(r));
});

test('unterminated Kotlin string-template expression fails closed rather than inventing a verdict',()=>{
 const src='package sample\nval message = "${if (ok) "yes" else "no"\n';
 assert.match(scanCancellationPropagationHypotheses(req(src)).status,/^BLOCKED_/);
});
