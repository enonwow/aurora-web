# MVP Location Export To HAK Package

## Goal
Allow users to export a selected local draft location through backend packaging into an artifact ready to insert into a HAK workflow.

## MVP Export Flow
1. User selects a location from `Local Drafts`.
2. User triggers `Export Location`.
3. Frontend sends normalized local draft payload (and required metadata) to backend export endpoint.
4. Backend validates payload and required references.
5. Backend builds location package artifact ready for HAK insertion.
6. User receives export result (download artifact + export report).

## Scope Boundary
1. Export does not auto-publish to production catalog.
2. Export is a packaging path only.
3. Save remains local-draft-first in MVP.

## Validation Requirements
1. Backend must validate schema and required asset references before packaging.
2. Packaging errors must return structured diagnostics (missing refs, invalid fields, unsupported data).
3. Successful export must include artifact metadata (id, timestamp, source draft id, version).
4. Export package structure must follow Aurora source-of-truth format expectations (Aurora-first rule), not ad-hoc custom layout.

## Permissions (MVP Baseline)
1. `Local Builder` can export own local drafts.
2. `Server Builder` can export own local drafts.
3. Export endpoint must remain authenticated and role-checked.
4. Export access does not grant production list access.

## Test Requirements
1. Unit tests:
- export payload validation;
- package manifest assembly.
2. Integration tests:
- local draft -> export endpoint -> HAK-ready package artifact.
3. Regression smoke:
- export same draft twice and verify deterministic package structure under same inputs.

## Related Documents
1. `mvp-local-draft-save-and-list-visibility.md`
2. `mvp-authentication-and-authorization.md`
3. `mvp-vision-and-phases.md`
4. `../rules/README.md`
