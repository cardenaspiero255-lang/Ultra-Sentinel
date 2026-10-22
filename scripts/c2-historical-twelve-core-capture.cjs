#!/usr/bin/env node
'use strict';
/* Authenticate source on the runner; CLI refuses symlinks or overwrites. */
const fs=require('node:fs'),path=require('node:path');
const {auditTwelveBundle}=require('../packages/quality-gates/c2-historical-twelve-core-capture.cjs');
const fail=()=>{throw Error('C2_HISTORICAL_CORE_CAPTURE_BLOCKED');};
function read(file,max){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<2||s.size>max)fail();
 return fs.readFileSync(file,'utf8');
}
function main(argv){
 if(argv.length!==4||argv.some(x=>!path.isAbsolute(x)))fail();
 const [receiptFile,prDir,sourceDir,output]=argv;
 if(new Set(argv.map(x=>path.resolve(x))).size!==4||fs.existsSync(output))fail();
 for(const dir of [prDir,sourceDir]){
  const st=fs.lstatSync(dir);if(!st.isDirectory()||st.isSymbolicLink())fail();
 }
 const receipt=JSON.parse(read(receiptFile,180000));
 if(!Array.isArray(receipt.entries)||receipt.entries.length!==12)fail();
 const prs=new Map();
 const cases=receipt.entries.map(x=>{
  if(!Number.isSafeInteger(x.pr)||x.pr<1||!Number.isSafeInteger(x.line)||
      x.line<1||typeof x.path!=='string'||!x.path.startsWith('app/src/main/')||
      !x.path.endsWith('.kt')||x.path.includes('..'))fail();
  if(!prs.has(x.pr)){
   const full=JSON.parse(read(path.join(prDir,x.pr+'-pr.json'),6000));
   const files=JSON.parse(read(path.join(prDir,x.pr+'-files.json'),1000000));
   if(full.number!==x.pr||full.head?.sha!==x.headSha||
      !Number.isSafeInteger(full.changed_files)||full.changed_files!==files.length||
      files.length>100)fail();
   prs.set(x.pr,{pr:{number:full.number,headSha:full.head.sha,changedFiles:files.length},
     files:files.map(f=>({
       filename:f.filename,status:f.status,sha:f.sha,
       ...(f.filename===x.path||receipt.entries.some(q=>q.pr===x.pr&&q.path===f.filename)?
        {patch:f.patch,additions:f.additions,deletions:f.deletions,changes:f.changes}: {})
      }))});
  }
  const unit=prs.get(x.pr);
  return {label:{pr:x.pr,headSha:x.headSha,blobSha:x.blobSha,rule:x.rule,
    path:x.path,line:x.line,positive:x.positive},
   source:read(path.join(sourceDir,x.pr+'-'+x.line+'.kt'),160000),
   pr:unit.pr,files:unit.files};
 });
 process.stderr.write('C2_HISTORICAL_SOURCE_CASES_FETCHED='+cases.length+'\\n');
 const result=auditTwelveBundle(receipt,cases);
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({
  status:result.status,sourceGitBlobAttested:result.sourceGitBlobAttested,
  coreExecutions:result.coreExecutions,originalUnchanged:result.outsideOriginalPrDiff,
  exactMatches:result.exactRulePathLineMatches,scoredNegatives:0,
  precision:null,recall:null,f1:null,sssPlusCertified:false
 })+'\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){
 process.stderr.write('C2_HISTORICAL_CORE_CAPTURE_BLOCKED '+String(e.stack||e.message||e).slice(0,2500)+'\n');
 process.exitCode=2;}}
module.exports={main};
