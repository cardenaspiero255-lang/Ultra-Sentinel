#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {adjudicateOriginalProbes}=require('../packages/quality-gates/c2-pr181-original-causal-probes.cjs');
function read(file){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||
   s.size<100||s.size>1000000)throw Error('C2_PR181_UNSAFE_INPUT');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==4)throw Error('usage: c2-pr181-adjudicate.cjs ORIGINAL_RECEIPTS POSITIVE_TRIALS NEGATIVE_TRIALS OUTPUT');
 const [source,trials,negatives,destination]=args;
 if(new Set(args.map(x=>path.resolve(x))).size!==3)
   throw Error('C2_PR181_OVERWRITE_BLOCKED');
 const out=adjudicateOriginalProbes({source:read(source),trials:read(trials),negativeTrials:read(negatives)});
 fs.writeFileSync(destination,JSON.stringify(out,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({
  status:out.status,sourceLabels:out.sourceLabels,
  retestedPositive:out.retestedPositive,pendingPositive:out.pendingPositive,
  retestedNegative:out.retestedNegative,pendingNegative:out.pendingNegative,
  negativeSourceReceipts:out.negativeOriginalReceipts,
  certifiedIndependentCausesAdded:0,newLabels:0,sssPlusCertified:false
 })+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write('C2_PR181_BLOCKED '+String(e.message||e).slice(0,160)+'\n');process.exitCode=2;}
}
module.exports={main};
