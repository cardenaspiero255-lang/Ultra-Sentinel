'use strict';
// Case-specific interventions for a controlled three-source investigation.
// Blob consistency here is not Git membership, execution or causal evidence.
const {createHash}=require('node:crypto');
const {snapshotRecord,snapshotArray}=require('../investigation/plain-kotlin-payload.cjs');
const SHA=/^[a-f0-9]{40}$/;
const PATHS=Object.freeze([
 'app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt',
 'app/src/main/java/com/cardenaspiero255/gamehubultra/platform/RuntimeDiagnostics.kt',
 'app/src/main/java/com/cardenaspiero255/gamehubultra/session/SessionCoachTelemetryMapper.kt'
]);
const OLD=Object.freeze([
 '((level.toLong() * 100L) / scale).toInt().coerceIn(0, 100)',
 'level = it.getIntExtra(BatteryManager.EXTRA_LEVEL, -1),',
 'batteryPercent = diagnostics.battery.percent,'
]);
const NEW=Object.freeze([
 '((level.toLong() * 100L) / scale).coerceIn(0L, 100L).toInt()',
 'level = it.getIntExtra(BatteryManager.EXTRA_LEVEL, -1).let { rawLevel ->\n'+
 '                    val rawScale = it.getIntExtra(BatteryManager.EXTRA_SCALE, -1)\n'+
 '                    if (rawLevel >= 0 && rawScale > 0) minOf(rawLevel, rawScale) else rawLevel\n'+
 '                },',
 'batteryPercent = diagnostics.battery.percent?.coerceIn(0, 100),'
]);
function blob(source){const bytes=Buffer.from(source,'utf8');return createHash('sha1')
 .update(`blob ${bytes.length}\0`).update(bytes).digest('hex');}
function blocked(){return Object.freeze({status:'BLOCKED_TELEMETRY_INTERVENTIONS',
 originalSourceAuthenticated:false,causalityVerified:false,remoteWrites:false,mergeAllowed:false});}
function prepareTelemetryInterventions(input){
 try{
  const opts=snapshotRecord(input,['expectedHeadSha','files']);
  if(typeof opts.expectedHeadSha!=='string'||!SHA.test(opts.expectedHeadSha))return blocked();
  const rows=snapshotArray(opts.files,['path','source','expectedBlobSha'],3);
  if(rows.length!==3)return blocked();
  const files=[];
  for(let i=0;i<3;i++){
   const row=rows[i];
   if(row.path!==PATHS[i]||typeof row.source!=='string'||row.source.length<10||
    Buffer.byteLength(row.source,'utf8')>160000||row.source.includes('\0')||
    row.source.includes('\r')||!row.source.endsWith('\n')||
    typeof row.expectedBlobSha!=='string'||!SHA.test(row.expectedBlobSha)||
    blob(row.source)!==row.expectedBlobSha||row.source.split(OLD[i]).length-1!==(i===2?2:1))
    return blocked();
   const candidate=row.source.replace(OLD[i],NEW[i]);
   files.push(Object.freeze({path:row.path,beforeBlobSha:row.expectedBlobSha,
    afterBlobSha:blob(candidate),candidate}));
  }
  return Object.freeze({status:'LOCAL_INTERVENTIONS_REQUIRE_REAL_KOTLIN_ORACLE',
   files:Object.freeze(files),originalSourceAuthenticated:false,
   causalityVerified:false,remoteWrites:false,mergeAllowed:false});
 }catch{return blocked();}
}
module.exports=Object.freeze({prepareTelemetryInterventions});
