#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {auditRun23Chain}=require('../packages/quality-gates/c2-run23-chain-audit.cjs');
function read(path){
 const s=fs.lstatSync(path);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<2||s.size>5000000)
  throw Error('C2_RUN23_UNSAFE_RECEIPT');
 return JSON.parse(fs.readFileSync(path,'utf8'));
}
function main(args){
 if(args.length!==6)throw Error('usage: audit-c2-run23-chain.cjs PRIOR RECEIPT W152 W151 GIT_TREES OUTPUT');
 const [prior,receipt,w152,w151,trees,out]=args;
 if([prior,receipt,w152,w151,trees].includes(out))throw Error('C2_RUN23_OUTPUT_CONFLICT');
 const result=auditRun23Chain({
  prior:read(prior),receipt:read(receipt),
  witnesses:[read(w152),read(w151)],sourceTrees:read(trees)
 });
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({count:result.count,positives:result.positives,
  negatives:result.negatives,sourceBlobsVerified:result.sourceBlobsVerified,
  missingCausalGroups:result.missingCausalGroups.length,
  duplicates:result.duplicateCausalGroups.length,
  missingReceipts:result.missingReceipts.length,
  status:result.status,newLabels:0,sssPlusCertified:false})+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write('C2_RUN23_CHAIN_AUDIT_BLOCKED '+(e?.message||'UNKNOWN')+'\n');process.exitCode=2;}
}
module.exports={main};
