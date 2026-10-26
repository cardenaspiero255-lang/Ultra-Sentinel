'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {fingerprint}=require('../../packages/family-hunter/ultra_sentinel_family_fingerprints.cjs');
const {runOwnerAuthorizedSandboxRepair,digestPlan}=require('../../packages/recovery/owner-sandbox-flow.cjs');
const {stableAuthorization}=require('../../packages/recovery/owner-authorization.cjs');
const SOURCE='app/src/main/Engine.kt',BEFORE='GlobalScope.launch { work() }\n',AFTER='scope.launch { work() }\n';
function git(dir,...args){return execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();}
function blob(s){let b=Buffer.from(s);return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');}
function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-e2e-hunter-'));
 git(directory,'init','-q','-b','main');
 git(directory,'config','user.name','Owner test');
 git(directory,'config','user.email','test@example.invalid');
 fs.mkdirSync(path.dirname(path.join(directory,SOURCE)),{recursive:true});
 fs.writeFileSync(path.join(directory,SOURCE),BEFORE);
 git(directory,'add','.');git(directory,'commit','-qm','existing vulnerable file');
 git(directory,'switch','-q','-c','sandbox/hunter');
 const head=git(directory,'rev-parse','HEAD');
 const analysis=analyze([{filename:SOURCE,status:'added',changes:1,additions:1,deletions:0,
  patch:'@@ -0,0 +1 @@\n+'+BEFORE,fullSource:BEFORE}],{sha:head});
 assert.ok(analysis.findings.length>0);
 const f=analysis.findings[0];
 const changes=[{path:SOURCE,content:AFTER}],nonce='hunter-e2e-nonce-1234567890';
 const plan={status:'REVIEW_READY_NO_EXECUTOR',branch:'sandbox/hunter',
  expectedHeadSha:head,authorizationNonce:nonce,patchBytes:256,
  changes:[{path:SOURCE,beforeBlobSha:blob(BEFORE),afterBlobSha:blob(AFTER),patchBytes:32}],
  hunterFinding:{rule:f.rule,path:f.path,line:f.line,familyId:fingerprint(f)},
  commitAllowed:false,mergeAllowed:false};
 const authorization={ownerLogin:'cardenaspiero255-lang',
  repo:'cardenaspiero255-lang/Ultra-Sentinel',branch:'sandbox/hunter',
  headSha:head,nonce,expiresAt:Date.now()+60000,planDigest:digestPlan(plan,changes)};
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
 const signature=crypto.sign(null,Buffer.from('Ultra-Sentinel:owner-authorization:v1\n'+stableAuthorization(authorization)),privateKey).toString('base64');
 const ledgerDir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-hunter-ledger-'));
 const input={directory,plan,changes,expectedHeadSha:head,authorization,
  authorizationSignature:signature,trustedPublicKey:publicKey,
  token:'fake-test-credential-123456',expectedOwner:'cardenaspiero255-lang',
  expectedOwnerId:12345,nonceStorePath:path.join(ledgerDir,'ledger'),
  fetchImpl:async()=>({status:200,json:async()=>({login:'cardenaspiero255-lang',id:12345})}),
  requireRedGreenJudge:true,requireHunterEvidence:true};
 return {input,ledgerDir,head,directory};
}
function clear(f){fs.rmSync(f.directory,{recursive:true,force:true});fs.rmSync(f.ledgerDir,{recursive:true,force:true});}
test('signed Hunter selection flows through RED, patch, GREEN and independent Judge',async()=>{
 const f=fixture(),events=[];
 try{
  const r=await runOwnerAuthorizedSandboxRepair({...f.input,
   verifyRed:async()=>{events.push('RED');return true;},
   verifyRepair:async()=>{events.push('GREEN');return true;},
   judgeRepair:async()=>{events.push('JUDGE');return true;}});
  assert.equal(r.status,'SANDBOX_REPAIR_VERIFIED');
  assert.deepEqual(events,['RED','GREEN','JUDGE']);
  assert.equal(r.redGreenJudgeVerified,true);
  assert.equal(fs.readFileSync(path.join(f.directory,SOURCE),'utf8'),AFTER);
  assert.equal(r.remoteWrites,false);assert.equal(r.mergeAllowed,false);
  assert.equal(git(f.directory,'remote'),'');
 }finally{clear(f);}
});
test('signed Hunter plan with real source has rollback on Judge veto',async()=>{
 const f=fixture();
 try{
  const r=await runOwnerAuthorizedSandboxRepair({...f.input,
   verifyRed:async()=>true,verifyRepair:async()=>true,judgeRepair:async()=>false});
  assert.equal(r.status,'SANDBOX_REPAIR_ROLLED_BACK');
  assert.equal(r.reason,'INDEPENDENT_JUDGE_VETO');
  assert.equal(r.rollback.status,'ROLLBACK_VERIFIED');
  assert.equal(git(f.directory,'rev-parse','HEAD^{tree}'),git(f.directory,'rev-parse',f.head+'^{tree}'));
  assert.equal(fs.readFileSync(path.join(f.directory,SOURCE),'utf8'),BEFORE);
 }finally{clear(f);}
});
test('signed but fabricated Hunter finding is blocked before nonce and writes',async()=>{
 const f=fixture();
 try{
  const plan={...f.input.plan,hunterFinding:{...f.input.plan.hunterFinding,line:987}};
  const authorization={...f.input.authorization,planDigest:digestPlan(plan,f.input.changes)};
  const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
  const signature=crypto.sign(null,Buffer.from('Ultra-Sentinel:owner-authorization:v1\n'+stableAuthorization(authorization)),privateKey).toString('base64');
  await assert.rejects(runOwnerAuthorizedSandboxRepair({...f.input,plan,authorization,
   authorizationSignature:signature,trustedPublicKey:publicKey,
   verifyRed:async()=>true,verifyRepair:async()=>true,judgeRepair:async()=>true}),/HUNTER_/);
  assert.equal(git(f.directory,'rev-parse','HEAD'),f.head);
  assert.equal(fs.existsSync(f.input.nonceStorePath+'.txn'),false);
 }finally{clear(f);}
});
