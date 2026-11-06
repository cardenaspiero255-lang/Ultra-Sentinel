'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const CLI=path.resolve(__dirname,'../../scripts/run-owner-jarvis-polite-repair.cjs');
const {validateTrialPlan,validateTrialFiles,validateOwnerRequest,
  checkHostGate,createTrustedPoliteJVMVerifier}=
 require('../../packages/recovery/owner-jarvis-polite-operator.cjs');
const BASE='747c14b5d97750a7b2736968e2d516f02448558d';
const HEAD='a88a29ba4119d3f68b2268367f594a0ac1168f9e';
const TREE='b48da9292d1f26669eb30b483ee19e59944041e5';
const PLAN={repository:'cardenaspiero255-lang/JARVIS',prNumber:105,
 branch:'fix/ultra-sentinel-polite-voice-20261106',expectedHeadSha:HEAD,
 expectedMainSha:BASE,expectedTreeSha:TREE,
 operation:'COMMIT_TO_EXISTING_DRAFT_PR_BRANCH'};
test('accepts only the pinned draft #105 branch, commit and tree',()=>{
 assert.deepEqual(validateTrialPlan(PLAN),PLAN);
 for(const changes of [{prNumber:104},{branch:'main'},
  {expectedHeadSha:BASE},{expectedMainSha:HEAD},
  {expectedTreeSha:'f'.repeat(40)},{operation:'MERGE_TO_MAIN'}]){
   assert.throws(()=>validateTrialPlan({...PLAN,...changes}),/OWNER_POLITE_/);
 }
});
test('rejects invented or tampered Kotlin candidates before creating a host oracle',()=>{
 const f={path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/OfflineVoiceQuestionGate.kt',
  before:'package fake\n',after:'package fake2\n',beforeBlobSha:'a'.repeat(40),
  afterBlobSha:'b'.repeat(40)};
 assert.throws(()=>validateTrialFiles([f,f]),/OWNER_POLITE_/);
 assert.throws(()=>createTrustedPoliteJVMVerifier({plan:PLAN,files:[f,f]}),/OWNER_POLITE_/);
});
test('owner request requires a signed exact schema and denies extra keys',()=>{
 assert.throws(()=>validateOwnerRequest({plan:PLAN,files:[]}),/OWNER_POLITE_/);
 assert.throws(()=>validateOwnerRequest({plan:PLAN,files:[],ownerGrant:{},ownerSignature:'abc'}),/OWNER_POLITE_/);
 assert.throws(()=>validateOwnerRequest({plan:PLAN,files:[],ownerGrant:{},
  ownerSignature:'abc',userToken:'LEAK'}),/OWNER_POLITE_/);
});
test('operational host gate refuses GitHub Actions, Windows and missing isolation',()=>{
 assert.throws(()=>checkHostGate({GITHUB_ACTIONS:'true'},'linux'),/OWNER_POLITE_/);
 assert.throws(()=>checkHostGate({JARVIS_KOTLIN_HOME:'/trusted/kotlinc'},'win32'),/OWNER_POLITE_/);
 assert.throws(()=>checkHostGate({},'linux'),/OWNER_POLITE_/);
 assert.throws(()=>checkHostGate({JARVIS_KOTLIN_HOME:'relative/path'},'linux'),/OWNER_POLITE_/);
});
test('CLI fails closed without owner signature, token or trusted host and never claims remote success',()=>{
 const child=spawnSync(process.execPath,[CLI],{encoding:'utf8',timeout:7000,
  env:{PATH:process.env.PATH||'/usr/bin:/bin',GITHUB_ACTIONS:'true',
   ULTRA_SENTINEL_REMOTE_REPAIR_APPLY:'true'}});
 assert.equal(child.status,1);
 assert.match(child.stderr,/OWNER_POLITE_OPERATOR_BLOCKED/);
 assert.doesNotMatch(child.stdout,/OWNER_APPROVED_PR_BRANCH_COMMIT_CREATED/);
});
test('dedicated Linux original JVM runner is syntax-valid and forbids signing or remote network access',()=>{
 const bash=path.resolve(__dirname,'../../scripts/owner-jarvis-polite-original-jvm.sh');
 const parsed=spawnSync('bash',['-n',bash],{encoding:'utf8',timeout:5000});
 assert.equal(parsed.status,0,parsed.stderr);
 const fs=require('node:fs');
 const source=fs.readFileSync(bash,'utf8');
 assert.match(source,/--unshare-all/);
 assert.match(source,/--clearenv/);
 assert.match(source,/--die-with-parent/);
 assert.match(source,/POLITE_ADVERSARIAL_CONTROLS_PASS/);
 assert.doesNotMatch(source,/gh\s+(api|pr)|git\s+push|curl\s+|wget\s+/);
});

test('nonce ledger rejects dangling symlink instead of following an unsafe target',()=>{
 const fs=require('node:fs');
 const dir=fs.mkdtempSync(path.join(process.cwd(),'tests','.owner-nonce-'));
 try{
  const ledger=path.join(dir,'ledger');
  fs.symlinkSync(path.join(dir,'absent-target'),ledger);
  const {validateLedgerPath}=require('../../scripts/run-owner-jarvis-polite-repair.cjs');
  assert.throws(()=>validateLedgerPath(ledger),/OWNER_POLITE_OPERATOR_BLOCKED/);
  assert.equal(validateLedgerPath(path.join(dir,'fresh-ledger')),path.join(dir,'fresh-ledger'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
