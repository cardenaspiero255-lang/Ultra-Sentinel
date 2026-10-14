'use strict';
/** Deterministic, no-network layout check. Does not claim product functionality. */
const fs=require('node:fs');
const path=require('node:path');
function safeRelativePath(value){
 if(typeof value!=='string'||!value||value.includes('\\')||value.includes('\0')||/[\x00-\x1f\x7f]/.test(value))return false;
 if(path.posix.isAbsolute(value)||path.win32.isAbsolute(value))return false;
 const parts=value.split('/');
 return parts.every(p=>p!==''&&p!=='.'&&p!=='..')&&path.posix.normalize(value)===value;
}
function checkLayout(root,manifest){
 const errors=[];
 if(!manifest||manifest.schemaVersion!==1||!Array.isArray(manifest.paths)||
    manifest.paths.length>500){return {checked:0,errors:['invalid manifest']};}
 const base=path.resolve(root);
 const seen=new Set();
 for(const p of manifest.paths){
  if(!safeRelativePath(p)){errors.push('unsafe path: '+String(p).slice(0,100));continue;}
  if(seen.has(p)){errors.push('duplicate path: '+p);continue;}
  seen.add(p);
  const full=path.resolve(base,p);
  if(!full.startsWith(base+path.sep)){errors.push('outside root: '+p);continue;}
  // lstat only on the final file is unsafe: parent directory symlinks are
  // transparently followed. Reject every symbolic link in the path, including
  // links pointing *inside* the repository, before accepting the final file.
  // Paths come from the bounded, normalized manifest, not from a shell.
  const segments=p.split('/');
  let current=base;
  for(let i=0;i<segments.length;i++){
   current=path.join(current,segments[i]);
   let st;
   try{
    st=fs.lstatSync(current);
   }catch(err){
    errors.push((err&&err.code==='ENOENT'?'missing path: ':'inaccessible path: ')+p);
    break;
   }
   if(st.isSymbolicLink()){errors.push('symlink path: '+p);break;}
   if(i<segments.length-1&&!st.isDirectory()){
    errors.push('not a directory: '+p);
    break;
   }
   if(i===segments.length-1&&!st.isFile())errors.push('not a regular file: '+p);
  }
 }
 return {checked:seen.size,errors};
}
if(require.main===module){
 try{
  const root=path.resolve(__dirname,'..');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'config/layout.json'),'utf8'));
  const result=checkLayout(root,manifest);
  if(result.errors.length){console.error(result.errors.join('\n'));process.exitCode=1;}
  else console.log('Architecture verified:',result.checked,'files.');
 }catch(err){console.error('Architecture check failed:',err.message);process.exitCode=1;}
}
module.exports={safeRelativePath,checkLayout};
