'use strict';
/*
 * Historical DEVELOPMENT provenance ledger. Three previously authenticated
 * owner artifacts are reconciled by exact Git source/rule/line/polarity identity.
 * This is NOT a new Kotlin execution, independent causal oracle, classifier
 * result, or permission to read the prospective Nextcloud source.
 */
const {createHash}=require('node:crypto');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const H40=/^[0-9a-f]{40}$/,H64=/^[0-9a-f]{64}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,110}$/;
const digest=x=>createHash('sha256').update(x).digest('hex');
const fail=()=>{throw Error('C2_HISTORICAL_23_LEDGER_BLOCKED');};
const has=(x,k)=>Object.hasOwn(x,k);
const identity=x=>JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
const valid=x=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Number.isSafeInteger(x.pr)&&x.pr>0&&H40.test(x.headSha)&&
 H40.test(x.blobSha)&&RULE.test(x.rule)&&typeof x.path==='string'&&
 x.path.startsWith('app/')&&!x.path.includes('..')&&
 Number.isSafeInteger(x.line)&&x.line>0&&typeof x.positive==='boolean';
function reconcileFullHistoricalDevelopmentLedger({audit,pending,recovered}={}){
 if(!audit||audit.schema!=='ultra-sentinel-c2-run23-historical-source-chain-audit/v1'||
   audit.repository!==REPO||audit.count!==23||audit.positives!==11||
   audit.negatives!==12||audit.sourceBlobsVerified!==23||
   audit.historicalEvidenceAuthenticated!==false||audit.independenceVerified!==false||
   !Array.isArray(audit.entries)||audit.entries.length!==23||
   !pending||pending.schema!=='c2-run23-12-pending-original-causal-adjudication-queue/v1'||
   pending.count!==23||pending.positives!==11||pending.negatives!==12||
   pending.pending!==12||pending.newLabels!==0||pending.independenceVerified!==false||
   pending.holdoutFrozen!==false||pending.certifiedIndependentCausesAdded!==0||
   !Array.isArray(pending.queue)||pending.queue.length!==12||
   !recovered||recovered.schema!=='c2-run23-ten-original-receipts-recovered/v1'||
   recovered.historicalSourceLabels!==23||recovered.originalBehaviorWitnessesRecovered!==10||
   recovered.missingHistoricalIndividualReceiptsAfterIndependentRecovery!==0||
   recovered.originalHistoricalSealAltered!==false||recovered.historicalEvidenceAuthenticated!==false||
   recovered.independenceVerified!==false||recovered.newLabels!==0||
   recovered.unresolvedCausalGroups!==21||
   !Array.isArray(recovered.entries)||recovered.entries.length!==10)fail();
 const byId=new Map();let positives=0,embedded=0,unresolved=0;
 for(const e of audit.entries){
  if(!valid(e)||e.repository!==REPO||
     !(e.evidenceSha256==null||H64.test(e.evidenceSha256)))fail();
  if(e.rootCauseGroup==null){
    if(e.causalFingerprint!=null)fail();unresolved++;
  }else if(typeof e.rootCauseGroup!=='string'||
   !/^[A-Za-z0-9_.:-]{3,160}$/.test(e.rootCauseGroup)||
   e.causalFingerprint!==digest('c2-cause/v1\0'+REPO+'\0'+e.rootCauseGroup))fail();
  const key=identity(e);if(byId.has(key))fail();
  byId.set(key,e);
  if(e.evidenceSha256)embedded++;
  if(e.positive)positives++;
 }
 if(byId.size!==23||positives!==11||embedded!==13||unresolved!==21)fail();
 const assigned=new Map();
 for(const q of pending.queue){
  if(!valid(q)||!H64.test(q.sealedOriginalEvidenceSha256)||
   q.hasSealedEvidenceSha256!==true||q.identity!==identity(q)||
   q.conclusion!=='UNVERIFIED_NOT_ADMITTED'||q.independentCauseCertified!==false||
   q.eligibleForGold!==false||q.eligibleForBlindHoldout!==false)fail();
  const original=byId.get(q.identity);
  if(!original||assigned.has(q.identity)||original.blobSha!==q.blobSha||
   original.evidenceSha256!==q.sealedOriginalEvidenceSha256)fail();
  assigned.set(q.identity,{witnessCategory:'RUN23_ARCHIVED_AND_12_QUEUE',
   originalEvidenceSha256:original.evidenceSha256,originalWitnessSha256:null,
   sourceRunId:null});
 }
 for(const w of recovered.entries){
  const key=JSON.stringify([w.pr,w.sourceHeadSha,w.ruleId,w.path,w.line,w.positive]);
  const original=byId.get(key);
  if(!original||assigned.has(key)||original.evidenceSha256!==null||
   original.blobSha!==w.sourceBlobSha||
   !H64.test(w.artifactSha256)||!H64.test(w.originalWitnessSha256)||
   !Number.isSafeInteger(w.sourceRunId)||w.sourceRunId<1||
   !Number.isSafeInteger(w.artifactId)||w.artifactId<1||
   w.status!=='ORIGINAL_BEHAVIOR_RECEIPT_RECOVERED_CAUSAL_ADJUDICATION_PENDING')fail();
  assigned.set(key,{witnessCategory:'RECOVERED_ORIGINAL_WITNESS',
   originalEvidenceSha256:null,originalWitnessSha256:w.originalWitnessSha256,
   sourceRunId:w.sourceRunId,archiveDigestSha256:w.artifactSha256,
   originalArtifactId:w.artifactId});
 }
 if(assigned.size!==22)fail();
 const residual=[...byId.keys()].filter(k=>!assigned.has(k));
 if(residual.length!==1||!H64.test(byId.get(residual[0]).evidenceSha256))fail();
 assigned.set(residual[0],{witnessCategory:'RUN23_ARCHIVED_RESIDUAL_UNADJUDICATED',
  originalEvidenceSha256:byId.get(residual[0]).evidenceSha256,
  originalWitnessSha256:null,sourceRunId:null});
 const entries=[...assigned].map(([key,w])=>{
  const e=byId.get(key);
  return Object.freeze({identity:key,pr:e.pr,headSha:e.headSha,blobSha:e.blobSha,
   rule:e.rule,path:e.path,line:e.line,positive:e.positive,
   ...w,originalProvisionalRootCauseGroup:e.rootCauseGroup??null,
   eligibleForGold:false,causalIndependenceCertified:false});
 }).sort((a,b)=>a.identity<b.identity?-1:a.identity>b.identity?1:0);
 const ledgerSha256=digest(entries);
 return Object.freeze({
  schema:'c2-historical-23-traceability-ledger/v1',
  status:'ALL_23_LINKED_IN_HISTORICAL_DEVELOPMENT_PROVENANCE_CAUSAL_REVIEW_OPEN',
  sourceRepository:REPO,historicalIdentities:23,positives:11,negatives:12,
  queueMatchedEmbeddedReceipts:12,recoveredExternalReceiptLinks:10,
  residualEmbeddedReceipts:1,unresolvedCausalAssignments:21,
  verifiedIndependentCausalFamilies:0,originalSourceOraclesExecutedThisRun:0,
  evidenceAuthenticatedByThisPureFunction:false,
  evidenceAuthenticatedByCallerOnly:false,
  candidateSourceInspected:false,candidatePredictionsRead:false,
  baselinePredictionsRead:false,nextcloudSourceReleaseAuthorized:false,
  newGoldLabels:0,scoredNegatives:0,precision:null,recall:null,
  f1:null,falsePositiveRate:null,holdoutFrozen:false,sssPlusCertified:false,
  ledgerSha256,entries:Object.freeze(entries),
  remaining:'Authenticate each input artifact and original source witness in trusted GitHub owner workflow; adjudicate 21 historical unassigned causal groups with real independent intervention; Nextcloud remains unopened.'
 });
}
module.exports={reconcileFullHistoricalDevelopmentLedger};
