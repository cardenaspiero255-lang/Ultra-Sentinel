"""TDD contract for four pinned external Kotlin/Detekt JUnit oracle runs.

Synthetic XML here tests only receipt validation. It is NOT the upstream
detector execution. Authentic upstream evidence must be generated in Actions.
"""
import json
import tempfile
import unittest
from importlib.machinery import SourceFileLoader
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parents[2]
SCRIPT=ROOT/'scripts'/'c2-detekt-executable-oracle.py'
class OracleEvidenceContractTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.oracle=SourceFileLoader('c2_detekt_executable_oracle',str(SCRIPT)).load_module()
 def setUp(self):
  temp=tempfile.TemporaryDirectory()
  self.addCleanup(temp.cleanup)
  self.root=Path(temp.name)
  self.xml=self.root/'junit';self.xml.mkdir()
 def make(self,pr=7715,fail=False,missing=False,duplicate=False,skip=False):
  config=self.oracle.SPECS[pr]
  methods=list(config['tests'])
  if missing:methods.pop()
  if duplicate:methods[-1]=methods[0]
  suite=ET.Element('testsuite',name=config['suite'],
    tests=str(len(methods)),failures='1' if fail else '0',
    errors='0',skipped='1' if skip else '0')
  for i,name in enumerate(methods):
   case=ET.SubElement(suite,'testcase',classname=config['suite'],name=name)
   if fail and i==0:ET.SubElement(case,'failure')
   if skip and i==0:ET.SubElement(case,'skipped')
  p=self.xml/('TEST-'+config['suite']+'.xml')
  ET.ElementTree(suite).write(p,encoding='utf-8',xml_declaration=True)
  return p
 def test_7715_6_actual_named_oracles_in_xml_are_attested(self):
  self.make()
  result=self.oracle.verify_phase(7715,'BEFORE',
    self.oracle.SPECS[7715]['BEFORE'],self.xml)
  self.assertEqual(result['testCount'],6)
  self.assertEqual(result['sourceCommit'],self.oracle.SPECS[7715]['BEFORE'])
  self.assertEqual(result['newLabels'],0)
  self.assertEqual(result['status'],'UPSTREAM_RULE_JUNIT_ORACLE_PASSED')
  self.assertFalse(result['independentCausalTruthVerified'])
 def test_7888_5_kotlin_context_tests_are_not_claimed_as_gradle_plugin_oracle(self):
  self.make(7888)
  report=self.oracle.verify_phase(7888,'AFTER',
    self.oracle.SPECS[7888]['AFTER'],self.xml)
  self.assertEqual(report['testCount'],5)
  self.assertFalse(report['gradleDslCompilerPluginSemanticsVerified'])
  self.assertFalse(report['sentinelRuleEquivalent'])
 def test_mismatched_commit_or_unknown_phase_is_rejected(self):
  self.make()
  for bad_pr,bad_phase,bad_sha in [(7715,'BEFORE','a'*40),
    (7715,'BEF0RE',self.oracle.SPECS[7715]['BEFORE']),
    (7625,'BEFORE',self.oracle.SPECS[7715]['BEFORE'])]:
   with self.subTest(pr=bad_pr,phase=bad_phase):
    with self.assertRaises(ValueError):
     self.oracle.verify_phase(bad_pr,bad_phase,bad_sha,self.xml)
 def test_zero_missing_or_duplicated_junit_test_cases_are_not_accepted(self):
  for kwargs in [{'missing':True},{'duplicate':True}]:
   self.make(**kwargs)
   with self.subTest(**kwargs),self.assertRaises(ValueError):
    self.oracle.verify_phase(7715,'BEFORE',
      self.oracle.SPECS[7715]['BEFORE'],self.xml)
 def test_failure_skipped_and_error_controls_fail_closed(self):
  for kwargs in [{'fail':True},{'skip':True}]:
   self.make(**kwargs)
   with self.subTest(**kwargs),self.assertRaises(ValueError):
    self.oracle.verify_phase(7715,'BEFORE',
      self.oracle.SPECS[7715]['BEFORE'],self.xml)
 def test_symlink_xml_and_unexpected_extra_suite_are_rejected(self):
  target=self.make()
  extra=self.xml/'TEST-extra.xml'
  extra.write_text(target.read_text())
  with self.assertRaises(ValueError):
   self.oracle.verify_phase(7715,'BEFORE',self.oracle.SPECS[7715]['BEFORE'],self.xml)
  extra.unlink()
  target.unlink()
  target.symlink_to(self.root/'other')
  with self.assertRaises(ValueError):
   self.oracle.verify_phase(7715,'BEFORE',self.oracle.SPECS[7715]['BEFORE'],self.xml)
 def test_summary_demands_all_four_real_receipts_even_if_two_pass(self):
  out={}
  for pr in (7715,7888):
   self.make(pr)
   for phase in ('BEFORE','AFTER'):
    out[(pr,phase)]=self.oracle.verify_phase(pr,phase,self.oracle.SPECS[pr][phase],self.xml)
   # remove old other suite before next test
   (self.xml/('TEST-'+self.oracle.SPECS[pr]['suite']+'.xml')).unlink()
  result=self.oracle.summarize(out)
  self.assertEqual(result['oraclePhases'],4)
  self.assertEqual(result['passedTests'],22)
  self.assertEqual(result['newLabels'],0)
  self.assertFalse(result['blindHoldout'])
  self.assertFalse(result['sssPlusCertified'])
  self.assertFalse(result['sentinelRuleCoverageVerified'])
  del out[(7888,'AFTER')]
  with self.assertRaises(ValueError):self.oracle.summarize(out)
 def test_new_suite_has_no_trust_in_config_claims_without_xml(self):
  with self.assertRaises(ValueError):
   self.oracle.verify_phase(7888,'BEFORE',self.oracle.SPECS[7888]['BEFORE'],self.xml)

if __name__=='__main__':unittest.main()
