'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yml=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-run19-raw-git-trees-provenance.yml'),'utf8');
const sha=[
 '74c5fb9697b2855a1395c9562c2f9b74df9c34c1','4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',
 'c594cb5383591d5040b1e88930fc76a5e5c9c6fa','9ad983576c16c6c34d59283979d83c69ede50dce',
 'e2050a76af7fa3010032604e6537ab124e7b4c38','104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
 '86565d51b021e9834062552522dda0424a9cb2bc','6508cc124076b9dea437ea1efc213d3ce55d7baf',
 '260c184932052a7cde0ce4f761e47cdea5f02725','858c9ce5cb6a7916d63f2348432013e49d02ba79',
 '362675d4e013fe79c57526ef7e3a7ca4c98a7115','2289f4e4cda55ddaa50f2016113ded82dc17203c',
 'cb184c56d28342e46923d149c0e7f27141ce1a24',
 '1060ce8b9f35d191ce8639337e4cff50085cbd7e','9d8572afedc634ac07dae58a0da326ea62bdc1da'];
test('all fifteen frozen tree SHA identities explicitly pinned',()=>{
 assert.equal(new Set(sha).size,15);
 for(const s of sha)assert.ok(yml.includes(s),s);
 assert.match(yml,/len\(all_shas\)==15/);
 assert.match(yml,/test "\$\(find "\$root\/trees" -maxdepth 1 -name '\*\.json' \| wc -l\)" -eq 15/);
});
test('only owner on trusted main can call GitHub',()=>{
 assert.match(yml,/github\.ref == 'refs\/heads\/main'/);
 assert.match(yml,/github\.event\.repository\.id == 1418338512/);
 assert.match(yml,/github\.actor_id == '322222186'/);
 assert.match(yml,/github\.event\.issue\.number == 50/);
 assert.match(yml,/ULTRA_SENTINEL_C2_ORIGINAL_GIT_TREES_V1/);
 assert.doesNotMatch(yml,/^\s+pull_request\s*:/m);
 assert.match(yml,/persist-credentials: false/);
});
test('raw GitHub responses are preserved, not reassembled',()=>{
 assert.match(yml,/gh api "\/repos\/cardenaspiero255-lang\/gamehub-ultra\/git\/trees\/\$sha\?recursive=1"/);
 assert.match(yml,/\.truncated == false/);
 assert.match(yml,/\.sha == \$sha/);
 assert.match(yml,/sha256sum -- \*\.json > SHA256SUMS/);
 assert.match(yml,/provenance_manifest\.json/);
});
test('no synthetic labels, unsupported score or automatic merge',()=>{
 assert.match(yml,/assert len\(blob_usage\)==215/);
 assert.match(yml,/assert len\(duplicates\)==26/);
 assert.match(yml,/HISTORICAL_DEVELOPMENT_ONLY/);
 assert.match(yml,/oldDetectorExecuted':False/);
 assert.match(yml,/newDetectorExecuted':False/);
 assert.match(yml,/tripleSPlusCertified':False/);
 assert.match(yml,/blindHoldoutCertified':False/);
 assert.doesNotMatch(yml,/gh pr merge|git push|gradlew train/);
});
test('all eight frozen PR counts are explicitly enforced',()=>{
 for(const p of ['(150,','(151,','(152,','(153,','(154,','(155,','(157,','(158,'])
  assert.ok(yml.includes(p),p);
 for(const needle of ['sum(map(len,changed.values()))==241',
                       'len(blob_usage)==215','len(duplicates)==26',
                       'sum(map(len,duplicates.values()))==52',
                       'reached==set(changed)']) assert.ok(yml.includes(needle),needle);
});
