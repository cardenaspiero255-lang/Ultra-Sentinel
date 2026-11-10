'use strict';
// Constrained verifier for a sealed advisory; no claim of a blind new family.
// Enclosing runner authenticates Git/checkout; this module does not.
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),{types}=require('node:util');
const PIN='e4ca122422f1cb591d407db3fb21fb00fd78b022';
const REL='app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt';
const SOURCE='8b9e934ca90852d77ddab274b60fd8dce4f4a2ca';
const RULE='WIDE_NUMERIC_NARROWED_BEFORE_CLAMP';
const SHA=/^[a-f0-9]{40}$/;
const {snapshotRecord}=require('../../../packages/investigation/plain-kotlin-payload.cjs');
function output(status){return Object.freeze({status,sourceRepositoryAuthenticated:false,
 originalOracleVerified:false,causalityVerified:false,newFamilyDiscovered:false,remoteWrites:false,mergeAllowed:false});}
function validate(input){
 try{
  const v=snapshotRecord(input,['expectedHeadSha','originalBlobSha','report']);
  if(v.expectedHeadSha!==PIN||v.originalBlobSha!==SOURCE)return output('BLOCKED_PINNED_NUMERIC_IDENTITY');
  const r=snapshotRecord(v.report,['schema','status','findings','filesScanned','skippedOversized','sourceByteIntegrityVerified',
   'compilerAuthenticated','sourceRepositoryAuthenticated','originalOracleVerified','repairAuthorized','remoteWrites','mergeAllowed']);
  if(r.schema!=='ultra-sentinel-blind-numeric/v1'||
   !['NUMERIC_BLIND_HYPOTHESES_UNVERIFIED','NUMERIC_BLIND_PARTIAL_INVENTORY_UNVERIFIED'].includes(r.status)||
   r.sourceByteIntegrityVerified!==true||r.compilerAuthenticated!==false||
   r.sourceRepositoryAuthenticated!==false||r.originalOracleVerified!==false||r.repairAuthorized!==false||
   r.remoteWrites!==false||r.mergeAllowed!==false||
   !Number.isSafeInteger(r.filesScanned)||r.filesScanned<1||r.filesScanned>4096||
   !Number.isSafeInteger(r.skippedOversized)||r.skippedOversized<0||r.skippedOversized>4096)return output('BLOCKED_NUMERIC_DISCOVERY_CONTRACT');
  const a=r.findings;
  if(!Array.isArray(a)||types.isProxy(a)||Object.getPrototypeOf(a)!==Array.prototype||
     a.length<1||a.length>256||Reflect.ownKeys(a).length!==a.length+1)
     return output('BLOCKED_NUMERIC_FINDING_ARRAY');
  const keys=new Set();let targetCount=0;
  for(let i=0;i<a.length;i++){
   const d=Object.getOwnPropertyDescriptor(a,String(i));
   if(!d||!Object.hasOwn(d,'value'))return output('BLOCKED_NUMERIC_FINDING_ELEMENT');
   const f=snapshotRecord(d.value,['path','line','rule','expectedBlobSha']);
   if(typeof f.path!=='string'||f.path.length>350||!/^[A-Za-z0-9_.\/-]+\.kt$/.test(f.path)||
      f.path.startsWith('/')||f.path.split('/').some(x=>!x||x==='.'||x==='..')||
      !Number.isSafeInteger(f.line)||f.line<1||f.line>4000||
      ![RULE,'INT_MULTIPLICATION_BEFORE_WIDENING'].includes(f.rule)||
      typeof f.expectedBlobSha!=='string'||!SHA.test(f.expectedBlobSha))return output('BLOCKED_NUMERIC_FINDING_SHAPE');
   const key=f.path+':'+f.line+':'+f.rule;
   if(keys.has(key))return output('BLOCKED_DUPLICATE_NUMERIC_FINDING');
   keys.add(key);
   if(f.path===REL&&f.rule===RULE){
    if(f.expectedBlobSha!==SOURCE)return output('BLOCKED_NUMERIC_TARGET_BLOB');
    targetCount++;
   }
  }
  if(targetCount!==1)return output('BLOCKED_EXPECTED_ORIGINAL_NUMERIC_HYPOTHESIS');
  return output('SEALED_NUMERIC_FINDING_REQUIRES_INDEPENDENT_ORACLE');
 }catch{return output('BLOCKED_NUMERIC_DISCOVERY_INPUT');}
}
if(require.main===module){
 const [root,reportPath,head]=process.argv.slice(2);
 if(process.argv.length!==5||head!==PIN)throw Error('BAD_PINNED_RECEIPT_ARGS');
 const src=path.join(root,REL);
 function readFile(p,max){const st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||st.size>max)throw Error('UNSAFE_RECEIPT_FILE');return fs.readFileSync(p);}
 const bytes=readFile(src,60000);
 const originalBlobSha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const report=JSON.parse(readFile(reportPath,150000).toString('utf8'));
 const result=validate({expectedHeadSha:head,originalBlobSha,report});
 if(result.status!=='SEALED_NUMERIC_FINDING_REQUIRES_INDEPENDENT_ORACLE')throw Error('BAD_SEALED_NUMERIC_REPORT:'+result.status);
 console.log('BLIND_NUMERIC_SOURCE_SELECTION_NOT_NEW_FAMILY');
}
module.exports=Object.freeze({validate});
