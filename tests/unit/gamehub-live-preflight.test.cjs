'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {loadGameHubRepairPreflight}=require('../../packages/recovery/gamehub-live-preflight.cjs');
const sha='a'.repeat(40),base='b'.repeat(40),repo='cardenaspiero255-lang/gamehub-ultra';
const token='read-only-long-test-token';
const fixture=()=>({number:132,state:'open',draft:false,changed_files:1,
 head:{sha,repo:{id:1375408706,full_name:repo}},
 base:{sha:base,repo:{id:1375408706,full_name:repo,owner:{id:322222186}}}});
const file={filename:'app/src/main/java/voice/Ultra.kt',status:'modified',
 additions:1,deletions:1,changes:2,patch:'@@ -1,1 +1,1 @@\n-old\n+new'};
const check={name:'Android build',head_sha:sha,status:'completed',conclusion:'success'};
function github(opts={}){
 const seen=[];let metaCalls=0;
 const get=async(url,request)=>{
  assert.equal(request.method,'GET');assert.equal(request.redirect,'error');
  assert.equal(request.headers.Authorization,'Bearer '+token);
  const suffix=url.replace('https://api.github.com/repos/'+repo,'');
  let body;
  if(suffix==='/pulls/132'){
   metaCalls++;
   body={...fixture(),...(metaCalls===2?opts.last||{}:opts.first||{})};
  }else if(suffix==='/pulls/132/files?per_page=100&page=1')body=opts.files||[file];
  else if(suffix==='/commits/'+sha+'/check-runs?per_page=100&page=1')
   body=opts.checks||{total_count:1,check_runs:[check]};
  else if(suffix==='/commits/'+sha+'/status')body=opts.classic||{statuses:[]};
  else if(suffix==='/pulls/132/reviews?per_page=100&page=1')body=opts.reviews||[];
  else throw Error('UNEXPECTED_URL:'+url);
  seen.push(suffix);
  return {status:opts.status||200,url,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(body)};
 };
 return {get,seen};
}
test('trusted repair collector binds files/checks to the same verified PR HEAD',async()=>{
 const {get,seen}=github();
 const r=await loadGameHubRepairPreflight(132,{token,requiredChecks:['Android build'],fetchImpl:get});
 assert.equal(r.headSha,sha);assert.equal(r.files.length,1);
 assert.equal(r.source,'trusted-github-api-readonly');
 assert.equal(r.checkInventoryComplete,true);
 assert.equal(r.classicStatusInventoryComplete,true);
 assert.equal(r.remoteWrites,false);
 assert.equal(seen.filter(s=>s==='/pulls/132').length,2);
});
test('changed HEAD, skipped CI, missing check, blocking review, unsafe file or wrong repo fail closed',async()=>{
 const changes=[
  {last:{head:{sha:'c'.repeat(40),repo:{id:1375408706,full_name:repo}}}},
  {checks:{total_count:1,check_runs:[{...check,conclusion:'skipped'}]}},
  {checks:{total_count:2,check_runs:[check]}},
  {classic:{statuses:[{context:'legacy/status',state:'failure'}]}},
  {reviews:[{state:'CHANGES_REQUESTED'}]},
  {files:[{...file,filename:'.github/workflows/ci.yml'}]},
  {first:{base:{sha:base,repo:{id:17,full_name:repo,owner:{id:322222186}}}}}
 ];
 for(const opts of changes)await assert.rejects(()=>loadGameHubRepairPreflight(132,{
  token,requiredChecks:['Android build'],fetchImpl:github(opts).get
 }),undefined,JSON.stringify(Object.keys(opts)));
});
test('cannot trust an operator-supplied absent check name or malformed PR number',async()=>{
 await assert.rejects(()=>loadGameHubRepairPreflight(132,{
  token,requiredChecks:['Nonexistent required job'],fetchImpl:github().get}),
 /REQUIRED_REPAIR_CHECK_MISSING/);
 await assert.rejects(()=>loadGameHubRepairPreflight(0,{
  token,requiredChecks:['Android build'],fetchImpl:github().get}),
 /INVALID_OPERATOR_GITHUB_ACCESS/);
});
