#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {assessFrozenC2Benchmark}=
 require('../packages/quality-gates/c2-frozen-benchmark-gate.cjs');
function evaluateFile(file){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('C2_FROZEN_INPUT_BLOCKED');
 let stat,bytes;
 try{stat=fs.lstatSync(file);bytes=fs.readFileSync(file);}
 catch{throw Error('C2_FROZEN_INPUT_BLOCKED');}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  bytes.length<10||bytes.length>2*1024*1024)
  throw Error('C2_FROZEN_INPUT_BLOCKED');
 let parsed;
 try{parsed=JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('C2_FROZEN_INPUT_BLOCKED');}
 return assessFrozenC2Benchmark(parsed);
}
if(require.main===module){
 try{
  const report=evaluateFile(process.argv[2]);
  process.stdout.write(JSON.stringify(report)+'\n');
  // Exit 2 even for a perfect numerical diagnostic: external evidence
  // authentication and official Triple S+ certification are NOT complete.
  process.exitCode=2;
 }catch{
  process.stderr.write('C2_FROZEN_INPUT_BLOCKED\n');
  process.exitCode=2;
 }
}
module.exports={evaluateFile};
