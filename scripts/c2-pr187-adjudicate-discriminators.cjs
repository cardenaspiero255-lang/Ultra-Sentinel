#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {manifest,adjudicateFour}=require('../packages/quality-gates/c2-pr186-four-causal-discriminators.cjs');
function load(p){
 const st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<80||st.size>1500000)
  throw Error('C2_PR186_INPUT_NOT_REGULAR_FILE');
 return JSON.parse(fs.readFileSync(p,'utf8'));
}
function main(args){
 if(args[0]==='manifest'&&args.length===2){process.stdout.write(manifest(args[1]));return;}
 if(args[0]==='consolidate'&&args.length===7){
  const [_,prior,output,...receipts]=args;
  if(new Set([prior,output,...receipts].map(x=>path.resolve(x))).size!==6)
   throw Error('C2_PR186_ALIASING_BLOCKED');
  const results=adjudicateFour({parent:load(prior),receipts:receipts.map(load)});
  fs.writeFileSync(output,JSON.stringify(results,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write(JSON.stringify({status:results.status,mechanisms:results.replayedDifferentialMechanisms,
   wrongFixesRejected:4,newLabels:0,causesCertified:0,sssPlusCertified:false})+'\n');
  return;
 }
 throw Error('C2_PR186_ARGS_BLOCKED');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 console.error(String(e.message||e).slice(0,170));process.exitCode=2;
}}
module.exports={main};
