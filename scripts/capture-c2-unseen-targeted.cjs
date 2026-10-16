#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {capturePinnedTargetDiffs}=
 require('../packages/quality-gates/c2-unseen-targeted-diff.cjs');
function fail(){throw Error('C2_TARGET_LOCAL_SOURCE_UNVERIFIED');}
function readJson(file){
 let s,bytes;
 try{s=fs.lstatSync(file);bytes=fs.readFileSync(file);}catch{fail();}
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||
  bytes.length<100||bytes.length>2*1024*1024)fail();
 try{return JSON.parse(bytes.toString('utf8'));}catch{fail();}
}
function main(root){
 if(typeof root!=='string'||!path.isAbsolute(root))fail();
 const comparisons={},contents={};
 for(const pr of [205,206,208]){
  const dir=path.join(root,String(pr));
  comparisons[pr]=readJson(path.join(dir,'compare.json'));
  contents[pr]=readJson(path.join(dir,'source.json'));
 }
 return capturePinnedTargetDiffs({comparisons,contents});
}
if(require.main===module){
 try{
  if(process.argv.length!==3)fail();
  process.stdout.write(JSON.stringify(main(process.argv[2]))+'\n');
 }catch{
  process.stderr.write('C2_TARGET_LOCAL_SOURCE_UNVERIFIED\n');
  process.exitCode=2;
 }
}
module.exports={main,readJson};
