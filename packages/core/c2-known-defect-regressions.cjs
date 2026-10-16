'use strict';
/*
 * Conservative regression rules for 3 ALREADY-MEASURED held-out failures.
 * These known sources are TRAINING/REGRESSION cases after first unblinding.
 * Do not represent them as fresh blind recall, precision, or FP validation.
 * The Core must supply full original Git-blob-attested source and verified
 * executable added lines. No dynamic execution or automatic remediation.
 */
const RESEARCH_GRAPH='/ai/UltraFrontierV2.kt';
const SPEECH_CHUNKER='/voice/UltraSpeechChunker.kt';
const CONTINUOUS_VOICE='/voice/ContinuousVoiceController.kt';
function knownDefectRegressionCandidates({path,lines,added,active}={}){
 if(typeof path!=='string'||!Array.isArray(lines)||lines.length>10000||
  !Array.isArray(added)||!active||typeof active.get!=='function')return [];
 const risks=[];
 const addExecutable=(predicate)=>added.some(row=>
  Number.isSafeInteger(row?.line)&&row.line>0&&
  typeof active.get(row.line)==='string'&&
  predicate(active.get(row.line),row.line));
 const emit=(line,rule,why,check)=>{
  if(!Number.isSafeInteger(line)||line<1||line>lines.length)return;
  risks.push(Object.freeze({
   rule,line,text:lines[line-1],
   severity:'MEDIUM',confidence:'medium',reason:why,verification:check
  }));
 };
 if(path.endsWith(RESEARCH_GRAPH)){
  const text=lines.join('\n');
  // Unit case matters in the *value* too. Preserving only the claimId
  // does not protect values: 8 GB != 8 Gb.
  const evidenceLine=lines.findIndex(x=>
   /^\s*normalizedValue\s*=\s*normalize\(evidence\.normalizedValue\)\s*,?\s*$/.test(x))+1;
  const introducedRelatedChange=addExecutable((code,line)=>
   line>=evidenceLine-4&&line<=evidenceLine+4&&
   /^\s*claimId\s*=\s*normalizeClaimId\(evidence\.claimId\)\s*,?\s*$/.test(code));
  if(evidenceLine>0&&introducedRelatedChange&&
   /\bclass\s+UltraFrontierV2ClaimProvenanceGraph\b/.test(text)&&
   /\bval\s+normalizedPreferred\s*=\s*normalize\(preferredValue\)/.test(text)&&
   /\bit\.normalizedValue\s*==\s*normalizedPreferred/.test(text)&&
   /\bit\.normalizedValue\s*!=\s*normalizedPreferred/.test(text)&&
   /\bprivate\s+fun\s+normalize\(\s*value:\s*String\s*\)\s*:\s*String\s*=\s*value\.trim\(\)\.lowercase\(Locale\.ROOT\)/.test(text)){
    emit(evidenceLine,'CLAIM_VALUE_UNIT_CASE_COLLISION',
     'El ID de investigación conserva mayúsculas, pero los valores se convierten a minúsculas: unidades GB/Gb distintas pueden aparecer corroboradas.',
     'Ejecutar el grafo original con dos fuentes 8 GB/8 Gb, probar control numérico y confirmar que las unidades no colisionan.');
  }
 }
 if(path.endsWith(SPEECH_CHUNKER)){
  const begin=lines.findIndex(x=>/^\s*fun\s+chunk\(\s*text:\s*String\b/.test(x));
  const boundary=begin<0?-1:lines.findIndex((x,i)=>i>begin&&
   /^\s*val\s+boundary\s*=\s*sentenceBoundary\s*\?:\s*wordBoundary\s*\?:\s*maxChars\s*$/.test(x));
  const cut=boundary<0?-1:lines.findIndex((x,i)=>i>boundary&&
   /\bremaining\.substring\(\s*0\s*,\s*boundary\s*\)/.test(x));
  if(begin>=0&&boundary>begin&&cut>boundary&&cut-boundary<14&&
   addExecutable((code,line)=>line===cut+1&&
    /\bremaining\.substring\(\s*0\s*,\s*boundary\s*\)/.test(code))&&
   lines.slice(begin,cut+1).some(x=>/\bwhile\s*\(\s*remaining\.length\s*>\s*maxChars\s*\)/.test(x))&&
   !/(?:isHighSurrogate|isLowSurrogate|isSurrogatePair|codePointAt|offsetByCodePoints|adjustedToCodePointBoundary|safeBoundary)/.test(
    lines.slice(boundary,cut+1).join('\n'))){
    emit(cut+1,'TTS_UTF16_SURROGATE_SPLIT',
     'El corte por índice UTF-16 puede separar un par sustituto cuando un emoji cae en el límite de un chunk de TTS.',
     'Verificar pares sustitutos en límites 32 y 800 y casos de texto ASCII y emoji fuera del límite.');
  }
 }
 if(path.endsWith(CONTINUOUS_VOICE)){
  const begin=lines.findIndex(x=>/^\s*fun\s+setEnabled\(\s*enabled:\s*Boolean\s*\)/.test(x));
  if(begin>=0){
   const next=lines.findIndex((x,i)=>i>begin&&
    /^\s*(?:private|public|internal|override|protected)\s+fun\s+/.test(x));
   const end=next<0?lines.length:next;
   const body=lines.slice(begin,end).join('\n');
   const denied=body.match(/if\s*\(\s*!gateway\.hasRecordAudioPermission\(\)\s*\)\s*\{([\s\S]*?)\}/);
   const deniedBody=denied?.[1]||'';
   const denialLine=lines.findIndex((x,i)=>i>=begin&&i<end&&
    /^\s*if\s*\(\s*!gateway\.hasRecordAudioPermission\(\)\s*\)\s*\{\s*$/.test(x))+1;
   const changedNear=addExecutable((code,line)=>
    line>begin+1&&line<=end&&
    /\b(?:gateway\.stopWakeService\(\)|gateway\.setEnabled\(false\)|disableAfterStartFailure\(\))/.test(code));
   if(denialLine>0&&changedNear&&
    /\breturn\s+ContinuousVoiceChange\.PERMISSION_REQUIRED\b/.test(deniedBody)&&
    !/\bgateway\.setEnabled\s*\(\s*false\s*\)|\bgateway\.stopWakeService\s*\(|\bdisableAfter(?:Permission|Start)Failure\s*\(/.test(deniedBody)){
     emit(denialLine,'STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED',
      'setEnabled(true) devuelve PERMISSION_REQUIRED sin apagar un estado enabled ya guardado ni detener el servicio.',
      'Reproducir permiso revocado con estado previo enabled=true y comparar con resumeIfEnabled(), cierre y excepción de servicio.');
   }
  }
 }
 return risks;
}
module.exports={knownDefectRegressionCandidates};
