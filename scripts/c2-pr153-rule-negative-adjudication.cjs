#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {adjudicatePr153AndRuleScopedNegatives}=require('../packages/quality-gates/c2-pr153-rule-negative-adjudication.cjs');
const read=p=>{
 if(!path.isAbsolute(p))throw Error('C2_PR153_SCOPE_BAD_PATH');
 const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<100||s.size>1000000)
  throw Error('C2_PR153_SCOPE_UNTRUSTED');
 return JSON.parse(fs.readFileSync(p,'utf8'));
};
function main(args){
 if(args.length!==3||args.some(x=>!path.isAbsolute(x))||
  new Set(args).size!==3||fs.existsSync(args[2]))throw Error('C2_PR153_SCOPE_OUTPUT_BLOCKED');
 const result=adjudicatePr153AndRuleScopedNegatives({prior:read(args[0]),replay:read(args[1])});
 fs.writeFileSync(args[2],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({provisionalNew:1,remainingUngrouped:11,
  ruleSpecificBenignNegativeScored:0,stillNotCausallyCertified:21,
  newGold:0,truthSealed:false})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 process.stderr.write('C2_PR153_RULE_SCOPE_BLOCKED\n');process.exitCode=2;
}}
module.exports={main};
