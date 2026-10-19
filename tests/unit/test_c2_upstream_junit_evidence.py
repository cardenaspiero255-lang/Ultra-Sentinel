import json
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts' / 'c2-upstream-junit-evidence.py'

class JUnitEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.p = Path(self.tmp.name)
        self.before = self.p / 'before'
        self.after = self.p / 'after'
        self.before.mkdir();self.after.mkdir()
        self.exp = self.p / 'expected_tests.json'
        self.exp.write_text(json.dumps({'f2p_tests':['org.example.ParserTest.reproduces()'],
            'p2p_tests':['org.example.ParserTest.stillWorks()'], 's2p_tests':[], 'n2p_tests':[]}))
        self.make_report(self.before, {'reproduces()':'failure', 'stillWorks()':'pass'})
        self.make_report(self.after, {'reproduces()':'pass', 'stillWorks()':'pass'})
    def make_report(self, directory, values):
        suite = ET.Element('testsuite', name='org.example.ParserTest')
        for method, outcome in values.items():
            case = ET.SubElement(suite, 'testcase', classname='org.example.ParserTest', name=method)
            if outcome != 'pass': ET.SubElement(case, outcome, message='original evidence')
        ET.ElementTree(suite).write(directory / 'TEST-ParserTest.xml', encoding='unicode')
    def run_cli(self):
        out = self.p/'receipt.json'
        r = subprocess.run([sys.executable,str(SCRIPT),'--task','detekt_detekt-4205',
          '--expected',str(self.exp),'--before',str(self.before),'--after',str(self.after),
          '--source-commit','a'*40,'--fixed-commit','b'*40,'--output',str(out)],
          text=True,capture_output=True)
        return r, out
    def test_accept_original_fail_before_pass_after_but_no_label_minted(self):
        r,o = self.run_cli()
        self.assertEqual(r.returncode,0,r.stderr)
        report=json.loads(o.read_text())
        self.assertEqual(report['verifiedFailToPassCount'],1)
        self.assertEqual(report['verifiedPassToPassCount'],1)
        self.assertEqual(report['newPositiveLabels'],0)
        self.assertEqual(report['newNegativeLabels'],0)
        self.assertFalse(report['rootCauseVerified'])
        self.assertEqual(report['status'],'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED')

    def test_ktlint_classname_trailing_space_matches_original_expected_identity(self):
        """Original KtLint EditorConfigFinderTest JUnit emits a trailing class space."""
        required='org.example.ParserTest.stillWorks()'
        for folder,outcomes in [(self.before,{'reproduces()':'failure','stillWorks()':'pass'}),
                                (self.after,{'reproduces()':'pass','stillWorks()':'pass'})]:
            suite=ET.Element('testsuite')
            for method,state in outcomes.items():
                case=ET.SubElement(suite,'testcase',classname='org.example.ParserTest ',name=method)
                if state!='pass':ET.SubElement(case,state)
            ET.ElementTree(suite).write(folder/'TEST-ParserTest.xml',encoding='unicode')
        r,o=self.run_cli()
        self.assertEqual(r.returncode,0,r.stderr)
        report=json.loads(o.read_text())
        self.assertEqual(report['verifiedFailToPassCount'],1)
        self.assertEqual(report['newPositiveLabels'],0)

    def test_ktlint_trimmed_classname_conflicts_still_reject_required_control(self):
        for folder in (self.before,self.after):
            doc=ET.parse(folder/'TEST-ParserTest.xml')
            node=ET.SubElement(doc.getroot(),'testcase',classname='org.example.ParserTest ',name='stillWorks()')
            if folder==self.before:ET.SubElement(node,'failure')
            doc.write(folder/'TEST-ParserTest.xml',encoding='unicode')
        r,o=self.run_cli()
        self.assertNotEqual(r.returncode,0)
        self.assertFalse(o.exists())

    def test_ktlint_internal_classname_whitespace_is_not_normalized(self):
        for folder in (self.before,self.after):
            doc=ET.parse(folder/'TEST-ParserTest.xml')
            for node in doc.getroot().iter('testcase'):
                node.set('classname','org.example.Parser Test')
            doc.write(folder/'TEST-ParserTest.xml',encoding='unicode')
        r,o=self.run_cli()
        self.assertNotEqual(r.returncode,0)
        self.assertFalse(o.exists())

    def test_reject_when_regression_already_passed_before(self):
        self.make_report(self.before, {'reproduces()':'pass','stillWorks()':'pass'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_when_fixed_test_still_fails(self):
        self.make_report(self.after, {'reproduces()':'failure','stillWorks()':'pass'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_p2p_mismatch_reports_exact_original_control_and_states(self):
        self.make_report(self.before, {'reproduces()':'failure', 'stillWorks()':'skipped'})
        result, receipt = self.run_cli()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(receipt.exists())
        self.assertIn('org.example.ParserTest.stillWorks()', result.stderr)
        self.assertIn('before=SKIP', result.stderr)
        self.assertIn('after=PASS', result.stderr)

    def test_f2p_mismatch_reports_exact_expected_transition(self):
        self.make_report(self.before, {'reproduces()':'pass', 'stillWorks()':'pass'})
        result, receipt = self.run_cli()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(receipt.exists())
        self.assertIn('org.example.ParserTest.reproduces()', result.stderr)
        self.assertIn('before=PASS', result.stderr)
        self.assertIn('after=PASS', result.stderr)

    def test_original_multiline_junit_name_with_outer_indentation(self):
        d=json.loads(self.exp.read_text())
        declared='should have style sub config with active false which is overridden\n            in second config'
        d['p2p_tests'].append('org.example.ParserTest.'+declared)
        self.exp.write_text(json.dumps(d))
        padded='\n            '+declared+'\n        '
        self.make_report(self.before, {'reproduces()':'failure','stillWorks()':'pass',padded:'pass'})
        self.make_report(self.after, {'reproduces()':'pass','stillWorks()':'pass',padded:'pass'})
        r,o=self.run_cli()
        self.assertEqual(r.returncode,0,r.stderr)
        report=json.loads(o.read_text())
        self.assertEqual(report['verifiedPassToPassCount'],2)
        self.assertEqual(report['newPositiveLabels'],0)

    def test_outer_whitespace_normalization_cannot_hide_conflicting_duplicate(self):
        self.make_report(self.before, {'reproduces()':'failure','stillWorks()':'pass','\n stillWorks() \n':'failure'})
        r,o=self.run_cli()
        self.assertNotEqual(r.returncode,0)
        self.assertFalse(o.exists())

    def test_reject_when_control_failed(self):
        self.make_report(self.before, {'reproduces()':'failure','stillWorks()':'error'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_missing_test_not_convert_to_success(self):
        self.make_report(self.before, {'stillWorks()':'pass'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_skipped_regression(self):
        self.make_report(self.before, {'reproduces()':'skipped','stillWorks()':'pass'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_accept_equivalent_duplicate_junit_result_without_double_counting(self):
        (self.before/'TEST-DUPLICATE.xml').write_bytes((self.before/'TEST-ParserTest.xml').read_bytes())
        r,o=self.run_cli()
        self.assertEqual(r.returncode,0,r.stderr)
        report=json.loads(o.read_text())
        self.assertEqual(report['verifiedFailToPassCount'],1)
        self.assertEqual(report['verifiedPassToPassCount'],1)
        self.assertEqual(report['beforeEquivalentDuplicateJUnitCount'],2)
        self.assertEqual(report['beforeConflictingUnscoredJUnitCount'],0)
    def test_reject_duplicate_labels_in_expected_test(self):
        d=json.loads(self.exp.read_text());d['p2p_tests']=d['f2p_tests'];self.exp.write_text(json.dumps(d))
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_bad_source_commit(self):
        t=self.p/'receipt.json'
        p=subprocess.run([sys.executable,str(SCRIPT),'--task','detekt_detekt-4205',
          '--expected',str(self.exp),'--before',str(self.before),'--after',str(self.after),
          '--source-commit','x'*40,'--fixed-commit','b'*40,'--output',str(t)],
          text=True,capture_output=True)
        self.assertNotEqual(p.returncode,0)
    def test_reject_symlinked_junit(self):
        (self.before/'TEST-symlink.xml').symlink_to(self.before/'TEST-ParserTest.xml')
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_s2p_requires_original_skip(self):
        d=json.loads(self.exp.read_text())
        d['s2p_tests']=['org.example.ParserTest.wasSkipped()']
        self.exp.write_text(json.dumps(d))
        self.make_report(self.before, {'reproduces()':'failure','stillWorks()':'pass','wasSkipped()':'pass'})
        self.make_report(self.after, {'reproduces()':'pass','stillWorks()':'pass','wasSkipped()':'pass'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_s2p_actual_skipped_before_and_pass_after(self):
        d=json.loads(self.exp.read_text())
        d['s2p_tests']=['org.example.ParserTest.wasSkipped()']
        self.exp.write_text(json.dumps(d))
        self.make_report(self.before, {'reproduces()':'failure','stillWorks()':'pass','wasSkipped()':'skipped'})
        self.make_report(self.after, {'reproduces()':'pass','stillWorks()':'pass','wasSkipped()':'pass'})
        r,o=self.run_cli()
        self.assertEqual(r.returncode,0,r.stderr)
        self.assertEqual(json.loads(o.read_text())['verifiedNewOrSkippedToPassCount'],1)
    def test_n2p_requires_absent_before(self):
        d=json.loads(self.exp.read_text())
        d['n2p_tests']=['org.example.ParserTest.created()']
        self.exp.write_text(json.dumps(d))
        self.make_report(self.before, {'reproduces()':'failure','stillWorks()':'pass','created()':'failure'})
        self.make_report(self.after, {'reproduces()':'pass','stillWorks()':'pass','created()':'pass'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_n2p_absent_before_and_pass_after(self):
        d=json.loads(self.exp.read_text())
        d['n2p_tests']=['org.example.ParserTest.created()']
        self.exp.write_text(json.dumps(d))
        self.make_report(self.after, {'reproduces()':'pass','stillWorks()':'pass','created()':'pass'})
        r,o=self.run_cli()
        self.assertEqual(r.returncode,0,r.stderr)
        self.assertEqual(json.loads(o.read_text())['verifiedNewOrSkippedToPassCount'],1)
    def test_reject_symlinked_input_directory(self):
        redirect=self.p/'redirect'
        redirect.symlink_to(self.before,target_is_directory=True)
        self.before=redirect
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_symlinked_parent_of_expected_manifest(self):
        redirect=self.p/'redirect'
        redirect.symlink_to(self.p,target_is_directory=True)
        self.exp=redirect/'expected_tests.json'
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_reuse_existing_receipt_path(self):
        o=self.p/'receipt.json';o.write_text('existing')
        self.assertNotEqual(self.run_cli()[0].returncode,0)
        self.assertEqual(o.read_text(),'existing')

if __name__=='__main__':unittest.main()
