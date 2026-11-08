#!/usr/bin/env bash
set -euo pipefail
# Pass the Kotlin 2.0.21 distribution root, e.g. /opt/kotlinc.
kotlin_root=${1:?Kotlin 2.0.21 distribution root required}
repo_root=$(cd "$(dirname "$0")/../../.." && pwd)
version=$("$kotlin_root/bin/kotlinc" -version 2>&1)
[[ "$version" == *'kotlinc-jvm 2.0.21 '* ]] || { echo "Expected Kotlin 2.0.21: $version" >&2; exit 1; }
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT
"$kotlin_root/bin/kotlinc" -language-version 1.9 -cp "$kotlin_root/lib/kotlin-compiler.jar" \
  "$repo_root/packages/kotlin-semantic/C2OptionalKotlinSemantic.kt" \
  "$repo_root/tests/fixtures/c2-kotlin-semantic/C2CompilerIntegration.kt" -d "$tmp_dir/integration.jar"
java -cp "$tmp_dir/integration.jar:$kotlin_root/lib/*" C2CompilerIntegrationKt "$kotlin_root/lib/kotlin-stdlib.jar"
