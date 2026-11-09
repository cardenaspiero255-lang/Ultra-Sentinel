'use strict';
// Called only after the enclosing runner verifies the checkout and Git blobs.
const fs=require('node:fs'),path=require('node:path');
const [root,sentinel,work,head]=process.argv.slice(2);
const paths=[
 'app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt',
 'app/src/main/java/com/cardenaspiero255/gamehubultra/platform/RuntimeDiagnostics.kt',
 'app/src/main/java/com/cardenaspiero255/gamehubultra/session/SessionCoachTelemetryMapper.kt'
];
const expected=['8b9e934ca90852d77ddab274b60fd8dce4f4a2ca',
 '61ab93d2f4e6deb7aaf321b7b18583de2acc5699','d2dc3a59470efcd25e0c1a05d1ca2726ee20371d'];
const files=paths.map((p,i)=>({path:p,source:fs.readFileSync(path.join(root,p),'utf8'),expectedBlobSha:expected[i]}));
const {prepareTelemetryInterventions}=require(path.join(sentinel,'packages/quality-gates/phase2-telemetry-counterfactuals.cjs'));
const result=prepareTelemetryInterventions({expectedHeadSha:head,files});
if(result.status!=='LOCAL_INTERVENTIONS_REQUIRE_REAL_KOTLIN_ORACLE'||
 result.originalSourceAuthenticated!==false||result.causalityVerified!==false||result.mergeAllowed!==false)
 throw Error('INTERVENTION_PREPARATION_BLOCKED');
for(let i=0;i<3;i++){
 fs.writeFileSync(path.join(work,`original-${i}.kt`),files[i].source,{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(work,`candidate-${i}.kt`),result.files[i].candidate,{flag:'wx',mode:0o600});
}
const old='((level.toLong() * 100L) / scale).toInt().coerceIn(0, 100)';
if(files[0].source.split(old).length!==2)throw Error('UNSAFE_CONTROL_NOT_UNIQUE');
fs.writeFileSync(path.join(work,'unsafe.kt'),files[0].source.replace(old,'0'),{flag:'wx',mode:0o600});
fs.writeFileSync(path.join(work,'interventions.json'),JSON.stringify({head,files:result.files.map(f=>({
 path:f.path,beforeBlobSha:f.beforeBlobSha,afterBlobSha:f.afterBlobSha
}))}),{flag:'wx',mode:0o600});
