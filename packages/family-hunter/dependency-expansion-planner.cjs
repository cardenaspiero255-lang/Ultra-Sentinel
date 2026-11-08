'use strict';
// Plans traversal of caller-supplied directed relationships only. Hashes are
// references to evidence, not verification of its contents or provenance.
const validPath=p=>typeof p==='string'&&p.length>0&&p.length<=350&&
 /^[A-Za-z0-9_.\/-]+$/.test(p)&&!p.startsWith('/')&&
 p.split('/').every(x=>x!==''&&x!=='.'&&x!=='..');
function planDependencyExpansion({headSha,seeds,edges,maxFiles,maxDepth}={}){
 const fail=()=>{throw Error('INVALID_DEPENDENCY_EXPANSION');};
 if(typeof headSha!=='string'||!/^[a-f0-9]{40}$/.test(headSha)||
  !Number.isSafeInteger(maxFiles)||maxFiles<1||maxFiles>300||
  !Number.isSafeInteger(maxDepth)||maxDepth<0||maxDepth>4||
  !Array.isArray(seeds)||!seeds.length||seeds.length>maxFiles||
  seeds.some(p=>!validPath(p))||new Set(seeds).size!==seeds.length||
  !Array.isArray(edges)||edges.length>10000)fail();
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
