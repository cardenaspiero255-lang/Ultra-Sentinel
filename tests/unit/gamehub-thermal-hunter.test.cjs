'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {inspectFrozenGameHubThermal}=require('../../packages/recovery/gamehub-pr151-source-hunter.cjs');
const PATH='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt';
const SHA='9ad983576c16c6c34d59283979d83c69ede50dce';
const bad=[
 'package com.cardenaspiero255.gamehubultra.domain',
 'object AiSessionCoach {',
 'private const val HIGH_THERMAL_HEADROOM=0.80f',
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
 return inspectFrozenGameHubThermal({source,path,sourceSha:SHA,experimentalFixture:true});
}
test('auxiliary Hunter detects precisely three nonfinite predicates, without changing frozen Core rules',()=>{
 const out=scan(bad);
 assert.equal(out.status,'SOURCE_HYPOTHESIS_NOT_CAUSAL_TRUTH');
 assert.deepEqual(out.lines,[4,6,9]);
 assert.equal(out.frozenCoreModified,false);
 assert.equal(out.canAuthorizeRepair,false);
});
test('corrected finiteness checks, unrelated same-named files, and missing constant are clean',()=>{
 const fixed=bad.replace('!it.isNaN()','it.isFinite()')
   .replace('!sample.thermalHeadroom.isNaN()','sample.thermalHeadroom.isFinite()')
   .replace('!current.thermalHeadroom.isNaN()','current.thermalHeadroom.isFinite()');
 assert.deepEqual(scan(fixed).lines,[]);
 assert.throws(()=>scan(bad,'app/src/main/java/Other.kt'),/GAMEHUB_HUNTER_REJECTED/);
 assert.deepEqual(scan(bad.replace('HIGH_THERMAL_HEADROOM=0.80f','OTHER=0.80f')).lines,[]);
});
test('comments, strings and fake continuation lines cannot create Hunter evidence',()=>{
 const altered=bad.replace('!sample.thermalHeadroom.isNaN()','// !sample.thermalHeadroom.isNaN()')
  .replace('!current.thermalHeadroom.isNaN()','val s = "!current.thermalHeadroom.isNaN()"');
 assert.deepEqual(scan(altered).lines,[4]);
});
test('production mode rejects any source without matching original immutable Git blob',()=>{
 assert.throws(()=>inspectFrozenGameHubThermal({source:bad,path:PATH,sourceSha:SHA}),/GAMEHUB_HUNTER_REJECTED/);
 assert.throws(()=>inspectFrozenGameHubThermal({source:bad,path:PATH,sourceSha:'b'.repeat(40),experimentalFixture:true}),/GAMEHUB_HUNTER_REJECTED/);
});
