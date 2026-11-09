'use strict';
const fs=require('node:fs'),path=require('node:path');
const [root,claimsFile]=process.argv.slice(2);
const claims=JSON.parse(fs.readFileSync(claimsFile,'utf8'));
if(!Array.isArray(claims)||claims.length!==1)throw Error('SEMANTIC_CALL_COUNT');
const c=claims[0];
const caller=path.join(root,'app/src/main/java/com/cardenaspiero255/gamehubultra/platform/RuntimeDiagnostics.kt');
const target=path.join(root,'app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt');
if(c.calledName!=='fromBroadcast'||c.kind!=='FUNCTION'||c.dispatch!=='STATIC'||
 c.origin!=='SOURCE_UNAUTHENTICATED'||typeof c.identity!=='string'||
 !c.identity.includes('BatteryTelemetry.fromBroadcast')||c.callSite?.path!==caller||
 c.declarationSite?.path!==target||
 c.callSite?.gitBlobSha!=='61ab93d2f4e6deb7aaf321b7b18583de2acc5699'||
 c.declarationSite?.gitBlobSha!=='8b9e934ca90852d77ddab274b60fd8dce4f4a2ca')
 throw Error('SEMANTIC_CALL_UNRESOLVED_OR_UNBOUND');
// This helper receives a claim and cannot authenticate its compiler origin.
console.log('SEMANTIC_CLAIM_MATCHES_BLOBS_REQUIRES_TRUSTED_RUNNER');
