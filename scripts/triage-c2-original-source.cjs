#!/usr/bin/env node
'use strict';
// Run ONLY on already downloaded owner-authenticated original Git tree responses.
// No detector, internet, credentials, predictions, writes to source or auto-labeling.
const fs=require('node:fs'),path=require('node:path');
const {NEW_LOCK}=require('../packages/quality-gates/c2-next-holdout.cjs');
const {triageOriginalTrees}=require('../packages/quality-gates/c2-original-source-triage.cjs');
function fail(){throw Error('C2_ORIGINAL_TRIAGE_INPUT_BLOCKED');}
function readRegular(p,max){
  if(typeof p!=='string'||!path.isAbsolute(p))fail();
  let stat;
  try{stat=fs.lstatSync(p);}catch{fail();}
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
     stat.size<50||stat.size>max)fail();
  return fs.readFileSync(p);
}
function main(argv){
  if(!Array.isArray(argv)||argv.length!==3||argv.some(x=>!path.isAbsolute(x)))fail();
  const [treesDir,manifestFile,outputFile]=argv;
  const stat=fs.lstatSync(treesDir);
  if(!stat.isDirectory()||stat.isSymbolicLink()||fs.existsSync(outputFile))fail();
  const manifest=JSON.parse(readRegular(manifestFile,1024*1024).toString('utf8'));
  const refs=[...new Set(NEW_LOCK.cases.flatMap(c=>[c.baseSha,c.headSha]))];
  if(refs.length!==15)fail();
  const raw={};
  for(const sha of refs)raw[sha]=readRegular(path.join(treesDir,sha+'.json'),12*1024*1024);
  const report=triageOriginalTrees(manifest,raw);
  fs.writeFileSync(outputFile,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  return {status:report.status,sourceSnapshots:report.candidateCount,
    eligibleOccurrences:report.counts.frozenCoreEligible,
    excludedOccurrences:report.counts.excluded,
    labelsAdded:0,precision:null,recall:null,f1:null,tripleSPlusCertified:false,
    triageSha256:report.triageSha256};
}
if(require.main===module){
  try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
  catch{process.stderr.write('C2_ORIGINAL_TRIAGE_INPUT_BLOCKED\n');process.exitCode=2;}
}
module.exports={main};
