import tarfile, os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = r"h:\CCCCC\BR4INLOG\test"
OUT = r"h:\CCCCC\BR4INLOG\test\_deploy_src.tar.gz"
EXCLUDE_DIRS = {'.git', 'node_modules', '.next'}
EXCLUDE_FILES = {
    '.env',
    '_deploy_src.tar.gz', '_deploy_v119.tar.gz',
    '_deploy_run.py', '_deploy_fix.py', '_deploy_test_v119.py',
    '_deploy_diag.py', '_deploy_verify.py', '_restart_run.py',
    '_tmp_manifest_check.js', '_tmp_tables_local.js',
}

def should_exclude(rel):
    parts = rel.split(os.sep)
    if any(p in EXCLUDE_DIRS for p in parts):
        return True
    if parts[-1] in EXCLUDE_FILES:
        return True
    return False

count = 0
with tarfile.open(OUT, 'w:gz') as tar:
    for root, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and d not in EXCLUDE_FILES]
        for f in files:
            absf = os.path.join(root, f)
            rel = os.path.relpath(absf, ROOT)
            if should_exclude(rel):
                continue
            arc = os.path.join('.', rel).replace(os.sep, '/')
            tar.add(absf, arcname=arc)
            count += 1
print("created", OUT, "files=%d size=%d" % (count, os.path.getsize(OUT)))
