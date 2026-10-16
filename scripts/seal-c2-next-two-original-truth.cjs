#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {sealTwoRealSourcePositives,WITNESS_SHA256}=
 require('../packages/quality-gates/c2-next-two-original-truth.cjs');
function readProof(filename,expectedSha){
 if(typeof filename!=='string'||!path.isAbsolute(filename))
  throw Error('C2_NEXT_TWO_SOURCE_TRUTH_BLOCKED');
 let bytes,st;
 try{st=fs.lstatSync(filename);bytes=fs.readFileSync(filename);}
 catch{throw Error('C2_NEXT_TWO_SOURCE_TRUTH_BLOCKED');}
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
  bytes.length<200||bytes.length>20000)
  throw Error('C2_NEXT_TWO_SOURCE_TRUTH_BLOCKED');
 if(expectedSha&&crypto.createHash('sha256').update(bytes).digest('hex')!==expectedSha)
  throw Error('C2_NEXT_TWO_SOURCE_TRUTH_BLOCKED');
 try{return JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('C2_NEXT_TWO_SOURCE_TRUTH_BLOCKED');}
}
function main(args){
 if(!Array.isArray(args)||args.length!==2)
  throw Error('C2_NEXT_TWO_SOURCE_TRUTH_BLOCKED');
 return sealTwoRealSourcePositives({
  prior:readProof(args[0]),
  witness:readProof(args[1],WITNESS_SHA256)
 });
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_NEXT_TWO_SOURCE_TRUTH_BLOCKED\n');process.exitCode=2;}
}
module.exports={main,readProof};
