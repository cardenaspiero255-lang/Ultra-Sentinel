#!/usr/bin/env node
'use strict';
/* No GitHub API, no detector prediction, no unsafe source execution.
 * Metadata-only pre-registration protocol (never a scored benchmark). */
const fs=require('node:fs'),path=require('node:path');
const {prepareProspectivePreseal}=require('../packages/quality-gates/c2-prospective-preseal-readiness.cjs');
const fail=()=>{throw Error('PROSPECTIVE_PRESEAL_BLOCKED');};
function main(args){
 if(!Array.isArray(args)||args.length!==2||
    args.some(p=>typeof p!=='string'||!path.isAbsolute(p))||
    path.resolve(args[0])===path.resolve(args[1]))fail();
 const [input,output]=args;
 const st=fs.lstatSync(input);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<4||st.size>2000000||
    fs.existsSync(output))fail();
 const doc=JSON.parse(fs.readFileSync(input,'utf8'));
 if(!doc||Array.isArray(doc)||typeof doc!=='object'||
    Object.keys(doc).length!==3||
    !Object.hasOwn(doc,'historical')||!Object.hasOwn(doc,'candidates')||
    doc.schema!=='c2-prospective-metadata-input/v1')fail();
 const report=prepareProspectivePreseal(doc.historical,doc.candidates);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({
  metadataCases:report.candidateCount,candidateProposals:report.candidateProposals,
  metadataFrozen:report.cohortMetadataFrozen,blindHoldout:report.blindHoldout,
  scoredNegatives:report.negativeFindingLabelsAdmitted,
  gold:report.newGoldLabels,precision:report.precision
 })+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(e){process.stderr.write('PROSPECTIVE_PRESEAL_BLOCKED: '+String(e.message||e)+'\n');process.exitCode=2;}
}
module.exports={main};
