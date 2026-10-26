'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {runOwnerAuthorizedSandboxRepair,digestPlan}=require('../../packages/recovery/owner-sandbox-flow.cjs');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {fingerprint}=require('../../packages/family-hunter/ultra_sentinel_family_fingerprints.cjs');
const {formatGitHubSingleApproval}=require('../../packages/recovery/github-single-approval.cjs');
const REPO='cardenaspiero255-lang/Ultra-Sentinel',OWNER='cardenaspiero255-lang';
const PATH='app/src/main/Engine.kt',SHA='a'.repeat(40);
const RSA=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const JWK={...RSA.publicKey.export({format:'jwk'}),kid:'local-github-issuer-fixture',alg:'RS256',use:'sig'};
const A='urn:ultra-sentinel:one-owner-approval:sandbox';
const FLOW=REPO+'/.github/workflows/owner-single-approval.yml@refs/heads/main';
function git(dir,...args){return execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();}
function blob(x){const b=Buffer.from(x);return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');}
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-one-approval-'));
 const ledger=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-one-approval-ledger-'));
 const before='GlobalScope.launch { work() }\n',after='scope.launch { work() }\n';
 git(root,'init','-q','-b','main');git(root,'config','user.name','Fixture');
 git(root,'config','user.email','test@example.invalid');
 fs.mkdirSync(path.dirname(path.join(root,PATH)),{recursive:true});
 fs.writeFileSync(path.join(root,PATH),before);
 git(root,'add','.');git(root,'commit','-qm','source baseline');
 git(root,'switch','-q','-c','sandbox/hunter');
 const sha=git(root,'rev-parse','HEAD');
 const analysis=analyze([{filename:PATH,status:'added',changes:1,additions:1,
  deletions:0,patch:'@@ -0,0 +1 @@\n+'+before,fullSource:before}],{sha});
 const finding=analysis.findings.find(f=>f.rule==='UNSCOPED_COROUTINE');
 assert.ok(finding);
 const changes=[{path:PATH,content:after}],nonce='github-oneapproval-unique-abc123';
 const plan={status:'REVIEW_READY_NO_EXECUTOR',branch:'sandbox/hunter',
  expectedHeadSha:sha,authorizationNonce:nonce,patchBytes:256,
  commitAllowed:false,mergeAllowed:false,
  hunterFinding:{rule:finding.rule,path:finding.path,line:finding.line,familyId:fingerprint(finding)},
  changes:[{path:PATH,beforeBlobSha:blob(before),afterBlobSha:blob(after),patchBytes:64}]};
 const now=Date.now(),authorization={ownerLogin:OWNER,repo:REPO,branch:plan.branch,
  headSha:sha,nonce,expiresAt:now+120000,planDigest:digestPlan(plan,changes)};
 const approvedPlan={operation:'SANDBOX_HUNTER_FIXER_JUDGE',workflowSha:SHA,
  planDigest:authorization.planDigest,nonce,expiresAt:authorization.expiresAt};
 const ctx={sha:SHA,runId:'654321',actorId:'322222186',repoId:'1418338512',
  audience:A,now:Math.floor(now/1000),eventName:'issue_comment',
  approvedOwnerIssueComment:true,purpose:'ONE_APPROVAL'};
 const claim={iss:'https://token.actions.githubusercontent.com',aud:A,
  sub:'repo:cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512:ref:refs/heads/main',
  repository:REPO,repository_id:'1418338512',actor:OWNER,actor_id:'322222186',
  ref:'refs/heads/main',sha:SHA,event_name:'issue_comment',
  run_id:ctx.runId,run_attempt:'1',workflow_ref:FLOW,
  runner_environment:'github-hosted',iat:Math.floor(now/1000)-20,
  nbf:Math.floor(now/1000)-20,exp:Math.floor(now/1000)+100,jti:'unique-fixture-jti'};
 const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const payload=b({alg:'RS256',typ:'JWT',kid:JWK.kid})+'.'+b(claim);
 const jwt=payload+'.'+crypto.sign('RSA-SHA256',Buffer.from(payload),RSA.privateKey).toString('base64url');
 const stamp=new Date(now-15000).toISOString();
 const event={action:'created',repository:{id:1418338512,full_name:REPO},
  sender:{id:322222186,login:OWNER},issue:{number:50,pull_request:null},
  comment:{id:11111111,body:formatGitHubSingleApproval(approvedPlan),
   user:{id:322222186,login:OWNER},created_at:stamp,updated_at:stamp}};
 const opts={token:undefined,expectedOwner:OWNER,expectedOwnerId:322222186,
  authorization,authorizationSignature:undefined,trustedPublicKey:undefined,
  directory:root,nonceStorePath:path.join(ledger,'ledger'),plan,changes,
  expectedHeadSha:sha,now,requireHunterEvidence:true,requireRedGreenJudge:true,
  githubSingleApproval:{oidcJwt:jwt,oidcContext:ctx,event,approvedPlan},
  fetchGithubJwks:async(url,init)=>{
   assert.equal(url,'https://token.actions.githubusercontent.com/.well-known/jwks');
   assert.equal(init.redirect,'error');return {ok:true,json:async()=>({keys:[JWK]})};
  },
  verifyRed:async()=>true,verifyRepair:async()=>true,judgeRepair:async()=>true};
 return {root,ledger,sha,before,after,opts,dispose(){
  fs.rmSync(root,{recursive:true,force:true});fs.rmSync(ledger,{recursive:true,force:true});
 }};
}
test('one GitHub approval authorizes the unchanged strict Hunter RED GREEN Judge path, no Ed signature',async()=>{
 const f=fixture();try{
  const result=await runOwnerAuthorizedSandboxRepair(f.opts);
  assert.equal(result.status,'SANDBOX_REPAIR_VERIFIED');
  assert.equal(result.redGreenJudgeVerified,true);
  assert.equal(fs.readFileSync(path.join(f.root,PATH),'utf8'),f.after);
  assert.equal(git(f.root,'remote'),'');
  assert.equal(result.remoteWrites,false);
 }finally{f.dispose();}
});
test('same single GitHub approval, Judge veto triggers exact rollback',async()=>{
 const f=fixture();try{
  const r=await runOwnerAuthorizedSandboxRepair({...f.opts,judgeRepair:async()=>false});
  assert.equal(r.status,'SANDBOX_REPAIR_ROLLED_BACK');
  assert.equal(r.rollback.status,'ROLLBACK_VERIFIED');
  assert.equal(git(f.root,'rev-parse','HEAD^{tree}'),git(f.root,'rev-parse',f.sha+'^{tree}'));
  assert.equal(fs.readFileSync(path.join(f.root,PATH),'utf8'),f.before);
 }finally{f.dispose();}
});
test('ChatGPT text alone or fake GitHub comment is not a valid single approval',async()=>{
 const f=fixture();try{
  for(const input of [
   {...f.opts,githubSingleApproval:undefined},
   {...f.opts,githubSingleApproval:{...f.opts.githubSingleApproval,
    event:{...f.opts.githubSingleApproval.event,sender:{id:1,login:'attacker'}}}},
   {...f.opts,authorization:{...f.opts.authorization,nonce:'modified-repair-nonce-0123456789'}},
   {...f.opts,githubSingleApproval:{...f.opts.githubSingleApproval,
    approvedPlan:{...f.opts.githubSingleApproval.approvedPlan,planDigest:'0'.repeat(64)}}},
  ])await assert.rejects(runOwnerAuthorizedSandboxRepair(input),/AUTHENTICATION_UNAVAILABLE|SINGLE_APPROVAL_|SINGLE_OWNER_APPROVAL_|AUTHORIZATION_SCOPE_MISMATCH/);
  assert.equal(git(f.root,'rev-parse','HEAD'),f.sha);
  assert.equal(fs.existsSync(f.opts.nonceStorePath),false);
 }finally{f.dispose();}
});
