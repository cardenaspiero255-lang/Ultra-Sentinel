#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {sealSevenOriginalTruth}=require('../packages/quality-gates/c2-next-seven-source-truth.cjs');
function evidence(p){
 if(typeof p!=='string'||!path.isAbsolute(p))throw Error('C2_SEVEN_ORIGINAL_TRUTH_BLOCKED');
 let st,data;
 try{st=fs.lstatSync(p);data=fs.readFileSync(p);}
 catch{throw Error('C2_SEVEN_ORIGINAL_TRUTH_BLOCKED');}
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
  data.length<100||data.length>20000)throw Error('C2_SEVEN_ORIGINAL_TRUTH_BLOCKED');
 try{return JSON.parse(data.toString('utf8'));}
 catch{throw Error('C2_SEVEN_ORIGINAL_TRUTH_BLOCKED');}
}
function main(args){
 if(!Array.isArray(args)||args.length!==2)throw Error('C2_SEVEN_ORIGINAL_TRUTH_BLOCKED');
 return sealSevenOriginalTruth({previous:evidence(args[0]),witness:evidence(args[1])});
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_SEVEN_ORIGINAL_TRUTH_BLOCKED\n');process.exitCode=2;}
}
module.exports={main,evidence};
