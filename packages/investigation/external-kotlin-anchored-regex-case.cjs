'use strict';
/*
 * A narrowly pinned, development-only original Kotlin validation experiment.
 * The independent JVM oracle must establish RED/GREEN, benign controls and
 * unsafe veto; regex source inspection by itself never establishes causality.
 */
const {snapshotRecord}=require('./plain-kotlin-payload.cjs');
const {blobSha}=require('./novel-kotlin-hypotheses.cjs');
const {isSafeNovelKotlinPath}=require('./novel-kotlin-path-policy.cjs');
const REPO='iamkurtgoz/ECommerceAndroidCompose';
const COMMIT='57f7a95021a125e0cdae4924c32891f6b70b0c5a';
const FILE='domain/src/main/java/com/iamkurtgoz/domain/util/Validator.kt';
const ORIGINAL='5b8af35cf6393dc9dbc6217b8d00329bda7bc196';
const RULE='ANCHORED_END_LINE_TERMINATOR_ACCEPTED';
const DECLARATION=/^\s*val\s+([A-Za-z_]\w*)\s*=\s*"(\^(?:\\.|[^"\\])*\$)"\.toRegex\(\)\s*$/;
const RETURN=/^\s*return\s+([A-Za-z_]\w*)\.containsMatchIn\(value\)\s*$/;
function outcome(status,findings=[],originalBlobSha=null,candidateSource=null,unsafeSource=null){
 return Object.freeze({
  schema:'ultra-sentinel-external-kotlin-anchored-regex-case/v1',
  status,rule:RULE,path:FILE,
  originalBlobSha,candidateSource,unsafeSource,
  candidateBlobSha:candidateSource===null?null:blobSha(candidateSource),
  unsafeBlobSha:unsafeSource===null?null:blobSha(unsafeSource),
  findings:Object.freeze(findings.map(f=>Object.freeze(f))),
  originalRemoteRepositoryAuthenticated:false,
  remoteRepositoryAuthenticated:false,
  originalJVMOracleVerified:false,independentCausalityVerified:false,
  novelDefectProven:false,phaseOneClosed:false,remoteWrites:false,
  mergeAllowed:false,productionReleaseAllowed:false
 });
}
function scanAndDraftAnchoredRegexCase(options={}){
 try{
  const x=snapshotRecord(options,
   ['repository','expectedCommitSha','path','source','expectedBlobSha']);
  if(x.repository!==REPO||x.expectedCommitSha!==COMMIT||
   x.path!==FILE||!isSafeNovelKotlinPath(x.path)||
   typeof x.source!=='string'||typeof x.expectedBlobSha!=='string'||
   x.expectedBlobSha!==ORIGINAL||blobSha(x.source)!==ORIGINAL)
   return outcome('BLOCKED_SOURCE_NOT_PINNED');
  const lines=x.source.split('\n'),findings=[],changes=[];
  for(let i=0;i<lines.length;i++){
   const d=DECLARATION.exec(lines[i]);if(!d)continue;
   const varName=d[1];
   for(let j=i+1;j<Math.min(lines.length,i+4);j++){
    if(lines[j].trim()==='}'||/\bfun\s+\w+\(/.test(lines[j]))break;
    const use=RETURN.exec(lines[j]);
    if(use&&use[1]===varName){
     findings.push({rule:RULE,line:j+1,path:FILE,expectedBlobSha:ORIGINAL,
      status:'HYPOTHESIS_REQUIRES_ORIGINAL_JVM_ORACLE',
      reason:'Dollar-anchored Java/Kotlin regex .containsMatchIn accepts a match before a final line terminator.'});
     changes.push(j);
    }
   }
  }
  if(findings.length!==3||changes.length!==new Set(changes).size)
   return outcome('BLOCKED_NO_UNAMBIGUOUS_THREE_VALIDATOR_HYPOTHESES');
  const revised=lines.slice();
  for(const index of changes){
   const original=revised[index];
   const updated=original.replace(/\.containsMatchIn\(value\)/,'.matches(value)');
   if(updated===original) return outcome('BLOCKED_UNEXPECTED_FIXER_TRANSFORM');
   revised[index]=updated;
  }
  const candidateSource=revised.join('\n');
  if(candidateSource===x.source||candidateSource.endsWith('\n')!==x.source.endsWith('\n'))
   return outcome('BLOCKED_UNCHANGED_CANDIDATE');
  const unsafeSource=candidateSource.replace('return regex.matches(value)','return false');
  if(unsafeSource===candidateSource||unsafeSource===x.source)
   return outcome('BLOCKED_UNSAFE_CONTROL_NOT_GENERATED');
  return outcome('ADVISORY_CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM',
   findings,ORIGINAL,candidateSource,unsafeSource);
 }catch{return outcome('BLOCKED_UNTRUSTED_INPUT');}
}
module.exports=Object.freeze({scanAndDraftAnchoredRegexCase});
