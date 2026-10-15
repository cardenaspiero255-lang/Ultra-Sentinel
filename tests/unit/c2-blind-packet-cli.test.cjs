'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {readFrozenBlindPacket}=require('../../scripts/create-c2-blind-packet.cjs');
const {PRS}=require('../../packages/quality-gates/live-gamehub-c2-cohort.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
function capture(){
 return {schema:'ultra-sentinel-c2-live-cohort/v1',
  repository:REPO,prs:[...PRS],captureStatus:'CANDIDATE_SNAPSHOT_ONLY',
  samples:PRS.map((pr,i)=>({
   pr,repository:REPO,
   headSha:String.fromCharCode(97+i).repeat(40),
   baseSha:String.fromCharCode(102+i).repeat(40),
   changedFiles:5,readerStatus:'AUTHENTICATED_SOURCE_DIFF',
   checks:{observedState:'OBSERVED_SUCCESS_UNATTESTED'},
   candidate:{coverage:{partial:false},findings:[{
    rule:'SPEECH_REENTRANT_RETRY',path:'secret/private.kt',line:42,
    evidence:'SENSITIVE_CANDIDATE_FINDING_NEVER_EXPORT'
   }]}
  }))
 };
}
test('offline C2 packet contains only four frozen PR identities and no model findings',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-blind-'));
 try{
  const f=path.join(dir,'c2.json');fs.writeFileSync(f,JSON.stringify(capture()));
  const packet=readFrozenBlindPacket(f);
  assert.deepEqual(packet.packet.cases.map(c=>c.pr),[...PRS]);
  assert.match(packet.digest,/^[0-9a-f]{64}$/);
  assert.equal(packet.independentReviewCertified,false);
  assert.equal(packet.truthLabelsIncluded,false);
  assert.doesNotMatch(JSON.stringify(packet),/SENSITIVE_CANDIDATE|secret\/private|SPEECH_REENTRANT_RETRY/);
  const proc=spawnSync(process.execPath,[
   path.resolve(__dirname,'../../scripts/create-c2-blind-packet.cjs'),f
  ],{encoding:'utf8',env:{PATH:process.env.PATH,HOME:dir}});
  assert.equal(proc.status,0,proc.stderr);
  assert.equal(JSON.parse(proc.stdout).digest,packet.digest);
  assert.doesNotMatch(proc.stdout,/SENSITIVE_CANDIDATE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('stale, modified, incomplete, mislabeled and unsafe source files fail closed',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-blind-fail-'));
 try{
  const f=path.join(dir,'c2.json'),src=capture();
  const invalids=[
   {...src,captureStatus:'INCOMPLETE_NOT_CERTIFIABLE'},
   {...src,prs:[132,159,161,163]},
   {...src,samples:src.samples.map((s,i)=>i===0?{...s,status:'BLOCKED_INCOMPLETE_OR_STALE'}:s)},
   {...src,samples:src.samples.map((s,i)=>i===0?{...s,checks:{observedState:'BLOCKED_SOURCE_CI'}}:s)},
   {...src,samples:src.samples.map((s,i)=>i===0?{...s,candidate:{coverage:{partial:true}}}:s)}
  ];
  for(const bad of invalids){
   fs.writeFileSync(f,JSON.stringify(bad));
   assert.throws(()=>readFrozenBlindPacket(f));
  }
  fs.writeFileSync(f,JSON.stringify(src));
  assert.throws(()=>readFrozenBlindPacket('relative.json'),/ABSOLUTE_C2_CAPTURE_FILE_REQUIRED/);
  const link=path.join(dir,'link.json');fs.symlinkSync(f,link);
  assert.throws(()=>readFrozenBlindPacket(link),/UNSAFE_C2_CAPTURE_FILE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
