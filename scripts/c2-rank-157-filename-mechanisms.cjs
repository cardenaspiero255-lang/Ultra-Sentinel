#!/usr/bin/env node
'use strict';
// Source-free, owner-protected processing. Do not supply PR titles, patches,
// source bytes, build artifacts, or detector predictions.
const fs=require('node:fs'),path=require('node:path');
const {rankMechanismPool}=require('../packages/quality-gates/c2-157-mechanism-first-ranker.cjs');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'docs/quality',p+'.json'),'utf8'));
try{
 const args=process.argv.slice(2);
 if(args.length!==1||!path.isAbsolute(args[0]))throw Error('BLOCKED');
 const buffer=fs.readFileSync(args[0]);
 if(buffer.length>5000000||!buffer.toString('utf8').endsWith('\n'))throw Error('BLOCKED');
 const observations=buffer.toString('utf8').trimEnd().split('\n').map(s=>JSON.parse(s));
 const report=rankMechanismPool({
  roster:read('C2-BULK-PROSPECTIVE-PR-METADATA-20261024'),
  eight:read('C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024'),
  dispositions:[
   read('C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024'),
   read('C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024'),
   read('C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024')],
  nextcloud:read('C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024'),
  observations
 });
 if(report.candidatesExamined!==157||report.sourcePreviouslyExposed!==12||
  report.newGoldLabels!==0||report.truthSealed!==false||
  report.candidatePredictionsRead!==false||report.originalOracleExecuted!==false)
  throw Error('BLOCKED');
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}catch{
 process.stderr.write('C2_157_MECHANISM_RANK_BLOCKED: incomplete or invalid sanitized data\n');
 process.exitCode=1;
}
