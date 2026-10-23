#!/usr/bin/env node
'use strict';
// Source-only witness. No detector imports, baselines or candidate predictions.
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const {assessSourceOnlyObservation}=require('../packages/quality-gates/c2-tasks-source-only-observation.cjs');
const HEAD='3936c221aea180b795085d7402286373b5d3f6d2';
const BASE='5624816cac6ecab701969d24e6d3387ccd21a773';
const BLOB='0e472cfd73510ab11a396ee5eba9968d57172050';
const FILE='app/src/main/java/org/tasks/notifications/Throttle.kt';
const blocked=()=>{throw Error('C2_SOURCE_ONLY_ORACLE_BLOCKED');};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function git(dir,...argv){
 return execFileSync('git',['-C',dir,...argv],{encoding:'utf8',timeout:30000,maxBuffer:10000}).trim();
}
function main(args){
 if(!Array.isArray(args)||args.length!==3||args.some(x=>typeof x!=='string'||!path.isAbsolute(x)))blocked();
 const [checkout,observedPath,reportPath]=args;
 if(new Set(args.map(x=>path.resolve(x))).size!==3||fs.existsSync(reportPath))blocked();
 if(git(checkout,'rev-parse','HEAD')!==HEAD||git(checkout,'rev-parse',HEAD+':'+FILE)!==BLOB)blocked();
 git(checkout,'merge-base','--is-ancestor',BASE,HEAD);
 const source=path.join(checkout,FILE);
 const stat=fs.lstatSync(source);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size<100||stat.size>50000)blocked();
 const original=fs.readFileSync(source);
 const blobSha=createHash('sha1').update('blob '+original.length+'\0').update(original).digest('hex');
 if(blobSha!==BLOB)blocked();
 const st=fs.lstatSync(observedPath);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<20||st.size>3000)blocked();
 const bytes=fs.readFileSync(observedPath);
 const observed=JSON.parse(bytes.toString('utf8'));
 const assessment=assessSourceOnlyObservation(observed);
 const receipt={
  ...assessment,
  sourceRepository:'tasks/tasks',originalHeadSha:HEAD,originalBaseSha:BASE,
  originalSourcePath:FILE,originalSourceGitBlob:BLOB,
  originalSourceContentSha256:digest(original),runtimeWitnessSha256:digest(bytes),
  originalSourceVerifiedByGitInThisProcess:true,
  runtimeExecutionAuthenticatedByThisProcess:false,
  originalSourceIncludedInArtifact:false,
  trainingExcludedAsKnownDevelopment:true
 };
 fs.writeFileSync(reportPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({status:assessment.status,originalSourceGitBlob:BLOB,
  sourceOnly:true,labelsAdded:0})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 process.stderr.write('C2_SOURCE_ONLY_ORACLE_BLOCKED: '+String(e?.message||e)+'\n');
 process.exitCode=2;
}}
module.exports={main};
