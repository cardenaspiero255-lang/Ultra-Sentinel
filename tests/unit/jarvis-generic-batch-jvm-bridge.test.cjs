'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {adjudicate}=require('../../scripts/verify-jarvis-novel-batch-functional.cjs');
test('fail closed without pinned, independently executed original JVM artifacts',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-batch-jvm-negative-'));
 try{
  assert.throws(()=>adjudicate(root),/JARVIS_GENERIC_BATCH_JVM_EVIDENCE_BLOCKED|ENOENT/);
  fs.writeFileSync(path.join(root,'original.kt'),
   fs.readFileSync(path.join(__dirname,'../fixtures/pinned-jarvis-termux-original.kt')));
  assert.throws(()=>adjudicate(root),/JARVIS_GENERIC_BATCH_JVM_EVIDENCE_BLOCKED|ENOENT/);
  assert.throws(()=>adjudicate('/etc'),/JARVIS_GENERIC_BATCH_JVM_EVIDENCE_BLOCKED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('trusted CI must run the original Kotlin oracles before generic batch adjudication',()=>{
 const yaml=fs.readFileSync(path.join(__dirname,
  '../../.github/workflows/jarvis-termux-original-fix.yml'),'utf8');
 const termux=yaml.indexOf('Fetch pinned original JARVIS Git blob and prove genuine RED GREEN');
 const voice=yaml.indexOf('Verify second original Kotlin family using independent voice clock oracle');
 const batch=yaml.indexOf('Bind generic batch Judge to two independently executed original JVM oracles');
 assert.ok(termux>0&&voice>termux&&batch>voice);
 assert.match(yaml,/node scripts\/verify-jarvis-novel-batch-functional\.cjs/);
 assert.match(yaml,/generic-batch-functional-receipt\.json/);
 assert.match(yaml,/\.unsafeCandidateFunctionallyVetoed==true/);
 assert.match(yaml,/\.remoteWrites==false and \.mergeAllowed==false/);
});
