#!/usr/bin/env bash
set -euo pipefail
kotlin_root=${1:?Kotlin 2.0.21 distribution root required}
repo_root=$(cd "$(dirname "$0")/../../.." && pwd)
version=$("$kotlin_root/bin/kotlinc" -version 2>&1)
[[ "$version" == *'kotlinc-jvm 2.0.21 '* ]] || { echo "Expected Kotlin 2.0.21: $version" >&2; exit 1; }
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT
checkout="$tmp_dir/checkout"
mkdir -p "$checkout/app/src/main/kotlin/a" "$checkout/app/src/main/kotlin/b"
printf 'package a\nimport b.work\nfun run() = work()\n' > "$checkout/app/src/main/kotlin/a/Caller.kt"
printf 'package b\nfun work() = 1\n' > "$checkout/app/src/main/kotlin/b/Target.kt"
git -C "$checkout" init -q -b main
git -C "$checkout" config user.name 'Local Fixture'
git -C "$checkout" config user.email 'local@example.invalid'
git -C "$checkout" config core.autocrlf false
git -C "$checkout" add app
git -C "$checkout" commit -qm fixture
"$kotlin_root/bin/kotlinc" -language-version 1.9 -cp "$kotlin_root/lib/kotlin-compiler.jar" \
  "$repo_root/packages/kotlin-semantic/C2OptionalKotlinSemantic.kt" \
  "$repo_root/tests/fixtures/c2-kotlin-semantic/C2EmitSemanticClaim.kt" -d "$tmp_dir/emitter.jar"
java -cp "$tmp_dir/emitter.jar:$kotlin_root/lib/*" C2EmitSemanticClaimKt \
  "$kotlin_root/lib/kotlin-stdlib.jar" "$checkout/app/src/main/kotlin/a/Caller.kt" \
  "$checkout/app/src/main/kotlin/b/Target.kt" > "$tmp_dir/claim.json"
node "$repo_root/tests/fixtures/c2-kotlin-semantic/check-compiler-binding.cjs" "$checkout" "$tmp_dir/claim.json"
