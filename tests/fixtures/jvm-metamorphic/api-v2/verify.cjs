'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const [primaryFile,defaultFile,jar]=process.argv.slice(2);
assert.equal(process.argv.length,5,'expected primary/default reports and the compiled fixture');
const primary=JSON.parse(fs.readFileSync(primaryFile,'utf8'));
const defaultReport=JSON.parse(fs.readFileSync(defaultFile,'utf8'));
const hash=crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex');
for(const r of [primary,defaultReport]){
 assert.equal(r.schema,'ultra-sentinel-generic-jvm-metamorphic/v1');
 assert.equal(r.artifactSha256,hash);
 for(const key of ['sourceAuthenticated','oracleVerified','novelFamilyVerified',
  'repairAuthorized','remoteWrites','mergeAllowed'])assert.equal(r[key],false,key);
 assert.ok(r.completedTriples>0);assert.ok(r.successfulInvocations>=6);
 for(const f of r.findings)assert.equal(f.status,'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE');
}
assert.equal(primary.classesInspected,2,'the Unicode single-package scope must remain bounded');
assert.equal(primary.methodsProbed,8);
assert.equal(primary.structuredMethodsExercised,5);
assert.equal(primary.instanceMethodsExercised,1);
assert.equal(primary.doubleMethodsExercised,3);
assert.equal(primary.unsupportedMethods,1,'explicit Kotlin covariance remains an abstention');
for(const name of ['cálculo','arrays','lists','collections','iterables','nonempty'])
 assert.ok(primary.findings.some(f=>f.class==='métricas.NumericApis'&&f.method.startsWith(name+'(')),name);
const instance=primary.findings.filter(f=>f.class==='métricas.NumericReceiver');
assert.ok(instance.length>0);
for(const f of instance){assert.deepEqual(f.constructor,['double']);assert.equal(f.constructorArguments.length,1);}
assert.ok(!primary.findings.some(f=>/^(monotonic|wildcard)\(/u.test(f.method)));
assert.equal(defaultReport.classesInspected,1,'default selection must exclude packaged/runtime classes');
assert.equal(defaultReport.methodsProbed,1);assert.equal(defaultReport.doubleMethodsExercised,1);
assert.ok(defaultReport.findings.some(f=>f.class==='DefaultApi'&&f.method==='defaultPeak(double;)double'));
console.log(JSON.stringify({schema:'ultra-sentinel-kotlin-api-v2-synthetic-coverage/v1',
 syntheticDevelopmentOnly:true,methodsExercised:primary.methodsProbed+defaultReport.methodsProbed,
 structuredMethods:primary.structuredMethodsExercised,instanceMethods:primary.instanceMethodsExercised,
 originalDefectsDiscovered:0,novelFamilyVerified:false,block27Allowed:false}));
