#!/usr/bin/env node
'use strict';
/* Read-only GitHub check-runs snapshots must be created by the separate
 * owner-authenticated gh CLI CI step. Never read external repo source here.
 */
const fs=require('node:fs'),path=require('node:path');
const {assessOriginalUpstreamCi}=require('../packages/quality-gates/c2-upstream-original-ci-receipts.cjs');
const {prepareIndependentOracleQuarantine}=require('../packages/quality-gates/c2-independent-oracle-quarantine.cjs');
const fail=()=>{throw Error('C2_UPSTREAM_ORIGINAL_CI_BLOCKED');};
function read(p,max){
 if(!path.isAbsolute(p))fail();
 const l=fs.lstatSync(p);
 if(!l.isFile()||l.isSymbolicLink()||l.nlink!==1||l.size<2||l.size>max)fail();
 return JSON.parse(fs.readFileSync(p,'utf8'));
}
function main(args){
 if(!Array.isArray(args)||args.length!==3||args.some(s=>typeof s!=='string'||!path.isAbsolute(s)))fail();
 const [manifestPath,dir,output]=args;
 if(new Set(args.map(s=>path.resolve(s))).size!==3||fs.existsSync(output)||
    !fs.statSync(dir).isDirectory())fail();
 const manifest=read(manifestPath,30000);
 const locked=prepareIndependentOracleQuarantine(manifest);
 const snapshots=manifest.candidates.map((c,i)=>{
  const baseChecks=read(path.join(dir,'candidate-'+i+'-base.json'),3000000);
  const headChecks=read(path.join(dir,'candidate-'+i+'-head.json'),3000000);
  return {
   repository:c.repository,pr:c.pr,baseSha:c.baseSha,headSha:c.headSha,
   base:{sha:c.baseSha,checks:baseChecks,fetchComplete:true},
   head:{sha:c.headSha,checks:headChecks,fetchComplete:true}
  };
 });
 const summary=assessOriginalUpstreamCi(manifest,{
  schema:'c2-independent-upstream-source-ci-input/v1',
  selectionSha256:locked.selectionSha256,snapshots
 });
 fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({candidateCount:summary.candidates,
  sourceCiCandidatesWithoutHeadChecks:summary.noHeadChecks,
  comparableNativeCheckNames:summary.comparableNativeChecks,
  comparableTestCheckNames:summary.comparableTestChecks,
  liveHeadDrifts:summary.prHeadDriftCount,
  independentlyAttestedOriginalOracles:summary.originalOraclesAttested,
  newGoldLabels:summary.newGoldLabels,certified:summary.sssPlusCertified})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 process.stderr.write('C2_UPSTREAM_ORIGINAL_CI_BLOCKED: '+String(e?.message||e)+'\n');process.exitCode=2;
}}
module.exports={main};
