'use strict';
const {analyze}=require('../core/ultra_sentinel_core.cjs');
const {present}=require('../family-hunter/ultra_sentinel_family_hunter_modes.cjs');
const {prepareReviewEnvelope}=require('./cross-repo-contract.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const SHA=/^[0-9a-f]{40}$/;
function reviewGameHubSnapshot(snapshot){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||
    snapshot.repo!==REPO||!SHA.test(snapshot.headSha||'')||
    !Array.isArray(snapshot.files)||snapshot.files.length>300||
    snapshot.files.some(f=>!f||typeof f!=='object'||typeof f.filename!=='string'||
     !['added','modified','removed','renamed'].includes(f.status)||
     (f.patch!==undefined&&f.patch!==null&&typeof f.patch!=='string')))
  throw Error('INVALID_GAMEHUB_SNAPSHOT');
 // Caller must independently authenticate origin and actual GitHub HEAD.
 // This adapter is read-only and cannot claim external provenance or CI verification.
 const analysis=analyze(snapshot.files,{sha:snapshot.headSha});
 const report=present(analysis,'REVIEW_ONLY');
 const verdict=analysis.verdict==='INCOMPLETE'?'INCOMPLETE':
  analysis.verdict==='REVIEW_REQUIRED'?'BLOCKED':'ADVISORY';
 return Object.freeze({envelope:prepareReviewEnvelope({
  targetRepo:REPO,headSha:snapshot.headSha,verdict,
  findingCount:analysis.findings.length+analysis.omitted}),
  report});
}
module.exports={reviewGameHubSnapshot};
