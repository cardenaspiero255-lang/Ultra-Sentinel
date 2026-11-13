'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {buildSeal,verifySeal,adjudicate}=require('../../scripts/phase2-block26d-blind-postseal.cjs');
const {readManifest}=require('../../scripts/phase2-block26b-v5-preregister.cjs');
const KINDS=['numeric','codec','identity','cancellation'];
const names={
 numeric:'ultra-sentinel-blind-numeric/v1',
 codec:'ultra-sentinel-codec-integrity-hunter/v1',
 identity:'ultra-sentinel-identity-delimiter-hunter/v1',
 cancellation:'ultra-sentinel-cancellation-controlflow-hunter/v2'
};
const statuses={
 numeric:'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED',
 codec:'NO_CODEC_INTEGRITY_HYPOTHESES_NOT_CERTIFIED',
 identity:'NO_IDENTITY_DELIMITER_HYPOTHESES_NOT_CERTIFIED',
 cancellation:'NO_CANCELLATION_CONTROLFLOW_HYPOTHESES_NOT_CERTIFIED'
};
const reports=()=>Object.fromEntries(KINDS.map(k=>{
 const value={schema:names[k],status:statuses[k],filesScanned:13,sourceByteIntegrityVerified:true,
  sourceRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
  causalityVerified:false,generalizationVerified:false,remoteWrites:false,mergeAllowed:false,
  findings:[]};
 if(k==='numeric')Object.assign(value,{skippedOversized:0,skippedNoncanonical:0,
  compilerAuthenticated:false,originalOracleVerified:false,repairAuthorized:false});
 if(k==='cancellation')Object.assign(value,{compilerTypeResolutionVerified:false,repairAuthorized:false});
 if(k==='codec'||k==='identity')value.ownerAuthorizationGranted=false;
 return [k,Buffer.from(JSON.stringify(value))];
}));
test('source-only four-worker seal is pinned to 13 original Git blobs and frozen post-v4 engine',()=>{
 const seal=buildSeal(reports());
 assert.equal(readManifest().cohort.files.length,13);
 assert.equal(seal.engineSha,'22a4dfee8e87b62b14501a81a94ca902d8fbca7b');
 assert.equal(seal.sourceSha,'498c8a10febe1a97f085a295c1f6b2a818a83f89');
 assert.equal(seal.sourceFiles,13);assert.equal(seal.workerCount,4);
 assert.equal(seal.totalUnverifiedFindings,0);assert.equal(seal.oracleExecutedBeforeSeal,false);
 assert.equal(seal.precision,null);assert.equal(seal.block26Closed,false);
 assert.equal(verifySeal(seal,reports()).predictionDigest,seal.predictionDigest);
});
test('source-worker tampering or fabricated functional truth is fail-closed',()=>{
 const base=reports(),seal=buildSeal(base);
 for(const mutate of [
  x=>x.numeric.filesScanned=12,
  x=>x.codec.originalFunctionalOracleVerified=true,
  x=>x.identity.findings=[{path:'src/main/kotlin/evil.kt',line:1,rule:'FAKE',expectedBlobSha:'f'.repeat(40)}],
  x=>x.cancellation.sourceByteIntegrityVerified=false,
  x=>x.numeric.skippedNoncanonical=1,
  x=>x.numeric.findings=[{path:'src/main/kotlin/algorithms/Sort.kt',line:1,rule:'FAKE',expectedBlobSha:'f'.repeat(40)}]
 ]){
  const modified=reports();const k=Object.keys(modified).find(y=>{
   const temp=JSON.parse(modified[y].toString());const start=JSON.stringify(temp);mutate(temp);if(JSON.stringify(temp)!==start){modified[y]=Buffer.from(JSON.stringify(temp));return true;}return false;
  });
  assert.ok(k);assert.throws(()=>buildSeal(modified));
 }
 const s=structuredClone(seal);s.block26Closed=true;
 assert.throws(()=>verifySeal(s,base));
 const modified=reports();modified.codec=Buffer.concat([modified.codec,Buffer.from(' ')]);
 assert.throws(()=>verifySeal(seal,modified));
});
test('precommitted original FIFO JVM counterexample is not automatically attributed to Hunter',()=>{
 const seal=buildSeal(reports());
 const oracle={schema:'ultra-sentinel-phase2-block26c-original-jvm-observations/v1',
 originalBenignControlsPassed:26,clearExpectedEmpty:true,capacityAfterClear:3,
 enqueueAfterClearRejected:true,originalCounterexampleObserved:true,
 hunterConfirmedFindings:null,precision:null,recall:null,block26Closed:false};
 const verdict=adjudicate(seal,oracle);
 assert.equal(verdict.scopedOriginalCounterexampleObserved,true);
 assert.equal(verdict.hunterConfirmedDefects,0);
 assert.equal(verdict.block26Closed,false);assert.equal(verdict.block27Allowed,false);
 assert.equal(verdict.precision,null);
 const wrong={...oracle,originalBenignControlsPassed:0};
 assert.throws(()=>adjudicate(seal,wrong));
 assert.throws(()=>adjudicate({...seal,engineSha:'f'.repeat(40)},oracle));
});
test('independent JVM oracle executes only after sealed source-only worker artifact',()=>{
 const y=fs.readFileSync(path.join(__dirname,'../../.github/workflows/phase2-block26d-blind-postseal.yml'),'utf8');
 assert.match(y,/frozen-source-only-capture:/);
 assert.match(y,/independent-original-jvm-after-seal:/);
 assert.match(y,/needs: frozen-source-only-capture/);
 assert.match(y,/for kind in numeric codec identity cancellation/);
 assert.match(y,/phase2-block26d-blind-postseal.cjs seal/);
 assert.match(y,/actions\/download-artifact@/);
 assert.match(y,/--unshare-all --new-session --clearenv/);
 assert.match(y,/oracle\.RingBufferContractOracleKt/);
 assert(y.indexOf('phase2-block26d-blind-postseal.cjs seal')<y.indexOf('oracle.RingBufferContractOracleKt'));
 assert.doesNotMatch(y,/continue-on-error|if: always/);
});
