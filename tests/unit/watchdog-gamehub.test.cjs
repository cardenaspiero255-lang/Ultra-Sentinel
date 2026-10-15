'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readGameHubLiveSample}=require('../../apps/watchdog/gamehub-live-sample.cjs');
const {evaluateChanges}=require('../../apps/watchdog/watchdog-state.cjs');
const token='test-readonly-github-token';
const repo='cardenaspiero255-lang/gamehub-ultra';
const good=(sha='a'.repeat(40))=>({number:132,state:'open',head:{sha},base:{repo:{
 id:1375408706,full_name:repo,owner:{id:322222186}}}});
const sentry={schema:'ultra-sentinel-sentry-sample/v1',sampleOnly:true,
 completeIssueInventory:false,projectId:'555',issues:[]};
const jarvis={schema:'ultra-sentinel-jarvis-readonly/v1',
 repository:'cardenaspiero255-lang/JARVIS',remoteWrites:false,openPrs:[]};
const wrap=(selection)=>({schema:'ultra-sentinel-gamehub-live-sample/v1',
 repository:repo,source:'github-api-readonly',completePrInventory:false,
 autoCommit:false,autoMerge:false,selection});
const mockFetch=(p=good(),status=200)=>async(url,opts)=>{
 assert.equal(url,'https://api.github.com/repos/'+repo+'/pulls/132');
 assert.equal(opts.method,'GET');
 assert.equal(opts.redirect,'error');
 assert.equal(opts.headers.Authorization,'Bearer '+token);
 return {url,status,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(p)};
};
test('selected GameHub PR is authenticated read-only with pinned repo and owner identity',async()=>{
 const v=await readGameHubLiveSample({token,fetchImpl:mockFetch(),
  select:async()=>132});
 assert.equal(v.selection.pr,132);
 assert.equal(v.selection.headSha,'a'.repeat(40));
 assert.equal(v.completePrInventory,false);
 assert.equal(v.autoMerge,false);
 const idle=await readGameHubLiveSample({token,fetchImpl:async()=>{throw Error('SHOULD_NOT_FETCH')},
  select:async()=>null});
 assert.equal(idle.selection,null);
});
test('closed PR, wrong repo, changed selector or broken API fail closed',async()=>{
 for(const [selected,p] of [
  [132,{...good(),state:'closed'}],
  [132,{...good(),base:{repo:{id:1,full_name:repo,owner:{id:322222186}}}}],
  [133,good()],[132,{...good(),head:{sha:'bad'}}]
 ]){
  await assert.rejects(readGameHubLiveSample({
   token,select:async()=>selected,fetchImpl:mockFetch(p)
  }));
 }
 await assert.rejects(readGameHubLiveSample({
  token,select:async()=>132,fetchImpl:mockFetch(good(),503)
 }));
});
test('GameHub live monitoring reports SHA transitions without certifying PRs',()=>{
 const base=evaluateChanges(null,sentry,jarvis,wrap({pr:132,headSha:'a'.repeat(40)}));
 assert.equal(base.alerts.length,0);
 const changed=evaluateChanges(base.checkpoint,sentry,jarvis,
  wrap({pr:132,headSha:'b'.repeat(40)}));
 assert.deepEqual(changed.alerts,[{type:'GAMEHUB_PR_HEAD_CHANGED',
  pr:132,headSha:'b'.repeat(40)}]);
 const noChange=evaluateChanges(changed.checkpoint,sentry,jarvis,
  wrap({pr:132,headSha:'b'.repeat(40)}));
 assert.equal(noChange.alerts.length,0);
 const switched=evaluateChanges(changed.checkpoint,sentry,jarvis,
  wrap({pr:161,headSha:'c'.repeat(40)}));
 assert.equal(switched.alerts[0].type,'GAMEHUB_PR_SAMPLE_CHANGED');
 assert.equal(switched.monitor24x7Deployed,false);
});
test('old checkpoint migrates silently, bogus source claims are rejected',()=>{
 const first=evaluateChanges(null,sentry,jarvis).checkpoint;
 const older={...first};delete older.gamehub;
 const res=evaluateChanges(older,sentry,jarvis,wrap({pr:132,headSha:'a'.repeat(40)}));
 assert.equal(res.alerts.length,0);
 assert.equal(res.checkpoint.gamehub.pr,132);
 assert.throws(()=>evaluateChanges(null,sentry,jarvis,
  {...wrap({pr:132,headSha:'a'.repeat(40)}),autoMerge:true}),/UNTRUSTED_GAMEHUB_SAMPLE/);
});
