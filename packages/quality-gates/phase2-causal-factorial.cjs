'use strict';
/** A bounded, side-effect-free counterfactual matrix adjudicator. No caller
 * can assert that a transcript came from Kotlin, GitHub or an independent oracle.
 * This is a hypothesis filter; it never grants write, release or merge rights. */
const {types}=require('node:util');
const SHA=/^[a-f0-9]{40}$/;
const PATH=/^[A-Za-z0-9_.\/-]+\.kt$/;
const reject=()=>{throw Error('BAD_FACTORIAL_INPUT');};
function record(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value)||types.isProxy(value)||
    Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).length!==keys.length)reject();
 const out={};
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);
  if(!d||!Object.hasOwn(d,'value'))reject();out[key]=d.value;}
 return out;
}
function array(value,max,min=0){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||
   value.length<min||value.length>max||Reflect.ownKeys(value).length!==value.length+1)reject();
 return Array.from({length:value.length},(_,i)=>{
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))reject();return d.value;
 });
}
function pathOk(p){return typeof p==='string'&&p.length<=350&&PATH.test(p)&&
 !p.startsWith('/')&&!p.split('/').some(x=>!x||x==='.'||x==='..');}
function blocked(){return Object.freeze({status:'BLOCKED_COUNTERFACTUAL_MATRIX',
  compilerProvenanceAuthenticated:false,independentOriginalOracleAuthenticated:false,
  causalityVerified:false,remoteWrites:false,mergeAllowed:false});}
function adjudicateFactorialCausalHypotheses(options){
 try{
  const raw=record(options,['expectedHeadSha','files','relations','observations']);
  if(typeof raw.expectedHeadSha!=='string'||!SHA.test(raw.expectedHeadSha))reject();
  const files=array(raw.files,12,2).map(x=>record(x,['path','blobSha']));
  const names=new Map();
  for(const f of files){if(!pathOk(f.path)||!SHA.test(f.blobSha)||names.has(f.path))reject();names.set(f.path,f.blobSha);}
  const relations=array(raw.relations,256).map(x=>record(x,['from','to','fromBlobSha','toBlobSha']));
  const pairs=new Set();
  for(const e of relations){const k=JSON.stringify([e.from,e.to]);
   if(!names.has(e.from)||!names.has(e.to)||e.from===e.to||
    e.fromBlobSha!==names.get(e.from)||e.toBlobSha!==names.get(e.to)||pairs.has(k))reject();
   pairs.add(k);
  }
  const count=2**files.length;
  const obs=array(raw.observations,count,count).map(v=>record(v,
   ['mask','sourceHeadSha','defectObserved','benignPassed']));
  const byMask=new Map();
  for(const v of obs){
   if(!Number.isSafeInteger(v.mask)||v.mask<0||v.mask>=count||byMask.has(v.mask)||
    v.sourceHeadSha!==raw.expectedHeadSha||typeof v.defectObserved!=='boolean'||
    typeof v.benignPassed!=='boolean')reject();
   byMask.set(v.mask,v);
  }
  if(byMask.size!==count||!byMask.get(0).defectObserved||!byMask.get(0).benignPassed||
    byMask.get(count-1).defectObserved||!byMask.get(count-1).benignPassed)reject();
  const passes=[...byMask.values()].filter(v=>!v.defectObserved&&v.benignPassed)
   .map(v=>v.mask).sort((a,b)=>{
    const bits=x=>x.toString(2).replace(/0/g,'').length;
    return bits(a)-bits(b)||a-b;
   });
  const minimal=[];
  for(const mask of passes){if(!minimal.some(m=>(mask&m)===m))minimal.push(mask);}
  if(!minimal.length)reject();
  const repairSets=minimal.map(mask=>Object.freeze(files.filter((_,i)=>mask&(1<<i)).map(f=>f.path)));
  const intersection=minimal.reduce((a,b)=>a&b,count-1);
  const necessary=files.filter((_,i)=>intersection&(1<<i)).map(f=>f.path);
  return Object.freeze({status:'INTERVENTION_HYPOTHESES_REQUIRING_TRUSTED_ORACLE',
   filesEvaluated:files.length,completeMatrixRows:count,claimedRelations:relations.length,
   minimalRepairSets:Object.freeze(repairSets),necessaryFiles:Object.freeze(necessary),
   graphClaimOnly:true,compilerProvenanceAuthenticated:false,
   independentOriginalOracleAuthenticated:false,causalityVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
   limitation:'An exhaustive caller-provided Boolean matrix cannot authenticate actual original-source JVM execution, Kotlin compiler edges, or cause-effect in production.'});
 }catch{return blocked();}
}
module.exports=Object.freeze({adjudicateFactorialCausalHypotheses});
