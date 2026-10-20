"""C2 Detekt JUnit wrapper instance identity regression, using exact case
names transcribed from original XML in run 39214460564, artifact 12177918476.
The original full XML files and hashes are retained in GitHub Actions;
these reduced fixtures only check matching, never establish source truth.
"""
import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from importlib.machinery import SourceFileLoader
from pathlib import Path
from types import SimpleNamespace

GATE = Path(__file__).resolve().parents[2] / 'scripts' / 'c2-upstream-junit-evidence.py'
CLASS = 'io.gitlab.arturbosch.detekt.formatting.WrapperSmokeTestSpec'
RULE = 'for rule: io.gitlab.arturbosch.detekt.formatting.wrappers.MultilineLoop'
IDENT = CLASS + '.' + RULE
F2P = 'org.example.ControlSpec.originalRegression'
# JUnit testcase names read from the exact original BEFORE/AFTER XML files.
# See SHA256 of each original, full TEST-5ea6b4841f969da206eae943.xml.
# The CI fixture is a reduced transcript; no synthetic label can be admitted.
XML_SHA256 = {
    '7625': ('433524bb75473c2fbd8778415d01a6213205d43f8591e2b270c43d6bd2db14e1', '7141cfdd81ca68019ebf9441833c1ae912e96e04153bcc1067529d69c27db08d'),
    '7635': ('d0a6c29615bdacad8b36e8910f39e426e44501eb4add3486a96ebec935a539f6', '593e34cc6b4afd6856ba19688b332657967933911ba3e127b16e58481c025519'),
    '7667': ('a97ce41f4f47b323fbed20385c1262d405d96d0af627ef0d5b2d9f77923cb59a', 'a97ce41f4f47b323fbed20385c1262d405d96d0af627ef0d5b2d9f77923cb59a'),
    '7715': ('05ce72aa102061432494789a1644a7b97de376a40164bbf4a3cbcd903dd2a16b', '05ce72aa102061432494789a1644a7b97de376a40164bbf4a3cbcd903dd2a16b'),
    '7718': ('a04184472bad1027f4030c39326169c453cae47fd085f1eabf00a11b1333bb8c', 'a04184472bad1027f4030c39326169c453cae47fd085f1eabf00a11b1333bb8c'),
    '7888': ('ecd7ebd805de57b34f065f91e98245670d029d184e49e8d37b7765d543d7f8b2', '9b373e9d66868aaae35ab7774852669d340977f4b6a463603e272b3d4a5cd59c'),
}
ORIGINAL = {
    '7625': ('2286dfcd', '66e434e8'),
    '7635': ('5319efc0', '2eef43f5'),
    '7667': ('2d94279f', '2d94279f'),
    '7715': ('c76762', 'c76762'),
    '7718': ('413a2520', '413a2520'),
    '7888': ('5ae5a507', '70796b21'),
}

class WrapperIdentityRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.gate = SourceFileLoader('c2_detekt_wrapper_gate', str(GATE)).load_module()

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        self.before = root / 'before'; self.before.mkdir()
        self.after = root / 'after'; self.after.mkdir()
        self.expected = root / 'expected.json'
        self.output = root / 'receipt.json'
        self.expected.write_text(json.dumps({
            'f2p_tests': [F2P], 'p2p_tests': [IDENT],
            's2p_tests': [], 'n2p_tests': []
        }), encoding='utf-8')

    def report(self, target, names, filename='TEST-original.xml'):
        root = ET.Element('testsuite', name='original')
        for classname, name, state in names:
            case = ET.SubElement(root, 'testcase', classname=classname, name=name)
            if state == 'FAIL': ET.SubElement(case, 'failure')
            if state == 'SKIP': ET.SubElement(case, 'skipped')
        ET.ElementTree(root).write(target / filename, encoding='utf-8', xml_declaration=True)

    def original_pair(self, before_name, after_name):
        self.report(self.before, [('org.example.ControlSpec','originalRegression','FAIL'),
                                  (CLASS,before_name,'PASS')])
        self.report(self.after, [('org.example.ControlSpec','originalRegression','PASS'),
                                 (CLASS,after_name,'PASS')])

    def run_gate(self, task='detekt_detekt-7635'):
        args = SimpleNamespace(task=task, expected=str(self.expected),
          before=str(self.before), after=str(self.after),
          source_commit='a'*40, fixed_commit='b'*40, output=str(self.output))
        return self.gate.evaluate(args)

    def test_original_six_multiline_loop_receipts_are_matched_without_new_labels(self):
        for case, (pre, post) in ORIGINAL.items():
            with self.subTest(case=case):
                self.original_pair(RULE+'@'+pre, RULE+'@'+post)
                report = self.run_gate('detekt_detekt-'+case)
                self.assertEqual(report['candidateTransitions'],1)
                data=json.loads(self.output.read_text())
                self.assertEqual(data['verifiedPassToPassCount'],1)
                self.assertFalse(data['rawJUnitAuthenticityVerified'])
                self.assertFalse(data['rootCauseVerified'])
                self.assertEqual(data['newPositiveLabels'],0)
                self.output.unlink()

    def test_distinct_hash_aliases_in_one_phase_are_ambiguous_even_when_both_pass(self):
        self.original_pair(RULE+'@5319efc0', RULE+'@2eef43f5')
        self.report(self.before, [(CLASS,RULE+'@aaaaaaaa','PASS')], 'TEST-conflict.xml')
        with self.assertRaisesRegex(ValueError, 'conflict|control|p2p'):
            self.run_gate()
        self.assertFalse(self.output.exists())

    def test_distinct_hash_aliases_with_opposite_states_are_rejected(self):
        self.original_pair(RULE+'@5319efc0', RULE+'@2eef43f5')
        self.report(self.before, [(CLASS,RULE+'@aaaaaaaa','FAIL')], 'TEST-conflict.xml')
        with self.assertRaises(ValueError): self.run_gate()
        self.assertFalse(self.output.exists())

    def test_same_original_alias_repeated_with_same_state_is_deduplicated(self):
        self.original_pair(RULE+'@5319efc0', RULE+'@2eef43f5')
        self.report(self.before, [(CLASS,RULE+'@5319efc0','PASS')], 'TEST-duplicate.xml')
        self.run_gate()
        report=json.loads(self.output.read_text())
        self.assertEqual(report['beforeEquivalentDuplicateJUnitCount'],1)

    def test_unrelated_class_or_nonhex_suffix_not_normalized(self):
        for cls, name in [('org.example.OtherSpec', RULE+'@5319efc0'),
                          (CLASS,RULE+'@nothex'),
                          (CLASS,RULE+'@1234'),
                          (CLASS,RULE+'@123456789')]:
            with self.subTest(cls=cls, name=name):
                self.report(self.before, [('org.example.ControlSpec','originalRegression','FAIL'),
                                          (cls,name,'PASS')])
                self.report(self.after, [('org.example.ControlSpec','originalRegression','PASS'),
                                         (cls,name,'PASS')])
                with self.assertRaises(ValueError): self.run_gate()
                self.assertFalse(self.output.exists())

    def test_unsuffixed_and_suffixed_name_in_same_phase_is_ambiguous(self):
        self.original_pair(RULE, RULE+'@2eef43f5')
        self.report(self.before, [(CLASS,RULE+'@5319efc0','PASS')], 'TEST-alias.xml')
        with self.assertRaises(ValueError): self.run_gate()
        self.assertFalse(self.output.exists())

if __name__=='__main__': unittest.main()
