'use strict';
// Validation after the enclosing isolated runner verified Git HEAD, source
// blobs and the pinned compiler. This helper independently grants no trust.
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {verifyNumericSemanticPair}=require(path.join(process.argv[3]||'', 'packages/family-hunter/phase2-numeric-semantic-evidence.cjs'));
const [root,sentinel,work,head]=process.argv.slice(2);
const PIN='e4ca122422f1cb591d407db3fb21fb00fd78b022';
const REL='app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt';
const SOURCE='8b9e934ca90852d77ddab274b60fd8dce4f4a2ca';
if(head!==PIN)throw Error('SEMANTIC_HEAD_MISMATCH');
function readRegular(p,max=102400){
 const st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||st.size>max)throw Error('NONREGULAR_SEMANTIC_INPUT');
 return fs.readFileSync(p);
}
function sha(bytes){return createHash('sha1').update('blob '+bytes.length+'\\0').update(bytes).digest('hex');}
const originalPath=path.join(root,REL),candidatePath=path.join(work,'candidate-0.kt');
const originalBlobSha=sha(readRegular(originalPath,60000));
const candidateBlobSha=sha(readRegular(candidatePath,60000));
if(originalBlobSha!==SOURCE)throw Error('SEMANTIC_ORIGINAL_BLOB_MISMATCH');
const originalReport=JSON.parse(readRegular(path.join(work,'numeric-original.json')).toString('utf8'));
const candidateReport=JSON.parse(readRegular(path.join(work,'numeric-candidate.json')).toString('utf8'));
const verdict=verifyNumericSemanticPair({
 originalPath,originalBlobSha,candidatePath,candidateBlobSha,originalReport,candidateReport
});
if(verdict.status!=='TYPE_EVIDENCE_BOUND_REQUIRES_TRUSTED_KOTLIN_RUNNER'||
 verdict.matchingOriginalClaims!==1||
 originalReport.claims[0].rule!=='WIDE_NUMERIC_NARROWED_BEFORE_CLAMP'||
 verdict.compilerEvidenceAuthenticated!==false||verdict.independentOriginalOracleVerified!==false||
 verdict.causalityVerified!==false||verdict.remoteWrites!==false||verdict.mergeAllowed!==false)
 throw Error('SEMANTIC_NUMERIC_EVIDENCE_REJECTED:'+verdict.status);
console.log('PINNED_KOTLIN_NUMERIC_TYPES_BOUND_NOT_ORACLE');
