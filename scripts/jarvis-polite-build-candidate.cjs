#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {makePoliteCandidate}=require('../packages/investigation/jarvis-polite-candidate.cjs');
function main(root){
 if(typeof root!=='string'||!path.isAbsolute(root)||fs.realpathSync(root)!==root)
  throw Error('POLITE_CANDIDATE_ROOT');
 function read(name){
  const file=path.join(root,'input',name),stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size<1||stat.size>60000)
   throw Error('POLITE_CANDIDATE_INPUT');
  return fs.readFileSync(file,'utf8');
 }
 const result=makePoliteCandidate({gate:read('gate.kt'),policy:read('policy.kt')});
 const out=path.join(root,'candidate');
 fs.mkdirSync(out,{mode:0o700});
 fs.writeFileSync(path.join(out,'gate.kt'),result.gate,{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(out,'policy.kt'),result.policy,{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({candidateGateBlob:result.gateBlob,
  candidatePolicyBlob:result.policyBlob,executionVerified:false,remoteWrites:false})+'\n');
}
if(require.main===module)try{main(process.argv[2]);}catch{
 process.stderr.write('POLITE_CANDIDATE_BUILD_BLOCKED\n');process.exitCode=2;
}
module.exports={main};
