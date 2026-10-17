'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');
test('V3 experimental owner job authenticates exactly the previous untouched source archive',()=>{
 const w=read('.github/workflows/c2-v3-original-88-scope-preview.yml');
 for(const needle of [
 'ULTRA_SENTINEL_C2_V3_ORIGINAL_88_PREVIEW_V1',
 'github.event.repository.id == 1418338512',
 'github.event.comment.user.id == 322222186',
 '38974165470','12077973482',
 'fcc878c3af06d053e3e2b3e9ef3cc0f646e1a0edee4871a95333f16cd9e476a7',
 'scripts/evaluate-c2-v3-original-excluded.cjs',
 'originalFilesVerified == 88','omitted == 0',
 'semanticBehaviorVerified == 0','originalTruthLabelsAdded == 0',
 'legacyCandidateParityProven == false','certification == "NOT_CERTIFIED"',
 'db29f94be1e0afb791a241d26f449695df0eafd0',
 'os.O_NOFOLLOW','tarfile.open',
 'V3_SOURCE_PATCH_ADVISORY_PREVIEW_ONLY'
 ])assert.ok(w.includes(needle),needle);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge|checkouts?:\s*gamehub/);
});
test('new preview module cannot mutate frozen Core and cannot assert semantic certification',()=>{
 const s=read('packages/core/ultra_sentinel_scope_v3.cjs');
 assert.doesNotMatch(s,/ultra_sentinel_core\.cjs|auto.?merge|gpt|openai/);
 assert.match(s,/semanticBehaviorVerified:0/);
 assert.match(s,/fullCoverageCertified:false/);
 assert.match(s,/legacyBenchmarksComparable:false/);
 assert.match(s,/sourceFindingsAreVerifiedDefects:false/);
 const cli=read('scripts/evaluate-c2-v3-original-excluded.cjs');
 assert.match(cli,/verifyEightSourceCompares/);
 assert.match(cli,/realpathSync/);
 assert.match(cli,/C2_V3_SOURCE_SCOPE_BLOCKED/);
 assert.match(cli,/originalTruthLabelsAdded:0/);
});
