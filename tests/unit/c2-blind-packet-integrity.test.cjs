'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {isValidFrozenBlindPacket}=require('../../packages/quality-gates/c2-blind-packet-integrity.cjs');
const prs=[132,159,161,73];
function snapshot(){
 const payload={schema:'ultra-sentinel-c2-blind-review-packet/v1',repository:'cardenaspiero255-lang/gamehub-ultra',
  cases:prs.map((pr,i)=>({pr,headSha:String.fromCharCode(97+i).repeat(40),baseSha:'e'.repeat(40),changedFiles:5+i}))};
 return {packet:payload,digest:crypto.createHash('sha256').update(JSON.stringify(payload),'utf8').digest('hex')};
}
test('canonical four-PR snapshot has a verified content-addressed digest',()=>{
 assert.equal(isValidFrozenBlindPacket(snapshot()),true);
});
test('tampered HEAD, base, changedFiles, PR order and packet digest fail closed',()=>{
 for(const change of [
  x=>x.packet.cases[0].headSha='0'.repeat(40),
  x=>x.packet.cases[0].baseSha='f'.repeat(40),
  x=>x.packet.cases[0].changedFiles=300,
  x=>x.packet.cases.reverse(),
  x=>x.digest='0'.repeat(64),
  x=>x.packet.cases[2].pr=163,
  x=>x.packet.cases[1].headSha='invalid',
  x=>x.packet.cases.pop(),
  x=>x.packet.cases[0].candidate={findings:['private']},
  x=>x.packet.repository='attacker/repo',
  x=>x.packet.extra='injected',
 ]){const bad=snapshot();change(bad);assert.equal(isValidFrozenBlindPacket(bad),false);}
});
test('recomputed digest cannot legitimize malformed or injection-bearing packets',()=>{
 for(const change of [
  x=>x.packet.cases[0].candidate={findings:['secret']},
  x=>x.packet.cases[0].changedFiles=0,
  x=>x.packet.cases[0].pr=999,
  x=>x.packet.cases[0].path='secret',
  x=>x.packet.cases[0].headSha='Z'.repeat(40),
 ]){const bad=snapshot();change(bad);
  bad.digest=crypto.createHash('sha256').update(JSON.stringify(bad.packet),'utf8').digest('hex');
  assert.equal(isValidFrozenBlindPacket(bad),false);}
});
test('malformed wrapper cannot crash integrity verification or misreport valid',()=>{
 for(const v of [null,[],{}, {digest:'x'}, {packet:null,digest:'a'.repeat(64)},
  {packet:[],digest:'a'.repeat(64)}, {packet:snapshot().packet,digest:1}])
  assert.equal(isValidFrozenBlindPacket(v),false);
});
