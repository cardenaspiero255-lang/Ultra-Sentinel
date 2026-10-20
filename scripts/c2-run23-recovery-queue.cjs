#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {planRecovery}=require('../packages/quality-gates/c2-run23-recovery-queue.cjs');
function main(args){
 if(args.length!==2)throw Error('usage: c2-run23-recovery-queue.cjs ATTESTED_AUDIT.json NEW_OUTPUT.json');
 const [source,dest]=args;
 if(source===dest)throw Error('C2_QUEUE_OVERWRITE_BLOCKED');
 const st=fs.lstatSync(source);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<100||st.size>2000000)
  throw Error('C2_QUEUE_UNSAFE_SOURCE');
 const report=JSON.parse(fs.readFileSync(source,'utf8'));
 const result=planRecovery(report);
 fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({missingCauses:result.causalGroupsMissing,
  missingReceipts:result.individualReceiptsMissing,both:result.bothMissing,
  prioritized:result.queue.length,newLabels:0,benchmarkReady:false})+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){
  process.stderr.write('C2_RUN23_RECOVERY_BLOCKED: '+String(e.message||e).slice(0,140)+'\n');process.exitCode=2;
 }
}
module.exports={main};
