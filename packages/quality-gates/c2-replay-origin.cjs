'use strict';

// This validates metadata fetched by the workflow from GitHub. It does not
// authenticate arbitrary JSON supplied by a caller or authorize any writes.
const die=()=>{throw Error('C2_REPLAY_ORIGIN_BLOCKED');};
function verifyReplayOrigin({run,listing,context}={}){
 try{
  const c=context;
  if(!c||!Number.isSafeInteger(c.runId)||c.runId<1||
   !Number.isSafeInteger(c.attempt)||c.attempt<1||
   !/^[a-f0-9]{40}$/.test(c.headSha)||
   !['push','pull_request'].includes(c.event)||
   !['json-query','rollback-ttl','owner-replay','ten-jvm'].includes(c.suite))die();
  if(!run||run.id!==c.runId||run.run_attempt!==c.attempt||
   run.head_sha!==c.headSha||run.event!==c.event||run.status!=='in_progress'||
   run.path!=='.github/workflows/c2-152-158-mechanism-cross.yml'||
   run.actor?.id!==322222186||run.repository?.id!==1418338512||
   run.head_repository?.id!==1418338512)die();
  const prefix=['json-query','rollback-ttl'].includes(c.suite)?'c2-pr186':'c2';
  const expected=`${prefix}-${c.suite}-${c.runId}-a${c.attempt}`;
  if(!listing||listing.total_count!==1||!Array.isArray(listing.artifacts)||
   listing.artifacts.length!==1)die();
  const artifact=listing.artifacts[0];
  if(!artifact||!Number.isSafeInteger(artifact.id)||artifact.id<1||
   artifact.name!==expected||artifact.expired!==false||
   !Number.isSafeInteger(artifact.size_in_bytes)||artifact.size_in_bytes<1||artifact.size_in_bytes>1000000||
   !/^sha256:[a-f0-9]{64}$/.test(artifact.digest)||
   artifact.workflow_run?.id!==c.runId||
   artifact.workflow_run?.repository_id!==1418338512||
   artifact.workflow_run?.head_repository_id!==1418338512||
   artifact.workflow_run?.head_sha!==c.headSha)die();
  return Object.freeze({artifactId:artifact.id,digest:artifact.digest.slice(7)});
 }catch(e){if(e?.message==='C2_REPLAY_ORIGIN_BLOCKED')throw e;die();}
}
module.exports={verifyReplayOrigin};
