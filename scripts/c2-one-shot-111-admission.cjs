#!/usr/bin/env node
'use strict';
// Offline-only. GitHub owner workflow authenticates the originating report
// run and artifact, then provides its JSON path to this script.
const fs=require('node:fs'),path=require('node:path');
const {assessOneShotAdmission}=require('../packages/quality-gates/c2-one-shot-111-admission.cjs');
try{
 const args=process.argv.slice(2);
 if(args.length!==1||!path.isAbsolute(args[0]))throw Error('BAD_ARGUMENTS');
 const stat=fs.lstatSync(args[0]);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>2_000_000)
  throw Error('UNSAFE_REPORT');
 const input=JSON.parse(fs.readFileSync(args[0],'utf8'));
 const report=assessOneShotAdmission(input);
 if(report.sourceCandidates!==155||report.newGoldLabels!==0||
  report.authorizedSourceReads!==0||report.truthSealed!==false||
  report.autoGoldAdmissionAllowed!==false)throw Error('INVALID_CAMPAIGN');
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}catch{
 process.stderr.write('C2_ONE_SHOT_ADMISSION_BLOCKED: immutable source-free ranking required\n');
 process.exitCode=1;
}
