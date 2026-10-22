#!/usr/bin/env node
'use strict';
/* Owner workflow executes immutable external Kotlin and reads only run results.
 * Do not use results in blind holdout or publish external source in artifacts. */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {verifyPinnedTasksSource,HEAD,BASE,BLOB,PATH}=require('../packages/quality-gates/c2-external-tasks-throttle.cjs');
const fail=()=>{throw Error('C2_TASKS_EXTERNAL_BLOCKED');};
function git(dir,...args){
 return execFileSync('git',['-C',dir,...args],{encoding:'utf8',timeout:30000,maxBuffer:75000}).trimEnd();
}
function main(args){
 if(!Array.isArray(args)||args.length!==3||args.some(x=>!path.isAbsolute(x)))fail();
 const [checkout,behaviorPath,reportPath]=args;
 if(new Set(args.map(x=>path.resolve(x))).size!==3||fs.existsSync(reportPath))fail();
 if(git(checkout,'rev-parse','HEAD')!==HEAD||
    git(checkout,'rev-parse',HEAD+':'+PATH)!==BLOB)fail();
 git(checkout,'merge-base','--is-ancestor',BASE,HEAD);
 const p=path.join(checkout,PATH);
 const meta=fs.lstatSync(p);
 if(!meta.isFile()||meta.isSymbolicLink()||meta.nlink!==1||meta.size<100||meta.size>50000)fail();
 const txt=fs.readFileSync(p,'utf8');
 const raw=git(checkout,'diff','--no-ext-diff','--no-renames','--unified=3',BASE,HEAD,'--',PATH);
 const start=raw.indexOf('@@ ');
 if(start<0||!raw.startsWith('diff --git a/'+PATH+' b/'+PATH)||raw.indexOf('@@ ',start+3)>=0)fail();
 const changed=git(checkout,'diff','--numstat','--no-renames',BASE,HEAD,'--',PATH);
 if(changed!=='20\t16\t'+PATH)fail();
 const b=fs.lstatSync(behaviorPath);
 if(!b.isFile()||b.isSymbolicLink()||b.nlink!==1||b.size<10||b.size>3000)fail();
 const result=verifyPinnedTasksSource({source:txt,patch:raw.slice(start)+'\n',
    sourceGitBlob:BLOB,externalGitHead:HEAD,
    observation:JSON.parse(fs.readFileSync(behaviorPath,'utf8'))});
 fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({sourceGitHead:HEAD,detectorRule:result.ruleId,
   findings:result.coreExactMatchingFindings,originalWorkerObserved:true,
   scoredFP:result.scoredFalsePositives,certified:false})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 process.stderr.write('C2_TASKS_EXTERNAL_BLOCKED: '+String(e?.message||e)+'\n');process.exitCode=2;
}}
module.exports={main};
