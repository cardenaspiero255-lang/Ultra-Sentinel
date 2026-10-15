'use strict';
const {captureLiveC2Cohort}=require('../packages/quality-gates/live-gamehub-c2-cohort.cjs');
async function main(){
 const cohort=await captureLiveC2Cohort({token:process.env.GITHUB_TOKEN});
 // The output is exclusively public repository identifiers, hashes,
 // redacted Core identities, bounded check counts and boolean nonclaims.
 process.stdout.write(JSON.stringify(cohort)+'\n');
 if(cohort.captureStatus!=='CANDIDATE_SNAPSHOT_ONLY')process.exitCode=2;
 return cohort;
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('C2_LIVE_CAPTURE_BLOCKED: UNVERIFIED_READONLY_SOURCE\n');
 process.exitCode=1;
});
module.exports={main};
