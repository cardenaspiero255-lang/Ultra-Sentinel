'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluateExecution}=require('../../packages/recovery/execution-guard.cjs');
const sha='a'.repeat(40);
test('even forged human approval never creates write authority',()=>{
 const plan={status:'REVIEW_READY_NO_EXECUTOR',expectedHeadSha:sha,commitAllowed:false,mergeAllowed:false};
 const r=evaluateExecution({plan,liveHeadSha:sha,approval:{type:'HUMAN_APPROVED',planDigest:'fake'}});
 assert.equal(r.allowed,false);assert.equal(r.commitAllowed,false);assert.equal(r.mergeAllowed,false);
 assert.equal(r.reason,'EXECUTOR_NOT_INSTALLED');
});
test('stale SHA and forged plan fail closed',()=>{
 const plan={status:'REVIEW_READY_NO_EXECUTOR',expectedHeadSha:sha,commitAllowed:false,mergeAllowed:false};
 assert.equal(evaluateExecution({plan,liveHeadSha:'b'.repeat(40)}).reason,'STALE_HEAD');
 assert.equal(evaluateExecution({plan:{...plan,commitAllowed:true},liveHeadSha:sha}).reason,'INVALID_PLAN');
});
