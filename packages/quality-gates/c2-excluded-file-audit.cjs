'use strict';
// Truth-blind supplementary scan of historically EXCLUDED test/build diffs.
// Source/diff transport is not equivalent to frozen Core semantic analysis.
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const {eligibleForFrozenCore}=require('./c2-core-eligibility.cjs');
const {verifyEightSourceCompares}=require('./c2-source-universe.cjs');
const SHA=/^[0-9a-f]{40}$/;
function fail(){throw Error('C2_EXCLUDED_SCOPE_BLOCKED');}
function classifyExcluded(p){
 if(/^app\/src\/test\/.*Test\.kt$/.test(p))return 'UNIT_TEST';
 if(/^app\/src\/androidTest\/.*Test\.kt$/.test(p))return 'INSTRUMENTED_TEST';
 if(p==='app/build.gradle.kts')return 'BUILD_GRADLE';
 return null;
}
function hash(s){return crypto.createHash('sha256').update(s).digest('hex');}
function countFullHunks(patch,expectedAdds,expectedDels){
 if(typeof patch!=='string'||!patch.length||Buffer.byteLength(patch)>320000)fail();
 const lines=patch.replace(/\r\n/g,'\n').split('\n');
 let hunks=0,old=0,newCount=0,oldNeed=0,newNeed=0,plus=0,minus=0;
 let active=false;
 function close(){if(active&&(old!==oldNeed||newCount!==newNeed))fail();}
 for(let i=0;i<lines.length;i++){
  const row=lines[i];
  if(i===lines.length-1&&row==='')continue;
  const m=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?:.*)$/.exec(row);
  if(m){
   close();hunks++;
   oldNeed=m[2]===undefined?1:Number(m[2]);newNeed=m[4]===undefined?1:Number(m[4]);
   if(!Number.isSafeInteger(oldNeed)||!Number.isSafeInteger(newNeed)||
      oldNeed<0||newNeed<0||oldNeed>100000||newNeed>100000)fail();
   old=0;newCount=0;active=true;continue;
  }
  if(!active)fail();
  if(row.startsWith('\\ No newline at end of file'))continue;
  const ch=row[0];
  if(ch==='+'){plus++;newCount++;}
  else if(ch==='-'){minus++;old++;}
  else if(ch===' '){old++;newCount++;}
  else fail();
  if(old>oldNeed||newCount>newNeed)fail();
 }
 close();
 if(!hunks||plus!==expectedAdds||minus!==expectedDels)fail();
 return {hunks,additions:plus,deletions:minus,
  changedLineText:lines.filter(l=>l.startsWith('+')).map(l=>l.slice(1))};
}
function risks(type,source){
 const rows=source.changedLineText;
 const result=[];
 for(const [idx,l] of rows.entries()){
  const str=l.trim();
  // Audit prompts, not automatically confirmed defects. Preserve only rule ID,
  // line ordinal and SHA without publishing untrusted full source.
  const testSkip=type!=='BUILD_GRADLE'&&
   /(?:@Ignore\b|@Disabled\b|Assume\.assumeFalse\s*\(\s*true|assumeTrue\s*\(\s*false)/.test(str);
  const gradleBypass=type==='BUILD_GRADLE'&&
   /(?:ignoreFailures\s*=\s*true|isEnabled\s*=\s*false|enabled\s*=\s*false|testLogging.*disabled|failOnNoMatchingTests\s*=\s*false)/i.test(str);
  if(testSkip)result.push({rule:'ADDED_TEST_SKIP_REQUIRES_REVIEW',addedLineOrdinal:idx+1});
  if(gradleBypass)result.push({rule:'ADDED_GRADLE_GUARD_BYPASS_REQUIRES_REVIEW',addedLineOrdinal:idx+1});
 }
 return result.slice(0,50);
}
function auditExcludedSourceScope(comparisons){
 let inv;
 try{inv=verifyEightSourceCompares(comparisons);}catch{fail();}
 const receipts=[];let eligible=0,excluded=0,unit=0,instrument=0,gradle=0;
 for(let i=0;i<NEW_LOCK.cases.length;i++){
  const frozen=NEW_LOCK.cases[i],cmp=comparisons[i];
  if(cmp.files.length!==frozen.changedFiles)fail();
  for(const f of cmp.files){
   const path=f.filename;
   if(!SHA.test(f.sha)||f.changes!==f.additions+f.deletions)fail();
   if(eligibleForFrozenCore(path)){eligible++;continue;}
   const type=classifyExcluded(path);
   if(!type)fail(); // no unknown file silently clears the 88
   const inspected=countFullHunks(f.patch,f.additions,f.deletions);
   excluded++;
   if(type==='UNIT_TEST')unit++;
   if(type==='INSTRUMENTED_TEST')instrument++;
   if(type==='BUILD_GRADLE')gradle++;
   receipts.push({pr:frozen.pr,path,headSha:frozen.headSha,sourceBlobSha:f.sha,
    diffSha256:hash(Buffer.from(f.patch,'utf8')),
    patchBytes:Buffer.byteLength(f.patch,'utf8'),
    additions:inspected.additions,deletions:inspected.deletions,hunks:inspected.hunks,
    class:type,reviewType:'DIFF_STRUCTURE_PLUS_ADDED_LINE_HEURISTIC',
    suspectPatterns:risks(type,inspected),
    originalTestBehaviorExecuted:false,
    originalCodeBugAuthenticated:false,
    scopedTruthLabelsAdded:0});
  }
 }
 if(eligible+excluded!==241||inv.changedFileEntries!==241)fail();
 const withoutDigest={
  schema:'ultra-sentinel-c2-excluded-file-diff-audit/v1',
  repository:NEW_LOCK.repository,sourceInventorySha256:inv.sourceInventorySha256,
  changedFileEntries:241,coreEligibleUpperBound:eligible,
  excludedEntriesInspected:excluded,excludedUnitTests:unit,
  excludedInstrumentedTests:instrument,excludedGradleFiles:gradle,
  receipts,sourceBytesCheckedAgainstGitMetadata:true,
  fullOriginalTestExecution:false,coreEngineModified:false,
  frozenCoreFullSemanticCoverageEstablished:false,
  candidateInspected:false,baselineCompared:false,truthLabelsAdded:0,
  precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  status:'EXCLUDED_PATCHES_INSPECTED_NOT_SEMANTICALLY_CLEARED'
 };
 return Object.freeze({...withoutDigest,auditDigest:hash(JSON.stringify(withoutDigest))});
}

// Second-stage original-full-blob audit. Verify bytes against the Git SHA
// supplied by original frozen compare; do not execute untrusted repository code.
function verifyOriginalExcludedHeadBlobs(audit,root){
 const fs=require('node:fs'),path=require('node:path');
 if(!audit||audit.schema!=='ultra-sentinel-c2-excluded-file-diff-audit/v1'||
  !Array.isArray(audit.receipts)||audit.receipts.length!==audit.excludedEntriesInspected||
  !Number.isSafeInteger(audit.excludedEntriesInspected)||!Number.isSafeInteger(audit.changedFileEntries)||
  audit.changedFileEntries!==241||!audit.sourceBytesCheckedAgainstGitMetadata||
  audit.truthLabelsAdded!==0||audit.tripleSPlusCertified!==false||
  !/^[a-f0-9]{64}$/.test(audit.auditDigest)||
  typeof root!=='string'||!path.isAbsolute(root))fail();
 const {auditDigest,...body}=audit;
 if(hash(JSON.stringify(body))!==auditDigest)fail();
 let realRoot;
 try{
  const stat=fs.lstatSync(root);
  if(!stat.isDirectory()||stat.isSymbolicLink())fail();
  realRoot=fs.realpathSync(root);
 }catch{fail();}
 const seen=new Set(),items=[];let unit=0,instrument=0,gradle=0;
 for(const item of audit.receipts){
  if(!item||!SHA.test(item.sourceBlobSha)||typeof item.path!=='string'||
     !/^[a-zA-Z0-9_.\/-]+$/.test(item.path)||item.path.startsWith('/')||
     item.path.split('/').includes('..')||!NEW_LOCK.cases.some(x=>x.pr===item.pr&&x.headSha===item.headSha)||
     classifyExcluded(item.path)!==item.class||seen.has(item.pr+'|'+item.path))fail();
  seen.add(item.pr+'|'+item.path);
  const file=path.resolve(realRoot,'pr-'+item.pr,'head',item.path);
  if(!file.startsWith(realRoot+path.sep))fail();
  let bytes;
  try{
   if(fs.realpathSync(file)!==file)fail();
   const stat=fs.lstatSync(file);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
    stat.size<1||stat.size>8*1024*1024)fail();
   bytes=fs.readFileSync(file);
  }catch{fail();}
  if(bytes.length>8*1024*1024||bytes.includes(0))fail();
  const gitBlob=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(gitBlob!==item.sourceBlobSha)fail();
  let fullSource;
  try{fullSource=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
  catch{fail();}
  const warningRules=[];
  if(item.class!=='BUILD_GRADLE'){
   if(/@Ignore\b|@Disabled\b/.test(fullSource))warningRules.push('IGNORED_TEST_REQUIRES_REVIEW');
   if(/\bassert(?:True|False|Equals|NotNull|Null|Throws)\s*\(/.test(fullSource)||
    /\bassert\s*\(/.test(fullSource)){}else warningRules.push('NO_RECOGNIZED_ASSERTION_HEURISTIC_ONLY');
  }else{
   if(/(?:ignoreFailures\s*=\s*true|isEnabled\s*=\s*false|failOnNoMatchingTests\s*=\s*false)/i.test(fullSource))
    warningRules.push('GRADLE_TEST_POLICY_REQUIRES_REVIEW');
  }
  if(item.class==='UNIT_TEST')unit++;
  if(item.class==='INSTRUMENTED_TEST')instrument++;
  if(item.class==='BUILD_GRADLE')gradle++;
  items.push({pr:item.pr,path:item.path,originalBlobSha:item.sourceBlobSha,
   originalSha256:hash(bytes),bytesRead:bytes.length,contentType:item.class,
   fullContentReadable:true,lexicalWarnings:warningRules,
   semanticCorrectnessProven:false,behaviorExecuted:false,authenticTruthLabelsAdded:0});
 }
 if(seen.size!==audit.excludedEntriesInspected||
  unit!==audit.excludedUnitTests||instrument!==audit.excludedInstrumentedTests||
  gradle!==audit.excludedGradleFiles)fail();
 const payload={schema:'ultra-sentinel-c2-excluded-original-blob-review/v1',
  sourceInventorySha256:audit.sourceInventorySha256,
  sourceDiffAuditSha256:audit.auditDigest,verifiedOriginalHeadBlobs:items.length,
  originalKotlinTestFilesVerified:unit+instrument,
  originalGradleFilesVerified:gradle,
  originalSourceContentReviewComplete:true,
  items,truthLabelsAdded:0,candidateInspected:false,baselineCompared:false,
  coreFullSemanticCoverageCertified:false,
  originalCodeDefectFreeCertified:false,
  precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  status:'ORIGINAL_HEAD_CONTENT_INSPECTED_HEURISTIC_ONLY_NOT_CERTIFIED'};
 return Object.freeze({...payload,fullSourceAuditSha256:hash(JSON.stringify(payload))});
}

module.exports={auditExcludedSourceScope,classifyExcluded,countFullHunks,verifyOriginalExcludedHeadBlobs};
