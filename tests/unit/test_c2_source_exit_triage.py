"""Original-source phase exit 40/41 must not be mislabelled as infrastructure."""
import json
import tempfile
import unittest
from pathlib import Path
from importlib.machinery import SourceFileLoader
from unittest.mock import patch
SCRIPT=Path(__file__).resolve().parents[2]/'scripts'/'c2-bulk-kotlin-campaign.py'
class SourceExitClassification(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.api=SourceFileLoader('c2_nonzero_classifier',str(SCRIPT)).load_module()
 def fixture(self,root):
  task='oss-review-toolkit_ort-10691'
  source=root/'tasks'/task
  (source/'tests').mkdir(parents=True)
  (source/'environment').mkdir()
  (source/'tests'/'expected_tests.json').write_text(json.dumps({
   'f2p_tests':['p.Test.testF2P'],'p2p_tests':['p.Test.testP2P'],
   's2p_tests':[],'n2p_tests':[]}))
  (source/'environment'/'Dockerfile').write_text('FROM kotlin-bench/oss-review-toolkit_ort:base\n')
  base=root/'bases'/'oss-review-toolkit_ort'
  base.mkdir(parents=True)
  (base/'Dockerfile.base').write_text('FROM scratch\n')
  return task
 def execute(self,bad_rc=40,has_xml=True):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp)/'upstream'
   task=self.fixture(root)
   def fake(args,timeout=1500):
    if args[:2]==['docker','run']:
     folder=Path(next(x for x in args if x.endswith(':/evidence:rw')).split(':/evidence:rw')[0])
     phase=next(x.split('=',1)[1] for x in args if x.startswith('C2_PHASE='))
     (folder/'commit.txt').write_text(('a' if phase=='before' else 'b')*40)
     if has_xml or phase=='before':
      (folder/'junit').mkdir(exist_ok=True)
      (folder/'junit'/'TEST-sample.xml').write_text('<testsuite><testcase classname="p.Test" name="testF2P"/></testsuite>')
     return (bad_rc,'Test passed before fix but failed after; original suite rejected') if phase=='after' else (0,'')
    return (0,'')
   with patch.object(self.api,'command',side_effect=fake):
    return self.api.docker_task(root,task,Path(temp)/'out',Path('/tmp/phase.sh'),Path('/tmp/validator.py'),set())
 def test_after_original_suite_rc40_with_xml_is_reproduction_mismatch_not_infra(self):
  x=self.execute(40,True)
  self.assertEqual(x['status'],'REPRODUCTION_MISMATCH')
  self.assertIn('AFTER_ORIGINAL_TEST_OR_VERIFIER_REJECTED',x.get('reason',''))
  self.assertEqual(x['newPositiveLabels'],0)
 def test_after_original_verifier_rc41_with_xml_is_reproduction_mismatch(self):
  x=self.execute(41,True)
  self.assertEqual(x['status'],'REPRODUCTION_MISMATCH')
  self.assertEqual(x['newNegativeLabels'],0)
 def test_after_missing_junit_reports_remains_infrastructure_block(self):
  x=self.execute(40,False)
  self.assertEqual(x['status'],'INFRA_BLOCKED')
 def test_other_source_failures_remain_infrastructure_block(self):
  x=self.execute(36,True)
  self.assertEqual(x['status'],'INFRA_BLOCKED')
if __name__=='__main__':unittest.main()
