#!/usr/bin/env python3
"""Optional READ-ONLY Kotlin semantic diagnostic evidence, NOT a Sentinel rule.

Attests JUnit compiler-binding-context tests and two real Gradle Kotlin DSL
task results from an authorized workflow. Never admits or labels known PRs.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

UPSTREAM_REF='5d9ee0d6d61e7b59d798c99611e48e4105681624'
CLASS='io.gitlab.arturbosch.detekt.rules.exceptions.C2SymbolResolutionOracleTest'
METHODS=frozenset((
 'constructorNoArg','constructorWithMessage','lowercaseHomonym',
 'uppercaseHomonym','sameNameCallable','importedAliasConstructor',
 'unresolvedCallFailsClosed'
))
MARKERS={
 'c2DslAssignment.txt':b'C2_REAL_GRADLE_ASSIGNMENT_PLUGIN_OK\n',
 'c2SetterControl.txt':b'C2_GRADLE_SETTER_CONTROL_OK\n'
}
WRAPPER='distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-all.zip'
MAX_XML=250000
MAX_JSON=100000

def blocked(reason):
 raise ValueError('C2_KOTLIN_SEMANTIC_NOT_ATTESTED: '+reason)

def verified_file(path,max_bytes):
 p=Path(path)
 if p.is_symlink() or not p.is_file() or p.stat().st_nlink!=1:
  blocked('missing, symlinked or linked evidence '+p.name)
 if p.stat().st_size<1 or p.stat().st_size>max_bytes:
  blocked('invalid evidence size '+p.name)
 return p.read_bytes()

def sha(data):
 return hashlib.sha256(data).hexdigest()

def verify(symbol_xml,gradle_output,upstream_root,fixture_root):
 """Evidence only: source identity and test outcomes, not classifier metrics."""
 upstream=Path(upstream_root)
 if upstream.is_symlink() or not upstream.is_dir():blocked('upstream root missing')
 try:
  head=subprocess.run(['git','-C',str(upstream),'rev-parse','HEAD'],
    capture_output=True,text=True,check=True,timeout=12).stdout.strip()
 except (OSError,subprocess.SubprocessError) as e:
  blocked('unavailable upstream SHA: '+str(e)[:65])
 if head!=UPSTREAM_REF:blocked('unexpected upstream Git commit')
 wrapper=verified_file(upstream/'gradle/wrapper/gradle-wrapper.properties',4096)
 if WRAPPER.encode() not in wrapper.splitlines():
  blocked('Gradle 8.10.2 wrapper not pinned')

 suitepath=Path(symbol_xml)
 if suitepath.name!='TEST-'+CLASS+'.xml':blocked('unexpected JUnit suite filename')
 raw=verified_file(suitepath,MAX_XML)
 if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
  blocked('unsafe XML entity/doctype')
 try:element=ET.fromstring(raw)
 except ET.ParseError:blocked('invalid original JUnit XML')
 if element.tag!='testsuite' or element.get('name')!=CLASS:
  blocked('wrong compiler-binding-context JUnit suite')
 for field,expected in [('tests',str(len(METHODS))),('errors','0'),('failures','0'),('skipped','0')]:
  if element.get(field)!=expected:blocked('JUnit tests did not all pass: '+field)
 tests=element.findall('testcase')
 if len(tests)!=len(METHODS) or len(list(element))!=len(METHODS):
  blocked('extra or missing testcases')
 ids=[]
 for case in tests:
  if case.get('classname')!=CLASS or list(case) or case.get('name') is None:
   blocked('untrusted original JUnit testcase')
  name=case.get('name').removesuffix('()')
  ids.append(name)
 if set(ids)!=METHODS or len(set(ids))!=len(METHODS):
  blocked('ambiguous or undeclared compiler oracle')
 root=Path(gradle_output)
 if root.is_symlink() or not root.is_dir():blocked('Gradle DSL output absent')
 actual={x.name for x in root.iterdir()}
 if actual!=set(MARKERS):blocked('Gradle DSL evidence missing or extra')
 marker_hashes={}
 for name,expected in MARKERS.items():
  content=verified_file(root/name,200)
  if content!=expected:blocked('Gradle Kotlin DSL task did not verify')
  marker_hashes[name]=sha(content)
 source=Path(fixture_root)
 if source.is_symlink() or not source.is_dir():
  blocked('Kotlin source fixture missing')
 required_files=[
  'tests/fixtures/c2-kotlin-semantic/C2SymbolResolutionOracleTest.kt',
  'tests/fixtures/c2-gradle-kotlin-dsl/build.gradle.kts',
  'tests/fixtures/c2-gradle-kotlin-dsl/settings.gradle.kts'
 ]
 hashes={}
 for name in required_files:
  hashes[name]=sha(verified_file(source/name,90000))
 return {
  'schema':'ultra-sentinel-c2-optional-kotlin-semantic-evidence/v1',
  'evidenceKind':'ORIGINAL_JVM_SYMBOL_RESOLUTION_AND_GRADLE_DSL_ASSIGNMENT',
  'upstreamRepository':'detekt/detekt','upstreamSha':head,
  'originalJunitTestsPassed':7,'originalJunitXmlSha256':sha(raw),
  'originalJunitTestNames':sorted(ids),
  'kotlinSymbolResolutionExecuted':True,
  'gradleDslCompilerPluginExecuted':True,
  'gradleDslAssignmentMarkerSha256':marker_hashes,
  'fixtureSha256':hashes,
  'experimental':True,'optInRequired':True,
  'sentinelRuleCoverageVerified':False,
  'newLabels':0,'admittedLabels':0,'historicalLabels':23,
  'blindHoldout':False,'precision':None,'recall':None,'f1':None,
  'sssPlusCertified':False,
  'cautions':[
   'JVM Kotlin BindingContext API is a pinned K1-style probe, NOT proven K2 Analysis API',
   'A real Gradle DSL assignment compiled, but this does NOT prove Detekt unused import precision inside Gradle scripts',
   'No new Ultra Sentinel security rule or diagnostic ruleId is emitted',
   'JUnit evidence proves only the cases tested, not independence or GOLD labels'
  ]
 }

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--xml',required=True)
 p.add_argument('--gradle-output',required=True)
 p.add_argument('--upstream',required=True)
 p.add_argument('--fixtures',required=True)
 p.add_argument('--output',required=True)
 a=p.parse_args()
 try:
  report=verify(a.xml,a.gradle_output,a.upstream,a.fixtures)
  out=Path(a.output)
  if out.is_symlink() or out.exists():blocked('refusing to replace previous evidence')
  out.parent.mkdir(parents=True,exist_ok=True)
  out.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n',encoding='utf8')
  print(json.dumps({'tests':7,'gradleDslVerified':True,'kotlinSymbolVerified':True,
   'newLabels':0,'sentinelRuleCoverageVerified':False}))
  return 0
 except (ValueError,OSError) as e:
  print(str(e)[:300],file=sys.stderr)
  return 2

if __name__=='__main__':sys.exit(main())
