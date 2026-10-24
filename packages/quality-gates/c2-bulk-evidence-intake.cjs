'use strict';
/*
 * C2 ONE-SHOT, METADATA-ONLY candidate planner and untrusted oracle receipt
 * quarantine. Never analyzes a prospective candidate source file or opens
 * a detector prediction. The existing nine source-scoped historical labels
 * are a documented prerequisite, NOT reauthenticated by this module.
 *
 * A successful execution MUST NOT increment the GOLD population. Admission
 * requires a distinct owner-authenticated workflow with original source
 * SHA, independent original/fix/benign oracles and causal adjudication.
 */
const {createHash}=require('node:crypto');
const LOCK=require('../../docs/quality/C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const HEAD=/^[0-9a-f]{40}$/;
const HASH=/^[0-9a-f]{64}$/;
const REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const PATH=/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/;
const RULE=/^[A-Z][A-Z0-9_]{2,110}$/;
const PRIOR=9, TARGET=120, MAX=512;
const INPUT_FIELDS=['schema','cutoff','candidates'];
const CANDIDATE_FIELDS=['repository','pr','baseSha','headSha','createdAt','source','disclosure'];
const RECEIPT_FIELDS=[
 'schema','repository','pr','headSha','sourceBlobSha','rule','path','line',
 'positive','originalJUnitSha256','fixedJUnitSha256','benignJUnitSha256',
 'witnessSha256','causalFingerprintSha256','state',
 'detectorPredictionsRead','baselinePredictionsRead'
];
const blocked=()=>{throw Error('C2_BULK_INTAKE_BLOCKED');};
const exact=(x,fields)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===fields.length&&fields.every(k=>Object.hasOwn(x,k));
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const badSegment=p=>p==='.'||p==='..'||p.startsWith('.')||p.endsWith('.')||
 p.includes('..')||p.includes('\\')||p.includes('%');
const validRepo=repository=>typeof repository==='string'&&REPO.test(repository)&&
 !repository.split('/').some(badSegment)&&repository.length<=125;
const validPath=path=>typeof path==='string'&&PATH.test(path)&&
 !path.split('/').some(badSegment)&&path.length<=240;
const key=c=>c.repository.toLowerCase()+'#'+c.pr;
function validCandidate(c,cutoff,locked){
 if(!exact(c,CANDIDATE_FIELDS)||!validRepo(c.repository)||
    !Number.isSafeInteger(c.pr)||c.pr<=0||!HEAD.test(c.baseSha)||
    !HEAD.test(c.headSha)||c.baseSha===c.headSha||
    c.source!=='PROSPECTIVE_GITHUB'||c.disclosure!=='METADATA_ONLY'||
    typeof c.createdAt!=='string'||!/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(c.createdAt)||
    !Number.isFinite(Date.parse(c.createdAt))||Date.parse(c.createdAt)<=cutoff)blocked();
 const repo=c.repository.toLowerCase();
 if(new Set([
  'cardenaspiero255-lang/gamehub-ultra','cardenaspiero255-lang/ultra-sentinel',
  'kotlin/kotlin-swe-bench','tasks/tasks','ankidroid/anki-android',
  'detekt/detekt','ktlint/ktlint','pinterest/ktlint'
 ]).has(repo))blocked();
 if(NEW_LOCK.cases.some(p=>p.headSha===c.headSha||p.baseSha===c.baseSha))blocked();
 const prior=locked.get(key(c));
 if(prior&&JSON.stringify(prior)!==JSON.stringify(c))blocked();
}
function planC2BulkIntake(manifest,{shards=16}={}){
 if(!exact(manifest,INPUT_FIELDS)||manifest.schema!=='c2-bulk-source-candidate-manifest/v1'||
   manifest.cutoff!==LOCK.cutoff||!Array.isArray(manifest.candidates)||
   manifest.candidates.length>MAX||
   !Number.isSafeInteger(shards)||shards<1||shards>32)blocked();
 const cutoff=Date.parse(manifest.cutoff);
 const locked=new Map(LOCK.candidates.map(c=>[key(c),c]));
 const seen=new Set(),heads=new Set();
 const rows=manifest.candidates.map(c=>{
  validCandidate(c,cutoff,locked);
  if(seen.has(key(c))||heads.has(c.headSha))blocked();
  seen.add(key(c));heads.add(c.headSha);
  return {...c};
 }).sort((a,b)=>key(a).localeCompare(key(b),'en')||
  a.headSha.localeCompare(b.headSha,'en'));
 const slices=Array.from({length:shards},(_,i)=>({id:'shard-'+String(i+1).padStart(2,'0'),candidates:[]}));
 rows.forEach((c,i)=>slices[i%shards].candidates.push(c));
 return {
  schema:'c2-bulk-evidence-intake-plan/v1',phase:'METADATA_ONLY',
  candidatePoolDigestSha256:digest({schema:manifest.schema,cutoff:manifest.cutoff,candidates:rows}),
  cutoff:manifest.cutoff,requestedShards:shards,sourceCandidates:rows.length,
  shards:slices.filter(s=>s.candidates.length>0),
  previousSealedTruth:PRIOR,priorTruthReauthenticatedHere:false,
  targetGoldLabels:TARGET,additionalTruthNeeded:TARGET-PRIOR,
  sourceInspected:false,candidatePredictionsRead:false,
  baselinePredictionsRead:false,holdoutFrozen:false,
  newGoldLabels:0,precision:null,recall:null,f1:null,
  tripleSPlusCertified:false,autoMergeAllowed:false,
  verdict:'METADATA_ONLY_ORACLES_PENDING'
 };
}
function reviewC2BulkReceipts(plan,receipts){
 if(!plan||plan.schema!=='c2-bulk-evidence-intake-plan/v1'||
   !Array.isArray(plan.shards)||!Array.isArray(receipts)||
   receipts.length>MAX)blocked();
 const rows=plan.shards.flatMap(s=>s.candidates);
 const reconstructed=planC2BulkIntake({
  schema:'c2-bulk-source-candidate-manifest/v1',
  cutoff:plan.cutoff,candidates:rows
 },{shards:plan.requestedShards});
 if(JSON.stringify(reconstructed)!==JSON.stringify(plan))blocked();
 const roster=new Map(rows.map(c=>[key(c),c]));
 const observed=new Set(),witnesses=new Set(),causes=new Set();
 for(const c of receipts){
  if(!exact(c,RECEIPT_FIELDS)||c.schema!=='c2-bulk-original-oracle-receipt/v1'||
    !validRepo(c.repository)||!Number.isSafeInteger(c.pr)||c.pr<=0||
    !HEAD.test(c.headSha)||!HEAD.test(c.sourceBlobSha)||c.headSha===c.sourceBlobSha||
    !RULE.test(c.rule)||!validPath(c.path)||
    !Number.isSafeInteger(c.line)||c.line<1||c.line>1000000||
    typeof c.positive!=='boolean'||c.state!=='ORIGINAL_SOURCE_TRANSITION_REPORTED'||
    c.detectorPredictionsRead!==false||c.baselinePredictionsRead!==false||
    ![c.originalJUnitSha256,c.fixedJUnitSha256,c.benignJUnitSha256,
      c.witnessSha256,c.causalFingerprintSha256].every(v=>typeof v==='string'&&HASH.test(v)))blocked();
  const id=key(c),row=roster.get(id);
  if(!row||row.headSha!==c.headSha||observed.has(id)||
    witnesses.has(c.witnessSha256)||causes.has(c.causalFingerprintSha256))blocked();
  observed.add(id);witnesses.add(c.witnessSha256);
  causes.add(c.causalFingerprintSha256);
 }
 return {
  schema:'c2-bulk-evidence-intake-quarantine/v1',
  status:'SOURCE_CLAIMS_QUARANTINED_NOT_CERTIFIED',
  candidatePoolDigestSha256:plan.candidatePoolDigestSha256,
  candidatesPlanned:rows.length,receiptsReviewed:receipts.length,
  claimsAwaitingOwnerAuthentication:receipts.length,
  missing:rows.length-receipts.length,
  previousDocumentedTruth:PRIOR,priorTruthReauthenticatedHere:false,
  newGoldLabels:0,totalGoldLabels:PRIOR,remaining:TARGET-PRIOR,
  sourceOracleAuthenticated:false,originalBehaviorIndependentlyValidated:false,
  causalIndependenceCertified:false,truthSealed:false,holdoutFrozen:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  autoMergeAllowed:false,autoRepairAllowed:false,
  limitation:'Neither source oracle receipts nor their GitHub run/artifact/JUnit/git-blob identity are authenticated by this offline planner. A separate owner-only source-original oracle and causal-review gate is mandatory before any candidate is admitted as GOLD.'
 };
}
module.exports={planC2BulkIntake,reviewC2BulkReceipts};
