'use strict';
// Consume ONLY sanitized GitHub changed-file metadata. No patch/source allowed.
const FILE=['filename','status','sha','additions','deletions','changes'];
const SHA=/^[0-9a-f]{40}$/;
const allowedStatus=new Set(['added','modified','removed','renamed','copied','changed']);
const PATH=new RegExp('^[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*$');
const goodFile=f=>{
 if(!f||typeof f!=='object'||Array.isArray(f)||
  Object.keys(f).length!==FILE.length||!FILE.every(k=>Object.hasOwn(f,k))||
  typeof f.filename!=='string'||f.filename.length>250||
  !PATH.test(f.filename)||f.filename.split('/').some(s=>s==='.'||s==='..'||s.includes('..'))||
  !SHA.test(f.sha)||!allowedStatus.has(f.status)||
  ![f.additions,f.deletions,f.changes].every(Number.isSafeInteger)||
  f.additions<0||f.deletions<0||f.changes<0||
  f.changes!==f.additions+f.deletions)return false;
 return true;
};
function validNewExternalFileList(files){
 if(!Array.isArray(files)||files.length<1||files.length>300)return false;
 const seen=new Set();
 for(const f of files){
  if(!goodFile(f)||seen.has(f.filename))return false;
  seen.add(f.filename);
 }
 return true;
}
module.exports={validNewExternalFileList};
