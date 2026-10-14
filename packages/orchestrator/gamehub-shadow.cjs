'use strict';
/* Shadow comparison is read-only diagnostic evidence, NOT ground truth. */
const REPO='cardenaspiero255-lang/gamehub-ultra';
const SHA=/^[a-f0-9]{40}$/;
const BASELINE=Object.freeze(['Sentinel Core / full regression suite',
 'Ultra Sentinel Core — own reviewer']);
function summarizeShadow(review,checks){
 if(!review||review.envelope?.targetRepo!==REPO||!SHA.test(review.envelope.headSha||'')||
  review.authenticated!==true||review.headStable!==true||
  review.completeDiff!==true||review.mergeAllowed!==false||
  !checks||checks.headSha!==review.envelope.headSha||
  checks.pr!==review.pr||checks.baseSha!==review.baseSha||
  !Array.isArray(checks.runs)||checks.runs.length>100)
  throw Error('INVALID_SHADOW_EVIDENCE');
 const grouped={success:0,failure:0,pending:0,skipped:0};
 const nameCount=new Map();
 for(const c of checks.runs){
  if(!c||typeof c.name!=='string'||typeof c.status!=='string'||
   !['queued','in_progress','completed','waiting','requested','pending'].includes(c.status)||
   (c.status==='completed'&&typeof c.conclusion!=='string'))
   throw Error('INVALID_GITHUB_CHECK');
  nameCount.set(c.name,(nameCount.get(c.name)||0)+1);
  if(c.status!=='completed')grouped.pending++;
  else if(c.conclusion==='success')grouped.success++;
  else if(c.conclusion==='skipped'||c.conclusion==='neutral')grouped.skipped++;
  else grouped.failure++;
 }
 const baseline=BASELINE.map(name=>{
  const matches=checks.runs.filter(c=>c.name===name);
  return {name,status:matches.length!==1?'INCOMPLETE':matches[0].status==='completed'?
   matches[0].conclusion==='success'?'SUCCESS':'NOT_GREEN':'PENDING'};
 });
 return Object.freeze({schema:'ultra-sentinel-shadow/v1',
  targetRepo:REPO,pr:review.pr,headSha:review.envelope.headSha,
  reviewerVerdict:review.envelope.verdict,
  sourceGate:grouped.failure>0?'BLOCKED_SOURCE_CI':grouped.pending>0?'PENDING_SOURCE_CI':
   baseline.every(x=>x.status==='SUCCESS')?'OBSERVED_NOT_CERTIFIED':'BASELINE_INCOMPLETE',
  baseline,checks:grouped,
  comparableByName:baseline.every(x=>x.status==='SUCCESS'),
  semanticEquivalenceVerified:false,independentAuditVerified:false,
  changedFiles:review.changedFiles,autoRepair:false,autoMerge:false});
}
module.exports={summarizeShadow};
