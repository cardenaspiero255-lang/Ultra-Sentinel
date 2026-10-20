'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=path=>fs.readFileSync(require('node:path').join(root,path),'utf8');

test('experimental semantic layer uses actual Kotlin resolved descriptor, not callee spelling',()=>{
 const kotlin=read('tests/fixtures/c2-kotlin-semantic/C2SymbolResolutionOracleTest.kt');
 const api=read('packages/kotlin-semantic/C2OptionalKotlinSemantic.kt');
 assert.match(api,/getResolvedCall\(context\)/);
 assert.match(api,/is ConstructorDescriptor/);
 assert.match(api,/is FunctionDescriptor/);
 assert.match(api,/C2SymbolKind\.UNKNOWN/);
 assert.match(kotlin,/C2OptionalKotlinSemantic\.resolveCall\(expression, bindingContext\)/);
 assert.match(kotlin,/@KotlinCoreEnvironmentTest/);
 for(const name of ['constructorNoArg','constructorWithMessage','lowercaseHomonym',
   'uppercaseHomonym','sameNameCallable','importedAliasConstructor','unresolvedCallFailsClosed'])
  assert.ok(kotlin.includes(name),name);
 assert.doesNotMatch(kotlin,/text\.equals\(/);
});

test('actual Gradle Kotlin DSL property assignment has an implicit plugin and a setter control',()=>{
 const build=read('tests/fixtures/c2-gradle-kotlin-dsl/build.gradle.kts');
 const settings=read('tests/fixtures/c2-gradle-kotlin-dsl/settings.gradle.kts');
 assert.match(build,/import org\.gradle\.kotlin\.dsl\.assign/);
 assert.match(build,/abstract val witness: Property<String>/);
 assert.match(build,/witness = "assigned-by-kotlin-dsl"/);
 assert.match(build,/witness\.set\("set-by-api"\)/);
 assert.match(build,/C2_REAL_GRADLE_ASSIGNMENT_PLUGIN_OK/);
 assert.match(build,/C2_GRADLE_SETTER_CONTROL_OK/);
 assert.match(settings,/rootProject\.name = "c2-gradle-kotlin-semantic"/);
});

test('optional semantic upstream job is PR-gated or owner-only; pins Kotlin and real Gradle',()=>{
 const workflow=read('.github/workflows/c2-kotlin-semantic-optional.yml');
 assert.match(workflow,/contents: read/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/github\.event\.pull_request\.head\.repo\.full_name/);
 assert.match(workflow,/ref: 5d9ee0d6d61e7b59d798c99611e48e4105681624/);
 assert.match(workflow,/java-version: '21'/);
 assert.match(workflow,/gradle-8\.10\.2-all\.zip/);
 assert.match(workflow,/C2SymbolResolutionOracleTest/);
 assert.match(workflow,/c2DslAssignment c2SetterControl/);
 assert.match(workflow,/c2-kotlin-semantic-evidence\.py/);
 assert.doesNotMatch(workflow,/contents: write|continue-on-error: true/);
});

test('semantic layer does not claim causal rule IDs or gold labels',()=>{
 const verify=read('scripts/c2-kotlin-semantic-evidence.py');
 assert.match(verify,/newLabels/);
 assert.match(verify,/sentinelRuleCoverageVerified/);
 assert.match(verify,/gradleDslCompilerPluginExecuted/);
 assert.match(verify,/kotlinSymbolResolutionExecuted/);
 assert.doesNotMatch(verify,/goldLabelsAdded/);
});

test('a future same-repository semantic PR cannot silently skip the compiler gate',()=>{
 const workflow=read('.github/workflows/c2-kotlin-semantic-optional.yml');
 assert.match(workflow,/github\.event\.repository\.id == 1418338512/);
 assert.match(workflow,/github\.event\.pull_request\.head\.repo\.full_name == 'cardenaspiero255-lang\/Ultra-Sentinel'/);
 assert.doesNotMatch(workflow,/github\.event\.pull_request\.head\.ref\s*==/);
 assert.match(workflow,/github\.event_name == 'workflow_dispatch' && github\.actor_id == '322222186'/);
 assert.match(workflow,/github\.event\.comment\.body == 'ULTRA_SENTINEL_C2_KOTLIN_SEMANTIC_V1'/);
});


test('compiler bridge rejects ambiguous or failed K1 calls instead of trusting candidate descriptors',()=>{
 const bridge=read('packages/kotlin-semantic/C2OptionalKotlinSemantic.kt');
 const oracle=read('tests/fixtures/c2-kotlin-semantic/C2SymbolResolutionOracleTest.kt');
 assert.match(bridge,/\.isReallySuccess\(\)/);
 for(const testName of ['ambiguousFunctionCallFailsClosed','ambiguousConstructorCallFailsClosed','wrongArgumentTypeFailsClosed']){
  assert.match(oracle,new RegExp('\\bfun\\s+'+testName+'\\s*\\('),testName);
  assert.match(oracle,new RegExp('fun\\s+'+testName+'\\s*\\([\\s\\S]*?isEqualTo\\("UNKNOWN"\\)'),testName);
 }
 const evidence=read('scripts/c2-kotlin-semantic-evidence.py');
 for(const testName of ['ambiguousFunctionCallFailsClosed','ambiguousConstructorCallFailsClosed','wrongArgumentTypeFailsClosed']){
   assert.ok(evidence.includes(testName),'JUnit evidence must count '+testName);
 }
});

test('protected architecture check executes pinned Kotlin compiler evidence when semantic paths change',()=>{
 const arch=read('.github/workflows/architecture.yml');
 const script=read('scripts/c2-required-semantic-gate.sh');
 assert.match(arch,/fetch-depth: 0/);
 assert.match(arch,/id: semantic-scope/);
 assert.match(arch,/git diff --name-only[^\\n]*-z/);
 assert.match(arch,/packages\\/kotlin-semantic\\/\\*/);
 assert.match(arch,/tests\\/fixtures\\/c2-kotlin-semantic\\/\\*/);
 assert.match(arch,/\\.github\\/workflows\\/architecture\\.yml/);
 assert.match(arch,/if: steps\\.semantic-scope\\.outputs\\.required == 'true'/);
 assert.match(arch,/bash scripts\\/c2-required-semantic-gate\\.sh/);
 assert.match(script,/git -C upstream rev-parse HEAD/);
 assert.match(script,/C2SymbolResolutionOracleTest/);
 assert.match(script,/c2DslAssignment c2SetterControl/);
 assert.match(script,/c2-kotlin-semantic-evidence\\.py/);
 assert.match(script,/jq -e/);
 assert.doesNotMatch(arch,/continue-on-error:\\s*true/);
});
