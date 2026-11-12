'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {buildSeal,verifySeal,adjudicate}=require('../../scripts/phase2-block24-blind-eval.cjs');
const root=path.resolve(__dirname,'../..');
function reports(){
 const neutral={sourceByteIntegrityVerified:true,sourceRepositoryAuthenticated:false,
  originalFunctionalOracleVerified:false,remoteWrites:false,mergeAllowed:false};
 return {
  numeric:Buffer.from(JSON.stringify({schema:'ultra-sentinel-blind-numeric/v1',
   status:'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED',filesScanned:6,findings:[],
   skippedOversized:0,skippedNoncanonical:0,compilerAuthenticated:false,
   originalOracleVerified:false,repairAuthorized:false,...neutral})),
  codec:Buffer.from(JSON.stringify({schema:'ultra-sentinel-codec-integrity-hunter/v1',
   status:'NO_CODEC_INTEGRITY_HYPOTHESES_NOT_CERTIFIED',filesScanned:6,findings:[],
   causalityVerified:false,generalizationVerified:false,ownerAuthorizationGranted:false,...neutral})),
  identity:Buffer.from(JSON.stringify({schema:'ultra-sentinel-identity-delimiter-hunter/v1',
   status:'NO_IDENTITY_DELIMITER_HYPOTHESES_NOT_CERTIFIED',filesScanned:6,findings:[],
   causalityVerified:false,generalizationVerified:false,ownerAuthorizationGranted:false,...neutral}))
 };
}
test('frozen v2 six-source output is a cryptographic unscored prediction seal',()=>{
 const input=reports();
 const seal=buildSeal(input);
 assert.equal(seal.engineSha,'34679a71aed54abbc3ecbffbf29299cfb25f65b8');
 assert.equal(seal.sourceFiles,6);
 assert.equal(seal.reports.length,3);
 assert.equal(seal.totalUnverifiedFindings,0);
 assert.equal(seal.legacyPathsSupported,6);
 assert.equal(seal.precision,null);assert.equal(seal.recall,null);
 assert.equal(seal.novelFamilyVerified,false);
 assert.equal(verifySeal(seal,input).predictionDigest,seal.predictionDigest);
});
test('wrong source counts, unsafe worker flags, and tampered bytes always fail closed',()=>{
 const input=reports();
 for(const mutation of [
  o=>o.numeric.filesScanned=5,
  o=>o.codec.remoteWrites=true,
  o=>o.identity.sourceByteIntegrityVerified=false,
  o=>o.numeric.skippedOversized=1,
  o=>o.codec.status='BLOCKED_SOURCE',
  o=>o.identity.findings=[{path:'unrelated/test/src/File.kt',line:1,rule:'SUSPECT',expectedBlobSha:'a'.repeat(40)}]
 ]){
  const mutated=reports(),obj=JSON.parse(mutated[Object.keys(mutated)[0]].toString());
  const keyed=Object.fromEntries(Object.entries(mutated).map(([k,v])=>[k,JSON.parse(v.toString())]));
  mutation(keyed);
  assert.throws(()=>buildSeal(Object.fromEntries(Object.entries(keyed).map(([k,v])=>[k,Buffer.from(JSON.stringify(v))]))));
 }
 const seal=buildSeal(input);
 const changed=reports();
 changed.codec=Buffer.concat([changed.codec,Buffer.from(' ')]);
 assert.throws(()=>verifySeal(seal,changed));
 assert.throws(()=>verifySeal({...seal,precision:1},input));
});
test('findings remain unverified even when an original rule is triggered',()=>{
 const input=reports();
 const m=JSON.parse(fs.readFileSync(path.join(root,'docs/quality/PHASE2-BLOCK24-V2-PROSPECTIVE-IO-FREEZE-20261112.json'),'utf8'));
 const o=JSON.parse(input.numeric);
 o.findings=[{path:m.cohort.files[0].path,line:12,rule:'INT_MULTIPLICATION_BEFORE_WIDENING',expectedBlobSha:m.cohort.files[0].blobSha}];
 o.status='NUMERIC_BLIND_HYPOTHESES_UNVERIFIED';
 input.numeric=Buffer.from(JSON.stringify(o));
 const result=buildSeal(input);
 assert.equal(result.totalUnverifiedFindings,1);
 assert.equal(result.novelFamilyVerified,false);
 assert.equal(result.precision,null);
});
test('postseal only adjudicates two bounded original JVM controls, never full six-file truth',()=>{
 const seal=buildSeal(reports());
 const result=adjudicate(seal,['ORIGINAL_IO_BUILDER_BENIGN_CONTROLS_PASS','ORIGINAL_IO_RANDOM_BENIGN_CONTROLS_PASS']);
 assert.equal(result.scopedBenignControlsPassed,2);
 assert.equal(result.fullyLabeledOriginalFiles,0);
 assert.equal(result.originalPositiveDefectsVerified,false);
 assert.equal(result.recall,null);
 assert.throws(()=>adjudicate(seal,['ORIGINAL_IO_BUILDER_BENIGN_CONTROLS_PASS','WRONG']));
});
test('CI enforces artifact publication before postseal oracle job, pinning the prior commits',()=>{
 const yaml=fs.readFileSync(path.join(root,'.github/workflows/phase2-block24-io-blind.yml'),'utf8');
 assert.match(yaml,/needs: frozen-v2-source-only-capture/);
 assert.match(yaml,/actions\/download-artifact@fa0a91b85d4f404e444e00e005971372dc801d16/);
 assert.match(yaml,/ref: 34679a71aed54abbc3ecbffbf29299cfb25f65b8/);
 assert.match(yaml,/ref: cf40e5ba7cd99ba812177d597a9f6ce0570545b1/);
 assert.ok(yaml.indexOf('Upload sealed predictions BEFORE independent Kotlin oracles')<
           yaml.indexOf('independent-kotlin-oracles-after-seal:'));
 assert.match(yaml,/SENTINEL_REQUIRE_BLIND_BWRAP=1/);
});
