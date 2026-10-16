#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {freezeNextHoldout}=require('../packages/quality-gates/c2-next-holdout.cjs');
function readEvidence(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))
  throw Error('C2_NEXT_HOLDOUT_INPUT_BLOCKED');
 let st,bytes;
 try{st=fs.lstatSync(filename);bytes=fs.readFileSync(filename);}
 catch{throw Error('C2_NEXT_HOLDOUT_INPUT_BLOCKED');}
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
  bytes.length<500||bytes.length>20000)throw Error('C2_NEXT_HOLDOUT_INPUT_BLOCKED');
 try{return JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('C2_NEXT_HOLDOUT_INPUT_BLOCKED');}
}
function main(filename){return freezeNextHoldout(readEvidence(filename));}
if(require.main===module){
 try{
  if(process.argv.length!==3)throw Error('C2_NEXT_HOLDOUT_INPUT_BLOCKED');
  process.stdout.write(JSON.stringify(main(process.argv[2]))+'\n');
 }catch{
  process.stderr.write('C2_NEXT_HOLDOUT_BLOCKED: SOURCE_PROVENANCE_UNVERIFIED\n');
  process.exitCode=2;
 }
}
module.exports={readEvidence,main};
