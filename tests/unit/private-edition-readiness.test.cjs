'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {assessPrivateEditionReadiness,REQUIRED_CONTROLS}=
 require('../../packages/quality-gates/private-edition-readiness.cjs');
const SHA='a'.repeat(40), DIGEST='b'.repeat(64);
const base=()=>({schema:'ultra-sentinel-private-edition-input/v1',repository:'cardenaspiero255-lang/Ultra-Sentinel',headSha:SHA,openBlockingFindings:0,proofs:[]});
function receipt(control){return {control,headSha:SHA,runId:127,artifactSha256:DIGEST,result:'SUCCESS'};}
test('private scope is independent from historical 120-label public benchmark',()=>{
 const result=assessPrivateEditionReadiness(base());
 assert.equal(Object.hasOwn(result,'minimumLabels'),false);
 assert.equal(result.scope,'EXCLUSIVE_PRIVATE_EDITION');
 assert.equal(result.missingControls.length,REQUIRED_CONTROLS.length);
 assert.equal(result.verdict,'MISSING_OPERATIONAL_EVIDENCE');
 assert.equal(result.releaseAuthorized,false);
 assert.equal(result.mergeAllowed,false);
 assert.equal(result.autoRepairAllowed,false);
});
test('submitted success receipts do not prove real CI or authorize release',()=>{
 const x=base();x.proofs=REQUIRED_CONTROLS.map(receipt);
 const r=assessPrivateEditionReadiness(x);
 assert.deepEqual(r.missingControls,[]);
 assert.equal(r.reportedControlsComplete,true);
 assert.equal(r.verdict,'UNAUTHENTICATED_EVIDENCE');
 assert.equal(r.realWorldEvidenceAuthenticated,false);
 assert.equal(r.releaseAuthorized,false);
});
test('open blocking findings reject completeness even if all proofs are reported',()=>{
 const x=base();x.proofs=REQUIRED_CONTROLS.map(receipt);x.openBlockingFindings=1;
 const r=assessPrivateEditionReadiness(x);
 assert.equal(r.reportedControlsComplete,false);
 assert.equal(r.verdict,'BLOCKING_FINDINGS');
});
test('failed checks remain failing and cannot be treated as missing or success',()=>{
 const x=base();x.proofs=REQUIRED_CONTROLS.map(receipt);
 x.proofs[0].result='FAILURE';
 const r=assessPrivateEditionReadiness(x);
 assert.deepEqual(r.failedControls,[REQUIRED_CONTROLS[0]]);
 assert.equal(r.reportedControlsComplete,false);
});
test('reject duplicated, alien, stale, forged or malformed evidence',()=>{
 const variants=[
  x=>x.proofs.push(receipt(REQUIRED_CONTROLS[0]),receipt(REQUIRED_CONTROLS[0])),
  x=>x.proofs.push(receipt('BYPASS_SECURITY')),
  x=>x.proofs.push({...receipt(REQUIRED_CONTROLS[0]),headSha:'c'.repeat(40)}),
  x=>x.proofs.push({...receipt(REQUIRED_CONTROLS[0]),artifactSha256:'insecure'}),
  x=>x.proofs.push({...receipt(REQUIRED_CONTROLS[0]),result:'SKIPPED'}),
  x=>x.proofs.push({...receipt(REQUIRED_CONTROLS[0]),authorizesMerge:true}),
  x=>x.proofs.push({...receipt(REQUIRED_CONTROLS[0]),runId:-1}),
  x=>x.headSha='../branch',
  x=>x.repository='other/repo',
  x=>x.openBlockingFindings=-1
 ];
 for(const mutate of variants){const x=base();mutate(x);assert.throws(()=>assessPrivateEditionReadiness(x));}
});
test('untrusted readiness data never executes getters, iterators or proxy traps',()=>{
 let effects=0;
 const header=base();
 Object.defineProperty(header,'proofs',{enumerable:true,get(){effects++;return [];}});
 const p=receipt(REQUIRED_CONTROLS[0]);
 Object.defineProperty(p,'result',{enumerable:true,get(){effects++;return 'SUCCESS';}});
 const activeArray=[receipt(REQUIRED_CONTROLS[0])];
 Object.defineProperty(activeArray,Symbol.iterator,{value:function*(){effects++;yield receipt(REQUIRED_CONTROLS[0]);}});
 const proxy=new Proxy(base(),{ownKeys(){effects++;throw Error('trap');},
  getPrototypeOf(){effects++;throw Error('trap');},get(){effects++;throw Error('trap');}});
 for(const x of [header,{...base(),proofs:[p]},{...base(),proofs:activeArray},proxy]){
  assert.throws(()=>assessPrivateEditionReadiness(x),/PRIVATE_READINESS_INVALID_/);
  assert.equal(effects,0,'untrusted proof data must remain inert');
 }
});
test('readiness SHA and artifact digests must be primitive strings',()=>{
 let effects=0;
 const sha={toString(){effects++;return SHA;}};
 const digest={toString(){effects++;return DIGEST;}};
 for(const x of [{...base(),headSha:sha},
  {...base(),proofs:[{...receipt(REQUIRED_CONTROLS[0]),artifactSha256:digest}]}])
  assert.throws(()=>assessPrivateEditionReadiness(x),/PRIVATE_READINESS_INVALID_/);
 assert.equal(effects,0);
});
test('malformed proof arrays and proxied proof records fail without evaluating input',()=>{
 let effects=0;
 const indexed=[];
 Object.defineProperty(indexed,'0',{enumerable:true,get(){effects++;return receipt(REQUIRED_CONTROLS[0]);}});
 const sparse=new Array(1);
 const proof=new Proxy(receipt(REQUIRED_CONTROLS[0]),{ownKeys(){effects++;throw Error('trap');}});
 const proofArray=new Proxy([receipt(REQUIRED_CONTROLS[0])],{get(){effects++;throw Error('trap');}});
 for(const proofs of [indexed,sparse,[proof],proofArray]){
  assert.throws(()=>assessPrivateEditionReadiness({...base(),proofs}),/PRIVATE_READINESS_INVALID_/);
  assert.equal(effects,0);
 }
});
