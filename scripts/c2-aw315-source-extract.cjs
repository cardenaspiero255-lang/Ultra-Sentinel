#!/usr/bin/env node
'use strict';
/* Execute *verbatim* source-scoped upstream Kotlin, not a transcription.
 * ActivityWatch #315 is publicly known development material before C2 cutoff.
 * Never enroll in GOLD or blind holdout.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const fail=()=>{throw Error('C2_AW315_BLOCKED');};
const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
const PROLOGUE=`package net.activitywatch.android

import java.util.concurrent.Executors

private const val TAG = "RustInterface"
internal object BuildConfig { var SERVER_PORT:Int = 57031 }
internal object Log {
 fun e(tag:String,message:String):Int = 0
 fun w(tag:String,message:String):Int = 0
 fun w(tag:String,message:String,cause:Throwable):Int = 0
 fun i(tag:String,message:String):Int = 0
}
internal class Looper { companion object { fun getMainLooper()=Looper() } }
internal class Handler(val looper:Looper) {
 fun post(block:()->Unit) { block() }
}
`;
function oneSlice(source,start,end){
 if(typeof source!=='string'||source.length<30||source.length>500000||
    !source.includes(start)||source.indexOf(start)!==source.lastIndexOf(start))fail();
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 if(b<=a||source.indexOf(end,b+end.length)!==-1)fail();
 const body=source.slice(a,b).trimEnd();
 if(!body.endsWith('    }'))fail();
 return body;
}
function sourceSlices(base,head){
 const methodStart='    fun startServerTask() {';
 const next='\n    fun createBucketHelper(';
 const originalMethod=oneSlice(base,methodStart,next);
 const fixedMethod=oneSlice(head,methodStart,next);
 const hStart='internal enum class PortProbe';
 const hEnd='class RustInterface(context: Context? = null) {';
 if(typeof head!=='string'||!head.includes(hStart)||head.indexOf(hStart)!==head.lastIndexOf(hStart)||
   !head.includes(hEnd)||head.indexOf(hEnd)!==head.lastIndexOf(hEnd))fail();
 const fixedHelpers=head.slice(head.indexOf(hStart),head.indexOf(hEnd)).trimEnd();
 if(!originalMethod.includes('val socket = java.net.ServerSocket(BuildConfig.SERVER_PORT)')||
   !originalMethod.includes('catch (e: java.net.BindException)')||
   originalMethod.includes('probeServerPort')||
   !fixedMethod.includes('when (probeServerPort(BuildConfig.SERVER_PORT))')||
   !fixedMethod.includes('PortProbe.SOCKET_DENIED')||
   !fixedHelpers.includes('catch (e: java.io.IOException)')||
   !fixedHelpers.includes('catch (e: SecurityException)')||
   !fixedHelpers.includes('onDenied(e)'))fail();
 const wrapper=m=>`\nclass RustInterface {
 companion object { var serverStarted=false }
 private fun startServer(port:Int) { error("native server must not be invoked") }
${m}
}
`;
 const originalSource=PROLOGUE+wrapper(originalMethod);
 const fixedSource=PROLOGUE+'\n'+fixedHelpers+'\n'+wrapper(fixedMethod);
 return {originalMethod,fixedMethod,fixedHelpers,originalSource,fixedSource,
  originalMethodSha256:sha256(originalMethod),fixedMethodSha256:sha256(fixedMethod),
  originalSourceSha256:sha256(originalSource),fixedSourceSha256:sha256(fixedSource),
  newGoldLabels:0,trainingExcludedAsKnownDevelopment:true};
}
function run(argv){
 if(argv.length!==3)fail();
 const [baseFile,headFile,folder]=argv;
 if(![baseFile,headFile,folder].every(p=>typeof p==='string'&&p.startsWith('/')&&
    !p.includes('..')))fail();
 if(fs.readdirSync(folder).length)fail();
 const read=p=>{
  const st=fs.lstatSync(p);
  if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<100||st.size>500000)fail();
  return fs.readFileSync(p,'utf8');
 };
 const o=sourceSlices(read(baseFile),read(headFile));
 for(const [name,source] of [['original.kt',o.originalSource],['fixed.kt',o.fixedSource]]){
  fs.writeFileSync(folder+'/'+name,source,{flag:'wx',mode:0o600});
 }
 const meta={schema:'c2-aw315-sliced-production-source/v1',
  originalMethodSha256:o.originalMethodSha256,fixedMethodSha256:o.fixedMethodSha256,
  originalSourceSha256:o.originalSourceSha256,fixedSourceSha256:o.fixedSourceSha256,
  sourceScope:'VERBATIM_UPSTREAM_METHOD_WITH_TRUSTED_ABI',
  externalPr:315,trainingExcludedAsKnownDevelopment:true,newGoldLabels:0,
  originalPrSourceExecuted:false,truthSealed:false,holdoutFrozen:false,
  tripleSPlusCertified:false};
 fs.writeFileSync(folder+'/source-metadata.json',JSON.stringify(meta,null,2)+'\n',{flag:'wx',mode:0o600});
 return meta;
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(run(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_AW315_BLOCKED\n');process.exitCode=2;}
}
module.exports={sourceSlices,run};
