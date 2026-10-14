'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateWire}=require('../../packages/contracts/validate-wire.cjs');
const sha='a'.repeat(40);
const incident=()=>({schemaVersion:1,sourceRepo:'owner/repo',service:'sentinel',eventType:'CI_FAILURE',observedAt:'2016-12-31T23:59:60Z',evidenceState:'UNVERIFIED'});
const review=()=>({schemaVersion:1,targetRepo:'owner/repo',headSha:sha,verdict:'CLEAR',evidenceState:'VERIFIED'});
const repair=()=>({schemaVersion:1,mode:'REPAIR_COMMITS_AUTHORIZED',repository:'owner/repo',prNumber:6,headSha:sha,actor:'operator',scope:['src/file.cjs'],expiresAt:'2026-12-31T23:59:59Z',nonce:'1234567890abcdef',budget:{maxCommits:1,maxCiRuns:2,maxDurationSeconds:120,maxFilesChanged:2,maxPatchBytes:4096}});

test('v1 incident shape accepts a verified historical leap-second instant',()=>{
 const result=validateWire('incident',incident());
 assert.equal(result.ok,true,JSON.stringify(result.errors));
 assert.equal(Object.hasOwn(result,'authorized'),false,'schema acceptance must never grant authority');
});
test('incident event times reject nonexistent calendar days and forged leaps',()=>{
 for(const value of ['never','2026-02-31T12:00:00Z','2026-12-31T23:59:60Z']){
  const item=incident();item.observedAt=value;
  assert.equal(validateWire('incident',item).ok,false,value);
 }
});
test('fail closed for unverified CLEAR review and accept verified syntax only',()=>{
 assert.equal(validateWire('review-result',review()).ok,true);
 for(const state of ['UNVERIFIED','INCOMPLETE']){
  const item=review();item.evidenceState=state;
  assert.equal(validateWire('review-result',item).ok,false,state);
 }
 const item=review();item.verdict='ADVISORY';item.evidenceState='UNVERIFIED';
 assert.equal(validateWire('review-result',item).ok,true);
});
test('contract envelopes reject extra properties, versions and forged fields',()=>{
 const i=incident();i.shellCommand='rm -rf /';
 assert.equal(validateWire('incident',i).ok,false);
 const r=review();r.schemaVersion=2;
 assert.equal(validateWire('review-result',r).ok,false);
 const a=repair();a.authorizationValid=true;
 assert.equal(validateWire('repair-authorization',a).ok,false);
 assert.equal(validateWire('unknown',i).ok,false);
});
test('repair authorization shape is never interpreted as an actual authorization',()=>{
 const result=validateWire('repair-authorization',repair());
 assert.equal(result.ok,true,JSON.stringify(result.errors));
 assert.equal(Object.hasOwn(result,'authorized'),false);
});
test('repair scope budget and nonce errors fail closed',()=>{
 const bads=[
  a=>{a.scope=[''];},
  a=>{a.scope=['src/file.cjs','src/file.cjs'];},
  a=>{a.scope=['../secrets'];},
  a=>{a.nonce='short';},
  a=>{a.budget.maxCommits=4;},
  a=>{a.budget.maxFilesChanged=0;},
  a=>{a.expiresAt='2026-02-31T12:00:00Z';},
  a=>{delete a.headSha;}
 ];
 for(const [idx,mutate] of bads.entries()){
  const item=repair();mutate(item);
  assert.equal(validateWire('repair-authorization',item).ok,false,'case '+idx);
 }
});
test('shape boundary rejects prototype pollution, cycles, arrays and accessors',()=>{
 assert.equal(validateWire('incident',[]).ok,false);
 const polluted=JSON.parse('{"__proto__":{"isAdmin":true}}');Object.assign(polluted,incident());
 assert.equal(validateWire('incident',polluted).ok,false);
 const cyclic=incident();cyclic.extra=cyclic;
 assert.equal(validateWire('incident',cyclic).ok,false);
 const getter=incident();Object.defineProperty(getter,'observedAt',{get(){throw Error('must not execute');},enumerable:true});
 assert.equal(validateWire('incident',getter).ok,false);
});
