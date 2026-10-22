#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {pilotMatrix,adjudicatePilot}=require('../packages/quality-gates/c2-pr189-sixteen-original-replays.cjs');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const POSITIVE='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED';
const XML_NAME=/^TEST-[0-9a-f]{24}\.xml$/;
const SHA256=/^[0-9a-f]{64}$/;
function fail(){throw Error('C2_PR189_RECEIPT_LOADING_BLOCKED');}
function safeDirectory(location){
 let stat;try{stat=fs.lstatSync(location);}catch{fail();}
 if(!stat.isDirectory()||stat.isSymbolicLink())fail();
}
function safeRead(location,maxBytes){
 let stat;try{stat=fs.lstatSync(location);}catch{fail();}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<1||stat.size>maxBytes)fail();
 try{return fs.readFileSync(location);}catch{fail();}
}
// These SHA checks authenticate integrity WITHIN the downloaded workflow artifact.
// They do not claim independent upstream checkout, patch or root-cause provenance.
function verifyJUnitEvidence(shardDir,receipt){
 if(receipt.status!==POSITIVE)return;
 const evidenceRoot=path.join(shardDir,'evidence');
 const taskDir=path.join(evidenceRoot,receipt.task);
 safeDirectory(evidenceRoot);safeDirectory(taskDir);
 const proofBytes=safeRead(path.join(taskDir,'original-transitions.json'),1_000_000);
 if(!SHA256.test(receipt.receiptSha256||'')||
    sha256(proofBytes)!==receipt.receiptSha256)fail();
 const proof=JSON.parse(proofBytes.toString('utf8'));
 if(!proof||Array.isArray(proof)||typeof proof!=='object'||
  proof.schema!=='ultra-sentinel-c2-upstream-junit-evidence/v1'||
  proof.task!==receipt.task||proof.status&&proof.status!==POSITIVE||
  proof.declaredBeforeCommit!==receipt.sourceCommitClaim||
  proof.declaredAfterCommit!==receipt.fixedCommitClaim||
  !Number.isSafeInteger(proof.verifiedFailToPassCount)||
  proof.verifiedFailToPassCount<1||proof.verifiedFailToPassCount>20000||
  !Number.isSafeInteger(receipt.candidateTransitions)||
  receipt.candidateTransitions!==proof.verifiedFailToPassCount)fail();
 for(const phase of ['before','after']){
  const source=path.join(taskDir,phase);
  safeDirectory(source);
  const junit=path.join(source,'junit');
  safeDirectory(junit);
  const index=proof[phase+'JUnitFiles'];
  if(!Array.isArray(index)||index.length===0||index.length>4096)fail();
  const expected=new Set();
  let totalBytes=0;
  for(const entry of index){
   if(!Array.isArray(entry)||entry.length!==2||
      !XML_NAME.test(entry[0])||!SHA256.test(entry[1])||expected.has(entry[0]))fail();
   expected.add(entry[0]);
   const data=safeRead(path.join(junit,entry[0]),2_097_152);
   totalBytes+=data.length;
   if(totalBytes>100_663_296||sha256(data)!==entry[1])fail();
  }
  const actual=fs.readdirSync(junit,{withFileTypes:true});
  if(actual.length!==expected.size||
    actual.some(item=>!expected.has(item.name)||!item.isFile()||item.isSymbolicLink()))fail();
 }
}
function triage(artifactRoot,output){
 if(!path.isAbsolute(artifactRoot)||!path.isAbsolute(output)||
  path.resolve(artifactRoot)===path.resolve(output)||fs.existsSync(output))fail();
 const st=fs.lstatSync(artifactRoot);
 if(!st.isDirectory()||st.isSymbolicLink())fail();
 const matrix=pilotMatrix();
 const expected=new Set(matrix.include.map(x=>'c2-pr189-'+x.id));
 const dirs=fs.readdirSync(artifactRoot,{withFileTypes:true});
 if(dirs.length!==expected.size)fail();
 const receipts=[];
 for(const dir of dirs){
  if(!dir.isDirectory()||dir.isSymbolicLink()||!expected.has(dir.name))fail();
  const location=path.join(artifactRoot,dir.name);
  const entries=fs.readdirSync(location,{withFileTypes:true});
  for(const item of entries){
   if(item.isSymbolicLink())fail();
   if(item.name==='evidence'&&item.isDirectory())continue;
   if(!item.isFile()||!item.name.endsWith('.json'))fail();
   const file=path.join(location,item.name),meta=fs.lstatSync(file);
   if(meta.nlink!==1||meta.size<25||meta.size>20000)fail();
   const receipt=JSON.parse(fs.readFileSync(file,'utf8'));
   if(!receipt||item.name!==receipt.task+'.json')fail();
   verifyJUnitEvidence(location,receipt);
   receipts.push(receipt);
  }
 }
 const report=adjudicatePilot(receipts);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:report.status,replayed:report.candidateCount,untouched:report.remainingUntouched,
  classified:report.counts,admitted:0,independentCauses:0,sssPlusCertified:false};
}
function main(args){
 if(args.length===1&&args[0]==='matrix'){
  process.stdout.write(JSON.stringify(pilotMatrix())+'\n');return;
 }
 if(args.length===3&&args[0]==='triage'){
  process.stdout.write(JSON.stringify(triage(args[1],args[2]))+'\n');return;
 }
 fail();
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(e){process.stderr.write(String(e.message||e).slice(0,180)+'\n');process.exitCode=2;}
}
module.exports={main,triage};
