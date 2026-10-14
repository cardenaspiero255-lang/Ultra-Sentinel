'use strict';
// Offline read-only parity evaluation of a separately labelled JSON campaign.
// No GitHub credentials, network calls, dynamic execution, PR writes or merges.
const fs=require('node:fs'),path=require('node:path');
const {evaluateParityCampaign}=require('../packages/quality-gates/shadow-parity-metrics.cjs');
function evaluateFile(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('ABSOLUTE_CAMPAIGN_FILE_REQUIRED');
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2*1024*1024||stat.size<2)
  throw Error('INVALID_CAMPAIGN_FILE');
 const content=fs.readFileSync(filename,'utf8');
 const input=JSON.parse(content);
 return evaluateParityCampaign(input);
}
if(require.main===module){
 try{
  const result=evaluateFile(process.argv[2]);
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.verdict!=='EVALUATION_ONLY_NOT_CERTIFIED')process.exitCode=2;
 }catch(error){
  const allowed=new Set(['ABSOLUTE_CAMPAIGN_FILE_REQUIRED','INVALID_CAMPAIGN_FILE',
   'INVALID_CAMPAIGN','UNTRUSTED_SOURCE_SAMPLE','MISSING_LABEL_CORPUS',
   'INVALID_LABEL','INVALID_FINDING_IDENTITY','DUPLICATE_FINDING_IDENTITY',
   'DUPLICATE_LABEL','UNLABELLED_FINDING','UNBALANCED_OR_INCOMPLETE_LABELS',
   'DUPLICATE_CAMPAIGN_PR','UNBOUNDED_FINDINGS']);
  process.stderr.write('PARITY_EVALUATION_BLOCKED: '+
   (allowed.has(error?.message)?error.message:'INVALID_INPUT')+'\n');
  process.exitCode=1;
 }
}
module.exports={evaluateFile};
