#!/usr/bin/env node
'use strict';
/* Offline, unprivileged inspection. JSON input is never treated as an attested label. */
const {lstatSync,readFileSync,writeFileSync}=require('node:fs');
const {auditHistorical,screenCandidates}=require('../packages/quality-gates/c2-causal-prospective-preflight.cjs');
function input(path){
 const stat=lstatSync(path);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size<2||stat.size>1800000)
  throw Error('C2_PREFLIGHT_INPUT_REJECTED');
 const data=JSON.parse(readFileSync(path,'utf8'));
 if(!Array.isArray(data))throw Error('C2_PREFLIGHT_EXPECTED_ARRAY');
 return data;
}
function main(args){
 if(args.length!==3)throw Error('usage: c2-causal-prospective-preflight HISTORY.json CANDIDATES.json NEW_REPORT.json');
 const [historical,candidates,output]=args;
 if(historical===output||candidates===output)throw Error('C2_PREFLIGHT_OUTPUT_MUST_BE_NEW');
 const h=input(historical),c=input(candidates);
 const report=screenCandidates(h,c),inventory=auditHistorical(h);
 writeFileSync(output,JSON.stringify({historicalStatus:inventory.status,holdoutFrozen:false,newLabels:0,precision:null,inventory,screening:report},null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({historicalStatus:inventory.status,
  historicalCount:inventory.count,candidates:report.candidates.length,
  newLabels:0,holdoutFrozen:false,sssPlusCertified:false})+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){
  process.stderr.write('C2_CAUSAL_PREFLIGHT_BLOCKED: '+String(e.message||e).slice(0,140)+'\n');
  process.exitCode=2;
 }
}
module.exports={main};
