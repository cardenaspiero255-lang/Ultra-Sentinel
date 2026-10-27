'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {decodePinnedGithubSource,sourcePathAllowed}=
 require('../../packages/orchestrator/github-pinned-full-source.cjs');
const {loadGameHubPullRequest}=
 require('../../packages/orchestrator/gamehub-live-reader.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const URL='https://api.github.com/repos/'+REPO;
const HEAD='a'.repeat(40),BASE='b'.repeat(40);
const PATH='app/src/main/java/voice/C2Probe.kt';
const TOKEN='test-1234567890';
function sha(bytes){
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function source(body,path=PATH){
 const buf=Buffer.from(body);
 return {type:'file',encoding:'base64',path,size:buf.length,
  sha:sha(buf),content:buf.toString('base64')};
}
function mock({code,patch,unsafeSource=false}={}){
 const raw=source(code);
 const file={filename:PATH,status:'modified',
  changes:1,additions:1,deletions:0,sha:raw.sha,patch};
 const pr={number:132,state:'open',draft:false,changed_files:1,
  base:{sha:BASE,repo:{id:1375408706,full_name:REPO}},
  head:{sha:HEAD}};
 const calls=[],fetchImpl=async(url,opt)=>{
  calls.push({url,opt});
  let body;
  if(url===URL+'/pulls/132')body=pr;
  else if(url.includes('/pulls/132/files?'))body=[file];
  else if(url.includes('/compare/'))body={base_commit:{sha:BASE},merge_base_commit:{sha:BASE}};
  else if(url.includes('/contents/'+PATH+'?ref='+BASE))body=source(code.split('\n').filter(x=>!x.includes('GlobalScope.launch')).join('\n'));
  else if(url.includes('/contents/'+PATH+'?ref='+HEAD))
   body=unsafeSource?{...raw,sha:'f'.repeat(40)}:raw;
  else throw Error('UNEXPECTED_NETWORK_URL');
  return {status:200,url,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify(body)};
 };
 return {fetchImpl,calls};
}
test('only bounded Android production Kotlin/Java source paths are eligible for full-source audit',()=>{
 assert.equal(sourcePathAllowed(PATH),true);
 assert.equal(sourcePathAllowed('app/src/main/java/a/b/Foo.java'),true);
 for(const p of ['../bad.kt','/etc/passwd','app/src/test/java/A.kt',
  'app/src/main/java/A.txt','app/src/main/java/../escape.kt',
  'app/src/main/java/secret\nGITHUB_TOKEN.kt']){
  assert.equal(sourcePathAllowed(p),false,p);
 }
});
test('pinned SHA1 Git blob and exact decoded UTF-8 required before Kotlin context is trusted',()=>{
 const raw=source('fun ok() = true\n');
 assert.equal(decodePinnedGithubSource(raw,{path:PATH,blobSha:raw.sha}),
  'fun ok() = true\n');
 for(const item of [
  {...raw,type:'symlink'}, {...raw,sha:'a'.repeat(40)},
  {...raw,content:'Zm9v'}, {...raw,content:'\ud800'},
  {...raw,path:'app/src/main/java/other.kt'},
  {...raw,size:160001}, {...raw,encoding:'utf-8'},
  {...raw,content:Buffer.from('bad').toString('base64')}
 ]){
  assert.throws(()=>decodePinnedGithubSource(item,{path:PATH,blobSha:raw.sha}),
    /UNVERIFIED_PINNED_SOURCE/);
 }
});
test('live reader pins full source to PR HEAD and exposes genuine executable Kotlin finding',async()=>{
 const code=['// header','fun speak() {',
  '  GlobalScope.launch { work() }','}'].join('\n')+'\n';
 const patch='@@ -2,2 +2,3 @@\n fun speak() {\n+  GlobalScope.launch { work() }\n }\n';
 const m=mock({code,patch});
 const result=await loadGameHubPullRequest(132,{
  token:TOKEN,fetchImpl:m.fetchImpl,hydrateSource:true});
 assert.equal(result.authenticated,true);
 assert.equal(result.completeDiff,true);
 assert.equal(result.report.coverage.partial,false);
 assert.ok(result.report.findings.some(f=>
  f.rule==='UNSCOPED_COROUTINE'&&f.line===3));
 assert.ok(m.calls.some(x=>x.url.endsWith('/contents/'+PATH+'?ref='+HEAD)));
 assert.ok(m.calls.every(x=>x.opt.method==='GET'&&x.opt.redirect==='error'));
 assert.equal(m.calls.length,6);
});
test('Kotlin content inside multiline comment never becomes actionable finding after hydrated lexer',async()=>{
 const code=['/* start','  GlobalScope.launch { attack() }','*/',
  'fun fine() = Unit'].join('\n')+'\n';
 const patch='@@ -1,2 +1,3 @@\n /* start\n+  GlobalScope.launch { attack() }\n */\n';
 const m=mock({code,patch});
 const r=await loadGameHubPullRequest(132,{
  token:TOKEN,fetchImpl:m.fetchImpl,hydrateSource:true});
 assert.equal(r.report.coverage.partial,false);
 assert.equal(r.report.findings.some(f=>f.rule==='UNSCOPED_COROUTINE'),false);
});
test('tampered file identity and nonauthenticated blob fail closed without trusting source',async()=>{
 const code=['// comment','fun speak() {',
  '  GlobalScope.launch { work() }','}'].join('\n')+'\n';
 const patch='@@ -2,2 +2,3 @@\n fun speak() {\n+  GlobalScope.launch { work() }\n }\n';
 const m=mock({code,patch,unsafeSource:true});
 await assert.rejects(loadGameHubPullRequest(132,{
  token:TOKEN,fetchImpl:m.fetchImpl,hydrateSource:true}),
  /UNVERIFIED_PINNED_SOURCE/);
});
