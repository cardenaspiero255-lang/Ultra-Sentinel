'use strict';
// Scoped candidate. Migration, product behavior, and Kotlin compilation remain
// independent veto requirements; this never applies a production patch.
const {createHash}=require('node:crypto');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const {isSafeNovelKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
const {scanIdentityDelimiterHypotheses,locateIdentitySites}=
 require('../family-hunter/phase2-identity-delimiter-hunter.cjs');
const SHA=/^[a-f0-9]{40}$/;
const git=s=>{const b=Buffer.from(s,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const blocked=()=>Object.freeze({status:'BLOCKED_IDENTITY_DELIMITER_CANDIDATE',
 originalFunctionalOracleVerified:false,ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});
function draftIdentityDelimiterCandidate(input){
 try{
  const r=snapshotRecord(input,['expectedCommitSha','file','finding']);
  const f=snapshotRecord(r.file,['path','source','expectedBlobSha']);
  const finding=snapshotRecord(r.finding,['rule','path','line','expectedBlobSha','status']);
  if(typeof r.expectedCommitSha!=='string'||!SHA.test(r.expectedCommitSha)||
    typeof f.path!=='string'||!isSafeNovelKotlinPath(f.path)||
    typeof f.source!=='string'||f.source.length<10||Buffer.byteLength(f.source,'utf8')>160000||
    Buffer.from(f.source,'utf8').toString('utf8')!==f.source||
    f.source.includes('\r')||f.source.includes('\0')||
    typeof f.expectedBlobSha!=='string'||!SHA.test(f.expectedBlobSha)||git(f.source)!==f.expectedBlobSha||
    finding.rule!=='AMBIGUOUS_DELIMITED_IDENTITY'||finding.path!==f.path||
    finding.expectedBlobSha!==f.expectedBlobSha||
    finding.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'||
    !Number.isSafeInteger(finding.line)||finding.line<1)return blocked();
  const rescanned=scanIdentityDelimiterHypotheses({expectedCommitSha:r.expectedCommitSha,files:[f]});
  const sites=locateIdentitySites(f.source);
  if(rescanned.status!=='IDENTITY_DELIMITER_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE'||
    rescanned.findings.length!==1||sites.length!==1||sites[0].line!==finding.line||
    sites[0].delimiter!=='¦')return blocked();
  const at=sites[0].insertionOffset;
  const source=f.source.slice(0,at)+'.map { "${it.length}:$it" }'+f.source.slice(at);
  return Object.freeze({status:'CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_AND_MIGRATION_ORACLE',
    path:f.path,originalBlobSha:f.expectedBlobSha,candidateBlobSha:git(source),candidateSource:source,
    originalFunctionalOracleVerified:false,legacyKeyMigrationVerified:false,
    ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});
 }catch{return blocked();}
}
module.exports=Object.freeze({draftIdentityDelimiterCandidate});
