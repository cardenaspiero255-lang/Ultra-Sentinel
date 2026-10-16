#!/usr/bin/env node
'use strict';
// Offline, fail-closed verifier for eight already authenticated GitHub compare JSON files.
const fs=require('node:fs');
const path=require('node:path');
const {verifyEightSourceCompares}=require('../packages/quality-gates/c2-source-universe.cjs');
const {NEW_LOCK}=require('../packages/quality-gates/c2-next-holdout.cjs');
function readOne(p){
 if(!path.isAbsolute(p))throw Error('C2_SOURCE_UNIVERSE_BLOCKED');
 const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>20*1024*1024||s.size<100)
  throw Error('C2_SOURCE_UNIVERSE_BLOCKED');
 return JSON.parse(fs.readFileSync(p,'utf8'));
}
function main(argv){
 if(argv.length!==1||!path.isAbsolute(argv[0]))throw Error('C2_SOURCE_UNIVERSE_BLOCKED');
 return verifyEightSourceCompares(NEW_LOCK.cases.map(c=>
  readOne(path.join(argv[0],'pr-'+c.pr+'.json'))));
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_SOURCE_UNIVERSE_BLOCKED\n');process.exitCode=2;}
}
module.exports={main};
