'use strict';
/*
 * Trusted-main declarative registry for one owner-approved isolated repair.
 * A plan is a reviewed policy file; the GitHub comment supplies only its
 * SHA-256, never a path, executable, branch name or untrusted shell command.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {formatGitHubSingleApproval}=require('./github-single-approval.cjs');
const REGISTRY='docs/quality/owner-approved-plans.json';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
const SAFE_ID=/^[a-z][a-z0-9-]{4,79}$/;
const PROGRAMS=new Set(['gamehub-kotlin-domain-battery-v1','gamehub-kotlin-domain-battery-finite-v2','gamehub-pr151-real-kotlin-v1']);
const ROLLBACKS=new Set(['git-temporary-tree-revert-v1','gamehub-pr151-original-tree-v1']);
function deny(){throw Error('REGISTERED_PLAN_DENIED');}
function readPlain(root,relative){
 if(typeof relative!=='string'||!/^docs\/quality\/[a-z0-9._-]+\.json$/.test(relative))deny();
 const abs=path.join(root,relative),parent=path.dirname(abs);
 const pp=fs.lstatSync(parent),st=fs.lstatSync(abs);
 if(!pp.isDirectory()||pp.isSymbolicLink()||!st.isFile()||st.isSymbolicLink()||
  st.nlink!==1||st.size>16384||st.size<10)deny();
 return fs.readFileSync(abs,'utf8');
}
function digest(contents){return crypto.createHash('sha256').update(contents).digest('hex');}
function validatePlan(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==16||
  p.schema!=='ultra-sentinel-registered-plan/v1'||
  typeof p.id!=='string'||!SAFE_ID.test(p.id)||
  p.operation!=='SANDBOX_HUNTER_FIXER_JUDGE'||
  !['cardenaspiero255-lang/gamehub-ultra','cardenaspiero255-lang/JARVIS'].includes(p.targetRepo)||
  !SHA.test(p.baseSha||'')||!SHA.test(p.baseBlob||'')||
  !SHA.test(p.candidateSha||'')||!SHA.test(p.candidateBlob||'')||
  p.baseSha===p.candidateSha||p.baseBlob===p.candidateBlob||
  typeof p.targetFile!=='string'||p.targetFile.length>250||
  !/^(?:app\/src\/main\/java\/com\/cardenaspiero255\/gamehubultra\/|apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/)[A-Za-z0-9_./-]+\.kt$/.test(p.targetFile)||
  p.targetFile.includes('..')||p.targetFile.includes('//')||
  !PROGRAMS.has(p.oracle)||!ROLLBACKS.has(p.rollback)||
  p.maxChangedFiles!==1||p.scope!=='ONE_KOTLIN_PRODUCTION_FILE'||
  p.remoteWrites!==false||p.mergeAllowed!==false||
  p.productionReleaseAllowed!==false)deny();
 if(['gamehub-kotlin-domain-battery-v1','gamehub-kotlin-domain-battery-finite-v2'].includes(p.oracle)&&
    (p.targetRepo!=='cardenaspiero255-lang/gamehub-ultra'||
     !p.targetFile.endsWith('/domain/BatteryAwareGamingEngine.kt')||
     p.rollback!=='git-temporary-tree-revert-v1'))deny();
 if(p.oracle==='gamehub-kotlin-domain-battery-finite-v2'&&
    (p.id!=='gamehub-battery-finite-drain-e2e'||
     p.baseSha!=='458be1a1c7ec29d6c29f6d0944971f55a0ce8ac7'||
     p.candidateSha!=='b74791d9ea7e1e4b88f0ef1e286d87f036c6e7be'||
     p.baseBlob!=='976e3aa53ec94d14317e8caa1e6bf71088553650'||
     p.candidateBlob!=='28f163b0551479b925d702941c99235eded3a0d3'))deny();
 return Object.freeze({...p});
}
function loadRegisteredPlan(root,planDigest){
 try{
  if(typeof root!=='string'||!path.isAbsolute(root)||
   typeof planDigest!=='string'||!DIGEST.test(planDigest))deny();
  const registry=JSON.parse(readPlain(root,REGISTRY));
  if(registry.schema!=='ultra-sentinel-owner-registry/v1'||
   Object.keys(registry).sort().join(',')!=='plans,schema'||
   !Array.isArray(registry.plans)||registry.plans.length<1||
   registry.plans.length>25)deny();
  let found=null;const ids=new Set(),paths=new Set();
  for(const item of registry.plans){
   if(!item||typeof item!=='object'||Array.isArray(item)||
    Object.keys(item).sort().join(',')!=='id,policyPath'||
    typeof item.id!=='string'||!SAFE_ID.test(item.id)||
    ids.has(item.id)||paths.has(item.policyPath)||item.policyPath===REGISTRY)deny();
   ids.add(item.id);paths.add(item.policyPath);
   const content=readPlain(root,item.policyPath);
   const parsed=validatePlan(JSON.parse(content));
   if(parsed.id!==item.id)deny();
   const itemDigest=digest(content);
   if(itemDigest===planDigest){
    if(found)deny();
    found=Object.freeze({plan:parsed,planDigest:itemDigest,
     registryPolicyPath:item.policyPath});
   }
  }
  if(!found)deny();
  return found;
 }catch{deny();}
}
function prepareApprovedPlan({root,planDigest,workflowSha,nonce,expiresAt}={}){
 loadRegisteredPlan(root,planDigest);
 return formatGitHubSingleApproval({
  operation:'SANDBOX_HUNTER_FIXER_JUDGE',workflowSha,planDigest,nonce,expiresAt
 });
}
module.exports={loadRegisteredPlan,prepareApprovedPlan,REGISTRY};
