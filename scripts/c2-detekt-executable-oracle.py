#!/usr/bin/env python3
"""Fail-closed evidence checker for actual BEFORE/AFTER Detekt Kotlin JUnit.

This never assigns GOLD labels or claims independent blind evaluation.
It verifies an externally compiled and executed Kotlin JUnit test report,
not a synthetic oracle test or a Kotlin source-pattern match.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

SPECS = {
 7715: {
  'repository':'detekt/detekt',
  'BEFORE':'8a3565572208446ff769152ded9ca5bdf957f8b0',
  'AFTER':'5d9ee0d6d61e7b59d798c99611e48e4105681624',
  'module':'detekt-rules-exceptions',
  'suite':'io.gitlab.arturbosch.detekt.rules.exceptions.C2IndependentExceptionOracleTest',
  'fixture':'C2IndependentExceptionOracleTest.kt',
  'tests':(
   'lowerCaseFunctionReportsOnlyBefore',
   'upperCaseVariantFunctionReportsOnlyBefore',
   'realNoArgExceptionConstructorReportsOnBoth',
   'realExceptionConstructorWithMessageReportsOnNeither',
   'sameSpellingFunctionStillReportsAfterBecauseRuleDoesNotResolveSymbols',
   'assertionHelperIsNotAnExceptionConstructor',
  ),
 },
 7888: {
  'repository':'detekt/detekt',
  'BEFORE':'6c8f571d886aa581b62b02964e00ef7008559e72',
  'AFTER':'97e110402f4f25fccdfa0875b42300dac43dc41f',
  'module':'detekt-rules-style',
  'suite':'io.gitlab.arturbosch.detekt.rules.style.C2IndependentImportOracleTest',
  'fixture':'C2IndependentImportOracleTest.kt',
  'tests':(
   'unconfiguredImplicitAssignImportChangesBetweenRevisions',
   'explicitlyConfiguredAssignIsExemptInBothRevisions',
   'unrelatedUnusedImportStillProducesAReport',
   'resolvedInfixFunctionImportIsUsedNotDiscarded',
   'builtinOperatorImportIsExemptEvenIfUnusedAndIsNotATypeAwareOracle',
  ),
 },
}
SHA=re.compile(r'[a-f0-9]{40}\Z')
JSON_SHA=re.compile(r'[a-f0-9]{64}\Z')
STATUS='UPSTREAM_RULE_JUNIT_ORACLE_PASSED'

def block(reason):
 raise ValueError('C2_DETEKT_EXECUTABLE_ORACLE_BLOCKED: '+reason)

def verify_phase(pr, phase, source_sha, xml_dir):
 if pr not in SPECS or phase not in ('BEFORE','AFTER') or not SHA.fullmatch(str(source_sha)):
  block('invalid phase / PR / source SHA')
 spec=SPECS[pr]
 if spec[phase]!=source_sha:block('pinned original upstream SHA mismatch')
 root=Path(xml_dir)
 if not root.is_dir() or root.is_symlink():block('JUnit folder missing or symlink')
 files=list(root.iterdir())
 if len(files)!=1:block('JUnit folder must contain exactly the named suite')
 path=files[0]
 expected='TEST-'+spec['suite']+'.xml'
 if path.name!=expected or path.is_symlink() or not path.is_file() or path.stat().st_nlink!=1:
  block('unexpected, symlinked, or multiply linked JUnit XML file')
 data=path.read_bytes()
 if len(data)<65 or len(data)>2_000_000 or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
  block('unsafe/truncated XML')
 try:
  suite=ET.fromstring(data)
 except ET.ParseError as exc:block('invalid JUnit XML: '+str(exc)[:120])
 if suite.tag!='testsuite' or suite.get('name')!=spec['suite']:
  block('wrong suite name')
 for k,expect in [('tests',len(spec['tests'])),('failures',0),('errors',0),('skipped',0)]:
  if suite.get(k)!=str(expect):block('JUnit expected tests/outcome mismatch: '+k)
 expected_names=set(spec['tests'])
 normalized=set()
 original_names=[]
 for case in suite.findall('./testcase'):
  if case.get('classname')!=spec['suite']:block('unexpected test class')
  raw=case.get('name','')
  name=raw[:-2] if raw.endswith('()') else raw
  if name not in expected_names or name in normalized:
   block('unregistered, duplicate or ambiguous test name')
  if any(c.tag in ('failure','error','skipped') for c in case):
   block('failing, erroring or skipped oracle')
  normalized.add(name);original_names.append(raw)
 if normalized!=expected_names:block('incomplete JUnit testcase list')
 return {
  'schema':'ultra-sentinel-c2-detekt-executable-kotlin-junit-phase/v1',
  'project':'detekt/detekt','pr':pr,'phase':phase,
  'sourceCommit':source_sha,'fixture':spec['fixture'],
  'junitSuite':spec['suite'],'rawJUnitTestNames':sorted(original_names),
  'testCount':len(normalized),'xmlSha256':hashlib.sha256(data).hexdigest(),
  'status':STATUS,
  'actualUpstreamDetektRuleExecuted':True,
  'fullRuleSemanticEquivalenceToSentinelVerified':False,
  'gradleDslCompilerPluginSemanticsVerified':False,
  'sentinelRuleEquivalent':False,
  'independentCausalTruthVerified':False,
  'newLabels':0,'blindHoldout':False,'sssPlusCertified':False
 }

def summarize(reports):
 expected={(n,phase) for n in SPECS for phase in ('BEFORE','AFTER')}
 if not isinstance(reports,dict) or set(reports)!=expected:block('missing or repeated upstream phase')
 cases=[]
 for pr,phase in sorted(expected):
  item=reports[(pr,phase)]
  spec=SPECS[pr]
  if not isinstance(item,dict) or item.get('schema')!='ultra-sentinel-c2-detekt-executable-kotlin-junit-phase/v1' or \
     item.get('status')!=STATUS or item.get('pr')!=pr or item.get('phase')!=phase or \
     item.get('sourceCommit')!=spec[phase] or \
     item.get('junitSuite')!=spec['suite'] or item.get('testCount')!=len(spec['tests']) or \
     not JSON_SHA.fullmatch(str(item.get('xmlSha256',''))) or \
     not item.get('actualUpstreamDetektRuleExecuted') or \
     item.get('independentCausalTruthVerified') is not False or \
     item.get('newLabels')!=0 or item.get('blindHoldout') is not False or \
     item.get('sssPlusCertified') is not False:
   block('untrusted or partial phase receipt')
  cases.append(item)
 return {
  'schema':'ultra-sentinel-c2-detekt-executable-kotlin-junit-comparison/v1',
  'oraclePhases':4,'passedTests':sum(c['testCount'] for c in cases),
  'sourcePrs':[7715,7888],'phases':cases,
  'status':'ORIGINAL_DETEKT_RULE_BEFORE_AFTER_ORACLES_PASS',
  'historicalLabels':23,'newLabels':0,'admittedLabels':0,
  'blindHoldout':False,'sssPlusCertified':False,
  'gradleDslCompilerPluginSemanticsVerified':False,
  'sentinelRuleCoverageVerified':False,
  'precision':None,'recall':None,'f1':None,
  'limitations':[
   'Tests execute original Detekt upstream modules, not Ultra Sentinel Core on vulnerable source',
   'The #7715 same-spelling function demonstrates Detekt still needs symbol resolution',
   'The #7888 Gradle DSL assign plugin-specific resolution is not independently executed',
   'This known original source evidence is not a blind holdout or independent GOLD label'
  ]
 }

def write_new(path,report):
 out=Path(path)
 if out.exists() or out.is_symlink():block('refusing to overwrite evidence')
 out.write_text(json.dumps(report,sort_keys=True,indent=2)+'\n',encoding='utf8')

def main(argv=None):
 parser=argparse.ArgumentParser()
 commands=parser.add_subparsers(dest='command',required=True)
 p=commands.add_parser('phase')
 p.add_argument('--pr',type=int,required=True);p.add_argument('--phase',required=True)
 p.add_argument('--source-root',required=True)
 p.add_argument('--junit-dir',required=True);p.add_argument('--output',required=True)
 p=commands.add_parser('summary');p.add_argument('--input',required=True);p.add_argument('--output',required=True)
 args=parser.parse_args(argv)
 try:
  if args.command=='phase':
   if args.pr not in SPECS or args.phase not in ('BEFORE','AFTER'):
    block('unknown oracle case')
   checkout=Path(args.source_root).resolve(strict=True)
   result=subprocess.run(['git','-C',str(checkout),'rev-parse','HEAD'],
     capture_output=True,text=True,timeout=15,check=True).stdout.strip()
   report=verify_phase(args.pr,args.phase,result,args.junit_dir)
  else:
   path=Path(args.input)
   if not path.is_dir() or path.is_symlink():block('summary input missing')
   rows={}
   files=list(path.glob('*/receipt.json'))
   if len(files)!=4:block('missing phase receipts')
   for f in files:
    if f.is_symlink() or f.stat().st_nlink!=1 or f.stat().st_size>40_000:block('unsafe phase receipt')
    data=json.loads(f.read_text(encoding='utf8'))
    key=(data.get('pr'),data.get('phase'))
    if key in rows or f.parent.name!=f"detekt-{key[0]}-{key[1]}":
     block('ambiguous summary identity')
    rows[key]=data
   report=summarize(rows)
  write_new(args.output,report)
  print(json.dumps({'status':report['status'],
    'tests':report.get('testCount',report.get('passedTests')),
    'newLabels':0,'blindHoldout':False}))
 except (OSError,ValueError,subprocess.SubprocessError,json.JSONDecodeError) as e:
  print(str(e)[:350],file=sys.stderr)
  return 2
 return 0

if __name__=='__main__':sys.exit(main())
