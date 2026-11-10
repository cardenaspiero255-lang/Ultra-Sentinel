'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {linkSealedNumericAndCompilerClaims:link}=require('../../packages/family-hunter/phase2-numeric-sealed-semantic-link.cjs');
const REL='app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt';
const ABS='/tmp/original/'+REL;
const SHA='8b9e934ca90852d77ddab274b60fd8dce4f4a2ca';
const RULE='WIDE_NUMERIC_NARROWED_BEFORE_CLAMP';
const finding=(path=REL,line=8,rule=RULE,expectedBlobSha=SHA)=>({path,line,rule,expectedBlobSha});
const claim=(path=ABS,line=8,rule=RULE,blobSha=SHA)=>({path,line,rule,blobSha});
const input=()=>({relativePath:REL,absolutePath:ABS,sourceBlobSha:SHA,
 blindReport:{schema:'ultra-sentinel-blind-numeric/v1',status:'NUMERIC_BLIND_HYPOTHESES_UNVERIFIED',findings:[finding()],filesScanned:238,skippedOversized:0,skippedNoncanonical:0,sourceByteIntegrityVerified:true,compilerAuthenticated:false,sourceRepositoryAuthenticated:false,originalOracleVerified:false,repairAuthorized:false,remoteWrites:false,mergeAllowed:false},
 semanticReport:{schema:'ultra-sentinel-numeric-semantic-claims/v1',claims:[claim()],compilerAuthenticated:false,originalOracleVerified:false}});
const flags=r=>{for(const key of ['compilerEvidenceAuthenticated','sourceRepositoryAuthenticated','originalOracleVerified','causalityVerified','generalizationVerified','remoteWrites','mergeAllowed'])assert.equal(r[key],false,key)};

test('requires exact path, blob, line and rule agreement across sealed blind and typed evidence',()=>{
 const r=link(input());
 assert.equal(r.status,'BLIND_NUMERIC_TYPED_LINK_ADVISORY');
 assert.equal(r.matchedClaims,1);flags(r);
});
test('one compiler claim cannot validate a distinct sealed finding on another line or rule',()=>{
 for(const edit of [
  x=>x.blindReport.findings[0].line=9,
  x=>x.blindReport.findings[0].rule='INT_MULTIPLICATION_BEFORE_WIDENING',
  x=>x.semanticReport.claims[0].line=9,
  x=>x.semanticReport.claims[0].rule='INT_MULTIPLICATION_BEFORE_WIDENING',
  x=>x.semanticReport.claims=[],
  x=>x.semanticReport.claims.push(claim(ABS,8,'INT_MULTIPLICATION_BEFORE_WIDENING')),
  x=>x.semanticReport.claims.push(claim(ABS,9)),
  x=>x.blindReport.findings.push(finding(REL,9)),
 ]){const x=input();edit(x);const r=link(x);assert.match(r.status,/^BLOCKED_/,r.status);flags(r);}
});
test('findings in other files do not contaminate exact target intersection',()=>{
 const x=input();
 x.blindReport.findings.push(finding('app/src/main/java/example/Else.kt',10,'INT_MULTIPLICATION_BEFORE_WIDENING','b'.repeat(40)));
 const r=link(x);assert.equal(r.status,'BLIND_NUMERIC_TYPED_LINK_ADVISORY');assert.equal(r.matchedClaims,1);flags(r);
});
test('partial inventories stay explicitly partial and never certify generalization',()=>{
 const x=input();x.blindReport.skippedOversized=2;x.blindReport.status='NUMERIC_BLIND_PARTIAL_INVENTORY_UNVERIFIED';
 const r=link(x);assert.equal(r.status,'BLIND_NUMERIC_TYPED_LINK_PARTIAL_ADVISORY');flags(r);
});
test('rejects forged identity, paths, flags, altered or additional report shape',()=>{
 for(const edit of [
  x=>x.relativePath='../evil.kt',x=>x.relativePath='/tmp/source.kt',
  x=>x.absolutePath='tmp/original/Source.kt',x=>x.absolutePath='/tmp/../tmp/source.kt',
  x=>x.absolutePath='/tmp/original/Source.kt\u0000other',
  x=>x.sourceBlobSha='A'.repeat(40),x=>x.sourceBlobSha='not-hash',
  x=>x.blindReport.findings[0].path='app/src/main/java/example/Else.kt',
  x=>x.blindReport.findings[0].expectedBlobSha='f'.repeat(40),
  x=>x.semanticReport.claims[0].path='/tmp/else/Source.kt',
  x=>x.semanticReport.claims[0].blobSha='f'.repeat(40),
  x=>x.blindReport.sourceRepositoryAuthenticated=true,
  x=>x.blindReport.compilerAuthenticated=true,
  x=>x.blindReport.mergeAllowed=true,
  x=>x.semanticReport.compilerAuthenticated=true,
  x=>x.semanticReport.originalOracleVerified=true,
  x=>x.semanticReport.schema='unknown',x=>x.blindReport.schema='unknown',
  x=>x.blindReport.status='NUMERIC_BLIND_SAFE',x=>x.blindReport.skippedOversized=-1,
  x=>x.blindReport.filesScanned=0,x=>x.blindReport.skippedNoncanonical=1.2,
  x=>x.blindReport.findings[0].line=0,x=>x.semanticReport.claims[0].line=1.2,
  x=>x.blindReport.findings[0].rule='INVALID',
  x=>x.blindReport.findings.push(finding()),
  x=>x.semanticReport.claims.push(claim()),
  x=>{x.blindReport.extra=true;},
  x=>{x.semanticReport.claims=new Array(2);x.semanticReport.claims[0]=claim();},
 ]){const x=input();edit(x);const r=link(x);assert.match(r.status,/^BLOCKED_/,r.status);flags(r);}
});
test('rejects getter, proxy, array holes, and exotic prototypes without executing supplied code',()=>{
 let count=0;
 for(const edit of [
  x=>Object.defineProperty(x,'blindReport',{enumerable:true,get(){count++;throw Error('getter');}}),
  x=>x.blindReport=new Proxy(x.blindReport,{get(){count++;throw Error('proxy');}}),
  x=>Object.defineProperty(x.blindReport.findings[0],'line',{enumerable:true,get(){count++;throw Error('getter');}}),
  x=>x.semanticReport.claims=new Proxy(x.semanticReport.claims,{get(){count++;throw Error('proxy');}}),
  x=>x.semanticReport=Object.assign(Object.create(null),x.semanticReport),
  x=>{x.blindReport.findings=new Array(2);x.blindReport.findings[0]=finding();},
  x=>{x.blindReport.findings[0]=new Proxy(x.blindReport.findings[0],{get(){count++;throw Error('proxy');}});},
 ]){const x=input();edit(x);const r=link(x);assert.match(r.status,/^BLOCKED_/,r.status);flags(r);}
 assert.equal(count,0);
});
