#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {verifyReplayOrigin}=require('../packages/quality-gates/c2-replay-origin.cjs');
function main(args){
 if(args.length!==7||!/^\d+$/.test(args[2])||!/^\d+$/.test(args[3]))throw Error('C2_REPLAY_ORIGIN_BLOCKED');
 const [runPath,listingPath,runId,attempt,headSha,event,suite]=args;
 const run=JSON.parse(fs.readFileSync(runPath,'utf8'));
 const listing=JSON.parse(fs.readFileSync(listingPath,'utf8'));
 const result=verifyReplayOrigin({run,listing,context:{runId:Number(runId),attempt:Number(attempt),headSha,event,suite}});
 process.stdout.write(`${result.artifactId} ${result.digest}\n`);
}
if(require.main===module){try{main(process.argv.slice(2))}catch{
 process.stderr.write('C2_REPLAY_ORIGIN_BLOCKED\n');process.exitCode=2;
}}
module.exports={main};
