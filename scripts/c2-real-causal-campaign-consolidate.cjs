#!/usr/bin/env node
'use strict';
/* Never score training-oracle sources or consult candidates in consolidation. */
const fs=require('node:fs'),path=require('node:path');
const {adjudicateRealCampaign}=require('../packages/quality-gates/c2-real-causal-campaign.cjs');
function read(file){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<150||s.size>2000000)
  throw Error('C2_REAL_CAMPAIGN_BAD_RECEIPT');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==4||args.some(p=>!path.isAbsolute(p))||
   new Set(args).size!==4||fs.existsSync(args[3]))
  throw Error('C2_REAL_CAMPAIGN_BAD_PATHS');
 const numeric=read(args[0]);
 if(!Array.isArray(numeric.rows)||numeric.rows.length!==4)
  throw Error('C2_REAL_CAMPAIGN_NUMERIC_ROWS_BLOCKED');
 numeric.rows.forEach((r,i)=>{r.mode=['00','01','10','11'][i]});
 const report=adjudicateRealCampaign({
  numeric,confidence:read(args[1]),thermal:read(args[2])
 });
 fs.writeFileSync(args[3],JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({verdict:report.status,
  originalKotlinJvmVariantExecutions:report.originalKotlinJvmVariantExecutions,
  localCausalEffects:report.confirmedRepairLocalEffects,
  independentCausalFamiliesCertified:0,remainingHistorical:21,
  newGold:0,sssPlusCertified:false})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}
 catch(e){process.stderr.write('C2_REAL_CAMPAIGN_BLOCKED '+String(e.message||e).slice(0,150)+'\n');process.exitCode=2}}
module.exports={main};
