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
module.exports={auditExcludedSourceScope,classifyExcluded,countFullHunks};
