#!/usr/bin/env bash
# GitHub changed-file API includes "patch"; project it immediately in a pipe.
# Never write or print PR titles, body, patch, or code. One candidate/job.
set -euo pipefail
index="${1:-}"
root="${2:-}"
if [[ ! "$index" =~ ^[0-9]+$ ]] || ((10#$index >= 44)) ||
   [[ -z "$root" || ! -d "$root" ]]; then
  echo C2_44_NEW_EXTERNAL_BLOCKED >&2; exit 1
fi
umask 077
candidate="$(node - "$index" <<'NODE'
const c=require('./docs/quality/C2-44-NEW-EXTERNAL-PRESEAL-20261024.json').candidates[Number(process.argv[2])];
if(!c||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(c.repository)||!Number.isSafeInteger(c.pr))process.exit(2);
process.stdout.write([c.repository,c.pr,c.baseSha,c.headSha,c.createdAt].join('\t'));
NODE
)"
IFS=$'\t' read -r repo pr base head created <<< "$candidate"
work="$(mktemp -d "$root/metadata-$index.XXXXXXXX")"
trap 'rm -rf "$work"' EXIT
state='API_ERROR'
if gh api "/repos/$repo/pulls/$pr" 2>/dev/null |
   jq -ec '{number,created_at,changed_files,base:{sha:.base.sha,repo:{full_name:.base.repo.full_name}},head:{sha:.head.sha}}' > "$work/pr.json"; then
  if jq -e --arg repo "$repo" --argjson pr "$pr" --arg base "$base" --arg head "$head" --arg created "$created" '
      .number==$pr and .created_at==$created and
      ((.base.repo.full_name|ascii_downcase)==($repo|ascii_downcase)) and
      .base.sha==$base and .head.sha==$head' "$work/pr.json" >/dev/null; then
    state='MATCHED'
    if ! gh api --paginate "/repos/$repo/pulls/$pr/files?per_page=100" 2>/dev/null |
      jq -se 'add | map({filename,status,sha,additions,deletions,changes})' > "$work/files.json"; then
      state='API_ERROR'
    elif ! jq -e --argjson n "$(jq -r '.changed_files' "$work/pr.json")" '
       length>=1 and length<=300 and length==$n and
       (map(.filename)|unique|length)==$n' "$work/files.json" >/dev/null; then
      state='INCOMPLETE'
    fi
  else state='DRIFT'
  fi
fi
if [[ "$state" != 'MATCHED' ]]; then printf '[]\n' > "$work/files.json"; fi
node - "$index" "$state" "$work/files.json" "$root" <<'NODE'
const fs=require('node:fs'),path=require('node:path');
const i=Number(process.argv[2]),status=process.argv[3],files=JSON.parse(fs.readFileSync(process.argv[4],'utf8'));
const root=process.argv[5];
const c=require('./docs/quality/C2-44-NEW-EXTERNAL-PRESEAL-20261024.json').candidates[i];
const allowed=['filename','status','sha','additions','deletions','changes'];
if(!['MATCHED','DRIFT','INCOMPLETE','API_ERROR'].includes(status)||
 !Array.isArray(files)||files.some(f=>Object.keys(f).length!==6||
  !allowed.every(k=>Object.hasOwn(f,k))))process.exit(2);
fs.writeFileSync(path.join(root,'row-'+String(i).padStart(2,'0')+'.ndjson'),
 JSON.stringify({...c,status,files})+'\n',{flag:'wx',mode:0o600});
NODE
