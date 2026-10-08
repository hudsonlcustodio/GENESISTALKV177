# GENESIS TALK — Automatic Update Deferred in v1.77

Status: **DEFERRED / NOT APPROVED FOR GENESIS PRODUCTION**

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
