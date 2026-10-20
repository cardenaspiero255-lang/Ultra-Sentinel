'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'../..');
const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/c2-detekt-original-rule-executable-oracles.yml'),'utf8');
const exception=fs.readFileSync(path.join(ROOT,'tests/fixtures/c2-detekt-kotlin-oracle/C2IndependentExceptionOracleTest.kt'),'utf8');
const imports=fs.readFileSync(path.join(ROOT,'tests/fixtures/c2-detekt-kotlin-oracle/C2IndependentImportOracleTest.kt'),'utf8');

test('only the owner can start four pinned BEFORE/AFTER actual Kotlin source oracle phases',()=>{
 assert.match(workflow,/github\.event\.repository\.id == 1418338512/);
 assert.match(workflow,/github\.event\.issue\.number == 50/);
 assert.match(workflow,/github\.event\.comment\.body == 'ULTRA_SENTINEL_C2_DETEKT_EXECUTABLE_ORACLES_V1'/);
 assert.match(workflow,/github\.actor_id == '322222186'/);
 assert.match(workflow,/permissions:\n  contents: read\n  actions: read/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/timeout-minutes: 45/);
 assert.equal((workflow.match(/^\s+- pr: (7715|7888)$/gm)||[]).length,4);
 for(const hash of ['8a3565572208446ff769152ded9ca5bdf957f8b0',
  '5d9ee0d6d61e7b59d798c99611e48e4105681624',
  '6c8f571d886aa581b62b02964e00ef7008559e72',
  '97e110402f4f25fccdfa0875b42300dac43dc41f'])
   assert.ok(workflow.includes(hash),hash);
 assert.match(workflow,/\.\/gradlew --no-daemon --no-configuration-cache/);
 assert.match(workflow,/scripts\/c2-detekt-executable-oracle\.py phase/);
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
 assert.doesNotMatch(workflow,/permissions:[\s\S]*contents:\s*write/);
});

test('Kotlin/JUnit fixtures test original source behavior but reveal unresolved symbol semantics',()=>{
 assert.equal((exception.match(/^\s+@Test$/gm)||[]).length,6);
 assert.equal((imports.match(/^\s+@Test$/gm)||[]).length,5);
 assert.match(exception,/sameSpellingFunctionStillReportsAfterBecauseRuleDoesNotResolveSymbols/);
 assert.match(exception,/fun IllegalArgumentException\(\) = Unit/);
 assert.match(exception,/fun illegalArgumentException\(\) = Unit/);
 assert.match(imports,/@KotlinCoreEnvironmentTest/);
 assert.match(imports,/lintWithContext\(env, main, additional\)/);
 assert.match(imports,/additionalOperatorSet/);
 assert.match(imports,/does not emulate a Gradle Kotlin DSL assignment compiler/);
});
