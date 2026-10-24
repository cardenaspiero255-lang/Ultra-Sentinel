'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {
 createProjectOracleReceipt, verifyProjectOracleReceipt
}=require('../../packages/quality-gates/c2-project-oracle-proof.cjs');

const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const gitBlob=x=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(x)+'\0').update(x).digest('hex');
const SRC={
 original:Buffer.from("test('original',()=>{throw Error('known fixture failure')});\n"),
 fixed:Buffer.from("test('fixed',()=>{});\n"),
 benign:Buffer.from("test('benign',()=>{});\n")
};
const LOG={
 original:Buffer.from('ORIGINAL_EXPECTED_FAILURE\n'),
 fixed:Buffer.from('FIXED_EXPECTED_SUCCESS\n'),
 benign:Buffer.from('BENIGN_EXPECTED_SUCCESS\n')
};
function inputs(){
 return {
  mode:'TRUSTED_SELFTEST_ONLY',
  workerCommitSha:'a'.repeat(40),
  projectId:'ultra-sentinel-sandbox-fixture',
  isolation:{networkUnshared:true,credentialsAbsent:true,rootReadOnly:true,unprivileged:true},
  phases:['original','fixed','benign'].map(phase=>({
    phase,sourceBlobSha:gitBlob(SRC[phase]),
    sourceSha256:hash(SRC[phase]),
    logSha256:hash(LOG[phase]),exitCode:phase==='original'?1:0
  }))
 };
}
test('isolated three-stage selftest receipt remains non-GOLD despite verified bytes',()=>{
 const receipt=createProjectOracleReceipt(inputs());
 const v=verifyProjectOracleReceipt({receipt,sourceBytes:SRC,logBytes:LOG,expectedCommitSha:'a'.repeat(40)});
 assert.equal(v.status,'SELFTEST_BYTES_VERIFIED_PROVENANCE_NOT_ATTESTED');
 assert.equal(v.actualBytesVerified,true);
 assert.equal(v.externalOriginalSourceAuthenticated,false);
 assert.equal(v.sourceBehaviorCertified,false);
 assert.equal(v.newGoldLabels,0);
 assert.equal(v.remaining,111);
 assert.equal(v.precision,null);
 assert.equal(v.truthSealed,false);
 assert.equal(v.candidatePredictionsRead,false);
 assert.equal(v.tripleSPlusCertified,false);
});
test('fails if source is altered without changing the advertised Git blob',()=>{
 const receipt=createProjectOracleReceipt(inputs());
 const changed={...SRC,fixed:Buffer.from('malicious')}
 assert.throws(()=>verifyProjectOracleReceipt({receipt,sourceBytes:changed,logBytes:LOG,expectedCommitSha:'a'.repeat(40)}),/C2_PROJECT_ORACLE_BLOCKED/);
});
test('fails if a log is swapped or a stage is missing',()=>{
 const receipt=createProjectOracleReceipt(inputs());
 assert.throws(()=>verifyProjectOracleReceipt({receipt,sourceBytes:SRC,logBytes:{...LOG,benign:Buffer.from('tamper')},expectedCommitSha:'a'.repeat(40)}),/C2_PROJECT_ORACLE_BLOCKED/);
 const missing={...LOG};delete missing.original;
 assert.throws(()=>verifyProjectOracleReceipt({receipt,sourceBytes:SRC,logBytes:missing,expectedCommitSha:'a'.repeat(40)}),/C2_PROJECT_ORACLE_BLOCKED/);
});
test('refuses forged runtime security assertions, replays and source modes',()=>{
 for(const mutate of [
  x=>{x.isolation.networkUnshared=false},
  x=>{x.isolation.credentialsAbsent=false},
  x=>{x.isolation.rootReadOnly=false},
  x=>{x.isolation.unprivileged=false},
  x=>{x.mode='EXTERNAL_PR_GOLD'},
  x=>{x.phases[0].exitCode=0},
  x=>{x.phases[1].exitCode=1},
  x=>{x.phases[2].phase='fixed'},
  x=>{x.phases[0].sourceBlobSha='not-sha'},
  x=>{x.workerCommitSha='b'.repeat(40)}
 ]){
  const entry=inputs();mutate(entry);
  if(entry.workerCommitSha==='b'.repeat(40)){
   const r=createProjectOracleReceipt(entry);
   assert.throws(()=>verifyProjectOracleReceipt({receipt:r,sourceBytes:SRC,logBytes:LOG,expectedCommitSha:'a'.repeat(40)}),/C2_PROJECT_ORACLE_BLOCKED/);
  } else assert.throws(()=>createProjectOracleReceipt(entry),/C2_PROJECT_ORACLE_BLOCKED/);
 }
});
test('rejects widening receipt to claim labels or detector outputs',()=>{
 const receipt=createProjectOracleReceipt(inputs());
 for(const extra of [{newGoldLabels:111},{candidatePredictionsRead:true},{sourceBehaviorCertified:true}]){
  assert.throws(()=>verifyProjectOracleReceipt({
   receipt:{...receipt,...extra},sourceBytes:SRC,logBytes:LOG,
   expectedCommitSha:'a'.repeat(40)
  }),/C2_PROJECT_ORACLE_BLOCKED/);
 }
});
test('receipts bind entire phase order and exact source/log SHA-256 identities',()=>{
 const receipt=createProjectOracleReceipt(inputs());
 assert.equal(receipt.phases.length,3);
 assert.equal(receipt.phases[0].phase,'original');
 assert.equal(receipt.phases[1].phase,'fixed');
 assert.equal(receipt.phases[2].phase,'benign');
 assert.match(receipt.receiptDigestSha256,/^[a-f0-9]{64}$/);
 const changed={...receipt,phases:[...receipt.phases].reverse()};
 assert.throws(()=>verifyProjectOracleReceipt({receipt:changed,sourceBytes:SRC,logBytes:LOG,expectedCommitSha:'a'.repeat(40)}),/C2_PROJECT_ORACLE_BLOCKED/);
});
