'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {analyzeFamilies}=require('../../packages/family-hunter/ultra_sentinel_family_fingerprints.cjs');
const {planRepair}=require('../../packages/recovery/supervised-repair.cjs');
const PATH='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/CompanionResultPolicy.kt';
const SHA='b'.repeat(40);
function scan(source,path=PATH){
 const lines=source.slice(0,-1).split('\n');
 return analyze([{filename:path,status:'added',changes:lines.length,
  additions:lines.length,deletions:0,
  patch:'@@ -0,0 +1,'+lines.length+' @@\n'+lines.map(x=>'+'+x).join('\n')+'\n',
  fullSource:source}],{sha:SHA,sourceScope:'KOTLIN_JVM_V3_EXPERIMENTAL'});
}
test('unregistered anchored regex prefix validation reaches Core Family and Fixer',()=>{
 const source=[
  'class IdentityProbe {',
  '  private val uidPattern = Regex("^uid=[0-9]+(?:\\\\s|$)")',
  '  fun verify(stdout: String): Boolean {',
  '    val outputIsUidOnly = stdout.length <= 256 &&',
  '      uidPattern.containsMatchIn(stdout.trim())',
  '    return outputIsUidOnly',
  '  }','}',''].join('\n');
 const analysis=scan(source);
 assert.equal(analysis.coverage.partial,false);
 const finding=analysis.findings.find(f=>f.rule==='REGEX_PREFIX_ACCEPTED_AS_FULL_EVIDENCE');
 assert.ok(finding,'Core must detect unbounded positive acceptance of trailing data');
 const hunter=analyzeFamilies(analysis);
 assert.ok(hunter.families.some(f=>f.rule===finding.rule));
 const fixer=planRepair({analysis});
 assert.equal(fixer.status,'HUMAN_REVIEW_REQUIRED');
 assert.ok(fixer.steps.some(s=>s.rule===finding.rule));
 assert.equal(fixer.commitAllowed,false);
});
test('legitimate substring searches and unrelated match calls stay below the review heuristic',()=>{
 const source=[
  'class SearchProbe {',
  '  private val pattern = Regex("^hello")',
  '  fun search(stdout: String): Boolean =',
  '    pattern.containsMatchIn(stdout)',
  '}',''].join('\n');
 const result=scan(source);
 assert.ok(!result.findings.some(f=>f.rule==='REGEX_PREFIX_ACCEPTED_AS_FULL_EVIDENCE'));
});
