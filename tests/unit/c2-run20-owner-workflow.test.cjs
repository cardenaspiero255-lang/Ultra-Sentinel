'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-run20-store-original-source-truth.yml'),'utf8');
const oracle=fs.readFileSync(path.join(__dirname,'../../scripts/c2-run20-owner-original-oracles.sh'),'utf8');
test('owner main only; no code from PR can trigger a source seal',()=>{
 for(const x of ["github.ref == 'refs/heads/main'","github.actor_id == '322222186'",
  'github.event.issue.number == 50','ULTRA_SENTINEL_C2_RUN20_STALE_ROLLBACK_SESSION_TRUTH_V1',
  'persist-credentials: false'])assert.ok(workflow.includes(x),x);
 assert.doesNotMatch(workflow,/^\s+pull_request\s*:/m);
});
test('previous 18 original cases pinned to authentic owner run and artifact',()=>{
 for(const x of ['39071144969','12115670408',
 'aa2d483e887b7b89bb44aca2537744233f9307ebb8f9e24236e2c813ddab5507',
 'efb7da33efad947995f315621d42de2de9edace6d9d6b9e4d9e91cf4dd1aae12']){
  assert.ok(workflow.includes(x),x);
 }
});
test('original PR151 and PR152 source identities and real production callers pinned',()=>{
 for(const x of ['ed936aa687b08cf8d964d54f9d88e68bb12344ec',
 '742e440004d51743e8e4b02c40171f951edfd125',
 '5e747dd88469b7457269b1e2dc592af9cd439f46',
 'ef69341a61164bbd69832f26186e48582c1b3042',
 'recordApplied = aiProfileProposalStore::recordApplied',
 'expectedSessionId = sessionId','git hash-object'])
  assert.ok(workflow.includes(x),x);
});
test('networkless tokenless JVM and sensitivity of both originals required',()=>{
 assert.match(workflow,/bubblewrap apparmor/);
 assert.match(workflow,/C2_OWNER_SANDBOX=1/);
 assert.match(oracle,/env -i PATH=\/usr\/bin:\/bin HOME=\/tmp bwrap/);
 assert.match(oracle,/--unshare-all --new-session/);
 for(const x of ['C2_PR152_VALID_VERSION_CONTROL_PASS',
 'C2_PR152_STALE_PROPOSAL_CAN_OVERWRITE_NEWER_ROLLBACK_STATE',
 'C2_PR152_MONOTONIC_ROLLBACK_STATE_PASS',
 'C2_PR151_SESSION_DATA_CONTROL_PASS',
 'C2_PR151_WRONG_SESSION_CLOSE_REJECTED',
 'C2_PR151_EXPECTED_SESSION_ID_MISMATCH_MUST_NOT_FINISH'])
  assert.ok(oracle.includes(x),x);
});
test('no fake detector benchmark or implicit SSS+ certification',()=>{
 for(const x of ['sourcePositiveLabels == 10',
 'verifiedScopedNegativeLabels == 10','neededAdditionalLabelsAtLeast == 100',
 'benchmarkScoredLabels == 0','precision == null','recall == null',
 'independentBlindHoldoutCertified == false',
 'tripleSPlusCertified == false'])assert.ok(workflow.includes(x),x);
 assert.doesNotMatch(workflow,/gh pr merge|git push|gradlew train/);
});
