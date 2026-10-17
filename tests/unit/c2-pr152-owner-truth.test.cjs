'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {reviewEleven}=require('../../packages/quality-gates/c2-pr152-owner-truth.cjs');
// Synthetic fixture tests structure only. Real prior truth is authenticated by owner CI.
const baseline={schema:'ultra-sentinel-c2-next-ten-original-source-truth-seal/v1',status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
 sourceRepository:'cardenaspiero255-lang/gamehub-ultra',engineSourceSha:'547938ed88804e25bbabecf74a3c3d91b74cf1a4',
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 previousTruthDigest:'63ec7f1888e7923b02b0a2ed1e0f841b7f799e930bc6b46b374f68da7ac7c828',evidence:{},
 labels:Array.from({length:10},(_,i)=>({pr:150+i,headSha:'a'.repeat(40),blobSha:'b'.repeat(40),
  rule:'PRIOR_CONTROL_'+i,path:'original/path_'+i+'.kt',line:i+1,positive:i<5})),
 prsWithAtLeastOneSourceScopedLabel:8,sourcePositiveLabels:5,verifiedScopedNegativeLabels:5,
 verifiedNegativeFindingLabels:5,benchmarkScoredLabels:0,neededAdditionalPositiveLabelsAtLeast:43,
 neededAdditionalNegativeLabelsAtLeast:43,neededAdditionalLabelsAtLeast:110,
 includesPredictions:false,includesBaseline:false,
 sealedTruthDigest:'8caeb151cc191132cad2afa088b4a46e419ed72518f80cbeb9626a91ad8f0112',
 precision:null,recall:null,f1:null,fpNonRegressionVerified:false,tripleSPlusCertified:false,
 canMerge:false,canRepair:false,verdict:'TRUTH_CORPUS_INCOMPLETE',limitation:'Synthetic only'};
const witness={schema:'ultra-sentinel-c2-pr152-original-json-witness/v1',pr:152,
 headSha:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
 blobSha:'886c104effd553cd60f8222bfb05b8505fe7c4b8',
 sourceSha256:'642d4f0a991bdcbe78c1be408fe49de9b04b72255f345fa59a8f7054cd72b4d2',
 oracleSha256:'92a6ea0b770fb44474c60214a5550eeddf803fdd995a2693c9c700868cfc5c2f',
 originalFailure:true,positiveControlPassed:true,counterfactualPassed:true,
 originalLogSha256:'44331f9b5c80f067f22e253fa04157fafd968ca5bb4ba349c4d654d5020d9b08',
 counterfactualLogSha256:'152f0b392a56ac3b7011278fa981aaf8c01591a41b289bf3bfbc1638e31dbb5f',
 candidateRead:false,baselineRead:false};
const review=()=>reviewEleven({prior:structuredClone(baseline),witness:structuredClone(witness)});
test('source preseal proposes exactly one new label with no metric',()=>{
 const r=review();assert.equal(r.labels.length,11);assert.equal(r.sourcePositiveLabels,6);
 assert.equal(r.verifiedScopedNegativeLabels,5);assert.equal(r.neededAdditionalLabelsAtLeast,109);
 assert.equal(r.precision,null);assert.equal(r.recall,null);assert.equal(r.f1,null);
 assert.equal(r.tripleSPlusCertified,false);assert.equal(r.benchmarkScoredLabels,0);
 assert.equal(r.status,'OWNER_CI_ATTESTATION_REQUIRED');
 assert.equal(r.labels[0].rule,'JSON_SOURCE_ARRAY_EARLY_CLOSING_BRACKET');
});
test('reject incorrect prior source seal digest',()=>{
 const bad=structuredClone(baseline);bad.sealedTruthDigest='a'.repeat(64);
 assert.throws(()=>reviewEleven({prior:bad,witness}),/BLOCKED/);
});
test('reject duplicate prior identity',()=>{
 const bad=structuredClone(baseline);bad.labels.push({...bad.labels[0]});
 assert.throws(()=>reviewEleven({prior:bad,witness}),/BLOCKED/);
});
test('reject wrong frozen PR HEAD',()=>{
 assert.throws(()=>reviewEleven({prior:baseline,witness:{...witness,headSha:'f'.repeat(40)}}),/BLOCKED/);
});
test('reject mutant-only evidence',()=>{
 assert.throws(()=>reviewEleven({prior:baseline,witness:{...witness,counterfactualPassed:false}}),/BLOCKED/);
});
test('reject missing original control and contaminated baseline',()=>{
 for(const change of [{originalFailure:false},{positiveControlPassed:false},{candidateRead:true},{baselineRead:true}])
  assert.throws(()=>reviewEleven({prior:baseline,witness:{...witness,...change}}),/BLOCKED/);
});
test('reject missing attested sha256',()=>{
 assert.throws(()=>reviewEleven({prior:baseline,witness:{...witness,originalLogSha256:''}}),/BLOCKED/);
});
test('reject extra fields and synthetic source',()=>{
 assert.throws(()=>reviewEleven({prior:baseline,witness:{...witness,foo:1}}),/BLOCKED/);
 assert.throws(()=>reviewEleven({prior:baseline,witness:{...witness,blobSha:'b'.repeat(40)}}),/BLOCKED/);
});
