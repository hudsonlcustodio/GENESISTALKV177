#!/usr/bin/env python3
"""One bounded monitoring tick. Cron owns frequency; private state deduplicates alerts."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

HTTP = urllib.request.build_opener(NoRedirect())


def probe(url):
    parsed = urllib.parse.urlsplit(url)
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("URL de monitoramento inválida")
    if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost", "::1")):
        raise ValueError("Monitoramento exige HTTPS; HTTP só em loopback")
    try:
        with HTTP.open(url.rstrip("/") + "/api/v1/health", timeout=8) as response:
            body = json.loads(response.read(65536))
        return body.get("data", {}).get("status") == "healthy"
    except (OSError, ValueError, urllib.error.URLError):
        return False


def notify(url, event):
    parsed = urllib.parse.urlsplit(url)
    if parsed.username or parsed.password or parsed.fragment:
        raise ValueError("Destino de alerta inválido")
    if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost", "::1")):
        raise ValueError("Destino de alerta exige HTTPS")
    request = urllib.request.Request(url, data=json.dumps(event).encode(), headers={"Content-Type": "application/json"}, method="POST")
    with HTTP.open(request, timeout=8) as response:
        if not 200 <= response.status < 300:
            raise ValueError("Destino recusou o alerta")


def tick(config, now=None):
    if not 1 <= config["threshold"] <= 60 or not 1 <= config["backup_hours"] <= 744:
        raise ValueError("Limites de monitoramento inválidos")
    now = now or time.time()
    root = Path(config["root"]).resolve(strict=True)
    state_file = root / ".runtime/contabo/monitor-state.json"
    state_file.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    state = json.loads(state_file.read_text(encoding="utf-8")) if state_file.exists() else {"failures": 0, "incident": None}
    issues = []
    if not probe(config["url"]):
        issues.append("health")
    for service, container in config["containers"].items():
        if not container:
            issues.append(service)
            continue
        result = subprocess.run(["docker", "inspect", "--format", "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}", container], capture_output=True, text=True, timeout=8)
        if result.returncode or result.stdout.strip() != "running|healthy":
            issues.append(service)
    backups = list((root / "backups").glob("**/db-*.manifest.json"))
    latest = max(backups, key=lambda p: p.stat().st_mtime) if backups else None
    if latest is None or now-latest.stat().st_mtime > config["backup_hours"]*3600:
        issues.append("backup_atrasado")
    else:
        dump = latest.with_name(latest.name.replace(".manifest.json", ".sql.gz"))
        identity = str(latest)+":"+str(latest.stat().st_mtime_ns)
        if state.get("backup_identity") != identity or now-state.get("backup_verified_at",0)>900:
            result = subprocess.run([sys.executable, str(root / "hostgator-setup-kit/recovery.py"), "verify", str(dump)], capture_output=True, timeout=30)
            if result.returncode:
                issues.append("backup_invalido")
            else:
                state["backup_identity"] = identity
                state["backup_verified_at"] = now
    state["failures"] = state["failures"]+1 if issues else 0
    signature = hashlib.sha256(",".join(sorted(issues)).encode()).hexdigest() if issues else None
    event = None
    if issues and state["failures"] >= config["threshold"] and (signature != state.get("incident") or (config.get("webhook") and not state.get("external_delivery"))):
        event = {"product": "GENESIS TALK", "state": "incident", "checks": issues}
    elif not issues and state.get("incident"):
        event = {"product": "GENESIS TALK", "state": "recovered", "checks": []}
    # Always leave an operator-visible, sanitized record. A failed receiver is
    # retried next tick: do not mark an undelivered incident as notified.
    if event:
        event["at"] = datetime.datetime.fromtimestamp(now, datetime.timezone.utc).isoformat()
        event_file = state_file.parent / "monitor-events.jsonl"
        with event_file.open("a", encoding="utf-8") as output:
            os.chmod(event_file, 0o600)
            output.write(json.dumps(event)+"\n")
        if config.get("webhook"):
            notify(config["webhook"], event)
        state["incident"] = signature
        state["external_delivery"] = bool(config.get("webhook"))
    state["checked_at"] = now
    temporary = state_file.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as output:
        os.chmod(temporary, 0o600)
        json.dump(state, output)
    temporary.replace(state_file)
    print(json.dumps({"status": "unhealthy" if issues else "healthy", "checks": issues,
                      "external_alerts": bool(config.get("webhook"))}))
    return 1 if issues else 0


if __name__ == "__main__":
    try:
        sys.exit(tick({"root": os.environ["GENESIS_MONITOR_ROOT"], "url": os.environ["NEXT_PUBLIC_APP_URL"],
          "containers": json.loads(os.environ["GENESIS_MONITOR_CONTAINERS"]),
          "backup_hours": int(os.environ.get("GENESIS_BACKUP_MAX_HOURS", "26")),
          "threshold": int(os.environ.get("GENESIS_ALERT_AFTER_FAILURES", "3")),
          "webhook": os.environ.get("GENESIS_ALERT_WEBHOOK", "")}))
    except Exception:
        # Do not print URLs, receiver tokens, DB credentials or exception bodies.
        print("Monitor reprovou; confira configuração, Docker e destinatário de alertas.", file=sys.stderr)
        sys.exit(2)
