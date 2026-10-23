#!/usr/bin/env bash
set -euo pipefail
umask 077
test "$GITHUB_ACTIONS" = true
test "$C2_OWNER_SANDBOX" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
command -v kotlinc >/dev/null
command -v gh >/dev/null
command -v jq >/dev/null
command -v bwrap >/dev/null
test "$#" -eq 2
suite="$1"; root="$(realpath "$2")"
[[ "$suite" =~ ^(numeric|confidence|thermal)$ ]] || exit 2
test -d "$root" && test ! -L "$root"
mkdir -p "$root/output"
source_repo=cardenaspiero255-lang/gamehub-ultra
fetch_exact(){
  local alias="$1" head="$2" blob="$3" path="$4" sha="$5"
  local metadata="$root/source-api-$alias.json"
  gh api "/repos/$source_repo/contents/$path?ref=$head" > "$metadata"
  jq -e --arg b "$blob" --arg p "$path" '
    .type=="file" and .path==$p and .sha==$b and
    .encoding=="base64" and .size>100 and .size<1000000
  ' "$metadata" >/dev/null
  jq -r .content "$metadata" | base64 --decode > "$root/$alias"
  test "$(git hash-object "$root/$alias")" = "$blob"
  if [ "$sha" != - ];then
    test "$(sha256sum "$root/$alias"|cut -d' ' -f1)" = "$sha"
  fi
  rm -f "$metadata"
}
sandbox_java(){
  local jar="$1" out="$2"
  local jdk
  jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
  test -x "$jdk/bin/java"
  local mounts=(--ro-bind /usr /usr)
  for mount in /bin /lib /lib64;do
    if [ -L "$mount" ];then
      local target
      target="$(readlink "$mount")"
      [[ "$target" != /* && "$target" != *..* ]] || return 2
      mounts+=(--symlink "$target" "$mount")
    elif [ -d "$mount" ];then mounts+=(--ro-bind "$mount" "$mount")
    else return 2;fi
  done
  env -i PATH=/usr/bin:/bin HOME=/tmp \
    /usr/bin/bwrap --die-with-parent --unshare-all --new-session --clearenv \
    --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
    "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
    --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
    -- /jdk/bin/java -jar "/workspace/$jar" > "$out"
}
case "$suite" in
 numeric)
  fetch_exact math-original.kt 858c9ce5cb6a7916d63f2348432013e49d02ba79 \
    063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a \
    app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraMathEngine.kt \
    f9fbdbd7aabd2dffbadc4b04b31280779bd7359624c081b9e64d532d8c40f65a
  fetch_exact battery-original.kt 2289f4e4cda55ddaa50f2016113ded82dc17203c \
    8696360219231f3f1477d5ad21c93bca2197e281 \
    app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt \
    cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b
  bash scripts/c2-pr185-numeric-factorial.sh "$root"
  test -s "$root/output/factorial-source-evidence.json"
  cp "$root/output/factorial-source-evidence.json" "$root/output/evidence.json"
  ;;
 confidence)
  fetch_exact source.kt 4c6912d7ca17df0669f8a0d9667f34d2f2b205a9 \
    37866fd3dbfcd19d9daaf29a5e1e426391c723d4 \
    app/src/main/java/com/cardenaspiero255/gamehubultra/domain/SmartRecommendationExplanation.kt -
  node scripts/c2-pr150-causal-cross-interventions.cjs prepare "$root/source.kt" "$root/variants"
  for mode in original historyOnly externalOnly both;do
    kotlinc "$root/variants/$mode/SmartRecommendationExplanation.kt" \
      tests/oracles/c2-next-pr150-confidence-domain-abi.kt \
      tests/oracles/c2-pr150-causal-cross-interventions.kt -include-runtime \
      -d "$root/variants/$mode/run.jar"
    test -s "$root/variants/$mode/run.jar"
    chmod 0400 "$root/variants/$mode/run.jar"
    sandbox_java "variants/$mode/run.jar" "$root/variants/$mode/result.json"
    jq -e 'type=="object" and (keys|length)==6' "$root/variants/$mode/result.json" >/dev/null
  done
  node scripts/c2-pr150-causal-cross-interventions.cjs verify \
    "$root/variants" "$root/output/evidence.json"
  ;;
 thermal)
  fetch_exact source.kt 9ad983576c16c6c34d59283979d83c69ede50dce \
    adb11032b9b7f62f865228dfa1c27258ca3fa0df \
    app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt -
  node scripts/c2-pr151-158-causal-batch.cjs prepare 151 "$root/source.kt" "$root/results"
  for mode in original patched;do
    kotlinc "$root/results/$mode.kt" \
      tests/oracles/c2-next-pr151-domain-abi.kt \
      tests/oracles/c2-pr151-mid-session-counterfactual.kt \
      -include-runtime -d "$root/results/$mode.jar"
    test -s "$root/results/$mode.jar"
    chmod 0400 "$root/results/$mode.jar"
    sandbox_java "results/$mode.jar" "$root/results/$mode.json"
    jq -e 'type=="object" and
      (keys|sort)==(["finiteAlert","infinityAlert","nanAlert"]|sort)' \
      "$root/results/$mode.json" >/dev/null
  done
  node scripts/c2-live-thermal-evidence.cjs \
    "$root/source.kt" "$root/results" "$root/output/evidence.json"
  ;;
esac
test -s "$root/output/evidence.json"
jq -e 'type=="object"' "$root/output/evidence.json" >/dev/null
echo "C2_GENUINE_ORIGINAL_KOTLIN_SUITE=$suite COMPLETE"
