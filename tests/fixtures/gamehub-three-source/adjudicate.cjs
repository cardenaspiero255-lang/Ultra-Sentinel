'use strict';
// Read actual local JVM logs produced by the enclosing networkless runner.
// The reusable factorial helper remains explicitly non-authenticating.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [sentinel,work,head]=process.argv.slice(2);
const manifest=JSON.parse(fs.readFileSync(path.join(work,'interventions.json'),'utf8'));
if(manifest.head!==head)throw Error('BAD_MANIFEST_HEAD');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const observations=[],receipts=[];
for(let mask=0;mask<8;mask++){
 const base=path.join(work,`case-${mask}`),status=Number(fs.readFileSync(base+'.exit','utf8').trim());
 const out=fs.readFileSync(base+'.out','utf8'),err=fs.readFileSync(base+'.err','utf8');
 const benign=out.split('\n').filter(s=>s==='BENIGN_TELEMETRY_PASS').length===1;
 const bad=status===2&&err==='EXTREME_TELEMETRY_MISMATCH\n';
 const good=status===0&&err===''&&out.split('\n').filter(s=>s==='THREE_SOURCE_TELEMETRY_ORACLE_PASS').length===1;
 if(!benign||(!bad&&!good))throw Error('INCOMPLETE_OR_CONTRADICTORY_JVM_RESULT');
 observations.push({mask,sourceHeadSha:head,defectObserved:bad,benignPassed:benign});
 receipts.push({mask,exitCode:status,defectObserved:bad,benignPassed:benign,
  jarSha256:sha(base+'.jar'),stdoutSha256:sha(base+'.out'),stderrSha256:sha(base+'.err')});
}
const files=manifest.files.map(f=>({path:f.path,blobSha:f.beforeBlobSha}));
const {adjudicateFactorialCausalHypotheses}=require(path.join(sentinel,'packages/quality-gates/phase2-causal-factorial.cjs'));
const analysis=adjudicateFactorialCausalHypotheses({expectedHeadSha:head,files,relations:[],observations});
if(analysis.status!=='INTERVENTION_HYPOTHESES_REQUIRING_TRUSTED_ORACLE'||
 analysis.causalityVerified!==false||analysis.completeMatrixRows!==8)throw Error('FACTORIAL_FILTER_VETO');
// The contrast is predeclared. A surprising result fails the experiment.
if(JSON.stringify(analysis.minimalRepairSets)!==JSON.stringify([[files[0].path],[files[1].path]])||
 analysis.necessaryFiles.length!==0)throw Error('UNEXPECTED_LOCAL_CAUSAL_PATTERN');
console.log(JSON.stringify({status:'TRANSCRIPTS_REQUIRE_TRUSTED_EXECUTION_ATTESTATION',
 sourceHeadSha:head,sourceFiles:files,receipts,minimalRepairSets:analysis.minimalRepairSets,
 necessaryFiles:analysis.necessaryFiles,threeFileMinimalInteractionProven:false,
 jvmExecutionAuthenticatedByHelper:false,sourceRepositoryAuthenticatedByHelper:false,
 oracleProductContractBeyondTestUnverified:true,
 ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false}));
