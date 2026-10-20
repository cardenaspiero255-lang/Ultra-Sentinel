'use strict';
/*
 * Read-only applicability triage for SIX REVEALED, already-known Detekt PRs.
 * Pinned to original PR base/head commits and exact Git blobs. The GitHub
 * compare is a HEAD-side PR diff; it does not replace the original SWE-bench
 * task patch or independently attest Kotlin execution. A divergent history
 * is reported, never normalized to an "ahead" history.
 *
 * This packet is a source/heuristic DIAGNOSTIC, NOT gold truth, holdout, a
 * precision/recall measurement, or proof of a Sentinel detection rule.
 */
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {writeFileSync}=require('node:fs');
const {analyze}=require('../core/ultra_sentinel_core.cjs');

const REPO='detekt/detekt';
const REPLAY=39321487604;
const SENTINEL_COMMIT='7f522420ef5e2384dbafe7a560b569a6ee68b86b';
const SHA=/^[0-9a-f]{40}$/;
const TARGETS=Object.freeze([
 {pr:7625,baseSha:'82ab4c5ac06f006a0906920687dc016af37642a6',headSha:'b44ff5ea2a6a408380638f2d68d590ee4c53e3ca',changedFiles:2,
  path:'detekt-core/src/main/kotlin/io/gitlab/arturbosch/detekt/core/baseline/BaselineFormat.kt',
  baseBlob:'bdeba40dbc931e5f421cce6c3e040d84542ef253',headBlob:'316fefca71360d95d6562092068c1c8daf8619b8',
  hypothesis:'XML_EMPTY_BASELINE_TAG_SERIALIZATION',focus:false},
 {pr:7635,baseSha:'d53028caa506a25443e9ea9c1498329daf94b001',headSha:'9538ac777514cc57eaba7baaf77dd66fed03b756',changedFiles:3,
  path:'detekt-rules-documentation/src/main/kotlin/io/gitlab/arturbosch/detekt/rules/documentation/UndocumentedPublicClass.kt',
  baseBlob:'02d40349ee3c37e1fa548185615d21cd96053843',headBlob:'e1c07d2b4cc5716b6df7450a442be60d20a0aede',
  hypothesis:'DEFAULT_COMPANION_DOCUMENTATION_CONFIG',focus:false},
 {pr:7667,baseSha:'7f5799dd496e63648212550b5a3d3c7cac9b77ff',headSha:'cac2f057f84b8cd389eb66e06bee23bd27108b4e',changedFiles:4,
  path:'detekt-report-sarif/src/main/kotlin/io/github/detekt/report/sarif/SarifOutputReport.kt',
  baseBlob:'1134fc0efcefcb33b2e9abc9c7adafb9d3cbbbab',headBlob:'810559ff85d0fd2b3f1fe4e93b157498ef0566c9',
  hypothesis:'SARIF_UNNECESSARY_ORIGINAL_URI_BASE_IDS',focus:false},
 {pr:7715,baseSha:'8a3565572208446ff769152ded9ca5bdf957f8b0',headSha:'5d9ee0d6d61e7b59d798c99611e48e4105681624',changedFiles:2,
  path:'detekt-rules-exceptions/src/main/kotlin/io/gitlab/arturbosch/detekt/rules/exceptions/ThrowingExceptionsWithoutMessageOrCause.kt',
  baseBlob:'e4325e8663f5a9c852bb3258c13e6f3625dff273',headBlob:'7d6ba408db3764568204e2c689aff260d8ffc3f7',
  hypothesis:'CASE_INSENSITIVE_EXCEPTION_CALLEE_FALSE_POSITIVE',focus:true},
 {pr:7718,baseSha:'a4ec32a2a496439a2580951f4c340146a0e3d610',headSha:'e1bf7410cf9bb416bc91bf369daa356716e9a863',changedFiles:4,
  path:'detekt-report-sarif/src/main/kotlin/io/github/detekt/report/sarif/Results.kt',
  baseBlob:'bc8bec324cfeb1df801b64b1228f734e5a8132d1',headBlob:'3ad619b8902d86f322dbd3e5f423bfe838a20ef8',
  hypothesis:'SARIF_MISSING_PARTIAL_FINGERPRINT',focus:false},
 {pr:7888,baseSha:'6c8f571d886aa581b62b02964e00ef7008559e72',headSha:'97e110402f4f25fccdfa0875b42300dac43dc41f',changedFiles:3,
  path:'detekt-rules-style/src/main/kotlin/io/gitlab/arturbosch/detekt/rules/style/UnusedImport.kt',
  baseBlob:'ba7006f1747c8a16f24141f35d69142f57ea3862',headBlob:'052f7599181c6deac16c009ca12aa091c56e0206',
  hypothesis:'NON_CONFIGURABLE_ADDITIONAL_IMPORT_OPERATORS',focus:true}
].map(t=>Object.freeze(t)));

