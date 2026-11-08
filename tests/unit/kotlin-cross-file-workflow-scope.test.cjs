'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');

const file=path.join(__dirname,'../../.github/workflows/real-kotlin-cross-file-functional-judge.yml');
const workflow=fs.readFileSync(file,'utf8');
const match=workflow.match(/^  pull_request:\n    paths:\n((?:      - .+\n)+)/m);

function matches(pattern,value){
 let regex='^';
 for(let i=0;i<pattern.length;i++){
  const char=pattern[i];
  if(char==='*'&&pattern[i+1]==='*'){regex+='.*';i++;}
  else if(char==='*')regex+='[^/]*';
  else regex+=char.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&');
 }
 return new RegExp(regex+'$').test(value);
}

test('original Kotlin Judge runs when its inputs and transitive local dependencies change',()=>{
 assert.ok(match,'pull-request paths are present for this workflow');
 const patterns=match[1].trim().split('\n').map(line=>line.trim().slice(2));
 assert.ok(patterns.every(p=>!p.startsWith('!')),'no later exclusion overrides a required input');
 const paths=[
  'scripts/c2-live-causal-campaign.sh',
  'scripts/c2-pr185-numeric-factorial.sh',
  'scripts/c2-cross-file-kotlin-negative-control.sh',
  'scripts/c2-cross-file-kotlin-bridge.cjs',
  'tests/oracles/c2-run17-battery-abi.kt',
  'tests/oracles/c2-pr185-numeric-factorial-oracle.kt',
  'packages/recovery/cross-file-kotlin-functional-judge.cjs',
  'packages/recovery/cross-file-sandbox-reproduction.cjs',
  'packages/recovery/repair-judge.cjs',
  'packages/recovery/sandbox-rollback.cjs',
  'packages/recovery/git-sandbox-policy.cjs',
  'packages/investigation/novel-kotlin-path-policy.cjs',
  'packages/kotlin-semantic/C2OptionalKotlinSemantic.kt',
  'packages/family-hunter/committed-kotlin-import-graph.cjs',
  'tests/fixtures/c2-kotlin-semantic/C2SymbolResolutionOracleTest.kt',
  'tests/unit/committed-kotlin-semantic-claims.test.cjs',
  'tests/unit/kotlin-cross-file-workflow-scope.test.cjs',
  '.github/workflows/real-kotlin-cross-file-functional-judge.yml'
 ];
 for(const input of paths)assert.ok(patterns.some(p=>matches(p,input)),`workflow does not cover ${input}`);
});
test('the verified compiler executes the semantic binding fixture before the protected original oracle',()=>{
 const fixture=workflow.indexOf('bash tests/fixtures/c2-kotlin-semantic/run-compiler-integration.sh');
 assert.ok(fixture>workflow.indexOf('Fetch and verify Kotlin compiler 2.0.21'));
 assert.ok(fixture<workflow.indexOf('Require real Bubblewrap plus enforced AppArmor'));
 assert.ok(workflow.includes('bash tests/fixtures/c2-kotlin-semantic/run-compiler-binding-integration.sh'));
 assert.ok(workflow.includes('"$RUNNER_TEMP/oracle-kotlin/kotlinc"'));
});
