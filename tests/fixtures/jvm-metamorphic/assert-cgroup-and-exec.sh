#!/usr/bin/env bash
# Fail-closed pre-execution cgroup v2 guard. Runs as the unprivileged caller
# inside a systemd scope before launching any untrusted JVM bytecode.
set -euo pipefail
# The command is invoked through a privileged system scope, but its own
# effective identity MUST be the non-root runner chosen before sudo.
[ "$#" -ge 3 ] || exit 2
expected_uid=$1
expected_gid=$2
shift 2
[[ "$expected_uid" =~ ^[0-9]+$ && "$expected_gid" =~ ^[0-9]+$ ]] || exit 2
(( expected_uid > 0 && expected_gid > 0 )) || exit 2
[ "$(id -u)" = "$expected_uid" ] && [ "$(id -g)" = "$expected_gid" ] || exit 2
[ -r /proc/self/cgroup ] || exit 2
[ -r /sys/fs/cgroup/cgroup.controllers ] || exit 2
relative=''
while IFS= read -r line; do
 case "$line" in 0::/*)
   [ -z "$relative" ] || exit 2
   relative="${line#0::}"
 ;; esac
done < /proc/self/cgroup
[[ "$relative" == /* && "$relative" != *..* ]] || exit 2
[[ "$relative" =~ ^/[A-Za-z0-9_./:-]+$ ]] || exit 2
directory="/sys/fs/cgroup$relative"
for file in memory.max memory.swap.max pids.max; do
 [ -f "$directory/$file" ] && [ -r "$directory/$file" ] || exit 2
done
IFS= read -r memory < "$directory/memory.max" || true
IFS= read -r swap < "$directory/memory.swap.max" || true
IFS= read -r pids < "$directory/pids.max" || true
[[ "$memory" =~ ^[0-9]+$ && "$swap" == 0 && "$pids" =~ ^[0-9]+$ ]] || exit 2
(( memory > 0 && memory <= 536870912 && pids > 0 && pids <= 32 )) || exit 2
exec "$@"
