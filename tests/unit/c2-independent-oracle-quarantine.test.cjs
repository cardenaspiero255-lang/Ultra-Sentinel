'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {prepareIndependentOracleQuarantine,inspectUntrustedTruthClaim}=require('../../packages/quality-gates/c2-independent-oracle-quarantine.cjs');
const load=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'../../docs/quality/C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json'),'utf8'));
test('RED: frozen four metadata pointers are selectable without exposing source, PR text, answers or Core predictions',()=>{
 const r=prepareIndependentOracleQuarantine(load());
 assert.equal(r.candidateCount,4);
 assert.equal(r.emitterCount,17);
 assert.equal(r.sourceBlobsPinned,true);
 assert.equal(r.candidateSourceRead,false);
 assert.equal(r.candidatePredictionsRead,false);
 assert.equal(r.trainingSeparationAttested,false);
 assert.equal(r.truthSealed,false);
 assert.equal(r.originalOraclesAttested,0);
 assert.equal(r.holdoutFrozen,false);
 assert.equal(r.truthStatus,'NO_INDEPENDENT_ORIGINAL_ORACLES');
 assert.equal(r.genuineDefectsVerified,0);
 assert.equal(r.scoredNegatives,0);
 assert.equal(r.precision,null);
 assert.equal(r.sssPlusCertified,false);
 assert.equal(r.oracleSlots.length,4);
 for(const slot of r.oracleSlots){
  assert.equal(slot.state,'AWAITING_EXTERNAL_ORIGINAL_SOURCE_ORACLE');
  assert.equal(slot.findings,undefined);
  assert.equal(slot.label,undefined);
  assert.equal(slot.path,undefined);
  assert.equal(slot.source,undefined);
 }
});
test('RED: freeze commitment independent of metadata insertion order',()=>{
 const a=load(),b=load();b.candidates.reverse();
 const ra=prepareIndependentOracleQuarantine(a),rb=prepareIndependentOracleQuarantine(b);
 assert.equal(ra.selectionSha256,rb.selectionSha256);
 assert.equal(ra.detectorSourceSha256,rb.detectorSourceSha256);
 assert.deepEqual(ra.oracleSlots,rb.oracleSlots);
});
test('RED: changes after provenance registration must fail, not silently create a new cohort',()=>{
 for(const bad of [
  x=>{x.candidates[0].headSha='a'.repeat(40)},
  x=>{x.candidates[0].createdAt='2026-10-21T01:01:01Z'},
  x=>{x.candidates[0].repository='other/repo'},
  x=>{x.candidates[0].status='APPROVED'},
  x=>{x.candidates.push(x.candidates[0])},
  x=>{x.truth=[{positive:true}]},
  x=>{x.predictions=[]},
  x=>{x.trainingExclusionAttested=true},
 ]){
  const x=load();bad(x);
  assert.throws(()=>prepareIndependentOracleQuarantine(x),/C2_INDEPENDENT_ORACLE_QUARANTINE_BLOCKED/);
 }
});
test('RED: a self-reported original oracle is only an untrusted receipt, never truth or a scored negative',()=>{
 const p=prepareIndependentOracleQuarantine(load());
 const key=p.oracleSlots[0].identitySha256;
 const receipt={
  schema:'c2-original-oracle-receipt-proposal/v1',
  identitySha256:key,sourceBlobSha:'a'.repeat(40),witnessSha256:'b'.repeat(64),
  githubOwnerRunId:1234567,independentFromDetector:true,originalTestsPassed:true,
  correctFixAttested:true,positive:true,rule:'BLOCKING_ANDROID_CALL'
 };
 const r=inspectUntrustedTruthClaim(p,receipt);
 assert.equal(r.status,'UNTRUSTED_RECEIPT_NOT_A_TRUTH_LABEL');
 assert.equal(r.unverifiedWitnessProposals,1);
 assert.equal(r.attestedTruthLabels,0);
 assert.equal(r.predictionsRead,false);
 assert.equal(r.precision,null);
 const forged={...receipt,predictions:[]};
 assert.throws(()=>inspectUntrustedTruthClaim(p,forged),/C2_INDEPENDENT_ORACLE_QUARANTINE_BLOCKED/);
 const unknown={...receipt,identitySha256:'d'.repeat(64)};
 assert.throws(()=>inspectUntrustedTruthClaim(p,unknown),/C2_INDEPENDENT_ORACLE_QUARANTINE_BLOCKED/);
});
test('RED: content-independent owner workflow must verify GitHub trees and never read candidate patches',()=>{
 const y=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-independent-truth-quarantine.yml'),'utf8');
 assert.match(y,/gh api "\/repos\/\$head_repo\/git\/commits\/\$head"/);
 assert.match(y,/gh api "\/repos\/\$repo\/git\/commits\/\$base"/);
 assert.match(y,/github\.token/);
 assert.match(y,/persist-credentials: false/);
 assert.match(y,/c2-independent-oracle-quarantine/);
 assert.doesNotMatch(y,/\/pulls\/\$pr\/files|\/compare\/|gh pr diff|checkout.*external|\/contents\/|github\.event\.pull_request\.head\.sha.*exec/);
});
