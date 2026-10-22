'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {prevalidateProspectiveMetadata}=require('../../packages/quality-gates/c2-four-prospective-metadata.cjs');
const manifest=()=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../docs/quality/C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json'),'utf8'));
test('RED: 4 distinct new external Git PRs, metadata only, retain no truth, findings or frozen claims',()=>{
 const x=prevalidateProspectiveMetadata(manifest());
 assert.equal(x.count,4);
 assert.equal(x.uniqueRepositories,4);
 assert.equal(x.gitHubApiAuthenticatedByThisModule,false);
 assert.equal(x.coreInspectedCandidatePatches,false);
 assert.equal(x.potentialDefectsConfirmed,0);
 assert.equal(x.cohortFrozen,false);
 assert.equal(x.blindHoldout,false);
 assert.equal(x.scoredNegatives,0);
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.precision,null);
 assert.equal(x.recall,null);
 assert.equal(x.f1,null);
});
test('RED: fail closed for prospective PR content/prediction leakage or claims of truth',()=>{
 const mutate=[
  x=>{x.candidates[0].title='bug fixed'},
  x=>{x.candidates[0].patch='diff --git'},
  x=>{x.candidates[0].positive=true},
  x=>{x.candidates[0].predictions=[]},
  x=>{x.candidates[0].source='PUBLIC_KOTLIN_BENCH'},
  x=>{x.candidates[0].disclosure='REVEALED'},
  x=>{x.candidates[0].createdAt='2026-10-19T00:00:00Z'},
  x=>{x.candidates[0].headSha=x.candidates[1].headSha},
  x=>{x.candidates[0].repository=x.candidates[1].repository},
  x=>{x.candidates[0].baseSha=x.candidates[0].headSha},
  x=>{x.candidates[0].headSha='0'},
  x=>{x.frozen=true}
 ];
 for(const m of mutate){
  const x=manifest();m(x);
  assert.throws(()=>prevalidateProspectiveMetadata(x),/C2_EXTERNAL_METADATA_BLOCKED/);
 }
});
test('RED: metadata hash order independent, no source or oracle calls in evaluator',()=>{
 const data=manifest(),reversed=structuredClone(data);
 reversed.candidates.reverse();
 const a=prevalidateProspectiveMetadata(data),b=prevalidateProspectiveMetadata(reversed);
 assert.equal(a.metadataSha256,b.metadataSha256);
 assert.equal(a.cohortFrozen,false);
 assert.equal(a.independenceVerified,false);
});
