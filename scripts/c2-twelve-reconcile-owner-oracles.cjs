#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {STAGES,reconcileTwelveOracles}=
 require('../packages/quality-gates/c2-twelve-original-oracle-reconciliation.cjs');
function read(file){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<100||
  s.size>1000000)throw Error('C2_TWELVE_OWNER_ORACLES_UNSAFE_FILE');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==3)throw Error('usage: c2-twelve-reconcile-owner-oracles.cjs QUEUE.json DOWNLOADS_DIR NEW_OUTPUT.json');
 const [queue,dir,out]=args;
 if([path.resolve(queue),path.resolve(dir),path.resolve(out)].some((x,i,a)=>a.indexOf(x)!==i))
  throw Error('C2_TWELVE_OWNER_ORACLES_OVERWRITE');
 const d=fs.lstatSync(dir);
 if(!d.isDirectory()||d.isSymbolicLink())throw Error('C2_TWELVE_OWNER_ORACLES_UNSAFE_DIR');
 const stages=STAGES.map(s=>({key:s.key,receipt:read(path.join(dir,s.key,s.file))}));
 const report=reconcileTwelveOracles({prior:read(queue),stages});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({
  status:report.status,ownerOriginalOraclesReconciled:report.ownerOriginalOraclesReconciled,
  ownerSourceStagesReconciled:report.ownerSourceStagesReconciled,
  positiveSourceReceiptsReconciled:report.positiveSourceReceiptsReconciled,
  negativeSourceReceiptsReconciled:report.negativeSourceReceiptsReconciled,
  newLabels:0,certifiedIndependentCausesAdded:0,sssPlusCertified:false
 })+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){
  process.stderr.write('C2_TWELVE_ORIGINAL_ORACLES_BLOCKED '+String(e.message||e).slice(0,150)+'\n');
  process.exitCode=2;
 }
}
module.exports={main};
