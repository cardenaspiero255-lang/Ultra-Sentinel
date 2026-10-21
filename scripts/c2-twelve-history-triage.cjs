#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {triageTwelve}=require('../packages/quality-gates/c2-twelve-historical-identity-triage.cjs');
function read(source){
 const s=fs.lstatSync(source);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||
  s.size<100||s.size>1000000)throw Error('C2_TWELVE_HISTORICAL_TRIAGE_UNSAFE_SOURCE');
 return JSON.parse(fs.readFileSync(source,'utf8'));
}
function main(args){
 if(args.length!==2)throw Error('usage: c2-twelve-history-triage.cjs PR179.json OUTPUT.json');
 const [source,dest]=args;
 if(path.resolve(source)===path.resolve(dest))throw Error('C2_TWELVE_HISTORICAL_TRIAGE_OVERWRITE');
 const result=triageTwelve(read(source));
 fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({
  status:result.status,pending:result.pending,
  pendingPositiveIdentities:result.pendingPositiveIdentities,
  pendingNegativeIdentities:result.pendingNegativeIdentities,
  orphanIdentities:result.queue.map(x=>({pr:x.pr,line:x.line,rule:x.rule,
   path:x.path,positive:x.positive,hasSealedEvidenceSha256:x.hasSealedEvidenceSha256})),
  independentlyAdjudicatedFromQueue:0,newLabels:0,sssPlusCertified:false
 })+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){
  process.stderr.write('C2_TWELVE_HISTORICAL_TRIAGE_BLOCKED '+String(e.message||e).slice(0,150)+'\n');
  process.exitCode=2;
 }
}
module.exports={main};
