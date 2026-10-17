'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {auditExcludedSourceScope,verifyOriginalExcludedHeadBlobs}=require('../../packages/quality-gates/c2-excluded-file-audit.cjs');
test('every excluded original-head file must be verified byte-for-byte before claiming full content inspected',()=>{
 const fixture=NEW_LOCK.cases.map((c,i)=>({status:'ahead',base_commit:{sha:c.baseSha},
 merge_base_commit:{sha:c.baseSha},commits:[{sha:c.headSha}],
 files:Array.from({length:c.changedFiles},(_,j)=>{
  const filename=j===0?'app/src/test/java/Pr'+c.pr+'CaseTest.kt':
   'app/src/main/java/d/Source'+i+'Case'+j+'.kt';
  const code='package test\n@Test fun originalWitness() { assert(true) }\n';
  const sha=crypto.createHash('sha1').update('blob '+Buffer.byteLength(code)+'\0'+code).digest('hex');
  return {filename,status:'modified',sha,additions:1,deletions:1,changes:2,
   patch:'@@ -1 +1 @@\n-old\n+new\n',body:code};
 })}));
 const clean=fixture.map(c=>({...c,files:c.files.map(({body,...rest})=>rest)}));
 const audit=auditExcludedSourceScope(clean);
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'c2-source-'));
 try{
  for(let i=0;i<NEW_LOCK.cases.length;i++){
   const file=fixture[i].files[0],target=path.join(base,'pr-'+NEW_LOCK.cases[i].pr,'head',file.filename);
   fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.body);
  }
  const verified=verifyOriginalExcludedHeadBlobs(audit,base);
  assert.equal(verified.verifiedOriginalHeadBlobs,8);
  assert.equal(verified.originalSourceContentReviewComplete,true);
  assert.equal(verified.originalKotlinTestFilesVerified,8);
  assert.equal(verified.truthLabelsAdded,0);
  assert.equal(verified.coreFullSemanticCoverageCertified,false);
  assert.match(verified.fullSourceAuditSha256,/^[a-f0-9]{64}$/);
  const file=path.join(base,'pr-'+NEW_LOCK.cases[0].pr,'head',fixture[0].files[0].filename);
  fs.writeFileSync(file,'changed!');
  assert.throws(()=>verifyOriginalExcludedHeadBlobs(audit,base),/C2_EXCLUDED_SCOPE_BLOCKED/);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
test('missing original blobs, incorrect root, or symlink is a blocker',()=>{
 const fixture=NEW_LOCK.cases.map((c,i)=>({status:'ahead',base_commit:{sha:c.baseSha},
 merge_base_commit:{sha:c.baseSha},commits:[{sha:c.headSha}],
 files:Array.from({length:c.changedFiles},(_,j)=>({
  filename:j===0?'app/build.gradle.kts':'app/src/main/java/d/Source'+i+'Case'+j+'.kt',
  status:'modified',sha:crypto.createHash('sha1').update(i+'-'+j).digest('hex'),
  additions:1,deletions:1,changes:2,patch:'@@ -1 +1 @@\n-old\n+new\n'
 }))}));
 const report=auditExcludedSourceScope(fixture);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-empty-'));
 try{
  assert.throws(()=>verifyOriginalExcludedHeadBlobs(report,dir),/C2_EXCLUDED_SCOPE_BLOCKED/);
  assert.throws(()=>verifyOriginalExcludedHeadBlobs(report,'/missing/test'),/C2_EXCLUDED_SCOPE_BLOCKED/);
  const f=path.join(dir,'pr-'+NEW_LOCK.cases[0].pr,'head','app/build.gradle.kts');
  fs.mkdirSync(path.dirname(f),{recursive:true});fs.symlinkSync('/etc/passwd',f);
  assert.throws(()=>verifyOriginalExcludedHeadBlobs(report,dir),/C2_EXCLUDED_SCOPE_BLOCKED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
