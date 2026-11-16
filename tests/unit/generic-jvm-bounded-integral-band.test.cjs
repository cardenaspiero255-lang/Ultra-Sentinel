'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');

test('bounded integral fallback probes safe stable triplets after high-value abstention',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-bounded-int-'));
 try {
  const original=path.join(temp,'original'),probe=path.join(temp,'probe'),jar=path.join(temp,'original.jar');
  fs.mkdirSync(original);fs.mkdirSync(probe);
  const source=path.join(temp,'Bounded.java');
  fs.writeFileSync(source,[
   'package sample.integral;',
   'public final class Bounded {',
   ' private static int calls;',
   ' public static int intLimited(int n) { if(n>10) throw new IllegalArgumentException("out of contract"); return n==1?7:0; }',
   ' public static long longLimited(long n) { if(n>10) throw new IllegalArgumentException("out of contract"); return n==1?7:0; }',
   ' public static int regular(int n) { return n; }',
   ' public static int alwaysThrows(int n) { throw new IllegalArgumentException(); }',
   ' public static int stateful(int n) { return ++calls; }',
   '}'].join('\n'));
  const run=(cmd,args)=>{
   const r=spawnSync(cmd,args,{encoding:'utf8',timeout:30000,maxBuffer:1048576});
   assert.ifError(r.error);assert.equal(r.status,0,r.stderr);return r.stdout;
  };
  run('javac',['-d',original,source]);
  run('jar',['cf',jar,'-C',original,'.']);
  run('javac',['-d',probe,path.join(root,'packages/family-hunter/GenericJvmMetamorphicProbe.java')]);
  const args=['-Xmx128m','-cp',probe,'GenericJvmMetamorphicProbe',jar,'sample.integral'];
  const raw=run('java',args),report=JSON.parse(raw);
  assert.equal(report.methodsProbed,3,'safe 0/1/2 band must exercise intLimited, longLimited and regular');
  assert.ok(report.completedTriples>=3);
  for(const name of ['intLimited','longLimited']){
   const f=report.findings.find(f=>f.method?.startsWith(name+'('));
   assert.ok(f, name+' should emit an advisory nonmonotonic hypothesis');
   assert.deepEqual(f.inputs,['0','1','2']);
   assert.deepEqual(f.observed,['0','7','0']);
   assert.equal(f.status,'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE');
  }
  for(const name of ['alwaysThrows','stateful','regular'])
   assert.equal(report.findings.filter(f=>f.method?.startsWith(name+'(')).length,0);
  assert.ok(report.abstainedProbes>=2,'unsafe high values, exceptions and mutable state must abstain');
  assert.equal(report.oracleVerified,false);
  assert.equal(report.remoteWrites,false);
  assert.equal(report.mergeAllowed,false);
  assert.equal(run('java',args),raw,'bounded input replay must be byte-for-byte deterministic');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
