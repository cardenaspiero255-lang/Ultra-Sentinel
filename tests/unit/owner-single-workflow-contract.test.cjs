'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..');
test('only exact GitHub owner comment from issue #50 starts a read-only OIDC worker',()=>{
 const yml=fs.readFileSync(path.join(ROOT,'.github/workflows/owner-single-approval.yml'),'utf8');
 for(const x of [
  'on:\n  issue_comment:\n    types: [created]',
  'github.ref == \'refs/heads/main\'',
  'github.event.repository.id == 1418338512',
  'github.actor_id == \'322222186\'',
  'github.event.comment.user.id == 322222186',
  'github.event.issue.number == 50',
  'github.event.issue.pull_request == null',
  'github.run_attempt == 1',
  'persist-credentials: false',
  'verify-owner-single-workflow.cjs',
  'gamehub-pr151-real-red-green-judge.sh',
  'gamehub-pr151-real-source-rollback.cjs',
  'retention-days: 14',
 ])assert.ok(yml.includes(x),x);
 assert.match(yml,/permissions:\n  contents: read\n  actions: read\n  issues: read\n  id-token: write/);
 assert.doesNotMatch(yml,/contents: write|pull_request_target|git push|git merge|secrets\.|npm publish|deployments: write/);
});
test('OIDC GitHub single-approval entrypoint never works by itself from ChatGPT message',()=>{
 const script=path.join(ROOT,'scripts/verify-owner-single-workflow.cjs');
 const run=spawnSync(process.execPath,[script],{encoding:'utf8',timeout:10000,
  env:{PATH:process.env.PATH,HOME:process.env.HOME}});
 assert.equal(run.status,1);
 assert.equal(run.stdout,'');
 assert.equal(run.stderr,'OWNER_SINGLE_GITHUB_SANDBOX_BLOCKED\n');
});
test('pinned allowlisted policy forbids any push, merge, release or non-historic target',()=>{
 const {readPolicy}=require('../../scripts/verify-owner-single-workflow.cjs');
 const value=readPolicy(ROOT);
 assert.match(value,/^[0-9a-f]{64}$/);
 const policy=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/quality/owner-single-approval-gamehub-policy.json'),'utf8'));
 assert.equal(policy.remoteWrites,false);
 assert.equal(policy.mergeAllowed,false);
 assert.equal(policy.productionReleaseAllowed,false);
});
