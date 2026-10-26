'use strict';
/* A quarantined, exact-source GameHub #151 thermal regression hypothesis.
 * DOES NOT modify frozen Core or count as held-out defect truth.
 */
const crypto=require('node:crypto');
const PATH='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt';
const HEAD='9ad983576c16c6c34d59283979d83c69ede50dce';
const BLOB='adb11032b9b7f62f865228dfa1c27258ca3fa0df';
function reject(){throw Error('GAMEHUB_HUNTER_REJECTED');}
function sha1Blob(data){
 const b=Buffer.from(data,'utf8');
 return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}
function inspectFrozenGameHubThermal({source,path,sourceSha,experimentalFixture=false}={}){
 if(typeof source!=='string'||source.length<10||source.length>100000||
  source.includes('\r')||source.includes('\0')||!source.endsWith('\n')||
  !Buffer.from(source,'utf8').toString('utf8')===source||
  path!==PATH||sourceSha!==HEAD)reject();
 const blob=sha1Blob(source);
 if(experimentalFixture!==true&&blob!==BLOB)reject();
 const lines=source.split('\n'),findings=[];
 if(/\bHIGH_THERMAL_HEADROOM\s*=\s*0\.80f\b/.test(source)&&
    source.includes('object AiSessionCoach')){
  let inBlockComment=false;
  for(let i=0;i<lines.length;i++){
   const raw=lines[i],line=raw.trim();
   if(line.startsWith('/*'))inBlockComment=true;
   if(!inBlockComment&&!line.startsWith('//')&&
      !/^\s*(?:val|var)\s+\w+\s*=\s*["']/.test(line)){
    const code=line.split('//')[0];
    if(/!it\.isNaN\(\)\s*&&\s*it\s*>=\s*HIGH_THERMAL_HEADROOM/.test(code)&&
       /snapshot\.thermalHeadroom\?\.let/.test(code)||
       /^!sample\.thermalHeadroom\.isNaN\(\)\s*&&/.test(code)||
       /^!current\.thermalHeadroom\.isNaN\(\)\s*&&/.test(code))
      findings.push(i+1);
   }
   if(line.includes('*/'))inBlockComment=false;
  }
 }
 return Object.freeze({
  status:'SOURCE_HYPOTHESIS_NOT_CAUSAL_TRUTH',
  path,sourceCommit:HEAD,sourceBlobSha:blob,
  lines:Object.freeze(findings),
  frozenCoreModified:false,canAuthorizeRepair:false,scorableGoldLabel:false,
  experimentalFixture,sourceVerified:!experimentalFixture&&blob===BLOB
 });
}
module.exports={inspectFrozenGameHubThermal,PATH,HEAD,BLOB,sha1Blob};
