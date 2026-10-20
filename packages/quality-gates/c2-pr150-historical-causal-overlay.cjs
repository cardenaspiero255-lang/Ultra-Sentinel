'use strict';
/*
 * Additive, immutable DEVELOPMENT-only view over authenticated Run23.
 * NEVER rewrite source truth; provisional family != independently admitted
 * cause and may not be counted toward 120-label/benchmark requirements.
 */
const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {EXPECTED}=require('./c2-run23-ten-receipt-recovery.cjs');
const {adjudicateMatrix}=require('./c2-pr150-causal-matrix.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const SHA64=/^[a-f0-9]{64}$/;
const SHA40=/^[a-f0-9]{40}$/;
const hash=s=>createHash('sha256').update(s).digest('hex');
const failure=()=>{throw Error('C2_PR150_HISTORICAL_OVERLAY_BLOCKED');};
const PROVISIONAL_FAMILY='RECOMMENDATION_CONFIDENCE_CALIBRATION';
const PROVISIONAL_FP=hash('c2-provisional-family/v1\0'+REPO+'\0'+PROVISIONAL_FAMILY);
function overlayPr150({historical,recovered,adjudication}={}){
 try{
  if(!historical||historical.schema!=='ultra-sentinel-c2-run23-historical-source-chain-audit/v1'||
   historical.repository!==REPO||historical.ownerRun23!==39077240648||
   historical.priorOwnerRun22!==39076132177||historical.sourceRun23Attested!==true||
   historical.sourceBlobsVerified!==23||historical.count!==23||
   historical.positives!==11||historical.negatives!==12||
   historical.knownTrainingOnly!==true||historical.historicalEvidenceAuthenticated!==false||
   historical.independenceVerified!==false||historical.blindHoldout!==false||
   historical.holdoutFrozen!==false||historical.newLabels!==0||
   historical.benchmarkScoredLabels!==0||historical.precision!==null||
   historical.recall!==null||historical.f1!==null||
   historical.tripleSPlusCertified!==false||
   !Array.isArray(historical.entries)||historical.entries.length!==23||
   !SHA64.test(historical.inventorySha256)||
   hash(JSON.stringify(historical.entries))!==historical.inventorySha256||
   !Array.isArray(historical.duplicateIdentities)||historical.duplicateIdentities.length||
   !Array.isArray(historical.duplicateCausalGroups)||historical.duplicateCausalGroups.length||
   !Array.isArray(historical.missingCausalGroups)||
   historical.missingCausalGroups.length!==21||
   !Array.isArray(historical.missingReceipts)||
   historical.missingReceipts.length!==10)failure();
  if(!recovered||recovered.schema!=='c2-run23-ten-original-receipts-recovered/v1'||
   recovered.historicalSourceLabels!==23||recovered.originalBehaviorWitnessesRecovered!==10||
   recovered.missingHistoricalIndividualReceiptsAfterIndependentRecovery!==0||
   recovered.originalHistoricalSealAltered!==false||recovered.unresolvedCausalGroups!==21||
   recovered.sourceRunAuthenticatedByCaller!==true||
   recovered.historicalEvidenceAuthenticated!==false||
   recovered.independenceVerified!==false||recovered.holdoutFrozen!==false||
   recovered.newLabels!==0||recovered.precision!==null||recovered.recall!==null||
   recovered.f1!==null||recovered.tripleSPlusCertified!==false||
   recovered.verdict!=='ORIGINAL_RECEIPTS_RECOVERED_CAUSAL_INDEPENDENCE_UNVERIFIED'||
   !Array.isArray(recovered.entries)||recovered.entries.length!==10)failure();
  if(!adjudication||adjudication.schema!=='ultra-sentinel-c2-pr150-factorial-causal-adjudication/v1'||
   adjudication.originalRepo!==REPO||adjudication.originalPr!==150||
   adjudication.causalGuardIndependence!=='SEPARABLE_GUARDS_SHARED_POLICY_FAMILY'||
   adjudication.rootCauseFamily!==PROVISIONAL_FAMILY||
   adjudication.independentRootCausesCertified!==false||
   adjudication.independentGroupsCounted!==1||
   adjudication.negativeControlFailures!==0||
   adjudication.originalDefectPredicates!==2||
   adjudication.historicalLabelsModified!==false||
   adjudication.corpusNewLabels!==0||adjudication.precision!==null||
   adjudication.recall!==null||adjudication.f1!==null||
   adjudication.holdoutFrozen!==false||
   adjudication.tripleSPlusCertified!==false||
   adjudication.verdict!=='TWO_SEPARABLE_SOURCE_GUARDS_ONE_CONSERVATIVE_CAUSAL_FAMILY')failure();
  const oracle=adjudicateMatrix(adjudication.testMatrix);
  for(const key of ['sourceBlobSha','originalHeadSha','sourcePath','verdict',
    'rootCauseFamily','independentGroupsCounted','historyOnlyFixResolvesHistoryButNotOpposingEvidence',
    'externalOnlyFixResolvesOpposingEvidenceButNotHistory','bothFixesResolveBoth',
    'benignNegativeControlsPassed']){
   if(!isDeepStrictEqual(adjudication[key],oracle[key]))failure();
  }
  if(adjudication.sourceBlobs!==undefined){
   const m=adjudication.sourceBlobs;
   if(!m||Object.keys(m).length!==4||
    m.original?.gitBlob!==oracle.sourceBlobSha||
    m.original?.differsFromOriginal!==false||
    ['historyOnly','externalOnly','both'].some(k=>m[k]?.differsFromOriginal!==true||
      !SHA40.test(m[k].gitBlob)||m[k].gitBlob===oracle.sourceBlobSha))failure();
  }
  const seen=new Set(),allEntries=new Map(),missing=new Set();
  let positives=0,negatives=0;
  for(const x of historical.entries){
   const id=JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
   if(seen.has(id)||x.repository!==REPO||!SHA40.test(x.headSha)||
    !SHA40.test(x.blobSha)||typeof x.positive!=='boolean'||
    !Number.isInteger(x.line)||x.line<1)failure();
   seen.add(id);allEntries.set(id,x);
   x.positive?positives++:negatives++;
   if(x.rootCauseGroup===null&&x.causalFingerprint===null)missing.add(id);
  }
  if(positives!==11||negatives!==12||missing.size!==21||
    !isDeepStrictEqual(historical.missingCausalGroups,[...missing]))failure();
  const receiptIDs=new Set();
  for(const x of recovered.entries){
   const id=JSON.stringify([x.pr,x.sourceHeadSha,x.ruleId,x.path,x.line,x.positive]);
   const old=allEntries.get(id);
   if(receiptIDs.has(id)||!old||old.blobSha!==x.sourceBlobSha||
    !SHA64.test(x.originalWitnessSha256)||
    !Number.isSafeInteger(x.sourceRunId)||x.sourceRunId<1)failure();
   receiptIDs.add(id);
  }
  if(receiptIDs.size!==10)failure();
  const pr150=EXPECTED.filter(x=>x.pr===150);
  if(pr150.length!==3)failure();
  const annotated=new Map();
  for(const p of pr150){
   const identity=JSON.stringify([p.pr,p.headSha,p.ruleId,p.path,p.line,p.positive]);
   const original=allEntries.get(identity);
   const recoveredEntry=recovered.entries.find(x=>x.id===p.id);
   if(!original||!recoveredEntry||!missing.has(identity)||
    original.blobSha!==p.blobSha||original.rootCauseGroup!==null||
    recoveredEntry.sourceHeadSha!==p.headSha||
    recoveredEntry.sourceBlobSha!==p.blobSha||
    recoveredEntry.ruleId!==p.ruleId||
    recoveredEntry.positive!==p.positive||
    recoveredEntry.path!==p.path||recoveredEntry.line!==p.line)failure();
   const isPositive=p.line!==250;
   if(isPositive!==p.positive)failure();
   annotated.set(identity,Object.freeze({
    historicalIdentity:identity,pr:150,headSha:p.headSha,blobSha:p.blobSha,
    ruleId:p.ruleId,path:p.path,line:p.line,positive:p.positive,
    causalStatus:isPositive?'PROVISIONAL_SHARED_FAMILY':'NEGATIVE_CONTROL',
    provisionalFamily:isPositive?PROVISIONAL_FAMILY:null,
    provisionalCausalFingerprint:isPositive?PROVISIONAL_FP:null,
    sourceRunId:recoveredEntry.sourceRunId,
    originalWitnessSha256:recoveredEntry.originalWitnessSha256,
    adjudicationRunId:39507901311,adjudicationArtifactId:12303258874,
    independentRootCause:false,newLabel:false
   }));
  }
  if(annotated.size!==3||[...annotated.values()].filter(x=>x.positive).length!==2)failure();
  const rest=[...missing].filter(id=>!annotated.get(id)?.positive);
  const inventory=historical.entries.map(x=>{
   const id=JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
   const overlay=annotated.get(id);
   return {...x,causalAdjudication:overlay?{
    status:overlay.causalStatus,provisionalFamily:overlay.provisionalFamily,
    provisionalCausalFingerprint:overlay.provisionalCausalFingerprint,
    independentlyCertified:false
   }:null};
  });
  return Object.freeze({
   schema:'ultra-sentinel-c2-run23-pr150-causal-overlay/v1',
   status:'PROVISIONAL_FAMILY_REGISTERED_NOT_INDEPENDENTLY_CERTIFIED',
   repository:REPO,originalRun23:39077240648,
   originalInventorySha256:historical.inventorySha256,
   originalHistoricalInventoryUnchanged:true,originalSourceLabelsUnchanged:true,
   historicalCountBefore:23,count:23,positives:11,negatives:12,
   causalAdjudicationRun:39507901311,
   recoveredReceiptRun:39505160347,
   provisionalGroupsAdded:1,provisionalPositiveLabelsGrouped:2,
   historicalCauseAnnotationsCertified:0,
   provisionalAnnotations:[...annotated.values()],
   inventory,
   remainingHistoricalCausesUncertified:21,
   previousUnannotatedEntries:21,unannotatedEntriesNow:rest.length,
   historicalIndependenceProven:false,independenceVerified:false,
   historicalEvidenceAuthenticated:false,blindHoldout:false,holdoutFrozen:false,
   benchmarkScoredLabels:0,corpusNewLabels:0,
   precision:null,recall:null,f1:null,sssPlusCertified:false,
   canAutoRepair:false,canAutoMerge:false,
   limitation:'Source repairs separate two guards, but do not justify counting two independent root-cause families. Negative control line 250 remains distinct. The source-sealed historical inventory was never modified.'
  });
 }catch(e){
  if(e?.message==='C2_PR150_HISTORICAL_OVERLAY_BLOCKED')throw e;
  failure();
 }
}
module.exports={overlayPr150,PROVISIONAL_FAMILY,PROVISIONAL_FP};
