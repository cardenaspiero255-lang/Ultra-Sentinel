'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const workflow=fs.readFileSync(path.resolve(__dirname,
 '../../.github/workflows/bwrap-isolation-drill.yml'),'utf8');
const smoke=fs.readFileSync(path.resolve(__dirname,
 '../../scripts/drill-bwrap-isolation.cjs'),'utf8');
test('Bubblewrap host drill only runs on owner-approved main without write permissions',()=>{
 for(const pattern of [
  "github.ref == 'refs/heads/main'",
  "github.event.repository.id == 1418338512",
  "github.event.issue.number == 50",
  "github.event.issue.pull_request == null",
  "github.event.comment.body == 'ULTRA_SENTINEL_BWRAP_DRILL_V1'",
  "github.event.comment.user.id == 322222186",
  "github.event.sender.id == 322222186",
  'persist-credentials: false',
  'ref: main','runs-on: ubuntu-24.04',
  'node scripts/drill-bwrap-isolation.cjs'
 ])assert.ok(workflow.includes(pattern),pattern);
 assert.match(workflow,/permissions:\n  contents: read/);
 assert.doesNotMatch(workflow,/secrets\.|pull_request_target|contents: write|GITHUB_TOKEN:/);
});
test('isolation test actually exercises OS namespace, no network, and can never authorize a real repair',()=>{
 for(const pattern of [
  "bubblewrapCommand(sandbox",
  "result.status!==0",
  "networkNamespaceSeparate:true",
  "hostFilesHidden:true",
  "networkAttemptDenied:true",
  "secretsAbsent:true",
  "productionOwnerAuthorizationVerified:false",
  "realRollbackE2EVerified:false",
  "automaticRepairEnabled:false",
  "tripleSPlusCertified:false"
 ])assert.ok(smoke.includes(pattern),pattern);
 assert.match(smoke,/--unshare-all/);
 assert.match(smoke,/--clearenv/);
 assert.match(smoke,/netNamespace===hostNamespace/);
 assert.doesNotMatch(smoke,/git\s+(?:push|reset)|Authorization:\s*Bearer|exec\(/);
});

test('Ubuntu 24.04 policy is executable-scoped, not a global namespace bypass',()=>{
 for(const exact of [
  'apparmor-profiles','bwrap-userns-restrict',
  '/usr/share/apparmor/extra-profiles/bwrap-userns-restrict',
  'sudo apparmor_parser -r "$dest"',
  'sysctl -n kernel.apparmor_restrict_unprivileged_userns',
  'BWRAP_RESTRICTED_APPARMOR_PROFILE_LOADED'
 ])assert.ok(workflow.includes(exact),exact);
 assert.doesNotMatch(workflow,/sysctl\s+-w|apparmor_restrict_unprivileged_userns=0/);
 assert.doesNotMatch(workflow,/--share-net|--privileged|chmod\s+[+]?[us]/);
 assert.match(workflow,/test ! -L "\$src"/);
 assert.match(workflow,/sudo install -o root -g root -m 0644/);
});
test('OS namespace failure classification is bounded, deterministic, and redacts raw messages',()=>{
 const {classifyBwrapFailure}=require('../../scripts/drill-bwrap-isolation.cjs');
 const cases=[
  ['bwrap: setting up uid map: Permission denied','BWRAP_NAMESPACE_PERMISSION_DENIED'],
  ['bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted','BWRAP_NAMESPACE_PERMISSION_DENIED'],
  ['bwrap: creating new namespace failed','BWRAP_NAMESPACE_PERMISSION_DENIED'],
  ['bwrap: bind mount failed','BWRAP_MOUNT_SETUP_FAILED'],
  ['Traceback (most recent call last): /tmp/private-secret','BWRAP_FIXTURE_PROCESS_FAILED'],
  ['arbitrary host path /home/runner/private','BWRAP_NAMESPACE_OPERATION_DENIED']
 ];
 for(const [stderr,expected] of cases){
  const result=classifyBwrapFailure({stderr,status:1});
  assert.equal(result,expected);
  assert.doesNotMatch(result,/private|\/tmp\/|\/home\/|Bearer/i);
 }
});
