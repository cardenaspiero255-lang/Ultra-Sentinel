'use strict';
/**
 * Read-only bridge for previously unseen Kotlin main-source paths.
 * Source hashes here are caller-provided consistency checks, NOT GitHub
 * attestations. A source-aware compiler/original test oracle is required
 * before this draft can become a repair. No Git or source execution.
 */
const {createHash}=require('node:crypto');
const {analyze}=require('../core/ultra_sentinel_core.cjs');
const {analyzeFamilies}=require('../family-hunter/ultra_sentinel_family_fingerprints.cjs');
const {planRepair}=require('./supervised-repair.cjs');
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const SAFE=/^app\/src\/main\/(?:java|kotlin)\/[A-Za-z0-9_./-]+\.kt$/;
const STANDALONE_GC=/^[ \t]*(?:System\.gc\(\)|Runtime\.getRuntime\(\)\.gc\(\))[ \t]*;?[ \t]*$/;
const LIMIT=40000;
function digest(source,algorithm){
 return createHash(algorithm).update(Buffer.from(source,'utf8')).digest('hex');
}
function gitBlob(source){
 const bytes=Buffer.from(source,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function outcome(status,cases=[],analysis=null,families=null,plan=null){
 return Object.freeze({
  schema:'ultra-sentinel-unregistered-kotlin-investigation/v1',status,
  coreEngine:analysis?.engine||null,
  familyEngine:families?.engine||null,
  repairPlanStatus:plan?.status||null,
  cases:Object.freeze(cases),
  sourceRepositoryIdentityAuthenticated:false,
  originalOracleVerified:false,rootCauseVerified:false,
  crossFileCausalityVerified:false,
  ownerAuthorizationGranted:false,commitAllowed:false,mergeAllowed:false,
  remoteWrites:false,productionReleaseAllowed:false,
  limitation:'Local source-hash consistency and removal of a Core pattern are not Kotlin compilation, behavior preservation, verified provenance, or permission to apply a patch.'
 });
}
function allowedFile(file){
 if(!file||typeof file!=='object'||Array.isArray(file)||
   Object.getPrototypeOf(file)!==Object.prototype||
   Object.keys(file).sort().join(',')!=='expectedSha256,path,source'||
   typeof file.path!=='string'||file.path.length>350||
   !SAFE.test(file.path)||file.path.includes('//')||
   file.path.split('/').includes('..')||
   /(?:^|\/)(?:test|tests|testFixtures|androidTest)\//i.test(file.path)||
   typeof file.source!=='string'||!DIGEST.test(file.expectedSha256||'')||
   file.source.length<1||Buffer.byteLength(file.source,'utf8')>LIMIT||
   file.source.includes('\r')||file.source.includes('\0')||
   !file.source.endsWith('\n'))return false;
 const lines=file.source.slice(0,-1).split('\n');
 return lines.length>0&&lines.length<=1000&&
  lines.every(s=>Buffer.byteLength(s,'utf8')<=4000);
}
function coreFile(path,source){
 const lines=source.slice(0,-1).split('\n');
 return {filename:path,status:'added',changes:lines.length,
  additions:lines.length,deletions:0,
  patch:'@@ -0,0 +1,'+lines.length+' @@\n'+
   lines.map(line=>'+'+line).join('\n')+'\n',
  fullSource:source};
}
function investigateUnregisteredRepairs({headSha,files}={}){
 if(!SHA.test(headSha||'')||!Array.isArray(files)||
  files.length<1||files.length>4||!files.every(allowedFile))
  return outcome('BLOCKED_INVALID_INPUT');
 const seen=new Set();
 for(const f of files){
  if(seen.has(f.path))return outcome('BLOCKED_DUPLICATE_SOURCE');
  seen.add(f.path);
  if(digest(f.source,'sha256')!==f.expectedSha256)
   return outcome('BLOCKED_SOURCE_MISMATCH');
 }
 try{
  const sources=[...files].sort((a,b)=>a.path.localeCompare(b.path));
  const byPath=new Map(sources.map(x=>[x.path,x]));
  const analysis=analyze(sources.map(x=>coreFile(x.path,x.source)),{sha:headSha});
  if(analysis.verdict==='INCOMPLETE'||analysis.coverage?.partial!==false||
     analysis.omitted!==0||analysis.coverage?.analyzed!==sources.length)
   return outcome('BLOCKED_INCOMPLETE_CORE');
  const families=analyzeFamilies(analysis);
  const plan=planRepair({analysis,mode:'REVIEW_WITH_SOLUTIONS'});
  if(families.status==='INCOMPLETE'||plan.status!=='HUMAN_REVIEW_REQUIRED')
   return outcome('BLOCKED_INCOMPLETE_HANDOFF');
  const cases=[];
  for(const finding of analysis.findings){
   // Only a complete standalone invocation is safe to draft without an AST.
   // Other Core findings remain review-only: never guess their source edits.
   if(finding.rule!=='FORCED_GC'||finding.line<1)continue;
   const original=byPath.get(finding.path);
   if(!original)continue;
   const lines=original.source.slice(0,-1).split('\n');
   if(!STANDALONE_GC.test(lines[finding.line-1]||''))continue;
   const family=families.families.find(group=>group.rule===finding.rule&&
    group.locations.some(p=>p.path===finding.path&&p.line===finding.line));
   const step=plan.steps.find(s=>s.rule===finding.rule&&s.path===finding.path&&
    s.line===finding.line);
   if(!family||!step)continue;
   const revised=[...lines];revised[finding.line-1]='';
   const candidateSource=revised.join('\n')+'\n';
   // A fabricated candidate SHA must never be confused with an existing
   // remote commit: the provisional analysis uses a reserved local value.
   const candidate=analyze([coreFile(finding.path,candidateSource)],
    {sha:'0'.repeat(40)});
   if(candidate.verdict==='INCOMPLETE'||candidate.coverage?.partial!==false||
      candidate.findings.some(f=>f.path===finding.path&&
       f.rule===finding.rule&&f.line===finding.line))continue;
   const previousHigh=new Set(analysis.findings.filter(f=>
    ['BLOCKER','HIGH'].includes(f.severity)&&f.path===finding.path)
    .map(f=>JSON.stringify([f.rule,f.line])));
   if(candidate.findings.some(f=>f.path===finding.path&&
    ['BLOCKER','HIGH'].includes(f.severity)&&
    !previousHigh.has(JSON.stringify([f.rule,f.line]))))continue;
   cases.push(Object.freeze({rule:finding.rule,path:finding.path,
    line:finding.line,familyId:family.id,
    originalSourceGitBlob:gitBlob(original.source),
    candidateSourceGitBlob:gitBlob(candidateSource),
    beforeSha256:original.expectedSha256,
    afterSha256:digest(candidateSource,'sha256'),
    candidateSource,sourceBytesMatched:true,
    coreFindingGoneAfterDraft:true,
    suggestedTest:step.test,
    autofix:false,kotlinCompilationVerified:false,
    functionalRegressionVerified:false,remotelyAuthenticatedSource:false}));
  }
  cases.sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line);
  return outcome(cases.length?'LOCAL_DRAFTS_REQUIRE_ORIGINAL_ORACLE':
   'NO_SAFE_LOCAL_DRAFT',cases,analysis,families,plan);
 }catch{return outcome('BLOCKED_ANALYSIS_ERROR');}
}
module.exports={investigateUnregisteredRepairs};
