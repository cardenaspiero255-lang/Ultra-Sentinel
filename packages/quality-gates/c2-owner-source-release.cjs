'use strict';
/* C2 release is *permission to inspect one public PR source*, nothing else.
   Upstream Git is never executed by this module and the frozen detector is not imported. */
const {createHash}=require('node:crypto');
const {planC2BulkIntake}=require('./c2-bulk-evidence-intake.cjs');
const {quarantineDisclosureLedger}=require('./c2-prospective-source-preflight.cjs');
const blocked=()=>{throw Error('C2_OWNER_SOURCE_RELEASE_BLOCKED');};
const HEX40=/^[a-f0-9]{40}$/;
const repoPattern=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const fields=(o,s)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===s.length&&s.every(k=>Object.hasOwn(o,k));
const REQUEST_FIELDS=['schema','scope','ownerApproval','sourceManifest','exposureLedger',
 'selectionPolicy','candidate','ownerGithubActorId','ownerRepositoryId',
 'sourceInspectedAtRequest','candidatePredictionsRead','baselinePredictionsRead',
 'sourceReleaseAuthenticated','trainingIndependenceCertified','causalIndependenceCertified',
 'oracleAuthenticated','ruleCompatibilityAuthenticated','truthSealed','newGoldLabels',
 'sssPlusCertified','note'];
const CANDIDATE_FIELDS=['repository','pr','baseSha','headSha','createdAt'];
const RELEASE_SCHEMA='c2-owner-one-source-release-request/v1';
const MANIFEST='docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json';
const EXPOSURES='docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json';
function validateOwnerRelease({roster,exposures,request,api,event}={}){
 try{
  if(!fields(request,REQUEST_FIELDS)||!fields(request.candidate,CANDIDATE_FIELDS)||
   request.schema!==RELEASE_SCHEMA||
   request.scope!=='EXACT_ONE_PUBLIC_EXTERNAL_PR_SOURCE_TRIAGE_ONLY'||
   request.ownerApproval!=='ALLOW_ONE_SOURCE_READ_NO_PREDICTIONS'||
   request.sourceManifest!==MANIFEST||request.exposureLedger!==EXPOSURES||
   request.ownerGithubActorId!==322222186||request.ownerRepositoryId!==1418338512||
   typeof request.selectionPolicy!=='string'||request.selectionPolicy.length<50||
   typeof request.note!=='string'||request.note.length<50||
   request.sourceInspectedAtRequest!==false||
   request.candidatePredictionsRead!==false||request.baselinePredictionsRead!==false||
   request.sourceReleaseAuthenticated!==false||request.trainingIndependenceCertified!==false||
   request.causalIndependenceCertified!==false||request.oracleAuthenticated!==false||
   request.ruleCompatibilityAuthenticated!==false||request.truthSealed!==false||
   request.newGoldLabels!==0||request.sssPlusCertified!==false)blocked();
  const c=request.candidate;
  if(!repoPattern.test(c.repository)||!Number.isSafeInteger(c.pr)||c.pr<=0||
   !HEX40.test(c.baseSha)||!HEX40.test(c.headSha)||
   c.baseSha===c.headSha||typeof c.createdAt!=='string')blocked();
  if(!event||!fields(event,['repositoryId','actorId','ref','eventName','headCommit'])||
   event.repositoryId!==1418338512||event.actorId!==322222186||
   event.ref!=='refs/heads/main'||event.eventName!=='push'||
   !HEX40.test(event.headCommit))blocked();
  if(!api||api.number!==c.pr||api.created_at!==c.createdAt||
   api.base?.sha!==c.baseSha||api.base?.repo?.full_name!==c.repository||
   api.head?.sha!==c.headSha||!['closed','open'].includes(api.state))blocked();
  if(!roster||roster.schema!=='c2-bulk-source-candidate-manifest/v1'||
   roster.candidates?.length!==169||roster.cutoff!=='2026-10-20T19:30:54Z')blocked();
  planC2BulkIntake(roster);
  if(Date.parse(c.createdAt)<=Date.parse(roster.cutoff))blocked();
  const matches=roster.candidates.filter(x=>x.repository===c.repository&&x.pr===c.pr&&
   x.baseSha===c.baseSha&&x.headSha===c.headSha&&x.createdAt===c.createdAt);
  if(matches.length!==1)blocked();
  const quarantined=quarantineDisclosureLedger(roster,exposures);
  if(quarantined.sourceDisclosed!==8||quarantined.uninspectedRemaining!==161||
   exposures.disclosures.some(d=>d.repository.toLowerCase()===c.repository.toLowerCase()&&d.pr===c.pr))blocked();
  // Repository-level training/development exclusions are only preliminary.
  if(new Set(['cardenaspiero255-lang/gamehub-ultra','cardenaspiero255-lang/ultra-sentinel',
   'tasks/tasks','ankidroid/anki-android','detekt/detekt','ktlint/ktlint',
   'pinterest/ktlint','kotlin/kotlin-swe-bench','activitywatch/aw-android'])
   .has(c.repository.toLowerCase()))blocked();
  const requestDigestSha256=createHash('sha256').update(JSON.stringify(request)).digest('hex');
  return Object.freeze({
   schema:'c2-owner-authenticated-source-release/v1',
   status:'OWNER_AUTHENTICATED_SOURCE_READ_ONLY',
   ownerGithubActorId:event.actorId,ownerRepositoryId:event.repositoryId,
   trustedMainCommit:event.headCommit,requestDigestSha256,
   candidate:Object.freeze({...c}),
   sourceReadPermitted:true,sourceExecuted:false,sourceLicenseVerified:false,
   originalGithubGitProvenanceAuthenticated:false,
   trainingIndependenceCertified:false,causalIndependenceCertified:false,
   ruleCompatibilityAuthenticated:false,sourceOracleAuthenticated:false,
   truthSealed:false,holdoutFrozen:false,newGoldLabels:0,
   candidatePredictionsRead:false,detectorPredictionsRead:false,baselinePredictionsRead:false,
   precision:null,recall:null,f1:null,tripleSPlusCertified:false,
   limitation:'Owner event authorizes inspection only; live Git provenance, license, causal independence, rule-path-line applicability and original/fixed/benign oracle require separate subsequent evidence.'
  });
 }catch{blocked();}
}
function verifySourceFileScope(release,files){
 if(!release||release.schema!=='c2-owner-authenticated-source-release/v1'||
  release.sourceReadPermitted!==true||release.newGoldLabels!==0||
  !Array.isArray(files)||files.length<1||files.length>50)blocked();
 const seen=new Set();
 for(const f of files){
  if(!fields(f,['filename','status','sha','additions','deletions','changes'])||
   typeof f.filename!=='string'||f.filename.length>260||
   !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(f.filename)||
   f.filename.split('/').some(s=>s==='..'||s==='.')||
   seen.has(f.filename)||!HEX40.test(f.sha)||
   !['added','modified'].includes(f.status)||
   ![f.additions,f.deletions,f.changes].every(Number.isSafeInteger)||
   f.additions<0||f.deletions<0||f.changes!==f.additions+f.deletions)blocked();
  seen.add(f.filename);
 }
 return Object.freeze({
  schema:'c2-owner-source-file-scope/v1',
  changedFiles:files.length,sourceReadPermitted:true,
  changedPaths:files.map(x=>x.filename),sourceOracleAuthenticated:false,
  ruleCompatibilityAuthenticated:false,causalIndependenceCertified:false,
  newGoldLabels:0,truthSealed:false,tripleSPlusCertified:false
 });
}
module.exports={validateOwnerRelease,verifySourceFileScope};
