'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-run16-two-original-negatives.yml'),'utf8');
const sh=fs.readFileSync(path.join(__dirname,'../../scripts/c2-run16-owner-negative-oracles.sh'),'utf8');
test('only trusted main owner issue #50 or owner dispatch may seal',()=>{
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/github\.actor_id == '322222186'/);
 assert.match(workflow,/github\.event\.issue\.number == 50/);
 assert.match(workflow,/github\.event\.sender\.id == 322222186/);
 assert.doesNotMatch(workflow,/^\s+pull_request\s*:/m);
});
test('prior 12-label owner run and digest pinned',()=>{
 for(const token of ['39059101315','12110378858',
 '2c14ea320284efac3539f0811bc9910ce5854bf3391452383734a7eed65d6193',
 'aa5de2d6028806b2f88aa1b027a5a8ede2d1aa75c3edd6385879ab100d68f0e3'])
  assert.match(workflow,new RegExp(token));
});
test('PR151, PR153 source and production caller SHA pinned',()=>{
 for(const token of ['f623999ecd31f6961bc48f34d834674494b7d1db',
 '18911c26a9afaf051fda0e9ea14cdaccf943a47b',
 '6bfce4f62894c5f96cf993933a9e2a426163720a',
 '592fc44b083721e15fd3ce5c105502f0547449cc',
 '51aa42d47aa451fa1866616e67accfa70e0980c2',
 'SessionCoachPresentation.lines',
 'repository.saveAdaptiveProfileForGame',
 'AdaptiveAwareGameSelectionStateRepository'])
  assert.ok(workflow.includes(token),token);
 assert.doesNotMatch(workflow,/999999/);
});
test('must execute original under bubblewrap and AppArmor without tokens',()=>{
 assert.match(workflow,/bubblewrap apparmor/);
 assert.match(workflow,/kernel\.apparmor_restrict_unprivileged_userns/);
 assert.match(workflow,/C2_OWNER_SANDBOX=1/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(sh,/--unshare-all --new-session/);
 assert.match(sh,/env -i PATH=\/usr\/bin:\/bin HOME=\/tmp bwrap/);
});
test('both original positives controls pass and both mutated copies fail',()=>{
 assert.match(sh,/C2_PR151_ACTIVE_TAIL_PASS/);
 assert.match(sh,/C2_PR151_IDLE_ISOLATION_PASS/);
 assert.match(sh,/C2_PR151_ACTIVE_OBSERVATION_TAIL_BOUNDS/);
 assert.match(sh,/C2_PR153_EXPLICIT_CONTROL_PASS/);
 assert.match(sh,/C2_PR153_ADAPTIVE_CALLBACK_ISOLATION_PASS/);
 assert.match(sh,/C2_PR153_ADAPTIVE_WRITE_LEAKS_EXPLICIT_CALLBACK/);
});
test('CI cannot claim detector metrics or SSS+ certification',()=>{
 for(const expr of ['verifiedScopedNegativeLabels == 7','neededAdditionalLabelsAtLeast == 106',
  'benchmarkScoredLabels == 0','tripleSPlusCertified == false',
  'precision == null','recall == null','f1 == null'])
  assert.ok(workflow.includes(expr),expr);
 assert.doesNotMatch(workflow,/gh pr merge|git push|gradlew train/);
});
