'use strict';
// Immutable additional PR IDs, metadata-only triage. Never read PR titles,
// bodies, patches or source, or invoke detector predictions / original oracles.
const {remainingCandidates155,rankSourceFreeV3}=require('./c2-155-integrity-first-ranker.cjs');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const manifestPath=path.resolve(__dirname,'../../docs/quality/C2-44-NEW-EXTERNAL-PRESEAL-20261024.json');
const lockedNewManifest=require('../../docs/quality/C2-44-NEW-EXTERNAL-PRESEAL-20261024.json');
const LOCKED_GIT_BLOB='a51c679023a792ba4fce54731d13970946a18678';
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
const expectedRepos={
 'FossifyOrg/Gallery':1,'FossifyOrg/Calendar':1,'Thunderbird/thunderbird-android':3,
 'AntennaPod/AntennaPod':2,'zhanghai/MaterialFiles':1,'element-hq/element-x-android':14,
 'StreetComplete/StreetComplete':6,'beemdevelopment/Aegis':2,
 'TeamNewPipe/NewPipe':8,'FossifyOrg/Camera':1,'organicmaps/organicmaps':5
};
const deny=()=>{throw Error('C2_44_NEW_EXTERNAL_BLOCKED');};
const key=x=>x.repository.toLowerCase()+'#'+x.pr;
const hex40=/^[a-f0-9]{40}$/;
const name=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const equal=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const exact=(x,fields)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===fields.length&&fields.every(f=>Object.hasOwn(x,f));
const candidateFields=['repository','pr','baseSha','headSha','createdAt','source','disclosure'];
const inputFields=[...candidateFields,'status','files'];
const manifestFields=['schema','frozenPriorCorpusDigest','oldCohortCandidates',
 'oldCohortSourceUninspected','previouslySourceExposed','cutoff',
 'latestCreationAllowed','discoveryMethod','selection','perRepositoryCap',
 'newCandidateCount','originalRepoOverlapCount','sourceInspected',
 'candidatePredictionsRead','baselinePredictionsRead','originalOracleExecuted',
 'truthSealed','newGoldLabels','sssPlusCertified','candidates'];
