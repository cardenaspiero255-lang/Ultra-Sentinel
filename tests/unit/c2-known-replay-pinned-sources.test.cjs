'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{createHash}=require('node:crypto'),{join}=require('node:path');
const root=join(__dirname,'../..');
const workflow=readFileSync(join(root,'.github/workflows/c2-known-regression-replay.yml'),'utf8');
const pins=[
 'packages/core/ultra_sentinel_core.cjs',
 'packages/core/c2-semantic-patterns.cjs',
 'packages/core/c2-known-defect-regressions.cjs'
];
test('known regressions pin actual current Core and both semantic rule files, not obsolete digest',()=>{
 for(const path of pins){
  const source=readFileSync(join(root,path));
  const digest=createHash('sha1').update('blob '+source.length+'\\0').update(source).digest('hex');
  assert.ok(workflow.includes('git hash-object '+path),'missing source identity '+path);
  assert.ok(workflow.includes('= '+digest),'workflow must match current blob '+path+' '+digest);
 }
 assert.doesNotMatch(workflow,/git hash-object[^\n]*!=/);
});
