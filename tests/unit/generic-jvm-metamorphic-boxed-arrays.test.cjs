'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
test('Kotlin Array<Int>/Array<Double>/Array<Float> JVM signatures are exercised, unsupported erased arrays abstain',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-boxed-arrays-'));
 try {
  const source=path.join(dir,'Boxed.java'),classes=path.join(dir,'classes'),probe=path.join(dir,'probe'),jar=path.join(dir,'original.jar');
  fs.mkdirSync(classes);fs.mkdirSync(probe);
  fs.writeFileSync(source,`package sample.boxed;
import java.util.*;
public final class Boxed {
 public static int boxedInt(Integer[] values){int n=0;for(int x:values)n+=x;return n;}
 public static double boxedDouble(Double[] values){double n=0;for(double x:values)n+=x;return n;}
 public static float boxedFloat(Float[] values){float n=0;for(float x:values)n+=x;return n;}
 public static int primitiveInt(int[] values){return values.length;}
 public static int erasedObject(Object[] values){return values.length;}
 public static int nestedInteger(Integer[][] values){return values.length;}
 public static int textArray(String[] values){return values.length;}
 public static int unprovedList(java.util.List values){return values.size();}
}`);
  const cmd=(bin,args)=>{
   const result=spawnSync(bin,args,{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
   assert.ifError(result.error);
   assert.equal(result.status,0,result.stderr);
   return result.stdout;
  };
  cmd('javac',['-d',classes,source]);
  cmd('jar',['cf',jar,'-C',classes,'.']);
  cmd('javac',['-d',probe,path.join(root,'packages/family-hunter/GenericJvmMetamorphicProbe.java')]);
  const run=()=>cmd('java',['-Xmx128m','-cp',probe,'GenericJvmMetamorphicProbe',jar,'sample.boxed']);
  const raw=run(),report=JSON.parse(raw);
  assert.ok(report.methodsProbed>=4,'boxed Integer/Double/Float arrays plus primitive control must all exercise stable methods');
  assert.ok(report.structuredMethodsExercised>=4);
  assert.ok(report.unsupportedMethods>=4,'Object[], String[], nested Integer[][], and raw List must still abstain');
  assert.ok(!report.findings.some(f=>f.rule?.includes('AUTOMATIC_REPAIR')));
  assert.equal(report.oracleVerified,false);
  assert.equal(report.remoteWrites,false);
  assert.equal(report.mergeAllowed,false);
  assert.equal(run(),raw,'equivalent inputs yield deterministic immutable reports');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
