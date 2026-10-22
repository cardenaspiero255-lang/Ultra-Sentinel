#!/usr/bin/env node
'use strict';
/* Read-only owner workflow adapter. Receives ORIGINAL GitHub API PR metadata,
 * exact added-file patch and SHA-checked original source from CI. */
const fs=require('node:fs'),path=require('node:path');
const {EXPECTED_BLOB}=require('../packages/quality-gates/c2-pr150-causal-matrix.cjs');
const {capturePr150OriginalDetectorBoundary}=
 require('../packages/quality-gates/c2-pr150-original-detector-boundary.cjs');
function read(file,maxBytes){
 if(!path.isAbsolute(file))throw Error('C2_PR150_DETECTOR_UNSAFE_IO');
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
    st.size<8||st.size>maxBytes)throw Error('C2_PR150_DETECTOR_UNSAFE_IO');
 return fs.readFileSync(file,'utf8');
}
function main(argv){
 if(argv.length!==5)throw Error('usage: cli META.json FILE.json TEST.json ORIGINAL.kt OUT.json');
 const [meta,patch,testFile,original,out]=argv;
 const inputs=[meta,patch,original,out].map(x=>path.resolve(x));
 if(inputs.some((x,i)=>!path.isAbsolute(argv[i])||inputs.indexOf(x)!==i)||
    fs.existsSync(out))throw Error('C2_PR150_DETECTOR_UNSAFE_IO');
 const result=capturePr150OriginalDetectorBoundary({
  pr:JSON.parse(read(meta,6000)),
  target:JSON.parse(read(patch,100000)),
  originalTest:JSON.parse(read(testFile,3000)),
  source:read(original,160000),
  expectedSourceBlob:EXPECTED_BLOB,expectedSourceLines:320
 });
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({
  status:result.status,coreVersion:result.coreVersion,
  exactBenignRuleMatch:result.benign.exactPredictionCount,
  findings:result.coreFindings.length,
  falsePositiveRate:null,newGoldLabels:0,sssPlusCertified:false
 })+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){
  process.stderr.write('C2_PR150_DETECTOR_BOUNDARY_BLOCKED '+String(e.message||e).slice(0,140)+'\n');
  process.exitCode=2;
 }
}
module.exports={main};
