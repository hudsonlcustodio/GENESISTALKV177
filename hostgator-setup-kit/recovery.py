#!/usr/bin/env python3
"""Protected recovery bundles: integrity, COPY row counts and schema/ACL contract.

No DB credentials are read here. SQL is consumed locally; row content is never
copied into the manifest or printed. Commands fail closed before a restore starts.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys
import tarfile
import shutil
import os

FORMAT = "genesis-recovery-v2"
IDENT = r'(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z_0-9$]*)'
COPY = re.compile(rf'^COPY ({IDENT}\.{IDENT}) \(')


def digest(file):
    h = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def stem(dump):
    if not re.fullmatch(r"db-[A-Za-z0-9_-]+\.sql\.gz", dump.name):
        raise ValueError("Esperado db-<instante>.sql.gz")
    return dump.name[:-7]


def allowed_files(bundle):
    return {bundle + suffix for suffix in (".sql.gz", ".catalog.json", ".checks.sql")} | {
        kind + "-" + bundle[3:] + ".tgz" for kind in ("waha", "storage")}


def create(args):
    dump = Path(args.dump).resolve(strict=True)
    catalog_file = dump.with_name(stem(dump) + ".catalog.json")
    catalog = json.loads(catalog_file.read_text(encoding="utf-8-sig"))
    if catalog.get("format") != 2 or not re.fullmatch(r"[a-f0-9]{32}", catalog.get("schema_fingerprint", "")):
        raise ValueError("Contrato de schema/permissões inválido")
    if catalog.get("postgres_major") not in (15, 17):
        raise ValueError("Recuperação homologada somente nos majors PostgreSQL 15/17")
    counts = {}
    table = None
    clean = False
    with gzip.open(dump, "rt", encoding="utf-8", newline="") as sql:
        for line in sql:
            if table is not None:
                if line.rstrip("\r\n") == r"\.":
                    table = None
                else:
                    counts[table] += 1
                continue
            if line.startswith("DROP "):
                clean = True
            match = COPY.match(line)
            if match:
                table = match.group(1)
                if table in counts:
                    raise ValueError("COPY duplicado no dump")
                counts[table] = 0
    if table is not None or not clean:
        raise ValueError("Dump cortado ou sem limpeza controlada; use o backup v2")
    checks = dump.with_name(stem(dump) + ".checks.sql")
    statements = ["-- Generated from COPY sections; executed inside the restore transaction."]
    for name, expected in counts.items():
        statements.append(
            "DO $genesis$ BEGIN IF (SELECT count(*) FROM " + name + ") <> " + str(expected) +
            " THEN RAISE EXCEPTION 'Contagem divergiu na recuperação'; END IF; END $genesis$;"
        )
    contract_sql = Path(__file__).with_name("recovery-catalog.sql").read_text(encoding="utf-8").strip().rstrip(";")
    statements.append(
        "DO $genesis$ DECLARE actual text; BEGIN SELECT catalog->>'schema_fingerprint' INTO actual FROM (" +
        contract_sql + ") snapshot; IF actual <> '" + catalog["schema_fingerprint"] +
        "' THEN RAISE EXCEPTION 'Schema, RLS ou privilégios divergem do backup'; END IF; END $genesis$;"
    )
    checks.write_text("\n".join(statements) + "\n", encoding="utf-8")
    files = [dump, catalog_file, checks]
    omitted = []
    for kind, required, suffix in (("waha", args.sessions_required, ".tgz"),
                                   ("storage", args.storage_required, ".tgz")):
        file = dump.with_name(kind + "-" + stem(dump)[3:] + suffix)
        if file.exists():
            files.append(file)
        elif required:
            raise ValueError("Backup incompleto: falta " + kind)
        else:
            omitted.append({"component": kind, "reason": "sem sessão cadastrada" if kind == "waha" else "Storage externo: cópia de objetos administrada separadamente"})
    manifest = {"format": FORMAT, "postgres_major": catalog["postgres_major"],
                "copy_tables": len(counts), "omitted": omitted,
                "files": [{"name": file.name, "sha256": digest(file)} for file in files]}
    dump.with_name(stem(dump) + ".manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def verify(args):
    if Path(args.dump).is_symlink():
        raise ValueError("Dump não pode ser link simbólico")
    dump = Path(args.dump).resolve(strict=True)
    manifest_file = dump.with_name(stem(dump) + ".manifest.json")
    if manifest_file.is_symlink():
        raise ValueError("Manifesto não pode ser link simbólico")
    manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    if manifest.get("format") != FORMAT:
        raise ValueError("Backup legado sem prova de ACL/integridade: restaure somente por plano de recuperação isolado")
    required = {dump.name, stem(dump) + ".catalog.json", stem(dump) + ".checks.sql"}
    if args.storage_required:
        required.add("storage-" + stem(dump)[3:] + ".tgz")
    if args.sessions_required:
        required.add("waha-" + stem(dump)[3:] + ".tgz")
    names = set()
    for item in manifest.get("files", []):
        name = item["name"]
        if name not in allowed_files(stem(dump)) or name in names:
            raise ValueError("Manifesto contém caminho inválido ou repetido")
        file = dump.with_name(name)
        if file.is_symlink() or not file.is_file() or digest(file) != item["sha256"]:
            raise ValueError("Arquivo ausente ou hash inválido: " + name)
        names.add(name)
        if name.endswith(".tgz"):
            with tarfile.open(file, "r:gz") as archive:
                for member in archive:
                    if member.name.startswith("/") or "\\" in member.name or ".." in PurePosixPath(member.name).parts or member.issym() or member.islnk() or not (member.isfile() or member.isdir()):
                        raise ValueError("Snapshot contém caminho/link/tipo inseguro: " + name)
    if not required.issubset(names):
        raise ValueError("Manifesto incompleto")
    if manifest.get("postgres_major") not in (15, 17):
        raise ValueError("Major sem homologação de recuperação")
    if args.major and args.major != manifest.get("postgres_major"):
        raise ValueError("Use destino com o mesmo major PostgreSQL do backup")
    print(manifest["postgres_major"])


def retain(args):
    directory = Path(args.dump).resolve(strict=True)
    if args.keep < 1:
        raise ValueError("Retenção mínima de um bundle")
    manifests = sorted(directory.rglob("db-*.manifest.json"), key=lambda p: p.stat().st_mtime_ns, reverse=True)
    for manifest_file in manifests[args.keep:]:
        if manifest_file.is_symlink():
            raise ValueError("Manifesto não pode ser link simbólico")
        data = json.loads(manifest_file.read_text(encoding="utf-8"))
        if data.get("format") != FORMAT:
            continue
        bundle = manifest_file.name.removesuffix(".manifest.json")
        parent = manifest_file.parent.resolve(strict=True)
        if parent != directory and directory not in parent.parents:
            raise ValueError("Bundle fora da pasta de retenção")
        stem(Path(bundle + ".sql.gz"))
        if any(item["name"] not in allowed_files(bundle) for item in data["files"]):
            raise ValueError("Caminho inválido na retenção")
        for item in data["files"]:
            name = item["name"]
            parent.joinpath(name).unlink(missing_ok=True)
        manifest_file.unlink()


def replicate(args):
    # Local mounted off-host destination (encrypted volume/NFS/backup agent).
    # No shell command or arbitrary network endpoint is executed with secrets.
    verify(args)
    source = Path(args.dump).resolve(strict=True)
    destination = Path(args.destination).resolve(strict=True)
    if destination == source.parent or source.parent in destination.parents:
        raise ValueError("Destino externo não pode ficar dentro da pasta de origem")
    folder = destination / stem(source)
    folder.mkdir(mode=0o700, exist_ok=False)
    os.chmod(folder, 0o700)
    manifest_file = source.with_name(stem(source) + ".manifest.json")
    data = json.loads(manifest_file.read_text(encoding="utf-8"))
    for name in [item["name"] for item in data["files"]] + [manifest_file.name]:
        target = folder / name
        with source.with_name(name).open("rb") as stream, target.open("xb") as output:
            os.chmod(target, 0o600)
            shutil.copyfileobj(stream, output)
    args.dump = str(folder / source.name)
    verify(args)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("create", "verify", "retain", "replicate"))
    parser.add_argument("dump")
    parser.add_argument("--sessions-required", type=int, choices=(0, 1), default=0)
    parser.add_argument("--storage-required", type=int, choices=(0, 1), default=0)
    parser.add_argument("--major", type=int)
    parser.add_argument("--keep", type=int, default=14)
    parser.add_argument("--destination")
    args = parser.parse_args()
    try:
        {"create": create, "verify": verify, "retain": retain, "replicate": replicate}[args.mode](args)
    except (OSError, ValueError, KeyError, TypeError, tarfile.TarError) as exc:
        print("Recuperação recusada: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
