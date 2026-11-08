'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {scanNovelKotlinHypotheses,blobSha}=
 require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const HEAD='747c14b5d97750a7b2736968e2d516f02448558d';
const FILE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStream.kt';
const original=fs.readFileSync(path.join(__dirname,
 '../fixtures/jarvis-bounded-image/BoundedImageInputStream.kt'),'utf8');
function scan(source=original,pathName=FILE,blob=blobSha(source)){
 return scanNovelKotlinHypotheses({expectedCommitSha:HEAD,
  files:[{path:pathName,source,expectedBlobSha:blob}]});
}
test('Hunter identifies a non-empty bounded read that accepts zero progress in real JARVIS source',()=>{
 assert.equal(blobSha(original),'fd061b9dad636684184ccf2e96f87084d3b99df5');
 const result=scan();
 const finding=result.findings.find(x=>x.rule==='BOUNDED_READ_ZERO_PROGRESS');
 assert.ok(finding);
 assert.equal(finding.path,FILE);
 assert.match(finding.evidence,/actual > allowed/);
 assert.equal(finding.status,'HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE');
 assert.equal(result.originalFunctionalOracleVerified,false);
 assert.equal(result.remoteWrites,false);
});
test('zero-progress guard and benign comments do not produce the same hypothesis',()=>{
 const repaired=original.replace('if (actual > allowed || actual < -1)',
  'if (actual == 0 || actual > allowed || actual < -1)');
 assert.ok(!scan(repaired).findings.some(f=>f.rule==='BOUNDED_READ_ZERO_PROGRESS'));
 const noRead='package sample\n// val actual = super.read(buffer, off, allowed)\nclass Safe\n';
 assert.ok(!scan(noRead).findings.some(f=>f.rule==='BOUNDED_READ_ZERO_PROGRESS'));
 assert.equal(scan(original,FILE,'0'.repeat(40)).status,'BLOCKED_BLOB_MISMATCH');
});

test('Fixer creates a bounded advisory candidate for the detected source and no remote authority',()=>{
 const {draftBoundedReadProgressRepair}=
  require('../../packages/investigation/bounded-read-progress-repair.cjs');
 const file={path:FILE,source:original,expectedBlobSha:blobSha(original)};
 const result=draftBoundedReadProgressRepair({expectedCommitSha:HEAD,file});
 assert.equal(result.status,'CANDIDATE_REQUIRES_TRUSTED_ORIGINAL_ORACLE');
 assert.match(result.candidateSource,/if \(actual == 0 \|\| actual > allowed \|\| actual < -1\)/);
 assert.equal(result.sourceBlobSha,blobSha(original));
 assert.equal(result.candidateBlobSha,blobSha(result.candidateSource));
 assert.equal(result.originalFunctionalOracleVerified,false);
 assert.equal(result.remoteWrites,false);
 assert.equal(result.mergeAllowed,false);
 assert.deepEqual(result.candidateSource.split('\n').filter((line,i)=>
  line!==original.split('\n')[i]),[
   '        if (actual == 0 || actual > allowed || actual < -1) throw IOException("invalid image provider read")'
  ]);
});

test('Fixer works with new identifiers but rejects changed blobs, safe code and ambiguous guards',()=>{
 const {draftBoundedReadProgressRepair}=
  require('../../packages/investigation/bounded-read-progress-repair.cjs');
 const renamed=original.replace(/\bactual\b/g,'received').replace(/\ballowed\b/g,'permitted');
 const run=(source,expectedBlobSha=blobSha(source))=>draftBoundedReadProgressRepair({
  expectedCommitSha:HEAD,file:{path:FILE,source,expectedBlobSha}});
 assert.equal(run(renamed).status,'CANDIDATE_REQUIRES_TRUSTED_ORIGINAL_ORACLE');
 assert.match(run(renamed).candidateSource,/received == 0/);
 assert.match(run(original,'0'.repeat(40)).status,/^BLOCKED_/);
 assert.match(run(original.replace('if (actual > allowed || actual < -1)',
  'if (actual == 0 || actual > allowed || actual < -1)')).status,/^BLOCKED_/);
 assert.match(run(original.replace('if (actual > allowed || actual < -1)',
  'if (actual > allowed || actual < -1) throw IOException("a")\n        if (actual > allowed || actual < -1)')).status,/^BLOCKED_/);
});

test('one-source local Judge checks the exact candidate and restores the original tree',()=>{
 const {draftBoundedReadProgressRepair}=
  require('../../packages/investigation/bounded-read-progress-repair.cjs');
 const {drillOneSourceKotlinSandbox}=
  require('../../packages/recovery/two-source-kotlin-sandbox.cjs');
 const draft=draftBoundedReadProgressRepair({expectedCommitSha:HEAD,
  file:{path:FILE,source:original,expectedBlobSha:blobSha(original)}});
 const file={path:FILE,before:original,after:draft.candidateSource,
  beforeBlobSha:blobSha(original),afterBlobSha:draft.candidateBlobSha};
 const result=drillOneSourceKotlinSandbox({file});
 assert.equal(result.status,'ONE_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED');
 assert.equal(result.checkedFiles,1);
 assert.equal(result.exactTreeRollbackVerified,true);
 assert.equal(result.originalOracleVerifiedByThisFunction,false);
 assert.equal(result.remoteWrites,false);
 assert.equal(drillOneSourceKotlinSandbox({file:{...file,afterBlobSha:'0'.repeat(40)}}).status,
  'BLOCKED_INPUT_CONTRACT');
});

