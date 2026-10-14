'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const m=require('../../packages/memory/ultra_sentinel_memory_ledger.cjs');
test('ledger is bounded and uses separate versioned schema',()=>{assert.equal(m.SCHEMA,'ultra-sentinel-family-hunter-memory/v1');assert.equal(m.MAX_RECORDS,200)});
test('ledger does not accept wrong schema',()=>assert.throws(()=>m.parseLedger({schema:'untrusted',revision:1,entries:[]}),/INVALID_LEDGER_HEADER/));
test('ledger exposes read-only evidence API',()=>{for(const x of ['parseLedger','entryDigest','verifiedEntries','searchVerified'])assert.equal(typeof m[x],'function')});
