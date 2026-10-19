import json, unittest
from pathlib import Path
from importlib.machinery import SourceFileLoader
ROOT=Path(__file__).resolve().parents[2]
RETRY=ROOT/'scripts'/'c2-targeted-kotlin-retry.py'
FIXTURE=ROOT/'tests'/'fixtures'/'c2-kotlin-retry-selection.json'
SOURCE=ROOT/'tests'/'fixtures'/'c2-upstream-106-task-tree.json'
class RetryOriginalCampaign(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.api=SourceFileLoader('c2_targeted_replay',str(RETRY)).load_module()
 def fixture(self):
  return json.loads(FIXTURE.read_text())
 def test_exact_62_pin_and_group_origin(self):
  selected=self.api.selection(self.fixture())
  self.assertEqual(len(selected),62)
  self.assertEqual(len(set(selected)),62)
  self.assertTrue(all(x.startswith(('detekt_detekt-','pinterest_ktlint-')) for x in selected))
  self.assertIn('detekt_detekt-4628',selected)
  self.assertIn('pinterest_ktlint-2029',selected)
  self.assertNotIn('linreal_cascade-editor-16',selected)
 def test_tampering_with_group_ids_digest_and_labels_is_blocked(self):
  manifest=self.fixture()
  for modification in (
   lambda m:m['sourceGroups']['junitLimit500'].append('detekt_detekt-4205'),
   lambda m:m['sourceGroups']['ktlintClassIdentity'].pop(),
   lambda m:m.update(sourceGroupsSha256='f'*64),
   lambda m:m.update(newLabels=1),
   lambda m:m.update(originalRunId=1),
   lambda m:m.update(originalHeadSha='a'*40),
   lambda m:m.update(upstreamCommit='b'*40),
  ):
   x=json.loads(json.dumps(manifest));modification(x)
   with self.assertRaises(ValueError):self.api.selection(x)
 def test_shards_are_bounded_cover_once_and_do_not_replay_other_tasks(self):
  names=self.api.selection(self.fixture())
  plan=self.api.plan(names)
  self.assertTrue(12<=len(plan['include'])<=14)
  self.assertEqual(set(t for shard in plan['include'] for t in shard['tasks']),set(names))
  self.assertEqual(len([t for shard in plan['include'] for t in shard['tasks']]),62)
  self.assertTrue(all(len(s['tasks'])<=5 for s in plan['include']))
 def test_retry_aggregate_never_creates_labels_or_blind_metrics(self):
  names=self.api.selection(self.fixture())
  x=[{'task':n,'status':'REPRODUCTION_MISMATCH' if n.startswith('pinterest') else 'INFRA_BLOCKED',
      'newPositiveLabels':0,'newNegativeLabels':0} for n in names]
  report=self.api.summarize_retry(x,names)
  self.assertEqual(report['candidateCount'],62)
  self.assertEqual(report['newPositiveLabels'],0)
  self.assertEqual(report['newNegativeLabels'],0)
  self.assertIsNone(report['precision'])
  self.assertFalse(report['tripleSPlusCertified'])
  x.pop()
  with self.assertRaises(ValueError):self.api.summarize_retry(x,names)
 def test_reject_duplicate_or_foreign_receipts_and_invented_labels(self):
  names=self.api.selection(self.fixture())
  rows=[{'task':n,'status':'INFRA_BLOCKED','newPositiveLabels':0,'newNegativeLabels':0} for n in names]
  for modified in ([*rows,rows[0]],[*rows[:-1],{'task':'detekt_detekt-4205','status':'INFRA_BLOCKED'}],
   [{**rows[0],'newPositiveLabels':1},*rows[1:]],
   [{**rows[0],'status':'CERTIFIED'},*rows[1:]]):
   with self.assertRaises(ValueError):self.api.summarize_retry(modified,names)
if __name__=='__main__':unittest.main()
