'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyNumericSemanticPair:check}=require('../../packages/family-hunter/phase2-numeric-semantic-evidence.cjs');
const A='/tmp/verified/app/src/BatteryTelemetry.kt',B='/tmp/runner/candidate-0.kt';
const sha1='a'.repeat(40),sha2='b'.repeat(40),rule='WIDE_NUMERIC_NARROWED_BEFORE_CLAMP';
const report=claims=>({schema:'ultra-sentinel-numeric-semantic-claims/v1',claims,compilerAuthenticated:false,originalOracleVerified:false});
const claim=(path,blobSha,ruleName=rule,line=8)=>({path,line,rule:ruleName,blobSha});
const good=()=>({originalPath:A,originalBlobSha:sha1,candidatePath:B,candidateBlobSha:sha2,originalReport:report([claim(A,sha1)]),candidateReport:report([])});
const flags=x=>{for(const f of ['compilerEvidenceAuthenticated','independentOriginalOracleVerified','causalityVerified','remoteWrites','mergeAllowed'])assert.equal(x[f],false,f)};
test('binds typed numeric advisory without certifying untrusted source claims',()=>{
 const r=check(good());assert.equal(r.status,'TYPE_EVIDENCE_BOUND_REQUIRES_TRUSTED_KOTLIN_RUNNER');
 assert.equal(r.matchingOriginalClaims,1);flags(r);
});
test('accepts second numeric rule independent of source paths and lines',()=>{
 const x=good();x.originalPath='/tmp/else/source/Example.kt';x.candidatePath='/tmp/other/patch.kt';
 x.originalReport=report([claim(x.originalPath,sha1,'INT_MULTIPLICATION_BEFORE_WIDENING',120)]);
 assert.equal(check(x).status,'TYPE_EVIDENCE_BOUND_REQUIRES_TRUSTED_KOTLIN_RUNNER');
});
test('rejects foreign sources, malformed hashes, duplicate and unsafe or persistent claims',()=>{
 for(const edit of [
  x=>x.originalReport.claims[0].path='/tmp/alien.kt',
  x=>x.originalReport.claims[0].blobSha=sha2,
  x=>x.candidateReport.claims.push(claim(B,sha2)),
  x=>x.originalReport.claims=[],
  x=>x.originalReport.claims.push(claim(A,sha1)),
  x=>x.originalReport.claims[0].rule='UNKNOWN',
  x=>x.originalReport.claims[0].line=0,
  x=>x.originalReport.compilerAuthenticated=true,
  x=>x.candidateReport.originalOracleVerified=true,
  x=>x.originalPath='relative.kt',
  x=>x.candidatePath=x.originalPath,
  x=>x.candidateBlobSha=x.originalBlobSha,
  x=>x.originalBlobSha='not-a-sha',
  x=>x.originalReport.claims[0].line=1.5,
  x=>x.originalReport.schema='wrong',
 ]){const x=good();edit(x);const r=check(x);assert.match(r.status,/^BLOCKED_/,JSON.stringify(x));flags(r);}
});
test('never invokes getters or proxy traps on evidence input',()=>{
 let touched=0;
 for(const target of ['outer','claim','report','array']){
  const x=good();
  if(target==='outer')Object.defineProperty(x,'originalPath',{get(){touched++;throw Error('getter');},enumerable:true});
  if(target==='claim')Object.defineProperty(x.originalReport.claims[0],'path',{get(){touched++;throw Error('getter');},enumerable:true});
  if(target==='report')x.originalReport=new Proxy(x.originalReport,{get(){touched++;throw Error('proxy');}});
  if(target==='array')x.originalReport.claims=new Proxy(x.originalReport.claims,{get(){touched++;throw Error('proxy');}});
  assert.match(check(x).status,/^BLOCKED_/);
 }
 assert.equal(touched,0);
});
