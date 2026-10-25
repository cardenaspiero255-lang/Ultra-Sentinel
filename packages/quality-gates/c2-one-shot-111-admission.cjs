'use strict';
/*
 * Bulk one-shot evidence admission, metadata only.
 * Recomputes the 155-source-free ranking from the frozen 169 roster and
 * previously owner-attested 14 exclusions. Never reads source, predicts,
 * authorizes a PR read, runs an oracle, or promotes a new GOLD label.
 */
const {createHash}=require('node:crypto');
const {remainingCandidates155}=require('./c2-155-integrity-first-ranker.cjs');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const eight=require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const dispositions=[
 require('../../docs/quality/C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json'),
 require('../../docs/quality/C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json'),
 require('../../docs/quality/C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024.json')
];
const nextcloud=require('../../docs/quality/C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024.json');
const excluded=[
 require('../../docs/quality/C2-NEXTCLOUD-TALK6946-AUTHENTICATED-DISPOSITION-20261024.json'),
 require('../../docs/quality/C2-NEXTCLOUD6945-POSTSOURCE-20261024.json')
];
const error=()=>{throw Error('C2_ONE_SHOT_ADMISSION_BLOCKED');};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function assessOneShotAdmission(report){
 try{
  if(!report||report.schema!=='c2-source-free-155-integrity-first-ranking/v1'||
    !Array.isArray(report.observations)||report.observations.length!==155||
    report.sourcePreviouslyExposed!==14||report.remainingUntouched!==155||
    report.candidatesExamined!==155||report.originalProspectivePool!==169||
    report.sourceReadAuthorized!==false||report.releasedSource!==false||
    report.candidatePredictionsRead!==false||report.detectorPredictionsRead!==false||
    report.baselinePredictionsRead!==false||report.originalOracleExecuted!==false||
    report.truthSealed!==false||report.newGoldLabels!==0||
    report.tripleSPlusCertified!==false)error();
  // V3 observations are ranked output rows, not the original GitHub input.
  // Re-scoring them would fabricate unavailable per-file metadata. Authenticate
  // the original report in Actions, then verify its structural consistency and
  // *every* frozen Git identity against the original pre-registered cohort.
  const original=remainingCandidates155({roster,eight,dispositions,nextcloud,excluded});
  const locked=new Map(original.map(x=>[x.repository.toLowerCase()+'#'+x.pr,x]));
  const unique=new Set(),categories={};
  for(const row of report.observations){
   if(!row||!row.candidate||typeof row.candidate.repository!=='string'||
    !Number.isSafeInteger(row.candidate.pr))error();
   const candidate=row.candidate;
   const identity=candidate.repository.toLowerCase()+'#'+candidate.pr;
   const expected=locked.get(identity);
   if(!expected||unique.has(identity)||
     !equal(candidate,{repository:expected.repository,pr:expected.pr,
       baseSha:expected.baseSha,headSha:expected.headSha}))error();
   unique.add(identity);
   if(!['MATCHED','DRIFT','API_ERROR','INCOMPLETE'].includes(row.metadataStatus)||
    row.rankScore!==null&&(!Number.isSafeInteger(row.rankScore)||row.rankScore<0||row.rankScore>20)||
    (row.metadataStatus==='MATCHED')!==(row.rankScore!==null)||
    typeof row.eligibility!=='string'||row.newGoldLabels!==0||
    row.sourceReadAuthorized!==false||row.detectorPredictionsRead!==false||
    row.baselinePredictionsRead!==false||row.originalOracleExecuted!==false||
    row.ruleConfirmed!==false||row.exactRulePathLineConfirmed!==false||
    !Array.isArray(row.possibleRuleIds)||!Array.isArray(row.sourcePathHints)||
    row.possibleRuleIds.some(x=>typeof x!=='string'))error();
   categories[row.eligibility]=(categories[row.eligibility]||0)+1;
  }
  const good=report.observations.filter(x=>x.rankScore!==null);
  const hints=good.filter(x=>x.rankScore>0);
  const expectedShortlist=[...hints].sort((a,b)=>b.rankScore-a.rankScore||
    a.candidate.repository.localeCompare(b.candidate.repository)||
    a.candidate.pr-b.candidate.pr).slice(0,12);
  if(unique.size!==155||report.ranked!==good.length||
    report.unavailable!==155-good.length||
    report.mechanismHinted!==hints.length||
    !equal(report.countsByDisposition,categories)||
    !equal(report.shortlist,expectedShortlist)||
    report.scoreVersion!=='c2-integrity-churn-v3'||
    report.status!=='METADATA_ONLY_NEVER_RULE_MATCHED')error();
  const scores=report.observations;
  const retry=scores.filter(x=>x.rankScore===null);
  const bulk=scores.filter(x=>x.eligibility==='BULK_CHURN_PRE_READ_CAUTION');
  const hinted=scores.filter(x=>x.rankScore>0);
  const rest=scores.filter(x=>x.rankScore!==null&&
     x.eligibility!=='BULK_CHURN_PRE_READ_CAUTION'&&x.rankScore===0);
  if(retry.length+bulk.length+hinted.length+rest.length!==155)error();
  const k=x=>x.candidate.repository.toLowerCase()+'#'+x.candidate.pr;
  const rows=[...scores].sort((a,b)=>k(a).localeCompare(k(b)));
  const shards=Array.from({length:32},(_,i)=>({
   shard:'shard-'+String(i+1).padStart(2,'0'),
   candidates:[]
  }));
  for(let i=0;i<rows.length;i++){
   const x=rows[i];
   const status=x.rankScore===null?'RETRY_PINNED_METADATA_ONLY':
     x.eligibility==='BULK_CHURN_PRE_READ_CAUTION'?'MANUAL_SCOPE_REVIEW_NO_READ':
     x.rankScore>0?'NEW_INDIVIDUAL_OWNER_GATE_REQUIRED':
      'NO_COMPATIBLE_FILENAME_HINT';
   shards[i%32].candidates.push({
    repository:x.candidate.repository,pr:x.candidate.pr,
    baseSha:x.candidate.baseSha,headSha:x.candidate.headSha,
    status,sourceReadAuthorized:false,newGoldLabels:0
   });
  }
  return Object.freeze({
   schema:'c2-one-shot-111-bulk-admission/v1',
   status:hinted.length?'AWAIT_INDIVIDUAL_OWNER_GATES_NO_SOURCE':'BLOCKED_NO_RULE_ADMISSIBLE_SOURCE',
   source:'AUTHENTICATED_OWNER_155_RANKING_REPORT',
   reportSha256:digest(report),
   originalProspectivePool:169,sourcePreviouslyExposed:14,sourceCandidates:155,
   totalBatchShards:32,shards,
   comparable:report.ranked,metadataRetryCount:retry.length,
   bulkManualReviewCount:bulk.length,nonHintedCount:rest.length,
   mechanismHinted:hinted.length,ownerGateRequiredCount:hinted.length,
   ownerReleaseEligibleAutomatically:0,authorizedSourceReads:0,
   ownerReleasePermitArtifacts:[],externalOracleReceipts:[],
   originalFixBenignExecuted:0,originalOracleAuthenticated:false,
   causalIndependenceCertified:false,candidateSourceInspected:false,
   autoGoldAdmissionAllowed:false,
   previousDocumentedLabels:9,priorTruthReauthenticatedHere:false,
   documentedLabelTotal:9,neededForThreshold:120,missingAuthenticLabels:111,
   newGoldLabels:0,truthSealed:false,detectorPredictionsRead:false,
   baselinePredictionsRead:false,sssPlusCertified:false,
   nextDecision:'Acquire new prospective external candidate metadata and genuine independently authenticated owner-approved original/fix/benign oracles. Never lower a holdout gate after viewing V3 results.',
   limitation:'32 metadata-only shards are NOT 32 oracle executions. No code read permissions or true labels exist for this batch; 111 authentic new labels cannot be conjured by job fan-out.'
  });
 }catch{error();}
}
module.exports={assessOneShotAdmission};
