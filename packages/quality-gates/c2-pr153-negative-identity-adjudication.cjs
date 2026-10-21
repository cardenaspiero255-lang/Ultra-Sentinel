'use strict';
/*
 * Run23 is immutable. This stage adjudicates one already-sealed, scope-limited
 * original Kotlin NEGATIVE, not another independent defect or a blind sample.
 * The CI caller authenticates exact GitHub Actions run and artifact identities.
 */
const {createHash}=require('node:crypto');
const {CASES}=require('./c2-run16-two-negatives.cjs');
const {EXPECTED}=require('./c2-run23-ten-receipt-recovery.cjs');
const fail=()=>{
 const caller=(new Error().stack||'').split('\n')[2]||'';
 const line=caller.match(/:(\d+):\d+\)?$/)?.[1]||'unknown';
 throw Error('C2_PR153_NEGATIVE_ADJUDICATION_BLOCKED source-line='+line);
};
const sha=s=>createHash('sha256').update(s).digest('hex');
const is40=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
const is64=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const repo='cardenaspiero255-lang/gamehub-ultra';
const ownerRun16=39067708985;
const originalOwnerRun23=39077240648;
const extendedRun=39533113371;
const preseal='c588dd2ceaf0e95644c30d6f0ca8b07fe7a8a06fb77e92f46954a016cadd23c3';
const identity=x=>JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
const expectedId=x=>JSON.stringify([x.pr,x.headSha,x.ruleId,x.path,x.line,x.positive]);
const fingerprint=name=>sha('c2-provisional-family/v1\0'+repo+'\0'+name);
function adjudicatePr153Negative({history,sourceTruth}={}){
 try{
  if(!history||history.schema!=='c2-run23-pr153-historical-extended-causal-overlay/v1'||
   history.status!=='PR153_SCOPED_REPAIR_PROVISIONAL_NOT_INDEPENDENTLY_CERTIFIED'||
   history.originalOwnerRun23!==originalOwnerRun23||
   !is64(history.originalInventorySha256)||!is64(history.inheritedExtendedOverlayDigest)||
   !is64(history.sourceCounterfactualDigest)||
   history.originalCounterfactualRun!==39523094775||
   history.originalHistoricalInventoryUnchanged!==true||
   history.originalExtendedOverlayUnchanged!==true||
   history.count!==23||history.positives!==11||history.negatives!==12||
   history.provisionalPositiveFamiliesAfter!==4||
   history.certifiedIndependentCausesAdded!==0||
   history.remainingHistoricalCausesUncertified!==21||
   history.newLabels!==0||history.historicalEvidenceAuthenticated!==false||
   history.independenceVerified!==false||history.blindHoldout!==false||
   history.holdoutFrozen!==false||history.precision!==null||
   history.recall!==null||history.f1!==null||history.sssPlusCertified!==false||
   history.autoRepair!==false||history.autoMerge!==false||
   !Array.isArray(history.entries)||history.entries.length!==23)fail();

  if(!sourceTruth||sourceTruth.schema!=='ultra-sentinel-c2-run16-two-negatives-owner-seal/v1'||
   sourceTruth.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
   sourceTruth.repository!==repo||sourceTruth.ownerRunId!==ownerRun16||
   sourceTruth.presealDigest!==preseal||!is64(sourceTruth.witnessDigest)||
   sourceTruth.sourceCIAuthenticated!==true||sourceTruth.benchmarkCertified!==false||
   sourceTruth.sourcePositiveLabels!==7||sourceTruth.verifiedScopedNegativeLabels!==7||
   sourceTruth.benchmarkScoredLabels!==0||sourceTruth.tripleSPlusCertified!==false||
   !Array.isArray(sourceTruth.labels)||sourceTruth.labels.length!==14)fail();

  const case69=CASES[1];
  const labels=new Set(),prior=sourceTruth.labels;
  for(const x of prior){
   if(!x||!Number.isSafeInteger(x.pr)||!Number.isSafeInteger(x.line)||
    x.line<1||typeof x.rule!=='string'||typeof x.path!=='string'||
    !is40(x.headSha)||!is40(x.blobSha)||
    (x.evidenceSha256!==undefined&&!is64(x.evidenceSha256))||
    typeof x.positive!=='boolean')fail();
   const id=identity(x);
   if(labels.has(id))fail();
   labels.add(id);
  }
  if(prior.filter(x=>x.positive).length!==7)fail();
  const witness=prior[1];
  if(!witness||witness.pr!==case69.pr||witness.headSha!==case69.headSha||
   witness.blobSha!==case69.blobSha||witness.sourceSha256!==case69.sourceSha256||
   witness.rule!==case69.rule||witness.path!==case69.path||
   witness.line!==case69.line||witness.positive!==false||
   prior.filter(x=>identity(x)===identity(witness)).length!==1)fail();

  const ids=new Set(),mapped=new Map();
  let positives=0,negatives=0;
  for(const x of history.entries){
   if(!x||x.repository!==repo||!Number.isSafeInteger(x.pr)||
    !Number.isSafeInteger(x.line)||x.line<1||
    !is40(x.headSha)||!is40(x.blobSha)||typeof x.rule!=='string'||
    typeof x.path!=='string'||typeof x.positive!=='boolean')fail();
   const id=identity(x);
   if(ids.has(id))fail();
   ids.add(id);mapped.set(id,x);
   x.positive?positives++:negatives++;
  }
  if(ids.size!==23||positives!==11||negatives!==12)fail();
  const known=new Set();
  for(const p of EXPECTED){
   const id=expectedId(p),x=mapped.get(id);
   if(!x||x.blobSha!==p.blobSha||!x.causalAdjudication||
    x.causalAdjudication.independentlyCertified!==false)fail();
   known.add(id);
   if(x.positive){
    const name=p.pr===150?'RECOMMENDATION_CONFIDENCE_CALIBRATION':
     p.pr===151?'THERMAL_SENSOR_NUMERIC_DOMAIN':
     p.pr===152?'REFRESH_CANDIDATE_ELECTION':
     p.pr===153?'ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE':null;
    if(!name||x.causalAdjudication.provisionalFamily!==name||
     x.causalAdjudication.provisionalCausalFingerprint!==fingerprint(name))fail();
   }else if(x.causalAdjudication.provisionalFamily!==null||
    x.causalAdjudication.provisionalCausalFingerprint!==null)fail();
  }
  const positive153=EXPECTED.find(p=>p.pr===153&&p.line===71);
  const row71=mapped.get(expectedId(positive153));
  if(!row71||row71.positive!==true||
   row71.causalAdjudication.status!=='SCOPED_ORIGINAL_FIX_COUNTERFACTUAL_PROVISIONAL')fail();
  const negative150=EXPECTED.find(p=>p.pr===150&&p.line===250);
  if(mapped.get(expectedId(negative150))?.causalAdjudication?.status!=='NEGATIVE_CONTROL')fail();
  const id69=identity(case69),row69=mapped.get(id69);
  if(!row69||row69.repository!==repo||row69.blobSha!==case69.blobSha||
   row69.positive!==false||row69.causalAdjudication!==null)fail();
  for(const [id,x] of mapped){
   if(!known.has(id)&&id!==id69&&x.causalAdjudication!==null)fail();
  }
  const families=new Set(history.entries.filter(x=>x.positive&&
   x.causalAdjudication?.provisionalCausalFingerprint)
   .map(x=>x.causalAdjudication.provisionalCausalFingerprint));
  if(families.size!==4)fail();

  const annotated={
   ...row69,
   causalAdjudication:{
    status:'SCOPED_ORIGINAL_NEGATIVE_MUTATION_SENSITIVE_NOT_SCORABLE',
    sourceOracle:'KOTLIN_ORIGINAL_VS_CALLBACK_MUTANT',
    counterfactualStatus:'NEGATIVE_MUTATION_KILLED',
    sourceOwnerRunId:ownerRun16,
    originalEvidenceSha256:witness.evidenceSha256,
    sourceBlobSha:case69.blobSha,sourceSha256:case69.sourceSha256,
    provisionalFamily:null,provisionalCausalFingerprint:null,
    independentlyCertified:false,independentRootCauseCertified:false,
    closedWholePrCoverage:false,candidateTrainingOnly:true,newGoldLabel:false
   }
  };
  const entries=history.entries.map(x=>identity(x)===id69?annotated:{...x});
  return Object.freeze({
   schema:'c2-run23-pr153-line69-scoped-negative-adjudication/v1',
   status:'PR153_69_SCOPED_NEGATIVE_CONTROL_ADJUDICATED_NOT_CERTIFIED',
   sourceRepository:repo,originalOwnerRun23,originalNegativeOwnerRun16:ownerRun16,
   originalExtendedOwnerRun:extendedRun,
   predecessorSha256:sha(JSON.stringify(history)),
   negativeSourceReceiptSha256:sha(JSON.stringify(sourceTruth)),
   originalInventorySha256:history.originalInventorySha256,
   originalHistoricalInventoryUnchanged:true,
   count:23,positives:11,negatives:12,
   adjudicatedNegativeHistoricalIdentities:1,
   historicalIdentitiesWithAnnotations:11,
   historicalIdentitiesWithoutAnnotations:12,
   provisionalPositiveFamiliesAfter:4,
   certifiedIndependentCausesAdded:0,remainingHistoricalCausesUncertified:21,
   entries,newLabels:0,negativeSourceReceiptAuthenticated:true,
   historicalEvidenceAuthenticated:false,independenceVerified:false,
   blindHoldout:false,holdoutFrozen:false,precision:null,recall:null,f1:null,
   sssPlusCertified:false,autoRepair:false,autoMerge:false,
   limitation:'Original #153:69 is a bounded safe-behavior negative with a killed callback mutant; it is not a positive cause, full-PR guarantee, blind sample or independent certification.'
  });
 }catch(e){\n  if(e?.message?.startsWith('C2_PR153_NEGATIVE_ADJUDICATION_BLOCKED'))throw e;\n  fail();\n }
}
module.exports={adjudicatePr153Negative};
