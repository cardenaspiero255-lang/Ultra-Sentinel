'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {pilotMatrix}=require('../../packages/quality-gates/c2-pr189-sixteen-original-replays.cjs');
const {triage}=require('../../scripts/c2-pr189-sixteen-pilot.cjs');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const name='TEST-'+'a'.repeat(24)+'.xml';
const xml=Buffer.from('<testsuite><testcase classname="Source" name="case"><failure/></testcase></testsuite>\n');
const updated=Buffer.from('<testsuite><testcase classname="Source" name="case"/></testsuite>\n');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-pr190-integrity-'));
 const artifacts=path.join(root,'artifacts');fs.mkdirSync(artifacts);
 const matrix=pilotMatrix(),chosen=matrix.include[0].tasks[0];
 for(const shard of matrix.include){
  const dir=path.join(artifacts,'c2-pr189-'+shard.id);fs.mkdirSync(dir);
  for(const task of shard.tasks){
   const base={task,status:'NO_DECLARED_REGRESSION',
    sourceCommit:'b9025d86f7ae634901396766bd61f6d4ae6d2165',
    newPositiveLabels:0,newNegativeLabels:0};
   if(task===chosen){
    const evidence=path.join(dir,'evidence',task);
    for(const phase of ['before','after'])fs.mkdirSync(path.join(evidence,phase,'junit'),{recursive:true});
    fs.writeFileSync(path.join(evidence,'before','junit',name),xml);
    fs.writeFileSync(path.join(evidence,'after','junit',name),updated);
    const sourceCommit='a'.repeat(40), fixedCommit='b'.repeat(40);
    const proof={schema:'ultra-sentinel-c2-upstream-junit-evidence/v1',
     task,declaredBeforeCommit:sourceCommit,declaredAfterCommit:fixedCommit,
     verifiedFailToPassCount:1,
     beforeJUnitFiles:[[name,digest(xml)]],afterJUnitFiles:[[name,digest(updated)]]};
    const proofFile=path.join(evidence,'original-transitions.json');
    const bytes=Buffer.from(JSON.stringify(proof)+'\n');
    fs.writeFileSync(proofFile,bytes);
    Object.assign(base,{status:'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED',
     candidateTransitions:1,receiptSha256:digest(bytes),sourceCommitClaim:sourceCommit,
     fixedCommitClaim:fixedCommit});
   }
   fs.writeFileSync(path.join(dir,task+'.json'),JSON.stringify(base)+'\n');
  }
 }
 return {root,artifacts,chosen,
  evidence:path.join(artifacts,'c2-pr189-'+matrix.include[0].id,'evidence',chosen),
  output:path.join(root,'report.json'),
  close(){fs.rmSync(root,{recursive:true,force:true})}};
}
test('RED: valid source receipt plus original BEFORE/AFTER JUnit evidence consolidates without GOLD',()=>{
 const t=fixture();try{
  const result=triage(t.artifacts,t.output);
  assert.equal(result.replayed,16);
  const report=JSON.parse(fs.readFileSync(t.output,'utf8'));
  assert.equal(report.newLabels,0);
  assert.equal(report.sssPlusCertified,false);
 }finally{t.close();}
});
test('RED: missing original BEFORE JUnit must block source evidence triage',()=>{
 const t=fixture();try{
  fs.rmSync(path.join(t.evidence,'before','junit',name));
  assert.throws(()=>triage(t.artifacts,t.output),/C2_PR189_RECEIPT_LOADING_BLOCKED/);
 }finally{t.close();}
});
test('RED: corrupted original AFTER JUnit must block source evidence triage',()=>{
 const t=fixture();try{
  fs.appendFileSync(path.join(t.evidence,'after','junit',name),'<!-- altered -->');
  assert.throws(()=>triage(t.artifacts,t.output),/C2_PR189_RECEIPT_LOADING_BLOCKED/);
 }finally{t.close();}
});
test('RED: absent source proof must block source evidence triage',()=>{
 const t=fixture();try{
  fs.rmSync(path.join(t.evidence,'original-transitions.json'));
  assert.throws(()=>triage(t.artifacts,t.output),/C2_PR189_RECEIPT_LOADING_BLOCKED/);
 }finally{t.close();}
});
test('RED: extra JUnit outside SHA-index must block source evidence triage',()=>{
 const t=fixture();try{
  fs.writeFileSync(path.join(t.evidence,'after','junit','TEST-'+'b'.repeat(24)+'.xml'),updated);
  assert.throws(()=>triage(t.artifacts,t.output),/C2_PR189_RECEIPT_LOADING_BLOCKED/);
 }finally{t.close();}
});
test('RED: symlinked original JUnit must block source evidence triage',()=>{
 const t=fixture();try{
  const orig=path.join(t.evidence,'before','junit',name);
  fs.renameSync(orig,orig+'.real');
  fs.symlinkSync(orig+'.real',orig);
  assert.throws(()=>triage(t.artifacts,t.output),/C2_PR189_RECEIPT_LOADING_BLOCKED/);
 }finally{t.close();}
});

test('RED: modified candidateTransitions cannot overstate or understate the SHA-attested JUnit transitions',()=>{
 for(const value of [0,2,20000,'1',null]){
  const t=fixture();try{
   const shard=pilotMatrix().include[0].id;
   const receiptFile=path.join(t.artifacts,'c2-pr189-'+shard,t.chosen+'.json');
   const receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8'));
   receipt.candidateTransitions=value;
   fs.writeFileSync(receiptFile,JSON.stringify(receipt)+'\n');
   assert.throws(()=>triage(t.artifacts,t.output),/C2_PR189_RECEIPT_LOADING_BLOCKED/);
   assert.equal(fs.existsSync(t.output),false);
  }finally{t.close();}
 }
});

test('RED: changing signed proof transition count with matching updated SHA cannot overstate results',()=>{
 const t=fixture();try{
  const shard=pilotMatrix().include[0].id;
  const receiptFile=path.join(t.artifacts,'c2-pr189-'+shard,t.chosen+'.json');
  const proofFile=path.join(t.evidence,'original-transitions.json');
  const receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8'));
  const proof=JSON.parse(fs.readFileSync(proofFile,'utf8'));
  proof.verifiedFailToPassCount=2;
  const bytes=Buffer.from(JSON.stringify(proof)+'\n');
  fs.writeFileSync(proofFile,bytes);
  receipt.receiptSha256=digest(bytes);
  fs.writeFileSync(receiptFile,JSON.stringify(receipt)+'\n');
  assert.throws(()=>triage(t.artifacts,t.output),/C2_PR189_RECEIPT_LOADING_BLOCKED/);
 }finally{t.close();}
});
