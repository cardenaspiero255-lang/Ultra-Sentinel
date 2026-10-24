#!/usr/bin/env node
'use strict';
/*
 * Authorized GitHub Actions runner supplies ONLY SHA-pinned PR identity and
 * sanitized file/path metadata as newline-delimited JSON. This offline CLI
 * never fetches original code, parses a PR title or invokes Sentinel Core.
 */
const fs=require('node:fs'),path=require('node:path');
const {rankAll}=require('../packages/quality-gates/c2-158-rule-family-ranker.cjs');
const root=path.resolve(__dirname,'..');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,'docs/quality',p),'utf8'));
function main(args){
 if(args.length!==1||!path.isAbsolute(args[0]))throw Error('C2_158_RANKING_BLOCKED');
 const input=fs.readFileSync(args[0],'utf8');
 if(Buffer.byteLength(input)>5000000||!input.endsWith('\n'))throw Error('C2_158_RANKING_BLOCKED');
 const observations=input.trimEnd().split('\n').map(line=>JSON.parse(line));
 const report=rankAll({
  roster:json('C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json'),
  eight:json('C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json'),
  dispositions:[
   json('C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json'),
   json('C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json'),
   json('C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024.json')
  ],observations
 });
 if(report.candidatesExamined!==158||report.newGoldLabels!==0||
    report.truthSealed!==false||report.candidatePredictionsRead!==false)
  throw Error('C2_158_RANKING_BLOCKED');
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}
try{main(process.argv.slice(2));}catch(err){
 process.stderr.write('C2_158_RANKING_BLOCKED: source-free metadata ranking refused\n');
 process.exitCode=1;
}
