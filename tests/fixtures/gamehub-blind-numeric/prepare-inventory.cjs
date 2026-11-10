'use strict';
// Source-only Git inventory; repository identity and runner isolation are
// externally established. No path to any alleged defect is accepted as input.
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const {TextDecoder}=require('node:util');
const SHA=/^[0-9a-f]{40}$/;
function requireBudget(value,max,label){
 if(!Number.isSafeInteger(value)||value<0||value>max)throw Error(label);
}
function parseTreeRow(row,scope){
 const m=/^(\d{6}) (\w+) ([a-f0-9]{40})\t(.+)$/.exec(row);
 if(!m)throw Error('INVALID_GIT_TREE');
 const [,mode,type,blob,name]=m;
 if(!name.endsWith('.kt'))return null;
 if(mode!=='100644'||type!=='blob'||!name.startsWith(scope+'/')||
    name.length>350||!/^[A-Za-z0-9_.\/-]+\.kt$/.test(name)||
    name.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('INVALID_KOTLIN_TREE_ENTRY');
 return {name,blob};
}
function decodeSource(bytes,expectedBlobSha){
 if(!Buffer.isBuffer(bytes)||bytes.length<10||bytes.length>60000||
    createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')!==expectedBlobSha)
  throw Error('INCONSISTENT_GIT_BLOB');
 const source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 if(source.includes('\0')||source.includes('\r')||!source.endsWith('\n')||
    source.split('\n').length>4000)throw Error('INVALID_KOTLIN_TEXT');
 return source;
}
function prepare(args){
 const [rootArg,head,scope,output]=args;
 if(args.length!==4||!path.isAbsolute(rootArg)||!path.isAbsolute(output)||
    typeof head!=='string'||!SHA.test(head)||typeof scope!=='string'||
    !/^[A-Za-z0-9_.\/-]+$/.test(scope)||!scope.includes('/src/main/')||
    scope.startsWith('/')||scope.split('/').some(s=>!s||s==='.'||s==='..'))
    throw Error('BAD_NUMERIC_INVENTORY_ARGUMENTS');
 const root=fs.realpathSync(rootArg);
 const env={PATH:process.env.PATH||'/usr/bin:/bin',HOME:'/tmp',
  GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',
  GIT_CONFIG_COUNT:'0',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'};
 function git(...args){
  const r=spawnSync('git',['-C',root,'-c','core.hooksPath=/dev/null',
   '-c','core.fsmonitor=false','--literal-pathspecs',...args],
   {encoding:null,env,timeout:15000,maxBuffer:4*1024*1024});
  if(r.error||r.status!==0||!Buffer.isBuffer(r.stdout))throw Error('GIT_INVENTORY_FAILED');
  return r.stdout;
 }
 const text=(...args)=>git(...args).toString('utf8').trim();
 function requireClean(){
  if(fs.realpathSync(text('rev-parse','--show-toplevel'))!==root||
     text('rev-parse','HEAD')!==head||
     text('status','--porcelain','--untracked-files=all')!=='')
    throw Error('DIRTY_OR_WRONG_GIT_HEAD');
 }
 requireClean();
 const raw=git('ls-tree','-r','-z','--full-tree',head,'--',scope).toString('utf8');
 const rows=raw.split('\0');
 if(rows.pop()!=='')throw Error('TRUNCATED_GIT_TREE');
 const files=[];let skippedOversized=0,skippedNoncanonical=0,allKotlin=0;
 for(const row of rows){
  const entry=parseTreeRow(row,scope);
  if(entry===null)continue;
  const {name,blob}=entry;
  allKotlin++;
  requireBudget(allKotlin,4096,'TOO_MANY_KOTLIN_FILES');
  const size=Number(text('cat-file','-s',blob));
  if(!Number.isSafeInteger(size))throw Error('INVALID_GIT_BLOB_SIZE');
  if(size>60000){skippedOversized++;continue;}
  if(size<10)throw Error('INVALID_GIT_SOURCE_SIZE');
  const bytes=git('cat-file','blob',blob);
  if(bytes.length!==size)throw Error('MISMATCHED_GIT_BLOB_SIZE');
  const rawSha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(rawSha!==blob)throw Error('MISMATCHED_ORIGINAL_GIT_BLOB');
  let source;
  try{source=decodeSource(bytes,blob);}
  catch(e){
   if(e.message!=='INVALID_KOTLIN_TEXT'&&e.name!=='TypeError')throw e;
   skippedNoncanonical++;continue;
  }
  files.push({path:name,source,expectedBlobSha:blob});
 }
 if(!files.length)throw Error('EMPTY_OR_OVERSIZED_INVENTORY');
 files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(new Set(files.map(f=>f.path)).size!==files.length)throw Error('DUPLICATED_GIT_PATH');
 const data=JSON.stringify({expectedCommitSha:head,files,skippedOversized,skippedNoncanonical});
 requireBudget(Buffer.byteLength(data),40*1024*1024,'INVENTORY_TOTAL_BUDGET');
 requireClean();
 fs.writeFileSync(output,data,{flag:'wx',mode:0o600});
 return {files:files.length,skippedOversized,skippedNoncanonical,allKotlin};
}
if(require.main===module){
 try{const r=prepare(process.argv.slice(2));
  console.log('blind_numeric_inventory_files='+r.files);
  console.log('blind_numeric_inventory_skipped='+r.skippedOversized);
  console.log('blind_numeric_inventory_noncanonical='+r.skippedNoncanonical);
 }catch(e){console.error('BLIND_NUMERIC_INVENTORY_BLOCKED:'+e.message);process.exitCode=1;}
}
module.exports=Object.freeze({prepare,parseTreeRow,decodeSource,requireBudget});
