'use strict';
const crypto=require('node:crypto');
const {UPSTREAM,PROJECTS}=require('./c2-kotlin-upstream-candidate-index.cjs');
const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
// Independent upstream attestation: Git SHA of the 106-dir tasks/ tree at the
// pinned Kotlin/kotlin-swe-bench commit, not an index-provided checksum.
const PINNED_TASKS_TREE_SHA='7e6c0a3c10c8f082b8f7a9c5efbcc51c360356a9';
function fail(){throw Error('C2_EVIDENCE_QUEUE_REJECTED');}
function authenticatedCandidateTree(candidates){
 const names=new Set(),trees=new Set(),entries=[];
 for(const c of candidates){
  if(!c||typeof c.upstreamTask!=='string'||typeof c.upstreamRepo!=='string'||
     !SHA40.test(c.upstreamTreeSha||'')||
     c.status!=='UPSTREAM_TASK_CANDIDATE_NOT_A_LABEL'||
     names.has(c.upstreamTask)||trees.has(c.upstreamTreeSha))fail();
  const prefix=Object.keys(PROJECTS).find(k=>c.upstreamTask.startsWith(k+'-'));
  if(!prefix||!/^[1-9][0-9]*$/.test(c.upstreamTask.slice(prefix.length+1))||
     c.upstreamRepo!==PROJECTS[prefix].repository)fail();
  names.add(c.upstreamTask);trees.add(c.upstreamTreeSha);
  entries.push({name:c.upstreamTask,sha:c.upstreamTreeSha});
 }
 // Git tree serialization, as defined by the Git object format. Every entry
 // is a directory (mode 040000), and its child SHA must match upstream.
 entries.sort((a,b)=>Buffer.compare(Buffer.from(a.name),Buffer.from(b.name)));
 const raw=Buffer.concat(entries.map(({name,sha})=>Buffer.concat([
  Buffer.from('40000 '+name+'\\0'),Buffer.from(sha,'hex')
 ])));
 const actual=crypto.createHash('sha1')
  .update(Buffer.from('tree '+raw.length+'\\0')).update(raw).digest('hex');
 if(actual!==PINNED_TASKS_TREE_SHA)fail();
 return names;
}
function buildEvidenceQueue(index,receipts=[]){
 if(!index||index.sourceRepository!==UPSTREAM.repository||
  index.sourceCommit!==UPSTREAM.commit||index.candidateCount!==106||
  index.groundTruthSourceLabels!==0||index.blindHoldout!==false||
  !Array.isArray(index.candidates)||index.candidates.length!==106||
  !Array.isArray(receipts)||receipts.length>106)fail();
 const {indexSha256,...packet}=index;
 if(sha256(JSON.stringify(packet))!==indexSha256)fail();
 // An attacker may recompute indexSha256. Only the independently pinned Git
 // tree hash authenticates all 106 names, directory SHAs and repo mappings.
 authenticatedCandidateTree(index.candidates);
 const items=new Map(index.candidates.map(c=>[c.upstreamTask,c]));
 const seen=new Set(),newCauses=new Set();
 for(const r of receipts){
  const c=items.get(r?.upstreamTask);
  if(!c||seen.has(r.upstreamTask)||r.sourceTreeSha!==c.upstreamTreeSha||
     !SHA40.test(r.beforeCommit||'')||!SHA40.test(r.fixedCommit||'')||
     r.beforeCommit===r.fixedCommit||
     !SHA64.test(r.beforeFailureDigest||'')||
     !SHA64.test(r.afterPassDigest||'')||
     !SHA64.test(r.originalTestDigest||'')||
     !SHA64.test(r.rootCauseDigest||'')||
     newCauses.has(r.rootCauseDigest)||
     r.detectorIndependent!==true||r.licenseReviewed!==true||
     r.originalReproductionVerified!==true||
     r.correctedVersionPassVerified!==true||
     r.stage!=='EVIDENCE_REVIEW_REQUIRED')fail();
  seen.add(r.upstreamTask);newCauses.add(r.rootCauseDigest);
 }
 // Crucial: the original 23 historical root-cause identities have not been
 // loaded as an independently authenticated manifest. New-only uniqueness
 // does NOT prove independence from that corpus. Keep all such receipts
 // explicitly quarantined, never admitted to the review-ready set.
 return Object.freeze({
  schema:'ultra-sentinel-c2-reproduction-queue/v1',
  sourceIndexSha256:indexSha256,sourceTasksTreeSha:PINNED_TASKS_TREE_SHA,
  tasks:106,receiptsNeedingIndependentReview:0,
  receiptsAwaitingHistoricalDedup:seen.size,
  unverified:106-seen.size,
  historicalLabels:23,positive:11,negative:12,
  remaining:97,positiveMinimum:37,negativeMinimum:36,diversityMinimum:24,
  newLabels:0,blindHoldout:false,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  status:'SOURCE_REPRODUCTION_NOT_YET_CERTIFIED',
  queue:[...items.values()].map(c=>({
   task:c.upstreamTask,repository:c.upstreamRepo,
   treeSha:c.upstreamTreeSha,
   status:seen.has(c.upstreamTask)?'HISTORICAL_CAUSE_COMPARISON_REQUIRED':'SOURCE_REPRODUCTION_REQUIRED',
   admittedLabel:false
  }))
 });
}
module.exports={buildEvidenceQueue};
