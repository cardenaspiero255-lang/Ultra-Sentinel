"""Regression for real AnkiDroid artifact 12125882822: /evidence/commit.txt permission denied.

Synthetic command stubs test sandbox permissions only; never count as upstream labels.
"""
import json
import stat
import tempfile
import unittest
from pathlib import Path
from importlib.machinery import SourceFileLoader
from unittest.mock import patch

SCRIPT=Path(__file__).resolve().parents[2]/'scripts'/'c2-bulk-kotlin-campaign.py'

class EvidencePermissionTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.api=SourceFileLoader('c2_permissions_campaign',str(SCRIPT)).load_module()

 def test_docker_phase_can_write_bind_volume_and_runner_can_read_it(self):
  with tempfile.TemporaryDirectory() as td:
   root=Path(td)/'upstream'
   task='ankidroid_Anki-Android-20250'
   source=root/'tasks'/task
   (source/'tests').mkdir(parents=True)
   (source/'environment').mkdir()
   (source/'tests'/'expected_tests.json').write_text(json.dumps({
    'f2p_tests':['pkg.Test.testCase'],'p2p_tests':[],'s2p_tests':[],'n2p_tests':[]
   }))
   (source/'environment'/'Dockerfile').write_text('FROM kotlin-bench/ankidroid_anki-android:base\n')
   base=root/'bases'/'ankidroid_anki-android'
   base.mkdir(parents=True)
   (base/'Dockerfile.base').write_text('FROM scratch\n')
   out=Path(td)/'output'
   calls=[]

   def simulated_command(args,timeout=1500):
    calls.append(args)
    if args[0]=='docker' and args[1]=='run':
     mount=next(a for a in args if a.endswith(':/evidence:rw'))
     evidence=Path(mount.split(':/evidence:rw')[0])
     mode=stat.S_IMODE(evidence.stat().st_mode)
     # Simulates UID 0 with CAP_DAC_OVERRIDE removed in the runner container.
     if not (mode & stat.S_IWOTH and mode & stat.S_IXOTH):
      return 1,'/opt/c2-evidence-phase.sh: line 17: /evidence/commit.txt: Permission denied'
     phase=next(a.split('=',1)[1] for a in args if a.startswith('C2_PHASE='))
     (evidence/'commit.txt').write_text('a'*40 if phase=='before' else 'b'*40)
     (evidence/'junit').mkdir()
     (evidence/'junit'/'TEST-foo.xml').write_text('<testsuite/>')
     return 0,''
    if args[0]=='python3':
     output=Path(args[args.index('--output')+1])
     output.write_text(json.dumps({'verifiedFailToPassCount':1}))
    return 0,''

   with patch.object(self.api,'command',side_effect=simulated_command):
    result=self.api.docker_task(root,task,out,Path('/tmp/phase.sh'),Path('/tmp/gate.py'),set())

   self.assertEqual(result['status'],'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED',result)
   self.assertEqual(result['candidateTransitions'],1)
   self.assertEqual(result['newPositiveLabels'],0)
   self.assertEqual(result['newNegativeLabels'],0)
   for phase in ('before','after'):
    evidence=out/'evidence'/task/phase
    self.assertEqual(stat.S_IMODE(evidence.stat().st_mode),0o700)
    self.assertTrue((evidence/'commit.txt').is_file())
    self.assertTrue((evidence/'junit'/'TEST-foo.xml').is_file())
   self.assertEqual(len([c for c in calls if c[:2]==['docker','run']]),2)

 def test_evidence_files_are_readable_by_runner_after_different_container_uid(self):
  phase=SCRIPT.with_name('c2-upstream-evidence-phase.sh').read_text()
  self.assertIn('umask 022',phase)
  self.assertNotIn('umask 077',phase)

if __name__=='__main__':
 unittest.main()
