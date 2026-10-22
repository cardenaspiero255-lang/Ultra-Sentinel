'use strict';
const crypto=require('node:crypto');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const HX=/^[a-f0-9]{64}$/;
const die=()=>{throw Error('C2_PR186_CROSS_BLOCKED');};
const EXPECT=[
 {suite:'json-query',sources:['json','query'],identities:['152:110','158:144']},
 {suite:'rollback-ttl',sources:['rollback','ttl'],identities:['152:41','158:114']}
];
function adjudicateFour(proofs){
 try{
  if(!Array.isArray(proofs)||proofs.length!==2)die();
  const hashes=[],identities=[];
  for(let i=0;i<2;i++){
   const p=proofs[i],e=EXPECT[i];
   if(!p||p.schema!=='c2-pr186-orthogonal-original-kotlin/v1'||
     p.suite!==e.suite||p.newLabels!==0||
     p.certifiedIndependentCausesAdded!==0||p.sssPlusCertified!==false||
     p.candidatePredictionsRead!==false||p.baselineRead!==false||
     !Array.isArray(p.sources)||p.sources.length!==2||
     !Array.isArray(p.rows)||p.rows.length!==4)die();
   for(let j=0;j<2;j++){
    const src=p.sources[j];
    if(!src||src.name!==e.sources[j]||
      !HX.test(src.originalSha256)||!HX.test(src.repairSha256)||
      src.originalSha256===src.repairSha256)die();
    hashes.push(src.originalSha256,src.repairSha256);
   }
   for(let j=0;j<4;j++){
    const mode=['00','01','10','11'][j],r=p.rows[j];
    if(!r||r.mode!==mode||r.firstRepaired!==(mode[0]==='1')||
      r.secondRepaired!==(mode[1]==='1')||
      r.firstBehaviorCorrect!==(mode[0]==='1')||
      r.secondBehaviorCorrect!==(mode[1]==='1')||
      r.normalControlsPassed!==true||r.originalKotlinExecuted!==true||
      !HX.test(r.jarSha256)||!HX.test(r.logSha256))die();
    hashes.push(r.jarSha256,r.logSha256);
   }
   identities.push(...e.identities);
  }
  if(new Set(hashes).size!==hashes.length)die();
  return Object.freeze({
   schema:'c2-pr186-four-mechanism-orthogonal-source-evidence/v1',
   status:'FOUR_SOURCE_INTERVENTIONS_ORTHOGONAL_FAMILY_INDEPENDENCE_NOT_CERTIFIED',
   originalKotlinJointRuns:8,
   behaviorIdentities:identities.sort(),
   orthogonalSourceBehaviors:4,
   jsonQueryExperimentSha256:sha(JSON.stringify(proofs[0])),
   rollbackTtlExperimentSha256:sha(JSON.stringify(proofs[1])),
   sourceLabels:23,newLabels:0,
   independentlyDistinctCausalFamiliesCertified:0,
   causesCertifiedAsIndependent:false,blindHoldout:false,
   precision:null,recall:null,f1:null,sssPlusCertified:false,
   limitation:'Cross repairs show orthogonal implementation effects in original Kotlin, not causal-family independence, model performance, blind gold labels or SSS+ certification.'
  });
 }catch(e){if(e?.message==='C2_PR186_CROSS_BLOCKED')throw e;die();}
}
module.exports={adjudicateFour};
