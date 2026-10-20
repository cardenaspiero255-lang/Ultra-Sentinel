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
