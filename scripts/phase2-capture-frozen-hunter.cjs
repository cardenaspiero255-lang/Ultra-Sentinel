#!/usr/bin/env node
'use strict';
/* Post-worker metadata capture. Never loads source text or executable oracles. */
const fs=require('node:fs'),path=require('node:path');
const {aggregateFrozenHunterReports}=
 require('../packages/quality-gates/phase2-prospective-hunter-capture.cjs');
function read(file,limit){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('UNTRUSTED_CAPTURE_PATH');
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<10||stat.size>limit)throw Error('UNTRUSTED_CAPTURE_FILE');
 return fs.readFileSync(file);
}
function capture(args){
 if(!Array.isArray(args)||args.length!==5)throw Error('UNTRUSTED_CAPTURE_ARGUMENTS');
 const [manifest,numeric,codec,identity,out]=args;
 if(!path.isAbsolute(out)||fs.existsSync(out))throw Error('CAPTURE_OUTPUT_EXISTS');
 const bytes=read(manifest,20000),parse=f=>JSON.parse(read(f,1024*1024).toString('utf8'));
 const report=aggregateFrozenHunterReports(bytes,{
  numeric:parse(numeric),codec:parse(codec),identity:parse(identity)
 });
 if(report.status!=='PREDICTIONS_SEALED_NO_INDEPENDENT_TRUTH')throw Error('UNTRUSTED_HUNTER_PREDICTIONS');
 fs.writeFileSync(out,JSON.stringify(report)+'\n',{flag:'wx',mode:0o600});
 return report;
}
if(require.main===module){
 try{
  const report=capture(process.argv.slice(2));
  console.log('FROZEN_HUNTER_UNSCORED_PREDICTIONS_SEALED');
  console.log('prospective_sources='+report.filesCovered);
  console.log('prospective_unverified_findings='+report.unverifiedFindings);
  console.log('prospective_prediction_digest='+report.predictionDigest);
 }catch{
  console.error('PROSPECTIVE_CAPTURE_BLOCKED');
  process.exitCode=1;
 }
}
module.exports=Object.freeze({capture});
