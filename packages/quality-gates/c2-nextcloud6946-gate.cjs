'use strict';
// Validates only preregistered metadata. No external source bytes are consumed.
const crypto=require('node:crypto');
const sealed=require('../../docs/quality/C2-NEXTCLOUD-TALK6946-PREAUTHORIZED-SOURCE-20261024.json');
const deny=()=>{throw Error('C2_6946_METADATA_BLOCKED');};
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const hex40=/^[0-9a-f]{40}$/;
const keys=(obj,allowed)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).length===allowed.length&&allowed.every(k=>Object.hasOwn(obj,k));
const candidate={repository:'nextcloud/talk-android',pr:6946,
 baseSha:'591f033cd87f44d90c430d7fa477285eb22186e0',
 headSha:'043f67d25278f6c55713f02ed8a5455e7f4bdebb',
 createdAt:'2026-10-23T15:46:12Z'};
const FILE=['filename','status','sha','additions','deletions','changes'];
const REQUEST=['schema','scope','ownerApproval','actorId','repositoryId','sourceRankingRunId',
 'sourceRankingArtifactId','sourceRankingArtifactSha256','frozenCoreCommit','frozenCoreBlob',
 'frozenRules','sourceRosterTotal','previouslyExposed','rankScore','deterministicRank',
 'candidate','pathScope','sourceInspected','exactRuleId','exactRulePathLineVerified',
 'trainingIndependenceCertified','originalOracleExecuted','fixedOracleExecuted',
 'benignOracleExecuted','detectorPredictionsRead','baselinePredictionsRead','truthSealed',
 'newGoldLabels','sssPlusCertified','limitation'];
function authorizeMetadata({request,pr,files,owner}={}){
 if(!keys(request,REQUEST)||!same(request,sealed)||!same(request.candidate,candidate)||
  request.sourceRankingRunId!==40143252243||
  request.sourceRankingArtifactId!==12579174108||
  request.sourceRankingArtifactSha256!=='192af2eed718b8602ebe95981acb813d1ba9e02d8b4faa0588231e5172de83b1'||
  request.rankScore!==9||request.previouslyExposed!==12||
  request.sourceInspected!==false||request.exactRuleId!==null||
  request.newGoldLabels!==0||request.truthSealed!==false||
  request.detectorPredictionsRead!==false||request.baselinePredictionsRead!==false||
  request.frozenCoreBlob!=='db29f94be1e0afb791a241d26f449695df0eafd0'||
  !keys(owner,['actorId','repositoryId','ref','eventName','mainSha'])||
  owner.actorId!==322222186||owner.repositoryId!==1418338512||
  owner.ref!=='refs/heads/main'||owner.eventName!=='push'||!hex40.test(owner.mainSha)||
  !pr||pr.number!==candidate.pr||pr.created_at!==candidate.createdAt||
  pr.base?.sha!==candidate.baseSha||pr.base?.repo?.full_name!==candidate.repository||
  pr.head?.sha!==candidate.headSha||
  !Array.isArray(files)||files.length!==16||request.pathScope.length!==16)deny();
 const sorted=list=>[...list].sort((a,b)=>a.filename.localeCompare(b.filename));
 for(const f of files){
  if(!keys(f,FILE)||typeof f.filename!=='string'||
   !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(f.filename)||
   f.filename.includes('..')||!hex40.test(f.sha)||
   !['modified','added'].includes(f.status)||
   ![f.additions,f.deletions,f.changes].every(Number.isSafeInteger)||
   f.additions<0||f.deletions<0||f.changes!==f.additions+f.deletions)deny();
 }
 if(!same(sorted(files),sorted(request.pathScope)))deny();
 return Object.freeze({candidate:{...candidate},ownerMainSha:owner.mainSha,
  changedFiles:16,requestSha256:crypto.createHash('sha256').update(JSON.stringify(request)).digest('hex'),
  sourceReadPermitted:true,exactRuleMatched:false,originalFixBenignExecuted:false,
  detectorPredictionsRead:false,baselinePredictionsRead:false,
  truthSealed:false,newGoldLabels:0,sssPlusCertified:false});
}
module.exports={authorizeMetadata};
