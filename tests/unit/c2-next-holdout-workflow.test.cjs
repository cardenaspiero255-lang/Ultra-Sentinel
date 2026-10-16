'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const s=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-eight-holdout-freeze.yml'),'utf8');
test('only owner and main can freeze eight untouched authentic PR metadata',()=>{
 for(const frag of [
 "github.ref == 'refs/heads/main'",
 'github.event.repository.id == 1418338512',
 "github.actor_id == '322222186'",
 'github.event.comment.user.id == 322222186',
 'ULTRA_SENTINEL_C2_NEXT_HOLDOUT_FREEZE_V1',
 'for pr in 150 151 152 153 154 155 157 158; do',
 'test "$(jq length "$root/normalized-api.json")" -eq 8',
 'db29f94be1e0afb791a241d26f449695df0eafd0',
 '7df2a994f566ad56bdacab999fa6ba83b69e3b4d',
 '8c2fa4289d331e157b07f4e693239ac7e31cae8c'
 ])assert.ok(s.includes(frag),frag);
 assert.doesNotMatch(s,/pull_request_target:|contents:\s*write|auto.?merge/);
});
test('never fetches PR diff or candidate predictions before independent oracle labeling',()=>{
 assert.match(s,/env -i PATH=/);
 assert.match(s,/--experimental-permission/);
 assert.match(s,/candidateInspected == false/);
 assert.match(s,/truthLabelsInspected == false/);
 assert.match(s,/baselineInspected == false/);
 assert.match(s,/labelsVerified == 0/);
 assert.match(s,/precision == null and \.recall == null and \.f1 == null/);
 assert.match(s,/fpNonRegressionVerified == false/);
 assert.match(s,/tripleSPlusCertified == false/);
 assert.doesNotMatch(s,/gh pr diff|gh pr checkout|gh run download|\/compare\/\$base|--share-net/);
});
