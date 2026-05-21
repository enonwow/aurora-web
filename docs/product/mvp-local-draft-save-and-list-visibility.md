# MVP Local Draft Save And List Visibility

## Goal
Define a safe MVP save model where editor work is saved as local drafts and production catalog visibility is strictly role-gated.

## Save Model (MVP)
1. Toolbar `Save` writes to local draft storage, not directly to production module data.
2. Save payload should use compact serialization (minimal metadata + normalized area/object payload) to avoid local storage bloat.
3. Save lifecycle states remain explicit:
- `Dirty`
- `Saving`
- `Saved`
- `Save failed`
4. MVP requires deterministic `save -> reopen` parity from local draft storage.
5. For production area editing paths, MVP uses `copy-on-open` behavior:
- opening a production area creates/uses a user-owned working copy in `Local Drafts`;
- further `Save` operations update that user-owned local draft only.

## Local Draft Workspace
1. Every user has a `Local Drafts` list.
2. Draft list entries should include at least:
- draft id;
- title/name;
- source area id (if cloned from production);
- updated timestamp;
- lightweight stats summary (for list UX).
3. Users can open their own drafts from `Local Drafts`.
4. Local draft cleanup (delete/archive) should be available to the draft owner.

## Production List Visibility (Role-Gated)
1. `Local Builder` role:
- does not see production list;
- can use only `Local Drafts`.
2. `Server Builder` role:
- sees two tabs/lists: `Production Areas` and `Local Drafts`;
- can browse production list and open areas;
- `Save` still writes local draft in MVP.
 - opening production area starts local working-copy flow (`copy-on-open`), avoiding direct shared-write conflicts.
3. `DMI/GMI` and `Administrator` follow privileged policy, but production catalog access remains server-authorized.

## Security Requirements
1. Production catalog endpoints must enforce server-side authorization.
2. Unauthorized users must receive deny-by-default responses for production list access.
3. UI visibility alone is not a security boundary.
4. API tests must include explicit negative checks for production catalog leakage.
5. Backend must treat production-area open and local-draft save as separate operations with explicit ownership checks.

## Open Decision (Post-Brainstorm)
1. Whether `Server Builder` can publish directly to production module in MVP remains open.
2. Until this decision is finalized, MVP baseline is `local-draft-only save`.

## Related Documents
1. `mvp-authentication-and-authorization.md`
2. `mvp-area-editing-capabilities.md`
3. `../brainstorm/aurora-ui-audit-top-toolbar-controls.md`
4. `../rules/README.md`
5. `mvp-location-export-hak-package.md`
