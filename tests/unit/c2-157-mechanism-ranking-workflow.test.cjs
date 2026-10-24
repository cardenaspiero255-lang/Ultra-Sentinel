'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const w=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-157-mechanism-first-ranking.yml'),'utf8');
const s=fs.readFileSync(path.resolve(__dirname,'../../scripts/c2-rank-157-filename-mechanisms.cjs'),'utf8');

test('ranking owner gate cannot fetch files on an untrusted PR or rerun stale one-shot consent',()=>{
 assert.match(w,/github\.actor_id == '322222186'/);
 assert.match(w,/github\.ref == 'refs\/heads\/main'/);
 assert.match(w,/needs\.first-owner-introduction\.outputs\.introduced == 'true'/);
 assert.match(w,/needs\.offline-admission-and-tests\.result == 'success'/);
 assert.match(w,/C2-157-MECHANISM-FIRST-RANKING-20261024\.md/);
 assert.match(w,/github\.event\.repository\.id == 1418338512/);
 assert.match(w,/if\s*:\s*>-\s*github\.event\.repository\.id == 1418338512/);
});
test('all 157 identities come from frozen manifest and exactly 12 exposures excluded',()=>{
 assert.match(w,/remainingCandidates157\(/);
 assert.match(w,/C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024/);
 assert.match(w,/rows\.length!==157/);
 assert.match(w,/candidatesExamined==157 and \.sourcePreviouslyExposed==12/);
 assert.match(w,/wc -l < "\$root\/observations\.ndjson"\)" -eq 157/);
 assert.match(s,/candidatesExamined!==157/);
});
test('github source fragments cannot be copied to an artifact; report remains unscored',()=>{
 assert.match(w,/jq -se 'add \| map\(\{filename,status,sha,additions,deletions,changes\}\)'/);
 assert.match(w,/newGoldLabels==0/);
 assert.match(w,/candidatePredictionsRead==false/);
 assert.match(w,/originalOracleExecuted==false/);
 assert.match(w,/c2-157-frozen-mechanism-hints-shortlist-NO-GOLD/);
 assert.doesNotMatch(w,/contents:\s*write|pull-requests:\s*write|git clone .*\/pulls\//);
});
