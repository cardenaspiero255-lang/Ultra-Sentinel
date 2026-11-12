'use strict';
/* Original-source inventory only. No oracle, expected labels, patch or repo
 * authority is ever accepted by this process. Run in the isolated launcher. */
const fs=require('node:fs');
const {scanCancellationPropagationHypotheses}=
 require('./phase2-cancellation-propagation-hunter.cjs');
try{
 if(process.argv.length!==4)throw Error('BAD_WORKER_ARGUMENTS');
 const [inventory,output]=process.argv.slice(2);
 const stat=fs.lstatSync(inventory);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>32*1024*1024)
  throw Error('UNTRUSTED_INVENTORY');
 const raw=fs.readFileSync(inventory);
 const options=JSON.parse(raw.toString('utf8'));
 const report=scanCancellationPropagationHypotheses(options);
 if(report.status.startsWith('BLOCKED_')||report.sourceByteIntegrityVerified!==true||
   report.sourceRepositoryAuthenticated!==false||
   report.originalFunctionalOracleVerified!==false||
   report.compilerTypeResolutionVerified!==false||
   report.causalityVerified!==false||report.generalizationVerified!==false||
   report.repairAuthorized!==false||report.remoteWrites!==false||
   report.mergeAllowed!==false)throw Error('UNTRUSTED_HUNTER_VERDICT');
 if(!Array.isArray(options.files)||options.files.length<1||options.files.length>80)
  throw Error('INVALID_SOURCE_COUNT');
 const outputReport=Object.freeze({...report,filesScanned:options.files.length});
 fs.writeFileSync(output,JSON.stringify(outputReport),{flag:'wx',mode:0o600});
 console.log('CANCELLATION_BLIND_SOURCE_ONLY_REPORT_SEALED');
 console.log('blind_cancellation_files_scanned='+outputReport.filesScanned);
 console.log('blind_cancellation_unverified_findings='+outputReport.findings.length);
}catch(e){
 console.error('BLIND_CANCELLATION_WORKER_BLOCKED: '+e.message);
 process.exitCode=1;
}
