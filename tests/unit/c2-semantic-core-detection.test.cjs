'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {sourcePathAllowed,decodePinnedGithubSource}=
 require('../../packages/orchestrator/github-pinned-full-source.cjs');
const {createHash}=require('node:crypto');
const APP='app/src/main/java/com/cardenaspiero255/gamehubultra/';
const TS='supabase/functions/ultra-research/research.ts';
function whole(path,lines){
 const body=lines.join('\n')+'\n';
 return {filename:path,status:'added',additions:lines.length,deletions:0,
  changes:lines.length,fullSource:body,
  patch:'@@ -0,0 +1,'+lines.length+' @@\n'+lines.map(x=>'+'+x).join('\n')+'\n'};
}
function rules(file){return analyze([file],{sha:'a'.repeat(40)});}
function match(output,name){return output.findings.find(x=>x.rule===name);}
const frame=[
'class FramePacingIntelligenceEngine {',
'  fun analyze() {',
'    val slowNow = orderedSlow.lastOrNull()?.timestampMs',
'    val recentSlow = orderedSlow.filter { slowNow - it.timestampMs <= policy.windowSlowMs }',
'    val fastNow = orderedFast.lastOrNull()?.timestampMs',
'    val recentFast = if (fastNow == null) {',
'      emptyList()',
'    } else {',
'      orderedFast.filter {',
'        fastNow - it.timestampMs <= policy.windowFastMs',
'      }',
'    }',
'    val pacingAvailable = recentFast.size >= policy.minSamplesFast',
'  }','}'
];
const net=[
'class NetworkGamingDiagnosticsEngine {','  fun analyze() {',
'    val latest = recent.lastOrNull()',
'    val connected = recent.asReversed().takeWhile {',
'      it.connected && it.validated &&',
'        it.networkHandle == latest.networkHandle',
'    }.asReversed()',
'    val connectionTimeline = recent.filter { it.connected && it.validated }',
'    val transportChanges = transportChanges(connectionTimeline)',
'    return analyzeLatency(connected,transportChanges)',
'  }','}'
];
const wiki=[
'function generalKnowledgeRelevance(query: string,title: string,extract: string) {',
'  const haystack = normalize(title + " " + extract);',
'  return tokens.filter((token) => haystack.includes(token)).length;',
'}',
'function generalKnowledgeIsRelevant(query: string,title: string,extract: string) {',
'  const tokenCount = generalKnowledgeTokens(query).length;',
'  const requiredMatches = tokenCount >= 2 ? 2 : 1;',
'  return generalKnowledgeRelevance(query, title, extract) >= requiredMatches;',
'}',
'async function wikipediaGeneralKnowledgeEvidence(query: string) {',
'  const selected = pages.filter((candidate) =>',
'    generalKnowledgeIsRelevant(query, candidate.title, candidate.extract));',
'  return { trustedReference: true };',
'}'
];
const news=[
'async function newsEvidence() {',
'  const usedDomains = new Set<string>();',
'  for(const raw of rawArticles) {',
'    const article = raw as JsonObject;',
'    const articleUrl = stringValue(article.url);',
'    const domain = stringValue(article.domain) ?? hostname(articleUrl);',
'    if (!domain || usedDomains.has(domain.toLowerCase())) continue;',
'    usedDomains.add(domain.toLowerCase());',
'  }',
'  const sourceIds = selected.map((article) => article.url);',
'  return { independentSourceCount: independentDomains(sourceIds) };',
'}'
];
test('C2 #159 reports stale frame window anchored to actionable fastNow line',()=>{
 const output=rules(whole(APP+'performance/framepacing/FramePacingIntelligenceEngine.kt',frame));
 const f=match(output,'STALE_FRAME_TIMING_ACCEPTED');
 assert.ok(f,JSON.stringify(output.findings));
 assert.equal(f.line,5);
 assert.equal(f.status,'NEEDS_VERIFICATION');
 assert.equal(output.coverage.partial,false);
});
test('C2 #159 corrected slow/fast clock alignment is not flagged',()=>{
 const fixed=frame.map(x=>x.includes('fastNow - it.timestampMs <=')?
  '        slowNow - it.timestampMs <= policy.windowFastMs':x);
 assert.equal(match(rules(whole(APP+'performance/framepacing/FramePacingIntelligenceEngine.kt',fixed)),
  'STALE_FRAME_TIMING_ACCEPTED'),undefined);
});
test('C2 #161 reports handle-only mixed-transport window',()=>{
 const out=rules(whole(APP+'network/diagnostics/NetworkGamingDiagnosticsEngine.kt',net));
 const f=match(out,'CROSS_TRANSPORT_LATENCY_MIX');
 assert.ok(f,JSON.stringify(out.findings));
 assert.equal(f.line,6);
});
test('C2 #161 transport-contiguous window is a negative control',()=>{
 const fixed=net.map(x=>x.includes('it.networkHandle == latest.networkHandle')?
  '        it.networkHandle == latest.networkHandle && it.transport == latest.transport':x);
 assert.equal(match(rules(whole(APP+'network/diagnostics/NetworkGamingDiagnosticsEngine.kt',fixed)),
  'CROSS_TRANSPORT_LATENCY_MIX'),undefined);
});
test('C2 #73 reports token-overlap-only Wikipedia trust, not all Wikipedia code',()=>{
 const out=rules(whole(TS,wiki));
 const f=match(out,'REFERENCE_TOPIC_MISMATCH');
 assert.ok(f,JSON.stringify(out.findings));
 assert.equal(f.line,13);
});
test('C2 #73 topical relevance guard prevents Wikipedia finding',()=>{
 const fixed=wiki.map(x=>x.includes('generalKnowledgeRelevance(query, title, extract) >=')?
  '  return topicVerified(query,title,extract) && relevant;':x);
 assert.equal(match(rules(whole(TS,fixed)),'REFERENCE_TOPIC_MISMATCH'),undefined);
});
test('C2 #73 checks source hostname vs publisher-provided domain in same verified source',()=>{
 const out=rules(whole(TS,[...news,...wiki]));
 const f=match(out,'NEWS_DOMAIN_DIVERSITY_INCONSISTENT');
 assert.ok(f,JSON.stringify(out.findings));
 assert.equal(f.line,4);
});
test('C2 #73 news checked against URL hostname has no mismatch',()=>{
 const fixed=news.map(x=>x.includes('const domain = stringValue(article.domain)')?
  '    const domain = hostname(articleUrl);':x);
 assert.equal(match(rules(whole(TS,[...fixed,...wiki])),'NEWS_DOMAIN_DIVERSITY_INCONSISTENT'),undefined);
});
test('TS source is allowed ONLY for narrow pinned research path',()=>{
 assert.equal(sourcePathAllowed(TS),true);
 for(const path of ['supabase/functions/other/research.ts','supabase/functions/x.ts',
 'supabase/functions/ultra-research/../research.ts','supabase/functions/ultra-research/research.test.ts',
 'app/src/main/java/secrets.ts'])assert.equal(sourcePathAllowed(path),false,path);
 const bytes=Buffer.from(wiki.join('\n')+'\n');
 const sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const raw={type:'file',encoding:'base64',path:TS,sha,size:bytes.length,
  content:bytes.toString('base64')};
 assert.equal(decodePinnedGithubSource(raw,{path:TS,blobSha:sha}),bytes.toString());
 assert.throws(()=>decodePinnedGithubSource({...raw,sha:'a'.repeat(40)},
  {path:TS,blobSha:sha}),/UNVERIFIED_PINNED_SOURCE/);
});
test('without attested complete source, no speculative semantic or hidden-context findings',()=>{
 for(const f of [whole(APP+'performance/framepacing/FramePacingIntelligenceEngine.kt',frame),
  whole(TS,[...news,...wiki])]){
  delete f.fullSource;
  const r=rules(f);
  assert.ok(!r.findings.some(x=>['STALE_FRAME_TIMING_ACCEPTED',
   'REFERENCE_TOPIC_MISMATCH','NEWS_DOMAIN_DIVERSITY_INCONSISTENT'].includes(x.rule)));
 }
});
test('tampered Kotlin/TS full source blocks semantic findings, not ignored',()=>{
 for(const f of [whole(APP+'performance/framepacing/FramePacingIntelligenceEngine.kt',frame),
  whole(TS,[...news,...wiki])]){
  f.fullSource=f.fullSource.replace('const','altered').replace('val ','var ');
  const out=rules(f);
  assert.equal(out.coverage.partial,true);
  assert.equal(out.verdict,'INCOMPLETE');
  assert.ok(!out.findings.some(x=>['STALE_FRAME_TIMING_ACCEPTED',
   'NEWS_DOMAIN_DIVERSITY_INCONSISTENT','REFERENCE_TOPIC_MISMATCH'].includes(x.rule)));
 }
});
test('comments and unrelated file names do not generate C2-specific rules',()=>{
 const comments=frame.map(x=>x.includes('fastNow')?'// '+x:x);
 const out=rules(whole(APP+'performance/framepacing/Unrelated.kt',comments));
 assert.equal(match(out,'STALE_FRAME_TIMING_ACCEPTED'),undefined);
 const src=rules(whole('supabase/functions/other/helper.ts',[...news,...wiki]));
 assert.ok(!src.findings.some(x=>x.rule==='REFERENCE_TOPIC_MISMATCH'||
  x.rule==='NEWS_DOMAIN_DIVERSITY_INCONSISTENT'));
});
