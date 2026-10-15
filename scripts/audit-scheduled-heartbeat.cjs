#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {auditScheduledHeartbeat}=require('../packages/operations/scheduled-heartbeat-audit.cjs');
if(process.argv.length<4||process.argv.length>5){
 process.stderr.write('Usage: node scripts/audit-scheduled-heartbeat.cjs <actions-runs.json> <main-commit-sha> [utc-as-of]\n');
 process.exitCode=2;
}else{
 try{
  const raw=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const runs=Array.isArray(raw)?raw:raw.workflow_runs;
  const result=auditScheduledHeartbeat({runs,expectedSha:process.argv[3],
   now:process.argv[4]||new Date().toISOString().slice(0,19)+'Z'});
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.verdict!=='PUNCTUALITY_OBSERVED_NOT_24X7')process.exitCode=2;
 }catch{
  process.stderr.write('SCHEDULE_AUDIT_BLOCKED: INVALID_SCHEDULE_EVIDENCE\n');
  process.exitCode=2;
 }
}
