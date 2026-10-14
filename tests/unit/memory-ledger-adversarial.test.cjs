'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const ledger=require('../../packages/memory/ultra_sentinel_memory_ledger.cjs');
const sha='a'.repeat(40),testSha='b'.repeat(40);
const entry=()=>({id:'repair_123456',type:'verified_fix',rule:'SPEECH_REENTRANT_RETRY',domain:'voice',fixSha:sha,testSha,evidenceUrl:'https://github.com/cardenaspiero255-lang/gamehub-ultra/commit/'+sha,summary:'Validated fix for repeated speech recognizer restarts',advice:'Review a bounded and supervised restart sequence',tests:['red failing regression','green passing regression']});
const raw=(entries=[])=>({schema:ledger.SCHEMA,revision:1,entries});
test('accepts empty bounded ledger without accrediting history',async()=>{
 const r=raw();
 assert.deepEqual(ledger.parseLedger(r),[]);
 assert.deepEqual(await ledger.verifiedEntries(r),[]);
 assert.deepEqual(await ledger.searchVerified('unknown',r),[]);
});
test('valid-looking user history cannot self-certify through callback',async()=>{
 const e=entry();
 const parsed=ledger.parseLedger(raw([e]));
 assert.equal(parsed.length,1);
 assert.ok(Object.isFrozen(parsed[0]));
 let invoked=false;
 const callback=()=>{invoked=true;return true};
 assert.deepEqual(await ledger.verifiedEntries(raw([e]),callback),[]);
 assert.equal(invoked,false);
 const suggestions=await ledger.searchVerified({rule:e.rule},raw([e]),callback);
 assert.equal(invoked,false);
 assert.ok(suggestions.every(x=>x.verification==='curated_playbook'&&x.type==='playbook'));
});
test('rejects duplicated record IDs and oversized ledger',()=>{
 const e=entry();
 assert.throws(()=>ledger.parseLedger(raw([e,e])),/INVALID_LEDGER_ENTRY/);
 assert.throws(()=>ledger.parseLedger(raw(Array.from({length:201},()=>e))),/INVALID_LEDGER_HEADER/);
});
test('rejects malformed schema, revision, provenance and untrusted fields',()=>{
 assert.throws(()=>ledger.parseLedger({...raw(),revision:-1}),/INVALID_LEDGER_HEADER/);
 assert.throws(()=>ledger.parseLedger(raw([{...entry(),fixSha:'invalid'}])),/INVALID_LEDGER_ENTRY/);
 assert.throws(()=>ledger.parseLedger(raw([{...entry(),evidenceUrl:'https://evil.example/fake'}])),/INVALID_LEDGER_ENTRY/);
 assert.throws(()=>ledger.parseLedger(raw([{...entry(),tests:[]}])),/INVALID_LEDGER_ENTRY/);
 assert.throws(()=>ledger.parseLedger(raw([{...entry(),summary:{toString(){throw Error('SHOULD_NOT_COERCE')}}])),/INVALID_LEDGER_ENTRY/);
});
test('malicious entry getter is accessed at most once',()=>{
 let reads=0;
 const e=entry();
 Object.defineProperty(e,'fixSha',{get(){reads++;return reads===1?sha:'evil'}});
 const parsed=ledger.parseLedger(raw([e]));
 assert.equal(reads,1);
 assert.equal(parsed[0].fixSha,sha);
});
test('hostile header getters cannot bypass bounded input',()=>{
 let reads=0;
 const value={schema:ledger.SCHEMA,revision:1,get entries(){reads++;return reads===1?[]:Array(1000).fill(entry())}};
 assert.deepEqual(ledger.parseLedger(value),[]);
 assert.equal(reads,1);
});
test('canonical digest includes all evidence-bearing fields',()=>{
 const e=entry();
 const normalized=ledger.parseLedger(raw([e]))[0];
 const expected=createHash('sha256').update(JSON.stringify([normalized.id,normalized.type,normalized.rule,normalized.domain,normalized.fixSha,normalized.testSha,normalized.evidenceUrl,normalized.summary,normalized.advice,normalized.tests]),'utf8').digest('hex');
 assert.equal(ledger.entryDigest(normalized),expected);
 assert.notEqual(ledger.entryDigest({...normalized,advice:normalized.advice+' extra'}),expected);
});
test('invalid ledger fails closed even when verifier would approve',async()=>{
 let called=false;
 await assert.rejects(ledger.verifiedEntries(raw([{...entry(),testSha:'bad'}]),()=>{called=true;return true}),/INVALID_LEDGER_ENTRY/);
 assert.equal(called,false);
});
