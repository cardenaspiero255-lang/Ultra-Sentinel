'use strict';
// Run only after the enclosing runner has checked the original Git commit,
// clean tree, pinned blobs, compiler version, and sealed blind receipt.
// This bridge cannot authenticate those operations by itself.
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const [root,sentinel,work,head,reportPath]=process.argv.slice(2);
if(process.argv.length!==7||head!=='e4ca122422f1cb591d407db3fb21fb00fd78b022')
 throw Error('NUMERIC_LINK_PIN_OR_ARGS');
const REL='app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt';
const SHA='8b9e934ca90852d77ddab274b60fd8dce4f4a2ca';
const originalPath=path.join(root,REL);
const {linkSealedNumericAndCompilerClaims}=require(path.join(sentinel,
 'packages/family-hunter/phase2-numeric-sealed-semantic-link.cjs'));
function readRegular(file,max){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size>max)throw Error('NUMERIC_LINK_UNSAFE_FILE');
 return fs.readFileSync(file);
}
const bytes=readRegular(originalPath,60000);
const digest=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
if(digest!==SHA)throw Error('NUMERIC_LINK_ORIGINAL_BLOB_MISMATCH');
const blindReport=JSON.parse(readRegular(reportPath,150000).toString('utf8'));
const semanticReport=JSON.parse(readRegular(path.join(work,'numeric-original.json'),150000).toString('utf8'));
const check=linkSealedNumericAndCompilerClaims({
 relativePath:REL,absolutePath:originalPath,sourceBlobSha:digest,
 blindReport,semanticReport
});
if(!['BLIND_NUMERIC_TYPED_LINK_ADVISORY','BLIND_NUMERIC_TYPED_LINK_PARTIAL_ADVISORY'].includes(check.status)||
 check.matchedClaims!==1||check.compilerEvidenceAuthenticated!==false||
 check.sourceRepositoryAuthenticated!==false||check.originalOracleVerified!==false||
 check.causalityVerified!==false||check.generalizationVerified!==false||
 check.remoteWrites!==false||check.mergeAllowed!==false)
 throw Error('NUMERIC_LINK_EVIDENCE_MISMATCH:'+check.status);
console.log('SEALED_NUMERIC_COMPILER_LINE_RULE_LINKED_ADVISORY_NOT_ORACLE');
