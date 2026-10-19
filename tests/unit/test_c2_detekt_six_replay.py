"""Fail-closed replay comparison tests. All example receipts are TEST FIXTURES."""
import unittest
from importlib.machinery import SourceFileLoader
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SCRIPT=ROOT/'scripts'/'c2-detekt-six-replay.py'

class SixReplayTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.mod=SourceFileLoader('detekt_six_replay',str(SCRIPT)).load_module()

 def setUp(self):
  m=self.mod;self.old={};self.new={}
  for id in m.SIX:
   self.old[id]={'task':id,'sourceCommit':m.UPSTREAM_SHA,'status':m.MISMATCH,
      'reason':'original p2p stable passing control not demonstrated: MultilineLoop before=MISSING after=MISSING',
      'newPositiveLabels':0,'newNegativeLabels':0}
   self.new[id]={'task':id,'sourceCommit':m.UPSTREAM_SHA,'status':m.TRANSITION,
      'candidateTransitions':1,'receiptSha256':'c'*64,
      'sourceCommitClaim':'a'*40,'fixedCommitClaim':'b'*40,
      'newPositiveLabels':0,'newNegativeLabels':0}

 def test_plan_contains_exactly_six_in_two_small_shards(self):
  shards=self.mod.plan()['include']
  self.assertEqual(len(shards),2)
  self.assertEqual([len(s['tasks']) for s in shards],[3,3])
  self.assertEqual(sorted(t for s in shards for t in s['tasks']),list(self.mod.SIX))

 def test_reports_six_transitions_but_zero_new_labels(self):
  report=self.mod.compare(self.old,self.new,'d'*40)
  self.assertEqual(report['candidateCount'],6)
  self.assertEqual(report['newCounts'][self.mod.TRANSITION],6)
  self.assertEqual(report['newLabels'],0)
  self.assertFalse(report['blindHoldout'])
  self.assertFalse(report['tripleSPlusCertified'])
  self.assertIsNone(report['precision'])

 def test_cannot_compare_wrong_original_status_or_reason(self):
  task=self.mod.SIX[0]
  self.old[task]['status']=self.mod.TRANSITION
  with self.assertRaises(ValueError):self.mod.compare(self.old,self.new,'d'*40)
  self.old[task]['status']=self.mod.MISMATCH
  self.old[task]['reason']='some other mismatch'
  with self.assertRaises(ValueError):self.mod.compare(self.old,self.new,'d'*40)

 def test_cannot_hide_missing_candidates(self):
  self.new.pop(self.mod.SIX[0])
  with self.assertRaises(ValueError):self.mod.compare(self.old,self.new,'d'*40)

 def test_transition_without_sha_claims_rejected(self):
  self.new[self.mod.SIX[0]].pop('receiptSha256')
  with self.assertRaises(ValueError):self.mod.compare(self.old,self.new,'d'*40)

 def test_nontransition_cannot_claim_transitions(self):
  self.new[self.mod.SIX[0]]['status']=self.mod.MISMATCH
  self.new[self.mod.SIX[0]]['candidateTransitions']=1
  with self.assertRaises(ValueError):self.mod.compare(self.old,self.new,'d'*40)

if __name__=='__main__':unittest.main()
