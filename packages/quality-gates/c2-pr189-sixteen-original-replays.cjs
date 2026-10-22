'use strict';
/*
 * C2 PR189. Selected original tests are public development evidence, never
 * unseen gold. This layer validates receipts but does not execute upstream
 * source or self-attest causal independence.
 */
const crypto=require('node:crypto');
const {makePrioritizedIntake}=require('./c2-pr188-label-intake-priority.cjs');
const {metadataOnlyCandidateIndex}=require('./c2-kotlin-upstream-candidate-index.cjs');
const {reviewCampaign}=require('./c2-upstream-acceptance.cjs');
const roster=require('../../tests/fixtures/c2-upstream-106-task-tree.json');
const fail=()=>{throw Error('C2_PR189_PILOT_BLOCKED');};
const stat=['TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED',
 'INFRA_BLOCKED','REPRODUCTION_MISMATCH','NO_DECLARED_REGRESSION'];
function selection(){
 const x=makePrioritizedIntake(roster);
 if(x.candidatesTotal!==106||x.pilot.length!==16||x.remaining.length!==90||
  x.sourceTasksTreeSha!=='7e6c0a3c10c8f082b8f7a9c5efbcc51c360356a9'||
  x.newLabels!==0||x.blindHoldout!==false)fail();
 return x;
}
function pilotMatrix(){
 try{
  const s=selection(),groups=new Map();
  for(const c of s.pilot){
   const project=c.task.replace(/-[0-9]+$/,'');
   if(!groups.has(project))groups.set(project,[]);
   groups.get(project).push(c.task);
  }
  if(groups.size!==9)fail();
  const include=[];
  for(const [project,tasks] of groups){
   tasks.sort();
   for(let i=0;i<tasks.length;i+=3){
    const id=project.toLowerCase().replace(/[^a-z0-9_-]/g,'-')+'-'+(Math.floor(i/3)+1);
    include.push(Object.freeze({id,project,tasks:tasks.slice(i,i+3)}));
   }
  }
  if(include.length!==10||
   new Set(include.map(x=>x.id)).size!==10||
   new Set(include.flatMap(x=>x.tasks)).size!==16)fail();
  return Object.freeze({schema:'c2-pr189-pilot-matrix/v1',include,
   sourceSha:s.sourceCommit,originalCount:16,notSelectedCount:90,
   newLabels:0,blindHoldout:false});
 }catch{fail();}
}
function adjudicatePilot(receipts){
 try{
  const plan=selection(),expected=new Set(plan.pilot.map(x=>x.task));
  if(!Array.isArray(receipts)||receipts.length!==16)fail();
  const seen=new Set();
  for(const r of receipts){
   if(!r||!expected.has(r.task)||seen.has(r.task)||!stat.includes(r.status))fail();
   seen.add(r.task);
  }
  const listing=roster.entries.map(x=>({type:'dir',name:x.name,path:'tasks/'+x.name,
   sha:x.sha,_links:{git:'https://api.github.com/git/trees/'+x.sha}}));
  const index=metadataOnlyCandidateIndex(Buffer.from(JSON.stringify(listing)));
  const review=reviewCampaign(index,receipts,{requireComplete:false});
  if(review.receiptsSeen!==16||review.missing!==90||review.newLabels!==0||
   review.admitted!==0||review.tripleSPlusCertified!==false||
   review.blindHoldout!==false)fail();
  const byName=new Map(receipts.map(r=>[r.task,r]));
  const counts=Object.fromEntries(stat.map(s=>[s,receipts.filter(r=>r.status===s).length]));
  const candidates=plan.pilot.map(item=>{
   const rec=byName.get(item.task);
   const reviewing=review.candidates.find(c=>c.task===item.task);
   if(!rec||!reviewing||reviewing.admittedLabel!==false)fail();
   return Object.freeze({
    task:item.task,repository:item.repository,taskTreeSha:item.taskTreeSha,
    originalReceiptStatus:rec.status,
    transitionCount:rec.status===stat[0]?rec.candidateTransitions:0,
    originalBeforeCommitClaim:rec.sourceCommitClaim||null,
    patchedAfterCommitClaim:rec.fixedCommitClaim||null,
    receiptSha256:rec.receiptSha256||null,
    sourceOriginalVerified:false,rootCauseIndependenceVerified:false,
    detectorApplicabilityVerified:false,licenseCommercialUseVerified:false,
    historicalDedupStatus:'SEMANTIC_DEDUP_PENDING',
    class:'NOT_ADJUDICATED_POSITIVE_OR_NEGATIVE',
    negativeControlMutationSensitive:false,
    admittedLabel:false,blindHoldoutEligible:false,
    nextGate:rec.status===stat[0]?
     'ORIGINAL_SOURCE_PARENT_AND_CAUSAL_RULE_AND_HISTORICAL_DEDUP':
     rec.status==='INFRA_BLOCKED'?'FIX_INFRA_AND_REPLAY':
     rec.status==='REPRODUCTION_MISMATCH'?'INVESTIGATE_ORIGINAL_JUNIT_MISMATCH':
      'FIND_VALID_DECLARED_FAIL_TO_PASS_OR_SAFE_NEGATIVE_ORACLE'
   });
  });
  if(candidates.length!==16||Object.values(counts).reduce((a,b)=>a+b,0)!==16)fail();
  const out={
   schema:'c2-pr189-sixteen-original-source-candidate-replay-triage/v1',
   status:'SIXTEEN_PUBLIC_SOURCE_CANDIDATES_CLASSIFIED_NO_GOLD_ADMISSIONS',
   pinnedSource:'Kotlin/kotlin-swe-bench',
   sourceCommit:plan.sourceCommit,sourceTreeSha:plan.sourceTasksTreeSha,
   candidateCount:16,remainingUntouched:90,counts,candidates,
   sourceLabels:23,newLabels:0,independentlyCertifiedCausesAdded:0,
   prospectiveBlindHoldout:false,blindHoldout:false,
   precision:null,recall:null,f1:null,sssPlusCertified:false,
   note:'Authentic upstream test transitions are untrusted until the original ancestor, source provenance, detector rule, independent causal root, license and historic semantic dedup are checked. Public benchmark cases may not enter prospective blind holdout.'
  };
  const digest=crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
  return Object.freeze({...out,triageSha256:digest});
 }catch(e){if(e?.message==='C2_PR189_PILOT_BLOCKED')throw e;fail();}
}
module.exports={pilotMatrix,adjudicatePilot};
