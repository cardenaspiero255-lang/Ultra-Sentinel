'use strict';
// Metadata-only provenance gate. Never loads a detector, its predictions or ground-truth labels.
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const BASELINE_LOCK=Object.freeze({
 schema:'ultra-sentinel-c2-preregistered-predecessor-baseline/v1',
 selectionRule:'IMMEDIATE_FIRST_PARENT_BEFORE_FIRST_POST_UNBLIND_REGRESSION_REPAIR',
 sha:'3c97b60717f6a08ddc7d618587202537d62bc951',
 candidateSha:NEW_LOCK.engineSourceSha,
 candidateParentSha:'3c97b60717f6a08ddc7d618587202537d62bc951',
 coreBlob:'db29f94be1e0afb791a241d26f449695df0eafd0',
 semanticBlob:'b8b6e79c1c544a9c22ea5aa0ea857881a0e1b6d9',
 candidateSemanticBlob:'7df2a994f566ad56bdacab999fa6ba83b69e3b4d',
 selectionMayNotDependOnHoldoutScores:true,
 predictionsInspected:false,
 baselineExecuted:false
});
const ALLOWED_FIELDS=new Set(['sha','filename','status','additions','deletions','changes',
 'blob_url','raw_url','contents_url','patch']);
const PATH=/^[A-Za-z0-9_.\/-]{1,350}$/;
const HEX40=/^[0-9a-f]{40}$/;
function fail(){throw Error('C2_SOURCE_UNIVERSE_BLOCKED');}
function sha(x){return crypto.createHash('sha256').update(x).digest('hex');}
function verifyEightSourceCompares(comparisons){
 if(!Array.isArray(comparisons)||comparisons.length!==NEW_LOCK.cases.length)fail();
 const cases=[];let count=0;
 for(let i=0;i<NEW_LOCK.cases.length;i++){
  const lock=NEW_LOCK.cases[i],c=comparisons[i];
  if(!c||typeof c!=='object'||Array.isArray(c)||
    c.status!=='ahead'||c.base_commit?.sha!==lock.baseSha||
    c.merge_base_commit?.sha!==lock.baseSha||
    !Array.isArray(c.commits)||c.commits.length<1||
    c.commits.at(-1)?.sha!==lock.headSha||
    !Array.isArray(c.files)||c.files.length!==lock.changedFiles)fail();
  const seen=new Set();
  const files=c.files.map(f=>{
   if(!f||typeof f!=='object'||Array.isArray(f)||
     Object.keys(f).some(k=>!ALLOWED_FIELDS.has(k))||
     typeof f.filename!=='string'||!PATH.test(f.filename)||
     f.filename.startsWith('/')||f.filename.split('/').includes('..')||
     f.filename.includes('//')||seen.has(f.filename)||
     !['added','modified','removed'].includes(f.status)||
     !HEX40.test(f.sha)||typeof f.patch!=='string'||!f.patch.length||
     !f.patch.includes('@@')||
     !Number.isSafeInteger(f.additions)||f.additions<0||
     !Number.isSafeInteger(f.deletions)||f.deletions<0||
     (Object.hasOwn(f,'changes')&&f.changes!==f.additions+f.deletions))fail();
   seen.add(f.filename);
   return Object.freeze({path:f.filename,status:f.status,headBlobSha:f.sha,
    additions:f.additions,deletions:f.deletions,patchSha256:sha(Buffer.from(f.patch,'utf8')),
    githubPatchBytes:Buffer.byteLength(f.patch,'utf8')});
  }).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  count+=files.length;
  cases.push(Object.freeze({pr:lock.pr,baseSha:lock.baseSha,headSha:lock.headSha,
   changedFiles:lock.changedFiles,sourceFileMetadataCount:files.length,files:Object.freeze(files)}));
 }
 if(count!==241)fail();
 const unsigned={schema:'ultra-sentinel-c2-frozen-source-inventory/v1',
  repository:NEW_LOCK.repository,
  packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
  candidateSourceSha:NEW_LOCK.engineSourceSha,
  legacyBaselineSha:BASELINE_LOCK.sha,
  cases,changedFileEntries:count,sourceMetadataVerified:true,
  sourceBlobBytesMaterialized:false,
  engineExecutionPerformed:false,truthLabelsAdded:0,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,tripleSPlusCertified:false};
 return Object.freeze({...unsigned,sourceInventorySha256:sha(JSON.stringify(unsigned))});
}
module.exports={verifyEightSourceCompares,BASELINE_LOCK};
