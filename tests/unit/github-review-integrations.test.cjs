'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {auditProviders,REVIEWERS,APPS}=require('../../adapters/github/ultra_sentinel_review_integrations.cjs');
const SHA='a'.repeat(40),OLD='b'.repeat(40);
const empty=()=>({headSha:SHA,reviews:[],checks:[]});
test('RED migration #199: plugin observations never authorize commits, merging or independent certification',()=>{
 const r=auditProviders(empty());
 assert.equal(r.sha,SHA);assert.equal(r.autoCommitAllowed,false);
 assert.equal(r.autoMergeAllowed,false);assert.equal(r.independentVerified,false);
 assert.equal(r.requiresHumanAuthorization,true);
 for(const key of ['coderabbit','qodo','sentry'])assert.equal(r.providers[key],'NO_EVIDENCE');
});
test('Codex is indefinitely excluded from active reviewer and app inventory',()=>{
 assert.equal(Object.hasOwn(REVIEWERS,'codex'),false);
 assert.equal(Object.hasOwn(APPS,'codex'),false);
 assert.equal(Object.hasOwn(auditProviders(empty()).providers,'codex'),false);
});
test('stale reviews and check runs cannot be reported as approvals',()=>{
 const r=auditProviders({headSha:SHA,
 reviews:[{user:{login:'coderabbitai[bot]'},state:'COMMENTED',commit_id:SHA},
 {user:{login:'qodo-merge-pro[bot]'},state:'APPROVED',commit_id:OLD}],
 checks:[{app:{slug:'sentry'},head_sha:SHA,status:'completed',conclusion:'success'}]});
 assert.equal(r.providers.coderabbit,'COMMENT_ONLY_NOT_APPROVED');
 assert.equal(r.providers.qodo,'STALE');
 assert.equal(r.providers.sentry,'CHECK_SUCCESS_ADVISORY');
 assert.equal(r.autoMergeAllowed,false);
});
test('failed, queued, skipped and neutral external checks never count as successful evidence',()=>{
 const check=(conclusion,status='completed')=>auditProviders({...empty(),
 checks:[{app:{slug:'sentry'},head_sha:SHA,status,conclusion}]}).providers.sentry;
 assert.equal(check('failure'),'CHECK_FAILED');
 assert.equal(check(null,'queued'),'PENDING');
 assert.notEqual(check('skipped'),'CHECK_SUCCESS_ADVISORY');
 assert.notEqual(check('neutral'),'CHECK_SUCCESS_ADVISORY');
 assert.notEqual(check(null),'CHECK_SUCCESS_ADVISORY');
});
test('invalid SHA, arrays and unbounded snapshots fail closed',()=>{
 for(const value of [
 {...empty(),headSha:'not-a-sha'}, {...empty(),reviews:'approved'},
 {...empty(),checks:[] ,reviews:Array(1001).fill({})},
 {...empty(),checks:Array(1001).fill({})}
 ])assert.throws(()=>auditProviders(value),/INVALID_REVIEW_EVIDENCE/);
});
