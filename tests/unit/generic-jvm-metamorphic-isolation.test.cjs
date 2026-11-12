'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const runner=path.join(root,'tests/fixtures/jvm-metamorphic/run-probe.sh');
test('the JVM probe requires a bounded networkless namespace and does not mount the workspace',()=>{
 const source=fs.readFileSync(runner,'utf8');
 const syntax=spawnSync('bash',['-n',runner],{encoding:'utf8'});assert.equal(syntax.status,0,syntax.stderr);
 for(const term of ['--unshare-all','--clearenv','--die-with-parent','--tmpfs /tmp','-Xmx128m','timeout --kill-after'])
  assert.ok(source.includes(term),term);
 assert.doesNotMatch(source,/--(?:ro-)?bind\s+["']?\$\{?GITHUB_WORKSPACE/);
 assert.doesNotMatch(source,/--(?:ro-)?bind\s+\/\s+\//);
});
test('child processes share a strict kernel-enforced aggregate memory and task budget',()=>{
 const launcher=fs.readFileSync(runner,'utf8');
 const guardFile=path.join(root,'tests/fixtures/jvm-metamorphic/assert-cgroup-and-exec.sh');
 assert.ok(fs.existsSync(guardFile),'fail closed: cgroup execution guard must exist');
 const guard=fs.readFileSync(guardFile,'utf8');
 assert.equal(spawnSync('bash',['-n',guardFile],{encoding:'utf8'}).status,0);
 for(const token of ['systemd-run','MemoryMax=','MemorySwapMax=0','TasksMax=',
  'assert-cgroup-and-exec.sh','--uid','--gid'])
  assert.ok(launcher.includes(token),'aggregate budget missing: '+token);
 for(const token of ['/proc/self/cgroup','/sys/fs/cgroup','memory.max','pids.max',
  'exec "\\$@"'])
  assert.ok(guard.includes(token),'pre-execution guard missing: '+token);
 assert.doesNotMatch(launcher,/ulimit -v|--memory-swappiness/);
});
test('the real namespace prevents a malicious probe reading host answers or environment',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-jvm-blind-'));
 try{
  const secret=path.join(dir,'answer.txt'),classes=path.join(dir,'classes'),out=path.join(dir,'out');
  fs.mkdirSync(classes);fs.mkdirSync(out);fs.writeFileSync(secret,'unavailable truth');
  const jar=path.join(dir,'target.jar');fs.writeFileSync(jar,'hypothesis input bytes');
  const digest=crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex');
  const java=path.join(dir,'GenericJvmMetamorphicProbe.java');
  fs.writeFileSync(java,`import java.nio.file.*;
public class GenericJvmMetamorphicProbe {
 public static class Result {}
 public static void main(String[] args) {
  if(System.getenv("SENTINEL_TEST_SECRET")!=null || Files.exists(Path.of(${JSON.stringify(secret)})) ||
     Files.exists(Path.of("/sentinel")) || Files.exists(Path.of("/proc/1/root"+${JSON.stringify(secret)})))
   throw new IllegalStateException("answer exposed");
  System.out.print("{\\"schema\\":\\"ultra-sentinel-generic-jvm-metamorphic/v1\\",\\"status\\":\\"INCOMPLETE_NO_SUPPORTED_METHODS\\",\\"artifactSha256\\":\\"${digest}\\",\\"findings\\":[],\\"sourceAuthenticated\\":false,\\"oracleVerified\\":false,\\"novelFamilyVerified\\":false,\\"repairAuthorized\\":false,\\"remoteWrites\\":false,\\"mergeAllowed\\":false}");
 }
}`);
  const compiled=spawnSync('javac',['-d',classes,java],{encoding:'utf8',timeout:30000});
  assert.equal(compiled.status,0,compiled.stderr);
  const check=spawnSync('/usr/bin/bwrap',['--die-with-parent','--unshare-all','--new-session',
   '--clearenv','--ro-bind','/','/','--','/bin/true'],{encoding:'utf8',timeout:10000});
  if(check.error||check.status!==0){
   if(process.env.SENTINEL_REQUIRE_BLIND_BWRAP==='1')assert.fail('Bubblewrap isolation required: '+String(check.stderr||check.error));
   t.skip('Bubblewrap namespaces unavailable; the CI isolation probe is mandatory');return;
  }
  const result=spawnSync('bash',[runner,jar,classes,'sample.probes',out],{
   encoding:'utf8',timeout:60000,env:{...process.env,SENTINEL_TEST_SECRET:'must-not-leak'}});
  assert.equal(result.status,0,(result.stderr||result.stdout).slice(0,2000));
  assert.equal(JSON.parse(fs.readFileSync(path.join(out,'discovery.json'),'utf8')).artifactSha256,digest);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('a target that terminates the JVM cannot leave a valid discovery report',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-jvm-exit-'));
 try{
  const classes=path.join(dir,'probe'),target=path.join(dir,'target'),out=path.join(dir,'out');
  fs.mkdirSync(classes);fs.mkdirSync(target);fs.mkdirSync(out);
  const src=path.join(dir,'Exit.java'),jar=path.join(dir,'target.jar');
  fs.writeFileSync(src,'package sample.halt; public class Exit { public static int stop(int n) { System.exit(0); return n; } }');
  const compile=(args)=>spawnSync('javac',args,{encoding:'utf8',timeout:30000});
  let r=compile(['-d',classes,path.join(root,'packages/family-hunter/GenericJvmMetamorphicProbe.java')]);assert.equal(r.status,0,r.stderr);
  r=compile(['-d',target,src]);assert.equal(r.status,0,r.stderr);
  r=spawnSync('jar',['cf',jar,'-C',target,'.'],{encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stderr);
  const check=spawnSync('/usr/bin/bwrap',['--die-with-parent','--unshare-all','--new-session',
   '--clearenv','--ro-bind','/','/','--','/bin/true'],{encoding:'utf8',timeout:10000});
  if(check.error||check.status!==0){
   if(process.env.SENTINEL_REQUIRE_BLIND_BWRAP==='1')assert.fail('Bubblewrap isolation required: '+String(check.stderr||check.error));
   t.skip('Bubblewrap namespaces unavailable; the CI isolation probe is mandatory');return;
  }
  const result=spawnSync('bash',[runner,jar,classes,'sample.halt',out],{encoding:'utf8',timeout:60000});
  assert.notEqual(result.status,0);
  assert.equal(fs.existsSync(path.join(out,'discovery.json')),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
