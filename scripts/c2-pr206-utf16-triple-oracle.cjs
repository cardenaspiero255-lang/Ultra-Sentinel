#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {makeImmutableCounterfactual,compareFrozenCore,adjudicateKotlinTriple}=
 require('../packages/quality-gates/c2-pr206-utf16-triple-oracle.cjs');
const fail=()=>{throw Error('C2_PR206_TRIPLE_REJECTED');};
function read(file,limit){
 if(!path.isAbsolute(file))fail();
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
    st.size<2||st.size>limit)fail();
 return fs.readFileSync(file,'utf8');
}
function out(file,bytes){
 if(!path.isAbsolute(file)||fs.existsSync(file))fail();
 fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
}
function main(args){
 if(args.length<1)fail();
 const [mode,...files]=args;
 if(!['prepare','adjudicate'].includes(mode)||
    files.length!==(mode==='prepare'?3:5)||
    files.some(x=>!path.isAbsolute(x))||
    new Set(files.map(x=>path.resolve(x))).size!==files.length)fail();
 if(mode==='prepare'){
  const original=read(files[0],100000);
  const patch=makeImmutableCounterfactual(original);
  out(files[1],patch.fixedSource);
  out(files[2],JSON.stringify({
   schema:patch.schema,status:patch.status,originalSourceBlobSha:patch.originalBlobSha,
   counterfactualSourceBlobSha:patch.counterfactualBlobSha,
   changedSites:patch.changedSites,counterfactualUpstreamCommitCertified:false,
   newGoldLabels:0
  },null,2)+'\n');
  return;
 }
 const [originalPath,correctedPath,beforePath,afterPath,reportPath]=files;
 const original=read(originalPath,100000);
 const corrected=read(correctedPath,120000);
 const derivative=makeImmutableCounterfactual(original);
 if(derivative.fixedSource!==corrected)fail();
 const detected=compareFrozenCore(original,corrected);
 const behavior=adjudicateKotlinTriple(derivative,
  JSON.parse(read(beforePath,2000)),JSON.parse(read(afterPath,2000)));
 const report={schema:'c2-pr206-original-counterfactual-jvm-joined-core/v1',
  status:'VALIDATED_ORIGINAL_BUG_AND_DERIVED_FIX_DEVELOPMENT_ONLY',
  observedSource:behavior.originalSourceBlobSha,
  derivedSource:behavior.counterfactualSourceBlobSha,
  core:detected,behavior,
  realUpstreamFixProven:false,independentBenignSourceLabels:0,
  admittedGoldLabels:0,scoredFalsePositives:0,falsePositiveRate:null,
  precision:null,recall:null,f1:null,sssPlusCertified:false};
 out(reportPath,JSON.stringify(report,null,2)+'\n');
 process.stdout.write(JSON.stringify({
  originalLine:detected.originalLine,
  exactOriginalCoreAlerts:detected.originalExactRulePathLineCount,
  correctedCoreAlerts:detected.counterfactualSameRuleCount,
  realJVMTransitions:behavior.behavioralTransitions,
  benignInputChecks:behavior.benignInputControlsPassed,
  scoredFalsePositives:0,certified:false
 })+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 process.stderr.write('C2_PR206_TRIPLE_REJECTED '+String(e.stack||e).slice(0,700)+'\n');
 process.exitCode=2;}}
module.exports={main};
