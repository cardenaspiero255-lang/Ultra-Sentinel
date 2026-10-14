'use strict';
const {loadGameHubPullRequest}=require('../packages/orchestrator/gamehub-live-reader.cjs');
async function main(){
 const raw=process.argv[2]||'201';
 if(!/^[1-9][0-9]{0,8}$/.test(raw))throw Error('INVALID_PR_NUMBER');
 const result=await loadGameHubPullRequest(Number(raw),{token:process.env.GITHUB_TOKEN});
 if(!result.authenticated||!result.headStable||!result.completeDiff)
  throw Error('INCOMPLETE_GAMEHUB_EVIDENCE');
 // Emit only bounded safe metadata, never source diffs, tokens, or findings text.
 process.stdout.write(JSON.stringify({target:'cardenaspiero255-lang/gamehub-ultra',
  pr:result.pr,head:result.envelope.headSha,base:result.baseSha,
  files:result.changedFiles,verdict:result.envelope.verdict,
  evidenceState:result.envelope.evidenceState,
  authenticatedTransport:result.authenticated,headStable:result.headStable,
  diffCountersMatched:result.completeDiff,writeAccess:false})+'\n');
}
if(require.main===module)main().catch(e=>{
 const allowed=new Set(['INVALID_PR_NUMBER','AUTHENTICATION_REQUIRED','GITHUB_TRANSPORT_UNAVAILABLE',
 'GITHUB_API_UNAVAILABLE','GITHUB_REDIRECT_REJECTED','GITHUB_INVALID_CONTENT_TYPE',
 'GITHUB_INVALID_RESPONSE','GITHUB_RESPONSE_TOO_LARGE','GITHUB_TOTAL_RESPONSE_TOO_LARGE',
 'GITHUB_INVALID_JSON','INVALID_PR_METADATA','INCOMPLETE_PR_DIFF','INVALID_PR_FILE_PAGE',
 'PR_FILES_MISMATCH','PR_PAGINATION_UNBOUNDED','STALE_PR_SHA','INCOMPLETE_GAMEHUB_EVIDENCE',
 'INCOMPLETE_GITHUB_EVIDENCE','INVALID_GITHUB_FILE','INVALID_GAMEHUB_SNAPSHOT',
 'INVALID_TARGET','INVALID_WIRE_CONTRACT']);
 console.error('GameHub read-only verification failed: '+(allowed.has(e.message)?e.message:'UNCLASSIFIED_FAILURE'));
 process.exitCode=1;
});
