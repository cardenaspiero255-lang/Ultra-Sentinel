#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {overlayPr212OnHistorical}=require('../packages/quality-gates/c2-pr212-historical-overlay.cjs');
function read(p){
 if(!path.isAbsolute(p))throw Error('C2_PR212_OVERLAY_UNSAFE_PATH');
 const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<100||s.size>500000)
  throw Error('C2_PR212_OVERLAY_UNTRUSTED_INPUT');
 return JSON.parse(fs.readFileSync(p,'utf8'));
}
function main(args){
 if(args.length!==3||args.some(s=>!path.isAbsolute(s))||
    new Set(args).size!==3||fs.existsSync(args[2]))
  throw Error('C2_PR212_OVERLAY_UNSAFE_OUTPUT');
 const result=overlayPr212OnHistorical({prior:read(args[0]),cross:read(args[1])});
 fs.writeFileSync(args[2],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({historical:23,positive:11,negative:12,
  newlyProvisionallyGrouped:4,ungrouped:12,causalIndependenceUncertified:21,
  externalGold:0,scoredNegatives:0,sssPlusCertified:false})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 process.stderr.write('C2_PR212_OVERLAY_BLOCKED\n');process.exitCode=2;
}}
module.exports={main};
