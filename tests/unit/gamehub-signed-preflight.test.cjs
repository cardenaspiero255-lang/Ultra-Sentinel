'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {signedGameHubPreflight,digestContext,canonicalApproval,canonicalAudit}=
 require('../../packages/recovery/gamehub-signed-preflight.cjs');
const sha='a'.repeat(40),repo='cardenaspiero255-lang/gamehub-ultra';
const files=['app/src/main/java/voice/Ultra.kt'];
const ctx=()=>({repository:repo,headRepo:repo,number:132,headSha:sha,draft:false,
 changedFiles:1,files:[...files],requiredChecks:['Android build'],checkInventoryComplete:true,
 checks:[{name:'Android build',sha,status:'completed',conclusion:'success'}]});
const domainOwner='Ultra-Sentinel:gamehub-owner-consent:v1\n';
const domainAudit='Ultra-Sentinel:gamehub-audit-evidence:v1\n';
function fixture(){
 const now=Date.now(),root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-consent-'));
 const owner=crypto.generateKeyPairSync('ed25519');
 const auditor=crypto.generateKeyPairSync('ed25519');
 const context=ctx(),contextDigest=digestContext(context);
 const ownerApproval={schema:'gamehub-owner-consent/v1',repository:repo,prNumber:132,headSha:sha,
  actorLogin:'cardenaspiero255-lang',actorId:322222186,scope:'repair:commit-to-pr-branch',
  nonce:'nonce_for_testing_owner_12345',issuedAt:now-1000,expiresAt:now+60000,contextDigest};
 const auditReceipt={schema:'gamehub-security-audit/v1',repository:repo,prNumber:132,
  headSha:sha,contextDigest,verdict:'CLEAR',auditor:'trusted_main_security_gate',issuedAt:now-1000};
 const sign=(key,domain,payload)=>crypto.sign(null,Buffer.from(domain+payload),key).toString('base64');
 const options={token:'a-test-token-for-unit-only',ownerApproval,auditReceipt,
  ownerPublicKey:owner.publicKey,auditPublicKey:auditor.publicKey,
  ownerSignature:sign(owner.privateKey,domainOwner,canonicalApproval(ownerApproval)),
  auditSignature:sign(auditor.privateKey,domainAudit,canonicalAudit(auditReceipt)),
  nonceStorePath:path.join(root,'ledger'),
  fetchImpl:async()=>({status:200,json:async()=>({login:'cardenaspiero255-lang',id:322222186})})};
 return {context,options,root};
}
test('real cryptographic owner + audit proof connect to existing #37 preflight without remote writes',async()=>{
 const f=fixture();
 try{
  const result=await signedGameHubPreflight(f.context,f.options);
  assert.equal(result.status,'ELIGIBLE_FOR_HUMAN_COMMIT');
  assert.equal(result.autoCommitAllowed,false);
  assert.equal(result.autoMergeAllowed,false);
  assert.equal(result.manualCommitRequired,true);
  assert.equal((await signedGameHubPreflight(f.context,f.options)).status,'BLOCKED');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('owner signature, audit signature, and independent public key are all mandatory',async()=>{
 const f=fixture();
 try{
  for(const changed of [
   {ownerSignature:'invalid'}, {auditSignature:'invalid'},
   {auditPublicKey:f.options.ownerPublicKey},{ownerApproval:{...f.options.ownerApproval,nonce:'changed_nonce_1234567891234'}},
   {auditReceipt:{...f.options.auditReceipt,verdict:'PENDING'}},
   {fetchImpl:async()=>({status:200,json:async()=>({login:'intruder',id:322222186})})}
  ]){
   const result=await signedGameHubPreflight(f.context,{...f.options,...changed});
   assert.equal(result.status,'BLOCKED',JSON.stringify(Object.keys(changed)));
  }
  assert.equal(fs.existsSync(f.options.nonceStorePath),false);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('owner authorization cannot be reused for another PR, SHA, path or required check',async()=>{
 const f=fixture();
 try{
  for(const changed of [
   {number:133},{headSha:'b'.repeat(40)},
   {files:['app/src/main/java/voice/Other.kt']},
   {requiredChecks:['Security scan'],checks:[{name:'Security scan',sha,status:'completed',conclusion:'success'}]}
  ]){
   const context={...f.context,...changed};
   const result=await signedGameHubPreflight(context,f.options);
   assert.equal(result.status,'BLOCKED',Object.keys(changed).join(','));
  }
  assert.equal(fs.existsSync(f.options.nonceStorePath),false);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('stale and rejected CI never consume one-time owner authorization',async()=>{
 const f=fixture();
 try{
  const bad={...f.context,checks:[{name:'Android build',sha,status:'completed',conclusion:'failure'}]};
  assert.equal((await signedGameHubPreflight(bad,f.options)).status,'BLOCKED');
  assert.equal(fs.existsSync(f.options.nonceStorePath),false);
  const ok=await signedGameHubPreflight(f.context,f.options);
  assert.equal(ok.status,'ELIGIBLE_FOR_HUMAN_COMMIT');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
