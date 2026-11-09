'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {executeOriginalJvmTriplet}=require('../../packages/recovery/phase2-executed-jvm-triplet.cjs');
const markers=()=>({originalFailure:'ORIGINAL_FAIL',
 green:['BENIGN_CONSENT_PASS','CONSENT_BOUNDARY_ORACLE_PASS'],unsafeFailure:'WRONG_FAIL'});
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-live-jvm-'));
 const configs=[['original','System.err.println("ORIGINAL_FAIL");System.exit(1);'],
 ['candidate','System.out.println("BENIGN_CONSENT_PASS");System.out.println("CONSENT_BOUNDARY_ORACLE_PASS");'],
 ['wrong','System.err.println("WRONG_FAIL");System.exit(1);']];
 for(const [name,body] of configs){
  const src=path.join(dir,'Oracle.java'),classes=path.join(dir,'classes');
  fs.mkdirSync(classes,{recursive:true});
  fs.writeFileSync(src,'package example;public class Oracle {public static void main(String[] args) {'+body+'}}\n');
  execFileSync('javac',['-d',classes,src],{timeout:15000});
  execFileSync('jar',['cf',path.join(dir,name+'.jar'),'-C',classes,'.'],{timeout:15000});
 }
 return dir;
}
const valid=dir=>({directory:dir,mainClass:'example.Oracle',caseId:'UNKNOWN_FAMILY_42',
 sourceHeadSha:'a'.repeat(40),originalBlobSha:'b'.repeat(40),
 candidateBlobSha:'c'.repeat(40),markers:markers()});
