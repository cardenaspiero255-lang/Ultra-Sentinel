#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {attestReplacementLineage}=require('../packages/quality-gates/c2-pr153-replacement-lineage.cjs');
function read(f){
 if(!path.isAbsolute(f))throw Error('C2_PR153_LINEAGE_BAD_PATH');
 const x=fs.lstatSync(f);
 if(!x.isFile()||x.isSymbolicLink()||x.nlink!==1||x.size<30||x.size>2000000)
  throw Error('C2_PR153_LINEAGE_BAD_RECEIPT');
 return JSON.parse(fs.readFileSync(f,'utf8'));
}
function main(argv){
 if(argv.length!==6||argv.some(x=>!path.isAbsolute(x))||
   new Set(argv).size!==6||fs.existsSync(argv[5]))throw Error('C2_PR153_LINEAGE_BAD_OUTPUT');
 const [oldRun,oldArtifacts,newRun,newArtifacts,replay]=argv.slice(0,5).map(read);
 const result=attestReplacementLineage({oldRun,oldArtifacts,newRun,newArtifacts,replay});
 fs.writeFileSync(argv[5],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({status:result.status,oldOwnerArtifactPresent:false,newOwnerRunId:result.newOwnerRunId,sourceReproduced:true,independentCauses:0,newGold:0})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 process.stderr.write('C2_PR153_LINEAGE_BLOCKED\n');process.exitCode=2;
}}
module.exports={main};
