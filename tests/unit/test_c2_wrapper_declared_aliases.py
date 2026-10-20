"""Tests use real WrapperSmokeTestSpec names from run 39272348349 artifacts
12199489392/12200188362. XML test files are reduced *unit fixtures*;
they are not an original-source replay, holdout or admitted labels.
"""
import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from importlib.machinery import SourceFileLoader
from pathlib import Path
from types import SimpleNamespace

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts' / 'c2-upstream-junit-evidence.py'
CLASS = 'io.gitlab.arturbosch.detekt.formatting.WrapperSmokeTestSpec'
BASE = 'for rule: io.gitlab.arturbosch.detekt.formatting.wrappers.'
PACKAGE = CLASS+'.'+BASE+'PackageName'
STRING = CLASS+'.'+BASE+'StringTemplateIndent'
REGRESSION = 'org.example.ControlSpec.originalRegression'
# Values transcribed from *original* BEFORE/AFTER JUnit evidence in run 39272348349.
PACKAGE_SUFFIXES = {
 '7625': ('c79915a','2cca7d3c'),
 '7635': ('45a4587d','75707f05'),
 '7667': ('41736818','41736818'),
 '7715': ('59e67a18','59e67a18'),
 '7718': ('154fcedd','154fcedd'),
 '7888': ('33c91567','6e620fa9'),
}

