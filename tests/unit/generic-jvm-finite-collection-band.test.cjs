'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');

test('finite-size collection band probes means requiring two or more elements without hiding earlier abstentions', () => {
 const temp=fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-finite-collection-'));
 try {
  const classes=path.join(temp,'classes'),probe=path.join(temp,'probe');
  fs.mkdirSync(classes);fs.mkdirSync(probe);
  const source=path.join(temp,'Collections.java'),jar=path.join(temp,'original.jar');
  fs.writeFileSync(source, [
   'package sample.finitecollection;',
   'public final class Collections {',
   ' public static double mean(java.util.List<Integer> xs) {',
   '  if(xs.size()<2) return Double.NaN;',
   '  double sum=0; for(int x:xs) sum+=x; return sum/xs.size();',
   ' }',
   ' public static double turning(java.util.List<Integer> xs) {',
   '  if(xs.size()<2) return Double.NaN;',
   '  return xs.size()==3 ? 11.0 : 0.0;',
   ' }',
   ' public static double neverFinite(java.util.List<Integer> xs) { return Double.NaN; }',
   '}'
  ].join('\n'));
  const run=(cmd,args)=>{
   const r=spawnSync(cmd,args,{encoding:'utf8',timeout:30000,maxBuffer:1048576});
   assert.ifError(r.error); assert.equal(r.status,0,r.stderr); return r.stdout;
  };
  run('javac',['-d',classes,source]);
  run('jar',['cf',jar,'-C',classes,'.']);
  run('javac',['-d',probe,path.join(root,'packages/family-hunter/GenericJvmMetamorphicProbe.java')]);
  const cmd=['-Xmx128m','-cp',probe,'GenericJvmMetamorphicProbe',jar,'sample.finitecollection'];
  const raw=run('java',cmd),report=JSON.parse(raw);
  assert.equal(report.methodsProbed,2,'both finite on 2+ elements, but neither on old 0/1-leading bands');
  assert.equal(report.structuredMethodsExercised,2);
  assert.ok(report.completedTriples>=2);
  const finding=report.findings.find(f=>f.method?.startsWith('turning('));
  assert.ok(finding,'an independently unverified 2/3/4 turning point is admissible');
  assert.deepEqual(finding.inputs,[
   'size=2;values=0..size-1','size=3;values=0..size-1','size=4;values=0..size-1'
  ]);
  assert.deepEqual(finding.observed,['0.0','11.0','0.0']);
  assert.equal(finding.status,'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE');
  assert.equal(report.findings.filter(f=>f.method?.startsWith('mean(')).length,0);
  assert.equal(report.findings.filter(f=>f.method?.startsWith('neverFinite(')).length,0);
  assert.ok(report.abstainedProbes>=2,'nonfinite 0/1 bands remain explicit abstentions');
  assert.equal(report.oracleVerified,false);
  assert.equal(report.remoteWrites,false);
  assert.equal(report.mergeAllowed,false);
  assert.equal(run('java',cmd),raw,'replay must stay byte-for-byte deterministic');
 } finally { fs.rmSync(temp,{recursive:true,force:true}); }
});
