'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const workflow=fs.readFileSync(path.resolve(__dirname,
 '../../.github/workflows/c2-live-capture.yml'),'utf8');
const script=fs.readFileSync(path.resolve(__dirname,
 '../../scripts/capture-live-gamehub-c2.cjs'),'utf8');
test('real cohort runner is restricted to pinned owner issue and trusted main',()=>{
 for(const exact of [
  "github.ref == 'refs/heads/main'",
  "github.event.repository.id == 1418338512",
  "github.event.issue.number == 50",
  "github.event.issue.pull_request == null",
  "github.event.comment.body == 'ULTRA_SENTINEL_C2_CAPTURE_V1'",
  "github.event.comment.user.id == 322222186",
  "github.event.sender.id == 322222186",
  'persist-credentials: false','ref: main',
  'ultra-sentinel-c2-sanitized-candidates'
 ])assert.ok(workflow.includes(exact),exact);
 assert.match(workflow,/permissions:\n  contents: read\n  pull-requests: read/);
 assert.doesNotMatch(workflow,/pull_request_target|contents: write|pull-requests: write|secrets\./);
 assert.doesNotMatch(workflow,/\s+run:\s*git push/);
 assert.match(workflow,/retention-days: 7/);
});
test('workflow outputs only sanitized report, not raw API/PR code',()=>{
 assert.match(workflow,/node scripts\/capture-live-gamehub-c2\.cjs > "\$RUNNER_TEMP\/c2-candidate\.json"/);
 assert.match(workflow,/always\(\) && steps\.c2\.outputs\.report_valid == 'true'/);
 assert.match(script,/captureLiveC2Cohort/);
 assert.doesNotMatch(script,/console\.log\(error|JSON\.stringify\(process\.env\)|console\.error\(error/);
});
