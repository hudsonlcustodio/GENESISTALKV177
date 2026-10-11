"""Real filesystem/HTTP contracts; PostgreSQL transactions have a separate rehearsal."""
import contextlib
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


recovery = load("recovery", ROOT / "hostgator-setup-kit/recovery.py")
monitor = load("monitor", ROOT / "deploy/contabo/monitor.py")


class Operations(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "backups").mkdir()
        (self.root / "hostgator-setup-kit").mkdir()
        shutil.copy(ROOT / "hostgator-setup-kit/recovery.py", self.root / "hostgator-setup-kit")
        self.dump = self.bundle("001")
        self.args = SimpleNamespace(dump=str(self.dump), sessions_required=0, storage_required=0, major=None)
        self.output = contextlib.redirect_stdout(io.StringIO())
        self.output.__enter__()

    def tearDown(self):
        self.output.__exit__(None, None, None)
        self.tmp.cleanup()

    def bundle(self, name):
        dump = self.root / "backups" / ("db-" + name + ".sql.gz")
        with gzip.open(dump, "wt", encoding="utf-8") as output:
            output.write("DROP TABLE IF EXISTS public.fixture;\nCOPY public.fixture (id) FROM stdin;\n1\n\\.\n")
        dump.with_name("db-" + name + ".catalog.json").write_text(json.dumps({"format": 2, "postgres_major": 17, "schema_fingerprint": "a" * 32}), encoding="utf-8")
        recovery.create(SimpleNamespace(dump=str(dump), sessions_required=0, storage_required=0))
        return dump

    def manifest(self):
        return self.dump.with_name(recovery.stem(self.dump) + ".manifest.json")

    def test_corruption_and_major_are_refused(self):
        recovery.verify(self.args)
        self.args.major = 15
        with self.assertRaisesRegex(ValueError, "mesmo major"):
            recovery.verify(self.args)
        self.args.major = None
        with self.dump.open("ab") as output:
            output.write(b"corruption")
        with self.assertRaisesRegex(ValueError, "hash"):
            recovery.verify(self.args)

    def test_missing_snapshot_is_refused(self):
        for field in ("sessions_required", "storage_required"):
            setattr(self.args, field, 1)
            with self.assertRaisesRegex(ValueError, "incompleto"):
                recovery.verify(self.args)
            setattr(self.args, field, 0)

    def test_tar_traversal_is_refused_even_with_valid_hash(self):
        archive = self.dump.with_name("storage-001.tgz")
        with tarfile.open(archive, "w:gz") as output:
            member = tarfile.TarInfo("../escape")
            member.size = 1
            output.addfile(member, io.BytesIO(b"x"))
        data = json.loads(self.manifest().read_text())
        data["files"].append({"name": archive.name, "sha256": recovery.digest(archive)})
        self.manifest().write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, "inseguro"):
            recovery.verify(self.args)

    def test_replication_verifies_whole_bundle(self):
        destination = self.root / "offsite"
        destination.mkdir()
        self.args.destination = str(destination)
        recovery.replicate(self.args)
        recovery.verify(self.args)
        self.assertEqual(len(list((destination / "db-001").iterdir())), 4)

    def test_replication_refuses_descendant(self):
        self.args.destination = str(self.root / "backups")
        with self.assertRaisesRegex(ValueError, "dentro"):
            recovery.replicate(self.args)

    def test_retention_removes_whole_old_bundle_only(self):
        self.bundle("002")
        unrelated = self.root / "backups" / "keep.txt"
        unrelated.write_text("keep")
        recovery.retain(SimpleNamespace(dump=str(self.root / "backups"), keep=1))
        self.assertFalse(self.dump.exists())
        self.assertFalse(self.manifest().exists())
        self.assertEqual(unrelated.read_text(), "keep")
        self.assertEqual(len(list((self.root / "backups").glob("db-002*"))), 4)

    def test_retention_rejects_foreign_file_before_deleting(self):
        self.bundle("002")
        data = json.loads(self.manifest().read_text())
        data["files"].append({"name": "unrelated.txt", "sha256": "a" * 64})
        self.manifest().write_text(json.dumps(data))
        os.utime(self.manifest(), (1,1))
        with self.assertRaisesRegex(ValueError, "Caminho inválido"):
            recovery.retain(SimpleNamespace(dump=str(self.root / "backups"), keep=1))
        self.assertTrue(self.dump.exists())

    def test_retention_includes_deploy_subfolders(self):
        nested = self.root / "backups" / "deploy-candidate"
        nested.mkdir()
        for source in list((self.root / "backups").glob("db-001*")):
            shutil.move(source, nested / source.name)
        self.bundle("002")
        recovery.retain(SimpleNamespace(dump=str(self.root / "backups"), keep=1))
        self.assertEqual(list(nested.iterdir()), [])
        self.assertEqual(len(list((self.root / "backups").glob("db-002*"))), 4)

    def test_real_http_alert_deduplicates_and_recovers(self):
        received = []
        healthy = [False]

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(json.dumps({"data": {"status": "healthy" if healthy[0] else "down"}}).encode())

            def do_POST(self):
                received.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
                self.send_response(204)
                self.end_headers()

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = "http://127.0.0.1:" + str(server.server_port)
        config = {"root": str(self.root), "url": url, "containers": {}, "backup_hours": 26, "threshold": 3, "webhook": url + "/alert/receiver-token"}
        try:
            for _ in range(5):
                self.assertEqual(monitor.tick(config), 1)
            self.assertEqual([e["state"] for e in received], ["incident"])
            healthy[0] = True
            self.assertEqual(monitor.tick(config), 0)
            self.assertEqual([e["state"] for e in received], ["incident", "recovered"])
            state = (self.root / ".runtime/contabo/monitor-state.json").read_text()
            events = (self.root / ".runtime/contabo/monitor-events.jsonl").read_text()
            self.assertNotIn("receiver-token", state + events)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_failed_receiver_is_retried(self):
        config = {"root": str(self.root), "url": "https://fixture.test", "containers": {}, "backup_hours": 26, "threshold": 1, "webhook": "https://fixture.test/secret"}
        with patch.object(monitor, "probe", return_value=False), patch.object(monitor, "notify", side_effect=OSError("receiver unavailable")) as notify:
            for _ in range(2):
                with self.assertRaises(OSError):
                    monitor.tick(config)
            self.assertEqual(notify.call_count, 2)

    def test_stopped_worker_and_overdue_backup_are_visible(self):
        config = {"root": str(self.root), "url": "https://fixture.test", "containers": {"worker": "fixture-id"}, "backup_hours": 1, "threshold": 1}
        with patch.object(monitor, "probe", return_value=True), patch.object(monitor.subprocess, "run", return_value=SimpleNamespace(returncode=0, stdout="exited|")):
            self.assertEqual(monitor.tick(config, self.manifest().stat().st_mtime + 7200), 1)
        event = json.loads((self.root / ".runtime/contabo/monitor-events.jsonl").read_text())
        self.assertEqual(event["checks"], ["worker", "backup_atrasado"])


if __name__ == "__main__":
    unittest.main()
