'use strict';
// Reusable source-free frozen-Core *path and possible-family* admission.
// IMPORTANT: never expose PR patch/source bytes or use predictions in this module.
// No metadata pass proves an exact rule or genuine original/fixed/benign JUnit.
const blocked=()=>{throw Error('C2_FROZEN_PATH_PREFILTER_BLOCKED');};
const FROZEN_CORE_BLOBS=Object.freeze({reference:'547938ed88804e25bbabecf74a3c3d91b74cf1a4',core:'db29f94be1e0afb791a241d26f449695df0eafd0',semantic:'7df2a994f566ad56bdacab999fa6ba83b69e3b4d',knownDefects:'8c2fa4289d331e157b07f4e693239ac7e31cae8c'});
const FROZEN_RULES=Object.freeze([
 'UNSCOPED_COROUTINE','BLOCKING_ANDROID_CALL','FORCED_GC','NON_CANCELLABLE_LOOP',
 'SPEECH_REENTRANT_RETRY','POTENTIAL_PRIVATE_LOG','PRIVILEGED_UNTRUSTED_CHECKOUT',
 'POTENTIAL_HARDCODED_SECRET','UNBOUNDED_RECURSION','REGRESSION_TEST_COVERAGE',
 'STALE_FRAME_TIMING_ACCEPTED','CROSS_TRANSPORT_LATENCY_MIX','REFERENCE_TOPIC_MISMATCH',
 'NEWS_DOMAIN_DIVERSITY_INCONSISTENT','CLAIM_VALUE_UNIT_CASE_COLLISION',
 'TTS_UTF16_SURROGATE_SPLIT','STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED'
]);
const EXPECTED_BITWARDEN_FILE_LIST=Object.freeze([["app/src/main/kotlin/com/x8bit/bitwarden/data/auth/manager/KeyConnectorManager.kt","35e4f45ff1aebb9ee48b49a3d94660c1dd734e60","modified",1,1,2],["app/src/main/kotlin/com/x8bit/bitwarden/data/auth/manager/KeyConnectorManagerImpl.kt","9a211f5b8e856e015a176caa9d5d2f75c994fc34","modified",2,2,4],["app/src/main/kotlin/com/x8bit/bitwarden/data/auth/repository/AuthRepositoryImpl.kt","fd67b29d39811ffd04342a49ac40debf0e503226","modified",7,6,13],["app/src/main/kotlin/com/x8bit/bitwarden/data/vault/datasource/sdk/VaultSdkSource.kt","ed229198b186e8a3fb4573ff4a858639260e2cb0","modified",1,1,2],["app/src/main/kotlin/com/x8bit/bitwarden/data/vault/datasource/sdk/VaultSdkSourceImpl.kt","72366ad2d523bed8ee73ebfc56e21757f6827f3b","modified",2,2,4],["app/src/test/kotlin/com/x8bit/bitwarden/data/auth/manager/KeyConnectorManagerTest.kt","d2605477d56940ab1e7d3fca749d751f0632c860","modified",11,11,22],["app/src/test/kotlin/com/x8bit/bitwarden/data/auth/repository/AuthRepositoryTest.kt","72bafd32cdd5356e281201840bc0cdac312aa1d2","modified",19,14,33],["app/src/test/kotlin/com/x8bit/bitwarden/data/vault/datasource/sdk/VaultSdkSourceTest.kt","4520acdedafd4ea2e86c627a012afc84b9d98559","modified",16,16,32]].map(v=>Object.freeze(v)));
const EXACT_CANDIDATE=Object.freeze({repository:'bitwarden/android',pr:7499,baseSha:'9bdf4d222ed0916415973418052f0bd089507875',headSha:'6ee1047c7312ce61153184e84840bc372cf38602',createdAt:'2026-10-20T22:29:32Z'});
const KEYS=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const fields=o=>JSON.stringify(o);
const MATCH_CANDIDATE=x=>x&&fields(x)===fields(EXACT_CANDIDATE);
const SOURCE_PATH=/^(app\/src\/main\/|supabase\/functions\/|\.github\/(?:workflows|scripts)\/|control-center\/)/;
const EXCLUDE=/(\.md$|\/test\/|\/tests\/|Test\.(kt|java)$|\.(?:test|spec|benchmark)\.(?:cjs|mjs|js|ts|jsx|tsx)$|(?:^|\/)ultra_sentinel_benchmark\.cjs$)/i;
function eligibleByFrozenPath(path){
 return typeof path==='string'&&SOURCE_PATH.test(path)&&!EXCLUDE.test(path)
 &&(/\.kt$|\.java$/i.test(path)||/^\.github\/workflows\/[^/]+\.ya?ml$/i.test(path));
}
function prefilterFrozenRules({roster,disclosures,lawnchair,sourceRequest,snapshot}={}){
 if(FROZEN_RULES.length!==17||new Set(FROZEN_RULES).size!==17||!roster||
 roster.schema!=='c2-bulk-source-candidate-manifest/v1'||roster.candidates?.length!==169||
 !sourceRequest||sourceRequest.schema!=='c2-owner-one-source-release-request/v1'||
 sourceRequest.scope!=='EXACT_ONE_PUBLIC_EXTERNAL_PR_SOURCE_TRIAGE_ONLY'||
 sourceRequest.ownerApproval!=='ALLOW_ONE_SOURCE_READ_NO_PREDICTIONS'||
 sourceRequest.sourceInspectedAtRequest!==false||sourceRequest.sourceReleaseAuthenticated!==false||
 sourceRequest.candidatePredictionsRead!==false||sourceRequest.baselinePredictionsRead!==false||
 sourceRequest.truthSealed!==false||sourceRequest.newGoldLabels!==0||
 sourceRequest.oracleAuthenticated!==false||sourceRequest.ruleCompatibilityAuthenticated!==false||
 !MATCH_CANDIDATE(sourceRequest.candidate)||
 !snapshot||snapshot.schema!=='c2-frozen-path-only-snapshot/v1'||
 !MATCH_CANDIDATE(snapshot.candidate)||snapshot.metadataPathOnly!==true||
 snapshot.prTitleRead!==false||snapshot.patchExposedToDetector!==false||
 snapshot.sourceExecution!==false||snapshot.prefilterStatus!=='PENDING_OWNER_MAIN_AUTHENTICATION'||
 snapshot.exactRuleMatched!==false||snapshot.independentOriginalFixBenignEvidence!==false||
 snapshot.trainingIndependenceCertified!==false||snapshot.causalIndependenceCertified!==false||
 snapshot.newGoldLabels!==0||snapshot.truthSealed!==false||
 snapshot.tripleSPlusCertified!==false||!snapshot.frozenCore||
 snapshot.frozenCore.referenceCommit!==FROZEN_CORE_BLOBS.reference||
 snapshot.frozenCore.coreBlobSha!==FROZEN_CORE_BLOBS.core||
 snapshot.frozenCore.semanticBlobSha!==FROZEN_CORE_BLOBS.semantic||
 snapshot.frozenCore.knownDefectsBlobSha!==FROZEN_CORE_BLOBS.knownDefects||
 snapshot.frozenCore.rulesFrozenCount!==17)blocked();
 const candidateInRoster=roster.candidates.filter(x=>x.repository===EXACT_CANDIDATE.repository&&x.pr===EXACT_CANDIDATE.pr&&x.baseSha===EXACT_CANDIDATE.baseSha&&x.headSha===EXACT_CANDIDATE.headSha&&x.createdAt===EXACT_CANDIDATE.createdAt);
 if(candidateInRoster.length!==1||!disclosures||disclosures.disclosures?.length!==8||
 !lawnchair||lawnchair.original?.repository!=='LawnchairLauncher/lawnchair'||
 lawnchair.original?.pr!==7428||lawnchair.corpus?.ownerReleasedReviewed!==1)blocked();
 const seen=new Set();
 for(const d of [...disclosures.disclosures,lawnchair.original]){
  const id=d.repository.toLowerCase()+'#'+d.pr;
  if(seen.has(id)||id==='bitwarden/android#7499')blocked();
  seen.add(id);
 }
 if(seen.size!==9||!Array.isArray(snapshot.files)||snapshot.files.length!==EXPECTED_BITWARDEN_FILE_LIST.length)blocked();
 const fileFields=['filename','status','sha','additions','deletions','changes'];
 const a=snapshot.files.map(f=>{
  if(!KEYS(f,fileFields)||!(/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(f.filename))||
   f.filename.split('/').some(x=>x==='.'||x==='..')||
   !/^[0-9a-f]{40}$/.test(f.sha)||!['added','modified'].includes(f.status)||
   ![f.additions,f.deletions,f.changes].every(Number.isSafeInteger)||
   f.additions<0||f.deletions<0||f.changes!==f.additions+f.deletions)blocked();
  return [f.filename,f.sha,f.status,f.additions,f.deletions,f.changes];
 }).sort((a,b)=>a[0].localeCompare(b[0]));
 const expected=[...EXPECTED_BITWARDEN_FILE_LIST].sort((a,b)=>a[0].localeCompare(b[0]));
 if(fields(a)!==fields(expected))blocked();
 const selected=snapshot.files.filter(f=>eligibleByFrozenPath(f.filename));
 if(selected.length===0)blocked();
 const isApp=x=>x.filename.startsWith('app/src/main/')&&/\.(kt|java)$/.test(x.filename);
 const app=selected.filter(isApp);
 const tests=snapshot.files.filter(f=>/\/(test|androidTest)\/|\/src\/test/i.test(f.filename));
 const potentiallyApplicable=app.length?
  FROZEN_RULES.filter(id=>['UNSCOPED_COROUTINE','BLOCKING_ANDROID_CALL','FORCED_GC',
    'NON_CANCELLABLE_LOOP','SPEECH_REENTRANT_RETRY','POTENTIAL_PRIVATE_LOG',
    'POTENTIAL_HARDCODED_SECRET','UNBOUNDED_RECURSION'].includes(id)): [];
 return Object.freeze({
  schema:'c2-frozen-core-path-family-prefilter/v1',status:'FROZEN_CORE_PATH_ELIGIBLE_RULE_UNVERIFIED',
  candidate:{...EXACT_CANDIDATE},frozenCoreGitBlob:FROZEN_CORE_BLOBS.core,
  frozenRuleCount:FROZEN_RULES.length,changedFiles:a.length,
  coreEligibleProduction:selected.length,eligibleFiles:selected.map(x=>x.filename),
  testFiles:tests.length,possibleRuleFamilies:potentiallyApplicable,
  exposedBefore:seen.size,untouchedBeforeThisRead:roster.candidates.length-seen.size,
  sourceReadPermitted:false,exactRuleMatched:false,originalFixBenignExecuted:false,
  sourceOracleAuthenticated:false,causalIndependenceCertified:false,
  newGoldLabels:0,truthSealed:false,detectorPredictionsRead:false,
  baselinePredictionsRead:false,tripleSPlusCertified:false
 });
}
module.exports={prefilterFrozenRules,FROZEN_RULES,FROZEN_CORE_BLOBS,eligibleByFrozenPath};
