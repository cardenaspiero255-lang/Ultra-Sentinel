'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {evaluateC2V3Originals}=require('../../scripts/evaluate-c2-v3-original-excluded.cjs');
const sample='package a\n@Test fun verifies(){ assert(true) }\n';
const gradle='plugins { }\nignoreFailures = true\n';
const excluded=[6,14,14,11,8,11,16,8];
const blob=x=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(x)+'\0').update(x).digest('hex');
function setup(root){
 const compares=path.join(root,'compares'),source=path.join(root,'source');
 fs.mkdirSync(compares);fs.mkdirSync(source);
 for(let i=0;i<NEW_LOCK.cases.length;i++){
  const c=NEW_LOCK.cases[i],files=[];
  for(let j=0;j<c.changedFiles;j++){
   const isExcluded=j<excluded[i],isGradle=isExcluded&&j===0&&i<5,
    isInstrument=isExcluded&&i===1&&j===1;
   const filename=isGradle?'app/build.gradle.kts':
    isInstrument?'app/src/androidTest/java/Pr'+c.pr+'CheckTest.kt':
    isExcluded?'app/src/test/java/Pr'+c.pr+'Case'+j+'Test.kt':
    'app/src/main/java/d/Pr'+c.pr+'Class'+j+'.kt';
   const body=isGradle?gradle:sample;
   const added=body.split('\n')[1];
   files.push({filename,status:'modified',
    sha:isExcluded?blob(body):crypto.createHash('sha1').update(i+':'+j).digest('hex'),
    additions:1,deletions:1,changes:2,
    patch:'@@ -2,1 +2,1 @@\n-old\n+'+(isExcluded?added:'new')+'\n'});
   if(isExcluded){
    const dest=path.join(source,'pr-'+c.pr,'head',filename);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,body);
   }
  }
  fs.writeFileSync(path.join(compares,'pr-'+c.pr+'.json'),JSON.stringify({
   status:'ahead',base_commit:{sha:c.baseSha},merge_base_commit:{sha:c.baseSha},
   commits:[{sha:c.headSha}],files}));
 }
 return {compares,source};
}
test('V3 scope preview covers all 88 original frozen PR inputs, without granting semantic certification',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-v3-'));
 try{
  const {compares,source}=setup(root),report=evaluateC2V3Originals(compares,source);
  assert.equal(report.prs.length,8);
  assert.equal(report.originalFilesVerified,88);
  assert.equal(report.structuralDiffsAnalyzed,88);
  assert.equal(report.omitted,0);
  assert.equal(report.semanticBehaviorVerified,0);
  assert.equal(report.originalTruthLabelsAdded,0);
  assert.equal(report.legacyCandidateParityProven,false);
  assert.equal(report.certification,'NOT_CERTIFIED');
  assert.match(report.receiptSha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(report,evaluateC2V3Originals(compares,source));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('V3 original source evaluation rejects missing, tampered or extra original files',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-v3-'));
 try{
  const {compares,source}=setup(root),filename=path.join(source,'pr-150/head/app/build.gradle.kts');
  fs.writeFileSync(filename,'tampered');
  assert.throws(()=>evaluateC2V3Originals(compares,source),/C2_V3_SOURCE_SCOPE_BLOCKED/);
  fs.writeFileSync(filename,gradle);
  fs.rmSync(filename);
  assert.throws(()=>evaluateC2V3Originals(compares,source),/C2_V3_SOURCE_SCOPE_BLOCKED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
