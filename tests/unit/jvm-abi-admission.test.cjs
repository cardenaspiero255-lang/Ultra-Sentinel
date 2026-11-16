'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {descriptor,parameters,parseJavap,classify}=require('../../packages/quality-gates/jvm-abi-admission.cjs');
const api=(name,body,flags='public final class')=>parseJavap(flags+' '+name+' {\n'+body+'\n}',name);
const method=(name,d,args='',flags='public static final',ret='int')=>'  '+flags+' '+ret+' '+name+'('+args+');\n    descriptor: '+d;
test('ABI candidate admission understands exact JVM descriptors, finite arrays and generic numeric collections',()=>{
 assert.deepEqual(descriptor('(I[DLjava/lang/String;)Ljava/lang/Long;'),{params:['I','[D','Ljava/lang/String;'],result:'Ljava/lang/Long;'});
 assert.deepEqual(parameters('java.util.List<java.lang.Integer>, java.util.Map<java.lang.String, java.lang.Integer>'),['java.util.List<java.lang.Integer>','java.util.Map<java.lang.String, java.lang.Integer>']);
 const rows=classify([api('sample.NamedFacade',[
  method('renamed','(I)I','int'),
  method('list','(Ljava/util/List;)I','java.util.List<java.lang.Integer>'),
  method('array','([Ljava/lang/Double;)I','java.lang.Double[]'),
  method('iter','(Ljava/lang/Iterable;)I','java.lang.Iterable<java.lang.Long>'),
  method('strings','(Ljava/lang/String;)I','java.lang.String')
 ].join('\n'))]);
 assert.equal(rows.length,5);assert.ok(rows.every(x=>x.reason==='ADMISSIBLE_ABI_CANDIDATE'&&x.targetInvoked===false&&x.finiteDomain==='NOT_EVALUATED_BY_ABI'));
});
test('raw, wildcard, erased generic, nested arrays, booleans and unsupported returns abstain',()=>{
 const rows=classify([api('sample.Api',[
  method('raw','(Ljava/util/List;)I','java.util.List'),
  method('wild','(Ljava/util/List;)I','java.util.List<? extends java.lang.Number>'),
  method('generic','(Ljava/util/Collection;)I','java.util.Collection<T>'),
  method('nested','([[I)I','int[][]'),
  method('bool','(Z)I','boolean'),
  method('voided','(I)V','int','public static','void'),
  method('none','()I'),method('many','(IIII)I','int, int, int, int'),
  method('synthetic$default','(I)I','int'),
 ].join('\n'))]);
 assert.deepEqual(rows.slice(0,3).map(x=>x.reason),Array(3).fill('GENERIC_ERASURE_UNSAFE'));
 assert.ok(rows.slice(3).every(x=>x.reason==='API_UNSUPPORTED'));
});
test('object, default companion, named companion and ordinary constructor use metadata without initialization',()=>{
 const owner=api('sample.Owner','  public static final sample.Owner$Named Named;\n    descriptor: Lsample/Owner$Named;');
 const companion=api('sample.Owner$Named',method('value','(I)I','int','public final'));
 const object=api('sample.Singleton','  public static final sample.Singleton INSTANCE;\n    descriptor: Lsample/Singleton;\n'+method('value','(D)I','double','public final'));
 const ordinary=api('sample.Ordinary','  public sample.Ordinary(int);\n    descriptor: (I)V\n'+method('value','(I)I','int','public final'));
 const missing=api('sample.Missing',method('value','(I)I','int','public final'));
 assert.deepEqual(classify([owner,companion,object,ordinary,missing]).map(x=>x.receiver),['COMPANION','OBJECT','CONSTRUCTOR','UNSUPPORTED']);
 assert.equal(classify([missing])[0].reason,'ABI_UNSUPPORTED_RECEIVER');
 const invalidObject=api('sample.Wrong','  public static final java.lang.String INSTANCE;\n    descriptor: Ljava/lang/String;\n'+method('value','(I)I','int','public final'));
 assert.equal(classify([invalidObject])[0].reason,'ABI_UNSUPPORTED_RECEIVER');
 const abstract=api('sample.Abstract',method('value','(I)I','int','public abstract'),'public abstract class');
 assert.equal(classify([abstract])[0].reason,'API_UNSUPPORTED');
});
test('malformed or inconsistent ABI is refused rather than counted as coverage',()=>{
 for(const d of [null,'I','(Q)I','(V)I','(I','(I)Q','(I)Iextra','(I)Vextra'])assert.throws(()=>descriptor(d),/JVM_ABI_ADMISSION_REFUSED/);
 for(const p of ['A<B','A>B'])assert.throws(()=>parameters(p),/JVM_ABI_ADMISSION_REFUSED/);
 for(const [text,name] of [[null,'sample.A'],['bad','sample.A'],['public class bad {}','sample.A'],['public class a {','bad name']])assert.throws(()=>parseJavap(text,name));
 assert.throws(()=>api('sample.A','descriptor: ()I'));
 assert.throws(()=>api('sample.A',method('x','(II)I','int')));
 assert.throws(()=>api('sample.A','  public int voidField;\n    descriptor: V'));
 const one=api('sample.A',method('x','(I)I','int'));
 assert.throws(()=>classify([one,one]));
 assert.throws(()=>classify(null));
 const hidden=api('sample.Hidden',method('x','(I)I','int'),'final class');
 assert.equal(classify([hidden])[0].reason,'API_UNSUPPORTED');
});
test('real javap only reads declarations: static initializer and method tripwires are never executed',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-abi-metadata-'));
 try{
  fs.writeFileSync(path.join(tmp,'Tripwire.java'),[
   'public final class Tripwire {',
   'static { if (System.nanoTime()!=0) throw new AssertionError("INITIALIZER_EXECUTED"); }',
   'public static int count(java.util.List<Integer> input) { throw new AssertionError("METHOD_EXECUTED"); }',
   'public static int array(double[] input) { throw new AssertionError("METHOD_EXECUTED"); }',
   'public static int raw(java.util.List input) { return 0; }','}'
  ].join('\n'));
  const build=cp.spawnSync('javac',['-d',tmp,path.join(tmp,'Tripwire.java')],{encoding:'utf8',timeout:30000});
  assert.ifError(build.error);assert.equal(build.status,0,build.stderr);
  const run=cp.spawnSync('javap',['-public','-s','-classpath',tmp,'Tripwire'],{encoding:'utf8',timeout:15000});
  assert.ifError(run.error);assert.equal(run.status,0,run.stderr);
  assert.ok(!run.stdout.includes('METHOD_EXECUTED'));
  const rows=classify([parseJavap(run.stdout,'Tripwire')]);
  assert.equal(rows.filter(x=>x.reason==='ADMISSIBLE_ABI_CANDIDATE').length,2);
  assert.equal(rows.find(x=>x.method==='raw').reason,'GENERIC_ERASURE_UNSAFE');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
