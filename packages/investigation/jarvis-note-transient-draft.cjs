'use strict';
/* Narrow source-to-source candidate for one pinned JARVIS note experiment.
 * This is neither a general Kotlin Fixer nor causal proof or permission to
 * repair any application. The product contract and JVM oracle stay separate. */
const {createHash}=require('node:crypto');
const {types}=require('node:util');
const COMMIT='747c14b5d97750a7b2736968e2d516f02448558d';
const FILE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/LocalDialogue.kt';
const ORIGINAL='6e1117c05fe585fc843dddd8143042e7f49238f4';
const edits=Object.freeze([
 Object.freeze([
  '    private val turns = mutableListOf<String>()',
  '    private data class Turn(val text: String, val persistent: Boolean)\n'+
  '    private val turns = mutableListOf<Turn>()\n'+
  '    private var lastAnswerEphemeral = false'
 ]),
 Object.freeze([
  '        turns.add("Tú: $sanitized".take(400))\n'+
  '        turns.add("JARVIS: $answer".take(400))',
  '        val transientAnswer = (importedNote != null && answer == importedNote) ||\n'+
  '            ((normalized == "repitelo" || normalized == "repite") && lastAnswerEphemeral)\n'+
  '        turns.add(Turn("Tú: $sanitized".take(400), true))\n'+
  '        turns.add(Turn("JARVIS: $answer".take(400), !transientAnswer))'
 ]),
 Object.freeze(['        lastAnswer = answer',
   '        lastAnswerEphemeral = transientAnswer\n        lastAnswer = answer']),
 Object.freeze(['    fun history(): List<String> = turns.toList()',
   '    fun history(): List<String> = turns.map { it.text }']),
 Object.freeze(['        val lines = turns.takeLast(24).toMutableList()',
   '        val lines = turns.filter { it.persistent }.map { it.text }.takeLast(24).toMutableList()']),
 Object.freeze(['                turns.add(bounded)',
   '                turns.add(Turn(bounded, true))']),
 Object.freeze(['        lastAnswer = turns.lastOrNull { it.startsWith("JARVIS: ") }\n'+
   '            ?.removePrefix("JARVIS: ")',
   '        lastAnswer = turns.lastOrNull { it.text.startsWith("JARVIS: ") }\n'+
   '            ?.text?.removePrefix("JARVIS: ")']),
 Object.freeze(['        turns.clear()\n        lastAnswer = null',
   '        turns.clear()\n        lastAnswerEphemeral = false\n        lastAnswer = null'])
]);
const blobSha=source=>{
 const bytes=Buffer.from(source,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
};
function createTransientNoteCandidate(source){
 if(typeof source!=='string'||source.length<100||Buffer.byteLength(source,'utf8')>60000||
  source.includes('\0')||source.includes('\r')||!source.endsWith('\n'))return null;
 const pairedRows=['turns.add("Tú: $sanitized".take(400))',
  'turns.add("JARVIS: $answer".take(400))'];
 for(const part of pairedRows){
  const i=source.indexOf(part);
  if(i<0||source.indexOf(part,i+part.length)!==-1)return null;
 }
 let candidate=source;
 for(const [before,after] of edits){
  const first=candidate.indexOf(before);
  if(first<0||candidate.indexOf(before,first+before.length)!==-1)return null;
  candidate=candidate.slice(0,first)+after+candidate.slice(first+before.length);
 }
 return candidate!==source?candidate:null;
}
function reject(){return Object.freeze({status:'BLOCKED_NOT_PINNED_OR_UNAMBIGUOUS',
 sourceRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
 ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
 productionReleaseAllowed:false});}
function record(value,keys){
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||
  Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).length!==keys.length)
  throw Error('INVALID_INPUT');
 const out={};
 for(const key of keys){
  const desc=Object.getOwnPropertyDescriptor(value,key);
  if(!desc||!Object.hasOwn(desc,'value'))throw Error('INVALID_INPUT');
  out[key]=desc.value;
 }
 return out;
}
function draftPinnedJarvisNoteCandidate(options){
 try{
  const data=record(options,['expectedCommitSha','file']);
  const file=record(data.file,['path','source','expectedBlobSha']);
  if(data.expectedCommitSha!==COMMIT||file.path!==FILE||
   file.expectedBlobSha!==ORIGINAL||typeof file.source!=='string'||
   blobSha(file.source)!==ORIGINAL)return reject();
  const candidateSource=createTransientNoteCandidate(file.source);
  if(candidateSource===null)return reject();
  return Object.freeze({status:'CANDIDATE_REQUIRES_PRODUCT_CONTRACT_AND_INDEPENDENT_JVM_ORACLE',
   rule:'TRANSIENT_NOTE_HISTORY_PERSISTENCE',path:FILE,expectedCommitSha:COMMIT,
   originalBlobSha:ORIGINAL,candidateBlobSha:blobSha(candidateSource),candidateSource,
   sourceRepositoryAuthenticated:false,productContractConfirmed:false,
   originalFunctionalOracleVerified:false,generatedByGeneralFixer:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
   productionReleaseAllowed:false});
 }catch{return reject();}
}
module.exports=Object.freeze({createTransientNoteCandidate,draftPinnedJarvisNoteCandidate});
