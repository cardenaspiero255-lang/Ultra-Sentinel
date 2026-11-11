'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {interpretFactorialOracleEvidence}=
 require('../../packages/family-hunter/factorial-oracle-evidence.cjs');
const paths=['app/src/main/java/example/A.kt','app/src/main/java/example/B.kt'];
const SHA='a'.repeat(40),HEAD='b'.repeat(40);
function make(pattern){
 const scenarios=pattern.map((p,i)=>({
  selectedFiles:paths.filter((_,k)=>Boolean(i&(1<<k))),
  oracleVerdict:p?'PASS':'FAIL',
  judgeStatus:i?'APPROVED_LOCAL_POLICY_ONLY':'BASELINE_NO_COMMIT',
  rollbackVerified:true,baselineTree:'c'.repeat(40),restoredTree:'c'.repeat(40),remoteWrites:false
 }));
 return {schema:'ultra-sentinel-local-cross-file-reproduction/v1',
  status:'LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE',
  baseSha:SHA,headSha:HEAD,candidateRule:'UNSCOPED_COROUTINE',
  scenarios,causalityVerified:false,sourceAuthenticated:false,
  independentOracleProvenanceVerified:false,commitAllowed:false,mergeAllowed:false,
  productionReleaseAllowed:false};
}
const inspect=(pattern)=>interpretFactorialOracleEvidence({files:paths,reproduction:make(pattern)});
test('joint-only success identifies an experimental interaction, never certified causal truth',()=>{
 const x=inspect([false,false,false,true]);
 assert.equal(x.status,'JOINT_INTERACTION_HYPOTHESIS');
 assert.deepEqual(x.minimalPassingSubsets,[paths]);
 assert.equal(x.causalityVerified,false);
 assert.equal(x.originalJVMOracleAuthenticated,false);
 assert.equal(x.mergeAllowed,false);
});
test('single-file and alternative success are not misreported as a joint cause',()=>{
 const x=inspect([false,true,true,true]);
 assert.equal(x.status,'SINGLE_FILE_OR_ALTERNATIVE_EFFECT');
 assert.deepEqual(x.minimalPassingSubsets,[[paths[0]],[paths[1]]]);
});
test('baseline passing or combined failing cannot be claimed as repair synergy',()=>{
 assert.equal(inspect([true,true,true,false]).status,'REGRESSION_OR_NONREPAIR_OBSERVED');
 assert.equal(inspect([false,false,false,false]).status,'NO_PASSING_INTERVENTION');
});
test('reject omitted, reordered, duplicate, tainted or unsafe factorial observations',()=>{
 const variants=[
  x=>x.scenarios.pop(),
  x=>x.scenarios.reverse(),
  x=>x.scenarios[1].selectedFiles=[paths[1]],
  x=>x.scenarios[1].rollbackVerified=false,
  x=>x.scenarios[1].oracleVerdict='UNKNOWN',
  x=>x.scenarios[1].judgeStatus='JUDGE_VETO',
  x=>x.scenarios[1].remoteWrites=true,
  x=>x.scenarios[1].restoredTree='d'.repeat(40),
  x=>x.causalityVerified=true
 ];
 for(const mutate of variants){const r=make([false,false,false,true]);mutate(r);
  const out=interpretFactorialOracleEvidence({files:paths,reproduction:r});
  assert.equal(out.status,'BLOCKED_INCOMPLETE_FACTORIAL_EVIDENCE');
  assert.equal(out.causalityVerified,false);
 }
});
test('3-file factorial recognizes minimal combined subsets without assuming all files interact',()=>{
 const p=[...paths,'app/src/main/java/example/C.kt'];
 const scenarios=Array.from({length:8},(_,mask)=>({
  selectedFiles:p.filter((_,i)=>Boolean(mask&(1<<i))),
  oracleVerdict:(mask&3)===3?'PASS':'FAIL',
  judgeStatus:mask?'APPROVED_LOCAL_POLICY_ONLY':'BASELINE_NO_COMMIT',
  rollbackVerified:true,baselineTree:'c'.repeat(40),restoredTree:'c'.repeat(40),
  remoteWrites:false
 }));
 const r={...make([false,false,false,true]),scenarios};
 const out=interpretFactorialOracleEvidence({files:p,reproduction:r});
 assert.equal(out.status,'JOINT_INTERACTION_HYPOTHESIS');
 assert.deepEqual(out.minimalPassingSubsets,[paths]);
});

test('all counterfactuals must roll back to the same baseline tree',()=>{
 const reproduction=make([false,true,true,true]);
 reproduction.scenarios[2].baselineTree='d'.repeat(40);
 reproduction.scenarios[2].restoredTree='d'.repeat(40);
 const out=interpretFactorialOracleEvidence({files:paths,reproduction});
 assert.equal(out.status,'BLOCKED_INCOMPLETE_FACTORIAL_EVIDENCE');
});

test('hostile accessors, proxies and coercion cannot execute while reading evidence',()=>{
 let effects=0;
 const reproduction=make([false,true,true,true]);
 Object.defineProperty(reproduction.scenarios[1],'oracleVerdict',{
  get(){effects++;return 'PASS';},enumerable:true
 });
 assert.equal(interpretFactorialOracleEvidence({files:paths,reproduction}).status,
  'BLOCKED_INCOMPLETE_FACTORIAL_EVIDENCE');
 const forged=make([false,true,true,true]);
 forged.baseSha={toString(){effects++;return SHA;}};
 assert.equal(interpretFactorialOracleEvidence({files:paths,reproduction:forged}).status,
  'BLOCKED_INCOMPLETE_FACTORIAL_EVIDENCE');
 const proxy=new Proxy(make([false,true,true,true]),{
  get(){effects++;throw Error('proxy trap');},ownKeys(){effects++;throw Error('proxy trap');}
 });
 assert.equal(interpretFactorialOracleEvidence({files:paths,reproduction:proxy}).status,
  'BLOCKED_INCOMPLETE_FACTORIAL_EVIDENCE');
 assert.equal(effects,0);
});

test('accepts the actual producer metadata but rejects substituted authorization',()=>{
 const reproduction={...make([false,true,true,true]),
  ownerAuthorizationRequired:true,limitation:'Local disposable fixtures only.'};
 assert.equal(interpretFactorialOracleEvidence({files:paths,reproduction}).status,
  'SINGLE_FILE_OR_ALTERNATIVE_EFFECT');
 reproduction.ownerAuthorizationRequired=false;
 assert.equal(interpretFactorialOracleEvidence({files:paths,reproduction}).status,
  'BLOCKED_INCOMPLETE_FACTORIAL_EVIDENCE');
});

test('original JARVIS workflow gates coverage and checks the exact pull request head',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/jarvis-termux-original-fix.yml'),'utf8');
 assert.ok(workflow.includes('--test-coverage-include=packages/family-hunter/factorial-oracle-evidence.cjs'));
 assert.ok(workflow.includes('--test-coverage-lines=90 --test-coverage-branches=90'));
 assert.ok(workflow.includes('ref: ${{ github.event.pull_request.head.sha || github.sha }}'));
 assert.ok(workflow.includes('- tests/unit/cross-file-sandbox-reproduction.test.cjs'));
});
