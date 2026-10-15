#!/usr/bin/env node
'use strict';
/* Exact immutable C2 evidence replay. Never upgrades an incomplete benchmark. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {evaluateOwnerObservedC2}=
 require('../packages/quality-gates/c2-owner-observed-benchmark.cjs');
const EXPECTED=Object.freeze({
 candidate:'134ac2f6e71bb6f9e3ab76d76c82a26a1d09c63c32b8b2089b707212dcdea931',
 witness:'42628481dc3cea6f44b15accc376ad33ea3afb9dc9e04667b9277f973219f711',
 news:'26f3f52c45302abf5a27bc0fa333599307f9867c6fd61e4d45d4ed3e9bcaa895'
});
function fail(){throw Error('UNVERIFIED_C2_EVIDENCE_FILE');}
function readPinnedJson(filename,digest){
 if(typeof filename!=='string'||!path.isAbsolute(filename))fail();
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<100||stat.size>100000)fail();
 const bytes=fs.readFileSync(filename);
 const actual=crypto.createHash('sha256').update(bytes).digest('hex');
 if(actual!==digest)fail();
 try{return JSON.parse(bytes.toString('utf8'));}catch{fail();}
}
function evaluateFromFiles(candidatePath,witnessPath,newsPath){
 const capture=readPinnedJson(candidatePath,EXPECTED.candidate);
 const witness=readPinnedJson(witnessPath,EXPECTED.witness);
 const newsWitness=readPinnedJson(newsPath,EXPECTED.news);
 return evaluateOwnerObservedC2({capture,witness,newsWitness});
}
if(require.main===module){
 try{
  if(process.argv.length!==5)fail();
  const result=evaluateFromFiles(process.argv[2],process.argv[3],process.argv[4]);
  process.stdout.write(JSON.stringify(result)+'\n');
  // Exit zero means accurate reporting, NOT quality certification.
 }catch{
  process.stderr.write('C2_OWNER_BENCHMARK_BLOCKED: UNVERIFIED_EVIDENCE\n');
  process.exitCode=2;
 }
}
module.exports={EXPECTED,readPinnedJson,evaluateFromFiles};
