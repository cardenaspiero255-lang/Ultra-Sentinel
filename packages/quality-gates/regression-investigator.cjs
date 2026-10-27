'use strict';
/**
 * Deterministic read-only bisect planner over supplied, ordered Git commit IDs.
 * Observations are not authenticated; no code is checked out or executed.
 */
const SHA=/^[a-f0-9]{40}$/;
const REPOSITORIES=new Set([
 'cardenaspiero255-lang/Ultra-Sentinel',
 'cardenaspiero255-lang/gamehub-ultra',
 'cardenaspiero255-lang/JARVIS'
]);
function exact(obj,keys){
 return obj!==null&&typeof obj==='object'&&!Array.isArray(obj)&&
  Object.getPrototypeOf(obj)===Object.prototype&&
  Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));
}
function fail(){throw Error('INVALID_REGRESSION_EVIDENCE');}
function planRegressionBisect(input){
 if(!exact(input,['repository','commits','observations'])||
  !REPOSITORIES.has(input.repository)||!Array.isArray(input.commits)||
  input.commits.length<2||input.commits.length>512||
  !input.commits.every(s=>typeof s==='string'&&SHA.test(s))||
  new Set(input.commits).size!==input.commits.length||
  !Array.isArray(input.observations)||input.observations.length>input.commits.length)
  fail();
 const indices=new Map(input.commits.map((sha,i)=>[sha,i]));
 const found=new Map();
 for(const receipt of input.observations){
  if(!exact(receipt,['sha','result'])||!indices.has(receipt.sha)||
   !['GOOD','BAD'].includes(receipt.result)||found.has(receipt.sha))fail();
  found.set(receipt.sha,receipt.result);
 }
 const first=input.commits[0],last=input.commits.at(-1);
 let status,nextSha=null,suspectedFirstBadSha=null;
 const positive=[...found].filter(([,r])=>r==='GOOD').map(([sha])=>indices.get(sha));
 const negative=[...found].filter(([,r])=>r==='BAD').map(([sha])=>indices.get(sha));
 if(found.get(first)!=='GOOD'||found.get(last)!=='BAD')status='MISSING_BOUNDARY_OBSERVATIONS';
 else{
  const good=Math.max(...positive),bad=Math.min(...negative);
  if(good>=bad)status='NON_MONOTONIC_INCONCLUSIVE';
  else if(bad===good+1){status='CANDIDATE_REQUIRES_REPRO';suspectedFirstBadSha=input.commits[bad];}
  else{status='TEST_REQUIRED';nextSha=input.commits[Math.floor((good+bad)/2)];}
 }
 return Object.freeze({schema:'ultra-sentinel-regression-bisect-plan/v1',
  repository:input.repository,status,nextSha,suspectedFirstBadSha,
  observedCount:input.observations.length,commitsConsidered:input.commits.length,
  commitsVerifiedExternally:false,causalityVerified:false,executable:false,
  mergeAllowed:false,autoRepairAllowed:false,
  limitation:'Supplied commit ordering, build outcomes and test receipts are untrusted. Authenticate source Git ancestry and independent CI before any causal conclusion.'});
}
module.exports={planRegressionBisect};

/** Verify supplied ordering against local immutable Git objects; never checkout,
 * execute a project's tests or treat caller observations as authenticated CI.
 * Only contiguous single-parent histories are supported. Merges require a
 * separate causal experiment, not an arbitrary first-parent assumption.
 */
function planRegressionFromGit({directory,input}={}){
 try{
  const fs=require('node:fs'),path=require('node:path');
  const {spawnSync}=require('node:child_process');
  const {assertSafeGitCheckout}=require('../recovery/git-sandbox-policy.cjs');
  const plan=planRegressionBisect(input);
  if(typeof directory!=='string'||!path.isAbsolute(directory)||
   fs.realpathSync(directory)!==directory)throw Error('UNSAFE_DIRECTORY');
  assertSafeGitCheckout(directory);
  const gitRead=(args,raw=false)=>{
   const r=spawnSync('git',['--no-replace-objects','-c','core.hooksPath=/dev/null',
    '-c','core.fsmonitor=false','-c','protocol.allow=never',...args],{
    cwd:directory,timeout:10000,maxBuffer:200000,
    env:{PATH:process.env.PATH,HOME:directory,GIT_CONFIG_NOSYSTEM:'1',
     GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1'}
   });
   if(r.error||r.status!==0)throw Error('GIT_READ_FAILED');
   return raw?r.stdout:r.stdout.toString('utf8').trim();
  };
  const git=(...args)=>gitRead(args);
  const config=git('config','--local','--name-only','--list').split('\n');
  if(config.some(k=>/^extensions\.partialclone$|^remote\..*\.promisor$/i.test(k))||
   git('rev-parse','--is-shallow-repository')!=='false'||
   fs.existsSync(path.join(directory,'.git/info/grafts'))||
   git('for-each-ref','--format=%(refname)','refs/replace')!=='')throw Error('ALTERED_HISTORY');
  for(let i=0;i<input.commits.length;i++){
   const sha=input.commits[i];
   if(git('cat-file','-t',sha)!=='commit')throw Error('NOT_COMMIT');
   const bytes=gitRead(['cat-file','commit',sha],true);
   const actual=require('node:crypto').createHash('sha1')
    .update('commit '+bytes.length+'\0').update(bytes).digest('hex');
   if(actual!==sha)throw Error('COMMIT_HASH_MISMATCH');
   const parents=bytes.toString('utf8').split('\n\n',1)[0].split('\n')
    .filter(line=>line.startsWith('parent ')).map(line=>line.slice(7));
   if(parents.length>1||parents.some(p=>!SHA.test(p))||
    (i>0&&(parents.length!==1||parents[0]!==input.commits[i-1])))
    throw Error('NONCONTIGUOUS_HISTORY');
  }
  return Object.freeze({...plan,localGitLineageVerified:true,
   observationsAuthenticated:false,remoteRepositoryIdentityAuthenticated:false,
   limitation:'Contiguous single-parent links verified from local Git objects only. Repository identity, CI observations and causal reproduction remain unauthenticated; no project code executed.'});
 }catch{throw Error('UNVERIFIED_GIT_LINEAGE');}
}
module.exports.planRegressionFromGit=planRegressionFromGit;
