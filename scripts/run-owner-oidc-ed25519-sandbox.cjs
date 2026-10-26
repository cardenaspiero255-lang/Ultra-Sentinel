'use strict';
/**
 * OPERATOR-ONLY integrated bridge for a privileged but read-only GitHub Actions
 * workflow_dispatch. This entrypoint DOES NOT sign on the owner's behalf.
 * It REQUIRES a separately owner-signed Ed25519 plan and an authenticated
 * GitHub /user session, in addition to a live GitHub-issuer OIDC token.
 *
 * Never place the Ed25519 PRIVATE key inside GitHub Actions/PR artifacts.
 * Only trusted operator-configured request and pinned public key may be read.
 */
const {AUDIENCE}=require('../packages/recovery/github-oidc-approval.cjs');
const {runOwnerOidcAndEd25519SandboxRepair}=
 require('../packages/recovery/owner-oidc-ed25519-bridge.cjs');
const {readTrustedFile,verifierFromTrustedEnvironment}=
 require('./run-owner-sandbox-repair.cjs');
const EXPECTED_WORKFLOW='cardenaspiero255-lang/Ultra-Sentinel/.github/workflows/gamehub-pr151-owner-e2e.yml@refs/heads/main';
function requireAuthenticatedActionsContext(env){
 if(!env||env.GITHUB_ACTIONS!=='true'||
  env.GITHUB_EVENT_NAME!=='workflow_dispatch'||
  env.GITHUB_WORKFLOW_REF!==EXPECTED_WORKFLOW||
  env.GITHUB_REPOSITORY!=='cardenaspiero255-lang/Ultra-Sentinel'||
  env.GITHUB_REPOSITORY_ID!=='1418338512'||
  env.GITHUB_ACTOR!=='cardenaspiero255-lang'||
  env.GITHUB_ACTOR_ID!=='322222186'||
  env.GITHUB_REF!=='refs/heads/main'||
  env.GITHUB_RUN_ATTEMPT!=='1'||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
  !/^[1-9]\d{0,16}$/.test(env.GITHUB_RUN_ID||'')||
  typeof env.ACTIONS_ID_TOKEN_REQUEST_TOKEN!=='string'||
  env.ACTIONS_ID_TOKEN_REQUEST_TOKEN.length<16||
  typeof env.ULTRA_SENTINEL_OWNER_GITHUB_TOKEN!=='string'||
  env.ULTRA_SENTINEL_OWNER_GITHUB_TOKEN.length<16)
  throw Error('DUAL_OWNER_ACTIONS_CONTEXT_DENIED');
 const u=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
 if(u.protocol!=='https:'||u.username||u.password||u.hash||u.port||
  !u.hostname.endsWith('.actions.githubusercontent.com')||
  u.pathname.length<2)throw Error('DUAL_OWNER_TOKEN_ISSUER_DENIED');
 u.searchParams.set('audience',AUDIENCE);
 return u.toString();
}
async function requestGitHubOidcJwt(env,fetchImpl=fetch){
 const url=requireAuthenticatedActionsContext(env);
 const result=await fetchImpl(url,{
  headers:{Authorization:'bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
   Accept:'application/json'},
  redirect:'error',signal:AbortSignal.timeout(15000)
 });
 if(!result?.ok)throw Error('DUAL_OWNER_OIDC_ISSUANCE_FAILED');
 const obj=await result.json();
 if(typeof obj?.value!=='string'||obj.value.length<100||obj.value.length>25000)
  throw Error('DUAL_OWNER_OIDC_INVALID');
 return obj.value;
}
async function main(){
 const env=process.env;
 // Enforce exact trusted workflow context before reading any operator files.
 requireAuthenticatedActionsContext(env);
 if(env.ULTRA_SENTINEL_VALIDATOR_ISOLATION!=='bubblewrap')
  throw Error('DUAL_OWNER_ISOLATION_REQUIRED');
 const request=JSON.parse(readTrustedFile(env.ULTRA_SENTINEL_REPAIR_REQUEST_FILE));
 const trustedPublicKey=readTrustedFile(env.ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE);
 const directory=request.directory;
 const validateTest=verifierFromTrustedEnvironment(directory);
 const red=verifierFromTrustedEnvironment(directory,{expectRed:true});
 const judge=verifierFromTrustedEnvironment(directory,{
  argvVariable:'ULTRA_SENTINEL_JUDGE_ARGV_JSON'});
 const testCommand=JSON.stringify(JSON.parse(env.ULTRA_SENTINEL_VALIDATOR_ARGV_JSON));
 const judgeCommand=JSON.stringify(JSON.parse(env.ULTRA_SENTINEL_JUDGE_ARGV_JSON));
 if(testCommand===judgeCommand)throw Error('DUAL_OWNER_JUDGE_NOT_INDEPENDENT');
 const jwt=await requestGitHubOidcJwt(env);
 const result=await runOwnerOidcAndEd25519SandboxRepair({
  oidcJwt:jwt,
  oidcContext:{
   sha:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,
   actorId:env.GITHUB_ACTOR_ID,repoId:env.GITHUB_REPOSITORY_ID,
   audience:AUDIENCE,eventName:'workflow_dispatch'
  },
  ownerRequest:{
   token:env.ULTRA_SENTINEL_OWNER_GITHUB_TOKEN,
   authorization:request.authorization,
   authorizationSignature:request.authorizationSignature,
   trustedPublicKey,
   nonceStorePath:request.nonceStorePath,
   directory,plan:request.plan,changes:request.changes,
   expectedHeadSha:request.expectedHeadSha,
   verifyRed:red,verifyRepair:validateTest,judgeRepair:judge
  }
 });
 if(result.status!=='DUAL_AUTH_SANDBOX_REPAIR_VERIFIED'&&
    result.status!=='DUAL_AUTH_SANDBOX_ROLLBACK_VERIFIED')
  throw Error('DUAL_OWNER_OPERATION_UNVERIFIED');
 process.stdout.write(result.status+'\n');
}
if(require.main===module)main().catch(()=>{
 // Errors, user request, private keys, JWT and host token must never leak.
 process.stderr.write('DUAL_OWNER_SIGNED_SANDBOX_BLOCKED\n');
 process.exitCode=1;
});
module.exports={main,requireAuthenticatedActionsContext,requestGitHubOidcJwt};
