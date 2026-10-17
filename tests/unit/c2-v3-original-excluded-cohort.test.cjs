'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {evaluateC2V3Originals}=require('../../scripts/evaluate-c2-v3-original-excluded.cjs');
const src='package a\n@Test fun verifies(){ assert(true) }\n';
const sha=crypto.createHash('sha1').update('blob '+Buffer.byteLength(src)+'\0').update(src).digest('hex');
function setup(root){
 const compares=path.join(root,'compares'),source=path.join(root,'source');
 fs.mkdirSync(compares);fs.mkdirSync(source);
 for(let i=0;i<NEW_LOCK.cases.length;i++){
  const c=NEW_LOCK.cases[i],target='app/src/test/java/Pr'+c.pr+'Test.kt';
  const files=Array.from({length:c.changedFiles},(_,j)=>({
   filename:j===0?target:'app/src/main/java/d/Pr'+c.pr+'Class'+j+'.kt',
   status:'modified',sha:j===0?sha:crypto.createHash('sha1').update(i+':'+j).digest('hex'),
   additions:1,deletions:1,changes:2,
   patch:j===0?'@@ -2,1 +2,1 @@\n-old\n+@Test fun verifies(){ assert(true) }\n':
    '@@ -1 +1 @@\n-old\n+new\n'
  }));
  fs.writeFileSync(path.join(compares,'pr-'+c.pr+'.json'),JSON.stringify({
   status:'ahead',base_commit:{sha:c.baseSha},merge_base_commit:{sha:c.baseSha},
   commits:[{sha:c.headSha}],files
  }));
  const dest=path.join(source,'pr-'+c.pr,'head',target);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,src);
 }
 return {compares,source};
}
test('V3 scope preview handles eight frozen PRs with authenticated original files and no scoring',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-v3-'));
 try{
  const {compares,source}=setup(root);
  const result=evaluateC2V3Originals(compares,source);
  assert.equal(result.prs.length,8);
  assert.equal(result.originalFilesVerified,8);
  assert.equal(result.structuralDiffsAnalyzed,8);
  assert.equal(result.omitted,0);
  assert.equal(result.semanticBehaviorVerified,0);
  assert.equal(result.originalTruthLabelsAdded,0);
  assert.equal(result.legacyCandidateParityProven,false);
  assert.equal(result.certification,'NOT_CERTIFIED');
  assert.match(result.receiptSha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(result,evaluateC2V3Originals(compares,source));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('V3 original source evaluation rejects missing or tampered file and changed PR path',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-v3-'));
 try{
  const {compares,source}=setup(root);
  const f=path.join(source,'pr-150/head/app/src/test/java/Pr150Test.kt');
  fs.writeFileSync(f,'tampered');
  assert.throws(()=>evaluateC2V3Originals(compares,source),/C2_V3_SOURCE_SCOPE_BLOCKED/);
  fs.writeFileSync(f,src);
  fs.rmSync(f);
  assert.throws(()=>evaluateC2V3Originals(compares,source),/C2_V3_SOURCE_SCOPE_BLOCKED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
