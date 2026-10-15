#!/usr/bin/env node
'use strict';
/**
 * C2 blind-review handoff: strictly offline, no token/network/PR code.
 * This output authenticates only SHA-pinned review identities. It does not
 * produce independent truth labels, certify model quality or permit merges.
 */
const fs=require('node:fs'),path=require('node:path');
const {PRS}=require('../packages/quality-gates/live-gamehub-c2-cohort.cjs');
const {createBlindReviewPacket}=
 require('../packages/quality-gates/c2-blind-review.cjs');

function readFrozenBlindPacket(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))
  throw Error('ABSOLUTE_C2_CAPTURE_FILE_REQUIRED');
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<2||stat.size>2*1024*1024)
  throw Error('UNSAFE_C2_CAPTURE_FILE');
 const capture=JSON.parse(fs.readFileSync(filename,'utf8'));
 if(capture?.captureStatus!=='CANDIDATE_SNAPSHOT_ONLY'||
  !Array.isArray(capture.prs)||capture.prs.length!==PRS.length||
  capture.prs.some((pr,i)=>pr!==PRS[i])||
  !Array.isArray(capture.samples)||capture.samples.length!==PRS.length||
  capture.samples.some(s=>
   s?.status!==undefined||
   s?.checks?.observedState!=='OBSERVED_SUCCESS_UNATTESTED'||
   s?.candidate?.coverage?.partial!==false
  ))throw Error('INCOMPLETE_C2_BLIND_SOURCE');
 return createBlindReviewPacket(capture);
}
if(require.main===module){
 try{
  const packet=readFrozenBlindPacket(process.argv[2]);
  process.stdout.write(JSON.stringify(packet)+'\n');
 }catch{
  // No exception bodies, PR code, labels, credentials or arbitrary input.
  process.stderr.write('C2_BLIND_PACKET_BLOCKED: INVALID_OR_INCOMPLETE_SOURCE\n');
  process.exitCode=2;
 }
}
module.exports={readFrozenBlindPacket};