function fail(reason){throw Error('C2_DETEKT_APPLICABILITY_BLOCKED: '+reason);}
function gitBlobString(blob,expected){
 if(!SHA.test(expected||'')||!blob||blob.sha!==expected||blob.encoding!=='base64'||
   !Number.isSafeInteger(blob.size)||blob.size<=0||blob.size>160000||
   typeof blob.content!=='string'||blob.content.length>225000)fail('unverified source blob');
 const bytes=Buffer.from(blob.content.replace(/\s/g,''),'base64');
 if(bytes.length!==blob.size||bytes.includes(0)||
   !Buffer.from(bytes.toString('utf8'),'utf8').equals(bytes)||
   createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')!==expected)
   fail('source blob integrity mismatch');
 return bytes.toString('utf8');
}
function nonCommentLine(source,re){
 // All fixtures/original sources are SHA-bound. This extra lexical guard
 // prevents a common false witness from a single commented-out line.
 return source.split(/\r?\n/).some(x=>!/^\s*(?:\/\/|\*|\/\*)/.test(x)&&re.test(x));
}
function staticCounterfactualWitness(pr,before,after){
 if(typeof before!=='string'||typeof after!=='string'||before.length>160000||after.length>160000)
   fail('invalid counterfactual source');
 let changed=false,details;
 if(pr===7715){
  const old=/^\s*if\s*\(exceptions\.any\s*\{\s*calleeExpressionText\?\.equals\(it,\s*ignoreCase\s*=\s*true\)\s*==\s*true\s*\}\s*&&/;
  const fixed=/^\s*if\s*\(exceptions\.any\s*\{\s*calleeExpressionText\s*==\s*it\s*\}\s*&&/;
  changed=nonCommentLine(before,old)&&nonCommentLine(after,fixed)&&
    !nonCommentLine(after,old);
  details='case-insensitive exception-callee comparison replaced with exact identifier equality';
 }else if(pr===7888){
  const hardcoded=/^\s*private val additionalOperatorSet\s*=\s*setOf\s*\(/;
  const configurable=/^\s*private val additionalOperatorSet\s*:\s*List<String>\s*by\s*config\(emptyList\(\)\)/;
  const passed=/^\s*(?:with\s*\()?UnusedImportVisitor\(bindingContext,\s*additionalOperatorSet\)/;
  changed=nonCommentLine(before,hardcoded)&&/"assign"/.test(before)&&
    /!additionalOperatorSet\.contains\(identifier\)/.test(before)&&
    nonCommentLine(after,configurable)&&nonCommentLine(after,passed)&&
    !nonCommentLine(after,hardcoded);
  details='hardcoded additional import operators replaced with configurable rule input';
 }else return Object.freeze({kind:'NOT_EXECUTED_IN_THIS_STAGE',changeObserved:null});
 return Object.freeze({kind:'SOURCE_STATIC_CONTRAST_ONLY',changeObserved:changed,
  limitation:'Immutable source-text contrast, NOT Kotlin compiler execution or independent detector oracle',
  detail:details});
}
function patchComplete(file){
 if(!file||file.status!=='modified'||typeof file.patch!=='string'||
   file.patch.length===0||file.patch.length>320000||
   !Number.isSafeInteger(file.additions)||file.additions<0||
   !Number.isSafeInteger(file.deletions)||file.deletions<0||
   !Number.isSafeInteger(file.changes)||file.changes<1||file.changes!==file.additions+file.deletions)
  return false;
 let inHunk=false,plus=0,minus=0,blocks=0;
 for(const row of file.patch.split('\n')){
  if(/^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/.test(row)){blocks++;inHunk=true;}
  else if(inHunk&&row.startsWith('+')&&!row.startsWith('+++'))plus++;
  else if(inHunk&&row.startsWith('-')&&!row.startsWith('---'))minus++;
 }
 return blocks>0&&plus===file.additions&&minus===file.deletions;
}
// Verify that every context/added line in the immutable PR hunk matches
// the actual HEAD blob; this is essential for deletion-only diffs, where
// Core's added-line scanner never enters its sourceMatches branch.
function patchPostImageMatchesSource(patch,fullSource){
 if(typeof patch!=='string'||typeof fullSource!=='string')return false;
 const lines=fullSource.split(/\r?\n/);let cursor=0,seen=false;
 const rows=patch.split('\n');
 for(const [index,raw] of rows.entries()){
  const h=/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
  if(h){cursor=Number(h[1])-1;seen=true;continue;}
  if(!seen) return false;
  if(raw===''&&index===rows.length-1)continue; // diff's terminal LF only
  if(raw.startsWith('\\ No newline at end of file'))continue;
  if(raw.startsWith('-')&&!raw.startsWith('---'))continue;
  if(raw.startsWith('+')||raw.startsWith(' ')){
   if(lines[cursor]!==raw.slice(1))return false;
   cursor++;continue;
  }
  return false;
 }
 return seen;
}
function assessTarget(target,{compare,before,after}={}, {detector=analyze}={}){
 if(!target||!Number.isSafeInteger(target.pr)||!SHA.test(target.baseSha||'')||
   !SHA.test(target.headSha||'')||!SHA.test(target.baseBlob||'')||
   !SHA.test(target.headBlob||'')||!Number.isInteger(target.changedFiles)||
   target.changedFiles<1||typeof target.path!=='string'||
   !target.path.includes('/src/main/kotlin/')||!target.path.endsWith('.kt')||
   target.path.includes('..'))fail('invalid target lock');
 if(!compare||!['ahead','diverged'].includes(compare.status)||
   compare.base_commit?.sha!==target.baseSha||
   !Array.isArray(compare.commits)||!compare.commits.length||
   compare.commits.at(-1)?.sha!==target.headSha||
   !Array.isArray(compare.files)||compare.files.length!==target.changedFiles||
   !SHA.test(compare.merge_base_commit?.sha||''))
   fail('wrong upstream commit chain');
 if(compare.status==='ahead'&&compare.merge_base_commit.sha!==target.baseSha)
   fail('non-ancestor compare falsely marked ahead');
 const picked=compare.files.filter(x=>x.filename===target.path);
 if(picked.length!==1||picked[0].sha!==target.headBlob||!patchComplete(picked[0]))
   fail('original PR hunk incomplete, mismatched or unpinned');
 const fullSource=gitBlobString(after,target.headBlob);
 const oldSource=target.focus?gitBlobString(before,target.baseBlob):null;
 const f=picked[0];
 const deletionOnly=f.additions===0;
 if(deletionOnly&&!patchPostImageMatchesSource(f.patch,fullSource))
   fail('deletion-only original post-image context mismatches pinned Git blob');
 const report=detector([{
  filename:target.path,status:f.status,sha:f.sha,additions:f.additions,
  deletions:f.deletions,changes:f.changes,patch:f.patch,fullSource
 }],{sha:target.headSha,sourceScope:'KOTLIN_JVM_V3_EXPERIMENTAL'});
 if(!report||report.sha!==target.headSha||
   report.mode!=='experimental-kotlin-jvm-v3-source-scope'||
   report.coverage?.returned!==1||report.coverage?.analyzed!==(deletionOnly?0:1)||
   report.coverage?.partial!==false||report.omitted!==0||
   report.verdict==='INCOMPLETE'||!Array.isArray(report.findings))
   fail('detector source scope incomplete');
 const findings=report.findings.map(x=>{
  if(!x||!/^[A-Z][A-Z0-9_]{2,80}$/.test(x.rule||'')||
    x.path!==target.path||!Number.isInteger(x.line)||x.line<1||
    x.line>fullSource.split(/\r?\n/).length)fail('untrusted detector finding');
  return {ruleId:x.rule,path:x.path,line:x.line,
    status:x.status,severity:x.severity};
 });
 return Object.freeze({
  pr:target.pr,repository:REPO,baseSha:target.baseSha,headSha:target.headSha,
  originalBaseBlob:target.baseBlob,headSourceBlob:target.headBlob,
  path:target.path,hypothesis:target.hypothesis,
  sourceKind:'PINNED_UPSTREAM_PR_TARGET_DIFF',sourceVerified:true,
  historyDiverged:compare.status==='diverged',
  comparisonMergeBase:compare.merge_base_commit.sha,
  partial:deletionOnly,analyzedFiles:report.coverage.analyzed,wholePrAnalyzed:false,
  limitedReason:deletionOnly?'DELETION_ONLY_NO_ADDED_LINES':null,
  coreMode:report.mode,coreVerdict:report.verdict,
  detectorFindings:findings,verifiedApplicableRuleId:null,
  detectorApplicabilityVerified:false,
  counterfactual:target.focus?staticCounterfactualWitness(target.pr,oldSource,fullSource):
    {kind:'NOT_EXECUTED_IN_THIS_STAGE',changeObserved:null},
  admitted:false,newLabels:0,blindHoldout:false,sssPlusCertified:false
 });
}
function captureDetektSix(receipts,{detector=analyze}={}){
 if(!receipts||typeof receipts!=='object'||Array.isArray(receipts)||
   Object.keys(receipts).length!==TARGETS.length||
   TARGETS.some(t=>!Object.hasOwn(receipts,t.pr)))fail('missing/extra source records');
 const rows=TARGETS.map(t=>assessTarget(t,receipts[t.pr],{detector}));
 if(rows.some(x=>!x.sourceVerified||
   (x.partial&&(x.pr!==7667||x.limitedReason!=='DELETION_ONLY_NO_ADDED_LINES'))||
   (x.counterfactual.kind==='SOURCE_STATIC_CONTRAST_ONLY'&&!x.counterfactual.changeObserved)))
   fail('source-only counterfactual not demonstrated');
 return Object.freeze({
  schema:'ultra-sentinel-c2-detekt-six-rule-applicability/v1',
  project:'cardenaspiero255-lang/Ultra-Sentinel',
  upstreamRepository:REPO,
  historicalJUnitReplay:REPLAY,
  sentinelBaselineCommit:SENTINEL_COMMIT,
  sourceKind:'IMMUTABLE_GITHUB_PR_COMPARE_HEAD_SOURCE',
  candidateCount:6,sourceVerifiedCount:6,
  fullyScannedTargetDiffs:rows.filter(x=>x.analyzedFiles===1).length,
  unscannedDeletionOnly:rows.filter(x=>x.limitedReason==='DELETION_ONLY_NO_ADDED_LINES').map(x=>x.pr),
  divergentPrHistories:rows.filter(x=>x.historyDiverged).map(x=>x.pr),
  focusPrs:[7715,7888],staticSourceCounterfactualCount:2,
  detectorApplicabilityVerifiedCount:0,
  detectorFindingsObserved:rows.reduce((n,x)=>n+x.detectorFindings.length,0),
  cases:rows,
  originalTestsRedGreenFromSeparateReplay:true,
  originalTestsIndependentAttestation:false,
  rootCausesIndependentlyVerified:false,
  historicalIndependenceVerified:false,
  wholePrCoverage:false,
  historicalLabels:23,newLabels:0,admittedLabels:0,
  blindHoldout:false,precision:null,recall:null,f1:null,
  tripleSPlusCertified:false,
  verdict:'SIX_SOURCE_DIFFS_VERIFIED_ONE_DELETION_ONLY_UNSCANNED_NO_RULE_ATTESTATION',
  limitation:'Known upstream PR diffs, not source-side detector alerts on original vulnerable commits; Kotlin static source comparison is not an independent causal execution. No detector-specific ruleId+original fault location or benign-counterfactual detections have been attested.'
 });
}
function ghJson(path){
 if(!process.env.GH_TOKEN)fail('read-only GitHub token required');
 const buf=execFileSync('gh',['api',path],{
  encoding:'utf8',timeout:45_000,maxBuffer:5*1024*1024,
  env:{...process.env,GH_PROMPT_DISABLED:'1'}
 });
 return JSON.parse(buf);
}
function runFromGithub(){
 const receipts={};
 for(const t of TARGETS){
  const compare=ghJson('/repos/'+REPO+'/compare/'+t.baseSha+'...'+t.headSha);
  const after=ghJson('/repos/'+REPO+'/git/blobs/'+t.headBlob);
  const before=t.focus?ghJson('/repos/'+REPO+'/git/blobs/'+t.baseBlob):null;
  receipts[t.pr]={compare,before,after};
 }
 return captureDetektSix(receipts);
}
if(require.main===module){
 try{
  if(process.argv.length!==3||!process.argv[2].startsWith('/'))fail('absolute output path required');
  const result=runFromGithub();
  writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({
   candidates:result.candidateCount,verifiedDiffs:result.sourceVerifiedCount,
   differentBaseHistories:result.divergentPrHistories,
   unscannedDeletionOnly:result.unscannedDeletionOnly,
   incidentalFindings:result.detectorFindingsObserved,
   provedApplicableRules:result.detectorApplicabilityVerifiedCount,
   newLabels:result.newLabels,certified:result.tripleSPlusCertified
  }));
 }catch(err){
  console.error(String(err?.message||err).slice(0,300));
  process.exitCode=2;
 }
}
module.exports={TARGETS,assessTarget,staticCounterfactualWitness,gitBlobString,captureDetektSix,runFromGithub};
