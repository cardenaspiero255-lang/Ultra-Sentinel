'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');

test('bounded JVM objects expose equality, symmetry and equal-hash violations only as hypotheses',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-jvm-objects-'));
 try{
  const binary=path.join(tmp,'probe'),classes=path.join(tmp,'classes'),jar=path.join(tmp,'original.jar');
  fs.mkdirSync(binary);fs.mkdirSync(classes);
  const run=(command,args)=>{
   const r=spawnSync(command,args,{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
   assert.ifError(r.error);assert.equal(r.status,0,r.stderr);return r.stdout;
  };
  const cases={
   BrokenHash:`private final int key; private final int serial=++counter; private static int counter;
    public BrokenHash(int key){this.key=key;}
    @Override public boolean equals(Object other){return other instanceof BrokenHash b && b.key==key;}
    @Override public int hashCode(){return serial;}`,
   BrokenSymmetry:`private final int key;
    public BrokenSymmetry(int key){this.key=key;}
    @Override public boolean equals(Object other){return other instanceof BrokenSymmetry b && key<=b.key;}
    @Override public int hashCode(){return 0;}`,
   BrokenReflexive:`public BrokenReflexive(int ignored){}
    @Override public boolean equals(Object other){return false;}
    @Override public int hashCode(){return 0;}`,
   Good:`private final int key;
    public Good(int key){this.key=key;}
    @Override public boolean equals(Object other){return other instanceof Good g && g.key==key;}
    @Override public int hashCode(){return Integer.hashCode(key);}`,
   Stateful:`private boolean next;
    public Stateful(int ignored){}
    @Override public boolean equals(Object other){next=!next;return next;}
    @Override public int hashCode(){return 0;}`,

   NoArg:`public NoArg(){}
    @Override public boolean equals(Object o){return this==o;}
    @Override public int hashCode(){return 1;}`,
   StringKey:`private final String key;
    public StringKey(String key){this.key=key;}
    @Override public boolean equals(Object o){return o instanceof StringKey x && key.equals(x.key);}
    @Override public int hashCode(){return key.hashCode();}`,
   DualKey:`private final int number; private final String text;
    public DualKey(int n,String s){number=n;text=s;}
    @Override public boolean equals(Object o){return o instanceof DualKey x && number==x.number && text.equals(x.text);}
    @Override public int hashCode(){return 31*number+text.hashCode();}`,
   UnsupportedCtor:`public UnsupportedCtor(Object ignored){}
    @Override public boolean equals(Object o){return o instanceof UnsupportedCtor;}
    @Override public int hashCode(){return 0;}`,
   ExcessCtor:`public ExcessCtor(int a,int b,int c,int d){}
    @Override public boolean equals(Object o){return o instanceof ExcessCtor;}
    @Override public int hashCode(){return 0;}`,
   ThrowingCtor:`public ThrowingCtor(int key){throw new IllegalArgumentException("constructor");}
    @Override public boolean equals(Object o){return o instanceof ThrowingCtor;}
    @Override public int hashCode(){return 0;}`,
   ThrowingEquals:`public ThrowingEquals(int key){}
    @Override public boolean equals(Object o){throw new IllegalArgumentException("equals");}
    @Override public int hashCode(){return 0;}`,
   ThrowingHash:`private final int key;
    public ThrowingHash(int key){this.key=key;}
    @Override public boolean equals(Object o){return o instanceof ThrowingHash x && x.key==key;}
    @Override public int hashCode(){throw new IllegalArgumentException("hash");}`,
   UnstableHash:`private final int key; private int next;
    public UnstableHash(int key){this.key=key;}
    @Override public boolean equals(Object o){return o instanceof UnstableHash x && x.key==key;}
    @Override public int hashCode(){return ++next;}`,
   Inherited:`public Inherited(int ignored){}`
  };
  const sources=[];
  for(const [name,body] of Object.entries(cases)){
   const file=path.join(tmp,name+'.java');
   fs.writeFileSync(file,'package sample.objectlaws;\npublic class '+name+' {\n'+body+'\n}\n');
   sources.push(file);
  }
  run('javac',['-d',binary,path.join(root,'packages/family-hunter/GenericJvmMetamorphicProbe.java')]);
  run('javac',['-d',classes,...sources]);
  run('jar',['cf',jar,'-C',classes,'.']);
  const raw=run('java',['-Xmx128m','-cp',binary,'GenericJvmMetamorphicProbe',jar,'sample.objectlaws']);
  const report=JSON.parse(raw), findings=report.findings;
  const match=(type,rule)=>findings.some(f=>f.class==='sample.objectlaws.'+type&&f.rule===rule);
  assert.ok(match('BrokenHash','OBJECT_EQUALS_HASHCODE_VIOLATION'));
  assert.ok(match('BrokenSymmetry','OBJECT_EQUALS_SYMMETRY_VIOLATION'));
  assert.ok(match('BrokenReflexive','OBJECT_EQUALS_REFLEXIVITY_VIOLATION'));
  assert.ok(!findings.some(f=>/sample\.objectlaws\.(Good|Stateful|Inherited|NoArg|StringKey|DualKey|UnsupportedCtor|ExcessCtor|ThrowingCtor|ThrowingEquals|ThrowingHash|UnstableHash)$/.test(f.class)));
  assert.ok(report.objectContractPairs>0);
  assert.ok(report.objectContractAbstentions>0,'unstable equality must abstain');
  assert.notEqual(report.status,'INCOMPLETE_NO_SUPPORTED_METHODS');
  assert.ok(findings.every(f=>f.status==='HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'));
  assert.equal(report.oracleVerified,false);
  assert.equal(report.novelFamilyVerified,false);
  assert.equal(report.remoteWrites,false);
  assert.equal(report.mergeAllowed,false);
  assert.equal(run('java',['-Xmx128m','-cp',binary,'GenericJvmMetamorphicProbe',jar,'sample.objectlaws']),raw,
   'equivalent immutable inputs must yield stable evidence');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
