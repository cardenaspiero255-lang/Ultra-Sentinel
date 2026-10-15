'use strict';
/* Deterministic health transition evaluator; no I/O, GitHub writes, or secrets.
 * Every alert is emitted only for a change from a previously committed state.
 */
const crypto=require('node:crypto');
const SHA=/^[a-f0-9]{40}$/,ID=/^[1-9][0-9]{0,18}$/;
function fail(reason){throw Error(reason);}
const fingerprint=(value)=>crypto.createHash('sha256').update(value).digest('hex').slice(0,24);
function snapshot({sentry,jarvis,gamehub=null}={}){
 if(!sentry||sentry.schema!=='ultra-sentinel-sentry-sample/v1'||
  sentry.sampleOnly!==true||sentry.completeIssueInventory!==false||
  !Array.isArray(sentry.issues)||sentry.issues.length>25||
  !jarvis||jarvis.schema!=='ultra-sentinel-jarvis-readonly/v1'||
  jarvis.repository!=='cardenaspiero255-lang/JARVIS'||
  jarvis.remoteWrites!==false||!Array.isArray(jarvis.openPrs)||
  jarvis.openPrs.length>=30)
  fail('UNTRUSTED_WATCHDOG_EVIDENCE');
 const issues=[],seenIssues=new Set();
 for(const issue of sentry.issues){
  if(!issue||!ID.test(issue.issueId||'')||issue.projectId!==sentry.projectId||
   seenIssues.has(issue.issueId))fail('INVALID_SENTRY_SNAPSHOT');
  seenIssues.add(issue.issueId);
  issues.push(fingerprint(sentry.projectId+'/'+issue.issueId));
 }
 const prs=[],seenPrs=new Set();
 for(const pr of jarvis.openPrs){
  if(!pr||!Number.isSafeInteger(pr.pr)||pr.pr<=0||
   !SHA.test(pr.headSha||'')||seenPrs.has(pr.pr))
   fail('INVALID_JARVIS_SNAPSHOT');
  seenPrs.add(pr.pr);
  prs.push({pr:pr.pr,headSha:pr.headSha});
 }
 issues.sort();prs.sort((a,b)=>a.pr-b.pr);
 if(gamehub!==null){
  if(!gamehub||gamehub.schema!=='ultra-sentinel-gamehub-live-sample/v1'||
    gamehub.repository!=='cardenaspiero255-lang/gamehub-ultra'||
    gamehub.source!=='github-api-readonly'||gamehub.completePrInventory!==false||
    gamehub.autoCommit!==false||gamehub.autoMerge!==false||
    (gamehub.selection!==null&&(!gamehub.selection||
     !Number.isSafeInteger(gamehub.selection.pr)||gamehub.selection.pr<=0||
     !SHA.test(gamehub.selection.headSha||''))))
    fail('UNTRUSTED_GAMEHUB_SAMPLE');
 }
 const selection=gamehub?.selection||null;
 return Object.freeze({version:1,issues:Object.freeze(issues),
  prs:Object.freeze(prs.map(x=>Object.freeze(x))),
  gamehub:selection===null?null:Object.freeze({pr:selection.pr,headSha:selection.headSha})});
}
function validateCheckpoint(prior){
 if(prior===null)return null;
 if(!prior||prior.version!==1||!Array.isArray(prior.issues)||
  prior.issues.length>25||!Array.isArray(prior.prs)||prior.prs.length>=30)
  fail('INVALID_WATCHDOG_CHECKPOINT');
 const issueSet=new Set();
 for(const h of prior.issues){
  if(typeof h!=='string'||!/^[a-f0-9]{24}$/.test(h)||issueSet.has(h))
   fail('INVALID_WATCHDOG_CHECKPOINT');
  issueSet.add(h);
 }
 const prSet=new Set();
 for(const v of prior.prs){
  if(!v||!Number.isSafeInteger(v.pr)||v.pr<=0||!SHA.test(v.headSha||'')||
   prSet.has(v.pr))fail('INVALID_WATCHDOG_CHECKPOINT');
  prSet.add(v.pr);
 }
 if(prior.gamehub!==undefined&&prior.gamehub!==null&&
  (!Number.isSafeInteger(prior.gamehub.pr)||prior.gamehub.pr<=0||
   !SHA.test(prior.gamehub.headSha||'')))fail('INVALID_WATCHDOG_CHECKPOINT');
 return prior;
}
function evaluateChanges(prior,sentry,jarvis,gamehub=null){
 const next=snapshot({sentry,jarvis,gamehub});
 const previous=validateCheckpoint(prior);
 if(previous===null)return Object.freeze({
  status:'BASELINE_INITIALIZED_NO_ALERT',checkpoint:next,alerts:Object.freeze([]),
  alertDeliveryConfigured:false,monitor24x7Deployed:false
 });
 const oldIssues=new Set(previous.issues),oldPrs=new Map(previous.prs.map(x=>[x.pr,x.headSha]));
 const nowPrs=new Set(next.prs.map(x=>x.pr)),alerts=[];
 for(const id of next.issues){
  if(!oldIssues.has(id))alerts.push(Object.freeze({type:'NEW_SENTRY_ISSUE',fingerprint:id}));
 }
 for(const pr of next.prs){
  if(!oldPrs.has(pr.pr))alerts.push(Object.freeze({type:'JARVIS_PR_OPENED',pr:pr.pr}));
  else if(oldPrs.get(pr.pr)!==pr.headSha)
   alerts.push(Object.freeze({type:'JARVIS_PR_HEAD_CHANGED',pr:pr.pr,headSha:pr.headSha}));
 }
 for(const pr of previous.prs){
  if(!nowPrs.has(pr.pr))
   alerts.push(Object.freeze({type:'JARVIS_PR_NO_LONGER_OPEN_IN_SNAPSHOT',pr:pr.pr}));
 }
 const oldGamehub=previous.gamehub||null,newGamehub=next.gamehub;
 if(previous.gamehub===undefined){
  // Migration from checkpoints predating GameHub monitoring: baseline quietly.
 }else if(newGamehub!==null&&oldGamehub===null){
  alerts.push(Object.freeze({type:'GAMEHUB_PR_SAMPLE_SELECTED',pr:newGamehub.pr,
   headSha:newGamehub.headSha}));
 }else if(newGamehub===null&&oldGamehub!==null){
  alerts.push(Object.freeze({type:'GAMEHUB_SAMPLE_NOW_IDLE'}));
 }else if(newGamehub!==null&&oldGamehub!==null&&newGamehub.pr!==oldGamehub.pr){
  alerts.push(Object.freeze({type:'GAMEHUB_PR_SAMPLE_CHANGED',pr:newGamehub.pr,
   headSha:newGamehub.headSha}));
 }else if(newGamehub!==null&&oldGamehub!==null&&
  newGamehub.headSha!==oldGamehub.headSha){
  alerts.push(Object.freeze({type:'GAMEHUB_PR_HEAD_CHANGED',pr:newGamehub.pr,
   headSha:newGamehub.headSha}));
 }
 if(alerts.length>40)fail('WATCHDOG_ALERT_OVERFLOW');
 return Object.freeze({status:alerts.length?'CHANGES_OBSERVED':'NO_CHANGES',
  checkpoint:next,alerts:Object.freeze(alerts),
  alertDeliveryConfigured:false,monitor24x7Deployed:false});
}
module.exports={evaluateChanges,snapshot,validateCheckpoint};
