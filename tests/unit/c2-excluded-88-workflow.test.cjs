'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');
test('owner-only 88-file audit authenticates original archive and refuses source/truth conflation',()=>{
 const w=read('.github/workflows/c2-excluded-88-diff-audit.yml');
 for(const needle of [
 'ULTRA_SENTINEL_C2_EXCLUDED_88_AUDIT_V1',
 'github.event.repository.id == 1418338512',
 'github.event.comment.user.id == 322222186',
 '38974165470','12077973482',
 'fcc878c3af06d053e3e2b3e9ef3cc0f646e1a0edee4871a95333f16cd9e476a7',
 'source-universe.tar','source-inventory.json',
 "not m.isfile()",
 'tarfile.open','os.O_NOFOLLOW','m.size>8*1024*1024',
 'db29f94be1e0afb791a241d26f449695df0eafd0',
 'verifiedOriginalHeadBlobs == 88','originalKotlinTestFilesVerified == 83',
 'originalGradleFilesVerified == 5','coreFullSemanticCoverageCertified == false',
 'truthLabelsAdded == 0','tripleSPlusCertified == false',
 'ORIGINAL_HEAD_CONTENT_INSPECTED_HEURISTIC_ONLY_NOT_CERTIFIED'
 ])assert.ok(w.includes(needle),needle);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge|candidate-predictions|docker run/);
});
test('immutable evidence verifier cannot claim 88 code defects or 241 Core-analyzed files',()=>{
 const impl=read('packages/quality-gates/c2-excluded-file-audit.cjs');
 for(const needle of ['verifyOriginalExcludedHeadBlobs','sourceBlobSha','gitBlob',
 'coreFullSemanticCoverageCertified:false','originalCodeDefectFreeCertified:false',
 'truthLabelsAdded:0','TextDecoder','sha256'])assert.ok(impl.includes(needle),needle);
 assert.doesNotMatch(impl,/trainModel|require\(["'].*known-defect|autoMerge/);
});
