#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {pilotMatrix,adjudicatePilot}=require('../packages/quality-gates/c2-pr189-sixteen-original-replays.cjs');
function fail(){throw Error('C2_PR189_RECEIPT_LOADING_BLOCKED');}
function triage(artifactRoot,output){
 if(!path.isAbsolute(artifactRoot)||!path.isAbsolute(output)||
  path.resolve(artifactRoot)===path.resolve(output)||fs.existsSync(output))fail();
 const st=fs.lstatSync(artifactRoot);
 if(!st.isDirectory()||st.isSymbolicLink())fail();
 const matrix=pilotMatrix();
 const expected=new Set(matrix.include.map(x=>'c2-pr189-'+x.id));
 const dirs=fs.readdirSync(artifactRoot,{withFileTypes:true});
 if(dirs.length!==expected.size)fail();
 const receipts=[];
 for(const dir of dirs){
  if(!dir.isDirectory()||dir.isSymbolicLink()||!expected.has(dir.name))fail();
  const location=path.join(artifactRoot,dir.name);
  const entries=fs.readdirSync(location,{withFileTypes:true});
  for(const item of entries){
   if(item.isSymbolicLink())fail();
   if(item.name==='evidence'&&item.isDirectory())continue;
   if(!item.isFile()||!item.name.endsWith('.json'))fail();
   const file=path.join(location,item.name),meta=fs.lstatSync(file);
   if(meta.nlink!==1||meta.size<25||meta.size>20000)fail();
   const receipt=JSON.parse(fs.readFileSync(file,'utf8'));
   if(!receipt||item.name!==receipt.task+'.json')fail();
   receipts.push(receipt);
  }
 }
 const report=adjudicatePilot(receipts);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:report.status,replayed:report.candidateCount,untouched:report.remainingUntouched,
  classified:report.counts,admitted:0,independentCauses:0,sssPlusCertified:false};
}
function main(args){
 if(args.length===1&&args[0]==='matrix'){
  process.stdout.write(JSON.stringify(pilotMatrix())+'\n');return;
 }
 if(args.length===3&&args[0]==='triage'){
  process.stdout.write(JSON.stringify(triage(args[1],args[2]))+'\n');return;
 }
 fail();
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(e){process.stderr.write(String(e.message||e).slice(0,180)+'\n');process.exitCode=2;}
}
module.exports={main,triage};
