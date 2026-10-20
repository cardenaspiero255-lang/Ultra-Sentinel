#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {ORIGINALS,NEGATIVES,adjudicateBatch,patchedOriginal,sha1Git}=require('../packages/quality-gates/c2-pr151-158-causal-batch.cjs');
const {ORIGINS}=require('../packages/quality-gates/c2-run23-ten-receipt-recovery.cjs');
const {createHash}=require('node:crypto');
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=()=>{throw Error('C2_CAUSAL_BATCH_BLOCKED');};
function input(p,max=600000){
 const x=fs.lstatSync(p);
 if(!x.isFile()||x.isSymbolicLink()||x.nlink!==1||x.size<2||x.size>max)fail();
 return fs.readFileSync(p,'utf8');
}
function json(p){return JSON.parse(input(p));}
function prepare(pr,originalFile,folder){
 const row=ORIGINALS.find(x=>x.pr===pr);
 if(!row||pr===153)fail();
 const original=input(originalFile);
 if(sha1Git(original)!==row.blobSha)fail();
 const fixed=patchedOriginal(pr,original);
 fs.mkdirSync(folder,{recursive:false,mode:0o700});
 for(const [k,s] of [['original',original],['patched',fixed]]){
  fs.writeFileSync(path.join(folder,k+'.kt'),s,{flag:'wx',mode:0o600});
 }
 process.stdout.write(JSON.stringify({pr,originalGitBlob:row.blobSha,
   patchedGitBlob:sha1Git(fixed),newLabels:0})+'\n');
}
function verify(receiptFile,negativeA,negativeB,resultsDir,reportFile){
 const receipt=json(receiptFile);
 if(receipt.schema!=='c2-run23-ten-original-receipts-recovered/v1'||
  receipt.historicalSourceLabels!==23||receipt.originalBehaviorWitnessesRecovered!==10||
  receipt.originalHistoricalSealAltered!==false||receipt.newLabels!==0||
  receipt.independenceVerified!==false||
  !Array.isArray(receipt.entries)||receipt.entries.length!==10)fail();
 const rows=ORIGINALS.map(p=>{
  const r=receipt.entries.find(e=>e.pr===p.pr&&e.ruleId===p.ruleId&&
    e.sourceHeadSha===p.headSha&&e.sourceBlobSha===p.blobSha&&
    e.path===p.path&&e.line===p.line&&e.positive===true);
  const o=ORIGINS.find(x=>x.ids.includes(p.id));
  if(!r||r.sourceRunId!==o.runId||r.artifactId!==o.artifactId||
   r.artifactSha256!==o.archiveSha256|| !/^[a-f0-9]{64}$/.test(r.originalWitnessSha256))fail();
  let repairResults=null;
  if(p.pr!==153){
   const source=input(path.join(resultsDir,String(p.pr),'original.kt'));
   const patched=input(path.join(resultsDir,String(p.pr),'patched.kt'));
   if(sha1Git(source)!==p.blobSha||patched!==patchedOriginal(p.pr,source))fail();
   repairResults={
    original:json(path.join(resultsDir,String(p.pr),'original.json')),
    patched:json(path.join(resultsDir,String(p.pr),'patched.json'))
   };
  }
  return {...p,originalEvidenceSha256:r.originalWitnessSha256,repairResults};
 });
 const canaries=[json(negativeA),json(negativeB)];
 if(canaries[0].schema!=='ultra-sentinel-c2-next-scoped-original-thermal-battery-negatives/v1'||
  canaries[1].schema!=='ultra-sentinel-c2-next-scoped-original-negatives/v1'||
  canaries.some(x=>x.candidateInspected!==false||x.baselineCompared!==false||
    x.negativeFindingLabelsEstablished!==0||x.tripleSPlusCertified!==false||
    x.precision!==null||x.recall!==null||x.f1!==null||
    !Array.isArray(x.cases)||x.cases.length!==2))fail();
 const negatives=NEGATIVES.map(p=>{
  const blob=canaries.flatMap(x=>x.cases).find(x=>x.pr===p.pr);
  const r=receipt.entries.find(x=>x.pr===p.pr&&x.ruleId===p.ruleId&&
   x.sourceHeadSha===p.headSha&&x.sourceBlobSha===p.blobSha&&
   x.path===p.path&&x.line===p.line&&x.positive===false);
  const o=ORIGINS.find(x=>x.ids.includes(p.id));
  if(!r||!blob||r.sourceRunId!==o.runId||r.artifactId!==o.artifactId||
   blob.headSha!==p.headSha||blob.blobSha!==p.blobSha||
   blob.rule!==p.ruleId||blob.path!==p.path||blob.line!==p.line||
   blob.positive!==false||blob.originalControlPassed!==true||
   blob.counterfactualFailedAtTarget!==true)fail();
  const proof=canaries.find(c=>c.cases.some(x=>x.pr===p.pr));
  return {...p,scopedOriginalControlPassed:true,counterfactualMutationKilled:true,
   negativeFindingLabelsEstablished:0,originalWitnessSha256:r.originalWitnessSha256,
   mutantWitnessSha256:sha(JSON.stringify(proof.cases.find(x=>x.pr===p.pr)))};
 });
 const result=adjudicateBatch({rows,negatives});
 if(receipt.verdict!=='ORIGINAL_RECEIPTS_RECOVERED_CAUSAL_INDEPENDENCE_UNVERIFIED')fail();
 fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({scopedRepairs:result.counterfactualPositivesVerified,
  scopedNegatives:result.negativeControlsMutantSensitive,pendingRepairs:result.pendingPositiveRepairs,
  independentCauses:result.causalFamiliesIndependentlyCertified,newLabels:0})+'\n');
}
if(require.main===module){
 try{
  const [mode,...args]=process.argv.slice(2);
  if(mode==='prepare'&&args.length===3)prepare(Number(args[0]),args[1],args[2]);
  else if(mode==='verify'&&args.length===5)verify(...args);
  else fail();
 }catch(e){process.stderr.write('C2_CAUSAL_BATCH_BLOCKED '+(e?.message||'UNKNOWN').slice(0,140)+'\n');process.exitCode=2;}
}
module.exports={prepare,verify};
