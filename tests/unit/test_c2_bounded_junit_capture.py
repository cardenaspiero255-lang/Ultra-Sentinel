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


 def test_uploaded_junit_reports_allow_runner_read_with_different_container_uid(self):
  # Real retry job 117906928510: upload-artifact hit EACCES on TEST-*.xml.
  # The bind mount's parent is private to the runner; an isolated container
  # may write with another uid, so exported JUnit files require mode 0644.
  import stat
  self.write_reports(2)
  result=self.capture()
  self.assertEqual(result.returncode,0,result.stderr)
  reports=list(self.output.glob('TEST-*.xml'))
  self.assertEqual(len(reports),2)
  for xml in reports:
   self.assertEqual(stat.S_IMODE(xml.stat().st_mode),0o644)
   self.assertTrue(xml.read_bytes().startswith(b'<testsuite>'))
  self.assertEqual(stat.S_IMODE(self.base.stat().st_mode),0o700)

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

 def test_full_validator_accepts_520_distinct_xml_and_still_mints_zero_labels(self):
  before=self.base/'before'
  after=self.base/'after'
  before.mkdir();after.mkdir()
  for i in range(520):
   state='<failure/>' if i==0 else ''
   (before/f'TEST-{i:05d}.xml').write_text(
    f'<testsuite><testcase classname="p.T" name="m{i}">{state}</testcase></testsuite>')
   (after/f'TEST-{i:05d}.xml').write_text(
    f'<testsuite><testcase classname="p.T" name="m{i}"/></testsuite>')
  manifest=self.base/'original-tests.json'
  manifest.write_text(json.dumps({'f2p_tests':['p.T.m0'],'p2p_tests':['p.T.m1'],
    's2p_tests':[],'n2p_tests':[]}))
  output=self.base/'receipt.json'
  cmd=[sys.executable,str(VALIDATOR),'--task','detekt_detekt-4628',
       '--expected',str(manifest),'--before',str(before),'--after',str(after),
       '--source-commit','a'*40,'--fixed-commit','b'*40,'--output',str(output)]
  run=subprocess.run(cmd,capture_output=True,text=True,timeout=45)
  self.assertEqual(run.returncode,0,run.stderr)
  report=json.loads(output.read_text())
  self.assertEqual(len(report['beforeJUnitFiles']),520)
  self.assertEqual(len(report['afterJUnitFiles']),520)
  self.assertEqual(report['verifiedFailToPassCount'],1)
  self.assertFalse(report['sourceCommitProvenanceVerified'])
  self.assertEqual(report['newPositiveLabels'],0)

 def test_validator_rejects_aggregate_budget_without_silent_truncation(self):
  api=SourceFileLoader('c2_bounded_total',str(VALIDATOR)).load_module()
  d=self.base/'junit'
  d.mkdir()
  for i in range(3):
   (d/f'TEST-{i}.xml').write_text(f'<testsuite><testcase classname="p.T" name="m{i}"/></testsuite>')
  api.MAX_TOTAL_XML_BYTES=25
  with self.assertRaises(ValueError):
   api.collect_junit(d)

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
