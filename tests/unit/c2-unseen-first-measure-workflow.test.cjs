'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const s=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-first-measure.yml'),'utf8');
test('owner and commit-frozen detector are required for any measured finding',()=>{
 for(const x of [
  "github.ref == 'refs/heads/main'",
  'github.event.repository.id == 1418338512',
  "github.actor_id == '322222186'",
  'github.event.comment.user.id == 322222186',
  'ULTRA_SENTINEL_C2_UNSEEN_FIRST_MEASURE_V1',
  'db29f94be1e0afb791a241d26f449695df0eafd0',
  'b8b6e79c1c544a9c22ea5aa0ea857881a0e1b6d9'
 ])assert.ok(s.includes(x),x);
});
test('v3 truth existed before candidate measurement, with exact GitHub run/artifact SHA',()=>{
 for(const x of [
  '38842931678','12021956554',
  'ae9e833ada13cef8c1322fab983409df09f2a86d',
  'dce263a427b05c2fcb4fa2c52509ed6a82964772fe9c4f0bd526230c77809a59',
  'sourceKind == "FROZEN_ORIGINAL_PR_DIFF"',
  'node scripts/capture-c2-unseen-core.cjs',
  '--experimental-permission',
  'env -i PATH=',
  'verifiedNegativeFindingLabels == 0',
  'fpNonRegressionVerified == false',
  'certified95Percent == false',
  'tripleSPlusCertified == false'
 ])assert.ok(s.includes(x),x);
});
test('no source material, auth tokens or candidate files are archived, no auto-merge',()=>{
 assert.match(s,/permissions:\n  contents: read\n  actions: read\n  pull-requests: read/);
 assert.match(s,/name: ultra-sentinel-c2-unseen-three-positive-detection/);
 const published=s.slice(s.indexOf('      - name: Archive sanitized'));
 assert.doesNotMatch(published,/candidate\.json|truth-v3\.json|app\/src|source\.kt/);
 assert.doesNotMatch(s,/contents: write|--share-net|pull_request_target:|auto.?merge/);
});
