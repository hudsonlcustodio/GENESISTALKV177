# GENESIS TALK v1.77

GENESIS TALK is a multi-tenant platform for customer service, CRM, automation
and AI agents, built on the current DeskcommCRM open-source foundation and
evolved with Genesis-specific product, branding, mobile, safety and operational
requirements.

## v1.77 technical baseline

This version reconciles GENESIS TALK v0.13 with the supplied current DeskcommCRM
`main` snapshot (`DeskcommCRM-main1-77.zip`).

The current Deskcomm tree is the technical baseline. Genesis behavior is carried
forward selectively rather than by overwriting the new upstream tree.

### Current product priorities

1. **Mobile First**
   - Inbox, contacts, funnel/Kanban, agenda, tasks and follow-up must remain
     operational on 360–430 px viewports.
   - Current upstream mobile improvements in AppShell, Inbox and Kanban are kept.
2. **Supervisão 360**
   - Managers get a consolidated operational view of humans + AI.
   - Tenant/RBAC boundaries remain server-side.
3. **Genesis behavior contracts**
   - GEN-001..023 remain regression contracts for handoff, realtime, support,
     LGPD and side-effect safety.

The future IMOBI/real-estate vertical remains out of this general-product release.

## Database

Fresh self-host installations use the current `supabase/baseline.sql` contract.
Historical migrations remain the evolution ledger. Existing Aurum/IMOBI databases
still require a real schema fingerprint before any bridge migration is approved.

## Automatic update

**Deferred in v1.77.** The upstream updater and release workflow implementation
remain in the source for compatibility and later adaptation, but Genesis does
not yet have an approved release/image channel. They are **not approved for
Genesis production use**. Before connecting this tree to production automation,
re-point GitHub Releases/GHCR, validate migration compatibility and prove
rollback/restore.

## Read first

- `docs/genesis/PROJECT-STATE.md`
- `docs/genesis/UPSTREAM-RECONCILIATION-v1.77.md`
- `docs/genesis/PRD-MOBILE-FIRST-SUPERVISAO-360-v0.12.md`
- `docs/genesis/RELEASE-GATE-v0.8.md`
- `docs/genesis/AUTO-UPDATE-DEFERRED-v1.77.md`

## Upstream attribution

GENESIS TALK is based on DeskcommCRM (`melgarafael/DeskcommCRM`) and preserves
the upstream license and compatibility-sensitive technical contracts where
applicable. The upstream README captured at this intake is archived under
`docs/upstream/DESKCOMM-README-at-intake-v1.77.md`.

Technical identifiers such as legacy cookies, webhook headers, migration names
and wire contracts are not globally renamed merely for branding.
