'use strict';
// Verifies bytes against caller-declared Git blob IDs, not membership in a commit.
const crypto=require('node:crypto');
const {TextDecoder,types}=require('node:util');
const {planDependencyExpansion}=require('./dependency-expansion-planner.cjs');
const fail=()=>{throw Error('INVALID_SOURCE_IMPORT_GRAPH');};
const typedArrayProto=Object.getPrototypeOf(Uint8Array.prototype);
const bufferGetter=Object.getOwnPropertyDescriptor(typedArrayProto,'buffer').get;
const lengthGetter=Object.getOwnPropertyDescriptor(typedArrayProto,'length').get;
function copyContent(content){
 if(typeof content==='string'){
  if(Buffer.byteLength(content,'utf8')>262144)fail();
  return Buffer.from(content);
 }
 if(types.isProxy(content)||!Buffer.isBuffer(content)||!types.isUint8Array(content))fail();
 const backing=bufferGetter.call(content),length=lengthGetter.call(content);
 if(types.isSharedArrayBuffer(backing)||length>262144)fail();
 const copy=Buffer.allocUnsafe(length);
 Uint8Array.prototype.set.call(copy,content);
 return copy;
}
function dataFields(value,fields){
 if(!value||typeof value!=='object'||types.isProxy(value))fail();
 const out={};
 for(const field of fields){
  const descriptor=Object.getOwnPropertyDescriptor(value,field);
  if(!descriptor||!Object.hasOwn(descriptor,'value'))fail();
  out[field]=descriptor.value;
 }
 return out;
}
function dataArray(value,max){
 if(!Array.isArray(value)||types.isProxy(value)||value.length>max)fail();
 const result=[];
 for(let i=0;i<value.length;i++){
  const descriptor=Object.getOwnPropertyDescriptor(value,String(i));
  if(!descriptor||!Object.hasOwn(descriptor,'value'))fail();
  result.push(descriptor.value);
 }
 return result;
}
const pathOk=p=>typeof p==='string'&&p.length<=350&&/^[A-Za-z0-9_.\/-]+\.kt$/.test(p)&&!p.startsWith('/')&&p.split('/').every(x=>x&&x!=='.'&&x!=='..');
const id='[A-Za-z_][A-Za-z0-9_]*', qualified=`${id}(?:\\.${id})*`;
const pkgRe=new RegExp(`^\\s*package\\s+(${qualified})\\s*;?\\s*$`);
const importRe=new RegExp(`^\\s*import\\s+(${qualified}(?:\\.\\*)?)(?:\\s+as\\s+${id})?\\s*;?\\s*$`);
const declRe=new RegExp(`^\\s*(?:(?:public|internal|private|protected|open|abstract|sealed|data|value|enum|annotation|expect|actual|final|external)\\s+)*(?:class|interface|object|typealias)\\s+(${id})\\b`);
function scrub(s){
 let out='',state='code',depth=0;
 for(let i=0;i<s.length;i++){
  const c=s[i],n=s[i+1],three=s.slice(i,i+3);
  if(state==='code'){
   if(c==='/'&&n==='/'){out+='  ';i++;state='line';}
   else if(c==='/'&&n==='*'){out+='  ';i++;state='block';depth=1;}
   else if(three==='"""'){out+='   ';i+=2;state='raw';}
   else if(c==='"'||c==="'"){out+=' ';state=c;}
   else out+=c;
  }else if(state==='line'){if(c==='\n'){out+='\n';state='code';}else out+=' ';}
  else if(state==='block'){
   if(c==='/'&&n==='*'){out+='  ';i++;depth++;}
   else if(c==='*'&&n==='/'){out+='  ';i++;if(!--depth)state='code';}
   else out+=c==='\n'?'\n':' ';
  }else if(state==='raw'){
   if(three==='"""'){out+='   ';i+=2;state='code';}else out+=c==='\n'?'\n':' ';
  }else if(c==='\\'){if(i+1>=s.length)fail();out+='  ';i++;}
  else if(c===state){out+=' ';state='code';}
  else if(c==='\n'||c==='\r')fail();else out+=' ';
 }
 if(state!=='code'&&state!=='line')fail();return out;
}
function planSourceImports(options={}){
 const {headSha,sources:inputSources,seeds:inputSeeds,maxFiles,maxDepth}=
  dataFields(options,['headSha','sources','seeds','maxFiles','maxDepth']);
 const sources=dataArray(inputSources,300),seeds=dataArray(inputSeeds,300);
 if(!sources.length)fail();
 const seen=new Set(),parsed=[],symbols=new Map();let total=0;
 for(const source of sources){
  const s=dataFields(source,['path','blobSha','content']);
  if(!pathOk(s.path)||seen.has(s.path)||typeof s.blobSha!=='string'||!/^[a-f0-9]{40}$/.test(s.blobSha)||types.isProxy(s.content)||!(typeof s.content==='string'||Buffer.isBuffer(s.content)))fail();
  seen.add(s.path);const bytes=copyContent(s.content);total+=bytes.length;if(bytes.length>262144||total>4194304)fail();
  const actual=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');if(actual!==s.blobSha)fail();
  let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail();}
  const lines=scrub(text).split(/\r?\n/);let pkg=null,level=0;const imports=[],decls=[];
  for(const line of lines){
   if(level===0){
    const p=line.match(pkgRe),im=line.match(importRe),d=line.match(declRe);
    if(/^\s*package\b/.test(line)){if(!p||pkg!==null)fail();pkg=p[1];}
    if(/^\s*import\b/.test(line)){if(!im)fail();imports.push(im[1]);}
    if(d)decls.push(d[1]);
   }
   for(const c of line){if(c==='{')level++;if(c==='}'&&--level<0)fail();}
  }
  if(level!==0)fail();
  for(const d of decls){const name=pkg?pkg+'.'+d:d;if(!symbols.has(name))symbols.set(name,[]);symbols.get(name).push(s.path);}
  parsed.push({path:s.path,blobSha:s.blobSha,imports});
 }
 if(!Array.isArray(seeds)||seeds.some(p=>!seen.has(p)))fail();
 const edges=[],unresolved=[];const pairs=new Set();
 for(const s of parsed.sort((a,b)=>a.path.localeCompare(b.path))){
  for(const name of [...new Set(s.imports)].sort()){
   const targets=symbols.get(name);let reason;
   if(name.endsWith('.*'))reason='WILDCARD';else if(!targets)reason='NOT_FOUND';else if(targets.length!==1)reason='AMBIGUOUS';
   if(reason){unresolved.push({from:s.path,import:name,reason});continue;}
   const to=[...targets][0];if(to===s.path)continue;const key=JSON.stringify([s.path,to]);if(pairs.has(key))continue;pairs.add(key);
   const evidenceSha256=crypto.createHash('sha256').update(JSON.stringify({from:s.path,to,import:name,blobSha:s.blobSha})).digest('hex');edges.push({from:s.path,to,evidenceSha256});
  }
 }
 const plan=planDependencyExpansion({headSha,seeds,edges,maxFiles,maxDepth});
 const status=plan.status!=='COMPLETE_WITHIN_SUPPLIED_GRAPH'?'INCOMPLETE_PLANNER':
  unresolved.length?'INCOMPLETE_UNRESOLVED_IMPORTS':'COMPLETE_WITHIN_SUPPORTED_IMPORTS';
 return {status,edges,unresolved,plan,blobIdsVerified:true,repositoryMembershipVerified:false,semanticAnalysisPerformed:false,causalityVerified:false,limitation:'Caller-declared blob IDs verify bytes only; commit membership is not verified. Only supported explicit imports and top-level declarations are considered.'};
}
module.exports={planSourceImports};
