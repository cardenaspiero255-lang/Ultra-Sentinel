"""Fail-closed JUnit identities from original detekt_detekt-4205 receipt.

The upstream Kotlin specs use spaces, < > and embedded newlines.
Duplicate states across reports may agree; disagreement outside the
declared test set must be disclosed and excluded, never scored.
"""
import hashlib
import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from importlib.machinery import SourceFileLoader
from pathlib import Path
from types import SimpleNamespace

GATE=Path(__file__).resolve().parents[2]/'scripts'/'c2-upstream-junit-evidence.py'
F2P=('io.gitlab.arturbosch.detekt.rules.style.ForbiddenMethodCallSpec.'
     'should report overriding method calls')
P2P=('io.gitlab.arturbosch.detekt.rules.performance.ArrayPrimitiveSpec.'
     'is emptyArray<Int>()')
MULTILINE=('io.gitlab.arturbosch.detekt.rules.naming.MatchingDeclarationNameSpec.'
  'should not pass for class declaration not as first declaration with utility functions\n'
  'when mustBeFirst is false.')
AMBIG=('io.gitlab.arturbosch.detekt.DetektMultiplatformSpec.configures baseline task')

class DetektIdentityEvidenceTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.gate=SourceFileLoader('detekt_gate',str(GATE)).load_module()

 def setUp(self):
  t=tempfile.TemporaryDirectory()
  self.addCleanup(t.cleanup)
  root=Path(t.name)
  self.before=root/'before'
  self.after=root/'after'
  self.before.mkdir();self.after.mkdir()
  self.exp=root/'expected.json'
  self.out=root/'verified.json'
  self.expected([P2P,MULTILINE])
  self.write(self.before,'one',{F2P:'FAIL',P2P:'PASS',MULTILINE:'PASS'})
  self.write(self.after,'one',{F2P:'PASS',P2P:'PASS',MULTILINE:'PASS'})

 def expected(self,p2p):
  self.exp.write_text(json.dumps({'f2p_tests':[F2P],'p2p_tests':p2p,'s2p_tests':[],
                                  'n2p_tests':[]}),encoding='utf-8')

 def write(self,folder,suffix,states):
  root=ET.Element('testsuites')
  suite=ET.SubElement(root,'testsuite',name='original')
  for test,state in states.items():
   classname,name=test.rsplit('.',1) if 'Spec.' not in test else (
     test.split('Spec.',1)[0]+'Spec',test.split('Spec.',1)[1])
   case=ET.SubElement(suite,'testcase',classname=classname,name=name)
   if state=='FAIL':ET.SubElement(case,'failure')
   elif state=='SKIP':ET.SubElement(case,'skipped')
  ET.ElementTree(root).write(folder/f'TEST-{suffix}.xml',encoding='utf-8',xml_declaration=True)

 def run_gate(self):
  args=SimpleNamespace(task='detekt_detekt-4205',expected=str(self.exp),before=str(self.before),
      after=str(self.after),output=str(self.out),source_commit='a'*40,fixed_commit='b'*40)
  result=self.gate.evaluate(args)
  return result,json.loads(self.out.read_text())

 def test_original_detekt_accepts_spaces_angles_and_multiline_identifiers(self):
  result,report=self.run_gate()
  self.assertEqual(result['candidateTransitions'],1)
  self.assertEqual(report['verifiedPassToPassCount'],2)
  self.assertEqual(report['newPositiveLabels'],0)
  self.assertFalse(report['independentReviewVerified'])

 def test_identical_repeated_results_are_deduplicated_not_double_scored(self):
  self.write(self.before,'repeat',{P2P:'PASS'})
  self.write(self.after,'repeat',{P2P:'PASS'})
  _,report=self.run_gate()
  self.assertEqual(report['verifiedPassToPassCount'],2)
  self.assertGreater(report['beforeEquivalentDuplicateJUnitCount'],0)
  self.assertGreater(report['afterEquivalentDuplicateJUnitCount'],0)

 def test_expected_control_with_conflicting_states_fails_closed(self):
  self.write(self.before,'conflict',{P2P:'FAIL'})
  with self.assertRaisesRegex(ValueError,'conflict|control|p2p|duplicate'):
   self.run_gate()
  self.assertFalse(self.out.exists())

 def test_unscored_conflicts_are_excluded_and_reported_not_certified(self):
  self.write(self.before,'extra-pass',{AMBIG:'PASS'})
  self.write(self.before,'extra-skip',{AMBIG:'SKIP'})
  self.write(self.after,'extra-pass',{AMBIG:'PASS'})
  self.write(self.after,'extra-skip',{AMBIG:'SKIP'})
  _,report=self.run_gate()
  self.assertEqual(report['beforeConflictingUnscoredJUnitCount'],1)
  self.assertEqual(report['afterConflictingUnscoredJUnitCount'],1)
  self.assertEqual(report['verifiedFailToPassCount'],1)
  self.assertEqual(report['newPositiveLabels'],0)
  self.assertFalse(report['rawJUnitAuthenticityVerified'])
  self.assertEqual(len(report['beforeConflictingUnscoredJUnitSha256']),64)

 def test_conflicting_regression_before_and_after_must_be_rejected(self):
  self.write(self.before,'conflict',{F2P:'PASS'})
  with self.assertRaises(ValueError):
   self.run_gate()
  self.assertFalse(self.out.exists())

 def test_control_characters_remain_disallowed_even_with_multiline_enabled(self):
  self.expected([P2P,MULTILINE,'org.example.Test.inject\x01control'])
  with self.assertRaisesRegex(ValueError,'invalid|duplicate'):
   self.run_gate()
  self.assertFalse(self.out.exists())

if __name__=='__main__':
 unittest.main()
