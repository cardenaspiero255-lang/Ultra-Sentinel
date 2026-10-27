'use strict';
const {createHash}=require('node:crypto');
const {resolveMode}=require('../family-hunter/ultra_sentinel_family_hunter_modes.cjs');
const SHA=/^[a-f0-9]{40}$/i;
function planRepair({analysis,mode='REVIEW_WITH_SOLUTIONS',authorization=null}={}){
 const policy=resolveMode(mode);
 if(!analysis||!SHA.test(analysis.sha||'')||!analysis.coverage||analysis.coverage.partial||
    analysis.verdict==='INCOMPLETE'||!analysis.remediations||analysis.remediations.sha!==analysis.sha)
  return Object.freeze({status:'BLOCKED_INCOMPLETE',commitAllowed:false,mergeAllowed:false,steps:[]});
 if(policy.status==='INVALID_MODE')return Object.freeze({status:'BLOCKED_MODE',commitAllowed:false,mergeAllowed:false,steps:[]});
 if(mode==='REVIEW_ONLY')return Object.freeze({status:'REVIEW_ONLY',commitAllowed:false,mergeAllowed:false,steps:[]});
 const suggestions=analysis.remediations.suggestions;
 if(!Array.isArray(suggestions)||suggestions.some(s=>s.autofix!==false||s.status!=='DRAFT_REQUIRES_VALIDATION'))
  return Object.freeze({status:'BLOCKED_EVIDENCE',commitAllowed:false,mergeAllowed:false,steps:[]});
 // Authorization is intentionally NOT an execution capability. M6 only creates
 // a human-supervised plan. Actual writes require a separately reviewed adapter.
 const authorized=mode==='REPAIR_COMMITS_AUTHORIZED'&&authorization&&
  authorization.kind==='EXPLICIT_HUMAN_APPROVAL'&&authorization.sha===analysis.sha;
 return Object.freeze({status:authorized?'AWAITING_SEPARATE_EXECUTOR':'HUMAN_REVIEW_REQUIRED',
  commitAllowed:false,mergeAllowed:false,
  steps:Object.freeze(suggestions.map(s=>Object.freeze({rule:s.rule,path:s.path,line:s.line,
   test:s.test,autofix:false})))});
}

// Read-only investigative handoff; never upgrades an approval object into an
// execution, merge, remote-write or production-release capability.
function planSupervisedCrossFileInvestigation({
 beforeCore,afterCore,mode='REVIEW_WITH_SOLUTIONS',authorization=null
}={}){
 const {planCrossFileInterventions}=require('../family-hunter/cross-file-interventions.cjs');
 const hypothesis=planCrossFileInterventions(beforeCore,afterCore);
 const modePolicy=resolveMode(mode);
 const proposal=planRepair({analysis:afterCore,mode,authorization});
 let status=hypothesis.status;
 if(modePolicy.status==='INVALID_MODE'||proposal.status.startsWith('BLOCKED_'))
  status='BLOCKED_REPAIR_PLAN';
 else if(hypothesis.status==='EXPERIMENTS_REQUIRED')
  status='REPRODUCTION_AND_JUDGE_REQUIRED';
 const eligible=new Set(hypothesis.candidates.flatMap(c=>
  c.files.map(file=>JSON.stringify([c.rule,file]))));
 const steps=status==='REPRODUCTION_AND_JUDGE_REQUIRED'&&mode!=='REVIEW_ONLY'?
  proposal.steps.filter(s=>eligible.has(JSON.stringify([s.rule,s.path])))
   .map(s=>Object.freeze({rule:s.rule,path:s.path,line:s.line,
    test:s.test,autofix:false})): [];
 return Object.freeze({
  schema:'ultra-sentinel-supervised-cross-file-investigation/v1',
  status,baseSha:hypothesis.baseSha,headSha:hypothesis.headSha,
  candidates:hypothesis.candidates,
  repairSteps:Object.freeze(steps),
  ownerReviewRequired:true,externalOracleVerified:false,
  causalityVerified:false,commitAllowed:false,mergeAllowed:false,
  productionReleaseAllowed:false,
  limitation:'Run each proposed subset against original-source reproductions; the owner and a separate trusted executor must approve any real repair.'
 });
}

module.exports={planRepair,planSupervisedCrossFileInvestigation};
