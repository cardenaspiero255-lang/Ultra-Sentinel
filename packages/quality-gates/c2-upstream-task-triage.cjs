'use strict';
/** Only audits original upstream expected test transitions. Never mints truth. */
const crypto=require('node:crypto');
const {UPSTREAM,PROJECTS}=require('./c2-kotlin-upstream-candidate-index.cjs');
const SHA=/^[a-f0-9]{40}$/;
function fail(){throw Error('C2_UPSTREAM_TASK_TRIAGE_BLOCKED');}
function scalar(toml,key){
 if(typeof toml!=='string'||toml.length>65536||toml.length<100)fail();
 const match=toml.match(new RegExp('^'+key+'\\s*=\\s*"([A-Za-z0-9._-]+)"\\s*$','m'));
 if(!match)fail();return match[1];
}
function auditTask(task){
 if(!task||typeof task.name!=='string'||typeof task.toml!=='string'||
    !task.expected||typeof task.expected!=='object'||Array.isArray(task.expected)||
    !SHA.test(task.tomlGitSha||'')||!SHA.test(task.expectedGitSha||''))fail();
 const match=Object.keys(PROJECTS).find(p=>task.name.startsWith(p+'-'));
 if(!match||!/^\d+$/.test(task.name.slice(match.length+1)))fail();
 const repo=PROJECTS[match].repository;
 const [owner,project]=repo.split('/');
 if(scalar(task.toml,'repository_owner')!==owner||
    scalar(task.toml,'repository_name')!==project||
    scalar(task.toml,'code_change_id')!==task.name.slice(match.length+1))fail();
 if(!/^\[verifier\][\s\S]*?^implemented\s*=\s*(?:true|false)\s*$/m.test(task.toml))fail();
 const implemented=/^implemented\s*=\s*true\s*$/m.test(task.toml.split('[verifier]')[1].split('[')[0]);
 const all=new Set(),counts={};
 for(const cls of ['f2p','p2p','s2p','n2p']){
  const arr=task.expected[cls+'_tests'];
  if(!Array.isArray(arr)||arr.length>20000)fail();
  counts[cls]=arr.length;
  for(const item of arr){
   if(typeof item!=='string'||item.length>500||!item.trim()||all.has(item))fail();
   all.add(item);
  }
 }
 return Object.freeze({
  task:task.name,repository:repo,
  taskTomlGitSha:task.tomlGitSha,expectedTestsGitSha:task.expectedGitSha,
  ...Object.fromEntries(Object.entries(counts).map(([k,v])=>[k+'Tests',v])),
  verifierImplementedDeclared:implemented,
  triage:counts.f2p>0?'F2P_DECLARED_NOT_REPRODUCED':'NO_F2P_NOT_POSITIVE',
  sourceTestRunVerified:false,beforeFailedVerified:false,afterPassedVerified:false,
  independentRootCauseVerified:false,positiveLabels:0,negativeLabels:0
 });
}
function summarizeTasks(entries){
 if(!Array.isArray(entries)||entries.length!==106)fail();
 const names=new Set(),perRepo=new Map(),out=[];
 for(const t of entries){
  const item=auditTask(t);
  if(names.has(item.task))fail();
  names.add(item.task);
  perRepo.set(item.repository,(perRepo.get(item.repository)||0)+1);
  out.push(item);
 }
 for(const config of Object.values(PROJECTS)){
  if(perRepo.get(config.repository)!==config.tasks)fail();
 }
 out.sort((a,b)=>a.task.localeCompare(b.task,'en'));
 const payload={
  schema:'ultra-sentinel-c2-upstream-task-triage/v1',
  sourceRepository:UPSTREAM.repository,sourceCommit:UPSTREAM.commit,
  candidateCount:106,
  f2pDeclaredTasks:out.filter(x=>x.f2pTests>0).length,
  noF2pTasks:out.filter(x=>x.f2pTests===0).length,
  f2pTestMethodsDeclared:out.reduce((sum,x)=>sum+x.f2pTests,0),
  candidates:out,verifiedOriginalRegressions:0,newPositiveLabels:0,newNegativeLabels:0,
  benchmarkScoredLabels:0,precision:null,recall:null,f1:null,
  detectorComparisonsPerformed:false,blindHoldout:false,tripleSPlusCertified:false,
  status:'UPSTREAM_EXPECTATIONS_TRIAGED_NOT_EXECUTED'
 };
 return {...payload,contentSha256:crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')};
}
module.exports={auditTask,summarizeTasks};
