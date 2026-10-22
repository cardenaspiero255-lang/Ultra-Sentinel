'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {STAGES}=require('../../packages/quality-gates/c2-twelve-original-oracle-reconciliation.cjs');
const {SEVEN,SUITES,completeTwelve}=require('../../packages/quality-gates/c2-pr183-seven-original-oracles.cjs');
const crypto=require('node:crypto'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function fixture(){
 const all=STAGES.flatMap(s=>s.cases.map(c=>({...c,owner:s})));
 const entries=all.map(c=>{
  const tag=c.pr+':'+c.line,headSha=sha('head'+tag).slice(0,40),blobSha=sha('blob'+tag).slice(0,40);
  const identity=JSON.stringify([c.pr,headSha,c.rule,'app/'+tag+'.kt',c.line,c.positive]);
  const prior=['152:41','158:114','154:100','151:185','150:167'].includes(tag);
  return {identity,pr:c.pr,line:c.line,positive:c.positive,rule:c.rule,
   headSha,blobSha,originalSourceReplayed:prior,independentRootCauseCertified:false,
   eligibleForGold:false,eligibleForBlindHoldout:false,causalFingerprint:null,
   causalIndependenceStatus:prior?(c.positive?'CONTRAFACTUAL_REPRODUCED_FAMILY_NOT_YET_DISTINCT':'ORIGINAL_NEGATIVE_AND_MUTANT_REPLAYED_NO_POSITIVE_CAUSE'):'ORIGINAL_OWNER_RECEIPT_ONLY_NEW_CAUSAL_TRIAL_PENDING',
   sourceReplayLogSha256:prior?sha('old-a'+tag):null,
   adversarialControlLogSha256:prior?sha('old-b'+tag):null,
   repairLogSha256:prior&&c.positive?sha('old-repair'+tag):null};
 });
 const previous={schema:'c2-pr182-three-positive-two-negative-original-jvm-probes/v2',
  status:'THREE_POSITIVES_TWO_NEGATIVES_SOURCE_REPLAYED_CAUSAL_INDEPENDENCE_PENDING',
  sourceLabels:23,sourcePositiveLabels:11,sourceNegativeLabels:12,
  originalReceipts:12,positiveOriginalReceipts:6,negativeOriginalReceipts:6,
  retestedPositive:3,pendingPositive:3,retestedNegative:2,pendingNegative:4,
  certifiedIndependentCausesAdded:0,newLabels:0,sssPlusCertified:false,
  independenceVerified:false,historicalEvidenceAuthenticated:false,holdoutFrozen:false,
  precision:null,recall:null,f1:null,entryReviews:entries};
 const newProbes=SEVEN.map((c,i)=>{
  const e=entries.find(x=>x.pr===c.pr&&x.line===c.line&&x.positive===c.positive);
  return {suite:c.suite,identity:e.identity,pr:e.pr,line:e.line,positive:e.positive,
   originalHeadSha:e.headSha,originalBlobSha:e.blobSha,
   originalLogSha256:sha('new-original'+i),variantLogSha256:sha('new-variant'+i),
   originalControlPassed:true,mutantOrRepairSensitive:true,
   unmodifiedOriginalSource:true,sourceBehaviorOnly:true,
   candidatePredictionsRead:false,baselinePredictionsRead:false};
 });
 return {previous,newProbes};
}
test('RED: five established + seven new original Kotlin proofs become 12/12 without certifying families',()=>{
 const input=fixture(),unchanged=JSON.stringify(input),out=completeTwelve(structuredClone(input));
 assert.equal(JSON.stringify(input),unchanged);
 assert.equal(out.retestedPositive,6);assert.equal(out.retestedNegative,6);
 assert.equal(out.remainingWithoutSourceReplay,0);assert.equal(out.sourceLabels,23);
 assert.equal(out.entryReviews.length,12);
 assert.equal(out.entryReviews.filter(x=>x.originalSourceReplayed).length,12);
 for(const c of SEVEN){
  const e=out.entryReviews.find(x=>x.pr===c.pr&&x.line===c.line);
  assert.equal(e.originalSourceReplayed,true);
  assert.equal(e.causalIndependenceStatus,c.positive?'CONTRAFACTUAL_REPRODUCED_FAMILY_NOT_YET_DISTINCT':'ORIGINAL_NEGATIVE_AND_MUTANT_REPLAYED_NO_POSITIVE_CAUSE');
 }
 assert.equal(out.certifiedIndependentCausesAdded,0);assert.equal(out.newLabels,0);
 assert.equal(out.sssPlusCertified,false);assert.equal(out.holdoutFrozen,false);
 assert.equal(out.precision,null);assert.equal(out.recall,null);assert.equal(out.f1,null);
 assert.equal(out.causalFamilyIndependenceVerified,false);
 assert.equal(out.entryReviews.filter(x=>x.independentRootCauseCertified||x.eligibleForGold||x.causalFingerprint!=null).length,0);
});
test('RED: exactly five scripts and seven target identities, without accidental extra PR153 family count',()=>{
 assert.deepEqual(SUITES.map(x=>x.id),['json','presentation','battery-local','thermal-session','comparison']);
 assert.equal(SEVEN.length,7);
 assert.deepEqual(SEVEN.filter(x=>x.positive).map(x=>x.pr+':'+x.line).sort(),['152:110','155:12','158:144']);
 assert.deepEqual(SEVEN.filter(x=>!x.positive).map(x=>x.pr+':'+x.line).sort(),['151:22','151:293','154:73','158:50']);
 assert.equal(SUITES.flatMap(x=>x.cases).length,7);
 for(const suite of SUITES){
  assert.ok(/^scripts\/c2-[a-z0-9-]+\.sh$/.test(suite.script));
  assert.ok(suite.sources.length>0);
  assert.ok(suite.sources.every(x=>x.alias&&x.head.length===40&&x.blob.length===40&&x.path.startsWith('app/')));
 }
});
test('RED: reject positive admission, identity swaps, duplicates, missing mutant and benchmark inflation',()=>{
 const attacks=[
  x=>{x.previous.sourceLabels=24;},
  x=>{x.previous.entryReviews[0].causalFingerprint='forged';},
  x=>{x.previous.entryReviews[0].independentRootCauseCertified=true;},
  x=>{x.previous.entryReviews[0].originalSourceReplayed=true;},
  x=>{x.previous.sssPlusCertified=true;},
  x=>{x.previous.entryReviews.pop();},
  x=>{x.newProbes[0].positive=!x.newProbes[0].positive;},
  x=>{x.newProbes[0].originalBlobSha='0'.repeat(40);},
  x=>{x.newProbes[0].mutantOrRepairSensitive=false;},
  x=>{x.newProbes[0].variantLogSha256='bad';},
  x=>{x.newProbes[0].variantLogSha256=x.newProbes[0].originalLogSha256;},
  x=>{x.newProbes[0].identity=x.newProbes[1].identity;},
  x=>{x.newProbes[0].candidatePredictionsRead=true;},
  x=>{x.newProbes.pop();},
  x=>{x.newProbes.push({...x.newProbes[0]});}
 ];
 for(const mutate of attacks){let inp=fixture();mutate(inp);
  assert.throws(()=>completeTwelve(inp),/C2_PR183_BLOCKED/);
 }
});
