#!/usr/bin/env python3
"""Pinned source-reproduction retry for 25 original JUnit caps + 37 KtLint identities.

Original source campaign 39168947905 is development data, not a blind holdout.
The retry never increments 23 historical labels or creates new gold labels.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path
from importlib.machinery import SourceFileLoader

ROOT=Path(__file__).resolve().parents[1]
BULK=SourceFileLoader('c2_retry_bulk',str(ROOT/'scripts'/'c2-bulk-kotlin-campaign.py')).load_module()
PIN='b9025d86f7ae634901396766bd61f6d4ae6d2165'
HEAD='78acbcf4a91be55c2b38237ca2be8890440f317c'
RUN=39168947905
GROUPS_SHA='f5151a3437d6560474ea726a3c903c95cb8f602dcaf5feefdd55bf0ede7aa951'

def selection(data):
 if not isinstance(data,dict) or set(data)!={
  'schema','originalRunId','originalHeadSha','upstreamCommit',
  'sourceGroups','sourceGroupsSha256','newLabels','blindHoldout'}:raise ValueError('invalid retry selection metadata')
 if data['schema']!='ultra-sentinel-c2-kotlin-retry-selection/v1' or \
    data['originalRunId']!=RUN or data['originalHeadSha']!=HEAD or \
    data['upstreamCommit']!=PIN or data['newLabels']!=0 or \
    data['blindHoldout'] is not False or data['sourceGroupsSha256']!=GROUPS_SHA:
  raise ValueError('untrusted retry source')
 groups=data['sourceGroups']
 if not isinstance(groups,dict) or set(groups)!={'junitLimit500','ktlintClassIdentity'}:
  raise ValueError('untrusted retry groups')
 cap=groups['junitLimit500'];ktlint=groups['ktlintClassIdentity']
 if not isinstance(cap,list) or not isinstance(ktlint,list) or len(cap)!=25 or len(ktlint)!=37:
  raise ValueError('wrong retry quota')
 if any(not isinstance(t,str) for t in [*cap,*ktlint]) or \
    cap!=sorted(cap) or ktlint!=sorted(ktlint) or \
    len(set([*cap,*ktlint]))!=62 or \
    any(not t.startswith('detekt_detekt-') for t in cap) or \
    any(not t.startswith('pinterest_ktlint-') for t in ktlint):
  raise ValueError('tampered retry identifiers')
 for t in [*cap,*ktlint]:BULK.parse_task(t)
 digest=hashlib.sha256(json.dumps({'cap':cap,'ktlint':ktlint},sort_keys=True,separators=(',',':')).encode()).hexdigest()
 if digest!=GROUPS_SHA:raise ValueError('tampered independent retry selection')
 return sorted([*cap,*ktlint])

def plan(names):
 if len(names)!=62 or len(set(names))!=62:raise ValueError('retry plan must be complete')
 shards=BULK.shard_tasks(names,shard_size=5)
 if len(shards)!=13 or sum(len(s['tasks']) for s in shards)!=62:
  raise ValueError('unexpected retry shard count')
 return {'include':shards}

def summarize_retry(receipts,selected):
 report=BULK.summarize(receipts,selected)
 if report['candidateCount']!=62 or report['newPositiveLabels']!=0 or \
    report['newNegativeLabels']!=0 or report['blindHoldout'] is not False:
  raise ValueError('unsafe retry report')
 report.update(schema='ultra-sentinel-c2-targeted-retry-results/v1',
  originalRunId=RUN,originalSourceHead=HEAD,
  selectionSha256=GROUPS_SHA,
  retriedTasks=62,notReplayedOriginalTasks=44,
  status='ORIGINAL_TRANSITIONS_ONLY_HISTORICAL_AND_DETECTOR_REVIEW_REQUIRED')
 return report

def read_receipts(directory,selected):
 directory=Path(directory)
 if not directory.is_dir() or directory.is_symlink():raise ValueError('missing trusted retry artifacts')
 accepted=set(selected)
 rows=[]
 for batch in directory.iterdir():
  if not batch.is_dir() or batch.is_symlink() or not batch.name.startswith('c2-retry-batch-'):
   raise ValueError('unknown retry batch')
  for path in batch.iterdir():
   if path.is_symlink():raise ValueError('symlinked retry artifact')
   if path.is_dir():
    if path.name!='evidence':raise ValueError('unknown retry evidence directory')
    continue
   if not path.name.endswith('.json') or path.stem not in accepted:
    raise ValueError('unknown retry task receipt')
   if path.stat().st_size>16384:raise ValueError('oversized retry task receipt')
   row=json.loads(path.read_text(encoding='utf8'))
   if not isinstance(row,dict) or row.get('task')!=path.stem or row.get('sourceCommit')!=PIN:
    raise ValueError('invalid retry source or task identity')
   rows.append(row)
 return rows

def main():
 ap=argparse.ArgumentParser()
 sub=ap.add_subparsers(dest='command',required=True)
 for command in ('plan','aggregate'):
  sp=sub.add_parser(command)
  sp.add_argument('--upstream',required=True)
  sp.add_argument('--selection',required=True)
  if command=='aggregate':
   sp.add_argument('--receipts',required=True)
   sp.add_argument('--output',required=True)
 a=ap.parse_args()
 try:
  fixture=json.loads(Path(a.selection).read_text(encoding='utf8'))
  selected=selection(fixture)
  upstream=Path(a.upstream)
  code,revision=BULK.command(['git','-C',str(upstream),'rev-parse','HEAD'],timeout=12)
  if code or revision.strip()!=PIN:raise ValueError('upstream source SHA changed')
  roster=BULK.read_roster(upstream)
  if not set(selected).issubset(roster):raise ValueError('retry tasks absent from authenticated upstream roster')
  if a.command=='plan':
   print(json.dumps(plan(selected),separators=(',',':')))
  else:
   output=Path(a.output)
   if output.exists():raise ValueError('retry result already exists')
   result=summarize_retry(read_receipts(a.receipts,selected),selected)
   output.write_text(json.dumps(result,indent=2,sort_keys=True)+'\n',encoding='utf8')
   print(json.dumps({'candidateCount':62,'counts':result['counts'],'newLabels':0}))
 except (OSError,ValueError,KeyError,json.JSONDecodeError):
  print('C2_PINNED_RETRY_BLOCKED',file=sys.stderr)
  return 2
 return 0

if __name__=='__main__':sys.exit(main())
