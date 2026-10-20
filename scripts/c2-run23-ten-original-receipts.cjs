#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {ORIGINS,recoverTenReceipts}=require('../packages/quality-gates/c2-run23-ten-receipt-recovery.cjs');
function readJson(file){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<20||st.size>1000000)
  throw Error('C2_RECOVERY_UNSAFE_WITNESS_FILE');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==3)throw Error('usage: c2-run23-ten-original-receipts.cjs VERIFIED_QUEUE.json ORIGINAL_ARTIFACT_DIR NEW_REPORT.json');
 const [queueFile,originalDir,reportFile]=args;
 if([queueFile,originalDir].includes(reportFile))throw Error('C2_RECOVERY_OVERWRITE_FORBIDDEN');
 const bundles=ORIGINS.map(o=>{
  const dir=path.resolve(originalDir,o.id);
  if(!fs.lstatSync(dir).isDirectory()||fs.lstatSync(dir).isSymbolicLink())throw Error('C2_RECOVERY_UNSAFE_DIR');
  const actual=fs.readdirSync(dir).sort();
  if(actual.length!==1||actual[0]!==o.jsonFile)throw Error('C2_RECOVERY_UNEXPECTED_ARCHIVE_FILES');
  const raw=readJson(path.join(dir,o.jsonFile));
  let files;
  if(o.ids.length===1)files={[o.ids[0]]:raw};
  else if(o.id==='confidence')files=Object.fromEntries(o.ids.map(id=>[id,raw]));
  else{
   if(!raw||!Array.isArray(raw.originals)||raw.originals.length!==2||
    raw.candidateInspected!==false||raw.baselineCompared!==false||
    raw.precision!==null||raw.recall!==null||raw.f1!==null||
    raw.tripleSPlusCertified!==false)throw Error('C2_RECOVERY_UNTRUSTED_AGGREGATED_WITNESSES');
   const byPr=new Map();
   for(const x of raw.originals){
    if(!Number.isSafeInteger(x.pr)||byPr.has(x.pr))throw Error('C2_RECOVERY_DUPLICATE_WITNESS');
    byPr.set(x.pr,x);
   }
   files=Object.fromEntries(o.ids.map(id=>{
    const pr=Number(id.split('-')[0]),w=byPr.get(pr);
    if(!w)throw Error('C2_RECOVERY_MISSING_ORIGINAL');
    return [id,w];
   }));
  }
  return {originId:o.id,runId:o.runId,artifactId:o.artifactId,
   sha256:o.archiveSha256,runHeadSha:o.runHeadSha,
   repositoryId:1418338512,actorId:322222186,
   runConcluded:'success',archiveExpired:false,files};
 });
 const result=recoverTenReceipts({receipt:readJson(queueFile),bundles});
 fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({
  result:result.verdict,recovered:result.originalBehaviorWitnessesRecovered,
  pr150Rules:result.entries.filter(x=>x.pr===150).map(x=>x.ruleId),
  missingCausalGroups:result.unresolvedCausalGroups,
  newLabels:0,sssPlusCertified:false
 })+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write('C2_TEN_RECEIPT_RECOVERY_BLOCKED: '+String(e?.message||e).slice(0,150)+'\n');process.exitCode=2;}
}
module.exports={main};
