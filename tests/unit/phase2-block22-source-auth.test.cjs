'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../../docs/quality/PHASE2-BLOCK21-FREEZE-20261112.json'),'utf8'));
const {validateEntries,validateOracleSeal}=require('../../scripts/verify-phase2-block22-source.cjs');
const entries=manifest.cohort.files.map(x=>({name:path.posix.basename(x.path),mode:'100644',type:'blob',sha:x.blobSha}));

test('all eight predetermined source files validate with exact closed-world inventory',()=>{
 assert.equal(validateEntries(entries,manifest.cohort.files,manifest.cohort.scope),8);
});
test('extra, missing, changed, symlink, duplicate and path traversal entries fail closed',()=>{
 const invalid=[
  [...entries,{name:'Surprise.kt',mode:'100644',type:'blob',sha:'a'.repeat(40)}],
  entries.slice(1),
  entries.map((x,i)=>i===0?{...x,sha:'b'.repeat(40)}:x),
  entries.map((x,i)=>i===0?{...x,mode:'120000'}:x),
  entries.map((x,i)=>i===0?{...x,name:'../Builders.kt'}:x),
  [...entries,entries[0]],
 ];
 for(const list of invalid)assert.throws(()=>validateEntries(list,manifest.cohort.files,manifest.cohort.scope));
});
test('oracle seal is SHA256 bound to exact bytes and rejects changed control inputs',()=>{
 const root=path.join(__dirname,'../../tests/fixtures/phase2-block22-oracle');
 const seal=JSON.parse(fs.readFileSync(path.join(root,'oracle-seal.json'),'utf8'));
 assert.equal(validateOracleSeal(root,seal),true);
 const copy=structuredClone(seal);copy.sourceFiles[0].blobSha='f'.repeat(40);
 assert.throws(()=>validateOracleSeal(root,copy));
});
test('oracle seal never pretends positive defect labels, Hunter findings, scoring or authorized repairs',()=>{
 const root=path.join(__dirname,'../../tests/fixtures/phase2-block22-oracle');
 const seal=JSON.parse(fs.readFileSync(path.join(root,'oracle-seal.json'),'utf8'));
 assert.equal(seal.frozenEngineSha,manifest.engine.commitSha);
 assert.equal(seal.sourceCommitSha,manifest.cohort.commitSha);
 assert.equal(seal.positiveOriginalDefectsVerified,false);
 assert.equal(seal.completeUniverseLabeled,false);
 assert.equal(seal.predictionsExecuted,false);
 assert.equal(seal.automatedRepairsVerified,false);
 assert.equal(seal.score,null);
 assert.equal(seal.independentHumanReview,false);
});