function auditExpandedPreseal(manifest,old={}){
 try{
  // SHA1 is Git's content-addressed blob identity, NOT a security signature.
  // Protected owner main/CI authenticates the commit containing the preregistered blob.
  const bytes=fs.readFileSync(manifestPath);
  const gitBlob=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  if(gitBlob!==LOCKED_GIT_BLOB||!equal(manifest,lockedNewManifest))deny();
  if(!exact(manifest,manifestFields)||
   manifest.schema!=='c2-additional-external-metadata-preseal/v1'||
   manifest.frozenPriorCorpusDigest!=='abeba6b0be1d84f34fa9c2d2cfc4b4c211f48538'||
   manifest.oldCohortCandidates!==169||manifest.oldCohortSourceUninspected!==155||
   manifest.previouslySourceExposed!==14||manifest.newCandidateCount!==44||
   manifest.originalRepoOverlapCount!==0||manifest.cutoff!=='2026-10-20T19:30:54Z'||
   manifest.latestCreationAllowed!=='2026-10-25T00:44:00Z'||
   manifest.discoveryMethod!=='PUBLIC_GITHUB_PULL_REQUEST_LIST_METADATA_ONLY'||
   typeof manifest.selection!=='string'||manifest.selection.length<20||
   manifest.sourceInspected!==false||manifest.candidatePredictionsRead!==false||
   manifest.baselinePredictionsRead!==false||manifest.originalOracleExecuted!==false||
   manifest.truthSealed!==false||manifest.newGoldLabels!==0||manifest.sssPlusCertified!==false||
   !equal(manifest.perRepositoryCap,expectedRepos)||
   !Array.isArray(manifest.candidates)||manifest.candidates.length!==44||
   !old||!old.roster||!equal(old.roster,roster))deny();
  const previous=remainingCandidates155({
   roster:old.roster,eight:old.eight,dispositions:old.dispositions,
   nextcloud:old.nextcloud,excluded:old.excluded
  });
  if(previous.length!==155)deny();
  const allPrior=new Set(roster.candidates.map(key));
  const priorRepos=new Set(roster.candidates.map(x=>x.repository.toLowerCase()));
  const ids=new Set(),heads=new Set(),counter={};
  for(const c of manifest.candidates){
   if(!exact(c,candidateFields)||!name.test(c.repository)||!Number.isSafeInteger(c.pr)||
    c.pr<1||!hex40.test(c.headSha)||!hex40.test(c.baseSha)||
    c.baseSha===c.headSha||c.source!=='PROSPECTIVE_GITHUB'||
    c.disclosure!=='METADATA_ONLY'||typeof c.createdAt!=='string'||
    c.createdAt<=manifest.cutoff||c.createdAt>manifest.latestCreationAllowed||
    !Object.hasOwn(expectedRepos,c.repository)||priorRepos.has(c.repository.toLowerCase())||
    allPrior.has(key(c))||ids.has(key(c))||heads.has(c.headSha))deny();
   ids.add(key(c));heads.add(c.headSha);
   counter[c.repository]=(counter[c.repository]||0)+1;
  }
  if(!equal(counter,Object.fromEntries(Object.entries(expectedRepos).filter(([k])=>counter[k]).sort((a,b)=>a[0].localeCompare(b[0]))))){ 
   // Only numerical caps matter; the separately pinned enumeration remains exact.
   if(Object.entries(counter).some(([k,v])=>v!==expectedRepos[k]))deny();
  }
  if(Object.entries(expectedRepos).some(([r,n])=>counter[r]!==n))deny();
  return Object.freeze({schema:'c2-new-44-preseal-authentic-structural/v1',
   newCandidates:44,oldPreviouslyExposed:14,
   totalUniqueOriginalPlusNew:213,untouchedCombined:199,
   externalProjects:11,sourceReadAuthorized:false,
   independentCausesCertified:0,newGoldLabels:0,truthSealed:false,
   limitation:'Git PR identity and metadata are not evidence of a defect, oracle or training independence.'});
 }catch{deny();}
}
function assessNewExternalBatch(manifest,old,observations){
 try{
  const admission=auditExpandedPreseal(manifest,old);
  if(!Array.isArray(observations)||observations.length!==44)deny();
  const map=new Map(manifest.candidates.map(x=>[key(x),x]));
  const seen=new Set(),results=[];
  for(const x of observations){
   if(!exact(x,inputFields))deny();
   const cand=map.get(key(x));if(!cand||seen.has(key(x)))deny();seen.add(key(x));
   if(!candidateFields.every(k=>x[k]===cand[k])||
    !['MATCHED','DRIFT','INCOMPLETE','API_ERROR'].includes(x.status)||
    !Array.isArray(x.files)|| (x.status!=='MATCHED'&&x.files.length!==0))deny();
   const slim={repository:x.repository,pr:x.pr,baseSha:x.baseSha,
    headSha:x.headSha,createdAt:x.createdAt,status:x.status,files:x.files};
   const out=rankSourceFreeV3(slim,cand);
   if(out.newGoldLabels!==0||out.sourceReadAuthorized!==false||
    out.exactRulePathLineConfirmed!==false||out.detectorPredictionsRead!==false)deny();
   results.push(out);
  }
  if(seen.size!==44)deny();
  const good=results.filter(r=>r.rankScore!==null);
  const hinted=good.filter(r=>r.rankScore>0);
  const categories={};for(const r of results)categories[r.eligibility]=(categories[r.eligibility]||0)+1;
  return Object.freeze({schema:'c2-new-44-external-sourcefree-metadata-rank/v1',
   status:'FILENAME_HINTS_ONLY_NO_SOURCE_RELEASE_NO_GOLD',
   newProjects:11,candidatesExamined:44,
   oldUntouched:155,newUntouched:44,combinedUntouched:199,
   previouslySourceExposed:14,totalRegistered:213,
   matchedCandidates:good.length,apiUnavailable:44-good.length,
   mechanismHinted:hinted.length,ownerGateRequiredCount:hinted.length,
   countsByDisposition:categories,
   shortlist:[...hinted].sort((a,b)=>b.rankScore-a.rankScore||
    a.candidate.repository.localeCompare(b.candidate.repository)||
    a.candidate.pr-b.candidate.pr).slice(0,10),
   observations:results,
   sourceReadAuthorized:false,sourceInspected:false,
   originalOracleExecuted:false,truthSealed:false,
   candidatePredictionsRead:false,detectorPredictionsRead:false,
   baselinePredictionsRead:false,newGoldLabels:0,sssPlusCertified:false,
   limitation:'Metadata-only GitHub snapshot. All actual source reads require separately authenticated owner-only source release and independent original/fix/benign JUnit oracles; filenames never mint GOLD.'});
 }catch{deny();}
}
module.exports={auditExpandedPreseal,assessNewExternalBatch};
