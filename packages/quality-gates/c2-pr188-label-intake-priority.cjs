'use strict';
/* Intake is public upstream metadata, not gold truth or a blind holdout.
 * Reuse the already authenticated 106-directory upstream Git object.
 */
const crypto=require('node:crypto');
const {metadataOnlyCandidateIndex,UPSTREAM}=require('./c2-kotlin-upstream-candidate-index.cjs');
const {buildEvidenceQueue}=require('./c2-upstream-evidence-queue.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const blocked=()=>{throw Error('C2_PR188_PRIORITIZATION_BLOCKED');};
const GATES=Object.freeze([
 'ORIGINAL_UPSTREAM_PARENT_AND_SOURCE_PROVENANCE',
 'ORIGINAL_BEFORE_TEST_FAILS',
 'ORIGINAL_FIXED_TEST_PASSES_WITH_NORMAL_CONTROLS',
 'RULE_APPLICABILITY_AND_INDEPENDENT_CAUSAL_MECHANISM',
 'HISTORICAL_CORPUS_DEDUP_AND_NO_CROSS_SPLIT_CONTAMINATION',
 'LICENSE_AND_DISTRIBUTION_PROVENANCE',
 'CLASS_SPECIFIC_ORACLE_POSITIVE_OR_MUTATION_SENSITIVE_NEGATIVE'
]);
function makePrioritizedIntake(roster){
 try{
  if(!roster||Object.keys(roster).sort().join(',')!=='entries,source,sourceCommit,tasksTreeSha'||
   roster.source!==UPSTREAM.repository||roster.sourceCommit!==UPSTREAM.commit||
   roster.tasksTreeSha!=='7e6c0a3c10c8f082b8f7a9c5efbcc51c360356a9'||
   !Array.isArray(roster.entries)||roster.entries.length!==106)blocked();
  const listing=roster.entries.map(x=>{
   if(!x||Object.keys(x).sort().join(',')!=='name,sha'||typeof x.name!=='string'||
    typeof x.sha!=='string')blocked();
   return {type:'dir',name:x.name,path:'tasks/'+x.name,sha:x.sha,
    _links:{git:'https://api.github.com/git/trees/'+x.sha}};
  });
  const index=metadataOnlyCandidateIndex(Buffer.from(JSON.stringify(listing)));
  const authenticated=buildEvidenceQueue(index,[]);
  if(authenticated.tasks!==106||authenticated.receiptsNeedingIndependentReview!==0||
   authenticated.newLabels!==0||authenticated.blindHoldout!==false||
   index.sourceCommit!==roster.sourceCommit||index.candidateCount!==106)blocked();
  const picked=new Set(),pilot=[];
  const choose=(repository,limit)=>{
   const rows=index.candidates.filter(x=>x.upstreamRepo===repository).slice(0,limit);
   if(rows.length!==limit)blocked();
   for(const c of rows){
    if(picked.has(c.upstreamTask))blocked();
    picked.add(c.upstreamTask);pilot.push(c);
   }
  };
  choose('detekt/detekt',6);
  choose('pinterest/ktlint',3);
  for(const repository of [
   'oss-review-toolkit/ort','Hannah-Sten/TeXiFy-IDEA','ankidroid/Anki-Android',
   'Kotlin/dataframe','square/okhttp','GradleUp/shadow','linreal/cascade-editor'
  ])choose(repository,1);
  if(pilot.length!==16||picked.size!==16)blocked();
  const toRow=(c,sequence)=>Object.freeze({
   order:sequence,task:c.upstreamTask,repository:c.upstreamRepo,
   taskTreeSha:c.upstreamTreeSha,originalLicenseReported:c.originalProjectLicenseReported,
   publicBenchmarkDisclosure:'REVEALED_NOT_BLIND',
   sourceOriginalVerified:false,reproductionStatus:'PENDING_ORIGINAL_TEST_REPLAY',
   causesIndependentlyCertified:false,licenseVerified:false,groundTruthAdmitted:false,
   blindHoldoutEligible:false,
   gates:GATES.map(name=>({name,status:'PENDING'}))
  });
  const full=[...pilot,...index.candidates.filter(c=>!picked.has(c.upstreamTask))];
  if(full.length!==106||new Set(full.map(x=>x.upstreamTask)).size!==106)blocked();
  const rows=full.map((c,i)=>toRow(c,i+1));
  const plan=Object.freeze({
   schema:'c2-pr188-prioritized-106-public-kotlin-source-intake/v1',
   status:'SOURCE_METADATA_PILOT_READY_NO_AUTHENTIC_NEW_LABELS',
   sourceRepository:UPSTREAM.repository,sourceCommit:UPSTREAM.commit,
   sourceTasksTreeSha:roster.tasksTreeSha,
   sourceIndexSha256:index.indexSha256,
   uniqueRepositories:9,candidatesTotal:106,
   pilot:rows.slice(0,16),remaining:rows.slice(16),
   publicBenchmarkDisclosure:'REVEALED_NOT_BLIND',
   evidenceRequiredBeforeAdmission:[...GATES],
   nextExecution:'Reproduce original BEFORE/AFTER pinned upstream cases in source-isolated test runners, retain logs and verify causal labels without using disclosed gold cases as unseen holdout.',
   existingHistoricalLabels:23,additionalTargetLowerBound:97,
   independentCausesCertified:0,newLabels:0,blindHoldout:false,
   precision:null,recall:null,f1:null,tripleSPlusCertified:false
  });
  return Object.freeze({...plan,planSha256:sha(JSON.stringify(plan))});
 }catch(e){if(e?.message==='C2_PR188_PRIORITIZATION_BLOCKED')throw e;blocked();}
}
module.exports={GATES,makePrioritizedIntake};
