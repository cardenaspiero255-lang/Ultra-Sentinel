'use strict';
// This is an advisory bridge, not a source authenticator or a Kotlin oracle.
// The parent isolated reproduce.sh verifies Git commit, blobs and checkout.
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const [repo,sentinel,work,head]=process.argv.slice(2);
const PIN='e4ca122422f1cb591d407db3fb21fb00fd78b022';
const REL='app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt';
const SOURCE='8b9e934ca90852d77ddab274b60fd8dce4f4a2ca';
const {scanKotlinNumericRisks}=require(path.join(sentinel,'packages/family-hunter/phase2-numeric-risk-hunter.cjs'));
function hash(source){const b=Buffer.from(source);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');}
if(head!==PIN)throw Error('NUMERIC_PIN_MISMATCH');
const originalPath=path.join(repo,REL),candidatePath=path.join(work,'candidate-0.kt');
for(const p of [originalPath,candidatePath]){const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink())throw Error('NONREGULAR_NUMERIC_SOURCE');}
const source=fs.readFileSync(originalPath,'utf8'),candidate=fs.readFileSync(candidatePath,'utf8');
if(hash(source)!==SOURCE)throw Error('NUMERIC_ORIGINAL_BLOB_MISMATCH');
const original=scanKotlinNumericRisks({expectedCommitSha:head,files:[{path:REL,source,expectedBlobSha:SOURCE}]});
const repaired=scanKotlinNumericRisks({expectedCommitSha:head,files:[{path:REL,source:candidate,expectedBlobSha:hash(candidate)}]});
if(original.status!=='NUMERIC_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE'||
 original.findings.length!==1||original.findings[0].rule!=='WIDE_NUMERIC_NARROWED_BEFORE_CLAMP'||
 repaired.status!=='NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED'||repaired.findings.length!==0||
 original.sourceRepositoryAuthenticated!==false||original.originalFunctionalOracleVerified!==false||
 repaired.mergeAllowed!==false)throw Error('NUMERIC_ADVISORY_BOUNDARY_FAILED');
console.log('PINNED_NUMERIC_SOURCE_ADVISORY_NOT_ORACLE');