class DeclaredWrapperNames(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.gate=SourceFileLoader('c2_declared_wrapper_gate',str(SCRIPT)).load_module()

 def setUp(self):
  tmp=tempfile.TemporaryDirectory();self.addCleanup(tmp.cleanup)
  root=Path(tmp.name);self.before=root/'before';self.after=root/'after'
  self.before.mkdir();self.after.mkdir()
  self.expected=root/'expected.json';self.out=root/'receipt.json'
  self.manifest([PACKAGE])
  self.write(self.before,[(REGRESSION,'FAIL'),(CLASS+'.'+BASE+'PackageName@c79915a','PASS')])
  self.write(self.after,[(REGRESSION,'PASS'),(CLASS+'.'+BASE+'PackageName@2cca7d3c','PASS')])

 def manifest(self,declared):
  self.expected.write_text(json.dumps({'f2p_tests':[REGRESSION],
   'p2p_tests':declared,'s2p_tests':[],'n2p_tests':[]}),encoding='utf8')

 def write(self,folder,entries,filename='TEST-case.xml'):
  suite=ET.Element('testsuite',name='original')
  for raw,state in entries:
   # The class and display name are split at the exact Spec. delimiter.
   cls,name=(raw.split('Spec.',1)[0]+'Spec',raw.split('Spec.',1)[1]) if 'Spec.' in raw else raw.rsplit('.',1)
   case=ET.SubElement(suite,'testcase',classname=cls,name=name)
   if state=='FAIL':ET.SubElement(case,'failure')
   if state=='SKIP':ET.SubElement(case,'skipped')
  ET.ElementTree(suite).write(folder/filename,encoding='utf-8',xml_declaration=True)

 def evaluate(self):
  args=SimpleNamespace(task='detekt_detekt-7625',expected=str(self.expected),
   before=str(self.before),after=str(self.after),output=str(self.out),
   source_commit='a'*40,fixed_commit='b'*40)
  _,result=(None,self.gate.evaluate(args))
  return result,json.loads(self.out.read_text(encoding='utf8'))

 def test_original_six_package_name_controls_reproduce_without_artificial_labels(self):
  for case,(before_suffix,after_suffix) in PACKAGE_SUFFIXES.items():
   with self.subTest(original_candidate=case):
    self.write(self.before,[(REGRESSION,'FAIL'),(CLASS+'.'+BASE+'PackageName@'+before_suffix,'PASS')])
    self.write(self.after,[(REGRESSION,'PASS'),(CLASS+'.'+BASE+'PackageName@'+after_suffix,'PASS')])
    status,report=self.evaluate()
    self.assertEqual(status['candidateTransitions'],1)
    self.assertEqual(report['verifiedPassToPassCount'],1)
    self.assertEqual(report['newPositiveLabels'],0)
    self.assertEqual(report['newNegativeLabels'],0)
    self.assertFalse(report['rootCauseVerified'])
    self.assertFalse(report['tripleSPlusCertified'])
    self.out.unlink()

 def test_two_declared_original_wrapper_rules_can_normalize(self):
  self.manifest([PACKAGE,STRING])
  for folder,state,tag in [(self.before,'FAIL','a2f1041'),(self.after,'PASS','7b9e182')]:
   self.write(folder,[(REGRESSION,state),(CLASS+'.'+BASE+'PackageName@c79915a','PASS'),
                      (CLASS+'.'+BASE+'StringTemplateIndent@'+tag,'PASS')])
  _,report=self.evaluate()
  self.assertEqual(report['verifiedPassToPassCount'],2)

 def test_original_full_identity_preserved_in_hashed_evidence_receipt(self):
  _,report=self.evaluate()
  canonical=PACKAGE
  raw=PACKAGE+'@c79915a'
  aliases=report['beforeNormalizedJUnitAliases']
  self.assertIn({'raw':raw,'canonical':canonical},aliases)
  self.assertEqual(len(aliases),1)
  self.assertIn({'raw':PACKAGE+'@2cca7d3c','canonical':PACKAGE},
                report['afterNormalizedJUnitAliases'])
  self.assertEqual(len(report['beforeJUnitFiles'][0][1]),64)

 def test_declaration_required_unlisted_wrapper_keeps_raw_identity(self):
  self.write(self.before,[(REGRESSION,'FAIL'),(PACKAGE+'@c79915a','PASS'),
     (CLASS+'.'+BASE+'NotInManifest@c79915a','PASS')])
  self.write(self.after,[(REGRESSION,'PASS'),(PACKAGE+'@2cca7d3c','PASS'),
     (CLASS+'.'+BASE+'NotInManifest@2cca7d3c','PASS')])
  self.evaluate()
  expected={PACKAGE}
  cases,_,_=self.gate.collect_junit(self.before,expected)
  self.assertIn(CLASS+'.'+BASE+'NotInManifest@c79915a',cases)
  self.assertNotIn(CLASS+'.'+BASE+'NotInManifest',cases)

 def test_two_distinct_aliases_even_both_pass_are_rejected(self):
  self.write(self.before,[(REGRESSION,'FAIL'),(PACKAGE+'@c79915a','PASS'),
    (PACKAGE+'@a1b2c3d4','PASS')])
  with self.assertRaisesRegex(ValueError,'conflict'):
   self.evaluate()
  self.assertFalse(self.out.exists())

 def test_two_distinct_aliases_with_opposite_states_are_rejected(self):
  self.write(self.before,[(REGRESSION,'FAIL'),(PACKAGE+'@c79915a','PASS'),
    (PACKAGE+'@a1b2c3d4','FAIL')])
  with self.assertRaisesRegex(ValueError,'conflict'):
   self.evaluate()
  self.assertFalse(self.out.exists())

 def test_duplicate_exact_alias_same_state_deduplicates_but_conflict_rejected(self):
  self.write(self.before,[(PACKAGE+'@c79915a','PASS')],'TEST-second.xml')
  _,report=self.evaluate()
  self.assertEqual(report['beforeEquivalentDuplicateJUnitCount'],1)
  self.out.unlink()
  self.write(self.before,[(PACKAGE+'@c79915a','FAIL')],'TEST-second.xml')
  with self.assertRaises(ValueError):self.evaluate()
  self.assertFalse(self.out.exists())

 def test_unsuffixed_and_suffixed_alias_collision_is_rejected(self):
  self.write(self.before,[(REGRESSION,'FAIL'),(PACKAGE,'PASS'),
     (PACKAGE+'@c79915a','PASS')])
  with self.assertRaisesRegex(ValueError,'conflict'):self.evaluate()

 def test_other_classes_and_invalid_suffix_never_canonicalize(self):
  for cls,name in [('org.example.NotTheWrapperSpec',BASE+'PackageName@c79915a'),
      (CLASS,BASE+'PackageName@nothex'),(CLASS,BASE+'PackageName@1234'),
      (CLASS,BASE+'PackageName@123456789'),(CLASS,BASE+'PackageName@C79915A')]:
   with self.subTest(cls=cls,name=name):
    self.write(self.before,[(REGRESSION,'FAIL'),(cls+'.'+name,'PASS')])
    self.write(self.after,[(REGRESSION,'PASS'),(cls+'.'+name,'PASS')])
    with self.assertRaises(ValueError):self.evaluate()
    self.assertFalse(self.out.exists())

if __name__=='__main__': unittest.main()
