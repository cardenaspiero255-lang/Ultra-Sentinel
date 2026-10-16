'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yaml=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-truth-seal.yml'),'utf8');
test('owner-only C2 truth sealing uses three known success artifacts and fixed run SHAs',()=>{
 for(const mark of [
 "github.ref == 'refs/heads/main'",
 'github.event.repository.id == 1418338512',
 "github.actor_id == '322222186'",
 'github.event.comment.user.id == 322222186',
 '38838525845','12019324481','6946e730d030f4772eff3ea9e704d7731f99c721',
 '38839053940','12019719566','1562bdd72ee9c57038af881640121c39c9578905',
 '38840046800','12020522075','2f1476412d71cc7d1e7e01fa051039a532aa01d5',
 'C2_UNSEEN_TRUTH_SEAL_V1'
 ])assert.ok(yaml.includes(mark),mark);
});
test('read-only CLI does not see GitHub token and cannot emit a fake benchmark',()=>{
 assert.match(yaml,/permissions:\n  contents: read\n  actions: read/);
 assert.match(yaml,/env -i PATH=/);
 assert.match(yaml,/--experimental-permission/);
 assert.match(yaml,/--allow-fs-read=/);
 assert.match(yaml,/\.labels\[0\]\.positive == true/);
 assert.match(yaml,/verifiedNegativeFindingLabels == 0/);
 assert.match(yaml,/precision == null and \.recall == null and \.f1 == null/);
 assert.match(yaml,/tripleSPlusCertified == false/);
 assert.doesNotMatch(yaml,/--share-net|git checkout .*head|pull_request_target:|contents: write|auto.?merge/);
});
