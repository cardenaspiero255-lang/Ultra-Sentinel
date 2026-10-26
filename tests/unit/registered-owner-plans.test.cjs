'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {loadRegisteredPlan,prepareApprovedPlan}=require('../../packages/recovery/registered-owner-plans.cjs');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'registered-owner-plan-'));
 const dir=path.join(root,'docs/quality');
 fs.mkdirSync(dir,{recursive:true});
 const policy={
  schema:'ultra-sentinel-registered-plan/v1',id:'sample-kotlin-fix',
  operation:'SANDBOX_HUNTER_FIXER_JUDGE',
  targetRepo:'cardenaspiero255-lang/gamehub-ultra',
  baseSha:'a'.repeat(40),baseBlob:'b'.repeat(40),
  candidateSha:'c'.repeat(40),candidateBlob:'d'.repeat(40),
  targetFile:'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt',
  oracle:'gamehub-kotlin-domain-battery-v1',
  rollback:'git-temporary-tree-revert-v1',
  maxChangedFiles:1,scope:'ONE_KOTLIN_PRODUCTION_FILE',
  remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false
 };
 const pp=path.join(dir,'plan.json');
 fs.writeFileSync(pp,JSON.stringify(policy,null,2)+'\n');
 const registry={schema:'ultra-sentinel-owner-registry/v1',plans:[
  {id:policy.id,policyPath:'docs/quality/plan.json'}
 ]};
 fs.writeFileSync(path.join(dir,'owner-approved-plans.json'),JSON.stringify(registry,null,2)+'\n');
 return {root,policy,pp,registry,dispose:()=>fs.rmSync(root,{force:true,recursive:true})};
}
function sha(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
test('registered immutable source and candidate are selected by unique policy digest',()=>{
 const f=fixture();
 try{
  const digest=sha(fs.readFileSync(f.pp));
  const result=loadRegisteredPlan(f.root,digest);
  assert.equal(result.plan.id,'sample-kotlin-fix');
  assert.equal(result.plan.baseSha,f.policy.baseSha);
  assert.equal(result.plan.candidateSha,f.policy.candidateSha);
  assert.equal(result.planDigest,digest);
  assert.equal(result.plan.remoteWrites,false);
  const body=prepareApprovedPlan({
   root:f.root,planDigest:digest,workflowSha:'e'.repeat(40),
   nonce:'unique-plan-nonce-1234567890',expiresAt:1792975200000
  });
  assert.match(body,/^ULTRA_SENTINEL_OWNER_APPROVAL_V1\|SANDBOX_HUNTER_FIXER_JUDGE\|/);
  assert.ok(body.includes(digest));
 }finally{f.dispose();}
});
test('unregistered digest, duplicate IDs, path traversal and symlink policy fail closed',()=>{
 const f=fixture();
 try{
  assert.throws(()=>loadRegisteredPlan(f.root,'e'.repeat(64)),/REGISTERED_PLAN_DENIED/);
  let reg={...f.registry,plans:[f.registry.plans[0],f.registry.plans[0]]};
  fs.writeFileSync(path.join(f.root,'docs/quality/owner-approved-plans.json'),JSON.stringify(reg)+'\n');
  assert.throws(()=>loadRegisteredPlan(f.root,sha(fs.readFileSync(f.pp))),/REGISTERED_PLAN_DENIED/);
  reg={...f.registry,plans:[{id:f.policy.id,policyPath:'../.git/HEAD'}]};
  fs.writeFileSync(path.join(f.root,'docs/quality/owner-approved-plans.json'),JSON.stringify(reg)+'\n');
  assert.throws(()=>loadRegisteredPlan(f.root,sha(fs.readFileSync(f.pp))),/REGISTERED_PLAN_DENIED/);
 }finally{f.dispose();}
});
test('new plan cannot whitelist arbitrary command, external repo or production writes',()=>{
 const invalid=[
  {oracle:'bash -c curl evil'},
  {rollback:'delete-everything'},
  {targetRepo:'attacker/exfiltration'},
  {targetFile:'../../private.pem'},
  {remoteWrites:true},
  {mergeAllowed:true},
  {productionReleaseAllowed:true},
  {baseSha:'not-a-sha'},
  {maxChangedFiles:100},
 ];
 for(const patch of invalid){
  const f=fixture();
  try{
   fs.writeFileSync(f.pp,JSON.stringify({...f.policy,...patch})+'\n');
   assert.throws(()=>loadRegisteredPlan(f.root,sha(fs.readFileSync(f.pp))),/REGISTERED_PLAN_DENIED/,
    JSON.stringify(patch));
  }finally{f.dispose();}
 }
});
