#!/usr/bin/env node
'use strict';
/* Convert authenticated owner artifacts into a sanitized historical index. */
const fs=require('node:fs'),path=require('node:path');
const {reconcileFullHistoricalDevelopmentLedger}=
 require('../packages/quality-gates/c2-historical-23-ledger.cjs');
const {bindHistoricalLedgerToOriginalOwnerManifest}=
 require('../packages/quality-gates/c2-original-manifest-binding.cjs');
function read(file){
 if(!path.isAbsolute(file))throw Error('C2_HISTORICAL_LEDGER_UNSAFE_PATH');
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
    stat.size<50||stat.size>3000000)throw Error('C2_HISTORICAL_LEDGER_UNSAFE_INPUT');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 if(args.length!==4||args.some(p=>!path.isAbsolute(p))||
    new Set(args).size!==4||fs.existsSync(args[3]))
  throw Error('C2_HISTORICAL_LEDGER_INVALID_PATHS');
 const report=reconcileFullHistoricalDevelopmentLedger({
  audit:read(args[0]),pending:read(args[1]),recovered:read(args[2])
 });
 const bound=bindHistoricalLedgerToOriginalOwnerManifest(report);
 const output={...report,originalStageCasesBound:bound.originalStageCasesBound,
  originalRecoveredCasesBound:bound.originalRecoveredCasesBound,
  ownerOriginalManifestBindingSha256:bound.manifestBindingSha256,
  originalManifestAuthenticatedByThisProcess:false};
 fs.writeFileSync(args[3],JSON.stringify(output,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({status:report.status,
  historicalIdentities:report.historicalIdentities,
  recovered:report.recoveredExternalReceiptLinks,
  pendingCausalAssignments:report.unresolvedCausalAssignments,
  ledgerSha256:report.ledgerSha256,newGoldLabels:0,sssPlusCertified:false})+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}
 catch(e){process.stderr.write('C2_HISTORICAL_23_LEDGER_BLOCKED\n');process.exitCode=2}}
module.exports={main};
