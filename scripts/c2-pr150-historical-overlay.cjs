#!/usr/bin/env node
'use strict';
const {readFileSync,lstatSync,writeFileSync}=require('node:fs');
const {overlayPr150}=require('../packages/quality-gates/c2-pr150-historical-causal-overlay.cjs');
function readJSON(file){
 const st=lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<100||st.size>3000000)
  throw Error('C2_PR150_CAUSAL_OVERLAY_UNSAFE_INPUT');
 return JSON.parse(readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==4)throw Error('usage: c2-pr150-historical-overlay.cjs RUN23.json RECOVERY.json MATRIX.json NEW_REPORT.json');
 const [historical,recovered,adjudication,output]=args;
 if(new Set(args).size!==4)throw Error('C2_PR150_CAUSAL_OVERLAY_IDENTICAL_PATH');
 const report=overlayPr150({
  historical:readJSON(historical),recovered:readJSON(recovered),
  adjudication:readJSON(adjudication)
 });
 writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({originalLabels:report.count,
  positiveSharedGuards:report.provisionalPositiveLabelsGrouped,
  provisionalFamilies:report.provisionalGroupsAdded,
  remainingUnannotated:report.unannotatedEntriesNow,
  independentCausesCertified:false,newLabels:0,certified:false})+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write('C2_PR150_HISTORICAL_OVERLAY_BLOCKED: '+String(e.message||e).slice(0,140)+'\n');process.exitCode=2;}
}
module.exports={main};
