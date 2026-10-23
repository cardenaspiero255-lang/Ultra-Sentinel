#!/usr/bin/env node
'use strict';
/* Extract exact 12 historical source identities only from downloaded original
 * GitHub owner-run stage receipts. NEVER reconstruct source or query Core. */
const fs=require('node:fs'),path=require('node:path');
const {STAGES}=require('../packages/quality-gates/c2-twelve-original-oracle-reconciliation.cjs');
const fail=()=>{throw Error('C2_ORIGINAL_STAGE_SOURCE_EXTRACTION_BLOCKED');};
const hex40=/^[0-9a-f]{40}$/,hex64=/^[0-9a-f]{64}$/;
function read(file){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<50||s.size>3000000)fail();
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function extractOriginalStageProofs(dir){
 if(!path.isAbsolute(dir)||!fs.lstatSync(dir).isDirectory())fail();
 const records=[],ids=new Set();
 for(const stage of STAGES){
  const folder=path.join(dir,stage.key);
  if(!fs.lstatSync(folder).isDirectory()||fs.lstatSync(folder).isSymbolicLink())fail();
  const stageFile=read(path.join(folder,stage.file));
  if(stageFile.schema!==stage.schema||stageFile.repository!=='cardenaspiero255-lang/gamehub-ultra'||
   stageFile.ownerRunId!==stage.run||stageFile.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
   stageFile.sourceCIAuthenticated!==true||stageFile.benchmarkCertified!==false||
   !Array.isArray(stageFile.labels)||stageFile.labels.length!==stage.total||
   stageFile.labels.filter(x=>x.positive).length!==stage.positives||
   stageFile.labels.filter(x=>x.positive===false).length!==stage.negatives)fail();
  for(const c of stage.cases){
   const matches=stageFile.labels.filter(x=>x.pr===c.pr&&x.line===c.line&&
     x.rule===c.rule&&x.positive===c.positive);
   if(matches.length!==1)fail();
   const x=matches[0];
   if(!hex40.test(x.headSha)||!hex40.test(x.blobSha)||
     typeof x.path!=='string'||!x.path.startsWith('app/')||
     !hex64.test(x.evidenceSha256))fail();
   const id=JSON.stringify([x.pr,x.headSha,x.blobSha,x.rule,x.path,x.line,x.positive]);
   if(ids.has(id))fail();ids.add(id);
   records.push({pr:x.pr,line:x.line,rule:x.rule,positive:x.positive,
    headSha:x.headSha,blobSha:x.blobSha,path:x.path,evidenceSha256:x.evidenceSha256,
    originalOwnerRunId:stage.run,originalArchiveDigestSha256:stage.digest});
  }
 }
 if(records.length!==12||ids.size!==12)fail();
 return records.sort((a,b)=>a.pr-b.pr||a.line-b.line||a.rule.localeCompare(b.rule));
}
function main(args){
 if(args.length!==2||args.some(x=>!path.isAbsolute(x))||
   args[0]===args[1]||fs.existsSync(args[1]))fail();
 const proofs=extractOriginalStageProofs(args[0]);
 fs.writeFileSync(args[1],JSON.stringify(proofs,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({originalSourceTuplesExtracted:proofs.length,
   sourceOriginalAuthenticityDependsOnOwnerArtifactVerification:true,
   causalIndependenceCertified:false,newGoldLabels:0})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}
 catch(e){process.stderr.write('C2_ORIGINAL_STAGE_SOURCE_EXTRACTION_BLOCKED\n');process.exitCode=2}}
module.exports={extractOriginalStageProofs,main};
