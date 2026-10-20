#!/usr/bin/env bash
# Runs only from protected structure-and-contracts for semantic-file changes.
# Pinned original Detekt compiler and Gradle; no writes to other repositories.
set -euo pipefail
test "$GITHUB_EVENT_NAME" = "pull_request"
test "$(git -C upstream rev-parse HEAD)" = "5d9ee0d6d61e7b59d798c99611e48e4105681624"
test "$(git -C upstream hash-object detekt-rules-exceptions/src/main/kotlin/io/gitlab/arturbosch/detekt/rules/exceptions/ThrowingExceptionsWithoutMessageOrCause.kt)" = "7d6ba408db3764568204e2c689aff260d8ffc3f7"
grep -Fqx 'distributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-all.zip' upstream/gradle/wrapper/gradle-wrapper.properties

dest=upstream/detekt-rules-exceptions/src/test/kotlin/io/gitlab/arturbosch/detekt/rules/exceptions
test -d "$dest"
test ! -e "$dest/C2SymbolResolutionOracleTest.kt"
cp tests/fixtures/c2-kotlin-semantic/C2SymbolResolutionOracleTest.kt "$dest/"
cp packages/kotlin-semantic/C2OptionalKotlinSemantic.kt "$dest/"
chmod +x upstream/gradlew
(
 cd upstream
 JAVA_TOOL_OPTIONS=-Xmx3g ./gradlew --no-daemon --no-configuration-cache --max-workers=2 \
  :detekt-rules-exceptions:test \
  --tests io.gitlab.arturbosch.detekt.rules.exceptions.C2SymbolResolutionOracleTest
)
JAVA_TOOL_OPTIONS=-Xmx3g upstream/gradlew -p "$GITHUB_WORKSPACE/tests/fixtures/c2-gradle-kotlin-dsl" \
 --no-daemon --no-configuration-cache --max-workers=2 c2DslAssignment c2SetterControl
original=upstream/detekt-rules-exceptions/build/test-results/test/TEST-io.gitlab.arturbosch.detekt.rules.exceptions.C2SymbolResolutionOracleTest.xml
test -s "$original"
out="$RUNNER_TEMP/c2-required-semantic"
mkdir -p "$out"
cp "$original" "$out/original-junit.xml"
python3 scripts/c2-kotlin-semantic-evidence.py \
 --upstream upstream \
 --xml "$original" \
 --gradle-output tests/fixtures/c2-gradle-kotlin-dsl/build/c2-kotlin-semantic \
 --fixtures . \
 --output "$out/semantic-evidence.json"
jq -e '.originalJunitTestsPassed == 10 and
 .gradleDslCompilerPluginExecuted == true and
 .kotlinSymbolResolutionExecuted == true and
 .newLabels == 0 and .admittedLabels == 0 and
 .sentinelRuleCoverageVerified == false and
 .blindHoldout == false and .sssPlusCertified == false and
 .precision == null and .recall == null and .f1 == null' \
 "$out/semantic-evidence.json" >/dev/null
cp tests/fixtures/c2-gradle-kotlin-dsl/build/c2-kotlin-semantic/*.txt "$out/"
echo "Required semantic compiler/Gradle evidence verified; no label admission."
