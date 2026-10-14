'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {resolveMode,present}=require('../../packages/family-hunter/ultra_sentinel_family_hunter_modes.cjs');
test('default mode suggests without automatic repair',()=>{const m=resolveMode();assert.equal(m.mode,'REVIEW_WITH_SOLUTIONS');assert.equal(m.autoCommitAllowed,false);assert.equal(m.autoMergeAllowed,false)});
test('repair request never grants write permission',()=>{const m=resolveMode('REPAIR_COMMITS_AUTHORIZED');assert.equal(m.status,'AUTHORIZATION_REQUIRED');assert.equal(m.autoCommitAllowed,false);assert.equal(m.autoMergeAllowed,false)});
test('invalid modes do not gain authority',()=>assert.equal(resolveMode('UNTRUSTED').status,'INVALID_MODE'));
test('presentation API exists',()=>assert.equal(typeof present,'function'));
