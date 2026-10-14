'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {analyzeFamilies,fingerprint,normalizeEvidence}=require('../../packages/family-hunter/ultra_sentinel_family_fingerprints.cjs');
const SHA='a'.repeat(40);
const finding=(path='app/src/main/java/voice/A.kt',line=9)=>({
 rule:'SPEECH_REENTRANT_RETRY',severity:'HIGH',confidence:'medium',
 origin:'Ultra Sentinel Core',path,line,evidence:'onError()  startListening()',
 reason:'Potential synchronous callback chain'
});
const analysis=(findings=[finding()])=>({
 engine:'Ultra Sentinel Core',sha:SHA,verdict:'REVIEW_REQUIRED',
 coverage:{returned:findings.length,analyzed:findings.length,partial:false},
 omitted:0,findings
});
test('RED migration #198: group matching variants across multiple files as unverified hypotheses',()=>{
 const a=analysis([finding(),finding('app/src/main/java/voice/B.kt',45)]);
 const r=analyzeFamilies(a);
 assert.equal(r.families.length,1);
 assert.equal(r.families[0].occurrences,2);
 assert.equal(r.families[0].distinctFiles,2);
 assert.equal(r.families[0].status,'HYPOTHESIS_REQUIRES_TESTS');
 assert.equal(r.autoCommitAllowed,false);assert.equal(r.autoMergeAllowed,false);
 assert.ok(!JSON.stringify(r).includes('onError()  startListening()'));
});
test('normalize Unicode and differences in whitespace without changing stable hash',()=>{
 assert.equal(fingerprint(finding()),fingerprint({...finding(),evidence:'onError() startListening()'}));
 assert.equal(normalizeEvidence(' ERROR  77 '),'error #');
});
test('partial and omitted evidence is never declared clean',()=>{
 assert.equal(analyzeFamilies({...analysis(),coverage:{returned:1,analyzed:1,partial:true},verdict:'INCOMPLETE'}).status,'INCOMPLETE');
 const entries=Array.from({length:40},(_,i)=>finding('app/src/main/java/F'+i+'.kt',i+1));
 assert.equal(analyzeFamilies({...analysis(entries),omitted:3}).status,'INCOMPLETE');
});
test('reject forged provenance, duplicate identity, traversal and malformed inputs',()=>{
 const f=finding(),a=analysis();
 for(const changed of [
 {...a,sha:'forged'}, {...a,engine:'Attacker'},
 {...a,coverage:{returned:0,analyzed:0,partial:false}},
 {...a,findings:[{...f,origin:'Untrusted bot'}]},
 {...a,findings:[{...f,path:'../escape.kt'}]},
 {...a,findings:[{...f,line:-1}]},
 {...a,findings:[f,{...f}]},
 {...a,findings:Array(41).fill(f)}
 ])assert.throws(()=>analyzeFamilies(changed),/INVALID_CORE_ANALYSIS/);
});
test('different severity family evidence cannot silently promote repair authority',()=>{
 const r=analyzeFamilies(analysis([finding(),{...finding('app/src/main/java/voice/B.kt',2),severity:'MEDIUM'}]));
 assert.equal(r.families[0].severity,'HIGH');
 assert.ok(r.families.every(f=>f.status==='HYPOTHESIS_REQUIRES_TESTS'));
 assert.equal(r.autoMergeAllowed,false);
});
