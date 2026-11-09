#!/usr/bin/env bash
# Analyze original source declarations only; never run or modify the app.
set -euo pipefail
kotlin_root=${1:?Kotlin 2.0.21 distribution root required}
checkout=${2:?isolated, clean local GameHub Git checkout required}
receipt=${3:?new receipt path required}
repo_root=$(cd "$(dirname "$0")/.." && pwd)
test "${C2_OWNER_SANDBOX:-}" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
command -v bwrap >/dev/null
version=$("$kotlin_root/bin/kotlinc" -version 2>&1)
[[ "$version" == *'kotlinc-jvm 2.0.21 '* ]] || { echo 'Expected Kotlin 2.0.21' >&2; exit 1; }
node "$repo_root/scripts/c2-phase2-gamehub-call-claims.cjs" preflight "$checkout"
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT
"$kotlin_root/bin/kotlinc" -language-version 1.9 -cp "$kotlin_root/lib/kotlin-compiler.jar" \
  "$repo_root/packages/kotlin-semantic/C2OptionalKotlinSemantic.kt" \
  "$repo_root/tests/fixtures/c2-kotlin-semantic/C2EmitSemanticClaim.kt" -d "$tmp_dir/emitter.jar"
jdk=$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
  if [ -L "$mount" ]; then
    target=$(readlink "$mount")
    [[ "$target" != /* && "$target" != *..* ]] || exit 2
    mounts+=(--symlink "$target" "$mount")
  elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
  else exit 2; fi
done
prefix=/original/app/src/main/java/com/cardenaspiero255/gamehubultra
env -i PATH=/usr/bin:/bin HOME=/tmp \
  /usr/bin/bwrap --die-with-parent --unshare-all --new-session --clearenv \
  --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
  "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$kotlin_root" /kotlin \
  --ro-bind "$tmp_dir/emitter.jar" /emitter.jar --ro-bind "$checkout" /original \
  --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /tmp -- \
  /jdk/bin/java -cp '/emitter.jar:/kotlin/lib/*' C2EmitSemanticClaimKt \
  /kotlin/lib/kotlin-stdlib.jar --name=isSteamId64 \
  "$prefix/store/SteamMultiAccountSyncGuard.kt" \
  "$prefix/domain/GameAccountValidation.kt" \
  "$prefix/domain/GamePlatform.kt" > "$tmp_dir/claims.json"
node "$repo_root/scripts/c2-phase2-gamehub-call-claims.cjs" verify "$checkout" "$tmp_dir/claims.json" "$receipt"
