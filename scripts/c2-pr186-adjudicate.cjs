#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {adjudicateFour}=require('../packages/quality-gates/c2-pr186-four-cross-adjudication.cjs');
function read(file){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<150||st.size>1000000)
  throw Error('C2_PR186_RECEIPT_UNTRUSTED');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==3||new Set(args.map(x=>path.resolve(x))).size!==3)
  throw Error('C2_PR186_PATHS_BLOCKED');
 const [json,rollback,out]=args;
 const result=adjudicateFour([read(json),read(rollback)]);
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({status:result.status,originalKotlinJointRuns:result.originalKotlinJointRuns,
  crossEffects:result.orthogonalSourceBehaviors,newLabels:0,independentCauses:0,sssPlusCertified:false}));
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write(String(e.message||e).slice(0,200)+'\n');process.exitCode=2;}
}
module.exports={main};
