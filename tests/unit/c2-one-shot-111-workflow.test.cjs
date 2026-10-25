'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const p=path.resolve(__dirname,'../../.github/workflows/c2-one-shot-111-admission.yml');
const w=fs.readFileSync(p,'utf8');
test('owner-only immutable introduction, source-free protected one-shot, no trigger on untrusted PR',()=>{
 assert.match(w,/github.event.repository.id == 1418338512/);
 assert.match(w,/github.actor_id == '322222186'/);
 assert.match(w,/github.ref == 'refs\/heads\/main'/);
 assert.match(w,/needs.introducing-owner-once.outputs.introduced == 'true'/);
 assert.match(w,/needs.offline-tdd-and-architecture.result == 'success'/);
 assert.match(w,/git diff --name-only "\$GITHUB_SHA\^1" "\$GITHUB_SHA"/);
 assert.match(w,/C2-ONE-SHOT-111-AUTHENTIC-LABEL-CAMPAIGN-20261024.md/);
 assert.doesNotMatch(w,/pull_request_target:/);
});
test('the actual owner V3 artifact, run, digest, snapshot are required',()=>{
 assert.match(w,/40148603915/);
 assert.match(w,/12581349654/);
 assert.match(w,/88a7f5764b156c7713f324667839f6f96172cfdfee95a2d8d4d519d131426003/);
 assert.match(w,/f91cbc71074f39254c6d3058d186319d7b483bc1/);
 assert.match(w,/actions\/download-artifact@fa0a91b85d4f404e444e00e005971372dc801d16/);
 assert.match(w,/c2-155-frozen-integrity-first-shortlist-NO-GOLD/);
});
test('there are 32 metadata shards but zero source/oracle permission or GOLD',()=>{
 assert.match(w,/c2-one-shot-111-admission.cjs/);
 assert.match(w,/\.totalBatchShards==32/);
 assert.match(w,/\.sourceCandidates==155/);
 assert.match(w,/\.newGoldLabels==0/);
 assert.match(w,/\.authorizedSourceReads==0/);
 assert.match(w,/\.candidateSourceInspected==false/);
 assert.match(w,/\.missingAuthenticLabels==111/);
 assert.doesNotMatch(w,/contents:\s*write|pull-requests:\s*write/);
 assert.doesNotMatch(w,/git clone|curl.*raw.githubusercontent|GlobalScope/);
});
