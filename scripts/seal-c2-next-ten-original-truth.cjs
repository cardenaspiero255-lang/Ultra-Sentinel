#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {sealTenOriginalTruth}=require('../packages/quality-gates/c2-next-ten-original-truth.cjs');
function read(p){
 if(!path.isAbsolute(p))throw Error('C2_TEN_ORIGINAL_TRUTH_BLOCKED');
 const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<100||s.size>25000)
  throw Error('C2_TEN_ORIGINAL_TRUTH_BLOCKED');
 return JSON.parse(fs.readFileSync(p,'utf8'));
}
function main(argv){
 if(argv.length!==2)throw Error('C2_TEN_ORIGINAL_TRUTH_BLOCKED');
 return sealTenOriginalTruth({previous:read(argv[0]),witness:read(argv[1])});
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_TEN_ORIGINAL_TRUTH_BLOCKED\n');process.exitCode=2;}
}
module.exports={main};
