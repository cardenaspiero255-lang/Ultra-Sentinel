'use strict';
/* The process sees only source Git inventory; no oracle, patch, or designated
 * defect path. Its output is advisory, never an authentication receipt. */
const {types}=require('node:util');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const {scanKotlinNumericRisks}=require('./phase2-numeric-risk-hunter.cjs');
const SHA=/^[0-9a-f]{40}$/;
function blocked(){return Object.freeze({status:'BLOCKED_BLIND_NUMERIC_INPUT',findings:Object.freeze([]),
 filesScanned:0,skippedOversized:0,compilerAuthenticated:false,sourceRepositoryAuthenticated:false,
 originalOracleVerified:false,repairAuthorized:false,remoteWrites:false,mergeAllowed:false});}
function safeArray(value){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||
 value.length<1||value.length>4096||Reflect.ownKeys(value).length!==value.length+1)throw Error('BAD_ARRAY');
 const result=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))throw Error('BAD_ELEMENT');
  result.push(snapshotRecord(d.value,['path','source','expectedBlobSha']));
 }
 return result;
}
function runBlindNumericInventory(options){
 try{
  const input=snapshotRecord(options,['expectedCommitSha','files','skippedOversized']);
  if(typeof input.expectedCommitSha!=='string'||!SHA.test(input.expectedCommitSha)||
   !Number.isSafeInteger(input.skippedOversized)||input.skippedOversized<0||input.skippedOversized>4096)
   return blocked();
  const files=safeArray(input.files),seen=new Set(),findings=[];
  for(const file of files){
   if(typeof file.path!=='string'||seen.has(file.path))return blocked();
   seen.add(file.path);
  }
  for(let offset=0;offset<files.length;offset+=64){
   const scan=scanKotlinNumericRisks({expectedCommitSha:input.expectedCommitSha,files:files.slice(offset,offset+64)});
   if(scan.sourceByteIntegrityVerified!==true||
      !['NUMERIC_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE','NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED'].includes(scan.status))
     return blocked();
   if(findings.length+scan.findings.length>256)return blocked();
   for(const finding of scan.findings){
    findings.push(Object.freeze({path:finding.path,line:finding.line,rule:finding.rule,expectedBlobSha:finding.expectedBlobSha}));
   }
  }
  findings.sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line||a.rule.localeCompare(b.rule));
  const status=input.skippedOversized>0?'NUMERIC_BLIND_PARTIAL_INVENTORY_UNVERIFIED':
   findings.length?'NUMERIC_BLIND_HYPOTHESES_UNVERIFIED':'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED';
  return Object.freeze({schema:'ultra-sentinel-blind-numeric/v1',status,findings:Object.freeze(findings),
   filesScanned:files.length,skippedOversized:input.skippedOversized,
   sourceByteIntegrityVerified:true,compilerAuthenticated:false,sourceRepositoryAuthenticated:false,
   originalOracleVerified:false,repairAuthorized:false,remoteWrites:false,mergeAllowed:false});
 }catch{return blocked();}
}
if(require.main===module){
 const fs=require('node:fs');
 const [inventory,output]=process.argv.slice(2);
 if(process.argv.length!==4)throw Error('BAD_WORKER_ARGUMENTS');
 const stat=fs.lstatSync(inventory);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>40*1024*1024)throw Error('BAD_INVENTORY_FILE');
 const result=runBlindNumericInventory(JSON.parse(fs.readFileSync(inventory,'utf8')));
 if(result.status.startsWith('BLOCKED_'))throw Error('BAD_BLIND_NUMERIC_INVENTORY');
 fs.writeFileSync(output,JSON.stringify(result),{flag:'wx',mode:0o600});
 console.log('blind_numeric_files_scanned='+result.filesScanned);
 console.log('blind_numeric_hypotheses='+result.findings.length);
}
module.exports=Object.freeze({runBlindNumericInventory});
