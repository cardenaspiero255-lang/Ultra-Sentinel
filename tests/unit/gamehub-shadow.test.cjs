'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {summarizeShadow}=require('../../packages/orchestrator/gamehub-shadow.cjs');
const sha='a'.repeat(40),repo='cardenaspiero255-lang/gamehub-ultra';
const review={pr:201,envelope:{targetRepo:repo,headSha:sha,verdict:'ADVISORY'},
 authenticated:true,headStable:true,completeDiff:true,mergeAllowed:false,changedFiles:9};
const names=['Sentinel Core / full regression suite','Ultra Sentinel Core — own reviewer'];
const checks={headSha:sha,runs:names.map(name=>({name,status:'completed',conclusion:'success'}))};
test('shadow comparison never equates two green check runs with verified code equivalence',()=>{
 const r=summarizeShadow(review,checks);
 assert.equal(r.comparableByName,true);
 assert.equal(r.semanticEquivalenceVerified,false);
 assert.equal(r.independentAuditVerified,false);
 assert.equal(r.autoRepair,false);assert.equal(r.autoMerge,false);
 assert.equal(r.baseline.length,2);
});
test('stale SHA, missing real GitHub transport or claims of write authority block',()=>{
 assert.throws(()=>summarizeShadow({...review,headStable:false},checks),/INVALID_SHADOW_EVIDENCE/);
 assert.throws(()=>summarizeShadow({...review,mergeAllowed:true},checks),/INVALID_SHADOW_EVIDENCE/);
 assert.throws(()=>summarizeShadow(review,{...checks,headSha:'b'.repeat(40)}),/INVALID_SHADOW_EVIDENCE/);
});
test('missing or failed baseline checks are explicit, never recast as success',()=>{
 const r=summarizeShadow(review,{headSha:sha,runs:[]});
 assert.equal(r.comparableByName,false);
 assert.ok(r.baseline.every(x=>x.status==='INCOMPLETE'));
 const fail=summarizeShadow(review,{headSha:sha,runs:checks.runs.map(x=>({...x,conclusion:'failure'}))});
 assert.equal(fail.comparableByName,false);
 assert.equal(fail.checks.failure,2);
});
test('untrusted CI statuses and duplicate baseline names fail conservatively',()=>{
 assert.throws(()=>summarizeShadow(review,{headSha:sha,runs:[{name:names[0],status:'evil',conclusion:'success'}]}),/INVALID_GITHUB_CHECK/);
 const duplicate=summarizeShadow(review,{headSha:sha,runs:[checks.runs[0],checks.runs[0],checks.runs[1]]});
 assert.equal(duplicate.comparableByName,false);
});
