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
    def test_reject_when_regression_already_passed_before(self):
        self.make_report(self.before, {'reproduces()':'pass','stillWorks()':'pass'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_when_fixed_test_still_fails(self):
        self.make_report(self.after, {'reproduces()':'failure','stillWorks()':'pass'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_when_control_failed(self):
        self.make_report(self.before, {'reproduces()':'failure','stillWorks()':'error'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_missing_test_not_convert_to_success(self):
        self.make_report(self.before, {'stillWorks()':'pass'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_skipped_regression(self):
        self.make_report(self.before, {'reproduces()':'skipped','stillWorks()':'pass'})
        self.assertNotEqual(self.run_cli()[0].returncode,0)
    def test_reject_duplicate_junit_result(self):
        (self.before/'TEST-DUPLICATE.xml').write_bytes((self.before/'TEST-ParserTest.xml').read_bytes())
        self.assertNotEqual(self.run_cli()[0].returncode,0)
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
