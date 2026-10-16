'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {freezeHoldoutEvidence,LOCK}=require('../../packages/quality-gates/c2-unseen-holdout.cjs');
const snapshot=()=>LOCK.cases.map(p=>({
 pr:p.pr,headSha:p.headSha,baseSha:p.baseSha,changedFiles:p.changedFiles,
 state:p.state,baseRepoId:1375408706,baseOwnerId:322222186,
 headRepoId:1375408706,headOwnerId:322222186
}));
test('freezes four distinct unseen PRs without inspecting model predictions or labels',()=>{
 const x=freezeHoldoutEvidence(snapshot());
 assert.equal(x.schema,'ultra-sentinel-c2-unseen-holdout-freeze/v1');
 assert.equal(x.status,'FROZEN_INPUT_ONLY');
 assert.deepEqual(x.cases.map(c=>c.pr),[172,205,206,208]);
 assert.equal(x.modelSourceSha,'bb38bb77983339301cafe8a7594e258e0c2924a6');
 assert.match(x.packetDigest,/^[a-f0-9]{64}$/);
 assert.equal(x.includesPredictions,false);assert.equal(x.includesTruthLabels,false);
 assert.equal(x.precision,null);assert.equal(x.recall,null);assert.equal(x.f1,null);
 assert.equal(x.canCertify,false);assert.equal(x.canMerge,false);assert.equal(x.canRepair,false);
 assert.ok(!JSON.stringify(x).includes('candidateFindings'));
 assert.ok(!JSON.stringify(x).includes('independentLabels'));
 assert.deepEqual(freezeHoldoutEvidence(snapshot()),x);
});
test('lock is strictly disjoint from all known C2 training and historical used PRs',()=>{
 const names=new Set(LOCK.cases.map(x=>x.pr));
 assert.equal(names.size,4);
 for(const pr of [73,132,159,161,163])assert.equal(names.has(pr),false);
});
test('reordered, missing, duplicated or replaced PR is blocked',()=>{
 const candidates=[snap=>snap.reverse(),snap=>snap.slice(0,3),snap=>[...snap,snap[0]],
  snap=>snap.map((p,i)=>i===0?{...p,pr:132}:p)];
 for(const mutate of candidates)assert.throws(()=>freezeHoldoutEvidence(mutate(snapshot())),/UNVERIFIED_HOLDOUT_SOURCE/);
});
test('head/base drift, changedFiles, state, IDs or spoofed fields are blocked',()=>{
 const changes=[{headSha:'a'.repeat(40)},{baseSha:'b'.repeat(40)},
  {changedFiles:99},{state:'open'},{baseRepoId:1},{headRepoId:1},
  {baseOwnerId:2},{headOwnerId:2},{candidateFindings:[]},{labels:[]},
  {credentials:'never'},{headSha:'../wrong'}];
 for(const change of changes){const data=snapshot();Object.assign(data[0],change);
  assert.throws(()=>freezeHoldoutEvidence(data),/UNVERIFIED_HOLDOUT_SOURCE/,JSON.stringify(change));}
});
test('invalid sha, injected fields, non-object and oversized lists fail closed',()=>{
 const examples=[null,{},'not json',Array(900).fill({}),[...snapshot(),{pr:900}],
  snapshot().map((p,i)=>i===1?{...p,headSha:'f'.repeat(40)}:p),
  snapshot().map((p,i)=>i===2?{...p,newline:'\n'}:p)];
 for(const v of examples)assert.throws(()=>freezeHoldoutEvidence(v),/UNVERIFIED_HOLDOUT_SOURCE/);
});
test('packet sha256 hashes canonical data and differs from previously trained C2 packet',()=>{
 const z=freezeHoldoutEvidence(snapshot());
 const data={schema:'ultra-sentinel-c2-unseen-holdout-packet/v1',repository:LOCK.repository,
  modelSourceSha:LOCK.modelSourceSha,cases:LOCK.cases};
 const sha=crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
 assert.equal(sha,z.packetDigest);
 assert.notEqual(sha,'a4962a2decfceb0236c327a2a5c622644b7a9f8b67690cbed789e0471986ec08');
});
