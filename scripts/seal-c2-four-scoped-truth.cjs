#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {combineSourceTruth}=require('../packages/quality-gates/c2-next-four-scoped-truth.cjs');
function readEvidence(p){
 if(typeof p!=='string'||!path.isAbsolute(p))throw Error('C2_FOUR_SOURCE_TRUTH_BLOCKED');
 let st,raw;
 try{st=fs.lstatSync(p);raw=fs.readFileSync(p);}
 catch{throw Error('C2_FOUR_SOURCE_TRUTH_BLOCKED');}
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
 raw.length<200||raw.length>20000)throw Error('C2_FOUR_SOURCE_TRUTH_BLOCKED');
 try{return JSON.parse(raw.toString('utf8'));}
 catch{throw Error('C2_FOUR_SOURCE_TRUTH_BLOCKED');}
}
function main(args){
 if(!Array.isArray(args)||args.length!==2)throw Error('C2_FOUR_SOURCE_TRUTH_BLOCKED');
 return combineSourceTruth({prior:readEvidence(args[0]),negativeWitness:readEvidence(args[1])});
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_FOUR_SOURCE_TRUTH_BLOCKED\n');process.exitCode=2;}
}
module.exports={main,readEvidence};
