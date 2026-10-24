'use strict';
/*
 * Source-free, owner-precommitted candidate receipt consistency ONLY.
 * This module is NOT an external-oracle executor, original Git verifier,
 * detector, classifier, truth seal or scoring authority.
 */
const blocked=()=>{throw Error('C2_PRETRUTH_BLOCKED');};
const HEX40=/^[0-9a-f]{40}$/;
const EXPECTED_ROSTER='c2-bulk-source-candidate-manifest/v1';
const MANIFEST='docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json';
const SINGLE_A=new Set(['schema','phase','sourceManifest','cutoff','candidate','selectionCriteria',
'independenceConfirmed','licenseConfirmed','sourceReleasePermitted','sourceInspected',
'detectorPredictionsRead','baselinePredictionsRead','trainingExcluded',
'newGoldLabels','truthSealed','holdoutFrozen','tripleSPlusCertified']);
const SINGLE_B=new Set(['schema','phase','sourceManifest','cutoff','candidate','selectionCriteria',
'sourceInspected','baselinePredictionsRead','detectorPredictionsRead',
'trainingIndependenceCertified','sourceReleasePermitted','originalOracleExecuted',
'newGoldLabels','truthSealed','holdoutFrozen','tripleSPlusCertified']);
const BATCH=new Set(['schema','phase','sourceManifest','selectionRule','candidates',
'sourceInspected','detectorPredictionsRead','baselinePredictionsRead',
'oracleEvaluationOrder','trainingIndependenceCertified','newGoldLabels',
'truthSealed','holdoutFrozen','tripleSPlusCertified']);
const CANDIDATE=new Set(['repository','pr','createdAt','baseSha','headSha']);
const sameKeys=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
Object.keys(x).length===keys.size&&Object.keys(x).every(k=>keys.has(k));
const candidateKey=x=>x.repository.toLowerCase()+'#'+x.pr;
function preflightSelections(roster,selection){
 if(!roster||roster.schema!==EXPECTED_ROSTER||typeof roster.cutoff!=='string'||
 !Array.isArray(roster.candidates)||roster.candidates.length<1||roster.candidates.length>512||
 !selection||typeof selection!=='object'||Array.isArray(selection)||selection.sourceManifest!==MANIFEST||
 selection.newGoldLabels!==0||selection.sourceInspected!==false||
 selection.detectorPredictionsRead!==false||selection.baselinePredictionsRead!==false||
 selection.truthSealed!==false||selection.holdoutFrozen!==false||
 selection.tripleSPlusCertified!==false)blocked();
 const single=selection.schema==='c2-prospective-single-pr-selection/v1';
 const batch=selection.schema==='c2-prospective-fixed-ordered-oracle-screen/v1';
 if(!single&&!batch)blocked();
 if(single&&(![SINGLE_A,SINGLE_B].some(x=>sameKeys(selection,x))||
   selection.phase!=='METADATA_ONLY_PRE_SOURCE'||selection.cutoff!==roster.cutoff||
   selection.sourceReleasePermitted!==false))blocked();
 if(batch&&(!sameKeys(selection,BATCH)||selection.phase!=='FOUR_PRECOMMITTED_METADATA_ONLY'||
  selection.trainingIndependenceCertified!==false||!Array.isArray(selection.oracleEvaluationOrder)))blocked();
 const inputs=single?[selection.candidate]:selection.candidates;
 if(!Array.isArray(inputs)||inputs.length<1||inputs.length>32)blocked();
 const repoRows=new Map();
 for(const row of roster.candidates){
  if(!row||!HEX40.test(row.baseSha)||!HEX40.test(row.headSha)||!Number.isSafeInteger(row.pr)||
   row.source!=='PROSPECTIVE_GITHUB'||row.disclosure!=='METADATA_ONLY')blocked();
  const k=candidateKey(row);
  if(repoRows.has(k))blocked();
  repoRows.set(k,row);
 }
 const keys=new Set(),heads=new Set();
 for(const c of inputs){
  if(!sameKeys(c,CANDIDATE)||typeof c.repository!=='string'||!Number.isSafeInteger(c.pr)||
   c.pr<1||typeof c.createdAt!=='string'||!HEX40.test(c.baseSha)||!HEX40.test(c.headSha)||
   c.baseSha===c.headSha||!Number.isFinite(Date.parse(c.createdAt))||
   Date.parse(c.createdAt)<=Date.parse(roster.cutoff))blocked();
  const key=candidateKey(c);
  if(keys.has(key)||heads.has(c.headSha))blocked();
  keys.add(key);heads.add(c.headSha);
  const expected=repoRows.get(key);
  if(!expected||expected.headSha!==c.headSha||expected.baseSha!==c.baseSha||
   expected.createdAt!==c.createdAt||expected.repository!==c.repository)blocked();
 }
 if(batch&&(selection.oracleEvaluationOrder.length!==inputs.length||
  selection.oracleEvaluationOrder.some((p,i)=>p!==inputs[i].pr)))blocked();
 return Object.freeze({
  schema:'c2-source-free-precommit-preflight/v1',
  status:'C2_SOURCE_ORACLE_NOT_ADMITTED',
  precommittedCandidates:inputs.length,
  sourceInspectedByThisValidator:false,
  originalGithubGitProvenanceAuthenticated:false,
  sourceOracleAuthenticated:false,
  ruleCompatibilityAuthenticated:false,
  causalIndependenceCertified:false,
  trainingIndependenceCertified:false,
  newGoldLabels:0,priorDocumentedTruth:9,remaining:111,
  truthSealed:false,holdoutFrozen:false,detectorPredictionsRead:false,
  baselinePredictionsRead:false,precision:null,recall:null,f1:null,
  tripleSPlusCertified:false,
  limitation:'Exact frozen metadata is matched only against a repository manifest. No real original/fix/benign executable source truth, upstream original PR provenance, rule compatibility, train/test causal independence or scoring may be inferred.'
 });
}
module.exports={preflightSelections};
