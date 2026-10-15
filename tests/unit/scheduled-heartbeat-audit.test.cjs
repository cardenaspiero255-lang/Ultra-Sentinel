'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {auditScheduledHeartbeat}=require('../../packages/operations/scheduled-heartbeat-audit.cjs');
const SHA='a'.repeat(40), OTHER='b'.repeat(40);
const now='2026-10-15T16:30:00Z';
function sample(time,{event='schedule',conclusion='success',sha=SHA,path='.github/workflows/serverless-github-monitor.yml',name='Ultra Sentinel — serverless GitHub observer',status='completed'}={}) {
 return {id:Math.trunc(Date.parse(time)/1000),event,conclusion,head_sha:sha,
  head_branch:'main',path,name,status,created_at:time};
}
const base=[sample('2026-10-15T16:00:00Z'),sample('2026-10-15T15:30:00Z'),sample('2026-10-15T15:00:00Z')];
const audit=(runs,options={})=>auditScheduledHeartbeat({runs,now,expectedSha:SHA,...options});
test('three successive scheduled runs yield a punctuality observation, never certification',()=>{
 const r=audit(base);assert.equal(r.verdict,'PUNCTUALITY_OBSERVED_NOT_24X7');
 assert.equal(r.sampleCount,3);assert.equal(r.maxGapMinutes,30);
 assert.equal(r.latestAgeMinutes,30);assert.equal(r.certified24x7,false);
});
test('manual and push runs cannot conceal a missing scheduled heartbeat',()=>{
 const r=audit([sample('2026-10-15T16:20:00Z',{event:'workflow_dispatch'}),
   sample('2026-10-15T16:00:00Z',{event:'push'}),sample('2026-10-15T13:00:00Z')]);
 assert.equal(r.verdict,'INSUFFICIENT_SCHEDULE_EVIDENCE');assert.equal(r.sampleCount,1);
});
test('a five-hour interval blocks punctuality even if latest run is recent',()=>{
 const r=audit([sample('2026-10-15T16:00:00Z'),sample('2026-10-15T11:00:00Z'),sample('2026-10-15T10:30:00Z')]);
 assert.equal(r.verdict,'SCHEDULE_GAP');assert.equal(r.maxGapMinutes,300);
});
test('latest schedule failure remains a block requiring job-log review',()=>{
 const r=audit([sample('2026-10-15T16:00:00Z',{conclusion:'failure'}),...base.slice(1)]);
 assert.equal(r.verdict,'SCHEDULE_FAILURE_NEEDS_LOG_REVIEW');assert.equal(r.failedCount,1);
});
test('sha drift is reported rather than treating stale code as validated',()=>{
 const r=audit([sample('2026-10-15T16:00:00Z',{sha:OTHER}),...base.slice(1)]);
 assert.equal(r.verdict,'STALE_WORKFLOW_SHA');
});
test('wrong workflow path and name are never counted',()=>{
 const r=audit([sample('2026-10-15T16:00:00Z',{path:'.github/workflows/other.yml'}),
  sample('2026-10-15T16:00:00Z',{name:'fake'}),...base.slice(1)]);
 assert.equal(r.sampleCount,2);assert.equal(r.verdict,'INSUFFICIENT_SCHEDULE_EVIDENCE');
});
test('future runs and duplicate run IDs fail closed',()=>{
 assert.throws(()=>audit([sample('2026-10-15T16:31:00Z'),...base]),/INVALID_SCHEDULE_EVIDENCE/);
 assert.throws(()=>audit([base[0],base[0],base[1]]),/INVALID_SCHEDULE_EVIDENCE/);
});
test('overdue newest schedule cannot be excused by an earlier healthy window',()=>{
 const r=audit([sample('2026-10-15T13:00:00Z'),sample('2026-10-15T12:30:00Z'),sample('2026-10-15T12:00:00Z')]);
 assert.equal(r.verdict,'SCHEDULE_OVERDUE');assert.equal(r.latestAgeMinutes,210);
});
test('empty and invalid input reject false healthy conclusions',()=>{
 assert.equal(audit([]).verdict,'INSUFFICIENT_SCHEDULE_EVIDENCE');
 assert.throws(()=>audit(null),/INVALID_SCHEDULE_EVIDENCE/);
 assert.throws(()=>audit(base,{expectedSha:'main'}),/INVALID_SCHEDULE_EVIDENCE/);
});
