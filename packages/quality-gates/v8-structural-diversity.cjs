'use strict';
// Structural admission is not a verdict. No target invocation, expected values,
// oracle, repair or Hunter output is accepted by this module.
const {descriptor}=require('./jvm-abi-admission.cjs');
const SHA=/^[0-9a-f]{40}$/;
const REPO=/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const SOURCE=/^src\/main\/(?:[^/]+\/)*[^/]+\.kt$/;
const FORBIDDEN=/(?:oracle(?!Executed$)|expected|actual|observ|prediction(?!s$)|finding|sourceBody|functionalTruth|repair|verdict|groundTruth)/i;
const NUMERIC=new Set(['B','S','I','J','F','D',
 'Ljava/lang/Byte;','Ljava/lang/Short;','Ljava/lang/Integer;',
 'Ljava/lang/Long;','Ljava/lang/Float;','Ljava/lang/Double;']);
const frozen={minimumNumericMethods:3,minimumCandidateCohorts:2};
function fail(reason){throw Error('V8_STRUCTURAL_'+reason);}
function noFunctionalPayload(value){
 if(value&&typeof value==='object'){
  if(Array.isArray(value)){value.forEach(noFunctionalPayload);return;}
  for(const [key,content] of Object.entries(value)){
   if(FORBIDDEN.test(key))fail('FORBIDDEN_FUNCTIONAL_DATA');
   noFunctionalPayload(content);
  }
 }
}
function validateStructuralRecord(row){
 if(!row||typeof row!=='object'||Array.isArray(row))fail('INVALID_RECORD');
 noFunctionalPayload(row);
 if(!Number.isSafeInteger(row.rank)||row.rank<1||
   !row.source||typeof row.source!=='object'||!REPO.test(row.source.repository)||
   !SHA.test(row.source.commitSha)||!SHA.test(row.source.treeSha)||
   !Array.isArray(row.source.files)||row.source.files.length<1||row.source.files.length>12)
   fail('INVALID_SOURCE');
 let total=0,paths=new Set();
 for(const f of row.source.files){
  if(!f||!SOURCE.test(f.path)||f.path.split('/').some(x=>x==='.'||x==='..')||
   !SHA.test(f.blobSha)||!Number.isSafeInteger(f.sizeBytes)||f.sizeBytes<=0||
   paths.has(f.path))fail('INVALID_SOURCE');
  total+=f.sizeBytes;paths.add(f.path);
 }
 if(total>196608||row.source.totalBytes!=null&&row.source.totalBytes!==total)fail('INVALID_SOURCE');
 if(row.compilerReadOriginalSource!==true||row.targetInvoked!==false||
   row.oracleExecuted!==false||row.hunterExecuted!==false)fail('TARGET_EXECUTION_FORBIDDEN');
 const a=row.abi;
 if(!a||typeof a!=='object'||typeof a.compilationSucceeded!=='boolean'||
   !Array.isArray(a.callables)||a.callables.length>4096||!Array.isArray(a.abstentions)||
   a.abstentions.length>256)fail('INVALID_ABI');
 if(!a.compilationSucceeded&&a.callables.length)fail('UNCOMPILED_ABI');
 for(const m of a.callables){
  if(!m||typeof m.className!=='string'||m.className.length>500||
   typeof m.method!=='string'||m.method.length>300||
   typeof m.descriptor!=='string'||m.descriptor.length>4096||
   typeof m.reason!=='string'||m.targetInvoked!==false||
   m.finiteDomain!=='NOT_EVALUATED_BY_ABI')fail('TARGET_EXECUTION_FORBIDDEN');
  const d=descriptor(m.descriptor);
  if(m.reason==='ADMISSIBLE_ABI_CANDIDATE'&&
    (!NUMERIC.has(d.result)||d.params.length<1||d.params.length>3))fail('INVALID_ABI');
 }
 return row;
}
function selectStructuralCohorts(records,threshold=frozen){
 if(threshold.minimumNumericMethods!==3||threshold.minimumCandidateCohorts!==2||
  Object.keys(threshold).some(x=>!Object.hasOwn(frozen,x)))fail('FROZEN_THRESHOLD');
 if(!Array.isArray(records)||records.length<1||records.length>48)fail('INVALID_INPUT');
 let prev=0;const repos=new Set(),blobs=new Set();
 // Validate complete batch before taking any decision, including trailing rows.
 for(const row of records){
  validateStructuralRecord(row);
  if(row.rank<=prev)fail('RANK_ORDER');
  prev=row.rank;
  const key=row.source.repository.toLowerCase();
  if(repos.has(key))fail('DUPLICATE_REPOSITORY');
  repos.add(key);
  for(const f of row.source.files){
   if(blobs.has(f.blobSha))fail('DUPLICATE_BLOB');
   blobs.add(f.blobSha);
  }
 }
 const selected=[];let methods=0,cohorts=0;
 for(const row of records){
  const count=row.abi.callables.filter(m=>m.reason==='ADMISSIBLE_ABI_CANDIDATE').length;
  if(!count)continue;
  selected.push({rank:row.rank,source:row.source,abiCandidateMethods:count});
  methods+=count;cohorts++;
  if(methods>=3&&cohorts>=2)break;
 }
 const eligible=methods>=3&&cohorts>=2;
 return Object.freeze({
  schema:'ultra-sentinel-structural-abi-diversity/v1',
  eligible,reason:eligible?null:'INSUFFICIENT_INDEPENDENT_ABI_COHORTS',
  frozenThreshold:{...frozen},numericMethods:methods,candidateCohorts:cohorts,
  selected:eligible?selected:[],
  inspectedRanks:records.map(x=>x.rank),
  exposedOriginals:records.map(x=>({...x.source})),
  sourceBodiesUsedForFunctionalSelection:false,
  compilerReadOriginalSource:true,
  targetInvoked:false,oracleExecuted:false,hunterExecuted:false,
  precommitRequired:true,block26Closed:false,block27Allowed:false
 });
}
module.exports=Object.freeze({selectStructuralCohorts,validateStructuralRecord});
