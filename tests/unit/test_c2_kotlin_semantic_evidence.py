"""Unit boundary tests only. Synthetic XML validates receipt safeguards, never
claims that a compiler or Gradle plugin actually ran."""
import json
import tempfile
import unittest
from importlib.machinery import SourceFileLoader
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parents[2]
mod=SourceFileLoader('c2_semantic_evidence',str(ROOT/'scripts/c2-kotlin-semantic-evidence.py')).load_module()

class SemanticEvidenceContract(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup)
  self.root=Path(t.name)
  self.upstream=self.root/'upstream';self.upstream.mkdir()
  wrapper=self.upstream/'gradle/wrapper';wrapper.mkdir(parents=True)
  (wrapper/'gradle-wrapper.properties').write_text(mod.WRAPPER+'\n')
  self.dsl=self.root/'dsl';self.dsl.mkdir()
  for n,b in mod.MARKERS.items():(self.dsl/n).write_bytes(b)
  self.fixtures=self.root/'repo'
  for name in [
   'tests/fixtures/c2-kotlin-semantic/C2SymbolResolutionOracleTest.kt',
   'tests/fixtures/c2-gradle-kotlin-dsl/build.gradle.kts',
   'tests/fixtures/c2-gradle-kotlin-dsl/settings.gradle.kts']:
   p=self.fixtures/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('source placeholder '+name)
  self.xml=self.root/('TEST-'+mod.CLASS+'.xml')
  self.write_xml()
  self.git=patch.object(mod.subprocess,'run',return_value=SimpleNamespace(stdout=mod.UPSTREAM_REF+'\n'))
  self.git.start();self.addCleanup(self.git.stop)
 def write_xml(self,names=None,fail=False,skip=False):
  names=list(sorted(mod.METHODS)) if names is None else names
  suite=ET.Element('testsuite',name=mod.CLASS,tests=str(len(names)),
   errors='0',failures='1' if fail else '0',skipped='1' if skip else '0')
  for i,n in enumerate(names):
   test=ET.SubElement(suite,'testcase',classname=mod.CLASS,name=n)
   if fail and i==0:ET.SubElement(test,'failure')
   if skip and i==0:ET.SubElement(test,'skipped')
  ET.ElementTree(suite).write(self.xml,encoding='utf-8',xml_declaration=True)
 def execute(self):return mod.verify(self.xml,self.dsl,self.upstream,self.fixtures)
 def test_exact_junit_and_gradle_markers_are_evidence_only(self):
  result=self.execute()
  self.assertEqual(result['originalJunitTestsPassed'],7)
  self.assertTrue(result['kotlinSymbolResolutionExecuted'])
  self.assertTrue(result['gradleDslCompilerPluginExecuted'])
  self.assertTrue(result['optInRequired'])
  self.assertEqual(result['newLabels'],0)
  self.assertIsNone(result['precision'])
  self.assertFalse(result['sentinelRuleCoverageVerified'])
 def test_no_lost_or_duplicate_oracles(self):
  for names in [list(mod.METHODS)[:-1],[*mod.METHODS,'constructorNoArg'],
   ['constructorNoArg']*7]:
   self.write_xml(names)
   with self.subTest(names=len(names)),self.assertRaises(ValueError):self.execute()
 def test_errors_failures_and_skips_block_receipts(self):
  for kwargs in [{'fail':True},{'skip':True}]:
   self.write_xml(**kwargs)
   with self.subTest(kwargs=kwargs),self.assertRaises(ValueError):self.execute()
 def test_bad_commit_and_wrapper_version_fail_closed(self):
  self.git.stop()
  with patch.object(mod.subprocess,'run',return_value=SimpleNamespace(stdout='f'*40)):
   with self.assertRaises(ValueError):self.execute()
  self.git.start()
  (self.upstream/'gradle/wrapper/gradle-wrapper.properties').write_text(
   'distributionUrl=https\\://services.gradle.org/distributions/gradle-9.0-all.zip\n')
  with self.assertRaises(ValueError):self.execute()
 def test_extra_marker_and_fake_gradle_assignment_rejected(self):
  (self.dsl/'c2DslAssignment.txt').write_text('C2_fake\n')
  with self.assertRaises(ValueError):self.execute()
  (self.dsl/'c2DslAssignment.txt').write_bytes(mod.MARKERS['c2DslAssignment.txt'])
  (self.dsl/'attacker.txt').write_text('PASS')
  with self.assertRaises(ValueError):self.execute()
 def test_symlinks_to_good_content_remain_untrusted(self):
  original=self.xml.read_bytes();self.xml.unlink()
  source=self.root/'real.xml';source.write_bytes(original)
  self.xml.symlink_to(source)
  with self.assertRaises(ValueError):self.execute()
 def test_xml_entities_and_wrong_suite_are_rejected(self):
  self.xml.write_bytes(b'<!DOCTYPE foo [<!ENTITY e SYSTEM "file:///etc/passwd">]>'+
   self.xml.read_bytes())
  with self.assertRaises(ValueError):self.execute()
  self.write_xml()
  content=self.xml.read_bytes().replace(mod.CLASS.encode(),b'evil.class',1)
  self.xml.write_bytes(content)
  with self.assertRaises(ValueError):self.execute()

if __name__=='__main__':unittest.main()
