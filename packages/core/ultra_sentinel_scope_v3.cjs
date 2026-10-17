'use strict';
// Experimental V3 scope add-on. Neither imports nor mutates C2 frozen core;
// never certifies a defect, a clean test suite, or score parity.
const crypto=require('node:crypto');
const MAX_PATCH=320000,MAX_SOURCE=8*1024*1024;
const SHA=/^[a-f0-9]{40}$/;
function scopeKind(path){
 if(/^app\/src\/test\/[A-Za-z0-9_./-]*Test\.kt$/.test(path))return 'KOTLIN_UNIT_TEST';
 if(/^app\/src\/androidTest\/[A-Za-z0-9_./-]*Test\.kt$/.test(path))return 'KOTLIN_INSTRUMENTED_TEST';
 if(path==='app/build.gradle.kts')return 'GRADLE_KTS';
 return null;
}
function parseVerifiedSourceDiff(f,buf){
 if(typeof f.patch!=='string'||Buffer.byteLength(f.patch)>MAX_PATCH||!f.patch)throw Error('MISSING_PATCH');
 const lines=f.patch.replace(/\r\n/g,'\n').split('\n');
 const sourceLines=buf.toString('utf8').split(/\r?\n/);
 let oldRem=0,newRem=0,newCursor=0,active=false,oldCount=0,added=0,removed=0,hunks=0;
 const entries=[];
 for(let i=0;i<lines.length;i++){
  const row=lines[i];
  if(i===lines.length-1&&row==='')continue;
  const h=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(row);
  if(h){
   if(active&&(oldRem!==0||newRem!==0))throw Error('UNFINISHED_HUNK');
   hunks++;
   oldRem=h[2]===undefined?1:Number(h[2]);newRem=h[4]===undefined?1:Number(h[4]);
   newCursor=Number(h[3]);
   if(!Number.isSafeInteger(newCursor)||newCursor<1||
    !Number.isSafeInteger(oldRem)||!Number.isSafeInteger(newRem)||
    oldRem<0||newRem<0||oldRem>100000||newRem>100000)throw Error('BAD_HUNK');
   active=true;continue;
  }
  if(!active)throw Error('PATCH_OUTSIDE_HUNK');
  if(row.startsWith('\\ No newline at end of file'))continue;
  const prefix=row[0];
  if(prefix===' '||prefix==='+'){
   if(newCursor>sourceLines.length||sourceLines[newCursor-1]!==row.slice(1))
    throw Error('SOURCE_PATCH_MISMATCH');
   if(prefix==='+'){entries.push({line:newCursor,text:row.slice(1)});added++;}
   newCursor++;newRem--;
  }
  if(prefix===' '||prefix==='-'){oldRem--;if(prefix==='-')removed++;}
  if(![' ','+','-'].includes(prefix)||oldRem<0||newRem<0)throw Error('BROKEN_HUNK');
 }
 if(!hunks||oldRem!==0||newRem!==0||added!==f.additions||removed!==f.deletions)
  throw Error('PATCH_COUNT_MISMATCH');
 return entries;
}
function analyzeV3(files){
 const list=Array.isArray(files)?files:[];
 const findings=[],omissions=[],inputCount=list.length,seen=new Set();
 let verified=0,analyzed=0,partial=inputCount>300||inputCount===0;
 for(const f of list.slice(0,300)){
  const path=typeof f?.filename==='string'?f.filename:'';
  const kind=scopeKind(path);
  if(!kind||path.includes('..')||path.includes('//')||path.startsWith('/')||
   seen.has(path)||f.status==='removed'){partial=true;omissions.push(path||'[unknown]');continue;}
  seen.add(path);
  try{
   if(!SHA.test(f.sha)||typeof f.fullSource!=='string'||!Number.isSafeInteger(f.additions)||
      !Number.isSafeInteger(f.deletions)||f.additions<0||f.deletions<0||
      f.changes!==f.additions+f.deletions)throw Error('BAD_METADATA');
   const data=Buffer.from(f.fullSource,'utf8');
   if(data.length<1||data.length>MAX_SOURCE||data.includes(0))throw Error('BAD_SOURCE');
   const actual=crypto.createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
   if(actual!==f.sha)throw Error('BLOB_MISMATCH');
   const added=parseVerifiedSourceDiff(f,data);verified++;
   if(added.length>0)analyzed++; // structural source/patch inspection, not behavioral verification
   for(const a of added){
    const text=a.text;
    let rule=null;
    if(kind!=='GRADLE_KTS'&&/^\s*@(?:Ignore|Disabled)\b/.test(text))
     rule='KOTLIN_DISABLED_TEST_REVIEW';
    if(kind==='GRADLE_KTS'&&/\bignoreFailures\s*=\s*true\b/.test(text))
     rule='GRADLE_IGNORE_FAILURES_REVIEW';
    if(kind==='GRADLE_KTS'&&/\bfailOnNoMatchingTests\s*=\s*false\b/.test(text))
     rule='GRADLE_NO_MATCHING_TESTS_REVIEW';
    if(rule)findings.push({rule,path,line:a.line,severity:'MEDIUM',
     status:'NEEDS_VERIFICATION',origin:'V3 supplemental advisory rules'});
   }
  }catch{
   partial=true;omissions.push(path);
  }
 }
 return Object.freeze({
  engine:'Ultra Sentinel Core V3 scope preview',
  version:'3.0.0-scope-preview',mode:'supplemental-original-source-diff',
  scope:{provided:inputCount,originalBlobVerified:verified,
   analyzedAddedDiffs:analyzed,semanticBehaviorVerified:0,
   omitted:omissions.length+Math.max(0,inputCount-300),
   fullCoverageCertified:false,frozenCoreImmutable:true},
  findings,omissions,
  sourceFindingsAreVerifiedDefects:false,
  legacyBenchmarksComparable:false,
  frozenCandidateShaModified:false,scoredTruthLabels:0,
  verdict:partial?'INCOMPLETE':findings.length?'REVIEW_REQUIRED':'NO_ADVISORY_SIGNAL',
  certification:'NOT_CERTIFIED'
 });
}
module.exports={analyzeV3,scopeKind,parseVerifiedSourceDiff};
