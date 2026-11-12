'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {
 readPinnedManifest,validateSourceEntries,assertOracleSeal
}=require('../../scripts/phase2-block24-preflight.cjs');
const root=path.resolve(__dirname,'../..');

test('Block 2.4 metadata holdout is distinct from the previous eight, pinned after Hunter v2 freeze',()=>{
 const m=readPinnedManifest();
 assert.equal(m.engine.mergeCommitSha,'34679a71aed54abbc3ecbffbf29299cfb25f65b8');
 assert.equal(m.engine.treeSha,'c6a0cdc3d2fa10843d4f58c8bec0c15e222176e2');
 assert.equal(m.cohort.repository,'Kotlin/kotlinx-io');
 assert.equal(m.cohort.commitSha,'cf40e5ba7cd99ba812177d597a9f6ce0570545b1');
 assert.equal(m.cohort.scope,'bytestring/common/src');
 assert.equal(m.cohort.files.length,6);
 assert.equal(new Set(m.cohort.files.map(f=>f.path)).size,6);
 assert.equal(m.protocol.hunterExecutedAtPreregistration,false);
 assert.equal(m.protocol.sourceBodiesReadAtPreregistration,false);
 assert.equal(m.protocol.oracleAnswersPreparedAtPreregistration,false);
 assert.equal(m.protocol.scoringAllowedWithoutFullTruth,false);
});

test('exact six original Kotlin Git entries required, no symlinks, additions or omissions',()=>{
 const m=readPinnedManifest();
 const entries=m.cohort.files.map(f=>({
  name:path.posix.basename(f.path),sha:f.blobSha,mode:'100644',type:'blob'
 }));
 assert.equal(validateSourceEntries(entries,m.cohort),6);
 for(const mutation of [
  entries.slice(1),
  [...entries,entries[0]],
  entries.map((x,i)=>i===0?{...x,mode:'120000'}:x),
  entries.map((x,i)=>i===0?{...x,sha:'a'.repeat(40)}:x),
  entries.map((x,i)=>i===0?{...x,name:'../Escape.kt'}:x)
 ])assert.throws(()=>validateSourceEntries(mutation,m.cohort));
});

test('original independent Kotlin/JVM oracle code and claims are SHA256 precommitted',()=>{
 const seal=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/phase2-block24-oracle/oracle-seal.json'),'utf8'));
 assert.equal(assertOracleSeal(seal),true);
 assert.equal(seal.originalDefectPositivesEstablished,false);
 assert.equal(seal.allSixFilesFullyLabeled,false);
 assert.equal(seal.hunterPredictionsRun,false);
 assert.equal(seal.novelFamilyDiscoveryProven,false);
 assert.equal(seal.precision,null);
 assert.equal(seal.recall,null);
 const tampered=structuredClone(seal);tampered.oracleFiles[0].sha256='f'.repeat(64);
 assert.throws(()=>assertOracleSeal(tampered));
 const forged=structuredClone(seal);forged.originalDefectPositivesEstablished=true;
 assert.throws(()=>assertOracleSeal(forged));
});

test('new IO paths are Hunter-advisory only, Judge and Fixer permissions stay narrow',()=>{
 const {isSafeHunterKotlinPath,isSafeNovelKotlinPath}=require('../../packages/investigation/novel-kotlin-path-policy.cjs');
 const m=readPinnedManifest();
 for(const f of m.cohort.files){
  assert.equal(isSafeHunterKotlinPath(f.path),true,f.path);
  assert.equal(isSafeNovelKotlinPath(f.path),false,f.path);
 }
});
