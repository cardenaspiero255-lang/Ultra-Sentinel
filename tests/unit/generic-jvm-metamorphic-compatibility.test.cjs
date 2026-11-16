'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-jvm-compatibility-'));
const bin=path.join(temp,'probe'),classes=path.join(temp,'classes'),jar=path.join(temp,'fixture.jar');
fs.mkdirSync(bin);fs.mkdirSync(classes);
function run(command,args){
 const r=spawnSync(command,args,{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 assert.ifError(r.error);return r;
}
const files=[];
function source(name,pkg,body){
 const file=path.join(temp,name+'.java');
 fs.writeFileSync(file,(pkg?'package '+pkg+';\n':'')+'public class '+name+' {\n'+body+'\n}\n');
 files.push(file);
}
source('Floating','sample.floating',`
 public static double fractional(double x){return x*(1.0-x);}
 public static Double boxed(Double x){return x*(1.0-x);}
 public static double stable(double x){return x;}
 public static double nonfinite(double x){return Double.NaN;}
 public static double infinite(double x){return x==1?Double.POSITIVE_INFINITY:0;}
 public static long exactLong(long x){return x==1?Long.MAX_VALUE:Long.MAX_VALUE-1;}
`);
source('Ordinary','sample.receivers',`
 private int calls;
 public Ordinary(){}
 public double peak(double x){return x*(1.0-x);}
 public int sequence(int x){return new int[]{0,0,100,100,0,0}[Math.min(calls++,5)];}
`);
source('NumericReceiver','sample.receivers',`
 private final double bias;
 public NumericReceiver(double bias){this.bias=bias;}
 public double peak(double x){return x*(1.0-x)+bias;}
`);
source('TextReceiver','sample.receivers',`
 private final String text;
 public TextReceiver(String text){this.text=text;}
 public double peak(double x){return x*(1.0-x)+text.length();}
`);
source('RejectReceiver','sample.receivers',`
 public RejectReceiver(int seed){throw new IllegalArgumentException();}
 public int peak(int x){return x==1?100:0;}
`);
source('OverloadedReceiver','sample.overloads',`
 public OverloadedReceiver(int seed){}
 public OverloadedReceiver(long seed){}
 public double peak(double x){return x*(1.0-x);}
`);
source('Unconstructible','sample.unconstructible',`
 private Unconstructible(){}
 public double peak(double x){return x*(1.0-x);}
`);
source('Structured','sample.structured',`
 public static int ints(int[] xs){return xs.length==1?100:0;}
 public static int doubles(double[] xs){return xs.length==1?100:0;}
 public static int longs(long[] xs){return xs.length==1?100:0;}
 public static int lists(java.util.List<Double> xs){return xs.size()==1?100:0;}
 public static int collections(java.util.Collection<Integer> xs){return xs.size()==1?100:0;}
 public static int iterables(java.lang.Iterable<Long> xs){int size=0;for(Long ignored:xs)size++;return size==1?100:0;}
 public static int mutates(double[] xs){if(xs.length>0)xs[0]++;return xs.length==1?(int)xs[0]:0;}
 public static int stable(java.util.List<Double> xs){return xs.size();}
 public static int nonempty(java.util.List<Double> xs){if(xs.isEmpty())throw new IllegalArgumentException();return xs.size()==2?100:0;}
 public static int raw(java.util.List xs){return xs.size()==1?100:0;}
 public static int wildcard(java.util.List<? extends Number> xs){return xs.size()==1?100:0;}
 public static int nested(java.util.List<java.util.List<Double>> xs){return xs.size()==1?100:0;}
 public static int opaque(java.util.List<Object> xs){return xs.size()==1?100:0;}
 public static int concrete(java.util.ArrayList<Double> xs){return xs.size()==1?100:0;}
 public static int chars(char[] xs){return xs.length==1?100:0;}
`);
source('Single','single',`public static double peak(double x){return x*(1.0-x);}`);
source('DefaultApi','',`public static double peak(double x){return x*(1.0-x);}`);
source('Álgebra','métricas',`public static double cálculo(double x){return x*(1.0-x);}`);
for(const [command,args] of [
 ['javac',['-d',bin,path.join(root,'packages/family-hunter/GenericJvmMetamorphicProbe.java')]],
 ['javac',['-d',classes,...files]],['jar',['cf',jar,'-C',classes,'.']]
]){const r=run(command,args);assert.equal(r.status,0,r.stderr);}
test.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
function probe(prefix){return run('java',['-Xmx128m','-cp',bin,'GenericJvmMetamorphicProbe',jar,prefix]);}
function report(prefix){const r=probe(prefix);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
function finds(r,name){return r.findings.filter(f=>f.method?.startsWith(name+'('));}

test('Double fractional operations and boxing are exercised while integral observations remain exact',()=>{
 const r=report('sample.floating');
 for(const name of ['fractional','boxed','exactLong'])assert.ok(finds(r,name).length,name+' was not exercised');
 const fractional=finds(r,'fractional').find(f=>f.observed.includes('0.25'));
 assert.ok(fractional,'the fractional witness must retain 0.25 rather than truncating to a long');
 assert.ok(finds(r,'exactLong').some(f=>f.observed.includes('9223372036854775807')),
  'the long maximum must not be rounded through double');
 assert.equal(finds(r,'stable').length,0);
 for(const name of ['nonfinite','infinite'])assert.equal(finds(r,name).length,0,name);
 assert.ok(r.abstainedProbes>0,'nonfinite observations abstain');
 for(const f of r.findings){
  assert.equal(f.status,'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE');
  assert.ok(f.observed.every(x=>Number.isFinite(Number(x))));
 }
 assert.equal(r.oracleVerified,false);assert.equal(r.novelFamilyVerified,false);
});

test('ordinary noarg, numeric and string constructors enable instance coverage without reusing mutable receivers',()=>{
 const r=report('sample.receivers');
 for(const name of ['Ordinary','NumericReceiver','TextReceiver'])
  assert.ok(r.findings.some(f=>f.class==='sample.receivers.'+name&&f.method.startsWith('peak(')),name);
 assert.equal(finds(r,'sequence').length,0,'a call counter must not create a stable-looking turning point');
 assert.ok(!r.findings.some(f=>f.class==='sample.receivers.RejectReceiver'));
 assert.ok(r.abstainedProbes>0||r.constructorAbstentions>0,'throwing constructors must be explicit abstentions');
});

test('bounded primitive numeric arrays and proven numeric collection parameters receive fresh shape samples',()=>{
 const r=report('sample.structured');
 for(const name of ['ints','doubles','longs','lists','collections','iterables','mutates'])
  assert.ok(finds(r,name).length,name+' has no bounded shape witness');
 assert.equal(finds(r,'stable').length,0,'collection size is monotonic in the shape samples');
 for(const name of ['raw','wildcard','nested','opaque','concrete','chars'])
  assert.equal(finds(r,name).length,0,'unsupported element types must not be guessed: '+name);
 assert.ok(r.unsupportedMethods>=6);
});

test('ordinary instance witnesses preserve overloaded constructor identity',()=>{
 const r=report('sample.overloads');
 const witnesses=finds(r,'peak');assert.ok(witnesses.length>0);
 assert.ok(witnesses.some(f=>JSON.stringify(f.constructor)==='["int"]'));
 assert.ok(witnesses.some(f=>JSON.stringify(f.constructor)==='["long"]'));
 for(const f of witnesses)assert.equal(f.constructor.length,f.constructorArguments.length);
});

test('nonempty-only collection APIs receive a separate finite positive-size band',()=>{
 const r=report('sample.structured');
 assert.ok(finds(r,'nonempty').length,'an empty-input abstention must not suppress the separate [1,2,3] band');
 const witness=finds(r,'nonempty').find(f=>f.inputs.every(x=>!x.startsWith('size=0;')));
 assert.ok(witness);assert.deepEqual(witness.observed,['0','100','0']);
});

test('an inaccessible receiver cannot turn zero executed methods into reported coverage',()=>{
 const r=report('sample.unconstructible');
 assert.equal(r.methodsProbed,0,'no instance exists, so the public numeric method was never probed');
 assert.equal(r.status,'INCOMPLETE_NO_SUPPORTED_METHODS');
 assert.ok(r.constructorAbstentions>0);assert.deepEqual(r.findings,[]);
});

test('single segment, explicit default and legal Unicode package scopes preserve exact JVM method identity',()=>{
 for(const [prefix,owner,method] of [
  ['single','single.Single','peak'],['.','DefaultApi','peak'],['métricas','métricas.Álgebra','cálculo']
 ]){
  const r=report(prefix);
  assert.equal(r.classesInspected,1,'package selection must not widen to the bundled runtime');
  assert.ok(r.findings.some(f=>f.class===owner&&f.method.startsWith(method+'(')),prefix);
 }
});

test('unsafe scopes remain rejected and a legal unused package remains incomplete',()=>{
 for(const prefix of ['', '..', '../single','single.','single..child','single/child','single\u0001child','single*']){
  const r=probe(prefix);assert.notEqual(r.status,0,JSON.stringify(prefix));
  assert.match(r.stderr,/GENERIC_JVM_PROBE_BLOCKED/);
 }
 const r=report('unused');
 assert.equal(r.status,'INCOMPLETE_NO_SUPPORTED_METHODS');assert.equal(r.methodsProbed,0);
 assert.deepEqual(r.findings,[]);assert.equal(r.oracleVerified,false);
});

test('singleton receiver lookup cannot swallow a global finding budget failure',()=>{
 const folder=path.join(temp,'singleton-budget'),dest=path.join(folder,'classes');
 fs.mkdirSync(dest,{recursive:true});
 const file=path.join(folder,'SingletonBudget.java'),archive=path.join(folder,'target.jar');
 fs.writeFileSync(file,'package sample.singletonbudget; public class SingletonBudget { '+
  'public static final SingletonBudget INSTANCE=new SingletonBudget();\n'+
  Array.from({length:257},(_,i)=>`public int m${i}(int x){return x==1?100:0;}`).join('\n')+'\n}');
 let r=run('javac',['-d',dest,file]);assert.equal(r.status,0,r.stderr);
 r=run('jar',['cf',archive,'-C',dest,'.']);assert.equal(r.status,0,r.stderr);
 r=run('java',['-Xmx128m','-cp',bin,'GenericJvmMetamorphicProbe',archive,'sample.singletonbudget']);
 assert.notEqual(r.status,0,'exhausting the global budget must block the complete scan');
 assert.match(r.stderr,/GENERIC_JVM_PROBE_BLOCKED/);
});

test('an unresolved generic element type abstains locally while unrelated numeric methods remain usable',()=>{
 const folder=path.join(temp,'missing-generic'),dest=path.join(folder,'classes');
 fs.mkdirSync(dest,{recursive:true});
 const missing=path.join(folder,'MissingType.java'),input=path.join(folder,'SignatureCases.java');
 fs.writeFileSync(missing,'package sample.signatures; public class MissingType {}');
 fs.writeFileSync(input,`package sample.signatures; public class SignatureCases {
 public static int aMissing(java.util.List<MissingType> xs){return xs.size();}
 public static int zStable(int x){return x;}
 }`);
 let r=run('javac',['-d',dest,missing,input]);assert.equal(r.status,0,r.stderr);
 fs.rmSync(path.join(dest,'sample/signatures/MissingType.class'));
 const archive=path.join(folder,'target.jar');r=run('jar',['cf',archive,'-C',dest,'.']);assert.equal(r.status,0,r.stderr);
 r=run('java',['-Xmx128m','-cp',bin,'GenericJvmMetamorphicProbe',archive,'sample.signatures']);
 assert.equal(r.status,0,r.stderr);
 const observed=JSON.parse(r.stdout);
 assert.equal(observed.methodsProbed,1);assert.equal(observed.unsupportedMethods,1);
 assert.equal(observed.status,'PARTIAL_HYPOTHESES_REQUIRE_ORACLE');assert.deepEqual(observed.findings,[]);
});
