'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {reviewGithubPrEvidence}=require('../../packages/orchestrator/gamehub-github-evidence.cjs');
const sha='3533a3005311833b47162f37f96bd0586c356eaf',repo='cardenaspiero255-lang/gamehub-ultra';
const f={filename:'.github/scripts/ultra_sentinel_family_fingerprints.cjs',status:'added',changes:76,patch:'@@ -0,0 +1 @@\n+const x=1;\n'};
test('GitHub PR snapshot is read-only and not authenticated',()=>{
 const r=reviewGithubPrEvidence({repository:repo,number:201,headSha:sha,files:[f]});
 assert.equal(r.pr,201);assert.equal(r.authenticated,false);
 assert.equal(r.completeDiff,false);assert.equal(r.mergeAllowed,false);
 assert.equal(r.envelope.evidenceState,'UNVERIFIED');
});
test('truncated pagination and malformed evidence fail closed',()=>{
 const p={repository:repo,number:201,headSha:sha,files:[f]};
 assert.throws(()=>reviewGithubPrEvidence({...p,hasMorePages:true}),/INCOMPLETE_GITHUB_EVIDENCE/);
 assert.throws(()=>reviewGithubPrEvidence({...p,files:[f,f]}),/INVALID_GITHUB_FILE/);
 assert.throws(()=>reviewGithubPrEvidence({...p,headSha:'b'.repeat(39)}),/INCOMPLETE_GITHUB_EVIDENCE/);
});
