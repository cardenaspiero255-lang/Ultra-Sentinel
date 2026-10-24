#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {attestTasksExternalDevelopmentWitness}=
 require('../packages/quality-gates/c2-external-original-attestor.cjs');
const HEAD='3936c221aea180b795085d7402286373b5d3f6d2';
const BASE='5624816cac6ecab701969d24e6d3387ccd21a773';
const FILE='app/src/main/java/org/tasks/notifications/Throttle.kt';
const BLOB='0e472cfd73510ab11a396ee5eba9968d57172050';
const fail=()=>{throw Error('C2_EXTERNAL_SOURCE_ATTESTATION_BLOCKED');};
function regular(file,min=1,max=100000){
 if(typeof file!=='string'||!path.isAbsolute(file))fail();
 let st,b;
 try{st=fs.lstatSync(file);b=fs.readFileSync(file);}
 catch{fail();}
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
    b.length<min||b.length>max)fail();
 return b;
}
function git(dir,...args){
 try{return execFileSync('git',['-C',dir,...args],{
  encoding:'utf8',timeout:30000,maxBuffer:200000
 }).trim();}
 catch{fail();}
}
function attest(args){
 if(!Array.isArray(args)||args.length!==4||
   args.some(p=>typeof p!=='string'||!path.isAbsolute(p)))fail();
 const [checkout,worker,report,output]=args;
 if(new Set(args.map(x=>path.resolve(x))).size!==4||fs.existsSync(output))fail();
 const st=fs.lstatSync(checkout);
 if(!st.isDirectory()||st.isSymbolicLink())fail();
 if(git(checkout,'rev-parse','HEAD')!==HEAD||
    git(checkout,'rev-parse',HEAD+':'+FILE)!==BLOB)fail();
 git(checkout,'merge-base','--is-ancestor',BASE,HEAD);
 const blob=regular(path.join(checkout,FILE),100,50000);
 const computed=crypto.createHash('sha1').update('blob '+blob.length+'\0')
  .update(blob).digest('hex');
 if(computed!==BLOB)fail();
 const upstream={
  repository:'tasks/tasks',headSha:HEAD,path:FILE,gitBlobSha:BLOB,
  sourceSha256:crypto.createHash('sha256').update(blob).digest('hex'),
  commitAncestorChecked:true,sourceFetchedFromPinnedGit:true
 };
 let parsed;
 try{parsed=JSON.parse(regular(report,150,30000).toString('utf8'));}
 catch{fail();}
 const out=attestTasksExternalDevelopmentWitness({
  originalWorkerBytes:regular(worker,60,3000),
  producerReport:parsed,independentUpstream:upstream
 });
 fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n',{flag:'wx',mode:0o600});
 return out;
}
if(require.main===module){
 try{const x=attest(process.argv.slice(2));process.stdout.write(
  JSON.stringify({status:x.status,knownDevelopment:true,newGoldLabels:0})+'\n');}
 catch{process.stderr.write('C2_EXTERNAL_SOURCE_ATTESTATION_BLOCKED\n');process.exitCode=2;}
}
module.exports={attest};
