'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {resolveGameHubTarget,requireOpenSource}=require('../../packages/orchestrator/gamehub-target.cjs');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('shadow/read-only default delegates to the existing bounded provider selector',async()=>{
 let calls=0;
 const chosen=await resolveGameHubTarget('auto',{token:'safe-test-token',select:async({token})=>{
  calls++;assert.equal(token,'safe-test-token');return 222;
 }});
 assert.equal(chosen,222);assert.equal(calls,1);
 assert.equal(await resolveGameHubTarget(undefined,{token:'safe-test-token',select:async()=>null}),null);
 assert.equal(await resolveGameHubTarget('345',{select:async()=>{throw Error('DO_NOT_DISCOVER')} }),345);
});
test('retired or closed PR is not silently audited as a currently open source',()=>{
 const verified={state:'open',authenticated:true,headStable:true,completeDiff:true,mergeAllowed:false};
 assert.equal(requireOpenSource(verified),verified);
 for(const mutation of [{state:'closed'},{authenticated:false},{headStable:false},
  {completeDiff:false},{mergeAllowed:true}]){
  assert.throws(()=>requireOpenSource({...verified,...mutation}),/CLOSED_OR_UNTRUSTED_SOURCE_PR/);
 }
});
test('invalid auto selector and malformed numeric PR inputs are rejected',async()=>{
 for(const invalid of ['0','-10','1;curl','201\n','1000000000',22,{},false]){
  await assert.rejects(resolveGameHubTarget(invalid,{select:async()=>222}),/INVALID_PR_NUMBER/);
 }
 await assert.rejects(resolveGameHubTarget('auto',{select:async()=>0}),/UNTRUSTED_SELECTED_PR/);
 await assert.rejects(resolveGameHubTarget('auto',{select:async()=>201.25}),/UNTRUSTED_SELECTED_PR/);
});
test('both trusted read-only workflows default to auto and never execute PR source',()=>{
 for(const name of ['gamehub-shadow','gamehub-readonly']){
  const workflow=read('.github/workflows/'+name+'.yml');
  const script=read('scripts/'+name+'-check.cjs');
  assert.match(workflow,/default: "auto"/);
  assert.match(workflow,/inputs.pr_number \|\| 'auto'/);
  assert.doesNotMatch(workflow,/default: "201"|inputs.pr_number \|\| '201'/);
  assert.match(workflow,/  contents: read/);
  assert.match(workflow,/persist-credentials: false/);
  assert.doesNotMatch(workflow,/pull_request_target|contents: write|pull-requests: write/);
  assert.match(script,/resolveGameHubTarget/);
  assert.match(script,/requireOpenSource/);
  assert.match(script,/IDLE_NO_OPEN_PR/);
  assert.doesNotMatch(script,/\|\|'201'/);
 }
});