test('functional Judge rejects a candidate that passes structural Git checks but breaks benign reads',()=>{
 const {draftBoundedReadProgressRepair}=
  require('../../packages/investigation/bounded-read-progress-repair.cjs');
 const {makeUnsafeReadProgressControl,judgeReadProgressEvidence}=
  require('../../packages/recovery/bounded-read-progress-functional-judge.cjs');
 const file={path:FILE,source:original,expectedBlobSha:blobSha(original)};
 const candidate=draftBoundedReadProgressRepair({expectedCommitSha:HEAD,file}).candidateSource;
 const unsafe=makeUnsafeReadProgressControl(candidate);
 const results={
  original:{oracleExit:1,oracleLog:'ZERO_PROGRESS_ACCEPTED\n',junitExit:0,junitLog:'OK (6 tests)\n'},
  candidate:{oracleExit:0,oracleLog:'READ_PROGRESS_ORACLE_PASS\n',junitExit:0,junitLog:'OK (6 tests)\n'},
  unsafe:{oracleExit:1,oracleLog:'BENIGN_READ_REJECTED\n',junitExit:1,junitLog:'FAILURES!!!\n'}
 };
 const input={expectedCommitSha:HEAD,file,candidateSource:candidate,unsafeSource:unsafe,results};
 const ok=judgeReadProgressEvidence(input);
 assert.equal(ok.status,'LOCAL_FUNCTIONAL_JUDGE_ACCEPTED_NOT_AUTHENTICATED');
 assert.equal(ok.functionalCandidateAccepted,true);
 assert.equal(ok.unsafeCandidateRejected,true);
 assert.equal(ok.exactTreeRollbackVerified,true);
 assert.equal(ok.originalJVMExecutionAuthenticated,false);
 assert.equal(ok.remoteWrites,false);
 const forged={...results,unsafe:{...results.unsafe,oracleExit:0,oracleLog:'READ_PROGRESS_ORACLE_PASS\n',
  junitExit:0,junitLog:'OK (6 tests)\n'}};
 assert.equal(judgeReadProgressEvidence({...input,results:forged}).status,'FUNCTIONAL_JUDGE_VETO');
 assert.equal(judgeReadProgressEvidence({...input,candidateSource:unsafe}).status,'FUNCTIONAL_JUDGE_VETO');
 let invoked=0;
 const accessor={...results,original:{...results.original}};
 Object.defineProperty(accessor.original,'oracleExit',{enumerable:true,get(){invoked++;return 1;}});
 assert.equal(judgeReadProgressEvidence({...input,results:accessor}).status,'FUNCTIONAL_JUDGE_VETO');
 const fileAccessor={...file};
 Object.defineProperty(fileAccessor,'path',{enumerable:true,get(){invoked++;return FILE;}});
 assert.equal(judgeReadProgressEvidence({...input,file:fileAccessor}).status,'FUNCTIONAL_JUDGE_VETO');
 const coercion={...results,candidate:{...results.candidate,oracleLog:{trim(){invoked++;return 'READ_PROGRESS_ORACLE_PASS';}}}};
 assert.equal(judgeReadProgressEvidence({...input,results:coercion}).status,'FUNCTIONAL_JUDGE_VETO');
 assert.equal(invoked,0);
});
test('read-progress Fixer and Judge reject accessors without executing them',()=>{
 const {draftBoundedReadProgressRepair}=
  require('../../packages/investigation/bounded-read-progress-repair.cjs');
 const {judgeReadProgressEvidence}=
  require('../../packages/recovery/bounded-read-progress-functional-judge.cjs');
 const file=()=>({path:FILE,source:original,expectedBlobSha:blobSha(original)});
 let invoked=0;const bad=()=>{invoked++;throw Error('unexpected getter');};
 for(const run of [draftBoundedReadProgressRepair,judgeReadProgressEvidence]){
  const root={expectedCommitSha:HEAD,file:file()};
  Object.defineProperty(root,'expectedCommitSha',{enumerable:true,get:bad});
  assert.match(run(root).status,/^(BLOCKED_|FUNCTIONAL_JUDGE_VETO)/);
  const nested={expectedCommitSha:HEAD,file:file()};
  Object.defineProperty(nested.file,'path',{enumerable:true,get:bad});
  assert.match(run(nested).status,/^(BLOCKED_|FUNCTIONAL_JUDGE_VETO)/);
 }
 assert.equal(invoked,0);
});
