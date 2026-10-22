#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {assessNumericOrthogonality}=require('../packages/quality-gates/c2-pr185-numeric-orthogonality.cjs');
function read(file){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<100||st.size>1500000)
  throw Error('C2_PR185_INVALID_RECEIPT');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==3)throw Error('C2_PR185_ARGUMENTS_BLOCKED');
 const [prior,experiment,output]=args;
 if(new Set(args.map(x=>path.resolve(x))).size!==3)throw Error('C2_PR185_OUTPUT_ALIAS');
 const result=assessNumericOrthogonality({prior:read(prior),experiment:read(experiment)});
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({status:result.status,
  combinations:result.fourCombinationsExecuted,causesIndependentlyCertified:0,
  sssPlusCertified:false})+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(e){process.stderr.write(String(e.message||e).slice(0,200)+'\n');process.exitCode=2;}
}
module.exports={main};
