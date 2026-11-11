'use strict';
/**
 * Interpret an exact 2^n factorial matrix from disposable Git experiments.
 * Oracle result fields are caller-provided observations. Never promote them
 * to authentic Kotlin JVM evidence or a claim that a root cause is proven.
 */
const SHA=/^[a-f0-9]{40}$/;
const PATH=/^(?:(?:app\/src\/main\/|supabase\/functions\/)[A-Za-z0-9_./-]+|apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/core\/[A-Za-z0-9_.-]+\.kt)$/;
const {types}=require('node:util');
const reject=()=>{throw Error('BAD_FACTORIAL_EVIDENCE');};
function record(value,required,optional=[]){
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||
  Object.getPrototypeOf(value)!==Object.prototype)reject();
 const allowed=new Set([...required,...optional]),keys=Reflect.ownKeys(value),copy={};
 if(keys.some(key=>typeof key!=='string'||!allowed.has(key)))reject();
 for(const key of required){
  const d=Object.getOwnPropertyDescriptor(value,key);
  if(!d||!Object.hasOwn(d,'value'))reject();copy[key]=d.value;
 }
 for(const key of optional){
  const d=Object.getOwnPropertyDescriptor(value,key);
  if(d){if(!Object.hasOwn(d,'value'))reject();copy[key]=d.value;}
 }
 return copy;
}
function array(value,min,max){
 if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||
  value.length<min||value.length>max||Reflect.ownKeys(value).length!==value.length+1)reject();
 const out=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))reject();out.push(d.value);
 }
 return out;
}
function outcome(status,minimalPassingSubsets=[]){
 return Object.freeze({
  schema:'ultra-sentinel-factorial-oracle-interpretation/v1',status,
  minimalPassingSubsets:Object.freeze(minimalPassingSubsets),
  causalityVerified:false,originalJVMOracleAuthenticated:false,
  sourceRepositoryAuthenticated:false,
  remoteWrites:false,commitAllowed:false,mergeAllowed:false,
  productionReleaseAllowed:false,
  limitation:'Boolean observations from an untrusted or caller-owned oracle are not authenticated original Kotlin execution. Requires pinned source, independent JVM oracles and adversarial controls before causal conclusions.'
 });
}
const blocked=()=>outcome('BLOCKED_INCOMPLETE_FACTORIAL_EVIDENCE');
function validFile(p){
 return typeof p==='string'&&p.length<=250&&PATH.test(p)&&
  !p.includes('//')&&!p.split('/').some(s=>s===''||s==='.'||s==='..');
}
function interpretFactorialOracleEvidence(input){
 try{
 const raw=record(input,['files','reproduction']);
 const files=array(raw.files,2,4);
 const reproduction=record(raw.reproduction,
  ['schema','status','baseSha','headSha','candidateRule','scenarios',
   'causalityVerified','sourceAuthenticated','independentOracleProvenanceVerified',
   'commitAllowed','mergeAllowed','productionReleaseAllowed'],
  ['ownerAuthorizationRequired','limitation']);
 if(files.some((p,i)=>!validFile(p)||(i>0&&files[i-1]>=p))||
    reproduction.schema!=='ultra-sentinel-local-cross-file-reproduction/v1'||
    reproduction.status!=='LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE'||
    typeof reproduction.baseSha!=='string'||!SHA.test(reproduction.baseSha)||
    typeof reproduction.headSha!=='string'||!SHA.test(reproduction.headSha)||
    reproduction.baseSha===reproduction.headSha||
    typeof reproduction.candidateRule!=='string'||
    !/^[A-Z][A-Z_0-9]{2,80}$/.test(reproduction.candidateRule)||
    reproduction.causalityVerified!==false||
    reproduction.sourceAuthenticated!==false||
    reproduction.independentOracleProvenanceVerified!==false||
    reproduction.commitAllowed!==false||
    reproduction.mergeAllowed!==false||
    reproduction.productionReleaseAllowed!==false||
    (Object.hasOwn(reproduction,'ownerAuthorizationRequired')&&reproduction.ownerAuthorizationRequired!==true)||
    (Object.hasOwn(reproduction,'limitation')&&
     (typeof reproduction.limitation!=='string'||reproduction.limitation.length>2000)))return blocked();
 const count=2**files.length,scenarios=array(reproduction.scenarios,count,count);
 const values=[];let baselineTree;
 for(let mask=0;mask<scenarios.length;mask++){
  const row=record(scenarios[mask],['selectedFiles','oracleVerdict','judgeStatus',
   'rollbackVerified','baselineTree','restoredTree','remoteWrites']);
  const selectedFiles=array(row.selectedFiles,0,files.length);
  const selected=files.filter((_,i)=>Boolean(mask&(1<<i)));
  if(selectedFiles.length!==selected.length||
     selectedFiles.some((s,i)=>s!==selected[i])||
     !['PASS','FAIL'].includes(row.oracleVerdict)||
     row.judgeStatus!==(mask===0?'BASELINE_NO_COMMIT':'APPROVED_LOCAL_POLICY_ONLY')||
     row.rollbackVerified!==true||row.remoteWrites!==false||
     typeof row.baselineTree!=='string'||!SHA.test(row.baselineTree)||
     row.baselineTree!==row.restoredTree||
     (mask!==0&&row.baselineTree!==baselineTree))return blocked();
  baselineTree=row.baselineTree;
  values.push(row.oracleVerdict==='PASS');
 }
 if(values[0]||!values[values.length-1])
  return outcome(values.some(Boolean)?'REGRESSION_OR_NONREPAIR_OBSERVED':'NO_PASSING_INTERVENTION');
 const minimal=[];
 for(let mask=1;mask<values.length;mask++){
  if(!values[mask])continue;
  // A passing subset is minimal iff no strict subset also passed.
  let isMinimal=true;
  for(let other=0;other<mask;other++){
   if((other&mask)===other&&values[other]){isMinimal=false;break;}
  }
  if(isMinimal)minimal.push(Object.freeze(files.filter((_,i)=>Boolean(mask&(1<<i)))));
 }
 const status=minimal.some(set=>set.length>1)?
  'JOINT_INTERACTION_HYPOTHESIS':'SINGLE_FILE_OR_ALTERNATIVE_EFFECT';
 return outcome(status,minimal);
 }catch{return blocked();}
}
module.exports={interpretFactorialOracleEvidence};
