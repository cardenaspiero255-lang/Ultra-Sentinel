#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {HASHES,extendUnseenTruthV3}=require('../packages/quality-gates/c2-unseen-truth-v3.cjs');
function readPinned(file,digest){
 if(typeof file!=='string'||!path.isAbsolute(file))
  throw Error('C2_UNSEEN_V3_SOURCE_INVALID');
 let s,bytes;
 try{s=fs.lstatSync(file);bytes=fs.readFileSync(file);}
 catch{throw Error('C2_UNSEEN_V3_SOURCE_INVALID');}
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||
  bytes.length<100||bytes.length>20000||
  crypto.createHash('sha256').update(bytes).digest('hex')!==digest)
  throw Error('C2_UNSEEN_V3_SOURCE_INVALID');
 try{return JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('C2_UNSEEN_V3_SOURCE_INVALID');}
}
function run(args){
 if(!Array.isArray(args)||args.length!==2)
  throw Error('C2_UNSEEN_V3_SOURCE_INVALID');
 return extendUnseenTruthV3({
  previousSeal:readPinned(args[0],HASHES.previousSeal),
  witness208:readPinned(args[1],HASHES.witness208)
 });
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(run(process.argv.slice(2)))+'\n');}
 catch{
  process.stderr.write('C2_UNSEEN_V3_BLOCKED: UNVERIFIED_EVIDENCE\n');
  process.exitCode=2;
 }
}
module.exports={readPinned,run};
