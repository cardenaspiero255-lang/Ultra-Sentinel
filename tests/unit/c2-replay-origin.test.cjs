'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {verifyReplayOrigin}=require('../../packages/quality-gates/c2-replay-origin.cjs');

const context=Object.freeze({runId:123456,attempt:2,headSha:'a'.repeat(40),event:'push',suite:'json-query'});
function fixture(){return {
 run:{id:123456,run_attempt:2,head_sha:context.headSha,event:'push',status:'in_progress',
  path:'.github/workflows/c2-152-158-mechanism-cross.yml',actor:{id:322222186},
  repository:{id:1418338512},head_repository:{id:1418338512}},
 listing:{total_count:1,artifacts:[{id:765432,name:'c2-pr186-json-query-123456-a2',
  expired:false,size_in_bytes:979,digest:'sha256:'+'b'.repeat(64),
  workflow_run:{id:123456,repository_id:1418338512,head_repository_id:1418338512,head_sha:context.headSha}}]}
};}
test('accepts one current-attempt artifact attached to the expected owner run',()=>{
 const {run,listing}=fixture();
 assert.deepEqual(verifyReplayOrigin({run,listing,context}),{artifactId:765432,digest:'b'.repeat(64)});
});
test('fails closed for missing, stale, duplicated or unauthenticated artifacts',()=>{
 const cases=[
  x=>{x.listing.total_count=0;x.listing.artifacts=[];},
  x=>{x.listing.artifacts[0].name='c2-pr186-json-query-123456-a1';},
  x=>{x.listing.artifacts.push({...x.listing.artifacts[0]});x.listing.total_count=2;},
  x=>{x.listing.artifacts[0].expired=true;},
  x=>{x.listing.artifacts[0].size_in_bytes=1000001;},
  x=>{x.listing.artifacts[0].digest='sha256:'+'g'.repeat(64);},
  x=>{x.listing.artifacts[0].workflow_run.repository_id=9;},
  x=>{x.listing.artifacts[0].workflow_run.head_sha='c'.repeat(40);},
  x=>{x.run.run_attempt=1;},
  x=>{x.run.head_sha='c'.repeat(40);},
  x=>{x.run.path='.github/workflows/unrelated.yml';},
  x=>{x.run.actor.id=9;},
  x=>{x.run.status='completed';},
  x=>{x.run.repository.id=9;},
  x=>{x.run.head_repository.id=9;}
 ];
 for(const mutate of cases){const x=fixture();mutate(x);
  assert.throws(()=>verifyReplayOrigin({...x,context}),/C2_REPLAY_ORIGIN_BLOCKED/);
 }
});
test('rejects malformed execution context before selecting artifacts',()=>{
 const x=fixture();
 for(const bad of [{...context,attempt:0},{...context,headSha:'short'},
  {...context,event:'workflow_dispatch'},{...context,suite:'other'}]){
  assert.throws(()=>verifyReplayOrigin({...x,context:bad}),/C2_REPLAY_ORIGIN_BLOCKED/);
 }
});
test('CLI selects metadata and exits nonzero if the current attempt is missing',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-replay-origin-'));
 try{
  const {run,listing}=fixture(),runPath=path.join(dir,'run.json'),listPath=path.join(dir,'artifacts.json');
  fs.writeFileSync(runPath,JSON.stringify(run));fs.writeFileSync(listPath,JSON.stringify(listing));
  const script=path.join(__dirname,'../../scripts/c2-replay-origin.cjs');
  const invoke=attempt=>spawnSync(process.execPath,[script,runPath,listPath,'123456',attempt,context.headSha,'push','json-query'],{encoding:'utf8'});
  const good=invoke('2');assert.equal(good.status,0);assert.equal(good.stdout,`765432 ${'b'.repeat(64)}\n`);
  const bad=invoke('1');assert.equal(bad.status,2);assert.equal(bad.stdout,'');
  assert.match(bad.stderr,/C2_REPLAY_ORIGIN_BLOCKED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
