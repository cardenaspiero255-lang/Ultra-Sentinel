#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {NEW_LOCK}=require('../packages/quality-gates/c2-next-holdout.cjs');
const {auditExcludedSourceScope,verifyOriginalExcludedHeadBlobs}=require('../packages/quality-gates/c2-excluded-file-audit.cjs');
function read(p){
 if(!path.isAbsolute(p))throw Error('C2_EXCLUDED_SCOPE_BLOCKED');
 const stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<100||stat.size>20*1024*1024)throw Error('C2_EXCLUDED_SCOPE_BLOCKED');
 return JSON.parse(fs.readFileSync(p,'utf8'));
}
function main(argv){
 if(!Array.isArray(argv)||argv.length!==2||!path.isAbsolute(argv[0])||!path.isAbsolute(argv[1]))
  throw Error('C2_EXCLUDED_SCOPE_BLOCKED');
 const list=NEW_LOCK.cases.map(c=>read(path.join(argv[0],'pr-'+c.pr+'.json')));
 return verifyOriginalExcludedHeadBlobs(auditExcludedSourceScope(list),argv[1]);
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_EXCLUDED_SCOPE_BLOCKED\n');process.exitCode=2;}
}
module.exports={main};
