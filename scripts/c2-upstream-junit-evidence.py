#!/usr/bin/env python3
"""Fail-closed JUnit transition pre-audit. Never produces ground truth labels.

Input XML is untrusted. Both directories must come from independent original
BEFORE and AFTER upstream builds; this script only checks their claimed evidence.
External provenance, root cause, applicability and independent review remain required.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

SHA40 = re.compile(r'^[a-f0-9]{40}$')
TASK = re.compile(r'^[A-Za-z0-9_-]+-[1-9][0-9]{0,7}$')
TESTID = re.compile(r'[A-Za-z_$][A-Za-z0-9_.$]*\.[^\x00-\x08\x0b\x0c\x0e-\x1f\x7f]{1,500}',re.DOTALL)
CLASSES = ('f2p','p2p','s2p','n2p')
MAX_XML_FILES = 4096
MAX_TOTAL_XML_BYTES = 100_663_296
MAX_EXPECTED_BYTES = 8_388_608
MAX_XML_BYTES = 2_097_152
MAX_TESTS = 60_000

def abort(reason):
    raise ValueError('C2_UPSTREAM_EVIDENCE_BLOCKED: '+reason)

def reject_symlink_components(path):
    absolute = path.absolute()
    for part in (absolute, *absolute.parents):
        if part.is_symlink():
            abort('symlink in evidence path')

def safe_file(path, maxbytes):
    reject_symlink_components(path)
    st = path.lstat()
    if not path.is_file() or path.is_symlink() or st.st_nlink != 1 or st.st_size < 1 or st.st_size > maxbytes:
        abort('unsafe input file')
    return path.read_bytes()

def sha(b):
    return hashlib.sha256(b).hexdigest()

def expected_tests(path):
    raw = safe_file(path, MAX_EXPECTED_BYTES)
    try: data = json.loads(raw)
    except (ValueError, UnicodeDecodeError): abort('invalid expected test manifest')
    if not isinstance(data,dict):abort('expected test manifest must be object')
    ids = set(); groups={}
    for k in CLASSES:
        values=data.get(k+'_tests')
        if not isinstance(values,list) or len(values)>20_000: abort('missing expected test classification')
        for x in values:
            if not isinstance(x,str) or not TESTID.fullmatch(x) or x in ids:
                abort('invalid/duplicate expected test')
            ids.add(x)
        groups[k]=values
    if not groups['f2p']:abort('no original fail-to-pass test')
    return groups,sha(raw)

def collect_junit(directory):
    reject_symlink_components(directory)
    if not directory.is_dir() or directory.is_symlink():abort('unsafe JUnit directory')
    xmls=sorted(directory.rglob('TEST*.xml'))
    if not xmls or len(xmls)>MAX_XML_FILES:abort('no JUnit or too many reports')
    cases={}; hashes=[]; conflicts=set(); equivalents=0; total_bytes=0
    for path in xmls:
        raw=safe_file(path,MAX_XML_BYTES)
        total_bytes += len(raw)
        if total_bytes > MAX_TOTAL_XML_BYTES:abort('excessive total JUnit XML bytes')
        hashes.append([str(path.relative_to(directory)),sha(raw)])
        if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
            abort('XML entity definitions disallowed')
        try: root=ET.fromstring(raw)
        except ET.ParseError: abort('malformed JUnit XML')
        if root.tag not in ('testsuite','testsuites'):abort('unexpected XML root')
        for e in root.iter('testcase'):
            classname=e.get('classname');name=e.get('name')
            if not classname or not name:abort('JUnit testcase lacks stable name')
            # Gradle/Spek may pad multiline testcase display names in JUnit
            # XML. Trim only OUTER whitespace, never interior lines/spacing:
            # duplicates with conflicting observed states still fail closed.
            name=name.strip()
            if not name:abort('JUnit testcase lacks stable name')
            ident=f'{classname}.{name}'
            if not TESTID.fullmatch(ident):abort('invalid JUnit test identity')
            if ident not in cases and ident not in conflicts and len(cases)+len(conflicts)>=MAX_TESTS:
                abort('excessive testcase count')
            states={child.tag for child in e if child.tag in ('failure','error','skipped')}
            if len(states)>1:abort('ambiguous testcase state')
            state=('FAIL' if 'failure' in states or 'error' in states else
                   'SKIP' if 'skipped' in states else 'PASS')
            if ident in conflicts:
                continue  # once ambiguous, never restore an identity as proven
            if ident not in cases:
                cases[ident]=state
            elif cases[ident]==state:
                equivalents+=1  # same identity/state; no additional vote
            else:
                conflicts.add(ident)
                del cases[ident]  # never count a contradictory observation
    fingerprint=sha(json.dumps(sorted(conflicts),ensure_ascii=False,separators=(',',':')).encode('utf-8'))
    return cases,hashes,{'equivalentDuplicateJUnitCount':equivalents,
                         'conflictingJUnitIds':conflicts,
                         'conflictingJUnitSha256':fingerprint}

def evaluate(args):
    if not TASK.fullmatch(args.task):abort('invalid task')
    if not SHA40.fullmatch(args.source_commit) or not SHA40.fullmatch(args.fixed_commit) or args.source_commit==args.fixed_commit:
        abort('unusable source/solution commit references')
    exp=Path(args.expected);before=Path(args.before);after=Path(args.after);out=Path(args.output)
    reject_symlink_components(out)
    if out.exists() or out.is_symlink():abort('receipt already exists')
    groups, expected_digest=expected_tests(exp)
    before_cases,before_files,before_meta=collect_junit(before)
    after_cases,after_files,after_meta=collect_junit(after)
    required={x for values in groups.values() for x in values}
    for phase,meta in (('before',before_meta),('after',after_meta)):
        if required.intersection(meta['conflictingJUnitIds']):
            abort(phase+' expected testcase has conflicting JUnit states')
    # Preserve the strict original BEFORE/AFTER requirement, but identify the
    # failing source control. JSON quoting prevents untrusted XML names from
    # injecting raw line breaks or terminal control characters into CI logs.
    transitions=(
        ('f2p','FAIL','PASS','original f2p failure-to-pass not demonstrated'),
        ('p2p','PASS','PASS','original p2p stable passing control not demonstrated'),
        ('s2p','SKIP','PASS','skipped-to-pass expectation not demonstrated'),
        ('n2p','MISSING','PASS','new-to-pass expectation not demonstrated')
    )
    for group,expected_before,expected_after,reason in transitions:
        for test in groups[group]:
            actual_before=before_cases.get(test,'MISSING')
            actual_after=after_cases.get(test,'MISSING')
            if actual_before!=expected_before or actual_after!=expected_after:
                abort(f'{reason}: test={json.dumps(test,ensure_ascii=True)} '
                      f'before={actual_before} after={actual_after}')
    result={
      'schema':'ultra-sentinel-c2-upstream-junit-evidence/v1',
      'task':args.task,'declaredBeforeCommit':args.source_commit,
      'declaredAfterCommit':args.fixed_commit,
      'expectedTestsSha256':expected_digest,'beforeJUnitFiles':before_files,
      'afterJUnitFiles':after_files,
      # Contradictions outside the declared tests never count as evidence.
      # Keep a reproducible fingerprint without counting them as passes.
      'beforeEquivalentDuplicateJUnitCount':before_meta['equivalentDuplicateJUnitCount'],
      'afterEquivalentDuplicateJUnitCount':after_meta['equivalentDuplicateJUnitCount'],
      'beforeConflictingUnscoredJUnitCount':len(before_meta['conflictingJUnitIds']),
      'afterConflictingUnscoredJUnitCount':len(after_meta['conflictingJUnitIds']),
      'beforeConflictingUnscoredJUnitSha256':before_meta['conflictingJUnitSha256'],
      'afterConflictingUnscoredJUnitSha256':after_meta['conflictingJUnitSha256'],
      'verifiedFailToPassCount':len(groups['f2p']),
      'verifiedPassToPassCount':len(groups['p2p']),
      'verifiedNewOrSkippedToPassCount':len(groups['s2p'])+len(groups['n2p']),
      'rawJUnitAuthenticityVerified':False,
      'sourceCommitProvenanceVerified':False,
      'rootCauseVerified':False,'independentReviewVerified':False,
      'detectorApplicabilityVerified':False,
      'newPositiveLabels':0,'newNegativeLabels':0,
      'benchmarkScoredLabels':0,'tripleSPlusCertified':False,
      'status':'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'
    }
    payload=(json.dumps(result,sort_keys=True,ensure_ascii=False,indent=2)+'\n').encode()
    fd=os.open(str(out),os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    try:
        with os.fdopen(fd,'wb') as f:f.write(payload)
    except BaseException:
        out.unlink(missing_ok=True)
        raise
    return {'task':args.task,'status':result['status'],'candidateTransitions':len(groups['f2p']),
            'newLabels':0,'receiptSha256':sha(payload)}

def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    for field in ('task','expected','before','after','source-commit','fixed-commit','output'):
        ap.add_argument('--'+field,required=True)
    args=ap.parse_args(argv)
    try:
        print(json.dumps(evaluate(args),sort_keys=True))
    except (OSError,ValueError) as exc:
        print(str(exc) if isinstance(exc,ValueError) else 'C2_UPSTREAM_EVIDENCE_BLOCKED: unavailable input',file=sys.stderr)
        return 2
    return 0

if __name__=='__main__':sys.exit(main())
