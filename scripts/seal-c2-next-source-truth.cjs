#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {sealNextSourceTruth,WITNESS_SHA256}=
 require('../packages/quality-gates/c2-next-one-positive-truth.cjs');
function readEvidence(filename,sha256){
 if(typeof filename!=='string'||!path.isAbsolute(filename))
  throw Error('C2_NEXT_SOURCE_TRUTH_BLOCKED');
 let st,bytes;
 try{st=fs.lstatSync(filename);bytes=fs.readFileSync(filename);}
 catch{throw Error('C2_NEXT_SOURCE_TRUTH_BLOCKED');}
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
  bytes.length<200||bytes.length>20000)
  throw Error('C2_NEXT_SOURCE_TRUTH_BLOCKED');
 if(sha256&&crypto.createHash('sha256').update(bytes).digest('hex')!==sha256)
  throw Error('C2_NEXT_SOURCE_TRUTH_BLOCKED');
 try{return JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('C2_NEXT_SOURCE_TRUTH_BLOCKED');}
}
function main(args){
 if(!Array.isArray(args)||args.length!==2)throw Error('C2_NEXT_SOURCE_TRUTH_BLOCKED');
 return sealNextSourceTruth({
  freeze:readEvidence(args[0]),
  witness:readEvidence(args[1],WITNESS_SHA256)
 });
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch{
  process.stderr.write('C2_NEXT_SOURCE_TRUTH_BLOCKED: UNVERIFIED_WITNESS\n');
  process.exitCode=2;
 }
}
module.exports={readEvidence,main};
