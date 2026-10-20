#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {extendCausalOverlay}=require('../packages/quality-gates/c2-pr151-158-extended-overlay.cjs');
function read(file){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<100||st.size>1000000)
  throw Error('C2_EXTENDED_CAUSAL_OVERLAY_BLOCKED');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==3)throw Error('C2_EXTENDED_CAUSAL_OVERLAY_BLOCKED');
 const [original,batch,out]=args;
 if(out===original||out===batch)throw Error('C2_EXTENDED_CAUSAL_OVERLAY_BLOCKED');
 const r=extendCausalOverlay(read(original),read(batch));
 fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({annotated:r.addedSourceAnnotations,
   provisionalPositives:r.provisionalPositivesAdded,negativeControls:r.negativeControlsAdded,
   certifiedIndependentCauses:0,newLabels:0})+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){
  process.stderr.write('C2_EXTENDED_CAUSAL_OVERLAY_BLOCKED '+String(e.message||e).slice(0,150)+'\n');
  process.exitCode=2;
 }
}
module.exports={main};
