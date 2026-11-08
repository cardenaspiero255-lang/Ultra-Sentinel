'use strict';
/* Draft a single syntactic change for a narrow unregistered Kotlin pattern.
 * This is not an authorization, a Kotlin compiler, or a functional Judge. */
const {scanNovelKotlinHypotheses,blobSha}=require('./novel-kotlin-hypotheses.cjs');
const {planNovelKotlinCandidates}=require('./novel-kotlin-candidate-intake.cjs');
const RULE='BOUNDED_READ_ZERO_PROGRESS';
function blocked(){return Object.freeze({status:'BLOCKED_NO_UNAMBIGUOUS_DRAFT',
 originalFunctionalOracleVerified:false,remoteWrites:false,mergeAllowed:false});}
function draftBoundedReadProgressRepair({expectedCommitSha,file}={}){
 try{
  const observed=scanNovelKotlinHypotheses({expectedCommitSha,files:[file]});
  if(observed.status.startsWith('BLOCKED_'))return blocked();
  const hits=observed.findings.filter(f=>f.rule===RULE);
  if(hits.length!==1)return blocked();
  const lines=file.source.split('\n'),index=hits[0].line-1;
  const guard=lines[index];
  const match=typeof guard==='string'&&guard.match(
   /^(\s*if\s*\()\s*([A-Za-z_]\w*)\s*>\s*([A-Za-z_]\w*)\s*\|\|\s*\2\s*<\s*-1\s*\)\s*throw\s+IOException\s*\(/);
  if(!match)return blocked();
  // Add a check to the existing exception condition without changing the
  // source's zero-length read branch or granting execution rights.
  lines[index]=guard.replace(match[1],match[1]+match[2]+' == 0 || ');
  const candidateSource=lines.join('\n'),candidateBlobSha=blobSha(candidateSource);
  const plan=planNovelKotlinCandidates({expectedCommitSha,files:[file],proposals:[{
   path:file.path,rule:RULE,candidateSource,expectedCandidateBlobSha:candidateBlobSha
  }]});
  if(plan.status!=='CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE'||
   plan.candidates.length!==1)return blocked();
  return Object.freeze({status:'CANDIDATE_REQUIRES_TRUSTED_ORIGINAL_ORACLE',
   rule:RULE,path:file.path,line:hits[0].line,familyId:hits[0].familyId,
   sourceBlobSha:file.expectedBlobSha,candidateBlobSha,candidateSource,
   sourceGitRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
   productionReleaseAllowed:false});
 }catch{return blocked();}
}
module.exports={draftBoundedReadProgressRepair};
