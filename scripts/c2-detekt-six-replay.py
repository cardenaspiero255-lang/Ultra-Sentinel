#!/usr/bin/env python3
"""Bounded Detekt six-case original replay and source-run comparison.

The six tasks were mismatches in run 39214460564. This tool does not mint
labels, certify root causes, treat provisional commits as upstream commits,
or substitute this development corpus for a blind holdout.
"""
import argparse
from importlib.machinery import SourceFileLoader
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BULK = SourceFileLoader('c2_six_bulk', str(ROOT/'scripts'/'c2-bulk-kotlin-campaign.py')).load_module()
SIX = tuple('detekt_detekt-'+n for n in ('7625','7635','7667','7715','7718','7888'))
UPSTREAM_SHA = 'b9025d86f7ae634901396766bd61f6d4ae6d2165'
PREVIOUS_RUN = 39214460564
PREVIOUS_HEAD = '9eed20624b66447079adc634bb5ce2e409480a63'
FIX_COMMIT = 'aea223a4dd6c9c6a7f6c7d65fddcca094b0eea7c'
MISMATCH = 'REPRODUCTION_MISMATCH'
TRANSITION = 'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'

def plan():
    shards = BULK.shard_tasks(list(SIX), shard_size=3)
    if len(shards) != 2 or sorted(x for s in shards for x in s['tasks']) != list(SIX):
        raise ValueError('untrusted six-case roster')
    return {'include': shards}

def read_receipts(root, prefix):
    root=Path(root)
    if not root.is_dir() or root.is_symlink():raise ValueError('missing evidence root')
    rows={}
    batches=list(root.iterdir())
    if len(batches)>16:raise ValueError('too many batch directories')
    for batch in batches:
        if not batch.is_dir() or batch.is_symlink() or not batch.name.startswith(prefix):
            raise ValueError('unexpected evidence batch')
        for f in batch.iterdir():
            if f.is_symlink():raise ValueError('symlinked receipt or evidence')
            if f.is_dir():
                if f.name!='evidence':raise ValueError('unexpected evidence subdirectory')
                continue
            if not f.is_file() or not f.name.endswith('.json') or f.stem not in SIX:
                # Earlier Detekt batches include additional original tasks;
                # ignore only their ordinary task receipts, not other files.
                if prefix=='c2-retry-batch-' and f.is_file() and re.fullmatch(r'detekt_detekt-[0-9]+\.json',f.name):
                    continue
                raise ValueError('invalid receipt path')
            if f.stem in rows or f.stat().st_size<20 or f.stat().st_size>16_384 or f.stat().st_nlink!=1:
                raise ValueError('duplicate or unsafe receipt')
            row=json.loads(f.read_text(encoding='utf8'))
            if not isinstance(row,dict) or row.get('task')!=f.stem or row.get('sourceCommit')!=UPSTREAM_SHA or \
               row.get('status') not in BULK.STATUSES or row.get('newPositiveLabels')!=0 or row.get('newNegativeLabels')!=0:
                raise ValueError('untrusted receipt metadata')
            rows[f.stem]=row
    if set(rows)!=set(SIX):raise ValueError('missing or extra selected task receipts')
    return rows

def compare(old, new, head):
    if set(old)!=set(SIX) or set(new)!=set(SIX) or not re.fullmatch(r'[a-f0-9]{40}',head):
        raise ValueError('invalid original/replay set or revision')
    for task in SIX:
        before=old[task]
        if before['status']!=MISMATCH or 'MultilineLoop' not in before.get('reason','') or \
           'before=MISSING after=MISSING' not in before.get('reason',''):
            raise ValueError('baseline is not the original mismatch')
        after=new[task]
        if after['status']==TRANSITION:
            if not isinstance(after.get('candidateTransitions'),int) or after['candidateTransitions']<1 or \
               not re.fullmatch(r'[a-f0-9]{64}',after.get('receiptSha256','')) or \
               not re.fullmatch(r'[a-f0-9]{40}',after.get('sourceCommitClaim','')) or \
               not re.fullmatch(r'[a-f0-9]{40}',after.get('fixedCommitClaim','')) or \
               after['sourceCommitClaim']==after['fixedCommitClaim']:
                raise ValueError('transition without original receipts')
        elif after.get('candidateTransitions',0)!=0:
            raise ValueError('untrusted candidate transition count')
    summary=BULK.summarize(list(new.values()),list(SIX))
    return {'schema':'ultra-sentinel-c2-detekt-six-replay-comparison/v1',
        'originalRunId':PREVIOUS_RUN,'originalRunHead':PREVIOUS_HEAD,
        'correctedValidatorMergeCommit':FIX_COMMIT,'newRunHead':head,
        'upstreamPinnedCommit':UPSTREAM_SHA,'candidateCount':6,
        'oldCounts':{MISMATCH:6},'newCounts':summary['counts'],
        'candidates':[{'task':task,'before':old[task]['status'],
            'after':new[task]['status'],'candidateTransitions':new[task].get('candidateTransitions',0),
            'replayReceiptSha256':new[task].get('receiptSha256'),
            'replaySourceCommitClaim':new[task].get('sourceCommitClaim'),
            'replayFixedCommitClaim':new[task].get('fixedCommitClaim')}
            for task in SIX],
        'historicalLabels':23,'newLabels':0,'blindHoldout':False,
        'precision':None,'recall':None,'f1':None,'tripleSPlusCertified':False,
        'status':'DEVELOPMENT_REPLAY_ONLY_PROVENANCE_AND_ROOT_CAUSE_REVIEW_REQUIRED'}

def main(argv=None):
    ap=argparse.ArgumentParser()
    sub=ap.add_subparsers(dest='command',required=True)
    p=sub.add_parser('plan');p.add_argument('--upstream',required=True)
    p=sub.add_parser('compare');p.add_argument('--old',required=True);p.add_argument('--new',required=True)
    p.add_argument('--head',required=True);p.add_argument('--output',required=True)
    args=ap.parse_args(argv)
    try:
        if args.command=='plan':
            code,rev=BULK.command(['git','-C',args.upstream,'rev-parse','HEAD'],timeout=12)
            if code or rev.strip()!=UPSTREAM_SHA:raise ValueError('wrong upstream commit')
            if not set(SIX).issubset(BULK.read_roster(Path(args.upstream))):raise ValueError('upstream roster changed')
            print(json.dumps(plan(),separators=(',',':')))
        else:
            report=compare(read_receipts(args.old,'c2-retry-batch-'),
                           read_receipts(args.new,'c2-detekt-six-batch-'),args.head)
            output=Path(args.output)
            if output.exists() or output.is_symlink():raise ValueError('output exists')
            output.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n',encoding='utf8')
            print(json.dumps({'candidateCount':6,'counts':report['newCounts'],'newLabels':0}))
    except (OSError,ValueError,KeyError,json.JSONDecodeError) as err:
        print('C2_DETEKT_SIX_REPLAY_BLOCKED: '+str(err)[:300],file=sys.stderr)
        return 2
    return 0

if __name__=='__main__':sys.exit(main())
