#!/usr/bin/env node
'use strict';
/* Read-only: the workflow authenticates the archived GitHub Action, artifact
 * digest and immutable Core blobs BEFORE this file parses prior predictions. */
const fs=require('node:fs');
const path=require('node:path');
const {
  buildExecutableRuleInventory,
  evaluateAuthenticBenignControlCapture,
  ORIGINAL_NEGATIVES
}=require('../packages/quality-gates/c2-executable-rule-inventory.cjs');
const fail=()=>{throw Error('C2_RULE_INVENTORY_BLOCKED');};
function read(file,maxBytes){
 if(!path.isAbsolute(file))fail();
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<2||
    st.size>maxBytes)fail();
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function matchOriginalOwnerReceipts(receipts){
 if(!receipts||
   receipts.schema!=='c2-run23-twelve-original-owner-oracle-reconciliation/v1'||
   receipts.ownerOriginalOraclesReconciled!==12||
   receipts.positiveSourceReceiptsReconciled!==6||
   receipts.negativeSourceReceiptsReconciled!==6||
   receipts.independenceVerified!==false||receipts.newLabels!==0||
   !Array.isArray(receipts.entries)||receipts.entries.length!==12)fail();
 const matched=new Set();
 for(const x of ORIGINAL_NEGATIVES){
  const e=receipts.entries.find(y=>y.pr===x.pr&&
    y.headSha===x.headSha&&y.blobSha===x.blobSha&&y.rule===x.rule&&
    y.path===x.path&&y.line===x.line&&y.positive===false);
  if(!e||typeof e.originalEvidenceSha256!=='string'||
    !/^[0-9a-f]{64}$/.test(e.originalEvidenceSha256)||
    typeof e.originalOwnerArchiveSha256!=='string'||
    !/^[0-9a-f]{64}$/.test(e.originalOwnerArchiveSha256)||
    e.scoringAdmitted!==false||
    e.causalIndependenceStatus!=='REQUIRES_INDEPENDENT_INTERVENTION'||
    matched.has(e.identity))fail();
  matched.add(e.identity);
 }
 if(matched.size!==6)fail();
 return 6;
}
function main(args){
 if(args.length!==3||args.some(x=>!path.isAbsolute(x)))fail();
 const [capturePath,receiptsPath,out]=args;
 if(new Set(args.map(x=>path.resolve(x))).size!==3||fs.existsSync(out))fail();
 const capture=read(capturePath,250000);
 const receipts=read(receiptsPath,250000);
 const matched=matchOriginalOwnerReceipts(receipts);
 const inventory=buildExecutableRuleInventory();
 const benign=evaluateAuthenticBenignControlCapture(capture,inventory);
 if(matched!==benign.authenticNegativeSourceOraclesInArchive)fail();
 const report={
  schema:'c2-core-rule-inventory-owner-controls/v1',
  status:'AUTHENTIC_DEVELOPMENT_CONTROLS_UNSCORABLE_RULE_GAPS_IDENTIFIED',
  sourceArtifact:{
   ownerRepository:'cardenaspiero255-lang/Ultra-Sentinel',
   originalRunId:39817571622,originalArtifactId:12443326034,
   originalArtifactSha256:'e4063305507ea32d882cbfa86fc3c7a368a13b4013d7999e1c4ef486aeea9f89',
   authenticatedByWorkflow:true,
   provenanceRecheckedByThisParser:false
  },
  inventory,benign,
  certification:{newGold:0,scoredNegatives:0,
   falsePositiveRate:null,precision:null,recall:null,f1:null,
   holdoutFrozen:false,sssPlusCertified:false}
 };
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({
  ruleCount:inventory.ruleCount,byImplementation:inventory.byImplementation,
  authenticBenignOriginals:benign.authenticNegativeSourceOraclesInArchive,
  outOfRuleVocabulary:benign.outOfRuleVocabulary,
  unexpectedOtherRuleAlerts:benign.unexpectedOtherRuleAlerts,
  scoredNegatives:benign.ruleSpecificBenignCasesScored,
  falsePositiveRate:null,precision:null,recall:null,f1:null,sssPlusCertified:false
 })+'\n');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){
 process.stderr.write('C2_RULE_INVENTORY_BLOCKED '+String(e.message||e).slice(0,150)+'\n');
 process.exitCode=2;}}
module.exports={main,matchOriginalOwnerReceipts};
