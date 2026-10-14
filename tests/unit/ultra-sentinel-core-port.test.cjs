'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../../packages/core/ultra_sentinel_core.cjs');
test('core exports analyzer',()=>assert.equal(typeof core.analyze,'function'));
