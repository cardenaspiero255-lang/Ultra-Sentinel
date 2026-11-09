'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {prepareTelemetryInterventions}=require('../../packages/quality-gates/phase2-telemetry-counterfactuals.cjs');
const paths=[
 'app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt',
 'app/src/main/java/com/cardenaspiero255/gamehubultra/platform/RuntimeDiagnostics.kt',
 'app/src/main/java/com/cardenaspiero255/gamehubultra/session/SessionCoachTelemetryMapper.kt'
];
const original=[
 'package sample\nreturn sanitizePercentage(((level.toLong() * 100L) / scale).toInt().coerceIn(0, 100))\n',
 'package sample\nlevel = it.getIntExtra(BatteryManager.EXTRA_LEVEL, -1),\n',
 'package sample\nbatteryPercent = diagnostics.battery.percent,\nbatteryPercent = diagnostics.battery.percent,\n'
];
const hash=s=>{const b=Buffer.from(s);return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');};
const fixture=()=>({expectedHeadSha:'a'.repeat(40),files:paths.map((path,i)=>
 ({path,source:original[i],expectedBlobSha:hash(original[i])}))});

test('three independent interventions retain exact original blob bindings and never grant authority',()=>{
 const result=prepareTelemetryInterventions(fixture());
 assert.equal(result.status,'LOCAL_INTERVENTIONS_REQUIRE_REAL_KOTLIN_ORACLE');
 assert.equal(result.files.length,3);
 assert.deepEqual(result.files.map(f=>f.path),paths);
 for(let i=0;i<3;i++){
  assert.equal(result.files[i].beforeBlobSha,hash(original[i]));
  assert.equal(result.files[i].afterBlobSha,hash(result.files[i].candidate));
  assert.notEqual(result.files[i].afterBlobSha,result.files[i].beforeBlobSha);
 }
 assert.equal(result.causalityVerified,false);
 assert.equal(result.originalSourceAuthenticated,false);
 assert.equal(result.mergeAllowed,false);
});

test('changed, missing, duplicate or incorrectly bound original source blocks every candidate',()=>{
 for(const change of [
  x=>{x.files[0].source+='// changed\n';},
  x=>{x.files[0].expectedBlobSha='f'.repeat(40);},
  x=>{x.files[0].source='package sample\nno match\n';x.files[0].expectedBlobSha=hash(x.files[0].source);},
  x=>{x.files[1].path=x.files[0].path;},
  x=>{x.files.pop();},
  x=>{x.expectedHeadSha='b'.repeat(39);},
  x=>{x.files[2].source+=original[2];x.files[2].expectedBlobSha=hash(x.files[2].source);}
 ]){
  const input=fixture();change(input);
  const result=prepareTelemetryInterventions(input);
  assert.match(result.status,/^BLOCKED_/);
  assert.equal(result.mergeAllowed,false);
  assert.equal(Object.hasOwn(result,'files'),false);
 }
});

test('getters and proxies are rejected without invoking attacker code',()=>{
 let touched=0;const input=fixture();
 Object.defineProperty(input.files[0],'source',{get(){touched++;throw Error('executed');},enumerable:true});
 assert.match(prepareTelemetryInterventions(input).status,/^BLOCKED_/);
 assert.match(prepareTelemetryInterventions(new Proxy(fixture(),{ownKeys(){touched++;throw Error('executed');}})).status,/^BLOCKED_/);
 assert.equal(touched,0);
});
