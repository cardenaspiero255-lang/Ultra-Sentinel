#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {resolve}=require('node:path');
const {adjudicatePr153Negative}=require('../packages/quality-gates/c2-pr153-negative-identity-adjudication.cjs');
function read(file){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<100||s.size>1000000)
  throw Error('C2_PR153_NEGATIVE_ADJUDICATION_UNSAFE_INPUT');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==3)throw Error('usage: c2-pr153-adjudicate-negative.cjs HISTORY.json RUN16.json OUTPUT.json');
 const [parent,source,dest]=args;
 if(new Set(args.map(resolve)).size!==3)throw Error('C2_PR153_NEGATIVE_ADJUDICATION_OVERWRITE');
 const output=adjudicatePr153Negative({history:read(parent),sourceTruth:read(source)});
 fs.writeFileSync(dest,JSON.stringify(output,null,2)+'\n',{flag:'wx',mode:0o600});
 const row=output.entries.find(x=>x.pr===153&&x.line===69&&x.positive===false);
 process.stdout.write(JSON.stringify({
  status:output.status,count:output.count,positive:output.positives,negative:output.negatives,
  pr153line69:row?.causalAdjudication?.status,
  newLabels:output.newLabels,certifiedIndependentCausesAdded:0,sssPlusCertified:false
 })+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){
  process.stderr.write('C2_PR153_NEGATIVE_ADJUDICATION_BLOCKED '+String(e.message||e).slice(0,160)+'\n');
  process.exitCode=2;
 }
}
module.exports={main};
