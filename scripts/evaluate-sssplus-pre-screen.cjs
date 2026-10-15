'use strict';
const fs=require('node:fs'),path=require('node:path');
const {assessSssPlusPreScreen}=require('../packages/quality-gates/sssplus-pre-screen.cjs');
function evaluateFile(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))
  throw Error('ABSOLUTE_CAMPAIGN_FILE_REQUIRED');
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
    stat.size<2||stat.size>2*1024*1024)
  throw Error('UNSAFE_PARITY_CAMPAIGN_FILE');
 const payload=JSON.parse(fs.readFileSync(filename,'utf8'));
 return assessSssPlusPreScreen(payload);
}
if(require.main===module){
 try{
  const report=evaluateFile(process.argv[2]);
  process.stdout.write(JSON.stringify(report)+'\n');
  // 0 means numerical pre-screen success ONLY, NEVER deployment approval.
  if(!report.internalNumericalTargetsObserved)process.exitCode=2;
 }catch{
  process.stderr.write('SSSPLUS_PRESCREEN_INVALID_OR_INCOMPLETE\n');
  process.exitCode=1;
 }
}
module.exports={evaluateFile};
