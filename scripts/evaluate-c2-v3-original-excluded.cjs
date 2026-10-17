#!/usr/bin/env node
'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {NEW_LOCK}=require('../packages/quality-gates/c2-next-holdout.cjs');
const {verifyEightSourceCompares}=require('../packages/quality-gates/c2-source-universe.cjs');
const {eligibleForFrozenCore}=require('../packages/quality-gates/c2-core-eligibility.cjs');
const {analyzeV3,scopeKind}=require('../packages/core/ultra_sentinel_scope_v3.cjs');
function fail(){throw Error('C2_V3_SOURCE_SCOPE_BLOCKED');}
function jsonFile(p){
 if(!path.isAbsolute(p))fail();
 let stat;try{stat=fs.lstatSync(p);}catch{fail();}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<50||stat.size>20*1024*1024)fail();
 try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{fail();}
}
function sourceText(root,pr,p){
 if(!/^[A-Za-z0-9_./-]+$/.test(p)||p.split('/').includes('..')||p.includes('//'))fail();
 const file=path.resolve(root,'pr-'+pr,'head',p);
 if(!file.startsWith(root+path.sep))fail();
 try{
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
    stat.size<1||stat.size>8*1024*1024||fs.realpathSync(file)!==file)fail();
  const buf=fs.readFileSync(file);
  if(buf.includes(0))fail();
  const s=new TextDecoder('utf8',{fatal:true}).decode(buf);
  if(!Buffer.from(s,'utf8').equals(buf))fail();
  return s;
 }catch{fail();}
}
function evaluateC2V3Originals(comparesDir,sourceDir){
 if(typeof comparesDir!=='string'||typeof sourceDir!=='string'||
   !path.isAbsolute(comparesDir)||!path.isAbsolute(sourceDir))fail();
 let realRoot;
 try{
  const stat=fs.lstatSync(sourceDir);
  if(!stat.isDirectory()||stat.isSymbolicLink())fail();
  realRoot=fs.realpathSync(sourceDir);
 }catch{fail();}
 let comparisons=NEW_LOCK.cases.map(c=>jsonFile(path.join(comparesDir,'pr-'+c.pr+'.json')));
 let manifest;
 try{manifest=verifyEightSourceCompares(comparisons)}catch{fail();}
 const prs=[];let verified=0,inspected=0,totalExcluded=0;
 for(let i=0;i<NEW_LOCK.cases.length;i++){
  const c=NEW_LOCK.cases[i],cmp=comparisons[i],supplemental=[];
  for(const f of cmp.files){
   if(eligibleForFrozenCore(f.filename))continue;
   totalExcluded++;
   if(!scopeKind(f.filename)||f.status==='removed')fail();
   supplemental.push({...f,fullSource:sourceText(realRoot,c.pr,f.filename)});
  }
  const receipt=analyzeV3(supplemental);
  if(receipt.verdict==='INCOMPLETE'||receipt.scope.omitted!==0||
    receipt.scope.originalBlobVerified!==supplemental.length||
    receipt.scope.semanticBehaviorVerified!==0||
    receipt.sourceFindingsAreVerifiedDefects!==false||
    receipt.legacyBenchmarksComparable!==false)fail();
  verified+=receipt.scope.originalBlobVerified;
  inspected+=receipt.scope.analyzedAddedDiffs;
  prs.push({pr:c.pr,baseSha:c.baseSha,headSha:c.headSha,
   originalFilesVerified:receipt.scope.originalBlobVerified,
   structuralDiffsAnalyzed:receipt.scope.analyzedAddedDiffs,
   advisoryFindings:receipt.findings,semanticBehaviorVerified:0});
 }
 if(totalExcluded!==88||verified!==88||manifest.changedFileEntries!==241)fail();
 const body={
  schema:'ultra-sentinel-c2-v3-original-excluded-preview/v1',
  repository:NEW_LOCK.repository,
  sourceInventorySha256:manifest.sourceInventorySha256,
  engine:'ultra-sentinel-scope-v3-experimental',
  frozenCoreShaUnchanged:'db29f94be1e0afb791a241d26f449695df0eafd0',
  totalHistoricalEntries:241,
  frozenCoreMaxEligible:153,previouslyExcluded:88,
  originalFilesVerified:verified,
  structuralDiffsAnalyzed:inspected,
  omitted:0,prs,semanticBehaviorVerified:0,
  originalTruthLabelsAdded:0,
  legacyCandidateParityProven:false,
  sourceCodeBehaviorExecuted:false,
  precision:null,recall:null,f1:null,
  certification:'NOT_CERTIFIED',
  status:'V3_SOURCE_PATCH_ADVISORY_PREVIEW_ONLY'
 };
 return Object.freeze({...body,receiptSha256:crypto.createHash('sha256')
  .update(JSON.stringify(body)).digest('hex')});
}
if(require.main===module){
 try{
  if(process.argv.length!==4)fail();
  process.stdout.write(JSON.stringify(evaluateC2V3Originals(process.argv[2],process.argv[3]))+'\n');
 }catch{process.stderr.write('C2_V3_SOURCE_SCOPE_BLOCKED\n');process.exitCode=2;}
}
module.exports={evaluateC2V3Originals};
