'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const r=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(r.methodsProbed,4);assert.equal(r.instanceMethodsExercised,3);
assert.equal(r.doubleMethodsExercised,1);assert.equal(r.floatMethodsExercised,1);
assert.ok(r.findings.some(f=>f.class==='sample.admission.DefaultOwner$Companion'&&
 f.method==='positive(double;)double'&&JSON.stringify(f.inputs)==='["1.0","2.0","3.0"]'));
assert.ok(r.findings.some(f=>f.class==='sample.admission.NamedOwner$Ops'&&
 f.method==='signed(long;)long'&&JSON.stringify(f.inputs)==='["-1","0","1"]'));
assert.ok(!r.findings.some(f=>f.method?.startsWith('logarithm(')||f.method?.startsWith('monotonic(')));
assert.equal(r.oracleVerified,false);assert.equal(r.novelFamilyVerified,false);
console.log(JSON.stringify({schema:'ultra-sentinel-kotlin-admission-synthetic/v1',
 methodsProbed:r.methodsProbed,instanceMethodsExercised:r.instanceMethodsExercised,
 syntheticDevelopmentOnly:true,originalDefectsDiscovered:0,block27Allowed:false}));
