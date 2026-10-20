#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {buildCausalVariants,adjudicateMatrix,EXPECTED_BLOB,hashBlob}=require('../packages/quality-gates/c2-pr150-causal-matrix.cjs');
const VARIANTS=['original','historyOnly','externalOnly','both'];
function source(file){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size<6000||stat.size>100000)
  throw Error('C2_PR150_SOURCE_NOT_AUTHENTIC');
 return fs.readFileSync(file,'utf8');
}
function prepare(originalFile,dir){
 const contents=buildCausalVariants(source(originalFile));
 fs.mkdirSync(dir,{recursive:false,mode:0o700});
 const manifest={schema:'c2-pr150-causal-matrix-sources/v1',sourceGitBlob:EXPECTED_BLOB,variants:{}};
 for(const key of VARIANTS){
  const folder=path.join(dir,key);
  fs.mkdirSync(folder,{mode:0o700});
  fs.writeFileSync(path.join(folder,'SmartRecommendationExplanation.kt'),contents[key],{flag:'wx',mode:0o600});
  manifest.variants[key]={gitBlob:hashBlob(contents[key]),
   differsFromOriginal:key!=='original'};
 }
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({originalBlob:EXPECTED_BLOB,variants:VARIANTS})+'\n');
}
function verify(reportDir,output){
 const m=JSON.parse(sourceManifest(path.join(reportDir,'manifest.json')));
 if(m.schema!=='c2-pr150-causal-matrix-sources/v1'||m.sourceGitBlob!==EXPECTED_BLOB||
    Object.keys(m.variants||{}).length!==4)throw Error('C2_PR150_MANIFEST_INVALID');
 const original=source(path.join(reportDir,'original','SmartRecommendationExplanation.kt'));
 const variants=buildCausalVariants(original);
 const findings={};
 for(const variant of VARIANTS){
  const file=path.join(reportDir,variant,'SmartRecommendationExplanation.kt');
  const fromDisk=source(file);
  if(fromDisk!==variants[variant]||
   m.variants[variant]?.gitBlob!==hashBlob(fromDisk)||
   m.variants[variant]?.differsFromOriginal!==(variant!=='original'))
   throw Error('C2_PR150_VARIANT_MISMATCH');
  const jsonFile=path.join(reportDir,variant,'result.json');
  const stat=fs.lstatSync(jsonFile);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>2000)throw Error('C2_PR150_RUNTIME_JSON_INVALID');
  findings[variant]=JSON.parse(fs.readFileSync(jsonFile,'utf8'));
 }
 const verdict=adjudicateMatrix(findings);
 fs.writeFileSync(output,JSON.stringify({...verdict,sourceBlobs:m.variants},null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({verdict:verdict.verdict,originalDefects:2,
    twoIndependentRootCausesCertified:false,newLabels:0})+'\n');
}
function sourceManifest(file){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>2000)throw Error('C2_PR150_MANIFEST_NOT_SAFE');
 return fs.readFileSync(file,'utf8');
}
if(require.main===module){
 try{
  const [cmd,...args]=process.argv.slice(2);
  if(cmd==='prepare'&&args.length===2)prepare(...args);
  else if(cmd==='verify'&&args.length===2)verify(...args);
  else throw Error('usage: c2-pr150-causal-cross-interventions.cjs prepare SOURCE NEW_DIR | verify TEST_DIR NEW_OUTPUT');
 }catch(err){
  process.stderr.write('C2_PR150_CAUSAL_MATRIX_BLOCKED: '+String(err.message||err).slice(0,160)+'\n');
  process.exitCode=2;
 }
}
module.exports={prepare,verify};
