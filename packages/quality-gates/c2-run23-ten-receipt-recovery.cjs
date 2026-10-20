'use strict';
/*
 * Historical DEVELOPMENT-only original-source witness recovery.
 * The caller must verify the owner GitHub API run, artifact and immutable
 * archive digest before loading any of these untrusted JSON documents.
 * A returned original witness is NOT an independent cause, GOLD or benchmark.
 */
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const h=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=()=>{throw Error('C2_TEN_RECEIPT_RECOVERY_BLOCKED');};
const REPO='cardenaspiero255-lang/gamehub-ultra';
const ROOT='app/src/main/java/com/cardenaspiero255/gamehubultra/';
const HEAD150='4c6912d7ca17df0669f8a0d9667f34d2f2b205a9';
const BLOB150='37866fd3dbfcd19d9daaf29a5e1e426391c723d4';
const CONF=ROOT+'domain/SmartRecommendationExplanation.kt';
const EXPECTED=Object.freeze([
 {id:'150-251',pr:150,headSha:HEAD150,blobSha:BLOB150,path:CONF,line:251,positive:true,
  ruleId:'NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE',
  schema:'ultra-sentinel-c2-pr150-negative-history-source-oracle/v1'},
 {id:'150-252',pr:150,headSha:HEAD150,blobSha:BLOB150,path:CONF,line:252,positive:true,
  ruleId:'ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION',
  schema:'ultra-sentinel-c2-next-pr150-confidence-original-oracle/v1'},
 {id:'150-250',pr:150,headSha:HEAD150,blobSha:BLOB150,path:CONF,line:250,positive:false,
  ruleId:'WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE',
  schema:'ultra-sentinel-c2-next-pr150-confidence-original-oracle/v1'},
 {id:'151-264',pr:151,headSha:NEW_LOCK.cases[1].headSha,
  blobSha:'adb11032b9b7f62f865228dfa1c27258ca3fa0df',
  path:ROOT+'domain/AiSessionCoach.kt',line:264,positive:true,
  ruleId:'NONFINITE_THERMAL_HEADROOM_ACCEPTED',
  schema:'ultra-sentinel-c2-next-original-pr151-nonfinite-witness/v1'},
 {id:'152-207',pr:152,headSha:NEW_LOCK.cases[2].headSha,
  blobSha:'549e3b1d619b83e59bc37b31b4860191c25528f1',
  path:ROOT+'domain/AiProfileBuilder.kt',line:207,positive:true,
  ruleId:'SUPPORTED_REFRESH_CANDIDATE_STARVED_BY_UNSUPPORTED_PLURALITY',
  schema:'ultra-sentinel-c2-next-original-pr152-refresh-witness/v1'},
 {id:'153-71',pr:153,headSha:NEW_LOCK.cases[3].headSha,
  blobSha:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',
  path:ROOT+'PerGameAdaptiveRuntime.kt',line:71,positive:true,
  ruleId:'PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE',
  schema:'ultra-sentinel-c2-next-original-pr153-rollback-witness/v1'},
 {id:'154-22',pr:154,headSha:NEW_LOCK.cases[4].headSha,
  blobSha:'b2e15247536ecc00d4811021774ab2f34608ac3e',
  path:ROOT+'domain/ThermalPredictionAdvisor.kt',line:22,positive:false,
  ruleId:'THERMAL_WARNING_WITHOUT_PREVENTIVE_PERMISSION',
  schema:'ultra-sentinel-c2-next-original-pr154-thermal-controls/v1'},
 {id:'155-47',pr:155,headSha:NEW_LOCK.cases[5].headSha,
  blobSha:'8696360219231f3f1477d5ad21c93bca2197e281',
  path:ROOT+'domain/BatteryAwareGamingEngine.kt',line:47,positive:false,
  ruleId:'BATTERY_DRAIN_CROSSES_CHARGING_BOUNDARY',
  schema:'ultra-sentinel-c2-next-original-pr155-battery-controls/v1'},
 {id:'157-32',pr:157,headSha:NEW_LOCK.cases[6].headSha,
  blobSha:'a4361860bc51d5473766b6fb82f10bdca2b154ce',
  path:ROOT+'ai/UltraFrontierToolGateway.kt',line:32,positive:false,
  ruleId:'MUTATION_EXECUTES_WITHOUT_TOOL_AUTHORIZATION',
  schema:'ultra-sentinel-c2-next-original-pr157-tool-controls/v1'},
 {id:'158-60',pr:158,headSha:NEW_LOCK.cases[7].headSha,
  blobSha:'d1af5d8c6574c325fdacadec54748cb730c3aacd',
  path:ROOT+'ai/UltraFrontierAuditTrail.kt',line:60,positive:false,
  ruleId:'UNBOUNDED_AUDIT_TRAIL_RETENTION',
  schema:'ultra-sentinel-c2-next-original-pr158-audit-controls/v1'}
].map(x=>Object.freeze(x)));
const ORIGINS=Object.freeze([
 {id:'bad-history',runId:38988102205,runHeadSha:'ac4cd9c74fadd5ea9af113b319c39dd2b404807f',
  workflow:'.github/workflows/c2-next-pr150-negative-history-oracle.yml',
  artifactId:12083843392,artifactName:'ultra-sentinel-c2-pr150-bad-history-negative-history-source-oracle',
  archiveSha256:'33f1fdddfd1bebbb98ed5b787e7726f2f3469484fa958a840a0f055f46db8767',
  jsonFile:'c2-pr150-bad-history-original.json',ids:['150-251']},
 {id:'confidence',runId:38982855937,runHeadSha:'05b959a8fe650a0a00e0d20f57d73cceea05c008',
  workflow:'.github/workflows/c2-next-pr150-confidence-oracle.yml',
  artifactId:12082061520,artifactName:'ultra-sentinel-c2-pr150-confidence-source-oracle',
  archiveSha256:'7ef1372b5c4fa9080585315eae58364ebc9e8f013580db85214e266a4ac0bf47',
  jsonFile:'c2-pr150-original.json',ids:['150-250','150-252']},
 {id:'nonfinite',runId:38968765586,runHeadSha:'2d2132806c37148655ece20ef209fcaeceb9f002',
  workflow:'.github/workflows/c2-next-pr151-nonfinite-headroom.yml',
  artifactId:12075688473,artifactName:'ultra-sentinel-c2-next-pr151-original-nonfinite-witness',
  archiveSha256:'43c3e02ff1965341e04cb616e625252d2ad42319244b04c5ca8238307caa8138',
  jsonFile:'c2-pr151-witness.json',ids:['151-264']},
 {id:'refresh',runId:38930244332,runHeadSha:'a908ec050a7442088b4d307f32eef32b65a316a5',
  workflow:'.github/workflows/c2-next-pr152-refresh-oracle.yml',
  artifactId:12057454797,artifactName:'ultra-sentinel-c2-next-pr152-original-refresh-witness',
  archiveSha256:'9e1d2ce0c783b107a9b722a97f01c2e5f0f66271a408875ecae8f4a6350b1681',
  jsonFile:'c2-pr152-witness.json',ids:['152-207']},
 {id:'rollback',runId:38889693623,runHeadSha:'71aa7937625daa9945bbaf0a495a4f9073c5faaa',
  workflow:'.github/workflows/c2-next-pr153-pending-rollback-oracle.yml',
  artifactId:12040619454,artifactName:'ultra-sentinel-c2-next-pr153-pending-replay-original-witness',
  archiveSha256:'a9787a48048ea2e344fbb5bb9954f91e063cbe55551f0799f46e0c209bbd743c',
  jsonFile:'c2-kotlin-source-witness.json',ids:['153-71']},
 {id:'thermal-battery',runId:38969804193,runHeadSha:'36ec2099051a1a18d22366991553e86f5844c670',
  workflow:'.github/workflows/c2-next-original-pr154-pr155-oracles.yml',
  artifactId:12076128948,artifactName:'ultra-sentinel-c2-next-pr154-pr155-original-controls',
  archiveSha256:'e94c6385c51455798c0759e740eab4f92be5962e2b1acdb375669402f82ed5bc',
  jsonFile:'c2-next-original-controls-result.json',ids:['154-22','155-47']},
 {id:'tool-audit',runId:38946358219,runHeadSha:'0b9ca41e3bff1219effa799a98bedde38172f579',
  workflow:'.github/workflows/c2-next-original-pr157-pr158-oracles.yml',
  artifactId:12066221951,artifactName:'ultra-sentinel-c2-next-pr157-pr158-original-controls',
  archiveSha256:'8b63dc60ef39e8b869e74c235ee8c1f4b039298a34f2da5665f59688e50fb345',
  jsonFile:'c2-next-original-controls-result.json',ids:['157-32','158-60']}
].map(x=>Object.freeze(x)));
function checkWitness(p,x){
 if(!x||x.schema!==p.schema||x.pr!==p.pr||x.sourceGitBlob!==p.blobSha||
   x.candidateInspected!==false||x.baselineCompared!==false||
   x.precision!==null||x.recall!==null||x.f1!==null||
   x.tripleSPlusCertified!==false)fail();
 if(p.pr===150&&x.headSha!==p.headSha)fail();
 if(x.rule!=null&&x.rule!==p.ruleId)fail();
 if(x.line!=null&&x.line!==p.line)fail();
 const required={
  '150-251':['originalBadHistoryHigh','emptyHistoryMedium','executedOriginalSource'],
  '150-250':['allAuthoritativeSourcesOpposeButConfidenceHigh','weakExternalEvidenceDowngradesConfidence','affirmativeControlHigh','executedOriginalSource'],
  '150-252':['allAuthoritativeSourcesOpposeButConfidenceHigh','weakExternalEvidenceDowngradesConfidence','affirmativeControlHigh','executedOriginalSource'],
  '151-264':['reproducedBehavioralDefect','finiteHighControlPassed','missingRejected','nanRejected','originalSourceExecuted'],
  '152-207':['reproducedBehavioralDefect','supportedPluralitySelected','unsupportedOnlyRejected','insufficientSamplesRejected','existingTargetPreserved','executedOriginalSource'],
  '153-71':['reproduced','normalSuccessControlPassed','prewriteFailureControlPassed','failureAfterHandledReproduced','replayProfileStateDiverged','idempotentHandledControlPassed'],
  '154-22':['noWarningPassed','preventivePassed','executedOriginalSource'],
  '155-47':['chargingPreventsDrain','chargingBoundaryResets','executedOriginalSource'],
  '157-32':['unapprovedMutationBlocked','wrongToolBlocked','executedOriginalSource'],
  '158-60':['boundedEvictionPassed','executedOriginalSource']
 }[p.id];
 if(!required||required.some(k=>x[k]!==true))fail();
 if(p.id==='150-251'&&(x.mutantKilled!==false||x.newTruthLabelsSealed!==0))fail();
 if([154,155,157,158].includes(p.pr)&&x.negativeFindingLabelsEstablished!==0)fail();
}
function recoverTenReceipts({receipt,bundles}={}){
 if(!receipt||receipt.schema!=='c2-run23-historical-recovery-queue/v1'||
  receipt.ownerAuditRun!==39498922958||receipt.originOwnerRun!==39077240648||
  receipt.sourceLabels!==23||receipt.individualReceiptsMissing!==10||
  receipt.causalGroupsMissing!==21||receipt.bothMissing!==10||
  receipt.admittedNewLabels!==0||receipt.benchmarkReady!==false||
  receipt.independenceVerified!==false||receipt.holdoutFrozen!==false||
  receipt.precision!==null||receipt.recall!==null||receipt.f1!==null||
  receipt.tripleSPlusCertified!==false||
  !Array.isArray(receipt.queue)||receipt.queue.length!==21||
  !Array.isArray(bundles)||bundles.length!==ORIGINS.length)fail();
 const p0=receipt.queue.filter(x=>x.priority==='P0_RECEIPT_AND_CAUSE');
 if(p0.length!==10)fail();
 const ids=new Set();
 for(const p of EXPECTED){
  const q=p0.find(x=>x.pr===p.pr&&x.ruleId===p.ruleId&&x.line===p.line);
  if(!q||ids.has(q.identity)||q.sourceHeadSha!==p.headSha||
   q.sourceBlobSha!==p.blobSha||q.path!==p.path||q.positive!==p.positive||
   q.causeMissing!==true||q.evidenceMissing!==true||
   q.decision!=='REQUIRES_ORIGINAL_WITNESS_ADJUDICATION_NOT_ADMITTED'||
   q.identity!==JSON.stringify([p.pr,p.headSha,p.ruleId,p.path,p.line,p.positive]))fail();
  ids.add(q.identity);
 }
 if(ids.size!==10||new Set(bundles.map(x=>x.originId)).size!==7)fail();
 const entries=[];
 for(let i=0;i<ORIGINS.length;i++){
  const origin=ORIGINS[i],b=bundles[i];
  if(!b||b.originId!==origin.id||b.runId!==origin.runId||
   b.artifactId!==origin.artifactId||b.sha256!==origin.archiveSha256||
   b.runHeadSha!==origin.runHeadSha||b.repositoryId!==1418338512||
   b.actorId!==322222186||b.runConcluded!=='success'||b.archiveExpired!==false||
   !b.files||typeof b.files!=='object'||Array.isArray(b.files)||
   Object.keys(b.files).length!==origin.ids.length||
   origin.ids.some(id=>!Object.hasOwn(b.files,id)))fail();
  for(const id of origin.ids){
   const p=EXPECTED.find(x=>x.id===id),w=b.files[id];
   if(!p)fail();
   checkWitness(p,w);
   entries.push(Object.freeze({id,pr:p.pr,ruleId:p.ruleId,path:p.path,
    line:p.line,positive:p.positive,sourceHeadSha:p.headSha,
    sourceBlobSha:p.blobSha,sourceRunId:origin.runId,
    artifactId:origin.artifactId,artifactSha256:origin.archiveSha256,
    originalWitnessSha256:h(JSON.stringify(w)),
    status:'ORIGINAL_BEHAVIOR_RECEIPT_RECOVERED_CAUSAL_ADJUDICATION_PENDING'}));
  }
 }
 if(entries.length!==10||new Set(entries.map(e=>e.id)).size!==10)fail();
 // #150 lines 250+252 share the same original oracle. Distinct line and
 // synthetic mutants do not establish independent root causes.
 const causalClusters=[{pr:150,
   lines:[250,251,252],
   witnessCount:2,
   concern:'Three confidence-calibration predicates and shared source file; lines 250+252 share one oracle.',
   independence:'UNRESOLVED'}];
 return Object.freeze({
  schema:'c2-run23-ten-original-receipts-recovered/v1',
  historicalSourceLabels:23,originalBehaviorWitnessesRecovered:10,
  missingHistoricalIndividualReceiptsAfterIndependentRecovery:0,
  originalHistoricalSealAltered:false,
  unresolvedCausalGroups:21,causalClusters,
  entries,sourceRunAuthenticatedByCaller:true,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  holdoutFrozen:false,newLabels:0,precision:null,recall:null,f1:null,
  tripleSPlusCertified:false,autoMerge:false,autoRepair:false,
  verdict:'ORIGINAL_RECEIPTS_RECOVERED_CAUSAL_INDEPENDENCE_UNVERIFIED',
  limitations:'Original witness archives are development truth only, not 10 new gold examples. Independent causal root-group adjudication and verification of the earlier 13 receipt identities remain outstanding.'
 });
}
module.exports={ORIGINS,EXPECTED,recoverTenReceipts};
