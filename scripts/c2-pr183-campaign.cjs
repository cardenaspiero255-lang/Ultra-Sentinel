#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {SUITES,completeTwelve}=require('../packages/quality-gates/c2-pr183-seven-original-oracles.cjs');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const abort=msg=>{throw Error('C2_PR183_INPUT_BLOCKED '+msg);};
const safeFile=p=>{
 const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<10||s.size>1500000)abort('file');
 return fs.readFileSync(p);
};
const json=p=>JSON.parse(safeFile(p).toString('utf8'));
function suiteOf(id){const s=SUITES.find(x=>x.id===id);if(!s)abort('suite');return s;}
function manifest(id){
 const suite=suiteOf(id);
 return suite.sources.map(x=>{
  if(!/^[a-zA-Z0-9.-]+$/.test(x.alias)||
    !/^[a-f0-9]{40}$/.test(x.head)||!/^[a-f0-9]{40}$/.test(x.blob)||
    !x.path.startsWith('app/')||x.path.includes('..')||
    (x.digest!==null&&!/^[a-f0-9]{64}$/.test(x.digest)))abort('manifest');
  return [x.alias,x.head,x.blob,x.path,x.digest||'-'].join('|');
 }).join('\n')+'\n';
}
function seal(id,root){
 const suite=suiteOf(id);
 const proofs=suite.witnesses.map(item=>{
  const witness=json(path.join(root,item.file));
  const src=suite.sources.find(x=>x.alias===item.input);
  if(!src||witness.pr!==item.pr||witness.headSha!==src.head||
    witness.blobSha!==src.blob||
    witness.sourceSha256!==digest(safeFile(path.join(root,item.input)))||
    witness.oracleSha256!==digest(safeFile(path.join('tests/oracles',item.oracle)))||
    witness.originalLogSha256!==digest(safeFile(path.join(root,item.original)))||
    (witness.counterfactualLogSha256||witness.mutantLogSha256)!==
       digest(safeFile(path.join(root,item.variant))))abort('witness');
  if(src.digest!==null&&digest(safeFile(path.join(root,item.input)))!==src.digest)abort('source digest');
  for(const [key,value] of Object.entries(item.flags)){
   if(witness[key]!==value)abort('behavior flag');
  }
  const old=digest(safeFile(path.join(root,item.original)));
  const variant=digest(safeFile(path.join(root,item.variant)));
  if(old===variant)abort('no sensitivity');
  const c=suite.cases.find(x=>x.pr===item.pr&&x.line===item.line);
  if(!c||(c.positive&&item.variantType!=='repair')||
     (!c.positive&&item.variantType!=='mutant'))abort('polarity');
  return {
   suite:id,pr:item.pr,line:item.line,positive:c.positive,
   originalHeadSha:src.head,originalBlobSha:src.blob,
   originalLogSha256:old,variantLogSha256:variant,
   originalControlPassed:true,mutantOrRepairSensitive:true,
   unmodifiedOriginalSource:true,sourceBehaviorOnly:true,
   candidatePredictionsRead:false,baselinePredictionsRead:false
  };
 });
 if(proofs.length!==suite.cases.length)abort('case count');
 return Object.freeze({schema:'c2-pr183-one-suite-replay-witness/v1',
  suite:id,script:suite.script,proofs});
}
function combine(prior,records){
 const p=json(prior);
 const newProbes=records.flatMap(file=>{
  const r=json(file),stage=suiteOf(r.suite);
  if(r.schema!=='c2-pr183-one-suite-replay-witness/v1'||r.script!==stage.script||
     !Array.isArray(r.proofs)||r.proofs.length!==stage.cases.length||
     r.proofs.some(x=>x.suite!==stage.id))abort('suite receipt');
  return r.proofs;
 });
 for(const n of newProbes){
  const e=p.entryReviews?.find(x=>x.pr===n.pr&&x.line===n.line&&x.positive===n.positive);
  if(!e)abort('owner identity mismatch');
  n.identity=e.identity;
 }
 return completeTwelve({previous:p,newProbes});
}
function write(p,obj){
 fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n',{flag:'wx',mode:0o600});
}
function main(argv){
 const [mode,...args]=argv;
 if(mode==='manifest'&&args.length===1){process.stdout.write(manifest(args[0]));return;}
 if(mode==='suite'&&args.length===3){
  const [id,root,output]=args;
  if(path.resolve(root)===path.resolve(output))abort('output alias');
  write(output,seal(id,root));return;
 }
 if(mode==='combine'&&args.length===7){
  const [prior,output,...files]=args;
  // Five immutable suite witnesses, one per original Kotlin runner.
  if(files.length!==5)abort('args');
  if(new Set([prior,output,...files].map(p=>path.resolve(p))).size!==7)abort('path alias');
  const out=combine(prior,files);
  write(output,out);
  process.stdout.write(JSON.stringify({
   originalReceipts:out.originalReceipts,retestedPositive:out.retestedPositive,
   retestedNegative:out.retestedNegative,independentCausesAdded:0,
   newLabels:0,sssPlusCertified:false
  })+'\n');return;
 }
 abort('usage');
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write(String(e.message||e).slice(0,160)+'\n');process.exitCode=2;}
}
module.exports={main,manifest,seal,combine};
