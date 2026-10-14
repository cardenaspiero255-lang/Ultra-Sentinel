'use strict';
const {createHash}=require('node:crypto');
const {getCuratedPlaybookById}=require('../memory/ultra_sentinel_memory.cjs');
const {searchVerified}=require('../memory/ultra_sentinel_memory_ledger.cjs');
const HEX=/^[a-f0-9]{40}$/i;
function recommendation(finding,analysis){
 if(!finding||typeof finding!=='object'||!analysis||!HEX.test(analysis.sha||''))throw Error('INCOMPLETE_EVIDENCE');
 const r=analysis.remediations;
 if(!r||r.sha!==analysis.sha||r.verified!==false||r.autoMerge!==false||!Array.isArray(r.suggestions))throw Error('INCOMPLETE_EVIDENCE');
 const suggestion=r.suggestions.find(x=>x.rule===finding.rule&&x.path===finding.path&&x.line===finding.line);
 if(!suggestion||suggestion.autofix!==false||suggestion.status!=='DRAFT_REQUIRES_VALIDATION')throw Error('INCOMPLETE_EVIDENCE');
 const evidence=(suggestion.relatedEvidence||[]).map(x=>{
  if(x.type!=='playbook'||x.verification!=='curated_playbook'||x.evidenceUrl!==null)throw Error('UNTRUSTED_EVIDENCE');
  const curated=getCuratedPlaybookById(x.id);
  if(!curated||curated.rule!==x.rule||curated.domain!==x.domain||curated.advice.slice(0,380)!==x.advice)throw Error('UNTRUSTED_EVIDENCE');
  return Object.freeze({id:curated.id,kind:'curated_playbook',verifiedFix:false});
 });
 return Object.freeze({sha:analysis.sha,rule:finding.rule,path:finding.path,line:finding.line,
  status:'HUMAN_REVIEW_REQUIRED',autoCommit:false,autoMerge:false,
  steps:Object.freeze([...suggestion.steps]),evidence:Object.freeze(evidence)});
}
async function historicalContext(query,ledger){
 const items=await searchVerified(query,ledger);
 return Object.freeze(items.map(x=>Object.freeze({id:x.id,kind:'curated_playbook',verifiedFix:false})));
}
module.exports={recommendation,historicalContext};
