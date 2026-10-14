'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {selectOpenGameHubPr}=require('../../scripts/gamehub-provider-observer.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const URL='https://api.github.com/repos/'+REPO+'/pulls?state=open&sort=updated&direction=desc&per_page=100';
const sha='a'.repeat(40);
const pr=(number,title)=>({number,title,state:'open',head:{sha}});
const mock=(items,status=200)=>async url=>{
 assert.equal(url,URL);
 return {url,status,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(items)};
};
test('RED: auto-selection skips obsolete NO MERGE validation draft and picks active Sentinel PR',async()=>{
 const x=await selectOpenGameHubPr({token:'unit-test-token',fetchImpl:mock([
  pr(201,'test(sentinel): old SSS validation [NO MERGE]'),
  pr(149,'docs: Ultra SSS expansion'),
  pr(161,'CAR-51 network')
 ])});
 assert.equal(x,149);
});
test('empty open inventory is a normal idle state rather than selecting a closed PR',async()=>{
 assert.equal(await selectOpenGameHubPr({token:'unit-test-token',fetchImpl:mock([])}),null);
});
test('incomplete, suspicious and unavailable API results fail closed',async()=>{
 for(const items of [Array.from({length:100},(_,i)=>pr(i+1,'PR')),
  [{number:149,title:'x',state:'closed',head:{sha}}],
  [pr(149,'valid'),pr(149,'duplicate')]]){
  await assert.rejects(()=>selectOpenGameHubPr({token:'unit-test-token',fetchImpl:mock(items)}),/GITHUB_OPEN_PRS_INCOMPLETE/);
 }
 await assert.rejects(()=>selectOpenGameHubPr({token:'unit-test-token',fetchImpl:mock([],503)}),/GITHUB_API_UNAVAILABLE/);
});
