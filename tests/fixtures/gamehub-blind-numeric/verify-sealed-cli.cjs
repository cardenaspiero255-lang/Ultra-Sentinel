'use strict';
// Filesystem bridge for the independent original JVM experiment; the
// target and expected blob are declared only AFTER the blind worker seals.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {validate}=require('./verify-sealed.cjs');
const PIN='e4ca122422f1cb591d407db3fb21fb00fd78b022';
const REL='app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt';
const [root,reportPath,head]=process.argv.slice(2);
if(process.argv.length!==5||head!==PIN)throw Error('BAD_PINNED_RECEIPT_ARGS');
const originalPath=path.join(root,REL);
function readFile(p,max){
 const st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||st.size>max)throw Error('UNSAFE_RECEIPT_FILE');
 return fs.readFileSync(p);
}
const bytes=readFile(originalPath,60000);
const originalBlobSha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const report=JSON.parse(readFile(reportPath,150000).toString('utf8'));
const result=validate({expectedHeadSha:head,originalBlobSha,report});
if(result.status!=='SEALED_NUMERIC_FINDING_REQUIRES_INDEPENDENT_ORACLE')
 throw Error('BAD_SEALED_NUMERIC_REPORT:'+result.status);
console.log('BLIND_NUMERIC_SOURCE_SELECTION_NOT_NEW_FAMILY');
