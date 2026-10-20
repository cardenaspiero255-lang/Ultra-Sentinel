'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {adjudicateMatrix}=require('../../packages/quality-gates/c2-pr150-causal-matrix.cjs');
const {EXPECTED}=require('../../packages/quality-gates/c2-run23-ten-receipt-recovery.cjs');
const {overlayPr150}=require('../../packages/quality-gates/c2-pr150-historical-causal-overlay.cjs');
const H='HIGH',M='MEDIUM';
const output=(bad,external)=>({negativeOnlyHistory:bad,opposingExternalEvidence:external,
 weakExternalEvidence:M,affirmativeExternalEvidence:H,positiveHistory:H,emptyContext:M});
const matrix=()=>adjudicateMatrix({original:output(H,H),historyOnly:output(M,H),
 externalOnly:output(H,M),both:output(M,M)});
const hex40=n=>n.toString(16).padStart(40,'0');
const hash=x=>createHash('sha256').update(x).digest('hex');
function sample(){
 const src=EXPECTED.filter(e=>e.pr===150);
 const entries=[
 ...src.map(e=>({repository:'cardenaspiero255-lang/gamehub-ultra',pr:e.pr,headSha:e.headSha,
 blobSha:e.blobSha,path:e.path,rule:e.ruleId,line:e.line,positive:e.positive,
 rootCauseGroup:null,causalFingerprint:null,evidenceSha256:null,
 independentOriginalWitnessVerifiedForThisLabel:false})),
 ...Array.from({length:20},(_,i)=>({repository:'cardenaspiero255-lang/gamehub-ultra',
 pr:151+i,headSha:hex40(i+1),blobSha:hex40(i+61),path:'src/Other'+i+'.kt',
 rule:'OTHER_RULE_'+i,line:i+1,positive:i<9,rootCauseGroup:null,
 causalFingerprint:null,evidenceSha256:null,independentOriginalWitnessVerifiedForThisLabel:false}))
 ];
 const historical={schema:'ultra-sentinel-c2-run23-historical-source-chain-audit/v1',
  repository:'cardenaspiero255-lang/gamehub-ultra',ownerRun23:39077240648,
  priorOwnerRun22:39076132177,sourceRun23Attested:true,sourceBlobsVerified:23,
  count:23,positives:11,negatives:12,missingCausalGroups:entries.filter(e=>!e.rootCauseGroup).map(e=>
   JSON.stringify([e.pr,e.headSha,e.rule,e.path,e.line,e.positive])),
  missingReceipts:entries.filter(e=>!e.evidenceSha256).map(e=>
   JSON.stringify([e.pr,e.headSha,e.rule,e.path,e.line,e.positive])),
  duplicateIdentities:[],duplicateCausalGroups:[],
  status:'CAUSAL_REVIEW_REQUIRED',entries,
  knownTrainingOnly:true,historicalEvidenceAuthenticated:false,independenceVerified:false,
  blindHoldout:false,holdoutFrozen:false,newLabels:0,
  benchmarkScoredLabels:0,precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  autoRepair:false,autoMerge:false};
 historical.inventorySha256=hash(JSON.stringify(entries));
 const recovered={schema:'c2-run23-ten-original-receipts-recovered/v1',
  historicalSourceLabels:23,originalBehaviorWitnessesRecovered:10,
  missingHistoricalIndividualReceiptsAfterIndependentRecovery:0,
  originalHistoricalSealAltered:false,unresolvedCausalGroups:21,
  entries:[
   ...src.map(e=>({id:e.id,pr:e.pr,ruleId:e.ruleId,path:e.path,line:e.line,
    positive:e.positive,sourceHeadSha:e.headSha,sourceBlobSha:e.blobSha,
    sourceRunId:e.id==='150-251'?38988102205:38982855937,
    artifactId:e.id==='150-251'?12083843392:12082061520,
    originalWitnessSha256:hash('receipt-'+e.id)})),
   ...Array.from({length:7},(_,i)=>({id:'other-'+i,pr:151+i,ruleId:'OTHER_RULE_'+i,
    path:'src/Other'+i+'.kt',line:i+1,positive:i<9,sourceHeadSha:hex40(i+1),
    sourceBlobSha:hex40(i+61),sourceRunId:38900000000+i,artifactId:12000000000+i,
    originalWitnessSha256:hash('other'+i)}))
  ],sourceRunAuthenticatedByCaller:true,historicalEvidenceAuthenticated:false,independenceVerified:false,
  holdoutFrozen:false,newLabels:0,precision:null,recall:null,f1:null,
  tripleSPlusCertified:false,
  verdict:'ORIGINAL_RECEIPTS_RECOVERED_CAUSAL_INDEPENDENCE_UNVERIFIED'};
 return {historical,recovered,adjudication:matrix()};
}
test('only two positive #150 labels share ONE provisional group; line 250 remains separate control',()=>{
 const r=overlayPr150(sample());
 assert.equal(r.count,23);assert.equal(r.positives,11);assert.equal(r.negatives,12);
 assert.equal(r.originalHistoricalInventoryUnchanged,true);
 assert.equal(r.provisionalGroupsAdded,1);
 assert.equal(r.provisionalPositiveLabelsGrouped,2);
 assert.equal(r.provisionalAnnotations.length,3);
 const pos=r.provisionalAnnotations.filter(x=>x.positive);
 const neg=r.provisionalAnnotations.find(x=>!x.positive);
 assert.deepEqual(pos.map(x=>x.line).sort(),[251,252]);
 assert.equal(pos[0].provisionalCausalFingerprint,pos[1].provisionalCausalFingerprint);
 assert.equal(pos[0].causalStatus,'PROVISIONAL_SHARED_FAMILY');
 assert.equal(neg.line,250);
 assert.equal(neg.causalStatus,'NEGATIVE_CONTROL');
 assert.equal(neg.provisionalCausalFingerprint,null);
 assert.equal(r.remainingHistoricalCausesUncertified,21);
 assert.equal(r.previousUnannotatedEntries,21);
 assert.equal(r.unannotatedEntriesNow,19);
 assert.equal(r.corpusNewLabels,0);assert.equal(r.precision,null);
 assert.equal(r.holdoutFrozen,false);assert.equal(r.independenceVerified,false);
 assert.equal(r.sssPlusCertified,false);
});
test('cannot relabel control 250 as positive or count independent families',()=>{
 const a=sample();a.historical.entries.find(x=>x.pr===150&&x.line===250).positive=true;
 a.historical.inventorySha256=hash(JSON.stringify(a.historical.entries));
 assert.throws(()=>overlayPr150(a),/C2_PR150_HISTORICAL_OVERLAY_BLOCKED/);
 const b=sample();b.adjudication={...b.adjudication,independentRootCausesCertified:true};
 assert.throws(()=>overlayPr150(b),/C2_PR150_HISTORICAL_OVERLAY_BLOCKED/);
});
test('tampered source SHA, unrelated witness and corrupt inventory digest fail closed',()=>{
 const mutations=[
 a=>a.historical.inventorySha256='f'.repeat(64),
 a=>a.recovered.entries[0].originalWitnessSha256='bogus',
 a=>a.recovered.entries[0].sourceBlobSha='f'.repeat(40),
 a=>a.recovered.entries[0].ruleId='UNRELATED',
 a=>a.adjudication={...a.adjudication,verdict:'TWO_INDEPENDENT_CAUSES'},
 a=>a.adjudication={...a.adjudication,testMatrix:{...a.adjudication.testMatrix,both:{...a.adjudication.testMatrix.both,negativeOnlyHistory:'HIGH'}}},
 a=>a.historical.newLabels=1,
 a=>a.historical.entries.push({...a.historical.entries[0]})
 ];
 for(const mutate of mutations){const a=sample();mutate(a);
  assert.throws(()=>overlayPr150(a),/C2_PR150_HISTORICAL_OVERLAY_BLOCKED/);
 }
});
test('original Run23 report is not rewritten and remaining historical cases are unmodified',()=>{
 const a=sample(),copy=JSON.stringify(a.historical);
 const r=overlayPr150(a);
 assert.equal(JSON.stringify(a.historical),copy);
 assert.equal(r.originalInventorySha256,a.historical.inventorySha256);
 assert.equal(r.provisionalAnnotations.filter(x=>x.positive).length,2);
 assert.equal(r.historicalIndependenceProven,false);
});
