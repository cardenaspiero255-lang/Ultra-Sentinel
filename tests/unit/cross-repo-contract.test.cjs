'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {prepareReviewEnvelope,verifyBoundEnvelope}=require('../../packages/orchestrator/cross-repo-contract.cjs');
const sha='a'.repeat(40),other='b'.repeat(40),repo='cardenaspiero255-lang/gamehub-ultra';
test('versioned cross-repository report binds exact repo and SHA',()=>{
 const r=prepareReviewEnvelope({targetRepo:repo,headSha:sha,verdict:'ADVISORY',findingCount:2});
 assert.equal(r.evidenceState,'UNVERIFIED');
 assert.equal(verifyBoundEnvelope(r,{targetRepo:repo,headSha:sha}),true);
 assert.equal(verifyBoundEnvelope(r,{targetRepo:repo,headSha:other}),false);
 assert.equal(verifyBoundEnvelope(r,{targetRepo:'cardenaspiero255-lang/JARVIS',headSha:sha}),false);
});
test('rejects unknown repositories, invalid SHA and fake clean attestation',()=>{
 for(const targetRepo of ['attacker/repo','cardenaspiero255-lang/gamehub-ultra/extra','cardenaspiero255-lang/ultra-sentinel'])
  assert.throws(()=>prepareReviewEnvelope({targetRepo,headSha:sha}),/INVALID_TARGET/);
 assert.throws(()=>prepareReviewEnvelope({targetRepo:repo,headSha:'bad'}),/INVALID_TARGET/);
 assert.throws(()=>prepareReviewEnvelope({targetRepo:repo,headSha:sha,verdict:'CLEAR'}),/UNVERIFIED_VERDICT/);
 const r=prepareReviewEnvelope({targetRepo:repo,headSha:sha});
 assert.equal(verifyBoundEnvelope({...r,evidenceState:'VERIFIED'},{targetRepo:repo,headSha:sha}),false);
});
test('no transport, token or GitHub write capability exported',()=>{
 const api=require('../../packages/orchestrator/cross-repo-contract.cjs');
 assert.deepEqual(Object.keys(api).sort(),['prepareReviewEnvelope','verifyBoundEnvelope']);
});
