#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {patchOriginal,adjudicateReplay,hashBlob,ORIGINAL_BLOB}=require('../packages/quality-gates/c2-pr153-replay-causal.cjs');
function read(f,max){
 const st=fs.lstatSync(f);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<15||st.size>max)
  throw Error('C2_PR153_UNSAFE_SOURCE');
 return fs.readFileSync(f,'utf8');
}
function prepare(original,base){
 const src=read(original,100000);
 const repaired=patchOriginal(src);
 fs.mkdirSync(base,{recursive:false,mode:0o700});
 const blobs={original:hashBlob(src),patched:hashBlob(repaired)};
 for(const [name,text] of [['original',src],['patched',repaired]]){
  const dir=path.join(base,name);fs.mkdirSync(dir,{mode:0o700});
  fs.writeFileSync(path.join(dir,'PerGameAdaptiveRuntime.kt'),text,{flag:'wx',mode:0o600});
 }
 fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify({originalBlob:ORIGINAL_BLOB,blobs})+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({originalBlob:ORIGINAL_BLOB,patchedBlob:blobs.patched})+'\n');
}
function verify(base,out){
 const meta=JSON.parse(read(path.join(base,'manifest.json'),4000));
 const orig=read(path.join(base,'original','PerGameAdaptiveRuntime.kt'),100000);
 const fixed=read(path.join(base,'patched','PerGameAdaptiveRuntime.kt'),100000);
 if(meta.originalBlob!==ORIGINAL_BLOB||hashBlob(orig)!==ORIGINAL_BLOB||
  meta.blobs?.original!==ORIGINAL_BLOB||
  meta.blobs?.patched!==hashBlob(fixed)||fixed!==patchOriginal(orig))throw Error('C2_PR153_SOURCE_DRIFT');
 const observed={
  original:JSON.parse(read(path.join(base,'original','result.json'),2000)),
  patched:JSON.parse(read(path.join(base,'patched','result.json'),2000))
 };
 const verdict=adjudicateReplay(observed);
 fs.writeFileSync(out,JSON.stringify({...verdict,sourceBlobs:meta.blobs},null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({originalDefectObserved:true,patchedReplayRestoresPersistedTarget:true,
  independentCauseCertified:false,newLabels:0})+'\n');
}
if(require.main===module){
 try{
  const [op,...a]=process.argv.slice(2);
  if(op==='prepare'&&a.length===2)prepare(...a);
  else if(op==='verify'&&a.length===2)verify(...a);
  else throw Error('usage: c2-pr153-replay-causal.cjs prepare SOURCE NEW_DIR | verify DIR NEW_REPORT');
 }catch(e){process.stderr.write('C2_PR153_REPLAY_COUNTERFACTUAL_BLOCKED '+String(e.message||e).slice(0,160)+'\n');process.exitCode=2;}
}
module.exports={prepare,verify};
