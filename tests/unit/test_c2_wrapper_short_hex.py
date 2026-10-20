"""Detekt source JUnit replay 39321487604: exactly two controls have a 5-hex
Spek instance id. These are reduced regression cases from original XML; no gold
labels, detector correctness or source provenance can be inferred.
"""
import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from importlib.machinery import SourceFileLoader
from pathlib import Path
from types import SimpleNamespace

SCRIPT=Path(__file__).resolve().parents[2]/'scripts'/'c2-upstream-junit-evidence.py'
CLASS='io.gitlab.arturbosch.detekt.formatting.WrapperSmokeTestSpec'
PREFIX='for rule: io.gitlab.arturbosch.detekt.formatting.wrappers.'
F2P='org.example.ControlSpec.originalRegression'

class FiveDigitOriginalDetektAliases(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.gate=SourceFileLoader('c2_five_digit_wrapper_gate',str(SCRIPT)).load_module()
 def setUp(self):
  temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
  p=Path(temp.name);self.before=p/'before';self.after=p/'after'
  self.before.mkdir();self.after.mkdir()
  self.expected=p/'expected.json';self.output=p/'receipt.json'
 def xml(self,path,rule,suffix,phase,duplicate=None,unlisted=None):
  suite=ET.Element('testsuite',name='original')
  test=ET.SubElement(suite,'testcase',classname='org.example.ControlSpec',name='originalRegression')
  if phase=='before':ET.SubElement(test,'failure')
  ET.SubElement(suite,'testcase',classname=CLASS,name=PREFIX+rule+'@'+suffix)
  if unlisted:
   ET.SubElement(suite,'testcase',classname=CLASS,name=PREFIX+unlisted+'@c8e99')
  if duplicate:
   case=ET.SubElement(suite,'testcase',classname=CLASS,name=PREFIX+rule+'@'+duplicate[0])
   if duplicate[1]=='FAIL':ET.SubElement(case,'failure')
  ET.ElementTree(suite).write(path/'TEST-original.xml',encoding='utf-8')
 def run_original_case(self,rule,short='c8e99',extra_before=None,declared=True):
  canonical=CLASS+'.'+PREFIX+rule
  self.expected.write_text(json.dumps({'f2p_tests':[F2P],
    'p2p_tests':[canonical] if declared else [CLASS+'.'+PREFIX+'AnotherDeclaredRule'],
    's2p_tests':[],'n2p_tests':[]}))
  self.xml(self.before,rule,short,'before',duplicate=extra_before)
  self.xml(self.after,rule,short,'after')
  args=SimpleNamespace(task='detekt_detekt-7715',expected=str(self.expected),
    before=str(self.before),after=str(self.after),
    source_commit='a'*40,fixed_commit='b'*40,output=str(self.output))
  return self.gate.evaluate(args)
 def test_ifelsebracing_original_case_7715_matches_declared_control(self):
  result=self.run_original_case('IfElseBracing')
  self.assertEqual(result['candidateTransitions'],1)
  report=json.loads(self.output.read_text())
  self.assertEqual(report['beforeNormalizedJUnitAliases'],
   [{'raw':CLASS+'.'+PREFIX+'IfElseBracing@c8e99',
     'canonical':CLASS+'.'+PREFIX+'IfElseBracing'}])
  self.assertEqual(report['newPositiveLabels'],0)
  self.assertFalse(report['sourceCommitProvenanceVerified'])
 def test_ifelsewrapping_original_case_7718_matches_declared_control(self):
  self.run_original_case('IfElseWrapping')
  report=json.loads(self.output.read_text())
  self.assertEqual(report['verifiedPassToPassCount'],1)
  self.assertEqual(report['afterNormalizedJUnitAliases'][0]['raw'],
    CLASS+'.'+PREFIX+'IfElseWrapping@c8e99')
  self.assertEqual(report['newNegativeLabels'],0)
 def test_aliased_short_hex_only_when_manifest_declares_exact_rule(self):
  declared={CLASS+'.'+PREFIX+'IfElseBracing'}
  self.assertEqual(self.gate.canonical_junit_identity(CLASS,PREFIX+'OtherRule@c8e99',declared),
    CLASS+'.'+PREFIX+'OtherRule@c8e99')
 def test_short_hex_not_generalized_to_other_classes_or_non_hex(self):
  required={CLASS+'.'+PREFIX+'IfElseBracing'}
  for cls,name in [('org.example.OtherSpec',PREFIX+'IfElseBracing@c8e99'),
    (CLASS,PREFIX+'IfElseBracing@z8e99'),
    (CLASS,PREFIX+'IfElseBracing@c8e9'),
    (CLASS,PREFIX+'IfElseBracing@c8e999999')]:
   with self.subTest(cls=cls,name=name):
    self.assertEqual(self.gate.canonical_junit_identity(cls,name,required),cls+'.'+name)
 def test_two_distinct_short_aliases_are_ambiguous_even_both_pass(self):
  with self.assertRaisesRegex(ValueError,'conflicting|not demonstrated'):
   self.run_original_case('IfElseBracing',extra_before=('abcde','PASS'))
  self.assertFalse(self.output.exists())
 def test_same_exact_short_alias_duplicate_is_equivalent(self):
  self.run_original_case('IfElseBracing',extra_before=('c8e99','PASS'))
  report=json.loads(self.output.read_text())
  self.assertEqual(report['beforeEquivalentDuplicateJUnitCount'],1)
  self.assertFalse(report['tripleSPlusCertified'])
 def test_short_alias_conflicting_states_fail_closed(self):
  with self.assertRaises(ValueError):
   self.run_original_case('IfElseWrapping',extra_before=('c8e99','FAIL'))
  self.assertFalse(self.output.exists())

if __name__=='__main__': unittest.main()
