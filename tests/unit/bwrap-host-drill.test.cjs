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
