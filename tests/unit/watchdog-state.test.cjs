'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluateChanges}=require('../../apps/watchdog/watchdog-state.cjs');
const sha='a'.repeat(40),nextSha='b'.repeat(40);
const sentry=(ids=['100'])=>({schema:'ultra-sentinel-sentry-sample/v1',
 sampleOnly:true,completeIssueInventory:false,projectId:'555',
 issues:ids.map(id=>({issueId:id,projectId:'555'}))});
const jarvis=(items=[{pr:2,headSha:sha}])=>({schema:'ultra-sentinel-jarvis-readonly/v1',
 repository:'cardenaspiero255-lang/JARVIS',remoteWrites:false,openPrs:items});
test('baseline initialized silently and identical healthy snapshot is idempotent',()=>{
 const first=evaluateChanges(null,sentry(),jarvis());
 assert.equal(first.status,'BASELINE_INITIALIZED_NO_ALERT');
 assert.equal(first.alerts.length,0);
 assert.equal(first.alertDeliveryConfigured,false);
 assert.equal(first.monitor24x7Deployed,false);
 const repeated=evaluateChanges(first.checkpoint,sentry(),jarvis());
 assert.equal(repeated.status,'NO_CHANGES');assert.deepEqual(repeated.alerts,[]);
 assert.deepEqual(repeated.checkpoint,first.checkpoint);
});
test('new Sentry group and Jarvis PR changes create deterministic minimal alert events',()=>{
 const baseline=evaluateChanges(null,sentry(),jarvis());
 const next=evaluateChanges(baseline.checkpoint,sentry(['100','200']),
  jarvis([{pr:2,headSha:nextSha},{pr:3,headSha:sha}]));
 assert.equal(next.status,'CHANGES_OBSERVED');
 assert.deepEqual(next.alerts.map(x=>x.type),[
  'NEW_SENTRY_ISSUE','JARVIS_PR_HEAD_CHANGED','JARVIS_PR_OPENED']);
 assert.doesNotMatch(JSON.stringify(next),/stacktrace|user@email|secretValue/);
 assert.equal(evaluateChanges(next.checkpoint,sentry(['100','200']),
  jarvis([{pr:2,headSha:nextSha},{pr:3,headSha:sha}])).alerts.length,0);
});
test('checkpoint and untrusted evidence corruption fail closed',()=>{
 const base=evaluateChanges(null,sentry(),jarvis()).checkpoint;
 for(const bad of [
  {...base,issues:['not-hash']},{...base,issues:[base.issues[0],base.issues[0]]},
  {...base,prs:[...base.prs,base.prs[0]]}, {version:3,issues:[],prs:[]}
 ])assert.throws(()=>evaluateChanges(bad,sentry(),jarvis()),/INVALID_WATCHDOG_CHECKPOINT/);
 for(const [s,j] of [
  [sentry(['100','100']),jarvis()],
  [sentry(),jarvis([{pr:2,headSha:'bad'}])],
  [{...sentry(),completeIssueInventory:true},jarvis()],
  [sentry(),{...jarvis(),remoteWrites:true}]
 ])assert.throws(()=>evaluateChanges(base,s,j));
});
test('disappearance is explicitly snapshot-only and not a false assertion of closure',()=>{
 const baseline=evaluateChanges(null,sentry(),jarvis([{pr:2,headSha:sha}]));
 const r=evaluateChanges(baseline.checkpoint,sentry(),jarvis([]));
 assert.equal(r.alerts[0].type,'JARVIS_PR_NO_LONGER_OPEN_IN_SNAPSHOT');
 assert.equal(r.monitor24x7Deployed,false);
});
