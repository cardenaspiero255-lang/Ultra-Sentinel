#!/usr/bin/env node
'use strict';
/*
 * Offline only. Consumes pinned metadata and/or read-only worker witness claims.
 * Does not read GitHub PR diffs, original source, predictions, or credentials.
 * Success = safely inventoried/quarantined, NEVER new GOLD.
 */
const fs=require('node:fs');
const path=require('node:path');
const {planC2BulkIntake,reviewC2BulkReceipts}=
 require('../packages/quality-gates/c2-bulk-evidence-intake.cjs');
const fail=()=>{throw Error('C2_BULK_INTAKE_BLOCKED');};
function read(file){
 if(typeof file!=='string'||!path.isAbsolute(file))fail();
 let st,bytes;
 try{st=fs.lstatSync(file);bytes=fs.readFileSync(file);}
 catch{fail();}
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
   bytes.length<2||bytes.length>2*1024*1024)fail();
 try{return JSON.parse(bytes.toString('utf8'));}
 catch{fail();}
}
function run(args){
 const [mode,input,other,...extra]=args;
 if(extra.length||!['plan','review'].includes(mode)||!input)fail();
 let report;
 if(mode==='plan'){
  if(other!==undefined)fail();
  const meta=read(input);
  // Exact four preregistered candidates are metadata-only, still unread.
  const manifest=meta.schema==='c2-four-external-pr-metadata/v1'?
   {schema:'c2-bulk-source-candidate-manifest/v1',
    cutoff:meta.cutoff,candidates:meta.candidates}:meta;
  report=planC2BulkIntake(manifest,{shards:16});
 }else{
  if(!other)fail();
  report=reviewC2BulkReceipts(read(input),read(other));
 }
 return report;
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(run(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_BULK_INTAKE_BLOCKED\n');process.exitCode=2;}
}
module.exports={run};
