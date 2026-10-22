'use strict';
const test=require('node:test'),a=require('node:assert/strict');
const crypto=require('node:crypto');
const {pilotMatrix,adjudicatePilot}=require('../../packages/quality-gates/c2-pr189-sixteen-original-replays.cjs');
const roster=require('../fixtures/c2-upstream-106-task-tree.json');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function names(){return pilotMatrix().include.flatMap(x=>x.tasks);}
function receipt(task,status='NO_DECLARED_REGRESSION'){
 const base={task,status,sourceCommit:'b9025d86f7ae634901396766bd61f6d4ae6d2165',
  newPositiveLabels:0,newNegativeLabels:0};
 if(status==='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED')
  return {...base,candidateTransitions:1,receiptSha256:hash(task),
   sourceCommitClaim:hash(task+'orig').slice(0,40),fixedCommitClaim:hash(task+'fixed').slice(0,40)};
 return base;
}
test('RED: launch exactly 16 owner-authenticated pilot tasks across nine repositories; leave other 90 untouched',()=>{
 const before=JSON.stringify(roster),matrix=pilotMatrix();
 a.equal(JSON.stringify(roster),before);
 a.equal(matrix.include.length,10);
 a.equal(names().length,16);
 a.equal(new Set(names()).size,16);
 a.equal(new Set(matrix.include.map(x=>x.project)).size,9);
 a.ok(matrix.include.every(x=>x.tasks.length<=3&&x.tasks.length>=1));
 a.ok(matrix.include.every(x=>x.tasks.every(t=>t.startsWith(x.project+'_')||t.startsWith(x.project+'-'))));
 a.equal(matrix.notSelectedCount,90);
 a.equal(matrix.newLabels,0);
 a.equal(matrix.blindHoldout,false);
});
test('RED: 16 authentic source receipts classify 4 distinct outcomes but cannot mint gold, negative labels, blind holdout',()=>{
 const selected=names();
 const statuses=['TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED','INFRA_BLOCKED','REPRODUCTION_MISMATCH','NO_DECLARED_REGRESSION'];
 const input=selected.map((t,i)=>receipt(t,statuses[i%4]));
 const before=JSON.stringify(input),report=adjudicatePilot(structuredClone(input));
 a.equal(JSON.stringify(input),before);
 a.equal(report.candidateCount,16);
 a.equal(report.remainingUntouched,90);
 a.equal(report.counts.TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED,4);
 a.equal(report.counts.INFRA_BLOCKED,4);
 a.equal(report.counts.REPRODUCTION_MISMATCH,4);
 a.equal(report.counts.NO_DECLARED_REGRESSION,4);
 a.equal(report.candidates.length,16);
 a.ok(report.candidates.every(x=>!x.admittedLabel&&!x.blindHoldoutEligible&&!x.rootCauseIndependenceVerified&&x.historicalDedupStatus==='SEMANTIC_DEDUP_PENDING'));
 a.equal(report.newLabels,0);
 a.equal(report.independentlyCertifiedCausesAdded,0);
 a.equal(report.sourceLabels,23);
 a.equal(report.precision,null);a.equal(report.recall,null);a.equal(report.f1,null);
 a.equal(report.sssPlusCertified,false);
});
test('RED: reject missing candidate, duplicates, off-pilot, fraudulent source and false label promotions',()=>{
 const original=names().map(t=>receipt(t));
 const mutations=[
  x=>x.pop(),
  x=>x.push({...x[0]}),
  x=>{x[0].task=roster.entries.find(x=>!names().includes(x.name)).name;},
  x=>{x[0].task='../../bad';},
  x=>{x[0].sourceCommit='0'.repeat(40);},
  x=>{x[0].newPositiveLabels=1;},
  x=>{x[0].status='GOLD_VERIFIED';},
  x=>{x[0].blindHoldout=true;},
  x=>{x[0].rootCauseVerified=true;},
  x=>{x[0].reason='x'.repeat(6000);}
 ];
 for(const mutate of mutations){const bad=structuredClone(original);mutate(bad);
  a.throws(()=>adjudicatePilot(bad),/C2_PR189_PILOT_BLOCKED/);}
});
test('RED: no original test receipts is not a completed campaign',()=>{
 a.throws(()=>adjudicatePilot([]),/C2_PR189_PILOT_BLOCKED/);
});
