'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {prepareProspectivePreseal}=require('../../packages/quality-gates/c2-prospective-preseal-readiness.cjs');
const H=n=>n.toString(16).padStart(40,'0'),D=n=>n.toString(16).padStart(64,'0');
function history(){
 return Array.from({length:23},(_,i)=>({
  repository:'cardenaspiero255-lang/gamehub-ultra',pr:100+i,
  headSha:H(100+i),blobSha:H(200+i),rule:'RULE_'+i,
  path:'app/src/main/java/Example'+i+'.kt',line:i+1,positive:i<11,
  causalFingerprint:D(i+1),oracleReceiptSha256:D(i+100),
  sourceRunId:i+1000
 }));
}
function candidate(repo,pr,createdAt='2026-10-21T00:00:00Z'){
 return {repository:repo,pr,baseSha:H(400+pr),headSha:H(800+pr),
  createdAt,source:'PROSPECTIVE_GITHUB',disclosure:'METADATA_ONLY'};
}
test('RED: original 17 rule emitters pinned, but no cohort means no holdout or metrics',()=>{
 const x=prepareProspectivePreseal(history(),[]);
 assert.equal(x.detector.ruleCount,17);
 assert.equal(x.detector.sourceShaPinned,true);
 assert.equal(x.historical.count,23);
 assert.equal(x.historical.authenticated,false);
 assert.equal(x.cohortMetadataFrozen,false);
 assert.equal(x.status,'NO_PROSPECTIVE_METADATA');
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.falsePositiveRate,null);
 assert.equal(x.precision,null);
 assert.equal(x.recall,null);
 assert.equal(x.f1,null);
});
test('RED: future metadata remains only a proposal; disclosed Kotlin and known GameHub blocked',()=>{
 const future=candidate('different-owner/new-library',509);
 const known=candidate('cardenaspiero255-lang/gamehub-ultra',205);
 const revealed={...candidate('detekt/detekt',4205),source:'PUBLIC_KOTLIN_BENCH',disclosure:'REVEALED'};
 const a=prepareProspectivePreseal(history(),[future,known,revealed]);
 const b=prepareProspectivePreseal(history(),[revealed,future,known]);
 assert.equal(a.candidateMetadataSha256,b.candidateMetadataSha256);
 assert.equal(a.decisionCounts.PROSPECTIVE_METADATA_ONLY_NOT_FROZEN,1);
 assert.equal(a.decisionCounts.KNOWN_HISTORICAL_EXCLUDED,1);
 assert.equal(a.decisionCounts.DEVELOPMENT_ORACLE_REQUIRED,1);
 assert.equal(a.cohortMetadataFrozen,false);
 assert.equal(a.blindHoldout,false);
 assert.equal(a.negativeFindingLabelsAdmitted,0);
 assert.equal(a.status,'NO_ATTESTED_TRUTH_OR_ISOLATED_HOLDOUT');
});
test('RED: reject secret truth fields, detector predictions, source or re-used SHA before freezing',()=>{
 const v=candidate('different-owner/new-library',509);
 for(const injected of [{findings:[]},{fix:'done'},{truth:true},{sourceCode:'Kotlin source'},{positive:true}]){
  assert.throws(()=>prepareProspectivePreseal(history(),[{...v,...injected}]),/CAUSAL_PREFLIGHT_BLOCKED/);
 }
 const reused={...candidate('other/thing',510),headSha:v.headSha};
 assert.throws(()=>prepareProspectivePreseal(history(),[v,reused]),/PROSPECTIVE_PRESEAL_BLOCKED/);
});
test('RED: no fake certification even if a candidate set has diversity but zero original oracles',()=>{
 const candidates=Array.from({length:12},(_,i)=>candidate('owner'+i+'/repo',500+i));
 const x=prepareProspectivePreseal(history(),candidates);
 assert.equal(x.candidateCount,12);
 assert.equal(x.candidateProposals,12);
 assert.equal(x.independentCausalTruthVerified,false);
 assert.equal(x.baselineAuthenticated,false);
 assert.equal(x.candidatePredictionsRead,false);
 assert.equal(x.trainingAndHoldoutSeparated,false);
 assert.equal(x.frozenLabelCount,0);
 assert.equal(x.negativeFindingLabelsAdmitted,0);
 assert.equal(x.precision,null);
 assert.equal(x.sssPlusCertified,false);
});
