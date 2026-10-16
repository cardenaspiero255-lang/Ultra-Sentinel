#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {auditCoreEligibility}=require('../packages/quality-gates/c2-core-eligibility.cjs');
function main(argv){
 if(!Array.isArray(argv)||argv.length!==1||!path.isAbsolute(argv[0]))
  throw Error('C2_CORE_ELIGIBILITY_BLOCKED');
 const stat=fs.lstatSync(argv[0]);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size<100||stat.size>1024*1024)
  throw Error('C2_CORE_ELIGIBILITY_BLOCKED');
 return auditCoreEligibility(JSON.parse(fs.readFileSync(argv[0],'utf8')));
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_CORE_ELIGIBILITY_BLOCKED\n');process.exitCode=2;}
}
module.exports={main};
