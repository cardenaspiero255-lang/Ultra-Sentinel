'use strict';
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const [directory,sentinel,work,head,rawMask]=process.argv.slice(2);
const mask=Number(rawMask),manifest=JSON.parse(fs.readFileSync(path.join(work,'interventions.json'),'utf8'));
if(!Number.isInteger(mask)||mask<1||mask>7||manifest.head!==head)throw Error('BAD_LOCAL_DRILL');
const env={PATH:process.env.PATH,HOME:'/tmp',GIT_NO_REPLACE_OBJECTS:'1',
 GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'};
const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
 '-c','commit.gpgsign=false',...args],{cwd:directory,encoding:'utf8',env,timeout:30000}).trim();
if(git('remote')!==''||git('rev-parse','HEAD')!==head||git('status','--porcelain')!=='')
 throw Error('LOCAL_DRILL_BASELINE_CHANGED');
const tree=git('rev-parse',head+'^{tree}'),selected=[];
for(let i=0;i<3;i++)if(mask&(1<<i)){
 const f=manifest.files[i];
 fs.copyFileSync(path.join(work,`candidate-${i}.kt`),path.join(directory,f.path));
 selected.push(f);
}
git('add','--',...selected.map(f=>f.path));
git('-c','user.name=Sentinel sandbox','-c','user.email=sandbox@example.invalid',
 'commit','-qm',`sandbox: telemetry intervention ${mask}`);
const repair=git('rev-parse','HEAD');
const changes=selected.map(f=>({...f,patchBytes:Buffer.byteLength(git('diff','--binary',head,repair,'--',f.path))}));
const judge=require(path.join(sentinel,'packages/recovery/repair-judge.cjs')).judgeLocalRepair({
 directory,baselineHeadSha:head,repairHeadSha:repair,
 plan:{branch:'sandbox/telemetry-three-source',expectedHeadSha:head,changes}
});
if(!judge.approved||judge.status!=='APPROVED_LOCAL_POLICY_ONLY')throw Error('LOCAL_GIT_JUDGE_VETO');
const rollback=require(path.join(sentinel,'packages/recovery/sandbox-rollback.cjs')).rollbackSandbox({
 directory,baselineHeadSha:head,repairHeadSha:repair
});
if(rollback.status!=='ROLLBACK_VERIFIED'||rollback.restoredTree!==tree||git('status','--porcelain')!=='')
 throw Error('LOCAL_EXACT_ROLLBACK_VETO');
console.log(JSON.stringify({mask,policyJudge:judge.status,rollback:rollback.status,restoredTree:tree,
 functionalApproval:false,remoteWrites:false,mergeAllowed:false}));
git('reset','--hard',head);
