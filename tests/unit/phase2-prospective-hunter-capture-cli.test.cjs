'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {capture}=require('../../scripts/phase2-capture-frozen-hunter.cjs');
const repo=path.resolve(__dirname,'../..');
const manifest=path.join(repo,'docs/quality/PHASE2-PROSPECTIVE-HUNTER-FREEZE-20261111.json');
function evidence(){
 return {
  numeric:{schema:'ultra-sentinel-blind-numeric/v1',
   status:'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED',findings:[],filesScanned:9,skippedOversized:0,
   skippedNoncanonical:0,sourceByteIntegrityVerified:true,compilerAuthenticated:false,
   sourceRepositoryAuthenticated:false,originalOracleVerified:false,repairAuthorized:false,
   remoteWrites:false,mergeAllowed:false},
  codec:{schema:'ultra-sentinel-codec-integrity-hunter/v1',
   status:'NO_CODEC_INTEGRITY_HYPOTHESES_NOT_CERTIFIED',findings:[],filesScanned:9,
   sourceByteIntegrityVerified:true,sourceRepositoryAuthenticated:false,
   originalFunctionalOracleVerified:false,causalityVerified:false,generalizationVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false},
  identity:{schema:'ultra-sentinel-identity-delimiter-hunter/v1',
   status:'NO_IDENTITY_DELIMITER_HYPOTHESES_NOT_CERTIFIED',findings:[],filesScanned:9,
   sourceByteIntegrityVerified:true,sourceRepositoryAuthenticated:false,
   originalFunctionalOracleVerified:false,causalityVerified:false,generalizationVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false}
 };
}
function paths(root){
 const refs=evidence(),p={};
 for(const [key,value] of Object.entries(refs)){
  p[key]=path.join(root,key+'.json');fs.writeFileSync(p[key],JSON.stringify(value));
 }
 return p;
}
test('post-worker CLI seals only metadata and rejects reuse of output path',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prospective-capture-'));
 try{
  const p=paths(dir),out=path.join(dir,'receipt.json');
  const r=capture([manifest,p.numeric,p.codec,p.identity,out]);
  assert.equal(r.status,'PREDICTIONS_SEALED_NO_INDEPENDENT_TRUTH');
  assert.equal(r.filesCovered,9);
  assert.equal(fs.statSync(out).mode&0o777,0o600);
  const read=JSON.parse(fs.readFileSync(out,'utf8'));
  assert.equal(read.predictionDigest,r.predictionDigest);
  assert.equal(read.falsePositiveCount,null);
  assert.throws(()=>capture([manifest,p.numeric,p.codec,p.identity,out]),/CAPTURE_OUTPUT_EXISTS/);
 }finally{fs.rmSync(dir,{force:true,recursive:true});}
});
test('failed predictions create no output or false positives',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prospective-capture-'));
 try{
  const p=paths(dir),out=path.join(dir,'receipt.json');
  fs.writeFileSync(p.identity,JSON.stringify({...evidence().identity,filesScanned:8}));
  assert.throws(()=>capture([manifest,p.numeric,p.codec,p.identity,out]),/UNTRUSTED_HUNTER_PREDICTIONS/);
  assert.equal(fs.existsSync(out),false);
  fs.unlinkSync(p.identity);
  assert.throws(()=>capture([manifest,p.numeric,p.codec,p.identity,out]));
  assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(dir,{force:true,recursive:true});}
});
test('CLI neither exports source code nor returns success on a forged manifest',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prospective-capture-'));
 try{
  const p=paths(dir),out=path.join(dir,'receipt.json');
  const args=[path.join(repo,'scripts/phase2-capture-frozen-hunter.cjs'),
   manifest,p.numeric,p.codec,p.identity,out];
  const executed=spawnSync(process.execPath,args,{encoding:'utf8'});
  assert.equal(executed.status,0,executed.stderr);
  assert.match(executed.stdout,/FROZEN_HUNTER_UNSCORED_PREDICTIONS_SEALED/);
  const contents=fs.readFileSync(out,'utf8');
  assert.equal(contents.includes('candidateSource'),false);
  assert.equal(contents.includes('package com.google'),false);
  fs.unlinkSync(out);
  const fake=path.join(dir,'manifest.json');
  fs.copyFileSync(manifest,fake);fs.appendFileSync(fake,' ');
  const bad=spawnSync(process.execPath,[args[0],fake,p.numeric,p.codec,p.identity,out],{encoding:'utf8'});
  assert.equal(bad.status,1);
  assert.match(bad.stderr,/PROSPECTIVE_CAPTURE_BLOCKED/);
  assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(dir,{force:true,recursive:true});}
});
