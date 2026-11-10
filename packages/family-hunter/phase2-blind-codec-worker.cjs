'use strict';
// Run only in an empty-network, source-inventory-only namespace. No oracle mounted.
const fs=require('node:fs');
const {scanCodecIntegrityHypotheses}=require('./phase2-codec-integrity-hunter.cjs');
try{
 if(process.argv.length!==4)throw Error('BAD_ARGUMENTS');
 const [inventory,output]=process.argv.slice(2);
 const raw=fs.readFileSync(inventory);
 if(raw.length>32*1024*1024)throw Error('INVENTORY_TOO_LARGE');
 const parsed=JSON.parse(raw.toString('utf8'));
 const verdict=scanCodecIntegrityHypotheses(parsed);
 if(verdict.status.startsWith('BLOCKED_')||verdict.sourceRepositoryAuthenticated!==false||
   verdict.originalFunctionalOracleVerified!==false||verdict.causalityVerified!==false||
   verdict.remoteWrites!==false||verdict.mergeAllowed!==false)throw Error('UNTRUSTED_HUNTER_VERDICT');
 fs.writeFileSync(output,JSON.stringify({...verdict,filesScanned:parsed.files.length}),{flag:'wx',mode:0o600});
 console.log('BLIND_CODEC_SOURCE_SCAN_SEALED');
 console.log('blind_codec_files_scanned='+parsed.files.length);
 console.log('blind_codec_unverified_findings='+verdict.findings.length);
}catch(e){
 console.error('BLIND_CODEC_WORKER_BLOCKED: '+e.message);
 process.exitCode=1;
}
