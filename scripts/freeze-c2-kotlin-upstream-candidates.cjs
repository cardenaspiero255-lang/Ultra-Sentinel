#!/usr/bin/env node
'use strict';
// Reads a GitHub REST task-directory response already fetched at pinned SHA.
// Does not fetch or execute any upstream code, tests, patches or predictions.
const fs=require('node:fs'),path=require('node:path');
const {metadataOnlyCandidateIndex}=require('../packages/quality-gates/c2-kotlin-upstream-candidate-index.cjs');
function fail(){throw Error('C2_KOTLIN_CANDIDATE_FREEZE_BLOCKED');}
function safeFile(p,read){
 if(typeof p!=='string'||!path.isAbsolute(p))fail();
 let stat;
 try{stat=fs.lstatSync(p);}catch{if(read)fail();return;}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)fail();
 if(read&&(stat.size<2000||stat.size>1024*1024))fail();
 if(!read)fail();
 return fs.readFileSync(p);
}
function run(argv){
 if(!Array.isArray(argv)||argv.length!==2)fail();
 const [input,output]=argv;
 if(typeof output!=='string'||!path.isAbsolute(output)||
   path.resolve(output)===path.resolve(input)||fs.existsSync(output))fail();
 const raw=safeFile(input,true);
 const report=metadataOnlyCandidateIndex(raw);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:report.status,candidates:report.candidateCount,
  projects:report.repositoryCount,labelsAdded:report.groundTruthSourceLabels,
  positiveLabels:0,negativeLabels:0,blindHoldout:false,
  indexSha256:report.indexSha256};
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(run(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_KOTLIN_CANDIDATE_FREEZE_BLOCKED\n');process.exitCode=2;}
}
module.exports={run};
