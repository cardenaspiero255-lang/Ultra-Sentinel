import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from importlib.machinery import SourceFileLoader

SCRIPT=Path(__file__).resolve().parents[2]/'scripts'/'c2-bulk-kotlin-campaign.py'

class CampaignTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.api=SourceFileLoader('campaign',str(SCRIPT)).load_module()
 def test_all_tasks_sharded_without_duplicates(self):
  tasks=[f'pinterest_ktlint-{i}' for i in range(1,44)]+[f'detekt_detekt-{i}' for i in range(1,29)]
  groups=self.api.shard_tasks(tasks,shard_size=6)
  self.assertEqual([a for g in groups for a in g['tasks']],sorted(tasks))
  self.assertTrue(all(1<=len(g['tasks'])<=6 for g in groups))
  self.assertEqual(len({g['id'] for g in groups}),len(groups))
 def test_reject_unknown_task_and_duplicate(self):
  for tasks in [['not_upstream-22'],['detekt_detekt-4205','detekt_detekt-4205'],['detekt_detekt-0']]:
   with self.assertRaises(ValueError):self.api.shard_tasks(tasks)
 def test_allowlist_exact_fixed_prefixes(self):
  self.assertEqual(self.api.parse_task('GradleUp_shadow-1313'),'gradleup_shadow')
  with self.assertRaises(ValueError):self.api.parse_task('GradleUp_shadow-1313;touch_bad')
 def test_manifest_cannot_count_sources_without_usable_f2p(self):
  with tempfile.TemporaryDirectory() as td:
   p=Path(td)/'expected_tests.json'
   p.write_text(json.dumps({'f2p_tests':[],'p2p_tests':['x.T.t()'],'s2p_tests':[],'n2p_tests':[]}))
   self.assertFalse(self.api.has_declared_f2p(p))
   p.write_text(json.dumps({'f2p_tests':['x.T.t()'],'p2p_tests':[],'s2p_tests':[],'n2p_tests':[]}))
   self.assertTrue(self.api.has_declared_f2p(p))
 def test_aggregate_never_mints_labels_even_success(self):
  items=[{'task':'GradleUp_shadow-1313','status':'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED','candidateTransitions':1},
         {'task':'detekt_detekt-4205','status':'INFRA_BLOCKED','reason':'runtime offline'}]
  report=self.api.summarize(items,expected_tasks=['GradleUp_shadow-1313','detekt_detekt-4205'])
  self.assertEqual(report['newPositiveLabels'],0)
  self.assertEqual(report['newNegativeLabels'],0)
  self.assertEqual(report['remaining'],97)
  self.assertEqual(report['candidateTransitionsObserved'],1)
  self.assertFalse(report['tripleSPlusCertified'])
  self.assertEqual(report['scoredLabels'],0)
 def test_aggregate_rejects_missing_and_duplicate_tasks(self):
  with self.assertRaises(ValueError):self.api.summarize([],expected_tasks=['detekt_detekt-4205'])
  with self.assertRaises(ValueError):self.api.summarize([{'task':'detekt_detekt-4205','status':'INFRA_BLOCKED'}]*2,expected_tasks=['detekt_detekt-4205'])
 def test_unknown_status_and_forged_label_is_rejected(self):
  for item in [{'task':'detekt_detekt-4205','status':'CERTIFIED'},{'task':'detekt_detekt-4205','status':'INFRA_BLOCKED','newPositiveLabels':1}]:
   with self.assertRaises(ValueError):self.api.summarize([item],expected_tasks=['detekt_detekt-4205'])
 def test_accept_complete_106_directory_roster(self):
  with tempfile.TemporaryDirectory() as td:
   root=Path(td)
   for prefix,(_,count) in self.api.PROJECTS.items():
    for i in range(1,count+1):
     task=f'{prefix}-{i}'
     directory=root/'tasks'/task
     (directory/'tests').mkdir(parents=True)
     (directory/'environment').mkdir()
     (directory/'task.toml').write_text('[verifier]\nimplemented=false\n')
     (directory/'tests'/'expected_tests.json').write_text(json.dumps({'f2p_tests':[],'p2p_tests':[],'s2p_tests':[],'n2p_tests':[]}))
     (directory/'environment'/'Dockerfile').write_text('FROM scratch\n')
   tasks=self.api.read_roster(root)
   self.assertEqual(len(tasks),106)
   self.assertEqual(len(set(tasks)),106)
   shards=self.api.shard_tasks(tasks)
   self.assertEqual(sum(len(x['tasks']) for x in shards),106)
   self.assertTrue(all(len(x['tasks'])<=5 for x in shards))
 def test_bash_phase_has_valid_syntax(self):
  f=SCRIPT.with_name('c2-upstream-evidence-phase.sh')
  outcome=subprocess.run(['bash','-n',str(f)],capture_output=True,text=True)
  self.assertEqual(outcome.returncode,0,outcome.stderr)
 def test_github_workflow_only_owner_dispatch_full_campaign(self):
  raw=(SCRIPT.parents[1]/'.github'/'workflows'/'c2-kotlin-106-campaign.yml').read_text()
  self.assertIn("github.actor_id == '322222186'",raw)
  self.assertIn("github.event_name == 'workflow_dispatch'",raw)
  self.assertIn("github.ref == 'refs/heads/main'",raw)
  self.assertIn('persist-credentials: false',raw)
  self.assertIn('max-parallel: 3',raw)
  self.assertIn('--network',SCRIPT.read_text())
 def test_reject_fake_sweep_toml_or_mismatch_expected_task_counts(self):
  with tempfile.TemporaryDirectory() as td:
   root=Path(td)
   for task in ('GradleUp_shadow-1313','detekt_detekt-4205'):
    d=root/'tasks'/task;d.mkdir(parents=True);(d/'task.toml').write_text('[verifier]\nimplemented=false\n')
   with self.assertRaises(ValueError):self.api.read_roster(root)
if __name__=='__main__':unittest.main()
