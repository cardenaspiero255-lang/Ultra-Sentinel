'use strict';
/* Source-only advisory discovery. No repository authentication, Kotlin symbol
 * resolution, product contract proof, execution, network or write authority. */
const {createHash}=require('node:crypto');
const {types}=require('node:util');
const SHA=/^[a-f0-9]{40}$/;
const NAME='[A-Za-z_]\\w*';
function fail(){throw Error('INVALID_EPHEMERAL_SCAN_INPUT');}
function record(value,keys){
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||
  Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).length!==keys.length)fail();
 const out={};
 for(const key of keys){
  const desc=Object.getOwnPropertyDescriptor(value,key);
  if(!desc||!Object.hasOwn(desc,'value'))fail();out[key]=desc.value;
 }
 return out;
}
function array(value,max){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||
  value.length<1||value.length>max||Reflect.ownKeys(value).length!==value.length+1)fail();
 const out=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))fail();out.push(d.value);
 }
 return out;
}
const hash=source=>{
 const b=Buffer.from(source,'utf8');
 return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
};
const validPath=p=>typeof p==='string'&&p.length<=350&&p.endsWith('.kt')&&
 p.includes('/src/main/')&&/^[A-Za-z0-9_.\/-]+$/.test(p)&&!p.startsWith('/')&&
 !p.split('/').some(x=>!x||x==='.'||x==='..');
// Exclude comments and raw strings; preserve interpolated ordinary strings.
function codeOnly(text){
 let result='',i=0,mode='code',depth=0;
 while(i<text.length){
  if(mode==='code'){
   if(text.startsWith('//',i)){mode='line';result+='  ';i+=2;continue;}
   if(text.startsWith('/*',i)){mode='block';depth=1;result+='  ';i+=2;continue;}
   if(text.startsWith('"""',i)){mode='raw';result+='   ';i+=3;continue;}
   if(text[i]==='"'){mode='string';result+='"';i++;continue;}
   result+=text[i++];continue;
  }
  if(mode==='line'){
   if(text[i]==='\n'){mode='code';result+='\n';}else result+=' ';
   i++;continue;
  }
  if(mode==='block'){
   if(text.startsWith('/*',i)){depth++;result+='  ';i+=2;continue;}
   if(text.startsWith('*/',i)){depth--;result+='  ';i+=2;if(depth===0)mode='code';continue;}
   result+=text[i]==='\n'?'\n':' ';i++;continue;
  }
  if(mode==='raw'){
   if(text.startsWith('"""',i)){mode='code';result+='   ';i+=3;continue;}
   result+=text[i]==='\n'?'\n':' ';i++;continue;
  }
  if(mode==='string'){
   if(text[i]==='\\'&&i+1<text.length){result+=text.slice(i,i+2);i+=2;continue;}
   if(text[i]==='"'){mode='code';result+='"';i++;continue;}
   result+=text[i++];continue;
  }
 }
 if(mode==='block'||mode==='string'||mode==='raw')return null;
 return result;
}
const escape=s=>s.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
function discover(path,source,blob){
 const code=codeOnly(source);
 if(code===null)return [];
 const found=[];
 // A note/search result flows through an answer into a dialogue list
 // that is read by an unfiltered persistence snapshot. Lexical hypothesis only.
 const noteDecl=/\bval\s+([A-Za-z_]\w*)\s*=\s*if\s*\([^\n]{0,400}\)\s*\{([\s\S]{0,800}?)\}\s*else\s+null/g;
 for(const m of code.matchAll(noteDecl)){
  const note=m[1],block=m[2];
  if(!/\b[A-Za-z_]\w*\.search\s*\(/.test(block))continue;
  const after=code.slice(m.index+m[0].length);
  const answer=new RegExp('\\bval\\s+('+NAME+')\\s*=\\s*when\\s*\\{[\\s\\S]{0,2300}?\\b'+
   escape(note)+'\\s*!=\\s*null\\s*->\\s*'+escape(note)+'\\b').exec(after);
  if(!answer)continue;
  const answerVar=answer[1];
  const afterAnswer=after.slice(answer.index+answer[0].length);
  const append=new RegExp('\\b('+NAME+')\\.add\\s*\\(\\s*"[^"\\n]{0,200}\\$(?:\\{)?'+
   escape(answerVar)+'(?:\\})?[^"\\n]*"(?:\\.take\\s*\\(\\s*\\d+\\s*\\))?\\s*\\)').exec(afterAnswer);
  if(!append)continue;
  const historyVar=append[1];
  const snapshot=new RegExp('\\bfun\\s+snapshotForStorage\\s*\\([^)]*\\)\\s*:[^{\\n]{0,100}\\{'+
   '[\\s\\S]{0,1400}?\\b'+escape(historyVar)+'\\.takeLast\\s*\\(').exec(code);
  if(!snapshot)continue;
  const line=code.slice(0,m.index).split('\n').length;
  found.push(Object.freeze({rule:'EPHEMERAL_KNOWLEDGE_REACHES_HISTORY_SNAPSHOT',path,
   line,sourceBlobSha:blob,confidence:'LOW',status:'HYPOTHESIS_REQUIRES_PRODUCT_CONTRACT_AND_ORIGINAL_ORACLE',
   noteValue:note,historyCollection:historyVar,
   sourceByteIntegrityVerified:true,sourceRepositoryAuthenticated:false,causalityVerified:false,
   fixAuthorized:false}));
  if(found.length>=4)break;
 }
 return found;
}
function blocked(status){return Object.freeze({status,filesScanned:0,findings:Object.freeze([]),
 sourceRepositoryAuthenticated:false,productContractConfirmed:false,causalityVerified:false,
 originalFunctionalOracleVerified:false,ownerAuthorizationGranted:false,
 remoteWrites:false,mergeAllowed:false});}
function scanEphemeralKotlinHistory(options){
 try{
  const o=record(options,['expectedCommitSha','files']);
  const files=array(o.files,80).map(f=>record(f,['path','source','expectedBlobSha']));
  if(typeof o.expectedCommitSha!=='string'||!SHA.test(o.expectedCommitSha))fail();
  const paths=new Set();
  for(const f of files){
   if(!validPath(f.path)||paths.has(f.path)||typeof f.source!=='string'||
    f.source.length<10||f.source.includes('\0')||f.source.includes('\r')||!f.source.endsWith('\n')||
    Buffer.byteLength(f.source,'utf8')>100000||f.source.split('\n').length>3000||
    typeof f.expectedBlobSha!=='string'||!SHA.test(f.expectedBlobSha))fail();
   if(hash(f.source)!==f.expectedBlobSha)return blocked('BLOCKED_SOURCE_BLOB_MISMATCH');
   paths.add(f.path);
  }
  const findings=files.flatMap(f=>discover(f.path,f.source,f.expectedBlobSha))
   .sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line);
  return Object.freeze({status:findings.length?'UNVERIFIED_EPHEMERAL_PERSISTENCE_HYPOTHESES':
   'NO_EPHEMERAL_PERSISTENCE_HYPOTHESES',filesScanned:files.length,
   findings:Object.freeze(findings),sourceRepositoryAuthenticated:false,
   productContractConfirmed:false,causalityVerified:false,originalFunctionalOracleVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
   limitation:'Lexical source-to-sink risk hypothesis; not authenticated Kotlin symbols, '+
    'a product privacy contract, causal proof, or authorization to repair.'});
 }catch{return blocked('BLOCKED_INPUT_CONTRACT');}
}
module.exports=Object.freeze({scanEphemeralKotlinHistory});
