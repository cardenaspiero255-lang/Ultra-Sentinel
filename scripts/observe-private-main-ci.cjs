'use strict';
// Explicit opt-in, read-only main-branch CI observation; never logs token.
const {observePrivateMainCI}=require('../packages/quality-gates/private-main-ci-observer.cjs');
async function main(){
 const [, , headSha, rawRunId, ...extra]=process.argv;
 if(extra.length||!/^\d{1,16}$/.test(rawRunId||'')||!Number.isSafeInteger(Number(rawRunId)))
  throw Error('INVALID_OPERATOR_ARGUMENTS');
 const result=await observePrivateMainCI({headSha,runId:Number(rawRunId),
  token:process.env.ULTRA_SENTINEL_CI_READ_TOKEN});
 process.stdout.write(JSON.stringify(result)+'\n');
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('PRIVATE_MAIN_CI_OBSERVATION_BLOCKED\n');process.exitCode=1;
});
module.exports={main};
