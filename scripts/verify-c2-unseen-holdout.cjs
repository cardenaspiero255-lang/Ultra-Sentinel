#!/usr/bin/env node
'use strict';
/** Normalized API records only. No GitHub token, PR source or model output. */
const fs=require('node:fs'),path=require('node:path');
const {freezeHoldoutEvidence}=require('../packages/quality-gates/c2-unseen-holdout.cjs');
function readEvidence(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))
  throw Error('C2_HOLDOUT_INPUT_INVALID');
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<150||stat.size>20000)throw Error('C2_HOLDOUT_INPUT_INVALID');
 return JSON.parse(fs.readFileSync(filename,'utf8'));
}
function main(filename){return freezeHoldoutEvidence(readEvidence(filename));}
if(require.main===module){
 try{
  if(process.argv.length!==3)throw Error('C2_HOLDOUT_INPUT_INVALID');
  process.stdout.write(JSON.stringify(main(process.argv[2]))+'\n');
 }catch{
  process.stderr.write('C2_HOLDOUT_BLOCKED: SOURCE_PROVENANCE_UNVERIFIED\n');
  process.exitCode=2;
 }
}
module.exports={readEvidence,main};
