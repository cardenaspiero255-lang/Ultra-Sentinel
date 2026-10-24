'use strict';
/*
 * Separate source-only Tasks.org development receipt verifier.
 * Original upstream Kotlin source is known and previously inspected, so this
 * code must never enroll it in a prospective holdout or mark it GOLD.
 * Do not import detector Core, compare predictions, or rewrite source.
 */
const {createHash}=require('node:crypto');
const {assessSourceOnlyObservation}=require('./c2-tasks-source-only-observation.cjs');
const HEAD='3936c221aea180b795085d7402286373b5d3f6d2';
const BASE='5624816cac6ecab701969d24e6d3387ccd21a773';
const PATH='app/src/main/java/org/tasks/notifications/Throttle.kt';
const BLOB='0e472cfd73510ab11a396ee5eba9968d57172050';
const HASH=/^[0-9a-f]{64}$/;
const FIELDS=['repository','headSha','path','gitBlobSha','sourceSha256',
 'commitAncestorChecked','sourceFetchedFromPinnedGit'];
const EXTRA=['sourceRepository','originalHeadSha','originalBaseSha',
 'originalSourcePath','originalSourceGitBlob','originalSourceContentSha256',
 'runtimeWitnessSha256','originalSourceVerifiedByGitInThisProcess',
 'runtimeExecutionAuthenticatedByThisProcess','originalSourceIncludedInArtifact',
 'trainingExcludedAsKnownDevelopment'];
const blocked=()=>{throw Error('C2_EXTERNAL_SOURCE_ATTESTATION_BLOCKED');};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function attestTasksExternalDevelopmentWitness({originalWorkerBytes,producerReport,independentUpstream}={}){
 if(!Buffer.isBuffer(originalWorkerBytes)||originalWorkerBytes.length<60||
    originalWorkerBytes.length>3000||
    !exact(independentUpstream,FIELDS)||
    independentUpstream.repository!=='tasks/tasks'||
    independentUpstream.headSha!==HEAD||
    independentUpstream.path!==PATH||
    independentUpstream.gitBlobSha!==BLOB||
    !HASH.test(independentUpstream.sourceSha256)||
    independentUpstream.commitAncestorChecked!==true||
    independentUpstream.sourceFetchedFromPinnedGit!==true)blocked();
 const source=originalWorkerBytes.toString('utf8');
 if(!Buffer.from(source,'utf8').equals(originalWorkerBytes))blocked();
 let runtime;
 try{runtime=JSON.parse(source);}
 catch{blocked();}
 let derived;
 try{derived=assessSourceOnlyObservation(runtime);}
 catch{blocked();}
 const reportFields=[...Object.keys(derived),...EXTRA];
 if(!exact(producerReport,reportFields))blocked();
 for(const [k,v] of Object.entries(derived))if(producerReport[k]!==v)blocked();
 if(producerReport.sourceRepository!=='tasks/tasks'||
    producerReport.originalHeadSha!==HEAD||
    producerReport.originalBaseSha!==BASE||
    producerReport.originalSourcePath!==PATH||
    producerReport.originalSourceGitBlob!==BLOB||
    producerReport.originalSourceContentSha256!==independentUpstream.sourceSha256||
    producerReport.runtimeWitnessSha256!==digest(originalWorkerBytes)||
    producerReport.originalSourceVerifiedByGitInThisProcess!==true||
    producerReport.runtimeExecutionAuthenticatedByThisProcess!==false||
    producerReport.originalSourceIncludedInArtifact!==false||
    producerReport.trainingExcludedAsKnownDevelopment!==true)blocked();
 return Object.freeze({
  schema:'c2-external-original-source-independent-development-witness/v1',
  status:'KNOWN_EXTERNAL_DEVELOPMENT_SOURCE_WITNESS_BYTES_VERIFIED',
  repository:'tasks/tasks',externalPrNumber:null,
  originalHeadSha:HEAD,originalBaseSha:BASE,originalSourcePath:PATH,
  originalSourceGitBlob:BLOB,
  independentSourceContentSha256:independentUpstream.sourceSha256,
  producerRuntimeWitnessSha256:producerReport.runtimeWitnessSha256,
  originalWorkerDigestVerified:true,sourceDigestCrossChecked:true,
  originalSourceRuntimeObserved:true,ruleId:'BLOCKING_ANDROID_CALL',
  ruleCompatibility:'EXISTING_HEURISTIC_DEVELOPMENT_ONLY',
  testOracleKind:'SAME_ORIGINAL_SOURCE_ASYNCHRONOUS_VS_INLINE',
  realUpstreamFixReproduced:false,
  originalUpstreamJUnitExecuted:false,
  originalPrIdentityAuthenticated:false,
  independentRunnerProvenanceCertified:false,
  causalFamilyIndependenceCertified:false,
  trainingExcludedAsKnownDevelopment:true,
  sourceBehaviorCertified:false,scoredNegatives:0,
  newGoldLabels:0,priorDocumentedTruth:9,remaining:111,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  truthSealed:false,holdoutFrozen:false,precision:null,recall:null,f1:null,
  tripleSPlusCertified:false,canMerge:false,canRepair:false,
  limitation:'Exact original external Kotlin, runtime witness bytes and Git-source digest are corroborated in a separate job, but this known Tasks.org commit is development material rather than an independently new PR; no original upstream fail-to-fix regression or benign original JUnit, causal independence, blind truth, GOLD or independent upstream PR identity is established.'
 });
}
module.exports={attestTasksExternalDevelopmentWitness};
