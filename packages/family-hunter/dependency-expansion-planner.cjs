'use strict';
// Plans traversal of caller-supplied directed relationships only. Hashes are
// references to evidence, not verification of its contents or provenance.
const {types}=require('node:util');
const validPath=p=>typeof p==='string'&&p.length>0&&p.length<=350&&
 /^[A-Za-z0-9_.\/-]+$/.test(p)&&!p.startsWith('/')&&
 p.split('/').every(x=>x!==''&&x!=='.'&&x!=='..');
const fail=()=>{throw Error('INVALID_DEPENDENCY_EXPANSION');};
function record(value,fields){
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||
  Object.getPrototypeOf(value)!==Object.prototype)fail();
 const result={};
 for(const field of fields){
  const d=Object.getOwnPropertyDescriptor(value,field);
  if(!d||!Object.hasOwn(d,'value'))fail();
  result[field]=d.value;
 }
 return result;
}
function array(value,max){
 if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||
  value.length>max||Reflect.ownKeys(value).length!==value.length+1)fail();
 const result=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))fail();
  result.push(d.value);
 }
 return result;
}
function planDependencyExpansion(options){
 const input=record(options,['headSha','seeds','edges','maxFiles','maxDepth']);
 const {headSha,maxFiles,maxDepth}=input;
 const seeds=array(input.seeds,300),edges=array(input.edges,10000)
  .map(e=>record(e,['from','to','evidenceSha256']));
 if(typeof headSha!=='string'||!/^[a-f0-9]{40}$/.test(headSha)||
  !Number.isSafeInteger(maxFiles)||maxFiles<1||maxFiles>300||
  !Number.isSafeInteger(maxDepth)||maxDepth<0||
  !seeds.length||seeds.length>maxFiles||
  seeds.some(p=>!validPath(p))||new Set(seeds).size!==seeds.length||
  edges.length>10000)fail();
 const graph=new Map(),unique=new Set();
 for(const e of edges){
  if(!e||typeof e!=='object'||!validPath(e.from)||!validPath(e.to)||
   typeof e.evidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(e.evidenceSha256))fail();
  const key=JSON.stringify([e.from,e.to]); if(unique.has(key))fail(); unique.add(key);
  if(!graph.has(e.from))graph.set(e.from,[]); graph.get(e.from).push(e);
 }
 for(const values of graph.values())values.sort((a,b)=>a.to<b.to?-1:a.to>b.to?1:0);
 const files=[...seeds].sort().map(path=>({path,depth:0,via:null,evidenceSha256:null}));
 const seen=new Set(seeds); let budget=false,depth=false,edgesConsidered=0;
 for(let i=0;i<files.length;i++){
  const f=files[i];
  for(const e of graph.get(f.path)||[]){
   edgesConsidered++; if(seen.has(e.to))continue;
   if(f.depth>=maxDepth){depth=true;continue;}
   if(files.length>=maxFiles){budget=true;continue;}
   seen.add(e.to);files.push({path:e.to,depth:f.depth+1,via:f.path,evidenceSha256:e.evidenceSha256});
  }
 }
 return {status:budget?'INCOMPLETE_BUDGET':depth?'INCOMPLETE_DEPTH':'COMPLETE_WITHIN_SUPPLIED_GRAPH',
  headSha,files,edgesConsidered,suppliedEdges:edges.length,
  sourceAuthenticated:false,semanticAnalysisPerformed:false,causalityVerified:false,
  limitation:'Traversal covers only caller-supplied relationships; evidence hashes and source are not verified.'};
}
module.exports={planDependencyExpansion};
