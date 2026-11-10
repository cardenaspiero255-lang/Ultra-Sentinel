'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validate}=require('../fixtures/gamehub-blind-numeric/verify-sealed.cjs');
const target='app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt';
const sha='8b9e934ca90852d77ddab274b60fd8dce4f4a2ca';
const head='e4ca122422f1cb591d407db3fb21fb00fd78b022';
const finding=(path=target,blob=sha)=>({path,line:8,rule:'WIDE_NUMERIC_NARROWED_BEFORE_CLAMP',expectedBlobSha:blob});
const data=()=>({expectedHeadSha:head,originalBlobSha:sha,report:{schema:'ultra-sentinel-blind-numeric/v1',status:'NUMERIC_BLIND_HYPOTHESES_UNVERIFIED',findings:[finding()],filesScanned:40,skippedOversized:0,sourceByteIntegrityVerified:true,compilerAuthenticated:false,sourceRepositoryAuthenticated:false,originalOracleVerified:false,repairAuthorized:false,remoteWrites:false,mergeAllowed:false}});
test('valid sealed original finding is advisory, never evidence of unknown family',()=>{
 const result=validate(data());assert.equal(result.status,'SEALED_NUMERIC_FINDING_REQUIRES_INDEPENDENT_ORACLE');
 for(const k of ['sourceRepositoryAuthenticated','originalOracleVerified','causalityVerified','newFamilyDiscovered','remoteWrites','mergeAllowed'])assert.equal(result[k],false);
});
test('source-only finding may coexist with other bounded hypotheses',()=>{
 const x=data();x.report.findings.push({path:'app/src/main/java/some/Other.kt',line:19,rule:'INT_MULTIPLICATION_BEFORE_WIDENING',expectedBlobSha:'a'.repeat(40)});
 assert.equal(validate(x).status,'SEALED_NUMERIC_FINDING_REQUIRES_INDEPENDENT_ORACLE');
});
test('missing, duplicate, forged and altered original target claims are rejected',()=>{
 for(const edit of [
  x=>x.originalBlobSha='f'.repeat(40),x=>x.expectedHeadSha='f'.repeat(40),
  x=>x.report.findings=[],x=>x.report.findings.push(finding()),
  x=>x.report.findings[0].path='some/Other.kt',x=>x.report.findings[0].expectedBlobSha='f'.repeat(40),
  x=>x.report.findings[0].line=0,x=>x.report.findings[0].rule='INVENTED',
  x=>x.report.findings[0].path='../bad.kt',x=>x.report.schema='changed',
  x=>x.report.status='CERTIFIED',x=>x.report.compilerAuthenticated=true,
  x=>x.report.remoteWrites=true,x=>x.report.mergeAllowed=true,
  x=>x.report.filesScanned=0,x=>x.report.skippedOversized=-1,
  x=>x.report.findings[0].line=2.5,
  x=>{x.report.findings=new Array(2);x.report.findings[0]=finding();}
 ]){const x=data();edit(x);assert.match(validate(x).status,/^BLOCKED_/);}
});
test('getters and proxy input are never invoked',()=>{
 let traps=0;
 for(const which of ['outer','report','claim','array']){
  const x=data();
  if(which==='outer')Object.defineProperty(x,'report',{enumerable:true,get(){traps++;throw Error('getter');}});
  if(which==='report')x.report=new Proxy(x.report,{get(){traps++;throw Error('proxy');}});
  if(which==='claim')Object.defineProperty(x.report.findings[0],'line',{enumerable:true,get(){traps++;throw Error('getter');}});
  if(which==='array')x.report.findings=new Proxy(x.report.findings,{get(){traps++;throw Error('proxy');}});
  assert.match(validate(x).status,/^BLOCKED_/);
 }
 assert.equal(traps,0);
});
