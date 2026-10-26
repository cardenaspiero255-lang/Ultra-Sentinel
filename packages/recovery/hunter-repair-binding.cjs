'use strict';
/**
 * Pre-write provenance gate for an OWNER-SIGNED repair plan. It recomputes
 * Core/Family Hunter over trusted local baseline bytes, not caller-supplied
 * findings or untrusted PR metadata. Does not certify root cause or a fix.
 */
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {analyze}=require('../core/ultra_sentinel_core.cjs');
const {analyzeFamilies}=require('../family-hunter/ultra_sentinel_family_fingerprints.cjs');
const {assertSafeGitCheckout}=require('./git-sandbox-policy.cjs');
const SHA=/^[a-f0-9]{40}$/;
const FINGERPRINT=/^[a-f0-9]{24}$/;
const SAFE=/^(?:app\/src\/main\/|supabase\/functions\/)[A-Za-z0-9_./-]+$/;
function reject(){throw Error('HUNTER_SOURCE_BINDING_REJECTED');}
function git(cwd,...args){
 const run=spawnSync('git',['-c','core.hooksPath=/dev/null',
  '-c','core.fsmonitor=false','-c','commit.gpgsign=false',...args],{
  cwd,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
  env:{PATH:process.env.PATH,HOME:cwd,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}
 });
 if(run.error||run.status!==0)reject();
 return run.stdout.trim();
}
function blobSha(bytes){
 return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function verifyHunterRepairBinding({directory,expectedHeadSha,plan}={}){
 try{
  if(typeof directory!=='string'||!path.isAbsolute(directory)||
   typeof expectedHeadSha!=='string'||!SHA.test(expectedHeadSha)||
   !plan||typeof plan!=='object'||plan.expectedHeadSha!==expectedHeadSha||
   plan.status!=='REVIEW_READY_NO_EXECUTOR'||plan.commitAllowed!==false||
   plan.mergeAllowed!==false||typeof plan.branch!=='string'||
   !/^sandbox\/[a-z0-9._/-]+$/.test(plan.branch)||
   !Array.isArray(plan.changes)||plan.changes.length<1||plan.changes.length>30)
   reject();
  const root=fs.realpathSync(directory),tmp=fs.realpathSync(os.tmpdir());
  if(!root.startsWith(tmp+path.sep))reject();
  assertSafeGitCheckout(root);
  if(git(root,'remote')!==''||git(root,'branch','--show-current')!==plan.branch||
   git(root,'rev-parse','HEAD')!==expectedHeadSha||
   git(root,'status','--porcelain')!=='')reject();
  const chosen=plan.hunterFinding;
  if(!chosen||typeof chosen!=='object'||Array.isArray(chosen)||
   Object.getPrototypeOf(chosen)!==Object.prototype||
   Object.keys(chosen).sort().join(',')!=='familyId,line,path,rule'||
   typeof chosen.rule!=='string'||!/^[-A-Z_0-9]{3,80}$/.test(chosen.rule)||
   typeof chosen.path!=='string'||!SAFE.test(chosen.path)||chosen.path.includes('..')||
   !Number.isSafeInteger(chosen.line)||chosen.line<1||
   !FINGERPRINT.test(chosen.familyId))reject();
  const files=[],seen=new Set();
  for(const meta of plan.changes){
   if(!meta||typeof meta!=='object'||Array.isArray(meta)||
    typeof meta.path!=='string'||!SAFE.test(meta.path)||
    meta.path.includes('..')||meta.path.includes('\\')||seen.has(meta.path)||
    !SHA.test(meta.beforeBlobSha||'')||!SHA.test(meta.afterBlobSha||'')||
    meta.beforeBlobSha===meta.afterBlobSha||
    !Number.isSafeInteger(meta.patchBytes)||meta.patchBytes<1)reject();
   seen.add(meta.path);
   const absolute=path.resolve(root,meta.path);
   if(!absolute.startsWith(root+path.sep))reject();
   let current=root;
   for(const part of meta.path.split('/')){
    current=path.join(current,part);
    const st=fs.lstatSync(current);
    if(st.isSymbolicLink())reject();
   }
   const st=fs.lstatSync(absolute);
   if(!st.isFile()||st.nlink!==1||st.size<1||st.size>100000)reject();
   const bytes=fs.readFileSync(absolute);
   const source=bytes.toString('utf8');
   if(!Buffer.from(source,'utf8').equals(bytes)||source.includes('\0')||
    source.includes('\r')||!source.endsWith('\n'))reject();
   const rows=source.slice(0,-1).split('\n');
   if(rows.length>1500)reject();
   const patch='@@ -0,0 +1,'+rows.length+' @@\n'+rows.map(x=>'+'+x).join('\n')+'\n';
   if(Buffer.byteLength(patch,'utf8')>300000)reject();
   if(blobSha(bytes)!==meta.beforeBlobSha||
    git(root,'rev-parse',expectedHeadSha+':'+meta.path)!==meta.beforeBlobSha)reject();
   files.push({filename:meta.path,status:'added',
    changes:rows.length,additions:rows.length,deletions:0,
    patch,fullSource:source});
  }
  if(!seen.has(chosen.path))reject();
  // Core heuristics are intentionally rerun on the baseline complete sources.
  // This is provenance binding, NOT a claim that the source has a real defect.
  const analysis=analyze(files,{sha:expectedHeadSha});
  if(analysis.sha!==expectedHeadSha||analysis.verdict==='INCOMPLETE'||
   analysis.coverage?.partial!==false||analysis.omitted!==0)reject();
  const families=analyzeFamilies(analysis);
  if(families.status==='INCOMPLETE')reject();
  const found=analysis.findings.filter(f=>f.rule===chosen.rule&&
   f.path===chosen.path&&f.line===chosen.line);
  if(found.length!==1)reject();
  const matching=families.families.filter(f=>f.id===chosen.familyId&&
   f.rule===chosen.rule&&f.locations.some(loc=>
    loc.path===chosen.path&&loc.line===chosen.line));
  if(matching.length!==1)reject();
  return Object.freeze({status:'HUNTER_SOURCE_BOUND_NOT_CAUSAL_TRUTH',
   bound:true,headSha:expectedHeadSha,rule:chosen.rule,
   path:chosen.path,line:chosen.line,familyId:chosen.familyId,
   sourceFilesChecked:files.length,externalOracleVerified:false,
   rootCauseVerified:false,commitAllowed:false,mergeAllowed:false});
 }catch{reject();}
}
module.exports={verifyHunterRepairBinding};
