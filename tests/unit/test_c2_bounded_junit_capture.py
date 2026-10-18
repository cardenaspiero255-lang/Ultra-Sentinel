"""C2 resource-bounded original Gradle JUnit capture regressions (no labels)."""
import json
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from importlib.machinery import SourceFileLoader

ROOT=Path(__file__).resolve().parents[2]
CAPTURE=ROOT/'scripts'/'c2-capture-junit.py'
VALIDATOR=ROOT/'scripts'/'c2-upstream-junit-evidence.py'

class BoundedOriginalJUnit(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory()
  self.addCleanup(self.temp.cleanup)
  self.base=Path(self.temp.name)
  self.source=self.base/'source'
  self.source.mkdir()
  self.reports=self.source/'module'/'build'/'test-results'/'unit'
  self.reports.mkdir(parents=True)
  self.output=self.base/'output'
  self.output.mkdir()

 def write_reports(self,n):
  for i in range(n):
   (self.reports/f'TEST-{i:05d}.xml').write_text(
      f'<testsuite><testcase classname="p.T" name="m{i}"/></testsuite>',encoding='utf8')

 def capture(self):
  return subprocess.run([sys.executable,str(CAPTURE),'--source',str(self.source),
    '--output',str(self.output)],capture_output=True,text=True,timeout=50)

 def test_captures_more_than_500_original_reports_without_truncation(self):
  self.write_reports(520)
  x=self.capture()
  self.assertEqual(x.returncode,0,x.stderr)
  self.assertEqual(len(list(self.output.glob('TEST-*.xml'))),520)
  self.assertIn('C2_JUNIT_REPORTS_CAPTURED=520',x.stdout)

 def test_fails_closed_if_report_count_exceeds_cap(self):
  self.write_reports(4097)
  x=self.capture()
  self.assertNotEqual(x.returncode,0)
  self.assertIn('C2_JUNIT_CAPTURE_BLOCKED',x.stderr)
  self.assertEqual(list(self.output.iterdir()),[])

 def test_fails_closed_on_oversized_single_xml(self):
  (self.reports/'TEST-oversized.xml').write_bytes(b'a'*(2_097_152+1))
  x=self.capture()
  self.assertNotEqual(x.returncode,0)
  self.assertEqual(list(self.output.iterdir()),[])

 def test_rejects_symlinked_source_report(self):
  target=self.base/'outside.xml'
  target.write_text('<testsuite/>')
  (self.reports/'TEST-linked.xml').symlink_to(target)
  x=self.capture()
  self.assertNotEqual(x.returncode,0)
  self.assertEqual(list(self.output.iterdir()),[])

 def test_validator_parses_520_reports_but_keeps_zero_labels(self):
  api=SourceFileLoader('c2_large_junit',str(VALIDATOR)).load_module()
  self.assertGreaterEqual(api.MAX_XML_FILES,520)
  self.assertLessEqual(api.MAX_XML_FILES,4096)
  self.assertLessEqual(api.MAX_TOTAL_XML_BYTES,100_663_296)

 def test_accepts_authenticated_original_expected_manifest_larger_than_two_mib(self):
  api=SourceFileLoader('c2_big_expected',str(VALIDATOR)).load_module()
  manifest=self.base/'expected_tests.json'
  p2p=['p.ExampleTest.test'+str(i).zfill(5)+'x'*110 for i in range(20000)]
  manifest.write_text(json.dumps({'f2p_tests':['p.ExampleTest.fail()'],
    'p2p_tests':p2p,'s2p_tests':[],'n2p_tests':[]}))
  self.assertGreater(manifest.stat().st_size,2_097_152)
  classes,hash_=api.expected_tests(manifest)
  self.assertEqual(len(classes['p2p']),20000)
  self.assertEqual(len(hash_),64)
  self.assertEqual(api.MAX_EXPECTED_BYTES,8_388_608)

if __name__=='__main__':unittest.main()
