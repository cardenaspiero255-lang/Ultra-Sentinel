#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {adjudicateCrossWithKnownMechanisms}=require('../packages/quality-gates/c2-152-158-mechanism-cross.cjs');
function read(s){
 if(!path.isAbsolute(s))throw Error('C2_CAUSAL_CROSS_BAD_PATH');
 const st=fs.lstatSync(s);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<120||st.size>1800000)
  throw Error('C2_CAUSAL_CROSS_BAD_RECEIPT');
 return JSON.parse(fs.readFileSync(s,'utf8'));
}
function main(paths){
 if(paths.length!==5||paths.some(p=>!path.isAbsolute(p))||
   new Set(paths).size!==5||fs.existsSync(paths[4]))
  throw Error('C2_CAUSAL_CROSS_UNSAFE_OUTPUT');
 const [jsonQuery,rollbackTtl,replay,campaign]=paths.slice(0,4).map(read);
 const result=adjudicateCrossWithKnownMechanisms({jsonQuery,rollbackTtl,replay,campaign});
 fs.writeFileSync(paths[4],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({direct:result.directJointInterventionContrasts,
  separate:result.separateJVMContrasts,unknown:result.untestedCrossRelations,
  certifiedFamilies:0,scoredGold:0,sssPlusCertified:false})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 process.stderr.write('C2_152_158_CAUSAL_CROSS_BLOCKED\n');process.exitCode=2;
}}
module.exports={main};
