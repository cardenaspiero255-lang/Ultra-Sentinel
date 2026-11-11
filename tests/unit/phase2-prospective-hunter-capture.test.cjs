'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {aggregateFrozenHunterReports}=require('../../packages/quality-gates/phase2-prospective-hunter-capture.cjs');
const manifest=fs.readFileSync(path.join(__dirname,'../../docs/quality/PHASE2-PROSPECTIVE-HUNTER-FREEZE-20261111.json'));
const frozen=JSON.parse(manifest),a=frozen.holdout.files[0];
function reports(){
 return {
  numeric:{schema:'ultra-sentinel-blind-numeric/v1',
   status:'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED',findings:[],
   filesScanned:9,skippedOversized:0,skippedNoncanonical:0,
   sourceByteIntegrityVerified:true,compilerAuthenticated:false,
   sourceRepositoryAuthenticated:false,originalOracleVerified:false,
   repairAuthorized:false,remoteWrites:false,mergeAllowed:false},
  codec:{schema:'ultra-sentinel-codec-integrity-hunter/v1',
   status:'NO_CODEC_INTEGRITY_HYPOTHESES_NOT_CERTIFIED',findings:[],
   sourceByteIntegrityVerified:true,sourceRepositoryAuthenticated:false,
   originalFunctionalOracleVerified:false,causalityVerified:false,
   generalizationVerified:false,ownerAuthorizationGranted:false,
   remoteWrites:false,mergeAllowed:false,filesScanned:9},
  identity:{schema:'ultra-sentinel-identity-delimiter-hunter/v1',
   status:'NO_IDENTITY_DELIMITER_HYPOTHESES_NOT_CERTIFIED',findings:[],
   sourceByteIntegrityVerified:true,sourceRepositoryAuthenticated:false,
   originalFunctionalOracleVerified:false,causalityVerified:false,
   generalizationVerified:false,ownerAuthorizationGranted:false,
   remoteWrites:false,mergeAllowed:false,filesScanned:9}
 };
}
function finding(rule= 'AMBIGUOUS_DELIMITED_IDENTITY',line=11){
 return {rule,path:a.path,line,expectedBlobSha:a.blobSha,status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'};
}
test('merges three independent source-only worker receipts without inventing labels',()=>{
 const r=aggregateFrozenHunterReports(manifest,reports());
 assert.equal(r.status,'PREDICTIONS_SEALED_NO_INDEPENDENT_TRUTH');
 assert.equal(r.filesCovered,9);assert.equal(r.unverifiedFindings,0);
 assert.equal(r.precision,null);assert.equal(r.falsePositiveCount,null);
 assert.equal(r.engineExecutedAndAuthenticated,false);
 assert.equal(r.verifiedRepairs,0);
 assert.match(r.predictionDigest,/^[a-f0-9]{64}$/);
});
test('retains a byte-bound identity finding without treating it as a false positive',()=>{
 const r=reports();
 r.identity.findings=[finding()];
 r.identity.status='IDENTITY_DELIMITER_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE';
 const out=aggregateFrozenHunterReports(manifest,r);
 assert.equal(out.unverifiedFindings,1);
 assert.equal(out.findingsByCase[0].count,1);
 assert.equal(out.precision,null);
 assert.equal(out.falsePositiveRate,null);
});
test('canonical numeric reports have no status field but map to bounded advisory only',()=>{
 const r=reports();
 r.numeric.findings=[{rule:'INT_MULTIPLICATION_BEFORE_WIDENING',path:a.path,line:7,expectedBlobSha:a.blobSha}];
 r.numeric.status='NUMERIC_BLIND_HYPOTHESES_UNVERIFIED';
 const out=aggregateFrozenHunterReports(manifest,r);
 assert.equal(out.unverifiedFindings,1);
 assert.equal(out.findingsByCase[0].count,1);
});
test('refuses misleading statuses, incomplete scans, tampered sources and oracle contamination',()=>{
 for(const mutate of [
  x=>x.numeric.filesScanned=8,
  x=>x.identity.filesScanned=10,
  x=>x.codec.sourceByteIntegrityVerified=false,
  x=>x.numeric.skippedOversized=1,
  x=>x.numeric.skippedNoncanonical=1,
  x=>x.identity.originalFunctionalOracleVerified=true,
  x=>x.codec.remoteWrites=true,
  x=>x.numeric.compilerAuthenticated=true,
  x=>x.numeric.status='NUMERIC_BLIND_PARTIAL_INVENTORY_UNVERIFIED',
  x=>x.codec.truth=true,
  x=>x.identity.findings=[{...finding(),expectedBlobSha:'a'.repeat(40)}],
  x=>x.identity.findings=[{...finding(),path:'app/src/main/kotlin/Else.kt'}],
  x=>x.identity.findings=[{...finding(),line:0}],
  x=>x.identity.findings=[{...finding(),status:'VERIFIED'}],
  x=>x.numeric.findings=[{...finding(),status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}],
  x=>x.codec.findings=[finding()],
  x=>x.identity.findings=[finding(),finding()]
 ]){
  const r=reports();mutate(r);
  const out=aggregateFrozenHunterReports(manifest,r);
  assert.equal(out.status,'BLOCKED_PROSPECTIVE_HUNTER_REPORT');
  assert.equal(out.precision,null);
  assert.equal(out.falsePositiveCount,null);
 }
});
test('active payloads and proxies are blocked without invoking getters or traps',()=>{
 let effects=0;
 const r=reports();Object.defineProperty(r.codec,'findings',{enumerable:true,get(){effects++;throw Error('getter');}});
 assert.equal(aggregateFrozenHunterReports(manifest,r).status,'BLOCKED_PROSPECTIVE_HUNTER_REPORT');
 const p=new Proxy(reports(),{ownKeys(){effects++;throw Error('proxy');}});
 assert.equal(aggregateFrozenHunterReports(manifest,p).status,'BLOCKED_PROSPECTIVE_HUNTER_REPORT');
 assert.equal(effects,0);
});
