'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {evaluateOwnerObservedC2,FROZEN,WITNESS,PACKET_DIGEST}=
 require('../../packages/quality-gates/c2-owner-observed-benchmark.cjs');
const {EXPECTED,readPinnedJson}=require('../../scripts/evaluate-c2-owner-observed.cjs');
// Test-only mock data: these are NOT labels used for real-world scores.
function candidate(){return {schema:'ultra-sentinel-c2-live-cohort/v1',
 repository:'cardenaspiero255-lang/gamehub-ultra',prs:FROZEN.map(s=>s.pr),
 samples:FROZEN.map(s=>({...s,repository:'cardenaspiero255-lang/gamehub-ultra',
  readerStatus:'AUTHENTICATED_SOURCE_DIFF',
  candidate:{coverage:{partial:false,omitted:0,nonPositional:0},findings:
   s.pr===161?[{rule:'BLOCKING_ANDROID_CALL',
     path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/VoiceNetworkSnapshotFactory.kt',line:30}]:[]},
  checks:{total:2,success:2,failed:0,pending:0,skipped:0,
   observedState:'OBSERVED_SUCCESS_UNATTESTED'},
  baselineFindingsCollected:false,independentLabelsCollected:false,
  semanticParityCertified:false})),
 captureStatus:'CANDIDATE_SNAPSHOT_ONLY',independentLabelsVerified:false,
 baselineComparable:false,sourceChecksIndependentlyCertified:false,
 tripleSPlusCertified:false,autoCommit:false,autoMerge:false};}
function witness(){return {schema:'ultra-sentinel-c2-owner-witness/v1',
 repository:'cardenaspiero255-lang/gamehub-ultra',
 pr:WITNESS.pr,headSha:WITNESS.headSha,blobSha:WITNESS.blobSha,
 path:WITNESS.path,controls:{relevantAccepted:true,unrelatedTopicRejected:true},
 candidateDefect:{rule:WITNESS.rule,line:WITNESS.line,
  expected:'ABSTAIN_ON_UNRELATED_ARTICLE',
  observed:'UNRELATED_ARTICLE_MARKED_TRUSTED',reproduced:true},
 sampleKind:'REAL_PINNED_SOURCE_WITH_DETERMINISTIC_FIXTURE',
 independentHumanReview:false,externalTruthCertified:false,
 precisionRecallComputed:false,tripleSPlusCertified:false,mergeAllowed:false};}
function newsWitness(){return {schema:'ultra-sentinel-c2-owner-news-witness/v1',
 repository:'cardenaspiero255-lang/gamehub-ultra',
 pr:WITNESS.pr,headSha:WITNESS.headSha,blobSha:WITNESS.blobSha,path:WITNESS.path,
 controls:{independentHostsAccepted:true,sameHostRejected:true},
 candidateDefect:{rule:'NEWS_DOMAIN_DIVERSITY_INCONSISTENT',line:241,
 expected:'ABSTAIN_IF_DISTINCT_URL_HOSTS_LT_2',
 observed:'VERIFIED_NEWS_WITH_ONE_URL_HOST',reproduced:true},
 sampleKind:'REAL_PINNED_SOURCE_WITH_DETERMINISTIC_FIXTURE',
 independentHumanReview:false,externalTruthCertified:false,
 precisionRecallComputed:false,tripleSPlusCertified:false,mergeAllowed:false};}
function kotlinWitness(){return {
 schema:'ultra-sentinel-c2-kotlin-owner-oracles/v1',
 cases:[
  {pr:132,kind:'BENIGN_CONTROL',passed:true,reproduced:false},
  {pr:159,kind:'POSITIVE_BEHAVIOR',rule:'STALE_FRAME_TIMING_ACCEPTED',
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/performance/framepacing/FramePacingIntelligenceEngine.kt',
   line:129,reproduced:true},
  {pr:161,kind:'POSITIVE_BEHAVIOR',rule:'CROSS_TRANSPORT_LATENCY_MIX',
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/network/diagnostics/NetworkGamingDiagnosticsEngine.kt',
   line:43,reproduced:true,observedAverageLatencyMs:215}
 ],
 controlsPassed:true,syntheticDefectsClaimed:false,
 externalIndependenceClaimed:false,tripleSPlusCertified:false,autoMerge:false
};}
test('four witnessed behaviors across three PRs remain below global benchmark minimum',()=>{
 const r=evaluateOwnerObservedC2({capture:candidate(),witness:witness(),newsWitness:newsWitness(),kotlinWitness:kotlinWitness()});
 assert.equal(r.packetDigest,PACKET_DIGEST);
 assert.equal(r.verdict,'INSUFFICIENT_REAL_BENCHMARK_EVIDENCE');
 assert.deepEqual(r.observedKnownCases,{positive:4,detected:0,missed:4,
  recallWithinKnownCases:0,perPr:[
   {pr:73,positive:2,detected:0,missed:2},
   {pr:159,positive:1,detected:0,missed:1},
   {pr:161,positive:1,detected:0,missed:1}
  ]});
 assert.equal(r.population.unverifiedCandidateFindings,1);
 assert.equal(r.population.verifiedPositive,4);
 assert.equal(r.population.representedByPositiveCases,3);
 assert.equal(r.population.benignControlsObserved,1);
 assert.equal(r.population.neededAdditionalCasesAtLeast,116);
 assert.equal(r.population.verifiedFalsePositives,null);
 for(const metric of ['precision','recall','f1'])assert.equal(r.benchmark[metric],null);
 for(const key of ['tripleSPlusCertified','autoMerge','autoRepair'])assert.equal(r[key],false);
 assert.equal(r.independentHumanReviewerRequired,false);
});
test('even if one known case is detected, corpus remains below minimum',()=>{
 const c=candidate();
 c.samples[3].candidate.findings.push({rule:WITNESS.rule,path:WITNESS.path,line:WITNESS.line});
 const r=evaluateOwnerObservedC2({capture:c,witness:witness(),newsWitness:newsWitness(),kotlinWitness:kotlinWitness()});
 assert.deepEqual(r.observedKnownCases,{positive:4,detected:1,missed:3,
  recallWithinKnownCases:0.25,perPr:[
   {pr:73,positive:2,detected:1,missed:1},
   {pr:159,positive:1,detected:0,missed:1},
   {pr:161,positive:1,detected:0,missed:1}
  ]});
 assert.equal(r.population.unverifiedCandidateFindings,1);
 assert.equal(r.benchmark.f1,null);
});
test('wrong SHA, changed frozen packet, CI status, false controls or duplicate findings fail closed',()=>{
 const mutate=[
  (c,w)=>{c.samples[0].headSha='f'.repeat(40)},
  (c,w)=>{c.samples[3].changedFiles=19},
  (c,w)=>{c.samples[2].status='BLOCKED_INCOMPLETE_OR_STALE'},
  (c,w)=>{c.samples[1].candidate.coverage.partial=true},
  (c,w)=>{c.samples[0].checks.observedState='BLOCKED_SOURCE_CI'},
  (c,w)=>{c.samples[2].candidate.findings.push(c.samples[2].candidate.findings[0])},
  (c,w)=>{c.samples[1].candidate.findings.push({rule:'INVALID',path:'../a',line:1})},
  (c,w)=>{w.blobSha='0'.repeat(40)},
  (c,w)=>{w.candidateDefect.line=12},
  (c,w)=>{w.candidateDefect.reproduced=false},
  (c,w)=>{w.controls.relevantAccepted=false},
  (c,w)=>{w.candidateDefect.observed='UNRELATED_ARTICLE_NOT_TRUSTED'},
  (c,w)=>{w.tripleSPlusCertified=true},
  (c,w,n)=>{n.candidateDefect.reproduced=false},
  (c,w,n)=>{n.candidateDefect.line=42},
  (c,w,n)=>{n.controls.sameHostRejected=false},
  (c,w,n,k)=>{k.controlsPassed=false},
  (c,w,n,k)=>{k.cases[1].reproduced=false},
  (c,w,n,k)=>{k.cases[2].line=999},
  (c,w,n,k)=>{k.cases[2].observedAverageLatencyMs=30},
  (c,w,n,k)=>{k.cases[0].kind='POSITIVE_BEHAVIOR'},
  (c,w,n,k)=>{k.externalIndependenceClaimed=true},
  (c,w,n,k)=>{k.cases.push(k.cases[2])},
  (c,w)=>{c.prs[0]=163},
  (c,w)=>{c.samples[0].pr=163}
 ];
 for(const change of mutate){const c=candidate(),w=witness(),news=newsWitness(),kotlin=kotlinWitness();change(c,w,news,kotlin);
  assert.throws(()=>evaluateOwnerObservedC2({capture:c,witness:w,newsWitness:news,kotlinWitness:kotlin}),
   /UNVERIFIED_C2_OWNER_EVIDENCE/);}
});
test('exact byte hash, absolute paths and symlink rejection apply before scoring',()=>{
 assert.match(EXPECTED.candidate,/^[a-f0-9]{64}$/);
 assert.match(EXPECTED.witness,/^[a-f0-9]{64}$/);
 assert.match(EXPECTED.news,/^[a-f0-9]{64}$/);
 assert.match(EXPECTED.kotlin,/^[a-f0-9]{64}$/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-real-evidence-'));
 try{
  const file=path.join(dir,'candidate.json');
  fs.writeFileSync(file,JSON.stringify(candidate()));
  assert.throws(()=>readPinnedJson(file,EXPECTED.candidate),/UNVERIFIED_C2_EVIDENCE_FILE/);
  assert.throws(()=>readPinnedJson('relative.json',EXPECTED.candidate),/UNVERIFIED_C2_EVIDENCE_FILE/);
  const link=path.join(dir,'symlink.json');fs.symlinkSync(file,link);
  assert.throws(()=>readPinnedJson(link,EXPECTED.candidate),/UNVERIFIED_C2_EVIDENCE_FILE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
