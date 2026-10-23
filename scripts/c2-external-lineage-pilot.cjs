#!/usr/bin/env node
'use strict';
/* Static source-free precommit, no GitHub network access, no Core prediction. */
const fs=require('node:fs'),path=require('node:path');
const {prepareSourceFreePilot}=require('../packages/quality-gates/c2-external-lineage-pilot.cjs');
const input=path.resolve(__dirname,'../docs/quality/C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json');
function main(args){
 if(!Array.isArray(args)||args.length!==1||!path.isAbsolute(args[0])||
  fs.existsSync(args[0]))throw Error('C2_EXTERNAL_LINEAGE_PILOT_BLOCKED');
 const stat=fs.lstatSync(input);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8192)
  throw Error('C2_EXTERNAL_LINEAGE_PILOT_BLOCKED');
 const report=prepareSourceFreePilot(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(args[0],JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({status:report.status,
  commitmentSha256:report.commitmentSha256,sourceRelease:false,
  labels:0,holdoutFrozen:false})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}
 catch(e){process.stderr.write('C2_EXTERNAL_LINEAGE_PILOT_BLOCKED\n');process.exitCode=2}}
module.exports={main};
