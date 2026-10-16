#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {TRUTH_SHA256,evaluateFirstUnseenHoldout}=
 require('../packages/quality-gates/c2-unseen-unblind-evaluator.cjs');
function readJson(file,{max=20000,sha256=null}={}){
 if(typeof file!=='string'||!path.isAbsolute(file))
  throw Error('C2_UNSEEN_INPUT_UNVERIFIED');
 let st,bytes;
 try{st=fs.lstatSync(file);bytes=fs.readFileSync(file);}
 catch{throw Error('C2_UNSEEN_INPUT_UNVERIFIED');}
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
  bytes.length<100||bytes.length>max)throw Error('C2_UNSEEN_INPUT_UNVERIFIED');
 if(sha256&&crypto.createHash('sha256').update(bytes).digest('hex')!==sha256)
  throw Error('C2_UNSEEN_INPUT_UNVERIFIED');
 try{return JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('C2_UNSEEN_INPUT_UNVERIFIED');}
}
function main(args){
 if(!Array.isArray(args)||args.length!==2)
  throw Error('C2_UNSEEN_INPUT_UNVERIFIED');
 return evaluateFirstUnseenHoldout({
  truth:readJson(args[0],{sha256:TRUTH_SHA256}),
  candidate:readJson(args[1],{max:25000})
 });
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch{
  process.stderr.write('C2_UNSEEN_FIRST_UNBLIND_BLOCKED: INPUT_OR_COVERAGE\n');
  process.exitCode=2;
 }
}
module.exports={readJson,main};
