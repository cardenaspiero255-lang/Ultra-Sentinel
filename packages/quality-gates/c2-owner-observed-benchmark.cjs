'use strict';
/**
 * Owner-only, partial empirical benchmark. A reproduced behavior in a frozen
 * real PR is not global recall. Sanitized inputs only; never execute PR code.
 */
const crypto=require('node:crypto');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const PACKET_DIGEST='a4962a2decfceb0236c327a2a5c622644b7a9f8b67690cbed789e0471986ec08';
const FROZEN=Object.freeze([
 Object.freeze({pr:132,headSha:'06289e42b6ecb1f6fa75d49a1bdd383df9b51422',baseSha:'fd96ca9b3d3f30567db3fc0b0a5af077f328c3a0',changedFiles:21}),
 Object.freeze({pr:159,headSha:'07e1866424305f7639e176e07a452c9f484b5e2b',baseSha:'0b18dca9488fb5b6340defa04836dacfb4a09d74',changedFiles:6}),
 Object.freeze({pr:161,headSha:'6a2b2a2b1249dcdebf91013b42a3c4510938a5dc',baseSha:'3ca753943ea9920a1846e16431ea6b677776012c',changedFiles:12}),
 Object.freeze({pr:73,headSha:'194908b7dfa9d882afbc4d7eeaa3781b3e84e9e8',baseSha:'2dee9f6024748bb54b9da86a758fc09c18c426b4',changedFiles:7})
]);
const WITNESS=Object.freeze({pr:73,headSha:FROZEN[3].headSha,
 blobSha:'b54e76f263b818597186530f31e44e1060d7f49d',
 path:'supabase/functions/ultra-research/research.ts',
 rule:'REFERENCE_TOPIC_MISMATCH',line:779});
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const PATH=/^[A-Za-z0-9_.\/-]{1,240}$/;
function fail(){throw Error('UNVERIFIED_C2_OWNER_EVIDENCE');}
function exact(obj,keys){return obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));}
function evidenceKey(f){
 if(!exact(f,['rule','path','line'])||!RULE.test(f.rule)||
  !PATH.test(f.path)||f.path.startsWith('/')||
  f.path.split('/').includes('..')||!Number.isSafeInteger(f.line)||
  f.line<=0||f.line>1000000)fail();
 return f.rule+'\u0000'+f.path+'\u0000'+f.line;
}
function verifyCapture(capture){
 if(!capture||capture.schema!=='ultra-sentinel-c2-live-cohort/v1'||
  capture.repository!==REPO||capture.captureStatus!=='CANDIDATE_SNAPSHOT_ONLY'||
  !Array.isArray(capture.samples)||capture.samples.length!==FROZEN.length||
  !Array.isArray(capture.prs)||capture.prs.length!==FROZEN.length||
  capture.tripleSPlusCertified!==false||capture.autoCommit!==false||
  capture.autoMerge!==false||capture.baselineComparable!==false||
  capture.independentLabelsVerified!==false||
  capture.sourceChecksIndependentlyCertified!==false)fail();
 const packet={schema:'ultra-sentinel-c2-blind-review-packet/v1',
  repository:REPO,cases:[]};
 let unverifiedCandidateFindings=0;
 for(let i=0;i<FROZEN.length;i++){
  const s=capture.samples[i],p=FROZEN[i];
  if(!s||capture.prs[i]!==p.pr||s.status!==undefined||
   s.pr!==p.pr||s.repository!==REPO||s.headSha!==p.headSha||
   s.baseSha!==p.baseSha||s.changedFiles!==p.changedFiles||
   s.readerStatus!=='AUTHENTICATED_SOURCE_DIFF'||
   s.baselineFindingsCollected!==false||
   s.independentLabelsCollected!==false||
   s.semanticParityCertified!==false||
   s.candidate?.coverage?.partial!==false||
   s.candidate.coverage.omitted!==0||
   s.candidate.coverage.nonPositional!==0||
   !Array.isArray(s.candidate.findings)||s.candidate.findings.length>40||
   s.checks?.observedState!=='OBSERVED_SUCCESS_UNATTESTED'||
   !Number.isSafeInteger(s.checks.success)||s.checks.success<1||
   s.checks.total!==s.checks.success||s.checks.failed!==0||
   s.checks.pending!==0||s.checks.skipped!==0)fail();
  const distinct=new Set();
  for(const finding of s.candidate.findings){
   const key=evidenceKey(finding);if(distinct.has(key))fail();distinct.add(key);
  }
  unverifiedCandidateFindings+=distinct.size;
  packet.cases.push({pr:p.pr,headSha:p.headSha,baseSha:p.baseSha,
   changedFiles:p.changedFiles});
 }
 const digest=crypto.createHash('sha256').update(JSON.stringify(packet),'utf8').digest('hex');
 if(digest!==PACKET_DIGEST)fail();
 return unverifiedCandidateFindings;
}
function verifyWitness(w){
 if(!exact(w,['schema','repository','pr','headSha','blobSha','path',
 'controls','candidateDefect','sampleKind','independentHumanReview',
 'externalTruthCertified','precisionRecallComputed','tripleSPlusCertified','mergeAllowed'])||
 w.schema!=='ultra-sentinel-c2-owner-witness/v1'||w.repository!==REPO||
 w.pr!==WITNESS.pr||w.headSha!==WITNESS.headSha||
 w.blobSha!==WITNESS.blobSha||w.path!==WITNESS.path||
 w.sampleKind!=='REAL_PINNED_SOURCE_WITH_DETERMINISTIC_FIXTURE'||
 !exact(w.controls,['relevantAccepted','unrelatedTopicRejected'])||
 w.controls.relevantAccepted!==true||w.controls.unrelatedTopicRejected!==true||
 !exact(w.candidateDefect,['rule','line','expected','observed','reproduced'])||
 w.candidateDefect.rule!==WITNESS.rule||
 w.candidateDefect.line!==WITNESS.line||
 w.candidateDefect.expected!=='ABSTAIN_ON_UNRELATED_ARTICLE'||
 w.candidateDefect.observed!=='UNRELATED_ARTICLE_MARKED_TRUSTED'||
 w.candidateDefect.reproduced!==true||
 w.independentHumanReview!==false||w.externalTruthCertified!==false||
 w.precisionRecallComputed!==false||w.tripleSPlusCertified!==false||
 w.mergeAllowed!==false)fail();
}
function verifyNewsWitness(n){
 if(!exact(n,['schema','repository','pr','headSha','blobSha','path',
  'controls','candidateDefect','sampleKind','externalTruthCertified',
  'independentHumanReview','precisionRecallComputed','tripleSPlusCertified','mergeAllowed'])||
  n.schema!=='ultra-sentinel-c2-owner-news-witness/v1'||
  n.repository!==REPO||n.pr!==WITNESS.pr||n.headSha!==WITNESS.headSha||
  n.blobSha!==WITNESS.blobSha||n.path!==WITNESS.path||
  n.sampleKind!=='REAL_PINNED_SOURCE_WITH_DETERMINISTIC_FIXTURE'||
  !exact(n.controls,['independentHostsAccepted','sameHostRejected'])||
  n.controls.independentHostsAccepted!==true||n.controls.sameHostRejected!==true||
  !exact(n.candidateDefect,['rule','line','expected','observed','reproduced'])||
  n.candidateDefect.rule!=='NEWS_DOMAIN_DIVERSITY_INCONSISTENT'||
  n.candidateDefect.line!==241||
  n.candidateDefect.expected!=='ABSTAIN_IF_DISTINCT_URL_HOSTS_LT_2'||
  n.candidateDefect.observed!=='VERIFIED_NEWS_WITH_ONE_URL_HOST'||
  n.candidateDefect.reproduced!==true||
  n.externalTruthCertified!==false||n.independentHumanReview!==false||
  n.precisionRecallComputed!==false||n.tripleSPlusCertified!==false||
  n.mergeAllowed!==false)fail();
}
function verifyKotlinWitness(k){
 if(!exact(k,['schema','cases','controlsPassed','syntheticDefectsClaimed',
  'externalIndependenceClaimed','tripleSPlusCertified','autoMerge'])||
  k.schema!=='ultra-sentinel-c2-kotlin-owner-oracles/v1'||
  k.controlsPassed!==true||k.syntheticDefectsClaimed!==false||
  k.externalIndependenceClaimed!==false||k.tripleSPlusCertified!==false||
  k.autoMerge!==false||!Array.isArray(k.cases)||k.cases.length!==3)fail();
 const [home,frame,network]=k.cases;
 if(!exact(home,['pr','kind','passed','reproduced'])||
  home.pr!==132||home.kind!=='BENIGN_CONTROL'||
  home.passed!==true||home.reproduced!==false)fail();
 const expectedPath='app/src/main/java/com/cardenaspiero255/gamehubultra/';
 if(!exact(frame,['pr','kind','rule','path','line','reproduced'])||
  frame.pr!==159||frame.kind!=='POSITIVE_BEHAVIOR'||
  frame.rule!=='STALE_FRAME_TIMING_ACCEPTED'||
  frame.path!==expectedPath+'performance/framepacing/FramePacingIntelligenceEngine.kt'||
  frame.line!==129||frame.reproduced!==true)fail();
 if(!exact(network,['pr','kind','rule','path','line','reproduced',
   'observedAverageLatencyMs'])||
  network.pr!==161||network.kind!=='POSITIVE_BEHAVIOR'||
  network.rule!=='CROSS_TRANSPORT_LATENCY_MIX'||
  network.path!==expectedPath+'network/diagnostics/NetworkGamingDiagnosticsEngine.kt'||
  network.line!==43||network.reproduced!==true||
  network.observedAverageLatencyMs!==215)fail();
 return Object.freeze([{rule:frame.rule,path:frame.path,line:frame.line,pr:159},
  {rule:network.rule,path:network.path,line:network.line,pr:161}]);
}
function evaluateOwnerObservedC2({capture,witness,newsWitness,kotlinWitness}={}){
 const count=verifyCapture(capture);verifyWitness(witness);verifyNewsWitness(newsWitness);
 const otherCases=verifyKotlinWitness(kotlinWitness);
 const cases=[
  {pr:73,rule:WITNESS.rule,path:WITNESS.path,line:WITNESS.line},
  {pr:73,rule:newsWitness.candidateDefect.rule,path:newsWitness.path,
   line:newsWitness.candidateDefect.line},
  ...otherCases
 ];
 const breakdown=[73,159,161].map(pr=>{
  const expected=cases.filter(x=>x.pr===pr);
  const actual=capture.samples.find(x=>x.pr===pr).candidate.findings;
  const predicted=new Set(actual.map(evidenceKey));
  const detected=expected.filter(x=>predicted.has(evidenceKey({
   rule:x.rule,path:x.path,line:x.line}))).length;
  return Object.freeze({pr,positive:expected.length,detected,
   missed:expected.length-detected});
 });
 const detected=breakdown.reduce((acc,x)=>acc+x.detected,0);
 const other=count-detected;
 return Object.freeze({
  schema:'ultra-sentinel-c2-owner-observed-benchmark/v1',
  repository:REPO,packetDigest:PACKET_DIGEST,
  sourceArtifacts:Object.freeze({
   candidateRun:38800582701,candidateArtifact:12004770556,
   witnessRun:38815014127,witnessArtifact:12009932922,
   newsRun:38818123100,newsArtifact:12011801729,
   kotlinRun:38822482392,kotlinArtifact:12013827086}),
  observedKnownCases:Object.freeze({positive:4,detected,missed:4-detected,
   recallWithinKnownCases:detected/4,perPr:Object.freeze(breakdown)}),
  population:Object.freeze({frozenPrs:4,representedByPositiveCases:3,
   verifiedPositive:4,verifiedNegative:0,benignControlsObserved:1,
   unverifiedCandidateFindings:other,verifiedFalsePositives:null,
   neededAdditionalCasesAtLeast:116,neededAdditionalPositivesAtLeast:44,
   neededAdditionalNegativesAtLeast:48}),
  benchmark:Object.freeze({precision:null,recall:null,f1:null,
   baselineComparable:false,minPopulationSatisfied:false,
   criticalRecallVerified:false,sourceCiFullAttestation:false}),
  realOriginalSourceBehaviorObserved:true,
  sourceArtifactProvenanceMustBeCheckedByWorkflow:true,
  independentHumanReviewerRequired:false,
  externalIndependenceClaimed:false,
  tripleSPlusCertified:false,autoMerge:false,autoRepair:false,
  verdict:'INSUFFICIENT_REAL_BENCHMARK_EVIDENCE',
  limitation:'Four source behaviors across three PRs under controlled inputs are NOT a representative '+
   'blind benchmark; unverified candidate alerts cannot be called false positives. '+
   'No validated legacy baseline, 120-case corpus or global performance metrics.'
 });
}
module.exports={evaluateOwnerObservedC2,FROZEN,WITNESS,PACKET_DIGEST};
