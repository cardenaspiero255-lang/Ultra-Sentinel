#!/usr/bin/env node
'use strict';
/**
 * Offline, read-only review of candidate receipts downloaded by the C2
 * Kotlin campaign. Never executes source, reads detector predictions or
 * promotes public development examples into blind labels.
 */
const fs=require('node:fs');
const path=require('node:path');
const {metadataOnlyCandidateIndex}=require('../packages/quality-gates/c2-kotlin-upstream-candidate-index.cjs');
const {reviewCampaign}=require('../packages/quality-gates/c2-upstream-acceptance.cjs');
const roster=require('../tests/fixtures/c2-upstream-106-task-tree.json');
function fail(){throw Error('C2_FOUR_GATE_REVIEW_BLOCKED');}
function run(argv){
 if(argv.length!==6||argv[0]!=='--receipts'||argv[2]!=='--mode'||argv[4]!=='--output')fail();
 const root=argv[1],mode=argv[3],output=argv[5];
 if(!path.isAbsolute(root)||!path.isAbsolute(output)||
    !['full','smoke'].includes(mode)||!fs.lstatSync(root).isDirectory()||
    fs.existsSync(output)||path.resolve(root)===path.resolve(output))fail();
 const listings=roster.entries.map(({name,sha})=>({
  type:'dir',name,path:'tasks/'+name,sha,
  _links:{git:'https://api.github.com/git/trees/'+sha}
 }));
 const index=metadataOnlyCandidateIndex(Buffer.from(JSON.stringify(listings)));
 const expected=new Set(index.candidates.map(x=>x.upstreamTask));
 const found=[];
 function walk(dir,depth){
  if(depth>5)fail();
  const entries=fs.readdirSync(dir,{withFileTypes:true});
  if(entries.length>2000)fail();
  for(const entry of entries){
   if(entry.isSymbolicLink())fail();
   const full=path.join(dir,entry.name);
   if(entry.isDirectory()){
    // JUnit XML and raw source are never parsed here; only per-task receipts.
    if(entry.name!=='evidence')walk(full,depth+1);
   }else if(entry.isFile()&&entry.name.endsWith('.json')){
    const task=entry.name.slice(0,-5);
    // Some jobs may download their independent aggregate report alongside
    // batches; it is *not* a per-task receipt.
    if(task==='c2-kotlin-campaign-report'||task==='c2-four-gate-review')continue;
    if(!expected.has(task))fail();
    const stat=fs.statSync(full);
    if(stat.size<20||stat.size>16384||stat.nlink!==1)fail();
    let receipt;
    try{receipt=JSON.parse(fs.readFileSync(full,'utf8'));}catch{fail();}
    if(!receipt||receipt.task!==task)fail();
    found.push(receipt);
   }else if(!entry.isFile())fail();
  }
 }
 walk(root,0);
 const report=reviewCampaign(index,found,{requireComplete:mode==='full'});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 return {schema:report.schema,candidates:report.receiptsSeen,missing:report.missing,
  admitted:report.admitted,labels:report.newLabels,status:report.status};
}
if(require.main===module){
 try{console.log(JSON.stringify(run(process.argv.slice(2))));}
 catch{console.error('C2_FOUR_GATE_REVIEW_BLOCKED');process.exitCode=2;}
}
module.exports={run};