test('actual JVM artifacts produce a classified RED GREEN VETO triplet without granting authority',()=>{
 const dir=fixture();try{
  const result=executeOriginalJvmTriplet(valid(dir));
  assert.equal(result.status,'LOCAL_JVM_TRIPLET_EXECUTED_AND_CLASSIFIED');
  assert.equal(result.jvmProcessesExecutedLocally,true);
  for(const phase of ['original','candidate','unsafe'])assert.match(result.artifactsSha256[phase],/^[a-f0-9]{64}$/);
  assert.equal(result.originalSourceAuthenticated,false);
  assert.equal(result.gitJudgeExecuted,false);
  assert.equal(result.remoteWrites,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('actual JVM benign failure, tampering and missing jar veto',()=>{
 const dir=fixture();try{
  assert.match(executeOriginalJvmTriplet({...valid(dir),markers:{...markers(),green:['BENIGN_CONSENT_PASS','MISSING_ORACLE_PASS']}}).status,/^BLOCKED_/);
  fs.rmSync(path.join(dir,'wrong.jar'));
  assert.match(executeOriginalJvmTriplet(valid(dir)).status,/^BLOCKED_/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('symlinks and incorrect source identities are denied without running processes',()=>{
 const dir=fixture();try{
  assert.match(executeOriginalJvmTriplet({...valid(dir),sourceHeadSha:'wrong'}).status,/^BLOCKED_/);
  const orig=path.join(dir,'original.jar');fs.renameSync(orig,orig+'.real');fs.symlinkSync(orig+'.real',orig);
  assert.match(executeOriginalJvmTriplet(valid(dir)).status,/^BLOCKED_/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('getters and proxies are rejected inertly',()=>{
 const dir=fixture();try{
  let accessed=0;const x=valid(dir);Object.defineProperty(x,'directory',{get(){accessed++;throw Error('getter');}});
  assert.match(executeOriginalJvmTriplet(x).status,/^BLOCKED_/);
  assert.match(executeOriginalJvmTriplet(new Proxy(valid(dir),{ownKeys(){accessed++;throw Error('proxy');}})).status,/^BLOCKED_/);
  assert.equal(accessed,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('invalid nested marker accessors, duplicate markers, and oversized policy are rejected before running JVM',()=>{
 const dir=fixture();try{
  let touched=0;
  const a=markers();Object.defineProperty(a,'originalFailure',{get(){touched++;throw Error('getter');}});
  assert.match(executeOriginalJvmTriplet({...valid(dir),markers:a}).status,/^BLOCKED_/);
  assert.match(executeOriginalJvmTriplet({...valid(dir),markers:{...markers(),green:['BENIGN_CONSENT_PASS','BENIGN_CONSENT_PASS']}}).status,/^BLOCKED_/);
  assert.match(executeOriginalJvmTriplet({...valid(dir),mainClass:'-Xmx1g'}).status,/^BLOCKED_/);
  assert.match(executeOriginalJvmTriplet({...valid(dir),markers:new Proxy(markers(),{get(){touched++;throw Error('get');}})}).status,/^BLOCKED_/);
  assert.equal(touched,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('corrupt archive and invalid temporary workspace fail closed',()=>{
 const dir=fixture();try{
  fs.writeFileSync(path.join(dir,'candidate.jar'),'not-a-zip');
  assert.match(executeOriginalJvmTriplet(valid(dir)).status,/^BLOCKED_/);
  const bad=valid(dir);bad.directory=path.join(dir,'../'+path.basename(dir));
  assert.match(executeOriginalJvmTriplet(bad).status,/^BLOCKED_/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('strict identity, malformed schema and marker policy all fail closed',()=>{
 const dir=fixture();try{
  for(const bad of [
   {...valid(dir),caseId:'x'},
   {...valid(dir),sourceHeadSha:'a'.repeat(39)},
   {...valid(dir),originalBlobSha:'c'.repeat(40)},
   {...valid(dir),markers:{...markers(),unsafeFailure:'ORIGINAL_FAIL'}},
   {...valid(dir),markers:{...markers(),green:null}},
   {...valid(dir),markers:{...markers(),green:['BENIGN_CONSENT_PASS']}},
   {...valid(dir),markers:{...markers(),green:['BENIGN_CONSENT_PASS',37]}},
   {...valid(dir),markers:{...markers(),green:['CONSENT_BOUNDARY_ORACLE_PASS','MISSING_ORACLE_PASS']}},
   {...valid(dir),markers:{...markers(),green:['BENIGN_CONSENT_PASS','BENIGN_MORE_PASS']}},
   {...valid(dir),markers:{...markers(),green:['BENIGN_CONSENT_PASS','CONSENT_BOUNDARY_ORACLE_PASS','ORIGINAL_FAIL']}},
   {...valid(dir),extra:true},
   {...valid(dir),directory:'relative/path'}
  ]) assert.match(executeOriginalJvmTriplet(bad).status,/^BLOCKED_/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('additional hostile nested policies, archive substitutions and hardlinks fail closed',()=>{
 const dir=fixture();try{
  const plain=valid(dir);
  for(const green of [
   [],new Array(2),['BENIGN_CONSENT_PASS','CONSENT_BOUNDARY_ORACLE_PASS','CONSENT_BOUNDARY_ORACLE_PASS'],
   new Proxy(['BENIGN_CONSENT_PASS','CONSENT_BOUNDARY_ORACLE_PASS'],{}),
   ['BENIGN_CONSENT_PASS','ORIGINAL_FAIL'],
   ['BENIGN_CONSENT_PASS','WRONG_FAIL']
  ]) assert.match(executeOriginalJvmTriplet({...plain,markers:{...markers(),green}}).status,/^BLOCKED_/);
  for(const bad of [
   {...plain,mainClass:'Oracle'},
   {...plain,caseId:'BAD CASE'},
   {...plain,originalBlobSha:'z'.repeat(40)},
   {...plain,markers:{...markers(),green:['BENIGN_CONSENT_PASS','NO_ORACLE_MARKER']}},
   {...plain,markers:{...markers(),originalFailure:'WRONG_FAIL',unsafeFailure:'WRONG_FAIL'}}
  ])assert.match(executeOriginalJvmTriplet(bad).status,/^BLOCKED_/);
  const wrong=path.join(dir,'wrong.jar'),backup=path.join(dir,'wrong-copy.jar');
  fs.renameSync(wrong,backup);
  fs.linkSync(backup,wrong);
  assert.match(executeOriginalJvmTriplet(plain).status,/^BLOCKED_/);
  fs.unlinkSync(wrong);
  fs.copyFileSync(path.join(dir,'original.jar'),wrong);
  assert.match(executeOriginalJvmTriplet(plain).status,/^BLOCKED_/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('failure marker objects never execute user-defined coercion',()=>{
 const dir=fixture();try{
  let effects=0;
  const malicious={toString(){effects++;return 'ORIGINAL_FAIL';}};
  for(const field of ['originalFailure','unsafeFailure']){
   const altered={...markers(),[field]:malicious};
   assert.match(executeOriginalJvmTriplet({...valid(dir),markers:altered}).status,/^BLOCKED_/);
  }
  assert.equal(effects,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('original JVM cannot replace the candidate artifact after it was hashed',()=>{
 const dir=fixture();try{
  const src=path.join(dir,'Oracle.java'),classes=path.join(dir,'classes');
  const candidate=path.join(dir,'candidate.jar'),decoy=path.join(dir,'decoy.jar');
  fs.copyFileSync(candidate,decoy);
  const make=(body,destination)=>{
   fs.writeFileSync(src,'package example;public class Oracle {public static void main(String[] args){'+body+'}}');
   execFileSync('javac',['-d',classes,src],{timeout:15000});
   execFileSync('jar',['cf',destination,'-C',classes,'.'],{timeout:15000});
  };
  make('System.out.println("BENIGN_CONSENT_PASS");System.out.println("WRONG_ORACLE_PASS");',candidate);
  const safe=p=>p.replaceAll('\\','\\\\').replaceAll('"','\\"');
  make('try {java.nio.file.Files.copy(java.nio.file.Path.of("'+safe(decoy)+'"),'+
    'java.nio.file.Path.of("'+safe(candidate)+'"),java.nio.file.StandardCopyOption.REPLACE_EXISTING);}' +
    'catch(Exception e){throw new RuntimeException(e);}' +
    'System.err.println("ORIGINAL_FAIL");System.exit(1);',path.join(dir,'original.jar'));
  const initial=fs.readFileSync(candidate);
  const result=executeOriginalJvmTriplet(valid(dir));
  assert.match(result.status,/^BLOCKED_/);
  assert.notDeepEqual(initial,fs.readFileSync(candidate));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('incorrect JVM exit status and escaped baseline artifacts are denied',()=>{
 const dir=fixture();try{
  const src=path.join(dir,'Oracle.java'),classes=path.join(dir,'classes');
  fs.writeFileSync(src,'package example;public class Oracle {public static void main(String[] args){System.err.println("WRONG_FAIL");System.exit(0);}}');
  execFileSync('javac',['-d',classes,src],{timeout:15000});
  execFileSync('jar',['cf',path.join(dir,'wrong.jar'),'-C',classes,'.'],{timeout:15000});
  assert.match(executeOriginalJvmTriplet(valid(dir)).status,/^BLOCKED_/);
  fs.rmSync(path.join(dir,'candidate.jar'));
  fs.mkdirSync(path.join(dir,'candidate.jar'));
  assert.match(executeOriginalJvmTriplet(valid(dir)).status,/^BLOCKED_/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
