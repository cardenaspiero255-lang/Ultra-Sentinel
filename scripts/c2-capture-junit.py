#!/usr/bin/env python3
"""C2 original Gradle JUnit capture, bounded and fail-closed (never mints labels).

This script runs inside an ephemeral, unprivileged container without network.
Validate the complete inventory and size quotas BEFORE copying any reports.
"""
import argparse
import hashlib
import os
import stat
import sys
from pathlib import Path

MAX_XML_FILES = 4096
MAX_XML_BYTES = 2_097_152
MAX_TOTAL_XML_BYTES = 100_663_296  # 96 MiB per phase
MAX_SCANNED_DIRS = 50_000
MAX_SCANNED_FILES = 200_000

def blocked():
    raise ValueError('C2_JUNIT_CAPTURE_BLOCKED')

def collect(source, output):
    source = Path(source).absolute()
    output = Path(output).absolute()
    if not source.is_dir() or not output.is_dir() or source.is_symlink() or output.is_symlink():
        blocked()
    if output == source or source in output.parents or output in source.parents:
        blocked()
    if list(output.iterdir()):
        blocked()
    inventory = []
    total = 0
    scanned_dirs = 0
    scanned_files = 0
    for root, dirs, files in os.walk(source, followlinks=False):
        scanned_dirs += 1
        scanned_files += len(files)
        if scanned_dirs > MAX_SCANNED_DIRS or scanned_files > MAX_SCANNED_FILES:
            blocked()
        dirs[:] = [d for d in dirs if not (Path(root) / d).is_symlink()]
        for filename in files:
            if not filename.startswith('TEST') or not filename.endswith('.xml'):
                continue
            p = Path(root) / filename
            relative = p.relative_to(source)
            parts = relative.parts
            if not any(parts[i:i+2] == ('build', 'test-results') for i in range(len(parts)-1)):
                continue
            st = p.lstat()
            if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1 or not 1 <= st.st_size <= MAX_XML_BYTES:
                blocked()
            total += st.st_size
            inventory.append((relative, p, st.st_size))
            if total > MAX_TOTAL_XML_BYTES or len(inventory) > MAX_XML_FILES:
                blocked()
    if not inventory:
        blocked()
    # File names are SHA-derived from complete relative paths, so similarly
    # named JUnit reports from distinct modules never overwrite each other.
    targets = set()
    for relative, _, _ in inventory:
        name = 'TEST-' + hashlib.sha256(str(relative).encode()).hexdigest()[:24] + '.xml'
        if name in targets:
            blocked()
        targets.add(name)
    written = []
    try:
        for relative, source_file, expected_size in sorted(inventory):
            name = 'TEST-' + hashlib.sha256(str(relative).encode()).hexdigest()[:24] + '.xml'
            dest = output / name
            in_fd = os.open(source_file, os.O_RDONLY | getattr(os,'O_NOFOLLOW',0))
            try:
                st = os.fstat(in_fd)
                if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1 or st.st_size != expected_size:
                    blocked()
                out_fd = os.open(dest,os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,'O_NOFOLLOW',0),0o600)
                written.append(dest)
                try:
                    copied = 0
                    while True:
                        chunk = os.read(in_fd,65536)
                        if not chunk:
                            break
                        copied += len(chunk)
                        if copied > expected_size:
                            blocked()
                        view = memoryview(chunk)
                        while view:
                            view = view[os.write(out_fd,view):]
                    if copied != expected_size:
                        blocked()
                    # The runner uploads these files after the isolated
                    # container (possibly a different UID) exits. The parent
                    # bind directory is restored to runner-only 0700.
                    os.fchmod(out_fd,0o644)
                finally:
                    os.close(out_fd)
            finally:
                os.close(in_fd)
    except (OSError,ValueError):
        for path in written:
            path.unlink(missing_ok=True)
        blocked()
    return len(written)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--source',required=True)
    ap.add_argument('--output',required=True)
    args=ap.parse_args()
    try:
        count=collect(args.source,args.output)
        print('C2_JUNIT_REPORTS_CAPTURED='+str(count))
        return 0
    except (OSError,ValueError):
        print('C2_JUNIT_CAPTURE_BLOCKED',file=sys.stderr)
        return 2

if __name__=='__main__':
    sys.exit(main())
