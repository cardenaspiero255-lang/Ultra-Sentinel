'use strict';
/* GitHub commit SHA is NOT sufficient to attribute checks to a PR.
 * Pin the check run to the exact target PR, head and base repo/sha.
 * This is a provenance consistency filter, not CI authenticity. */
const REPO='cardenaspiero255-lang/gamehub-ultra';
const SHA=/^[a-f0-9]{40}$/;
function bindChecksToPr({headSha,baseSha,pr,raw}={}){
 if(!SHA.test(headSha||'')||!SHA.test(baseSha||'')||
  !Number.isSafeInteger(pr)||pr<1||!raw||typeof raw!=='object'||
  !Number.isSafeInteger(raw.total_count)||raw.total_count<1||
  raw.total_count>100||!Array.isArray(raw.check_runs)||
  raw.check_runs.length!==raw.total_count)
  throw Error('INCOMPLETE_CHECK_PROVENANCE');
 const ids=new Set(),runs=[];
 for(const check of raw.check_runs){
  if(!check||!Number.isSafeInteger(check.id)||check.id<1||ids.has(check.id)||
   check.head_sha!==headSha||!Array.isArray(check.pull_requests))
   throw Error('INCOMPLETE_CHECK_PROVENANCE');
  ids.add(check.id);
  const linked=check.pull_requests.filter(x=>x?.number===pr&&
   x.head?.sha===headSha&&x.base?.sha===baseSha&&
   x.head?.repo?.url==='https://api.github.com/repos/'+REPO&&
   x.base?.repo?.url==='https://api.github.com/repos/'+REPO);
  if(linked.length!==1)throw Error('CROSS_PR_CHECK_CONTAMINATION');
  runs.push({name:check.name,status:check.status,conclusion:check.conclusion,
   id:check.id});
 }
 return Object.freeze({pr,headSha,baseSha,runs});
}
module.exports={bindChecksToPr};
