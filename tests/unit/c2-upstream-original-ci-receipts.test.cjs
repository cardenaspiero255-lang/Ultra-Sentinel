'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {prepareIndependentOracleQuarantine}=require('../../packages/quality-gates/c2-independent-oracle-quarantine.cjs');
const {assessOriginalUpstreamCi}=require('../../packages/quality-gates/c2-upstream-original-ci-receipts.cjs');
const manifest=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'../../docs/quality/C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json'),'utf8'));
const good=()=>{
 const m=manifest(),q=prepareIndependentOracleQuarantine(m);
 const check=(headSha,name)=>({id:101,name,headSha,status:'completed',conclusion:'success',appSlug:'github-actions'});
 const snapshots=m.candidates.map((x,i)=>({
  repository:x.repository,pr:x.pr,baseSha:x.baseSha,headSha:x.headSha,
  base:{sha:x.baseSha,checks:[check(x.baseSha,i===0?'Test':i===1?'check-style':i===2?'Test':'test')],fetchComplete:true},
  head:{sha:x.headSha,checks:i===0?[]:[check(x.headSha,i===1?'check-style':i===2?'Test':'test')],fetchComplete:true}
 }));
 return {manifest:m,receipt:{schema:'c2-independent-upstream-source-ci-input/v1',
  selectionSha256:q.selectionSha256,snapshots}};
};
test('RED: source-CI metadata is not an original behavior oracle or independent label',()=>{
 const {manifest,receipt}=good();
 const x=assessOriginalUpstreamCi(manifest,receipt);
 assert.equal(x.candidates,4);
 assert.equal(x.upstreamCiMetadataPairsAttestedByCaller,4);
 assert.equal(x.noHeadChecks,1);
 assert.equal(x.comparableTestChecks,3);
 assert.equal(x.causesOriginalBehaviorVerified,0);
 assert.equal(x.genuineDefectsVerified,0);
 assert.equal(x.independentBenignVerified,0);
 assert.equal(x.originalOraclesAttested,0);
 assert.equal(x.trainingSeparationAttested,false);
 assert.equal(x.baselineAuthenticated,false);
 assert.equal(x.candidatePredictionsRead,false);
 assert.equal(x.truthSealed,false);
 assert.equal(x.holdoutFrozen,false);
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.falsePositiveRate,null);
 assert.equal(x.precision,null);
});
test('RED: fail-closed on fabricated source metadata, mismatched SHA, hidden extra fields, incomplete pagination',()=>{
 const mutations=[
  x=>{x.snapshots[0].head.checks=[{id:1,name:'Test',headSha:'0'.repeat(40),status:'completed',conclusion:'success',appSlug:'github-actions'}]},
  x=>{x.snapshots[1].head.checks[0].conclusion='wow'},
  x=>{x.snapshots[2].head.checks[0].status='other'},
  x=>{x.snapshots[3].base.checks[0].source='candidate-source'},
  x=>{x.snapshots[2].head.fetchComplete=false},
  x=>{x.snapshots[1].repository=x.snapshots[0].repository},
  x=>{x.snapshots.pop()},
  x=>{x.snapshots[0].truth={positive:true}},
  x=>{x.selectionSha256='b'.repeat(64)},
  x=>{x.snapshots[0].head.sha='1'.repeat(40)},
  x=>{x.snapshots[0].base.checks[0].name=''},
  x=>{x.snapshots[0].base.checks[0].appSlug=''},
  x=>{x.snapshots[0].base.checks[0].id=-1}
 ];
 for(const change of mutations){
  const x=good();change(x.receipt);
  assert.throws(()=>assessOriginalUpstreamCi(x.manifest,x.receipt),/C2_UPSTREAM_ORIGINAL_CI_BLOCKED/);
 }
});
test('RED: source-CI results independent of order and never interpret passing checks as original safe behavior',()=>{
 const a=good(),b=good();
 b.receipt.snapshots.reverse();
 const x=assessOriginalUpstreamCi(a.manifest,a.receipt);
 const y=assessOriginalUpstreamCi(b.manifest,b.receipt);
 assert.equal(x.ciMetadataDigest,y.ciMetadataDigest);
 assert.equal(x.scoredTrueNegatives,0);
 assert.equal(x.scoredFalsePositives,0);
 assert.equal(x.originalOraclesAttested,0);
 assert.equal(x.ciChecksSufficientForTruth,false);
});
test('RED: workflow fetches base/head check-runs metadata from upstream GitHub API, no files, patches or detector',()=>{
 const yml=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-upstream-original-ci-receipts.yml'),'utf8');
 assert.match(yml,/c2-upstream-original-ci-receipts\.cjs/);
 assert.match(yml,/\/commits\/\$sha\/check-runs/);
 assert.match(yml,/gh api/);
 assert.match(yml,/permissions:[\s\S]*?contents: read/);
 assert.match(yml,/persist-credentials: false/);
 assert.doesNotMatch(yml,/\/pulls\/\$pr\/files|\/compare\/|gh pr diff|actions\/checkout.*external|contents: write/);
});
