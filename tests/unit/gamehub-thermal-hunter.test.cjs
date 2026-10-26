'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const PATH='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt';
const SHA='a'.repeat(40);
const bad=[
 'package com.cardenaspiero255.gamehubultra.domain',
 'object AiSessionCoach {',
 'private const val HIGH_THERMAL_HEADROOM=0.8f',
 'val highThermalHeadroom = snapshot.thermalHeadroom?.let { !it.isNaN() && it >= HIGH_THERMAL_HEADROOM } == true',
 'sample.thermalHeadroom != null &&',
 ' !sample.thermalHeadroom.isNaN() &&',
 ' sample.thermalHeadroom >= HIGH_THERMAL_HEADROOM',
 'current.thermalHeadroom != null &&',
 ' !current.thermalHeadroom.isNaN() &&',
 ' current.thermalHeadroom >= HIGH_THERMAL_HEADROOM',
 '}',
 ''].join('\n');
function scan(source,path=PATH){
 const rows=source.trimEnd().split('\n');
 const patch='@@ -0,0 +1,'+rows.length+' @@\n'+rows.map(x=>'+'+x).join('\n')+'\n';
 return analyze([{filename:path,status:'added',changes:rows.length,
  additions:rows.length,deletions:0,patch,fullSource:source}],{sha:SHA});
}
test('Hunter identifies nonfinite thermal headroom on each exact GameHub original predicate',()=>{
 const out=scan(bad);
 assert.equal(out.coverage.partial,false);
 assert.deepEqual(out.findings.filter(x=>x.rule==='NONFINITE_THERMAL_HEADROOM').map(x=>x.line),[4,6,9]);
});
test('Hunter does not flag corrected finite checks or NaN checks unrelated to thermal metrics',()=>{
 const fixed=bad.replaceAll('!it.isNaN()','it.isFinite()')
  .replaceAll('!sample.thermalHeadroom.isNaN()','sample.thermalHeadroom.isFinite()')
  .replaceAll('!current.thermalHeadroom.isNaN()','current.thermalHeadroom.isFinite()');
 assert.equal(scan(fixed).findings.filter(x=>x.rule==='NONFINITE_THERMAL_HEADROOM').length,0);
 const unrelated=bad.replace('HIGH_THERMAL_HEADROOM=0.8f','OTHER=0.8f');
 assert.equal(scan(unrelated).findings.filter(x=>x.rule==='NONFINITE_THERMAL_HEADROOM').length,0);
});
test('Hunter rejects quotes, comments and files not scoped to the real thermal component',()=>{
 const altered=bad.replace('!sample.thermalHeadroom.isNaN()','// !sample.thermalHeadroom.isNaN()')
   .replace('!current.thermalHeadroom.isNaN()','val example = "!current.thermalHeadroom.isNaN()"');
 assert.deepEqual(scan(altered).findings.filter(x=>x.rule==='NONFINITE_THERMAL_HEADROOM').map(x=>x.line),[4]);
 assert.equal(scan(bad,'app/src/main/java/com/example/Other.kt').findings.some(x=>x.rule==='NONFINITE_THERMAL_HEADROOM'),false);
});
test('unverified Kotlin full-source cannot create an actionable thermal finding',()=>{
 const out=scan(bad.slice(0,-2)+'// different\n');
 assert.equal(out.findings.some(x=>x.rule==='NONFINITE_THERMAL_HEADROOM'),false);
});
