#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {extendPr153CausalOverlay}=require('../packages/quality-gates/c2-pr153-extended-causal-overlay.cjs');
function input(file){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<100||st.size>1000000)
  throw Error('C2_PR153_EXTENDED_OVERLAY_BLOCKED_UNSAFE_INPUT');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==3)throw Error('usage: c2-pr153-extend-historical-overlay.cjs EXTENDED.json REPLAY.json NEW_OUTPUT.json');
 const [extended,replay,dest]=args;
 if(dest===extended||dest===replay)throw Error('C2_PR153_EXTENDED_OVERLAY_BLOCKED_OVERWRITE');
 const report=extendPr153CausalOverlay({extended:input(extended),repair:input(replay)});
 fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({
  verdict:report.status,count:report.count,
  pr153:report.entries.find(x=>x.pr===153)?.causalAdjudication,
  provisionalPositiveFamilies:report.provisionalPositiveFamiliesAfter,
  independentlyCertified:report.certifiedIndependentCausesAdded,
  newLabels:0,holdoutFrozen:false
 })+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write('C2_PR153_EXTENDED_OVERLAY_BLOCKED '+String(e.message||e).slice(0,160)+'\n');process.exitCode=2;}
}
module.exports={main};
