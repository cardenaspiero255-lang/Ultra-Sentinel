'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {scanCancellationControlflowV4}=require('../../packages/family-hunter/phase2-cancellation-controlflow-v4.cjs');
const head='b'.repeat(40);
const root='features/src/commonMain/kotlin/example/Flow.kt';
const hash=src=>{const b=Buffer.from(src);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const request=(src,p=root)=>({expectedCommitSha:head,files:[{path:p,source:src,expectedBlobSha:hash(src)}]});
const pre='package example\nimport kotlin.coroutines.cancellation.CancellationException\n';
const snippet=(e='error',guard='CancellationException')=>
 'suspend fun load(){try { awaitWork() } catch ('+e+': Exception) { if ('+e+' is '+guard+') { audit('+e+'); return }; throw '+e+' }}\n';

test('type-guard-aware v4 recognizes conditional swallowing in broad catch, while v3 misses it',()=>{
 const src=pre+snippet();
 const result=scanCancellationControlflowV4(request(src));
 assert.equal(result.status,'CANCELLATION_CONTROLFLOW_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE');
 assert.equal(result.sourceByteIntegrityVerified,true);
 assert.equal(result.compilerTypeResolutionVerified,false);
 assert.equal(result.originalFunctionalOracleVerified,false);
 assert.equal(result.causalityVerified,false);
 assert.deepEqual(result.findings.map(f=>[f.rule,f.path,f.line,f.expectedBlobSha]),[
  ['GUARDED_CANCELLATION_SWALLOWED',root,3,hash(src)]]);
});

test('qualified and imported aliases identify only an unambiguous Kotlin cancellation symbol',()=>{
 const alias='package example\nimport kotlin.coroutines.cancellation.CancellationException as Cancelled\n';
 const qualified='package example\n';
 for(const src of [
  alias+snippet('failure','Cancelled'),
  qualified+snippet('failure','kotlin.coroutines.cancellation.CancellationException'),
  pre+snippet('failure')
 ]){
  const r=scanCancellationControlflowV4(request(src));
  assert.deepEqual(r.findings.map(f=>f.rule),['GUARDED_CANCELLATION_SWALLOWED']);
 }
});

test('the guard must narrow exactly the caught variable and must have no explicit throw',()=>{
 for(const src of [
  pre+snippet('problem').replace('problem is','other is'),
  pre+snippet().replace('audit(error); return','throw error'),
  pre+snippet().replace('audit(error); return','if (flag) throw error'),
  'package example\n'+snippet(),
  pre+'class CancellationException: Exception()\n'+snippet(),
  pre+snippet().replace('if (error is','if (!(error is').replace('CancellationException) {','CancellationException)) {'),
  pre+snippet().replace('catch (error: Exception)','catch (error: IllegalArgumentException)')
 ]){
  const r=scanCancellationControlflowV4(request(src));
  assert.equal(r.findings.length,0,src);
  assert.equal(r.sourceByteIntegrityVerified,true,src);
 }
});

test('v4 preserves old exact cancellation catch hypothesis and safety boundaries',()=>{
 const src='package example\nfun f(){try { action() } catch (e: CancellationException) { report(e) }}\n';
 const result=scanCancellationControlflowV4(request(src));
 assert.equal(result.findings.length,1);
 assert.equal(result.findings[0].rule,'CANCELLATION_EXCEPTION_SWALLOWED');
 for(const change of [
  v=>v.files[0].source+='// modified\n',
  v=>v.files[0].expectedBlobSha='f'.repeat(40),
  v=>v.files[0].path='../Escape.kt',
  v=>v.files[0].path='features/src/test/kotlin/Unsafe.kt',
  v=>v.expectedCommitSha='not_sha',
  v=>v.files.push({...v.files[0]}),
  v=>v.files[0].source+='bad\0'
 ]){
  const req=request(pre+snippet());change(req);
  const r=scanCancellationControlflowV4(req);
  assert.match(r.status,/^BLOCKED_/);
  assert.equal(r.findings.length,0);
 }
});

test('ambiguous Kotlin lexical content cannot fabricate guard hits or trigger unsafe getters',()=>{
 const examples=[
  'package example\n// '+snippet(),
  'package example\n/* '+snippet()+' */\n',
  'package example\nval s="""'+snippet()+'"""\n',
  'package example\nval x="${ if (ok) "catch (e: Exception) { if (e is CancellationException) { } }" else "x" }"\n'
 ];
 for(const src of examples){
  const r=scanCancellationControlflowV4(request(src));
  assert.equal(r.findings.length,0,src);
 }
 let invoked=0;const req=request(pre+snippet());
 Object.defineProperty(req.files[0],'source',{get(){invoked++;throw Error('getter');},enumerable:true});
 const result=scanCancellationControlflowV4(req);
 assert.match(result.status,/^BLOCKED_/);
 assert.equal(invoked,0);
});
