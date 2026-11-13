'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {buildSeal,verifySeal,adjudicate,validateReports}=require('../../scripts/phase2-block25c-blind-eval.cjs');
const manifest=require('../../docs/quality/PHASE2-BLOCK25B-DATETIME-METADATA-20261112.json');
const sample=()=>({
 numeric:Buffer.from(JSON.stringify({
  schema:'ultra-sentinel-blind-numeric/v1',status:'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED',
  filesScanned:6,findings:[],skippedOversized:0,skippedNoncanonical:0,
  sourceByteIntegrityVerified:true,compilerAuthenticated:false,
  sourceRepositoryAuthenticated:false,originalOracleVerified:false,
  repairAuthorized:false,remoteWrites:false,mergeAllowed:false
 })),
 codec:Buffer.from(JSON.stringify({
  schema:'ultra-sentinel-codec-integrity-hunter/v1',status:'NO_CODEC_INTEGRITY_HYPOTHESES_NOT_CERTIFIED',
  filesScanned:6,findings:[],sourceByteIntegrityVerified:true,
  sourceRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
  causalityVerified:false,generalizationVerified:false,ownerAuthorizationGranted:false,
  remoteWrites:false,mergeAllowed:false
 })),
 identity:Buffer.from(JSON.stringify({
  schema:'ultra-sentinel-identity-delimiter-hunter/v1',status:'NO_IDENTITY_DELIMITER_HYPOTHESES_NOT_CERTIFIED',
  filesScanned:6,findings:[],sourceByteIntegrityVerified:true,
  sourceRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
  causalityVerified:false,generalizationVerified:false,ownerAuthorizationGranted:false,
  remoteWrites:false,mergeAllowed:false
 })),
 cancellation:Buffer.from(JSON.stringify({
  schema:'ultra-sentinel-cancellation-propagation-hunter/v1',
  status:'NO_CANCELLATION_HYPOTHESES_NOT_CERTIFIED',filesScanned:6,findings:[],
  sourceByteIntegrityVerified:true,sourceRepositoryAuthenticated:false,
  originalFunctionalOracleVerified:false,compilerTypeResolutionVerified:false,
  causalityVerified:false,generalizationVerified:false,repairAuthorized:false,
  remoteWrites:false,mergeAllowed:false
 }))
});
test('seal all FOUR frozen v3 workers before truth, preserving six original Kotlin blobs',()=>{
 const raw=sample(),seal=buildSeal(raw);
 assert.equal(seal.engineSha,'49235f854c61c29d55a0307ce4a0348553b2ee1f');
 assert.equal(seal.sourceSha,'77c95cc8125015f83ea8fd900404c295fba7276e');
 assert.equal(seal.sourceFiles,6);assert.equal(seal.workerCount,4);
 assert.equal(seal.reports.length,4);assert.equal(seal.totalUnverifiedFindings,0);
 assert.equal(seal.oracleExecutedBeforeSeal,false);
 assert.equal(seal.scored,false);
 assert.equal(seal.precision,null);assert.equal(seal.recall,null);
 assert.equal(seal.positiveOriginalDefectsVerified,false);
 assert.equal(seal.novelCancellationFamilyVerified,false);
 assert.equal(verifySeal(seal,raw).predictionDigest,seal.predictionDigest);
});
test('fail-closed on forged statuses, modified raw reports, omitted worker and unexpected oracle permissions',()=>{
 const original=sample();
 const seal=buildSeal(original);
 assert.throws(()=>buildSeal({...original,cancellation:undefined}));
 assert.throws(()=>buildSeal({...original,cancellation:undefined,numeric:original.numeric,extra:original.codec}));
 for(const update of [
  x=>x.cancellation.status='CANCELLATION_VERIFIED',
  x=>x.cancellation.sourceByteIntegrityVerified=false,
  x=>x.cancellation.compilerTypeResolutionVerified=true,
  x=>x.cancellation.remoteWrites=true,
  x=>x.numeric.filesScanned=5,
  x=>x.codec.ownerAuthorizationGranted=true,
  x=>x.identity.originalFunctionalOracleVerified=true,
  x=>x.cancellation.findings=[{path:'untrusted/src/test/kotlin/Unexpected.kt',line:1,rule:'CANCELLATION_EXCEPTION_SWALLOWED',expectedBlobSha:'a'.repeat(40)}]
 ]){
  const input=Object.fromEntries(Object.entries(sample()).map(([k,v])=>[k,JSON.parse(v.toString())]));
  update(input);
  assert.throws(()=>buildSeal(Object.fromEntries(Object.entries(input).map(([k,v])=>[k,Buffer.from(JSON.stringify(v))]))));
 }
 const changed=sample();
 changed.cancellation=Buffer.concat([changed.cancellation,Buffer.from(' ')]);
 assert.throws(()=>verifySeal(seal,changed));
 assert.throws(()=>verifySeal({...seal,precision:1},original));
});
test('allowed cancellation candidates remain hypotheses, not confirmed positives',()=>{
 const raw=sample(),obj=JSON.parse(raw.cancellation);
 const f=manifest.cohort.files[0];
 obj.findings=[{path:f.path,line:12,rule:'CANCELLATION_EXCEPTION_SWALLOWED',
  expectedBlobSha:f.blobSha,status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}];
 obj.status='CANCELLATION_PROPAGATION_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE';
 raw.cancellation=Buffer.from(JSON.stringify(obj));
 const seal=buildSeal(raw);
 assert.equal(seal.totalUnverifiedFindings,1);
 assert.equal(seal.novelCancellationFamilyVerified,false);
 assert.equal(seal.precision,null);
 assert.equal(verifySeal(seal,raw).totalUnverifiedFindings,1);
});
test('two original JVM controls cannot establish global truth, positive defects or recall',()=>{
 const seal=buildSeal(sample());
 const out=adjudicate(seal,[
  'ORIGINAL_DATETIME_BINARY_READER_BENIGN_CONTROLS_PASS',
  'ORIGINAL_DATETIME_CALENDAR_BENIGN_CONTROLS_PASS'
 ]);
 assert.equal(out.originalKotlinSourcesScanned,6);
 assert.equal(out.frozenWorkerCount,4);
 assert.equal(out.scopedBenignControlsPassed,2);
 assert.equal(out.originalFilesWithoutOracle,3);
 assert.equal(out.fullyLabeledOriginalFiles,0);
 assert.equal(out.originalPositiveDefectsVerified,false);
 assert.equal(out.novelCancellationFamilyVerified,false);
 assert.equal(out.precision,null);
 assert.equal(out.falsePositives,null);
 assert.throws(()=>adjudicate(seal,['ORIGINAL_DATETIME_BINARY_READER_BENIGN_CONTROLS_PASS','MISMATCH']));
});
test('workflow requires immutable frozen v3 and irrevocable artifact upload before independent oracle job',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/phase2-block25c-datetime-blind.yml'),'utf8');
 assert.ok(workflow.indexOf('frozen-v3-source-only-capture:')<workflow.indexOf('independent-datetime-oracles-after-seal:'));
 assert.match(workflow,/needs: frozen-v3-source-only-capture/);
 assert.match(workflow,/ref: 49235f854c61c29d55a0307ce4a0348553b2ee1f/);
 assert.match(workflow,/ref: 77c95cc8125015f83ea8fd900404c295fba7276e/);
 assert.match(workflow,/run-blind-cancellation-hunter.sh/);
 assert.match(workflow,/--unshare-all --new-session --clearenv/);
 assert.match(workflow,/actions\/download-artifact@fa0a91b85d4f404e444e00e005971372dc801d16/);
 assert.match(workflow,/Publish sealed FOUR worker predictions BEFORE independent oracles/);
 assert.doesNotMatch(workflow,/pull_request_target:/);
});
