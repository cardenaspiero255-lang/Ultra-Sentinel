'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {runOwnerOidcAndEd25519SandboxRepair}=require('../../packages/recovery/owner-oidc-ed25519-bridge.cjs');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {fingerprint}=require('../../packages/family-hunter/ultra_sentinel_family_fingerprints.cjs');
const {digestPlan}=require('../../packages/recovery/owner-sandbox-flow.cjs');
const {stableAuthorization}=require('../../packages/recovery/owner-authorization.cjs');
const {AUDIENCE}=require('../../packages/recovery/github-oidc-approval.cjs');
const OWNER='cardenaspiero255-lang',REPO=OWNER+'/Ultra-Sentinel';
const GITHUB_SHA='a'.repeat(40),PATH='app/src/main/Example.kt';
const NOW=1785000000;
const rs=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const pub={...rs.publicKey.export({format:'jwk'}),kid:'github-issuer-rsa-fixture',alg:'RS256',use:'sig'};
const OIDC={sha:GITHUB_SHA,runId:'8833355',actorId:'322222186',
 repoId:'1418338512',audience:AUDIENCE,now:NOW};
function jwt(change={}){
 const payload={iss:'https://token.actions.githubusercontent.com',aud:AUDIENCE,
  sub:'repo:cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512:ref:refs/heads/main',
  repository:REPO,repository_id:'1418338512',actor:OWNER,
  actor_id:'322222186',ref:'refs/heads/main',sha:GITHUB_SHA,
  event_name:'workflow_dispatch',run_id:OIDC.runId,run_attempt:'1',
  workflow_ref:REPO+'/.github/workflows/gamehub-pr151-owner-e2e.yml@refs/heads/main',
  runner_environment:'github-hosted',iat:NOW-40,nbf:NOW-40,exp:NOW+80,jti:'nonce-oidc',
  ...change};
 const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const input=b({alg:'RS256',kid:pub.kid,typ:'JWT'})+'.'+b(payload);
 return input+'.'+crypto.sign('RSA-SHA256',Buffer.from(input),rs.privateKey).toString('base64url');
}
function git(cwd,...args){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}
function blob(content){
 const b=Buffer.from(content);return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-oidc-ed25519-'));
 const ledgerDir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-oidc-ledger-'));
 git(root,'init','-q','-b','main');
 git(root,'config','user.email','owner-test@example.invalid');
 git(root,'config','user.name','Owner fixture');
 fs.mkdirSync(path.dirname(path.join(root,PATH)),{recursive:true});
 const before='GlobalScope.launch { work() }\n',after='scope.launch { work() }\n';
 fs.writeFileSync(path.join(root,PATH),before);
 git(root,'add','.');git(root,'commit','-qm','frozen baseline');
 git(root,'switch','-q','-c','sandbox/oidc-owner');
 const sha=git(root,'rev-parse','HEAD');
 const a=analyze([{filename:PATH,status:'added',changes:1,additions:1,deletions:0,
  patch:'@@ -0,0 +1 @@\n+'+before,fullSource:before}],{sha});
 const finding=a.findings.find(x=>x.rule==='UNSCOPED_COROUTINE');
 assert.ok(finding);
 const changes=[{path:PATH,content:after}];
 const plan={status:'REVIEW_READY_NO_EXECUTOR',branch:'sandbox/oidc-owner',
  expectedHeadSha:sha,authorizationNonce:'dual-gate-once-unique-123456789',
  commitAllowed:false,mergeAllowed:false,patchBytes:256,
  changes:[{path:PATH,beforeBlobSha:blob(before),afterBlobSha:blob(after),patchBytes:70}],
  hunterFinding:{rule:finding.rule,path:finding.path,line:finding.line,familyId:fingerprint(finding)}};
 const authorization={ownerLogin:OWNER,repo:REPO,
  branch:plan.branch,headSha:sha,nonce:plan.authorizationNonce,
  expiresAt:Date.now()+60000,planDigest:digestPlan(plan,changes)};
 const keys=crypto.generateKeyPairSync('ed25519');
 const signature=crypto.sign(null,Buffer.from('Ultra-Sentinel:owner-authorization:v1\n'+stableAuthorization(authorization)),
  keys.privateKey).toString('base64');
 const request={token:'fake-owner-identity-token-123456789',
  expectedOwner:OWNER,expectedOwnerId:322222186,authorization,authorizationSignature:signature,
  trustedPublicKey:keys.publicKey,nonceStorePath:path.join(ledgerDir,'used'),
  directory:root,plan,changes,expectedHeadSha:sha,
  fetchImpl:async()=>({status:200,json:async()=>({login:OWNER,id:322222186})})};
 return {root,ledgerDir,sha,before,after,request,dispose(){
   fs.rmSync(root,{recursive:true,force:true});fs.rmSync(ledgerDir,{recursive:true,force:true});
 }};
}
function input(f,{token=jwt(),jwks={keys:[pub]},request=f.request}={}){
 return {oidcJwt:token,oidcContext:OIDC,
  fetchOidcJwks:async(url,opts)=>{
   assert.equal(url,'https://token.actions.githubusercontent.com/.well-known/jwks');
   assert.equal(opts.redirect,'error');
   return {ok:true,json:async()=>jwks};
  },
  ownerRequest:request};
}
test('dual gate succeeds only with BOTH GitHub issuer OIDC and real Ed25519 signed Hunter plan',async()=>{
 const f=fixture(),events=[];
 try{
  const out=await runOwnerOidcAndEd25519SandboxRepair({...input(f),ownerRequest:{...f.request,
   verifyRed:async()=>{events.push('RED');return true;},
   verifyRepair:async()=>{events.push('GREEN');return true;},
   judgeRepair:async()=>{events.push('JUDGE');return true;}
  }});
  assert.equal(out.status,'DUAL_AUTH_SANDBOX_REPAIR_VERIFIED');
  assert.deepEqual(events,['RED','GREEN','JUDGE']);
  assert.equal(out.githubOidcCryptographicProof,true);
  assert.equal(out.ownerEd25519GatePassed,true);
  assert.equal(out.productionReleaseCertified,false);
  assert.equal(out.remoteWrites,false);assert.equal(out.mergeAllowed,false);
  assert.equal(fs.readFileSync(path.join(f.root,PATH),'utf8'),f.after);
 }finally{f.dispose();}
});
test('OIDC alone can never authorize a change, even when a token is authentic',async()=>{
 const f=fixture();
 try{
  const vals={...f.request,authorizationSignature:undefined,
   verifyRed:async()=>true,verifyRepair:async()=>true,judgeRepair:async()=>true};
  await assert.rejects(runOwnerOidcAndEd25519SandboxRepair({...input(f),
   ownerRequest:vals}),/DUAL_GATE_POLICY_DENIED|OWNER_AUTHORIZATION_DENIED|OWNER_SIGNATURE_REQUIRED/);
  assert.equal(git(f.root,'rev-parse','HEAD'),f.sha);
  assert.equal(fs.existsSync(f.request.nonceStorePath),false);
 }finally{f.dispose();}
});
test('Ed25519 signed plan without valid OIDC cannot start, and leaves no nonce or journal',async()=>{
 const f=fixture();
 try{
  for(const token of [jwt({actor_id:'666'}),jwt({exp:NOW-100}),jwt({run_id:'33'})])
   await assert.rejects(runOwnerOidcAndEd25519SandboxRepair({...input(f,{token}),
    ownerRequest:{...f.request,verifyRed:async()=>true,verifyRepair:async()=>true,judgeRepair:async()=>true}}),
     /OIDC_APPROVAL_DENIED/);
  assert.equal(git(f.root,'rev-parse','HEAD'),f.sha);
  assert.equal(fs.existsSync(f.request.nonceStorePath),false);
 }finally{f.dispose();}
});
test('valid OIDC and Ed25519 with Judge veto must revert exactly to baseline tree',async()=>{
 const f=fixture();
 try{
  const r=await runOwnerOidcAndEd25519SandboxRepair({...input(f),ownerRequest:{...f.request,
   verifyRed:async()=>true,verifyRepair:async()=>true,judgeRepair:async()=>false}});
  assert.equal(r.status,'DUAL_AUTH_SANDBOX_ROLLBACK_VERIFIED');
  assert.equal(r.rollback.status,'ROLLBACK_VERIFIED');
  assert.equal(git(f.root,'rev-parse','HEAD^{tree}'),git(f.root,'rev-parse',f.sha+'^{tree}'));
  assert.equal(fs.readFileSync(path.join(f.root,PATH),'utf8'),f.before);
 }finally{f.dispose();}
});
test('no caller may disable strict Hunter/RED/GREEN/Judge gates through bridge parameters',async()=>{
 const f=fixture();
 try{
  const x={...f.request,requireHunterEvidence:false,requireRedGreenJudge:false,
   verifyRed:async()=>true,verifyRepair:async()=>true,judgeRepair:async()=>true};
  await assert.rejects(runOwnerOidcAndEd25519SandboxRepair({...input(f),ownerRequest:x}),
    /DUAL_GATE_POLICY_DENIED/);
  assert.equal(fs.existsSync(f.request.nonceStorePath),false);
 }finally{f.dispose();}
});
