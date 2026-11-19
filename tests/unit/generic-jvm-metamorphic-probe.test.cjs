'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-generic-probe-test-'));
const bin=path.join(temp,'bin'),classes=path.join(temp,'classes'),jar=path.join(temp,'fixture.jar');
fs.mkdirSync(bin);fs.mkdirSync(classes);
function run(executable,args,timeout=30000){
 const r=spawnSync(executable,args,{encoding:'utf8',timeout,maxBuffer:1024*1024});
 assert.ifError(r.error);
 return r;
}
function prepare(){
 const source=path.join(temp,'Fixtures.java');
 fs.writeFileSync(source,`package sample.probes;
public final class Fixtures {
 public static final Fixtures INSTANCE=new Fixtures();
 public static final class Nested { public static int value(int n) { return n; } }
 private int state=0;
 public int peak(int x) { return x==0?0:x==1?100:0; }
 public int valley(int x) { return x==0?2:x==1?0:2; }
 public int increasing(int x) { System.out.println("untrusted output"); return Math.min(x,100); }
 public static int decreasing(int x) { return -x; }
 public long longPeak(long x) { return x==0?0:x==1?2:0; }
 public Long boxed(Integer x,Long y) { return x==0?0L:x==1?y:0L; }
 public long twoLongs(long x,long y) { return x+y; }
 public int scale(int x,int y) { return x==0?0:x==1?y:0; }
 public Integer missing(int x) { return x==1?null:x; }
 public int throwsForLarge(int x) { if(x==Integer.MAX_VALUE)throw new IllegalArgumentException();return x; }
 public int stateful(int x) { return state++; }
 public String unsupported(String x) { return x; }
 public int unsupportedArgument(String x) { return x.length(); }
 public int noArguments() { return 1; }
 public long tooMany(int a,int b,int c) { return (long)a+b+c; }
 public short shortPeak(short x) { return (short)(x==0?0:x==1?17:0); }
 public byte byteValley(byte x) { return (byte)(x==0?3:x==1?0:3); }
 public int boxedShortPeak(Short x) { return x==0?0:x==1?5:0; }
 public static long triArgPeak(int x,short y,byte z) { return x==0?0:x==1?y+z:0; }

 private int hidden(int x) { return x; }
 public static long stable(long x) { return x; }
}`);
 const noInstance=path.join(temp,'NoInstance.java');
 fs.writeFileSync(noInstance,'package sample.probes; public final class NoInstance { public int value(int x) { return x; } }');
 const compile=run('javac',['-d',bin,path.join(root,'packages/family-hunter/GenericJvmMetamorphicProbe.java')]);
 assert.equal(compile.status,0,compile.stderr);
 const input=run('javac',['-d',classes,source,noInstance]);assert.equal(input.status,0,input.stderr);
 const archive=run('jar',['cf',jar,'-C',classes,'.']);assert.equal(archive.status,0,archive.stderr);
}
prepare();
test.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
function probe(file=jar,prefix='sample.probes'){
 return run('java',['-Xmx128m','-cp',bin,'GenericJvmMetamorphicProbe',file,prefix]);
}
test('reports reproducible turning points as hypotheses and keeps unsupported cases explicit',()=>{
 const result=probe();assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.equal(report.schema,'ultra-sentinel-generic-jvm-metamorphic/v1');
 assert.equal(report.artifactSha256,crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex'));
 assert.equal(report.status,'PARTIAL_HYPOTHESES_REQUIRE_ORACLE');
 assert.equal(report.classesInspected,3); // Public static named member is now admitted.
 assert.ok(report.methodsProbed>=13);
 assert.ok(report.unsupportedMethods>=2);
 assert.ok(report.abstainedProbes>=3); // Ordinary noarg NoInstance is now exercised.
 assert.equal(report.nestedClassesSkipped,0);
 const names=report.findings.map(x=>x.method);
 assert.ok(names.some(x=>x.startsWith('peak(')));
 assert.ok(names.some(x=>x.startsWith('valley(')));
 assert.ok(names.some(x=>x.startsWith('longPeak(')));
 assert.ok(names.some(x=>x.startsWith('scale(')));
 assert.ok(names.some(x=>x.startsWith('shortPeak(')),'short primitive return and argument');
 assert.ok(names.some(x=>x.startsWith('byteValley(')),'byte primitive return and argument');
 assert.ok(names.some(x=>x.startsWith('boxedShortPeak(')),'boxed Short argument');
 assert.ok(names.some(x=>x.startsWith('triArgPeak(')),'three numeric parameters');
 assert.ok(!names.some(x=>x.startsWith('tooMany(')),'three-input monotonic method must not be flagged');

 assert.ok(!names.some(x=>x.startsWith('increasing(')));
 assert.ok(!names.some(x=>x.startsWith('stateful(')));
 for(const finding of report.findings){
  assert.equal(finding.status,'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE');
  assert.equal(finding.observed.length,3);
  assert.ok(finding.observed.every(x=>typeof x==='string'));
 }
 for(const key of ['sourceAuthenticated','oracleVerified','novelFamilyVerified',
  'repairAuthorized','remoteWrites','mergeAllowed'])assert.equal(report[key],false);
 assert.equal(probe().stdout,result.stdout,'the same bounded input must produce the same report');
});
test('a supported monotonic class is complete but never certified clean',()=>{
 const java=path.join(temp,'Stable.java'),dest=path.join(temp,'stable-classes'),archive=path.join(temp,'stable.jar');
 fs.mkdirSync(dest);fs.writeFileSync(java,'package sample.stable; public class Stable { public static long monotonic(long x) { return x; } }');
 assert.equal(run('javac',['-d',dest,java]).status,0);
 assert.equal(run('jar',['cf',archive,'-C',dest,'.']).status,0);
 const result=probe(archive,'sample.stable');assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.equal(report.status,'HYPOTHESES_REQUIRE_ORACLE');assert.equal(report.methodsProbed,1);
 assert.deepEqual(report.findings,[]);assert.equal(report.oracleVerified,false);
});
test('a valid turning point can be intentional, so no reported hypothesis certifies a defect',()=>{
 const r=JSON.parse(probe().stdout),peak=r.findings.find(x=>x.method.startsWith('peak('));
 assert.deepEqual(peak.observed,['0','100','0']);
 assert.equal(r.oracleVerified,false);
});
test('a package without supported classes is incomplete, never a clean verdict',()=>{
 const r=probe(jar,'unrelated.package');assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(r.stdout);
 assert.equal(report.status,'INCOMPLETE_NO_SUPPORTED_METHODS');
 assert.equal(report.methodsProbed,0);assert.deepEqual(report.findings,[]);
});
test('rejects missing, malformed and symlinked artifacts or unsafe package names',()=>{
 const link=path.join(temp,'linked.jar');fs.symlinkSync(jar,link);
 for(const [file,prefix] of [[link,'sample.probes'],[path.join(temp,'absent.jar'),'sample.probes'],
  [jar,'../bad'],[jar,'sample..child']]){
  const r=probe(file,prefix);assert.notEqual(r.status,0);assert.match(r.stderr,/GENERIC_JVM_PROBE_BLOCKED/);
 }
 const wrong=path.join(temp,'bad.jar');fs.writeFileSync(wrong,'invalid archive');
 const r=probe(wrong);assert.notEqual(r.status,0);assert.match(r.stderr,/GENERIC_JVM_PROBE_BLOCKED/);
 const tiny=path.join(temp,'tiny.jar');fs.writeFileSync(tiny,'x');assert.notEqual(probe(tiny).status,0);
 const huge=path.join(temp,'huge.jar');fs.writeFileSync(huge,'x');fs.truncateSync(huge,32*1024*1024+1);
 assert.notEqual(probe(huge).status,0);
 assert.notEqual(run('java',['-cp',bin,'GenericJvmMetamorphicProbe']).status,0);
});
test('unloadable classes and invalid singleton receivers are reported as incomplete',()=>{
 const folder=path.join(temp,'partial-src'),dest=path.join(temp,'partial-classes'),archive=path.join(temp,'partial.jar');
 fs.mkdirSync(folder);fs.mkdirSync(dest);
 const source=path.join(folder,'Odd.java');
 fs.writeFileSync(source,`package sample.partial;
 public class Odd { public static final Object INSTANCE="not an instance"; public int number(int n) { return n; }
 public static int stable(int n) { return n; } }`);
 // A genuinely invalid Kotlin-style singleton must still abstain.
 const nullSingleton=path.join(folder,'NullSingleton.java');
 fs.writeFileSync(nullSingleton,`package sample.partial;
 public class NullSingleton {
  public static final NullSingleton INSTANCE = null;
  private NullSingleton(){}
  public int number(int n){return n;}
 }`);
 assert.equal(run('javac',['-d',dest,source,nullSingleton]).status,0);
 fs.writeFileSync(path.join(dest,'sample/partial/Invalid-Name.class'),'not a class');
 fs.writeFileSync(path.join(dest,'sample/partial/InvalidBytecode.class'),'not a class');
 assert.equal(run('jar',['cf',archive,'-C',dest,'.']).status,0);
 const r=probe(archive,'sample.partial');assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(r.stdout);assert.equal(report.status,'PARTIAL_HYPOTHESES_REQUIRE_ORACLE');
 assert.ok(report.unloadableClasses>=2);assert.ok(report.abstainedProbes>=1);
});
test('omitted unsupported and nested methods make an otherwise stable scan partial',()=>{
 const source=path.join(temp,'Partial.java'),dest=path.join(temp,'partial-only-classes'),archive=path.join(temp,'partial-only.jar');
 fs.mkdirSync(dest);
 fs.writeFileSync(source,`package sample.partialonly; public class Partial {
 public static int stable(int n) { return n; } private int omitted(int n) { return n; }
 private static class Nested { public static int hidden(int n) { return n; } } }`);
 assert.equal(run('javac',['-d',dest,source]).status,0);assert.equal(run('jar',['cf',archive,'-C',dest,'.']).status,0);
 const r=probe(archive,'sample.partialonly');assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(r.stdout);assert.equal(report.status,'PARTIAL_HYPOTHESES_REQUIRE_ORACLE');
 assert.ok(report.unsupportedMethods>0);assert.ok(report.nestedClassesSkipped>0);
});
test('a target that mutates its own executable artifact is blocked',()=>{
 const source=path.join(temp,'Mutator.java'),dest=path.join(temp,'mutator-classes'),archive=path.join(temp,'mutator.jar');
 fs.mkdirSync(dest);
 fs.writeFileSync(source,`package sample.mutation; public class Mutator {
 public static int change(int n) { try {
  java.nio.file.Path p=java.nio.file.Path.of(Mutator.class.getProtectionDomain().getCodeSource().getLocation().toURI());
  java.nio.file.Files.write(p,new byte[]{1},java.nio.file.StandardOpenOption.APPEND);
 } catch(Exception e) { throw new RuntimeException(e); } return n; } }`);
 assert.equal(run('javac',['-d',dest,source]).status,0);assert.equal(run('jar',['cf',archive,'-C',dest,'.']).status,0);
 const before=fs.statSync(archive).size,result=probe(archive,'sample.mutation');
 assert.notEqual(result.status,0);assert.match(result.stderr,/GENERIC_JVM_PROBE_BLOCKED/);
 assert.ok(fs.statSync(archive).size>before);
});
test('the method and finding budgets block excessive scans rather than returning partial success',()=>{
 for(const [kind,count,expression] of [['methods',513,'return n;'],['findings',257,'return n==0?0:n==1?2:0;']]){
  const folder=path.join(temp,`budget-${kind}`),dest=path.join(folder,'classes');fs.mkdirSync(dest,{recursive:true});
  const source=path.join(folder,'Budget.java'),archive=path.join(folder,'budget.jar');
  const methods=Array.from({length:count},(_,i)=>`public static int m${i}(int n){${expression}}`).join('\n');
  fs.writeFileSync(source,`package sample.budget; public class Budget { ${methods} }`);
  assert.equal(run('javac',['-d',dest,source]).status,0);assert.equal(run('jar',['cf',archive,'-C',dest,'.']).status,0);
  const result=probe(archive,'sample.budget');assert.notEqual(result.status,0,kind);
  assert.match(result.stderr,/GENERIC_JVM_PROBE_BLOCKED/);
 }
});
test('returns valid JSON for JVM method names containing quotes, slashes or control bytes',()=>{
 const original=fs.readFileSync(path.join(classes,'sample/probes/Fixtures.class'));
 for(const [index,replacement] of ['pe"k','pe\\k','pe\x01k'].entries()){
  const folder=path.join(temp,`name-${index}`),pkg=path.join(folder,'sample','probes');fs.mkdirSync(pkg,{recursive:true});
  const bytes=Buffer.from(original),offset=bytes.indexOf(Buffer.from('peak'));assert.ok(offset>=0);
  Buffer.from(replacement).copy(bytes,offset);
  fs.writeFileSync(path.join(pkg,'Fixtures.class'),bytes);
  const archive=path.join(temp,`name-${index}.jar`);assert.equal(run('jar',['cf',archive,'-C',folder,'.']).status,0);
  const result=probe(archive);assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(result.stdout);
  assert.ok(report.findings.some(f=>f.method.startsWith(replacement+'(')));
 }
});
test('excess classes abort instead of silently truncating the scan',()=>{
 const many=path.join(temp,'many'),pkg=path.join(many,'sample','probes');fs.mkdirSync(pkg,{recursive:true});
 const bytes=fs.readFileSync(path.join(classes,'sample/probes/Fixtures.class'));
 for(let i=0;i<257;i++)fs.writeFileSync(path.join(pkg,`C${i}.class`),bytes);
 const large=path.join(temp,'many.jar'),archive=run('jar',['cf',large,'-C',many,'.']);
 assert.equal(archive.status,0,archive.stderr);
 const r=probe(large);assert.notEqual(r.status,0);assert.match(r.stderr,/GENERIC_JVM_PROBE_BLOCKED/);
});

test('derives Comparable counterexamples from public interface laws without target names or answers',()=>{
 const folder=path.join(temp,'order-contracts'),dest=path.join(folder,'classes');fs.mkdirSync(dest,{recursive:true});
 const source=path.join(folder,'Cases.java'),archive=path.join(folder,'contracts.jar');
 fs.writeFileSync(source,`package sample.order; public class Cases {
  public static class Broken implements Comparable<Broken> {
   private final int key; public Broken(int key){this.key=key;}
   public int compareTo(Broken other){return key-other.key;}
  }
  public static class Good implements Comparable<Good> {
   private final int key; public Good(int key){this.key=key;}
   public int compareTo(Good other){return Integer.compare(key,other.key);}
  }
  public static class Text implements Comparable<Text> {
   private final String key; public Text(String key){this.key=key;}
   public int compareTo(Text other){return key.compareTo(other.key);}
  }
  public static class Two implements Comparable<Two> {
   private final long key; public Two(Long key,Short unused,Byte ignored){this.key=key;}
   public int compareTo(Two other){return (int)(key-other.key);}
  }
  public static class Reject implements Comparable<Reject> {
   public Reject(short key){throw new IllegalArgumentException();}
   public int compareTo(Reject other){return 0;}
  }
  public static class Opaque implements Comparable<Opaque> {
   public Opaque(Object key){} public int compareTo(Opaque other){return 0;}
  }
  public abstract static class Abstract implements Comparable<Abstract>{}
  public static class Private implements Comparable<Private> {
   private Private(){} public int compareTo(Private other){return 0;}
  }
  public static class Zero implements Comparable<Zero> {
   public Zero(){} public int compareTo(Zero other){return 0;}
  }
  public static class ByteKey implements Comparable<ByteKey> {
   private final byte key; public ByteKey(byte key){this.key=key;}
   public int compareTo(ByteKey other){return Byte.compare(key,other.key);}
  }
  public static class LongKey implements Comparable<LongKey> {
   private final long key; public LongKey(long key){this.key=key;}
   public int compareTo(LongKey other){return Long.compare(key,other.key);}
  }
  public static class Stateful implements Comparable<Stateful> {
   private static int calls; public Stateful(Integer key){}
   public int compareTo(Stateful other){return (++calls % 3)-1;}
  }
 }`);
 assert.equal(run('javac',['-d',dest,source]).status,0);
 assert.equal(run('jar',['cf',archive,'-C',dest,'.']).status,0);
 const result=probe(archive,'sample.order');assert.equal(result.status,0,result.stderr);
 const r=JSON.parse(result.stdout),findings=r.findings.filter(f=>f.rule==='COMPARABLE_ANTISYMMETRY_VIOLATION');
 assert.equal(r.comparableClasses,11);assert.ok(r.comparablePairs>0);
 assert.ok(r.constructorAbstentions>=3);assert.ok(r.abstainedProbes>0);
 assert.deepEqual(findings.map(f=>f.class),['sample.order.Cases$Broken','sample.order.Cases$Two']);
 const broken=findings[0];
 assert.deepEqual(broken.constructor,['int']);
 assert.deepEqual(broken.left,['-2147483648']);assert.deepEqual(broken.right,['0']);
 assert.deepEqual(broken.observedSigns,[-1,-1]);
 assert.equal(broken.status,'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE');
 assert.equal(r.oracleVerified,false);assert.equal(r.mergeAllowed,false);
 assert.equal(probe(archive,'sample.order').stdout,result.stdout);
});

test('unsupported Comparable constructors explicitly abstain and never certify clean',()=>{
 const folder=path.join(temp,'order-unsupported'),dest=path.join(folder,'classes');fs.mkdirSync(dest,{recursive:true});
 const source=path.join(folder,'Opaque.java'),archive=path.join(folder,'opaque.jar');
 fs.writeFileSync(source,`package sample.opaque; public class Opaque implements Comparable<Opaque> {
  public Opaque(Object key){} public int compareTo(Opaque other){return 0;}
 }`);
 assert.equal(run('javac',['-d',dest,source]).status,0);
 assert.equal(run('jar',['cf',archive,'-C',dest,'.']).status,0);
 const r=JSON.parse(probe(archive,'sample.opaque').stdout);
 assert.equal(r.status,'INCOMPLETE_NO_SUPPORTED_METHODS');assert.equal(r.comparablePairs,0);
 assert.equal(r.constructorAbstentions,1);assert.deepEqual(r.findings,[]);
});

test('finds nontransitive order even when every pair is antisymmetric',()=>{
 const folder=path.join(temp,'order-cycle'),dest=path.join(folder,'classes');fs.mkdirSync(dest,{recursive:true});
 const source=path.join(folder,'Cycle.java'),archive=path.join(folder,'cycle.jar');
 fs.writeFileSync(source,`package sample.cycle; public class Cycle implements Comparable<Cycle> {
  private final int key; public Cycle(int key){this.key=Math.floorMod(key,3);}
  public int compareTo(Cycle other){return key==other.key?0:(key+1)%3==other.key?-1:1;}
 }`);
 assert.equal(run('javac',['-d',dest,source]).status,0);
 assert.equal(run('jar',['cf',archive,'-C',dest,'.']).status,0);
 const r=JSON.parse(probe(archive,'sample.cycle').stdout);
 assert.equal(r.findings.filter(f=>f.rule==='COMPARABLE_ANTISYMMETRY_VIOLATION').length,0);
 const findings=r.findings.filter(f=>f.rule==='COMPARABLE_TRANSITIVITY_VIOLATION');
 assert.equal(findings.length,1,'pairwise consistency must not hide a cyclic order');
 assert.deepEqual(findings[0].observedSigns,[1,1,-1]);
 assert.equal(findings[0].middle.length,1);assert.ok(r.comparableTriples>0);
 assert.equal(r.oracleVerified,false);
});

test('constructor-generated identity cannot manufacture an ordering-law violation',()=>{
 const folder=path.join(temp,'order-identity'),dest=path.join(folder,'classes');fs.mkdirSync(dest,{recursive:true});
 const source=path.join(folder,'Sequence.java'),archive=path.join(folder,'identity.jar');
 fs.writeFileSync(source,`package sample.identity; public class Sequence implements Comparable<Sequence> {
  private static long next; private final long id; public Sequence(int ignored){id=next++;}
  public int compareTo(Sequence other){return Long.compare(id,other.id);}
 }`);
 assert.equal(run('javac',['-d',dest,source]).status,0);
 assert.equal(run('jar',['cf',archive,'-C',dest,'.']).status,0);
 const result=probe(archive,'sample.identity');assert.equal(result.status,0,result.stderr);
 const r=JSON.parse(result.stdout);
 assert.ok(r.comparablePairs>0);assert.deepEqual(r.findings,[]);
});


test('scalar membership lookup over a fixed collection abstains instead of claiming a turning point',()=>{
 const source=path.join(temp,'Membership.java'),dest=path.join(temp,'membership-classes'),archive=path.join(temp,'membership.jar');
 fs.mkdirSync(dest);
 fs.writeFileSync(source,[
  'package sample.membership;',
  'import java.util.List;',
  'public final class Membership {',
  ' public static int locate(List<Integer> values,int target) { return values.indexOf(target); }',
  ' public static int reverse(int target,List<Integer> values) { return values.indexOf(target); }',
  ' public static int scalarPeak(int target,int multiplier) { return target==1?multiplier:0; }',
  ' public static int sizePeak(List<Integer> values) { return values.size()==1?8:0; }',
  '}'
 ].join('\n'));
 const compile=run('javac',['-d',dest,source]);assert.equal(compile.status,0,compile.stderr);
 const archived=run('jar',['cf',archive,'-C',dest,'.']);assert.equal(archived.status,0,archived.stderr);
 const v7bin=path.join(temp,'v7-probe-classes');fs.mkdirSync(v7bin);
 const v7build=run('javac',['-d',v7bin,path.join(root,'packages/family-hunter/v7/GenericJvmMetamorphicProbe.java')]);
 assert.equal(v7build.status,0,v7build.stderr);
 const result=run('java',['-Xmx128m','-cp',v7bin,'GenericJvmMetamorphicProbe',archive,'sample.membership']);
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.ok(report.methodsProbed>=4,'must still exercise original collection APIs');
 assert.ok(report.completedTriples>=1,'other finite domains remain measurable');
 const names=report.findings.map(x=>x.method);
 assert.ok(!names.some(x=>x.startsWith('locate(')||x.startsWith('reverse(')),
  'target membership in an unchanged collection is not a numeric monotonicity contract');
 assert.ok(names.some(x=>x.startsWith('scalarPeak(')),'pure scalar turning points remain detectable');
 assert.ok(names.some(x=>x.startsWith('sizePeak(')),'collection size turning points remain hypotheses');
 assert.ok(report.abstainedProbes>0,'ambiguous scalar-versus-collection probes explicitly abstain');
 assert.equal(report.oracleVerified,false);
});
