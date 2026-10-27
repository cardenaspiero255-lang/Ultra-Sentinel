'use strict';
/*
 * Bounded, attested-source structural hypotheses. No dynamic execution, no
 * automatic remediation. These patterns are regression monitors for known C2
 * behaviors, not blind labels or proof of semantic reliability.
 */
const {knownDefectRegressionCandidates}=require('./c2-known-defect-regressions.cjs');
const RESEARCH='supabase/functions/ultra-research/research.ts';
const FRAME='/performance/framepacing/FramePacingIntelligenceEngine.kt';
const NETWORK='/network/diagnostics/NetworkGamingDiagnosticsEngine.kt';
function semanticCandidates({path,lines,added,active}={}){
 if(typeof path!=='string'||!Array.isArray(lines)||lines.length>10000||
  !Array.isArray(added)||!active||typeof active.get!=='function')
  return [];
 const findings=[];
 const body=lines.join('\n');
 const addedLine=(predicate)=>added.find(row=>
  Number.isSafeInteger(row.line)&&row.line>0&&
  typeof active.get(row.line)==='string'&&predicate(active.get(row.line),row.text));
 const emit=(anchor,rule,why,check)=>{
  if(!anchor)return;
  findings.push(Object.freeze({rule,line:anchor.line,text:anchor.text,
   severity:'MEDIUM',confidence:'medium',reason:why,verification:check}));
 };
 if(path.endsWith(FRAME)){
  const anchor=addedLine(code=>/\bval\s+fastNow\s*=\s*orderedFast\.lastOrNull\(\)\?\.timestampMs/.test(code));
  if(anchor&&/\bval\s+slowNow\s*=/.test(body)&&
   /\bfastNow\s*-\s*it\.timestampMs\s*<=\s*policy\.windowFastMs/.test(body)&&
   /\brecentFast\.size\s*>=\s*policy\.minSamplesFast/.test(body)&&
   !/\bslowNow\s*-\s*it\.timestampMs\s*<=\s*policy\.windowFastMs/.test(body)){
    emit(anchor,'STALE_FRAME_TIMING_ACCEPTED',
     'La ventana rápida usa el reloj de su propia última muestra: podría aceptar frames antiguos frente a la ventana lenta.',
     'Reproducir desfase grande entre muestras lentas y rápidas y comprobar pacingAvailability.');
  }
 }
 if(path.endsWith(NETWORK)){
  const anchor=addedLine(code=>/\bit\.networkHandle\s*==\s*latest\.networkHandle/.test(code));
  const block=body.match(/\btakeWhile\s*\{([\s\S]{0,600}?)\}/)?.[1]||'';
  if(anchor&&/\btransportChanges\s*=\s*transportChanges\(connectionTimeline\)/.test(body)&&
   /\bit\.networkHandle\s*==\s*latest\.networkHandle/.test(block)&&
   !/\bit\.transport\s*==\s*latest\.transport/.test(block)){
    emit(anchor,'CROSS_TRANSPORT_LATENCY_MIX',
     'Una ventana por networkHandle sin continuidad de transporte podría mezclar latencias de distintas redes.',
     'Medir mismo handle al cambiar WIFI/CELLULAR y comprobar historia y media calculada.');
  }
 }
 if(path===RESEARCH){
  const wikiAnchor=addedLine(code=>/\btrustedReference\s*:\s*true\b/.test(code));
  if(wikiAnchor&&/\bfunction\s+generalKnowledgeIsRelevant\s*\(/.test(body)&&
   /\bconst\s+requiredMatches\s*=\s*tokenCount\s*>=\s*2\s*\?\s*2\s*:\s*1/.test(body)&&
   /\bgeneralKnowledgeRelevance\(query,\s*title,\s*extract\)\s*>=\s*requiredMatches/.test(body)&&
   /\bgeneralKnowledgeIsRelevant\(query,\s*candidate\.title,\s*candidate\.extract\)/.test(body)){
    emit(wikiAnchor,'REFERENCE_TOPIC_MISMATCH',
     'La confianza de la referencia depende del solapamiento de tokens, no de que el extracto responda al tema.',
     'Consultar pregunta atmosférica con una página musical de título similar y comprobar abstención.');
  }
  // This pre-existing risk may be outside added hunks; report only when
  // the edited file is fully attested to immutable HEAD and exact hunk text.
  const newsLine=lines.findIndex(x=>/^\s*const\s+article\s*=\s*raw\s+as\s+JsonObject\s*;?\s*$/.test(x));
  if(added.length>0&&newsLine>=0&&
   /\bconst\s+domain\s*=\s*stringValue\(article\.domain\)\s*\?\?\s*hostname\(articleUrl\)/.test(body)&&
   /\busedDomains\.add\(domain\.toLowerCase\(\)\)/.test(body)&&
   /\bindependentSourceCount\s*:\s*independentDomains\(sourceIds\)/.test(body)){
    emit({line:newsLine+1,text:lines[newsLine]},'NEWS_DOMAIN_DIVERSITY_INCONSISTENT',
     'La selección usa un dominio declarado por el proveedor pero el recuento independiente usa los hostnames reales.',
     'Dos artículos con URLs del mismo hostname y dominios declarados distintos deben causar abstención.');
  }
 }
 // A start-anchored Regex plus containsMatchIn is only a prefix test.
 // Flag it when used to accept a COMPLETE result, not for ordinary search.
 // This is a hypothesis; source code and original execution must corroborate.
 for(const row of added){
  const code=active.get(row.line);
  if(typeof code!=='string')continue;
  const match=code.match(/\b([A-Za-z_]\w*)\.containsMatchIn\s*\(/);
  if(!match)continue;
  const prior=lines.slice(Math.max(0,row.line-5),row.line).join('\n');
  if(!/\b(?:val|var)\s+(?:outputIs|resultIs|identityIs|evidenceIs|isVerified|isValid|validOutput)[A-Za-z_0-9]*\s*=/i.test(prior))
   continue;
  const patternName=match[1];
  const sourceRegex=new RegExp('\\b(?:val|var)\\s+'+patternName+
   '\\s*=\\s*Regex\\s*\\(\\s*"\\^');
  if(!lines.some(line=>sourceRegex.test(line)))continue;
  emit(row,'REGEX_PREFIX_ACCEPTED_AS_FULL_EVIDENCE',
   'Un patrón anclado solo al inicio se usa para validar una salida completa; un sufijo inesperado puede pasar.',
   'Ejecutar con el código original entradas con sufijos extraños y salidas benignas completas; exigir rechazo de sufijos y preservación de formatos válidos.');
 }
 for(const risk of knownDefectRegressionCandidates({path,lines,added,active}))
  findings.push(risk);
 return findings;
}
module.exports={semanticCandidates};
