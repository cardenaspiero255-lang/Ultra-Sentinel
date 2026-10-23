#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {adjudicateHistoricalMechanismOverlay}=
 require('../packages/quality-gates/c2-causal-evidence-overlay.cjs');
function read(p){
 const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<100||s.size>2000000)
  throw Error('C2_CAUSAL_OVERLAY_UNTRUSTED_INPUT');
 return JSON.parse(fs.readFileSync(p,'utf8'));
}
function main(args){
 if(args.length!==3||args.some(x=>!path.isAbsolute(x))||
   new Set(args).size!==3||fs.existsSync(args[2]))
  throw Error('C2_CAUSAL_OVERLAY_INVALID_OUTPUT');
 const report=adjudicateHistoricalMechanismOverlay({
  ledger:read(args[0]),campaign:read(args[1])
 });
 fs.writeFileSync(args[2],JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({status:report.schema,provisional:report.newProvisionalAssignmentsSupportedByExecutedJVM,
  remainingUngrouped:report.remainingWithoutProvisionalMechanism,
  independentRootCauseAssignmentsStillPending:report.stillWithoutIndependentCausalCertification,
  newGoldLabels:0,sssPlusCertified:false})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}
 catch(e){process.stderr.write('C2_CAUSAL_OVERLAY_BLOCKED '+String(e.message||e).slice(0,200)+'\n');process.exitCode=2}}
module.exports={main};
