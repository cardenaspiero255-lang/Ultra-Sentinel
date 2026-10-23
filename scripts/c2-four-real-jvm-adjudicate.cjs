#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {adjudicateFourDirectCrosses}=require('../packages/quality-gates/c2-four-direct-jvm-crosses.cjs');
function read(f){
 if(!path.isAbsolute(f))throw Error('C2_FOUR_CROSS_BAD_PATH');
 const s=fs.lstatSync(f);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<100||s.size>200000)
  throw Error('C2_FOUR_CROSS_UNTRUSTED_RECEIPT');
 return JSON.parse(fs.readFileSync(f,'utf8'));
}
function main(args){
 if(args.length!==5||args.some(x=>!path.isAbsolute(x))||new Set(args).size!==5||
  fs.existsSync(args[4]))throw Error('C2_FOUR_CROSS_BAD_OUTPUT');
 const evidence=adjudicateFourDirectCrosses(args.slice(0,4).map(read));
 fs.writeFileSync(args[4],JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({pairs:evidence.scopedNoninterferencePairs,
  originalSharedJvmRuns:evidence.realJointKotlinJvmExecutions,certifiedFamilies:0,newGold:0,
  nextcloudSourceInspected:false})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 process.stderr.write('C2_FOUR_REAL_CROSSES_BLOCKED: '+String(e.message||e).slice(0,150)+'\n');process.exitCode=2;
}}
module.exports={main};
