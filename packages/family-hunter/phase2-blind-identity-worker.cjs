'use strict';
// No oracle or product checkout is mounted in this sandbox.
const fs=require('node:fs');
const {scanIdentityDelimiterHypotheses}=require('./phase2-identity-delimiter-hunter.cjs');
try {
 if(process.argv.length!==4)throw Error('BAD_ARGUMENTS');
 const [inventory,output]=process.argv.slice(2),raw=fs.readFileSync(inventory);
 if(raw.length>32*1024*1024)throw Error('INVENTORY_TOO_LARGE');
 const parsed=JSON.parse(raw.toString('utf8'));
 const verdict=scanIdentityDelimiterHypotheses(parsed);
 if(verdict.status.startsWith('BLOCKED_')||verdict.sourceRepositoryAuthenticated!==false||
  verdict.originalFunctionalOracleVerified!==false||verdict.causalityVerified!==false||
  verdict.remoteWrites!==false||verdict.mergeAllowed!==false)
  throw Error('UNTRUSTED_IDENTITY_HUNTER_VERDICT');
 fs.writeFileSync(output,JSON.stringify({...verdict,filesScanned:parsed.files.length}),
  {flag:'wx',mode:0o600});
 console.log('BLIND_IDENTITY_SOURCE_SCAN_SEALED');
 console.log('blind_identity_files_scanned='+parsed.files.length);
 console.log('blind_identity_unverified_findings='+verdict.findings.length);
} catch(e) {
 console.error('BLIND_IDENTITY_WORKER_BLOCKED: '+e.message);
 process.exitCode=1;
}
