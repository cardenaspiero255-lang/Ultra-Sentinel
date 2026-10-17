'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yml=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-pr158-owner-source-truth.yml'),'utf8');
const sh=fs.readFileSync(path.join(__dirname,'../../scripts/c2-pr158-owner-oracle.sh'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'../../scripts/c2-pr158-advanced-ttl-counterfactual.py'),'utf8');
test('only main owner can seal this original source',()=>{
 assert.match(yml,/github\.ref == 'refs\/heads\/main'/);
 assert.match(yml,/github\.actor_id == '322222186'/);
 assert.match(yml,/github\.event\.issue\.number == 50/);
 assert.match(yml,/ULTRA_SENTINEL_C2_PR158_ADVANCED_TTL_TRUTH_V1/);
 assert.doesNotMatch(yml,/^\s+pull_request\s*:/m);
});
test('prior owner archive and PR158 blob identity are pinned',()=>{
 assert.match(yml,/39057159822/);assert.match(yml,/12110215750/);
 assert.match(yml,/23429e9483176c03546ac639200e0b2f74194decd645821361f0393b82ee93c7/);
 assert.match(yml,/9d8572afedc634ac07dae58a0da326ea62bdc1da/);
 assert.match(yml,/0d18a43a8e36ea3edacc2cad72071d96aa31626e/);
 assert.match(yml,/git hash-object/);
});
test('producer, inactive-session context and planning consumer pinned',()=>{
 assert.match(yml,/2462ef57ff426493c5398de1201d69bba9c1fe60/);
 assert.match(yml,/30c1e2883838f07814df996d4fbaa7fc6bd34438/);
 assert.match(yml,/2b7236098db5b6e4da56458e4461e3075f08a076/);
 assert.match(yml,/snapshotForPlanning/);
 assert.match(yml,/activeSessionPackage != null/);
});
test('original Kotlin executes only in required networkless JVM isolation',()=>{
 assert.match(yml,/bubblewrap apparmor/);
 assert.match(yml,/kernel\.apparmor_restrict_unprivileged_userns/);
 assert.match(yml,/C2_OWNER_SANDBOX=1/);
 assert.match(yml,/persist-credentials: false/);
 assert.match(sh,/env -i PATH=\/usr\/bin:\/bin HOME=\/tmp bwrap/);
 assert.match(sh,/--unshare-all/);
 assert.match(sh,/GITHUB_ACTIONS/);
});
test('oracle must first pass fresh controls, then reproduce TTL failure',()=>{
 assert.match(sh,/C2_PR158_FRESH_CONTROL_PASS/);
 assert.match(sh,/C2_PR158_ADVANCED_SIGNAL_TTL_REFRESH_EXTENSION/);
 assert.match(sh,/C2_PR158_EXPIRED_ADVANCED_TTL_PASS/);
 assert.match(sh,/C2_PR158_CROSS_GAME_CONTROL_PASS/);
 assert.match(sh,/original_exit/);
 assert.match(source,/IMMUTABLE_SOURCE_ANCHOR_DRIFT/);
});
test('no model scoring or certification, no implicit merge',()=>{
 assert.match(yml,/neededAdditionalLabelsAtLeast == 108/);
 assert.match(yml,/benchmarkScoredLabels == 0/);
 assert.match(yml,/tripleSPlusCertified == false/);
 assert.match(yml,/precision == null/);
 assert.doesNotMatch(yml,/gh pr merge|git push|gradlew train/);
});
