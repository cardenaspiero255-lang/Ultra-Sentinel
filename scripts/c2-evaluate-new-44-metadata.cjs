#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {assessNewExternalBatch}=require('../packages/quality-gates/c2-new-44-sourcefree-gate.cjs');
const quality=path.resolve(__dirname,'../docs/quality');
const read=x=>JSON.parse(fs.readFileSync(path.join(quality,x+'.json'),'utf8'));
try{
 const args=process.argv.slice(2);
 if(args.length!==1||!path.isAbsolute(args[0]))throw Error('BAD_ARGS');
 const stat=fs.lstatSync(args[0]);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>1_500_000)
  throw Error('BAD_INPUT');
 const data=fs.readFileSync(args[0],'utf8');
 if(!data.endsWith('\n'))throw Error('INCOMPLETE');
 const observations=data.trimEnd().split('\n').map(s=>JSON.parse(s));
 const report=assessNewExternalBatch(
  read('C2-44-NEW-EXTERNAL-PRESEAL-20261024'),
  {roster:read('C2-BULK-PROSPECTIVE-PR-METADATA-20261024'),
   eight:read('C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024'),
   dispositions:[
    read('C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024'),
    read('C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024'),
    read('C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024')],
   nextcloud:read('C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024'),
   excluded:[
    read('C2-NEXTCLOUD-TALK6946-AUTHENTICATED-DISPOSITION-20261024'),
    read('C2-NEXTCLOUD6945-POSTSOURCE-20261024')]},
  observations);
 if(report.newGoldLabels!==0||report.sourceReadAuthorized!==false||
  report.candidatesExamined!==44||report.totalRegistered!==213)throw Error('INVALID');
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}catch{
 process.stderr.write('C2_44_NEW_EXTERNAL_BLOCKED: invalid sanitized metadata\n');
 process.exitCode=1;
}
