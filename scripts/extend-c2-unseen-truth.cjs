#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {SOURCE_HASHES,extendUnseenTruthV2}=
 require('../packages/quality-gates/c2-unseen-two-positive-truth.cjs');
function readPinned(file,digest){
 if(typeof file!=='string'||!path.isAbsolute(file))
  throw Error('C2_UNSEEN_TRUTH_V2_INPUT_INVALID');
 let bytes,stat;
 try{stat=fs.lstatSync(file);bytes=fs.readFileSync(file);}
 catch{throw Error('C2_UNSEEN_TRUTH_V2_INPUT_INVALID');}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  bytes.length<100||bytes.length>20000||
  crypto.createHash('sha256').update(bytes).digest('hex')!==digest)
  throw Error('C2_UNSEEN_TRUTH_V2_INPUT_INVALID');
 try{return JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('C2_UNSEEN_TRUTH_V2_INPUT_INVALID');}
}
function run(args){
 if(!Array.isArray(args)||args.length!==2)
  throw Error('C2_UNSEEN_TRUTH_V2_INPUT_INVALID');
 return extendUnseenTruthV2({
  previousSeal:readPinned(args[0],SOURCE_HASHES.previousSeal),
  pr205:readPinned(args[1],SOURCE_HASHES.pr205)
 });
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(run(process.argv.slice(2)))+'\n');}
 catch{
  process.stderr.write('C2_UNSEEN_TRUTH_V2_BLOCKED: UNVERIFIED_EVIDENCE\n');
  process.exitCode=2;
 }
}
module.exports={readPinned,run};
