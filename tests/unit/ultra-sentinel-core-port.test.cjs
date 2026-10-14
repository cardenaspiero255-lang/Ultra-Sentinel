'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../../packages/core/ultra_sentinel_core.cjs');
test('core exports analyzer',()=>assert.equal(typeof core.analyze,'function'));
test('core version stable',()=>assert.equal(core.VERSION,'2.0.0'));
test('core parser preserves line numbers',()=>assert.deepEqual(core.parsePatch('@@ -1 +5 @@\n+safe\n').added.map(x=>x.line),[5]));
test('core detects incomplete evidence',()=>assert.equal(core.analyze([{filename:'app/src/main/java/com/example/Engine.kt',patch:null,changes:1}]).verdict,'INCOMPLETE'));
