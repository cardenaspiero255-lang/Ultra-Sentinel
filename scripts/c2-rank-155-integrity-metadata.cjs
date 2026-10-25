#!/usr/bin/env node
'use strict';
// Source-free only: pinned PR identity and GitHub sanitized changed-file metadata.
const fs=require('node:fs'),path=require('node:path');
const {rankPool155}=require('../packages/quality-gates/c2-155-integrity-first-ranker.cjs');
const root=path.resolve(__dirname,'..');
const read=x=>JSON.parse(fs.readFileSync(path.join(root,'docs/quality',x+'.json'),'utf8'));
try{
 const args=process.argv.slice(2);
 if(args.length!==1||!path.isAbsolute(args[0]))throw Error('BAD_ARGS');
 const bytes=fs.readFileSync(args[0]);
 if(bytes.length>5000000||!bytes.toString('utf8').endsWith('\n'))throw Error('BAD_INPUT');
 const observations=bytes.toString('utf8').trimEnd().split('\n').map(line=>JSON.parse(line));
 const result=rankPool155({
  roster:read('C2-BULK-PROSPECTIVE-PR-METADATA-20261024'),
  eight:read('C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024'),
  dispositions:[
   read('C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024'),
   read('C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024'),
   read('C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024')],
  nextcloud:read('C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024'),
  excluded:[
   read('C2-NEXTCLOUD-TALK6946-AUTHENTICATED-DISPOSITION-20261024'),
   read('C2-NEXTCLOUD6945-POSTSOURCE-20261024')],
  observations
 });
 if(result.candidatesExamined!==155||result.sourcePreviouslyExposed!==14||
  result.newGoldLabels!==0||result.truthSealed!==false||result.originalOracleExecuted!==false||
  result.candidatePredictionsRead!==false)throw Error('INVALID_REPORT');
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}catch{
 process.stderr.write('C2_155_INTEGRITY_RANK_BLOCKED\n');process.exitCode=1;
}
