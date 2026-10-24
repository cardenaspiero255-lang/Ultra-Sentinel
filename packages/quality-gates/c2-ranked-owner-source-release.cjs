'use strict';
/* Pre-source owner release only: never import Sentinel detector, never execute
 * external PR source, never evaluate a label. Strict one-candidate grant. */
const {createHash}=require('node:crypto');
const blocked=()=>{throw Error('C2_RANKED_OWNER_RELEASE_BLOCKED');};
const HEX40=/^[0-9a-f]{40}$/;
const original={repository:'nextcloud/talk-android',pr:6940,
 baseSha:'48880fb92e49a3cd3fa345e6e10bd21f80cc5b1a',
 headSha:'45b1a9c6aa24def1ee2e6ae3e2aeb01ff2626772',
 createdAt:'2026-10-22T14:44:23Z'};
const scope=[
 {filename:'app/src/main/AndroidManifest.xml',status:'modified',sha:'65cf60c075bc641ddb63d19a4f8616e7ca12670d',additions:1,deletions:1,changes:2},
 {filename:'app/src/main/java/com/nextcloud/talk/activities/MainActivity.kt',status:'modified',sha:'5e66bc194c5fd8400d70c9fbdba7415d15377e8a',additions:42,deletions:1,changes:43},
 {filename:'app/src/main/java/com/nextcloud/talk/activities/MainActivityLaunch.kt',status:'added',sha:'45e4061ca16bf2d1be0b84d0038c3ce62efdb915',additions:50,deletions:0,changes:50},
 {filename:'app/src/test/java/com/nextcloud/talk/activities/MainActivityLaunchTest.kt',status:'added',sha:'4e11aba74a969256e01e309a053a63d608341e31',additions:148,deletions:0,changes:148}
];
const fields=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const requestFields=['schema','scope','ownerApproval','actorId','repositoryId','sourceRankingRunId',
 'sourceRankingArtifactId','sourceRankingArtifactSha256','frozenCoreCommit','frozenCoreBlob',
 'frozenRules','sourceRosterTotal','previouslyExposed','rankScore','deterministicRank',
 'candidate','pathScope','sourceInspected','exactRuleId','exactRulePathLineVerified',
 'trainingIndependenceCertified','originalOracleExecuted','fixedOracleExecuted',
 'benignOracleExecuted','detectorPredictionsRead','baselinePredictionsRead','truthSealed',
 'newGoldLabels','sssPlusCertified','limitation'];
function validateRankedOwnerSourceRelease({request,roster,eight,prior,api,event,files}={}){
 try{
 if(!fields(request,requestFields)||
  request.schema!=='c2-owner-ranked-candidate-release-request/v1'||
  request.scope!=='EXACT_ONE_PUBLIC_SOURCE_READ_NO_CODE_EXECUTION'||
  request.ownerApproval!=='ALLOW_ONE_SOURCE_READ_NO_PREDICTIONS'||
  request.actorId!==322222186||request.repositoryId!==1418338512||
  request.sourceRankingRunId!==40135121700||request.sourceRankingArtifactId!==12576852855||
  request.sourceRankingArtifactSha256!=='f621b4acd62b5cf9eecb869a7cedf510085becac047e1e16b30110a442173b9d'||
  request.frozenCoreCommit!=='547938ed88804e25bbabecf74a3c3d91b74cf1a4'||
  request.frozenCoreBlob!=='db29f94be1e0afb791a241d26f449695df0eafd0'||
  request.frozenRules!==17||request.sourceRosterTotal!==169||
  request.previouslyExposed!==11||request.rankScore!==13||request.deterministicRank!==1||
  !same(request.candidate,original)||!same(request.pathScope,scope)||
  request.sourceInspected!==false||request.exactRuleId!==null||
  request.exactRulePathLineVerified!==false||
  request.trainingIndependenceCertified!==false||
  request.originalOracleExecuted!==false||request.fixedOracleExecuted!==false||
  request.benignOracleExecuted!==false||request.detectorPredictionsRead!==false||
  request.baselinePredictionsRead!==false||request.truthSealed!==false||
  request.newGoldLabels!==0||request.sssPlusCertified!==false||
  typeof request.limitation!=='string'||request.limitation.length<80)blocked();
 if(!event||!fields(event,['actorId','repositoryId','eventName','ref','commit'])||
  event.actorId!==request.actorId||event.repositoryId!==request.repositoryId||
  event.eventName!=='push'||event.ref!=='refs/heads/main'||!HEX40.test(event.commit))blocked();
 if(!api||api.number!==original.pr||api.created_at!==original.createdAt||
  api.base?.sha!==original.baseSha||api.base?.repo?.full_name!==original.repository||
  api.head?.sha!==original.headSha||!['open','closed'].includes(api.state))blocked();
 if(!roster||roster.schema!=='c2-bulk-source-candidate-manifest/v1'||
  roster.cutoff!=='2026-10-20T19:30:54Z'||roster.candidates?.length!==169||
  roster.candidates.filter(c=>c.repository===original.repository&&c.pr===original.pr&&
   c.baseSha===original.baseSha&&c.headSha===original.headSha&&
   c.createdAt===original.createdAt&&c.disclosure==='METADATA_ONLY').length!==1)blocked();
 if(!eight||eight.disclosures?.length!==8||!Array.isArray(prior)||
  prior.length!==3||prior[0]?.repository!=='LawnchairLauncher/lawnchair'||prior[0].pr!==7428||
  prior[1]?.repository!=='bitwarden/android'||prior[1].pr!==7499||
  prior[2]?.repository!=='home-assistant/android'||prior[2].pr!==7681)blocked();
 const ids=new Set();
 for(const c of [...eight.disclosures,...prior]){
  if(!c||typeof c.repository!=='string'||!Number.isSafeInteger(c.pr))blocked();
  const id=c.repository.toLowerCase()+'#'+c.pr;
  if(ids.has(id)||id===original.repository.toLowerCase()+'#'+original.pr)blocked();
  ids.add(id);
 }
 if(ids.size!==11||!Array.isArray(files)||files.length!==scope.length)blocked();
 const sorted=x=>[...x].sort((a,b)=>a.filename.localeCompare(b.filename));
 for(const f of files){
  if(!fields(f,['filename','status','sha','additions','deletions','changes'])||
   typeof f.filename!=='string'||f.filename.includes('..')||
   !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(f.filename)||
   !HEX40.test(f.sha)||!['added','modified'].includes(f.status)||
   ![f.additions,f.deletions,f.changes].every(Number.isSafeInteger)||
   f.changes!==f.additions+f.deletions)blocked();
 }
 if(!same(sorted(files),sorted(scope)))blocked();
 return Object.freeze({
  schema:'c2-one-owner-ranked-source-release/v1',
  candidate:{...original},permission:'OWNER_ONLY_SINGLE_SOURCE_READ',
  repositoryId:event.repositoryId,actorId:event.actorId,introducingMainSha:event.commit,
  requestSha256:createHash('sha256').update(JSON.stringify(request)).digest('hex'),
  changedFiles:4,sourceReadPermitted:true,ruleMatched:false,
  originalOracleExecuted:false,fixedOracleExecuted:false,benignOracleExecuted:false,
  detectorPredictionsRead:false,baselinePredictionsRead:false,truthSealed:false,
  newGoldLabels:0,sssPlusCertified:false,
  limitation:'This is permission to read exactly one external PR; neither source behavior nor training independence nor a frozen Core rule is certified.'
 });
 }catch{blocked();}
}
module.exports={validateRankedOwnerSourceRelease};
