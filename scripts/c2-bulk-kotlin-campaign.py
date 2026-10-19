#!/usr/bin/env python3
"""Candidate-only Kotlin SWE-bench BEFORE/AFTER bulk replay. Never mints C2 labels."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

PIN='b9025d86f7ae634901396766bd61f6d4ae6d2165'
PROJECTS={
 'pinterest_ktlint':('pinterest_ktlint',43),
 'detekt_detekt':('detekt_detekt',28),
 'oss-review-toolkit_ort':('oss-review-toolkit_ort',12),
 'Hannah-Sten_TeXiFy-IDEA':('hannah-sten_texify-idea',8),
 'ankidroid_Anki-Android':('ankidroid_anki-android',6),
 'Kotlin_dataframe':('kotlin_dataframe',5),
 'square_okhttp':('square_okhttp',2),
 'GradleUp_shadow':('gradleup_shadow',1),
 'linreal_cascade-editor':('linreal_cascade-editor',1)
}
STATUSES={'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED','INFRA_BLOCKED','REPRODUCTION_MISMATCH','NO_DECLARED_REGRESSION'}
TASK_RE=re.compile(r'^[A-Za-z0-9_-]+-[1-9][0-9]{0,7}$')
def parse_task(name):
 if not isinstance(name,str) or not TASK_RE.fullmatch(name):raise ValueError('invalid task id')
 prefix,_,number=name.rpartition('-')
 if prefix not in PROJECTS or not number.isdigit():raise ValueError('unknown upstream project')
 return PROJECTS[prefix][0]
def has_declared_f2p(path):
 data=json.loads(Path(path).read_text(encoding='utf8'))
 if not isinstance(data,dict) or any(not isinstance(data.get(k+'_tests'),list) for k in ('f2p','p2p','s2p','n2p')):
  raise ValueError('invalid original expected tests')
 return bool(data['f2p_tests'])
def read_roster(root):
 root=Path(root)
 if not (root/'tasks').is_dir():raise ValueError('missing pinned upstream tasks')
 dirs=sorted(x for x in (root/'tasks').iterdir() if x.is_dir() and not x.is_symlink())
 if len(dirs)!=106:raise ValueError('unexpected pinned task count')
 counts={k:n for k,(_,n) in PROJECTS.items()}
 for d in dirs:
  prefix,_,_=d.name.rpartition('-')
  parse_task(d.name)
  counts[prefix]-=1
  if not all((d/rel).is_file() for rel in ('task.toml','tests/expected_tests.json','environment/Dockerfile')):
   raise ValueError('missing original task files')
 if any(counts.values()):raise ValueError('upstream project quota mismatch')
 return [d.name for d in dirs]
def shard_tasks(names,shard_size=5):
 if not isinstance(names,list) or len(names)!=len(set(names)) or not(1<=shard_size<=12):raise ValueError('invalid roster')
 by_project={k:[] for k in PROJECTS}
 for name in names:
  parse_task(name);by_project[name.rpartition('-')[0]].append(name)
 out=[]
 for prefix,tasks in by_project.items():
  for i in range(0,len(tasks),shard_size):
   out.append({'id':f'{PROJECTS[prefix][0]}-{i//shard_size+1}','tasks':sorted(tasks)[i:i+shard_size]})
 return sorted(out,key=lambda x:x['id'])
def summarize(items,expected_tasks):
 names=[i.get('task') for i in items]
 if len(names)!=len(set(names)) or set(names)!=set(expected_tasks):raise ValueError('missing/duplicated receipts')
 for n in names:parse_task(n)
 if any(x.get('status') not in STATUSES or x.get('newPositiveLabels',0)!=0 or x.get('newNegativeLabels',0)!=0 or x.get('candidateTransitions',0)<0 for x in items):
  raise ValueError('invalid status or invented labels')
 return {'schema':'ultra-sentinel-c2-bulk-campaign/v1','sourceCommit':PIN,'candidateCount':len(items),
         'counts':{s:sum(x['status']==s for x in items) for s in sorted(STATUSES)},
         'historical':{'total':23,'positive':11,'negative':12},
         'remaining':97,'minimumAdditionalPositive':37,'minimumAdditionalNegative':36,'minimumAdditionalDiversity':24,
         'candidateTransitionsObserved':sum(int(x.get('candidateTransitions',0)) for x in items if x['status']=='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'),
         'newPositiveLabels':0,'newNegativeLabels':0,'scoredLabels':0,'precision':None,'recall':None,'f1':None,
         'blindHoldout':False,'tripleSPlusCertified':False,'status':'CANDIDATES_ONLY_SOURCE_ROOT_CAUSE_REVIEW_REQUIRED'}
def command(args,timeout=1500):
 try:
  x=subprocess.run(args,text=True,capture_output=True,timeout=timeout)
  return x.returncode,(x.stdout+'\n'+x.stderr)[-4000:]
 except (OSError,subprocess.TimeoutExpired) as e:
  return 124,str(e)[-2000:]
def docker_task(root,task,results,phase_script,validator,built):
 source=root/'tasks'/task
 evidence=results/'evidence'/task;evidence.mkdir(parents=True,exist_ok=True)
 before=evidence/'before';after=evidence/'after'
 before.mkdir();after.mkdir()
 out={'task':task,'sourceCommit':PIN,'status':'INFRA_BLOCKED','newPositiveLabels':0,'newNegativeLabels':0}
 try:
  expected=source/'tests'/'expected_tests.json'
  if not has_declared_f2p(expected):
   out['status']='NO_DECLARED_REGRESSION';return out
  match=re.search(r'^FROM kotlin-bench/([a-z0-9_-]+):(base(?:-JDK-\d+)?)\s*$',(source/'environment'/'Dockerfile').read_text(),re.M)
  if not match or match.group(1)!=parse_task(task):raise ValueError('unexpected external Docker base')
  project,tag=match.groups();base='kotlin-bench/'+project+':'+tag
  dockerfile=root/'bases'/project/('Dockerfile.'+tag)
  if not dockerfile.is_file():raise ValueError('upstream base Dockerfile absent')
  if base not in built:
   rc,log=command(['docker','build','-f',str(dockerfile),'-t',base,str(dockerfile.parent)],timeout=2400)
   if rc:raise ValueError('base build failed: '+log[-700:])
   built.add(base)
  image='c2-candidate-'+task.lower().replace('_','-')
  rc,log=command(['docker','build','-t',image,str(source/'environment')],timeout=2400)
  if rc:raise ValueError('task Docker build failed: '+log[-700:])
  for phase,folder in [('before',before),('after',after)]:
   # The GitHub runner owns this private evidence directory, but the image may
   # run as another UID with CAP_DAC_OVERRIDE dropped. Grant write+traverse
   # on this one temporary bind mount only; restore 0700 even on failure.
   folder.chmod(0o733)
   try:
    rc,log=command(['docker','run','--rm','--network','none','--cap-drop','ALL',
      '--security-opt','no-new-privileges','--pids-limit','1536','--memory','12g','--cpus','4',
      '--tmpfs','/logs:rw,nosuid,noexec,size=256m',
      '-v',f'{source / "tests"}:/tests:ro','-v',f'{source / "solution"}:/solution:ro',
      '-v',f'{phase_script}:/opt/c2-evidence-phase.sh:ro',
      '-v',f'{phase_script.with_name("c2-capture-junit.py")}:/opt/c2-capture-junit.py:ro',
      '-v',f'{folder}:/evidence:rw',
      '-e','C2_PHASE='+phase,image,'bash','/opt/c2-evidence-phase.sh'],timeout=1100)
   finally:
    folder.chmod(0o700)
   if rc:
    # Phase exits 40/41 happen *after* capture: original test.sh rejected
    # the source or the upstream verifier's reward was not 1. If real JUnit
    # was captured, this is a reproduction mismatch, not missing tooling.
    # The XML is still untrusted and never creates any positive label here.
    xml_dir=folder/'junit'
    if rc in (40,41) and xml_dir.is_dir() and any(xml_dir.glob('TEST*.xml')):
     out.update(status='REPRODUCTION_MISMATCH',
       reason=phase.upper()+'_ORIGINAL_TEST_OR_VERIFIER_REJECTED: '+log[-700:])
     return out
    raise ValueError(phase+' original test failed or infra blocked: '+log[-700:])
  base_sha=(before/'commit.txt').read_text().strip()
  fix_sha=(after/'commit.txt').read_text().strip()
  if not all(re.fullmatch('[0-9a-f]{40}',s) for s in (base_sha,fix_sha)) or base_sha==fix_sha:
   raise ValueError('original commit claims missing')
  receipt=evidence/'original-transitions.json'
  rc,log=command(['python3',str(validator),'--task',task,'--expected',str(expected),
    '--before',str(before/'junit'),'--after',str(after/'junit'),
    '--source-commit',base_sha,'--fixed-commit',fix_sha,'--output',str(receipt)],timeout=45)
  if rc:
   out.update(status='REPRODUCTION_MISMATCH',reason=log[-700:]);return out
  parsed=json.loads(receipt.read_text())
  out.update(status='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED',
    candidateTransitions=parsed['verifiedFailToPassCount'],
    receiptSha256=hashlib.sha256(receipt.read_bytes()).hexdigest(),
    sourceCommitClaim=base_sha,fixedCommitClaim=fix_sha)
  return out
 except (OSError,ValueError,json.JSONDecodeError) as e:
  out['reason']=str(e)[-1100:];return out
def main():
 parser=argparse.ArgumentParser()
 sub=parser.add_subparsers(dest='cmd',required=True)
 p=sub.add_parser('plan');p.add_argument('--upstream',required=True);p.add_argument('--mode',choices=['smoke','full'],required=True)
 p=sub.add_parser('run-shard');p.add_argument('--upstream',required=True);p.add_argument('--tasks-json',required=True);p.add_argument('--output',required=True)
 p=sub.add_parser('aggregate');p.add_argument('--upstream',required=True);p.add_argument('--receipts',required=True);p.add_argument('--output',required=True);p.add_argument('--mode',choices=['smoke','full'],required=True)
 a=parser.parse_args();root=Path(a.upstream).resolve()
 rc,rev=command(['git','-C',str(root),'rev-parse','HEAD'],timeout=10)
 if rc or rev.strip()!=PIN:raise SystemExit('C2_BLOCKED_UPSTREAM_SHA_MISMATCH')
 all_tasks=read_roster(root)
 smoke=[x for x in ('GradleUp_shadow-1313','detekt_detekt-4205') if x in all_tasks]
 if a.cmd=='plan':
  print(json.dumps({'include':shard_tasks(all_tasks if a.mode=='full' else smoke)},separators=(',',':')))
 elif a.cmd=='run-shard':
  tasks=json.loads(a.tasks_json)
  if not isinstance(tasks,list) or len(tasks)>5 or len(tasks)!=len(set(tasks)) or any(x not in all_tasks for x in tasks):raise SystemExit('C2_BLOCKED_SHARD_ROSTER')
  out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
  script=Path(__file__).with_name('c2-upstream-evidence-phase.sh').resolve()
  validator=Path(__file__).with_name('c2-upstream-junit-evidence.py').resolve()
  capture=Path(__file__).with_name('c2-capture-junit.py').resolve()
  if not script.is_file() or not validator.is_file() or not capture.is_file():raise SystemExit('C2_BLOCKED_MISSING_GATE')
  built=set()
  for task in tasks:
   receipt=docker_task(root,task,out,script,validator,built)
   (out/(task+'.json')).write_text(json.dumps(receipt,sort_keys=True,indent=2)+'\n')
   print(json.dumps({'task':task,'status':receipt['status'],'newLabels':0}),flush=True)
 else:
  expected=all_tasks if a.mode=='full' else smoke
  items=[]
  for f in Path(a.receipts).rglob('*.json'):
   obj=json.loads(f.read_text())
   if isinstance(obj,dict) and 'task' in obj and f.stem==obj['task']:items.append(obj)
  report=summarize(items,expected)
  Path(a.output).write_text(json.dumps(report,sort_keys=True,indent=2)+'\n')
  print(json.dumps(report,sort_keys=True))
if __name__=='__main__':main()
