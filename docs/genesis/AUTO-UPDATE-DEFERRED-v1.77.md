# GENESIS TALK — Automatic Update Deferred in v1.77

Status: **DEFERRED / NOT APPROVED FOR GENESIS PRODUCTION**

2026-10-08: os jobs de escrita de release/GHCR têm guard explícito do repositório
upstream, portanto não publicam automaticamente no repositório Genesis. A rota
manual `deploy/contabo/` usa builds locais `genesis-talk-*:1.77.0` e não autoriza
o updater herdado. Ela ainda depende dos gates de runtime/recovery do relatório
`PRODUCTION-READINESS-v1.77.md`.

The current Deskcomm self-update, release and image-publication implementation is
retained in source so that this upstream intake does not fork those mechanisms
prematurely.

GENESIS TALK does **not** yet have an approved release channel, container namespace
or migration/rollback contract tied to Genesis releases. Therefore:

- do not treat the inherited release/image workflows as a Genesis release channel;
- do not use self-service update in a Genesis production installation yet;
- do not publish Deskcomm-named images as Genesis artifacts;
- configure/enable production release automation only after the dedicated
  Genesis update-channel work is completed.

The future implementation must bind one Genesis release to the same commit across
app, worker, scheduler and voice-agent images, then prove backup, schema
compatibility, health check and rollback/restore behavior.
