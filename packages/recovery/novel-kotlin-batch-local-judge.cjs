'use strict';
/** Combine unregistered Kotlin candidate intake with disposable Git Judge. */
const {planNovelKotlinCandidates}=
 require('../investigation/novel-kotlin-candidate-intake.cjs');
const {drillKotlinSourceBatchSandbox}=
 require('./two-source-kotlin-sandbox.cjs');
const MAX_FILES=12;
function outcome(status,cases=[],checkedFiles=0,localGitRollbackVerified=false){
 return Object.freeze({
  schema:'ultra-sentinel-novel-kotlin-batch-local-judge/v1',
  status,checkedFiles,cases:Object.freeze(cases),localGitRollbackVerified,
  hunterFindingsBoundToProposals:checkedFiles>0,
  originalFunctionalOracleVerified:false,functionalRegressionVerified:false,
  crossFileCausalityVerified:false,githubSourceAuthenticated:false,
  ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
  productionReleaseAllowed:false,
  limitation:'Local Git Judge proves only bounded source changes and exact tree rollback. Unregistered Kotlin candidates still require trusted original JVM/Android oracles, benign controls, authenticated remote source and owner approval.'
 });
}
function linesChanged(before,after){
 // A bounded line-level resynchronization permits a safe multi-line fix
 // without accepting an arbitrary rewrite. Syntax success is NEVER a JVM
 // oracle: independently executed original tests remain mandatory.
 const a=before.split('\n'),b=after.split('\n');
 if(a.length>1501||b.length>1501||
  Math.abs(Buffer.byteLength(after)-Buffer.byteLength(before))>1800)return false;
 let i=0,j=0,removed=0,added=0,hunks=0;
 while(i<a.length&&j<b.length){
  if(a[i]===b[j]){i++;j++;continue;}
  let match=null;
  for(let cost=1;cost<=16&&match===null;cost++){
   for(let ra=0;ra<=Math.min(4,cost);ra++){
    const rb=cost-ra;
    if(rb>12||i+ra>=a.length||j+rb>=b.length)continue;
    if(a[i+ra]===b[j+rb]){match={ra,rb};break;}
   }
  }
  if(!match)return false;
  removed+=match.ra;added+=match.rb;hunks++;
  if(removed>3||added>12||hunks>3)return false;
  i+=match.ra;j+=match.rb;
 }
 removed+=a.length-i;added+=b.length-j;
 return hunks>0&&hunks<=3&&removed<=3&&added<=12&&removed+added>0;
}
function drillNovelKotlinCandidateBatch({expectedCommitSha,files,proposals}={}){
 try{
  const plan=planNovelKotlinCandidates({expectedCommitSha,files,proposals});
  if(plan.status!=='CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE'||
   !Array.isArray(plan.candidates)||plan.candidates.length===0||
   plan.candidates.length>MAX_FILES||plan.candidates.length!==proposals.length)
   return outcome('BLOCKED_HUNTER_FIXER_HANDOFF');
  const changes=[],seen=new Set(),cases=[];
  for(const c of plan.candidates){
   if(seen.has(c.path))return outcome('BLOCKED_OVERLAPPING_FILE_CHANGES');
   seen.add(c.path);
   const source=files.find(f=>f.path===c.path);
   const matching=proposals.filter(p=>p.path===c.path&&p.rule===c.rule);
   if(!source||matching.length!==1)return outcome('BLOCKED_UNMATCHED_CANDIDATE');
   const proposal=matching[0];
   if(!linesChanged(source.source,proposal.candidateSource))
    return outcome('BLOCKED_UNBOUNDED_CANDIDATE');
   if(c.originalBlobSha!==source.expectedBlobSha||
    c.candidateBlobSha!==proposal.expectedCandidateBlobSha||
    !c.originalBlobMatched||!c.candidateBlobMatched||
    !c.targetStaticRiskGone)return outcome('BLOCKED_BLOB_EVIDENCE');
   changes.push({path:c.path,before:source.source,after:proposal.candidateSource,
    beforeBlobSha:c.originalBlobSha,afterBlobSha:c.candidateBlobSha});
   cases.push(Object.freeze({path:c.path,rule:c.rule,familyId:c.familyId,
    originalBlobSha:c.originalBlobSha,candidateBlobSha:c.candidateBlobSha,
    staticHypothesisRemoved:true,originalJVMOracleVerified:false}));
  }
  const scratch=drillKotlinSourceBatchSandbox({files:changes});
  if(!scratch.exactTreeRollbackVerified||scratch.checkedFiles!==changes.length||
   !['ONE_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED',
     'TWO_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED',
     'KOTLIN_BATCH_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED'].includes(scratch.status))
   return outcome('BLOCKED_LOCAL_GIT_JUDGE_OR_ROLLBACK');
  return outcome('LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE',
   cases,changes.length,true);
 }catch{return outcome('BLOCKED_INPUT_OR_LOCAL_JUDGE_ERROR');}
}
module.exports=Object.freeze({drillNovelKotlinCandidateBatch});
