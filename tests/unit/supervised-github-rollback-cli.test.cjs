'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {signRollbackRequest:trustedSigner}=
 require('../../scripts/sign-supervised-github-rollback.cjs');
function signRollbackRequest(...args){
 // Ephemeral test keys only: simulate the owner's non-CI workstation.
 const prior=process.env.GITHUB_ACTIONS;
 delete process.env.GITHUB_ACTIONS;
 try{return trustedSigner(...args);}
 finally{
  if(prior===undefined)delete process.env.GITHUB_ACTIONS;
  else process.env.GITHUB_ACTIONS=prior;
 }
}
const {operatorFile}=
 require('../../scripts/run-supervised-github-rollback.cjs');
const {digestRollbackPlan,stableOwnerRollbackGrant}=
 require('../../packages/recovery/supervised-github-branch-rollback.cjs');

function fixture(){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'us-rollback-cli-'));
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
 const keyFile=path.join(folder,'owner-private.pem');
 fs.writeFileSync(keyFile,privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600});
 const files=['Gate.kt','Policy.kt'].map((name,i)=>({
  path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/'+name,
  beforeBlobSha:(''+(i+1)).repeat(40),afterBlobSha:(''+(i+3)).repeat(40)
 }));
 const plan={repository:'cardenaspiero255-lang/JARVIS',prNumber:205,
  branch:'fix/ultra-sentinel-gguf-intent',operation:'ROLLBACK_EXISTING_DRAFT_PR_BRANCH',
  expectedMainSha:'b'.repeat(40),originalHeadSha:'a'.repeat(40),
  originalTreeSha:'c'.repeat(40),repairHeadSha:'d'.repeat(40),
  repairTreeSha:'e'.repeat(40),files};
 const ownerGrant={ownerLogin:'cardenaspiero255-lang',ownerId:322222186,
  repo:plan.repository,prNumber:plan.prNumber,branch:plan.branch,
  headSha:plan.repairHeadSha,baseSha:plan.expectedMainSha,
  planDigest:digestRollbackPlan(plan),nonce:'new-rollback-nonce-234567890123',
  expiresAt:Date.now()+600000,operation:plan.operation};
 return {folder,keyFile,privateKey,publicKey,plan,ownerGrant};
}
test('offline signer uses a unique rollback domain tied to the exact tree and candidate SHA',()=>{
 const f=fixture();
 try{
  const signature=signRollbackRequest({plan:f.plan,ownerGrant:f.ownerGrant},f.keyFile);
  const payload=Buffer.from('Ultra-Sentinel:github-pr-branch-rollback:v1\n'+
   stableOwnerRollbackGrant(f.ownerGrant));
  assert.equal(crypto.verify(null,payload,f.publicKey,Buffer.from(signature,'base64')),true);
  assert.equal(crypto.verify(null,Buffer.from('Ultra-Sentinel:github-pr-branch-commit:v1\n'+
   stableOwnerRollbackGrant(f.ownerGrant)),f.publicKey,Buffer.from(signature,'base64')),false);
 }finally{fs.rmSync(f.folder,{recursive:true,force:true});}
});
test('offline signer refuses forged plan, expired grant and publicly readable owner key',()=>{
 const f=fixture();
 try{
  const stale={...f.plan,repairTreeSha:'f'.repeat(40)};
  assert.throws(()=>signRollbackRequest({plan:stale,ownerGrant:f.ownerGrant},f.keyFile),
   /NOT_SIGNABLE/);
  assert.throws(()=>signRollbackRequest({plan:f.plan,ownerGrant:{
   ...f.ownerGrant,expiresAt:Date.now()-1
  }},f.keyFile),/NOT_SIGNABLE/);
  fs.chmodSync(f.keyFile,0o644);
  assert.throws(()=>signRollbackRequest({plan:f.plan,ownerGrant:f.ownerGrant},f.keyFile),
   /OWNER_KEY_UNSAFE/);
 }finally{fs.rmSync(f.folder,{recursive:true,force:true});}
});
test('trusted operator refuses symlinks, world writable request files and nonabsolute paths',()=>{
 const f=fixture();
 try{
  const config=path.join(f.folder,'request.json'),link=path.join(f.folder,'link');
  fs.writeFileSync(config,'{"safe":true}',{mode:0o600});
  assert.equal(operatorFile(config),'{"safe":true}');
  fs.symlinkSync(config,link);
  assert.throws(()=>operatorFile(link));
  fs.chmodSync(config,0o666);
  assert.throws(()=>operatorFile(config),/UNSAFE_FILE/);
  assert.throws(()=>operatorFile('request.json'),/ABSOLUTE/);
 }finally{fs.rmSync(f.folder,{recursive:true,force:true});}
});

test('offline signing is denied in GitHub Actions even with a syntactically valid key',()=>{
 const f=fixture(),prior=process.env.GITHUB_ACTIONS;
 try{
  process.env.GITHUB_ACTIONS='true';
  assert.throws(()=>trustedSigner({plan:f.plan,ownerGrant:f.ownerGrant},f.keyFile),
   /OWNER_SIGNING_NOT_ALLOWED_IN_CI/);
 }finally{
  if(prior===undefined)delete process.env.GITHUB_ACTIONS;
  else process.env.GITHUB_ACTIONS=prior;
  fs.rmSync(f.folder,{recursive:true,force:true});
 }
});
