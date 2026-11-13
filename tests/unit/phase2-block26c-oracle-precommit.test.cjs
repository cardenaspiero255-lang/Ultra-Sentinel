'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {readOracleSeal,verifyOracleSeal}=require('../../scripts/phase2-block26c-oracle-preflight.cjs');

test('SHA256 oracle sources are precommitted and never executed before Hunter predictions',()=>{
 const seal=readOracleSeal();
 assert.equal(seal.schema,'ultra-sentinel-phase2-block26c-precommitted-independent-original-oracle/v1');
 assert.equal(seal.source.commitSha,'498c8a10febe1a97f085a295c1f6b2a818a83f89');
 assert.equal(seal.oracleFiles.length,3);
 assert.equal(seal.protocol.precommitBeforeBlindPredictions,true);
 assert.equal(seal.protocol.hunterExecuted,false);
 assert.equal(seal.protocol.oracleExecutedBeforeBlindPredictions,false);
 assert.equal(seal.protocol.originalOracleResultsKnown,false);
 assert.equal(seal.protocol.block26Closed,false);
 assert.equal(verifyOracleSeal(seal),true);
});

test('tampering with SHA256, byte identity, source set, or scored conclusions blocks',()=>{
 const seal=readOracleSeal();
 for(const mutation of [
  x=>x.oracleFiles[0].sha256='f'.repeat(64),
  x=>x.oracleFiles[2].gitBlobSha='f'.repeat(40),
  x=>x.source.compiledOriginals.pop(),
  x=>x.protocol.hunterExecuted=true,
  x=>x.protocol.oracleExecutedBeforeBlindPredictions=true,
  x=>x.protocol.originalOracleResultsKnown=true,
  x=>x.protocol.block26Closed=true,
  x=>x.protocol.precision=1,
  x=>x.limitations.otherOriginalFilesWithoutFunctionalOracles=0,
 ]){
  const copy=structuredClone(seal);mutation(copy);
  assert.throws(()=>verifyOracleSeal(copy));
 }
});

test('precommit workflow compiles original Kotlin without executing sealed oracle',()=>{
 const y=fs.readFileSync(path.join(__dirname,'../../.github/workflows/phase2-block26c-oracle-precommit.yml'),'utf8');
 assert.match(y,/node scripts\/phase2-block26c-oracle-preflight\.cjs/);
 assert.match(y,/RingBuffer\.kt/);
 assert.match(y,/SupportNoop\.kt/);
 assert.match(y,/--unshare-all --new-session --clearenv/);
 assert.doesNotMatch(y,/\/jdk\/bin\/java -jar|\bjava -jar\b|continue-on-error/);
});
