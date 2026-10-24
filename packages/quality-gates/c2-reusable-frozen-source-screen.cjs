'use strict';
// This module deliberately performs no GitHub fetch, source reading, detector
// prediction or truth labeling. The pinned base/HEAD and changed-file blob
// identities must be authenticated a second time by an owner-only Actions job.
const {FROZEN_RULES,FROZEN_CORE_BLOBS,eligibleByFrozenPath}=
 require('./c2-frozen-path-rule-prefilter.cjs');
const blocked=()=>{throw Error('C2_SOURCE_METADATA_BLOCKED');};
const HEX40=/^[0-9a-f]{40}$/;
const KEYS=(x,ks)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const SEL=['repository','pr','baseSha','headSha','createdAt'];
const FILE=['filename','status','sha','additions','deletions','changes'];
const ROOT=['schema','sourceManifest','baseRosterCount','alreadyExposed',
 'remainingBeforeSourceRead','selectionBasis','candidate','paths',
 'originalSourceInspected','diffRead','ownerReleaseGranted','exactRuleVerified',
 'trainingIndependenceVerified','sourceOracleExecuted','baselinePredictionsRead',
 'candidatePredictionsRead','goldAdded','truthSealed','sssPlusCertified'];
const PINNED=Object.freeze({
 repository:'home-assistant/android',pr:7681,
 baseSha:'c0457ffd2353bff63eceafd2a82ca0f505a70e10',
 headSha:'dbf2056e4a9cab37c6b766fe22afda687119033e',
 createdAt:'2026-10-22T20:46:35Z'
});
const PATHS=Object.freeze([
 Object.freeze({filename:'app/src/main/kotlin/io/homeassistant/companion/android/frontend/js/FrontendJsBridge.kt',status:'modified',sha:'20cf04c4bddd2bf415697f3f9be55bd4545ffad3',additions:21,deletions:3,changes:24}),
 Object.freeze({filename:'app/src/test/kotlin/io/homeassistant/companion/android/frontend/js/FrontendJsBridgeTest.kt',status:'modified',sha:'f8bca3e1f174f80d42cc01e6f293270d5314cf03',additions:59,deletions:0,changes:59})
]);
const id=x=>x.repository.toLowerCase()+'#'+x.pr;
const identical=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function sourceFreePathFamily(file){
 if(!file||typeof file.filename!=='string')return null;
 if(eligibleByFrozenPath(file.filename)&&/\.(kt|java)$/.test(file.filename)&&file.filename.startsWith('app/src/main/'))
  return 'ANDROID_PRODUCTION_GENERIC_RULE_FAMILIES_UNVERIFIED';
 if(eligibleByFrozenPath(file.filename)&&file.filename.startsWith('.github/workflows/'))
  return 'WORKFLOW_GUARDS_RULE_FAMILIES_UNVERIFIED';
 return null;
}
function screenFrozenSourceMetadata({roster,preseal,exposures,previousDispositions}={}){
 if(!roster||roster.schema!=='c2-bulk-source-candidate-manifest/v1'||
 roster.candidates?.length!==169||roster.cutoff!=='2026-10-20T19:30:54Z'||
 !preseal||!KEYS(preseal,ROOT)||preseal.schema!=='c2-owner-source-only-route-screen/v1'||
 preseal.sourceManifest!=='docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json'||
 preseal.baseRosterCount!==169||preseal.alreadyExposed!==10||
 preseal.remainingBeforeSourceRead!==159||
 typeof preseal.selectionBasis!=='string'||preseal.selectionBasis.length<80||
 !KEYS(preseal.candidate,SEL)||!identical(preseal.candidate,PINNED)||
 preseal.originalSourceInspected!==false||preseal.diffRead!==false||
 preseal.ownerReleaseGranted!==false||preseal.exactRuleVerified!==false||
 preseal.trainingIndependenceVerified!==false||preseal.sourceOracleExecuted!==false||
 preseal.baselinePredictionsRead!==false||preseal.candidatePredictionsRead!==false||
 preseal.goldAdded!==0||preseal.truthSealed!==false||preseal.sssPlusCertified!==false||
 FROZEN_RULES.length!==17||FROZEN_CORE_BLOBS.core!=='db29f94be1e0afb791a241d26f449695df0eafd0')blocked();
 const matches=roster.candidates.filter(c=>c.repository===PINNED.repository&&c.pr===PINNED.pr&&
 c.baseSha===PINNED.baseSha&&c.headSha===PINNED.headSha&&c.createdAt===PINNED.createdAt&&
 c.source==='PROSPECTIVE_GITHUB'&&c.disclosure==='METADATA_ONLY');
 if(matches.length!==1||!exposures||exposures.disclosures?.length!==8||
 !Array.isArray(previousDispositions)||previousDispositions.length!==2)blocked();
 const previously=[...exposures.disclosures,previousDispositions[0]?.original,
 previousDispositions[1]?.candidate];
 const ids=new Set();
 for(const p of previously){
  if(!p||typeof p.repository!=='string'||!Number.isSafeInteger(p.pr))blocked();
  const k=id(p);if(ids.has(k)||k===id(PINNED))blocked();ids.add(k);
 }
 if(ids.size!==10||!Array.isArray(preseal.paths)||preseal.paths.length!==PATHS.length)blocked();
 const seen=new Set(),actual=[];
 for(const file of preseal.paths){
  if(!KEYS(file,FILE)||!(/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(file.filename))||
   file.filename.split('/').some(p=>p==='..'||p==='.')||
   seen.has(file.filename)||!HEX40.test(file.sha)||
   !['modified','added'].includes(file.status)||
   ![file.additions,file.deletions,file.changes].every(Number.isSafeInteger)||
   file.additions<0||file.deletions<0||file.changes!==file.additions+file.deletions)blocked();
  seen.add(file.filename);actual.push(file);
 }
 const byName=v=>[...v].sort((a,b)=>a.filename.localeCompare(b.filename));
 if(!identical(byName(actual),byName(PATHS)))blocked();
 const src=actual.filter(f=>sourceFreePathFamily(f));
 const tests=actual.filter(f=>/\/src\/(?:test|androidTest)\//.test(f.filename));
 if(src.length!==1||tests.length!==1)blocked();
 return Object.freeze({
  schema:'c2-source-free-frozen-family-preflight/v1',
  status:'METADATA_PATH_POSSIBLE_RULE_UNVERIFIED',
  candidate:{...PINNED},frozenRuleCount:FROZEN_RULES.length,
  historicalCoreBlob:FROZEN_CORE_BLOBS.core,
  sourceReviewedBefore:ids.size,
  untouchedSourceCandidatesBefore:roster.candidates.length-ids.size,
  productionEligibleFiles:src.length,testFiles:tests.length,
  possibleFamilies:[...new Set(src.map(sourceFreePathFamily))],
  sourceReleaseGranted:false,exactRuleMatched:false,
  originalFixBenignExecuted:false,sourceOracleAuthenticated:false,
  causalIndependenceCertified:false,detectorPredictionsRead:false,
  baselinePredictionsRead:false,newGoldLabels:0,truthSealed:false,sssPlusCertified:false
 });
}
module.exports={screenFrozenSourceMetadata,sourceFreePathFamily,PINNED};
