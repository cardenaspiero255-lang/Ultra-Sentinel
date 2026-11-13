'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {isSafeNovelKotlinPath,isSafeHunterKotlinPath}=require('../../packages/investigation/novel-kotlin-path-policy.cjs');
const {runBlindNumericInventory}=require('../../packages/family-hunter/blind-numeric-worker.cjs');
const {scanCodecIntegrityHypotheses}=require('../../packages/family-hunter/phase2-codec-integrity-hunter.cjs');
const {scanIdentityDelimiterHypotheses}=require('../../packages/family-hunter/phase2-identity-delimiter-hunter.cjs');
const blobSha=source=>{
 const b=Buffer.from(source,'utf8');
 return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
};

test('Hunter accepts original root-level src/main/kotlin without extending Judge and Fixer authority',()=>{
 for(const p of ['src/main/kotlin/math/Median.kt','src/main/kotlin/search/BinarySearch.kt','src/main/kotlin/Single.kt']){
  assert.equal(isSafeHunterKotlinPath(p),true,p);
  assert.equal(isSafeNovelKotlinPath(p),false,p);
 }
});

test('new Hunter root authority refuses traversal, generated, test, symlink-shaped and alternate roots',()=>{
 for(const p of [
  'src/test/kotlin/Leak.kt','src/main/java/Leak.kt','src/main/kotlin/generated/Leak.kt',
  'src/main/kotlin/test/Leak.kt','src/main/kotlin/testData/Leak.kt','src/main/kotlin/fixtures/Leak.kt',
  'src/main/kotlin/build/Leak.kt','src/main/kotlin/.github/Leak.kt',
  'src/main/kotlin/../Leak.kt','src/main/kotlin/pkg/../../Leak.kt',
  'src/main/kotlin/pkg//Leak.kt','src/main/kotlin/pkg\\Leak.kt',
  'src/main/kotlin/pkg/Leak..kt','src/main/kotlin/Leak.kt/',
  '/src/main/kotlin/Leak.kt','src/main/kotlin/Leak.java',
  'src/main/kotlin/'+('x'.repeat(301))+'.kt',null,{},5
 ])assert.equal(isSafeHunterKotlinPath(p),false,String(p));
});

test('three advisory scanners can inspect authenticated root-level Kotlin examples without an oracle',()=>{
 const scenarios=[
  {path:'src/main/kotlin/math/Median.kt',source:'package math\nfun calc(x: Int): Long = (x * 1000).toLong()\n',
   run:(f)=>runBlindNumericInventory({expectedCommitSha:'a'.repeat(40),files:[f],skippedOversized:0,skippedNoncanonical:0}),
   expected:'INT_MULTIPLICATION_BEFORE_WIDENING'},
  {path:'src/main/kotlin/util/Codec.kt',source:'package util\nfun decode(v: ByteArray) = String(Base64.getDecoder().decode(v), StandardCharsets.UTF_8)\n',
   run:(f)=>scanCodecIntegrityHypotheses({expectedCommitSha:'a'.repeat(40),files:[f]}),
   expected:'LOSSY_BASE64_UTF8_DECODE'},
  {path:'src/main/kotlin/user/Identity.kt',source:'package user\nfun stateCacheKey(a: String, b: String) = listOf(a,b).joinToString("|")\n',
   run:(f)=>scanIdentityDelimiterHypotheses({expectedCommitSha:'a'.repeat(40),files:[f]}),
   expected:'AMBIGUOUS_DELIMITED_IDENTITY'}
 ];
 for(const s of scenarios){
  const file={path:s.path,source:s.source,expectedBlobSha:blobSha(s.source)};
  const result=s.run(file);
  assert.ok(result.findings.some(f=>f.rule===s.expected),JSON.stringify(result));
  assert.equal(result.originalOracleVerified??result.originalFunctionalOracleVerified,false);
  const wrong={...file,expectedBlobSha:'f'.repeat(40)};
  const rejected=s.run(wrong);
  assert.equal(rejected.findings.length,0,'forged blobs must not be scanned');
 }
});
