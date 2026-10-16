#!/usr/bin/env node
'use strict';
/** Input artifacts pinned by SHA256; CLI never reads model predictions. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {EVIDENCE_SHA256,sealUnseenTruth}=
 require('../packages/quality-gates/c2-unseen-truth-binder.cjs');
function readPinned(file,expectedHash){
 if(typeof file!=='string'||!path.isAbsolute(file))
  throw Error('C2_UNSEEN_TRUTH_INPUT_BLOCKED');
 let stat,bytes;
 try{stat=fs.lstatSync(file);bytes=fs.readFileSync(file);}
 catch{throw Error('C2_UNSEEN_TRUTH_INPUT_BLOCKED');}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  bytes.length<100||bytes.length>20000||
  crypto.createHash('sha256').update(bytes).digest('hex')!==expectedHash)
  throw Error('C2_UNSEEN_TRUTH_INPUT_BLOCKED');
 try{return JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('C2_UNSEEN_TRUTH_INPUT_BLOCKED');}
}
function run(args){
 if(!Array.isArray(args)||args.length!==3)
  throw Error('C2_UNSEEN_TRUTH_INPUT_BLOCKED');
 const [freeze,positive,benign]=[
  readPinned(args[0],EVIDENCE_SHA256.freeze),
  readPinned(args[1],EVIDENCE_SHA256.positive),
  readPinned(args[2],EVIDENCE_SHA256.benign)
 ];
 return sealUnseenTruth({freeze,positive,benign});
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(run(process.argv.slice(2)))+'\n');}
 catch{
  process.stderr.write('C2_UNSEEN_TRUTH_BLOCKED: INVALID_OR_UNVERIFIED_EVIDENCE\n');
  process.exitCode=2;
 }
}
module.exports={readPinned,run};
