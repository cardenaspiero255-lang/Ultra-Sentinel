'use strict';
/**
 * Interpret independent-oracle vectors for a complete matrix of 2-12 files.
 * A combined AND can hide independent failures; preserve each oracle's own
 * observations and its minimal passing subsets, including nonmonotonic ones.
 * Caller-supplied verdicts are hypotheses, never authenticated JVM evidence.
 */
const {types}=require('node:util');
const PATH=/^(?:(?:app\/src\/main\/|supabase\/functions\/)[A-Za-z0-9_./-]+|apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/core\/[A-Za-z0-9_.-]+\.kt)$/;
const ID=/^[A-Z][A-Z0-9_]{2,40}$/;
const reject=()=>{throw Error('INVALID_ORACLE_MATRIX');};
function record(value,keys){
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||
  Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).length!==keys.length)reject();
 const copy={};
 for(const key of keys){
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value'))reject();
  copy[key]=descriptor.value;
 }
 return copy;
}
function array(value,min,max){
 if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||
  value.length<min||value.length>max||Reflect.ownKeys(value).length!==value.length+1)reject();
 const copy=[];
 for(let i=0;i<value.length;i++){
  const descriptor=Object.getOwnPropertyDescriptor(value,String(i));
  if(!descriptor||!Object.hasOwn(descriptor,'value'))reject();
  copy.push(descriptor.value);
 }
 return copy;
}
function result(status,oracleDependencies={},minimalPassingSubsetsByOracle={}){
 return Object.freeze({
  schema:'ultra-sentinel-original-oracle-vector-factorial/v1',
  status,oracleDependencies:Object.freeze(oracleDependencies),
  minimalPassingSubsetsByOracle:Object.freeze(minimalPassingSubsetsByOracle),
  causalityVerified:false,jvmReceiptsAuthenticatedByThisFunction:false,
  ownerAuthorizationVerified:false,commitAllowed:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'Caller-provided oracle verdicts and minimal passing subsets are hypotheses, not authenticated source provenance, JVM execution or proof of a production root cause.'
 });
}
function classifyOracleVectorFactorial(input){
 try{
  const raw=record(input,['files','oracleIds','scenarios']);
  const files=array(raw.files,2,12),oracleIds=array(raw.oracleIds,1,8);
  if(files.some((p,i)=>typeof p!=='string'||p.length>240||
    !PATH.test(p)||p.includes('//')||
    p.split('/').some(s=>s===''||s==='.'||s==='..')||
    (i>0&&p<=files[i-1]))||
   oracleIds.some((p,i)=>typeof p!=='string'||!ID.test(p)||(i>0&&p<=oracleIds[i-1])))reject();
  const count=2**files.length;
  const rows=array(raw.scenarios,count,count),values=[];
  for(let mask=0;mask<count;mask++){
   const row=record(rows[mask],['selectedFiles','verdicts']);
   const selected=array(row.selectedFiles,0,files.length);
   const expected=files.filter((_,i)=>Boolean(mask&(1<<i)));
   const verdicts=record(row.verdicts,oracleIds);
   if(selected.length!==expected.length||selected.some((p,i)=>p!==expected[i])||
    oracleIds.some(id=>verdicts[id]!=='PASS'&&verdicts[id]!=='FAIL'))reject();
   values.push(verdicts);
  }
  const dependencies={},minimalByOracle={};
  for(const id of oracleIds){
   const impacted=[];
   for(let i=0;i<files.length;i++){
    for(let mask=0;mask<count;mask++){
     if(!(mask&(1<<i))&&values[mask][id]!==values[mask|(1<<i)][id]){
      impacted.push(files[i]);break;
     }
    }
   }
   dependencies[id]=Object.freeze(impacted);
   // Subset closure determines whether any proper subset passed, without a
   // monotonicity assumption and without enumerating 3^n subset pairs.
   const passing=Uint8Array.from(values,v=>v[id]==='PASS'?1:0);
   const containsPassing=passing.slice();
   for(let i=0;i<files.length;i++)for(let mask=0;mask<count;mask++){
    if(mask&(1<<i))containsPassing[mask]|=containsPassing[mask^(1<<i)];
   }
   const minimal=[];
   for(let mask=0;mask<count;mask++){
    if(!passing[mask])continue;
    let properSubsetPassed=false;
    for(let i=0;i<files.length;i++)if((mask&(1<<i))&&containsPassing[mask^(1<<i)]){
     properSubsetPassed=true;break;
    }
    if(!properSubsetPassed)minimal.push(Object.freeze(files.filter((_,i)=>Boolean(mask&(1<<i)))));
   }
   minimalByOracle[id]=Object.freeze(minimal);
  }
  const sets=Object.values(dependencies);
  const unique=new Set(sets.filter(v=>v.length===1).map(v=>v[0]));
  // Marginal sensitivity to several files is NOT a joint repair. The
  // original GameHub three-source JVM matrix passes if EITHER of two
  // one-file repairs is applied; interpreting this as a multi-file cause
  // misstates the counterfactual. Use minimal passing subsets instead.
  const jointMinimal=oracleIds.some(id=>minimalByOracle[id].some(s=>s.length>1));
  const alternativeSingletons=oracleIds.some(id=>
   minimalByOracle[id].length>1&&minimalByOracle[id].every(s=>s.length===1));
  const status=sets.length>=2&&sets.every(v=>v.length===1)&&unique.size===sets.length?
   'INDEPENDENT_ORACLE_EFFECTS_OBSERVED':
   jointMinimal?'SHARED_OR_MULTI_FILE_EFFECT_HYPOTHESIS':
   alternativeSingletons?'ALTERNATIVE_SINGLE_FILE_EFFECTS_OBSERVED':
   'NONDIAGNOSTIC_ORACLE_MATRIX';
  return result(status,dependencies,minimalByOracle);
 }catch{return result('BLOCKED_UNTRUSTED_ORACLE_MATRIX');}
}
module.exports={classifyOracleVectorFactorial};
