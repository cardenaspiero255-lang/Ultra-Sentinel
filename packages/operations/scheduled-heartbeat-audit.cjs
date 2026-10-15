'use strict';
/** Pure, offline audit of serverless schedule-run metadata. This never certifies an SLA.
 * It must be run by a separate observer: a stopped GitHub Actions workflow
 * cannot raise its own missed-heartbeat alert. */
const WORKFLOW='Ultra Sentinel — serverless GitHub observer';
const PATH='.github/workflows/serverless-github-monitor.yml';
const SHA=/^[0-9a-f]{40}$/;
const TIME=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
const MAX_RUNS=500;
function fail(){throw Error('INVALID_SCHEDULE_EVIDENCE');}
function timestamp(value){
 if(typeof value!=='string'||!TIME.test(value))fail();
 const ms=Date.parse(value);
 if(!Number.isFinite(ms))fail();
 return ms;
}
function auditScheduledHeartbeat({runs,now,expectedSha,maxGapMinutes=120,minSamples=3}={}){
 if(!Array.isArray(runs)||runs.length>MAX_RUNS||!SHA.test(expectedSha||'')||
  !Number.isSafeInteger(maxGapMinutes)||maxGapMinutes<30||maxGapMinutes>1440||
  !Number.isSafeInteger(minSamples)||minSamples<2||minSamples>30)fail();
 const current=timestamp(now),seen=new Set(),samples=[];
 for(const r of runs){
  if(!r||typeof r!=='object'||Array.isArray(r))fail();
  if(r.event!=='schedule'||r.name!==WORKFLOW||r.path!==PATH||r.head_branch!=='main')continue;
  if(!Number.isSafeInteger(r.id)||r.id<1||seen.has(r.id)||!SHA.test(r.head_sha||''))fail();
  seen.add(r.id);
  const created=timestamp(r.created_at);
  if(created>current)fail();
  if(r.status!=='completed')continue;
  if(!['success','failure','cancelled','timed_out','action_required','neutral','skipped'].includes(r.conclusion))fail();
  samples.push({id:r.id,at:created,headSha:r.head_sha,conclusion:r.conclusion});
 }
 samples.sort((a,b)=>b.at-a.at||b.id-a.id);
 let maxGap=0;
 for(let i=1;i<samples.length;i++)maxGap=Math.max(maxGap,(samples[i-1].at-samples[i].at)/60000);
 const latestAge=samples.length?(current-samples[0].at)/60000:null;
 const failed=samples.filter(x=>x.conclusion!=='success').length;
 let verdict;
 if(samples.length<minSamples)verdict='INSUFFICIENT_SCHEDULE_EVIDENCE';
 else if(latestAge>maxGapMinutes)verdict='SCHEDULE_OVERDUE';
 else if(maxGap>maxGapMinutes)verdict='SCHEDULE_GAP';
 else if(failed)verdict='SCHEDULE_FAILURE_NEEDS_LOG_REVIEW';
 else if(samples.some(x=>x.headSha!==expectedSha))verdict='STALE_WORKFLOW_SHA';
 else verdict='PUNCTUALITY_OBSERVED_NOT_24X7';
 return Object.freeze({schema:'ultra-sentinel-scheduled-heartbeat-audit/v1',
  verdict,expectedSha,latestRunId:samples[0]?.id??null,
  sampleCount:samples.length,latestAgeMinutes:latestAge===null?null:Math.round(latestAge*100)/100,
  maxGapMinutes:Math.round(maxGap*100)/100,failedCount:failed,
  sourceAuthenticityVerified:false,certified24x7:false,
  note:'Offline check of supplied GitHub metadata only. Verify source API provenance and use an external alert observer; Actions cron has no guaranteed SLA.'});
}
module.exports={auditScheduledHeartbeat};
