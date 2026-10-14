'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {evaluateFile}=require('../../scripts/evaluate-shadow-parity.cjs');
const repo='cardenaspiero255-lang/gamehub-ultra',sha='a'.repeat(40);
const finding=(rule,line)=>({rule,path:'app/src/main/java/voice/Ultra.kt',line});
test('CLI evaluates validated offline corpus without claiming certification',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-parity-cli-'));
 try{
  const file=path.join(dir,'campaign.json');
  const corpus={schema:'ultra-sentinel-parity-campaign/v1',samples:[{
   repository:repo,pr:132,headSha:sha,baseSha:'b'.repeat(40),sourceCheckState:'SUCCESS',
   labels:[{...finding('SPEECH_REENTRANT_RETRY',4),positive:true},
    {...finding('UNSCOPED_COROUTINE',9),positive:false}],
   baseline:[],candidate:[finding('SPEECH_REENTRANT_RETRY',4)]
  }]};
  fs.writeFileSync(file,JSON.stringify(corpus));
  const result=evaluateFile(file);
  assert.equal(result.samples[0].candidate.tp,1);
  assert.equal(result.sourceChecksIndependentlyVerified,false);
  assert.equal(result.semanticEquivalenceCertified,false);
  const output=spawnSync(process.execPath,[path.resolve(__dirname,'../../scripts/evaluate-shadow-parity.cjs'),file],{
   encoding:'utf8',env:{PATH:process.env.PATH,HOME:dir}});
  assert.equal(output.status,0);
  assert.equal(JSON.parse(output.stdout).verdict,'EVALUATION_ONLY_NOT_CERTIFIED');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('CLI rejects invalid documents and linked or relative files',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-parity-bad-'));
 try{
  const file=path.join(dir,'invalid.json');fs.writeFileSync(file,'{"schema":"bad"}');
  assert.throws(()=>evaluateFile(file));
  assert.throws(()=>evaluateFile('relative.json'),/ABSOLUTE_CAMPAIGN_FILE_REQUIRED/);
  const link=path.join(dir,'link.json');fs.symlinkSync(file,link);
  assert.throws(()=>evaluateFile(link),/INVALID_CAMPAIGN_FILE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
