"""Scan Git candidates; report locations only, never matched secret values."""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATTERNS = {
    "github_token": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b"),
    "aws_access_key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "provider_key": re.compile(r"\bsk-(?:proj-|ant-api\d{2}-)?[A-Za-z0-9_-]{40,}\b"),
    "private_key_material": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{80,}"),
}
FORBIDDEN = {"node_modules", ".next", ".runtime", "backups", ".qa-backups", ".auth", ".qa-vps"}

def main():
    proc = subprocess.run(["git", "ls-files", "--cached", "-z"], cwd=ROOT, capture_output=True, check=True)
    paths = [p for p in proc.stdout.decode("utf-8").split("\0") if p]
    if not paths:
        raise SystemExit("BLOCKED: stage the source before scanning; an empty file list is not evidence")
    findings = []
    scanned = 0
    for name in paths:
        p = Path(name)
        if FORBIDDEN.intersection(p.parts) or (p.name.startswith(".env") and not p.name.endswith(".example")) or p.suffix in {".dump", ".key", ".pem"}:
            findings.append({"file": name, "rule": "forbidden_git_path"})
            continue
        content = (ROOT / p).read_bytes()
        if b"\x00" in content[:8192]:
            continue
        text = content.decode("utf-8", errors="replace")
        scanned += 1
        for rule, pattern in PATTERNS.items():
            for match in pattern.finditer(text):
                findings.append({"file": name, "line": text.count("\n", 0, match.start()) + 1, "rule": rule})
    report = {"status": "PASS" if not findings else "FAIL", "scanned_files": scanned, "candidate_count": len(paths), "findings": findings, "limits": "Precise credential patterns and forbidden paths; not a proof that every possible secret format is absent."}
    print(json.dumps(report, indent=2))
    return int(bool(findings))

if __name__ == "__main__":
    sys.exit(main())
