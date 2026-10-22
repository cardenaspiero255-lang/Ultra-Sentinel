'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
  buildExecutableRuleInventory,
  evaluateAuthenticBenignControlCapture,
  ORIGINAL_NEGATIVES
}=require('../../packages/quality-gates/c2-executable-rule-inventory.cjs');
function fixture(){
 const negative=ORIGINAL_NEGATIVES.map((x)=>({
  target:{...x},labelPolarity:false,originalBlobVerified:true,
  changeStatus:x.pr===158?'ORIGINAL_SOURCE_LINE_NOT_ADDED':'ORIGINAL_DIFF_LINE_ADDED',
  coreExecuted:true,coreVersion:'2.0.0',findings:[],scoredNegative:false,
  scoredPositive:false,falsePositive:null,certified:false
 }));
 const positive=Array.from({length:6},(_,i)=>({
  target:{pr:300+i,headSha:'a'.repeat(40),blobSha:'b'.repeat(40),
   rule:'PUBLIC_DEVELOPMENT_ONLY',path:'app/src/main/java/Demo.kt',line:i+1},
  labelPolarity:true,originalBlobVerified:true,changeStatus:'ORIGINAL_DIFF_LINE_ADDED',
  coreExecuted:true,coreVersion:'2.0.0',findings:[],scoredNegative:false,
  scoredPositive:false,falsePositive:null,certified:false
 }));
 return {schema:'c2-12-historical-exact-source-frozen-core-capture/v1',
  engineHeadSha:'e7454d5d1c837846685db57c9be7a48e107b9cac',
  engineBlobs:{
   'packages/core/ultra_sentinel_core.cjs':'836f9400f42f269b80f446e89601744c59c73073',
   'packages/core/c2-semantic-patterns.cjs':'7df2a994f566ad56bdacab999fa6ba83b69e3b4d',
   'packages/core/c2-known-defect-regressions.cjs':'8c2fa4289d331e157b07f4e693239ac7e31cae8c'
  },
  count:12,positives:6,negatives:6,sourceGitBlobAttested:12,
  originalOwnerOracleReceiptsReused:true,causalIndependenceNewlyCertified:0,
  newGoldLabels:0,scoredNegatives:0,scoredPositives:0,precision:null,
  recall:null,f1:null,measuredFalsePositiveRate:null,blindHoldoutFrozen:false,
  sssPlusCertified:false,claims:[...negative,...positive]};
}
test('RED: enumerate every genuine emitter in the current frozen Core with source position',()=>{
 const report=buildExecutableRuleInventory();
 assert.equal(report.ruleCount,17);
 assert.deepEqual(report.byImplementation,{direct:10,semantic:4,regression:3});
 assert.equal(new Set(report.rules.map(r=>r.rule)).size,17);
 assert.ok(report.rules.every(r=>r.sourcePath&&Number.isSafeInteger(r.sourceLine)&&r.sourceLine>0));
 assert.ok(report.rules.some(r=>r.rule==='REGRESSION_TEST_COVERAGE'&&r.lineZeroNonPositional));
 assert.ok(report.rules.some(r=>r.rule==='STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED'));
 assert.equal(report.detectorSourceShaPinned,true);
 assert.equal(report.certifiedRules,0);
});
test('RED: archived six owner benign controls have Core predictions but no scorable FP/TN',()=>{
 const i=buildExecutableRuleInventory();
 const result=evaluateAuthenticBenignControlCapture(fixture(),i);
 assert.equal(result.authenticNegativeSourceOraclesInArchive,6);
 assert.equal(result.coreSourceExecutions,6);
 assert.equal(result.registeredRules,17);
 assert.equal(result.outOfRuleVocabulary,6);
 assert.equal(result.exactRulePathLineMatches,0);
 assert.equal(result.unexpectedOtherRuleAlerts,0);
 assert.equal(result.ruleSpecificBenignCasesScored,0);
 assert.equal(result.trueNegativesScored,0);
 assert.equal(result.falsePositivesScored,0);
 assert.equal(result.falsePositiveRate,null);
 assert.equal(result.precision,null);
 assert.equal(result.recall,null);
 assert.equal(result.f1,null);
 assert.equal(result.holdoutFrozen,false);
 assert.equal(result.sssPlusCertified,false);
});
test('RED: an unrelated alert on a benign source must be surfaced, never silently TN',()=>{
 const c=fixture(),i=buildExecutableRuleInventory();
 c.claims[0].findings=[{rule:'FORCED_GC',path:c.claims[0].target.path,line:12,severity:'MEDIUM'}];
 const r=evaluateAuthenticBenignControlCapture(c,i);
 assert.equal(r.unexpectedOtherRuleAlerts,1);
 assert.equal(r.falsePositivesScored,0);
 assert.equal(r.ruleSpecificBenignCasesScored,0);
});
test('RED: tampered blob, historic rule, source inventory or manufactured percentages fail closed',()=>{
 const mutations=[
  x=>{x.engineHeadSha='0'.repeat(40)},
  x=>{x.sourceGitBlobAttested=11},
  x=>{x.claims[0].target.blobSha='0'.repeat(40)},
  x=>{x.claims[0].target.rule='FAKE_INVENTED_RULE'},
  x=>{x.claims[0].scoredNegative=true},
  x=>{x.measuredFalsePositiveRate=0},
  x=>{x.claims[0].coreExecuted=false},
  x=>{x.claims.pop()}
 ];
 for(const mutate of mutations){
  const capture=fixture();mutate(capture);
  assert.throws(()=>evaluateAuthenticBenignControlCapture(capture,buildExecutableRuleInventory()),
   /C2_RULE_INVENTORY_BLOCKED/);
 }
});
