# Aurora Feature Parity Gap Backlog

## Purpose
Capture what Aurora Toolset capabilities are already covered in the current brainstorm and what is still missing or under-specified.

## Analysis Timestamp
- 2026-05-20 (Europe/Warsaw)

## Confirmed Aurora Capability Domains
Based on reverse artifacts and toolset surface extraction, Aurora includes:
1. Area lifecycle: create, resize, rotate, verify, area stats.
2. Area properties: environment/audio/light/day-night/scripts/world map fields.
3. Object authoring/editing: dedicated surfaces for creature, placeable, door, trigger, sound, encounter, store, waypoint.
4. In-viewport editing: properties, adjust location, delete, tile ops, variable dialogs.
5. Script lane: editor, compile, search, find/replace, script wizard.
6. Conversation lane: editor, test/search flows, script hooks, import/export.
7. Module/campaign lane: module wizard/selection, faction editor, journal editor, test module.
8. Import/export and verification lane: conflict-aware import/export, module verify, resource browser.
9. Debug/visualization lane: draw modes, object-type filters, grid/fog/shadow toggles, audio preview.

## Already Covered In Current `aurora-web` Brainstorm
1. Area load/create/modify as core MVP direction.
2. Incremental object placement/editing (no full-area rerender by default).
3. Selection scopes, multi-select, and marquee selection behavior.
4. Adjust Location and Visual Transform workflows.
5. Object browser + previews + drag/drop + no context-loss preview flow.
6. Render/debug settings baseline with dev-only debug intent.
7. Panel ergonomics and collapsible layout requirements.
8. Player navigation/camera check flow for area validation.
9. Client-side map capture/filter concept.
10. AuthN/AuthZ foundation and role separation direction.
11. Contract-first and telemetry-first operating model.
12. UX shell-first staging model for complex property panels (structure now, deeper functionality post-MVP).
13. MVP-mandatory area creation lane with palette-driven tile authoring (`Features`, `Groups`, `Terrain`).
14. Door-property parity surface is documented with explicit MVP baseline for script slots and transition setup UX.
15. MVP paint tool coverage includes: terrain, creatures, doors, items, placeables, and sounds.
16. MVP object context menu coverage includes: adjust location, delete, variables, and properties.
17. MVP top-toolbar decisions are defined for file/module, selection, and show-filter actions; preview/atmosphere block remains pending estimation.
18. MVP save model is local-draft-first with role-gated production list visibility and backend deny-by-default enforcement.
19. DM demo mode is included as privileged runtime path (`read-only view + live commands`), separated from normal editor flow.
20. Admin mode is scoped to configuration/operations surface with explicit backend authorization.
21. Sound object placement/edit baseline is included; advanced audio/atmosphere preview controls remain pending cost evaluation.
22. MVP export path is defined: local draft payload -> backend packaging -> HAK-ready location package artifact.
23. MVP includes explicit login panel and backend seed of `3-4` test users for role-based integration paths.
24. Production editing in MVP uses `copy-on-open` to local user draft, reducing shared-write conflict risk.
25. Stage branch baseline is set to `dev` and `prod`.
26. DM mode phase 1 starts from a single end-to-end command (`spawn creature`) through API -> Redis -> NWNX.

## Missing Or Under-Specified Items

### P1 (High)
1. Final local-draft serialization format, quota policy, and eviction behavior.
2. Promotion workflow from exported artifacts to release branch/process (`dev`/`prod`) needs architecture-level definition.
3. Optimistic concurrency for multi-user edits (`revision`/`ETag` conflict handling) is only required if future scope enables direct shared-write paths.
4. Full tile authoring workflow (paint/replace/rotate/constraint feedback), not only tile rendering. This is an MVP mandatory gate.
5. Transition/link workflow for door/trigger/waypoint (`source -> destination`) is not a hard MVP gate under current scope; keep as post-MVP candidate unless architecture stage re-enables it.
6. Area properties parity as an explicit feature slice (environment/audio/lighting/scripts core set).
7. Full object-type parity plan beyond current focus: trigger/encounter/store/waypoint.
8. Final undo/redo command model details for area session actions (command boundaries and memory limits).
9. Pre-save validation gate with object-level error pointers and blocking policy for critical failures.
10. Script-slot assignment support (no full editor) for:
- area script slots;
- placeable script slots;
- creature script slots.
- door script slots.

### P2 (Medium)
1. Blueprint/template lifecycle (create from instance, reuse, override visibility).
2. Expanded script/event binding flow beyond MVP core scope (additional object families + deeper validation).
3. Instance outliner/search (find object among thousands, focus from list).
4. Multi-area workflow (open/copy between areas without losing context).
5. Area transition integrity tooling (reciprocity checks, quick-fix suggestions).

### P3 (Later)
1. Module/package import-export planning UI (dry-run: missing/overwrite/conflict).
2. Collaboration safety extras (lock strategy/presence visibility/merge policy UI).
3. Extended module verification reporting UX (filters, exportable reports).
4. Deterministic source precedence/provenance (`module/hak/override`) in all resolved objects.
5. Recovery safety net (auto-snapshot + quick rollback) for failed saves or destructive mistakes.
6. Role-based audit trail (`who/when/what`) for privileged and destructive actions.
7. Full script authoring lane (editor/compile/search/wizard).
8. Full dialog/conversation authoring lane (editor/test/import-export).

## Break Workflows If Gaps Stay Open
1. `palette -> place -> properties -> save -> reopen`
2. `new area -> tile layout -> object pass -> transitions -> save`
3. `load area -> locate bad object -> fix -> validate -> save`
4. `two builders edit same production area -> prevent lost updates` (applies when publish is enabled)

## Source Pointers
1. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Tooling-Audits\nwtoolset_rcdata_report.md`
2. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0716_toolset_authoring_surface_matrix.json`
3. `C:\Projects\aurora-web\docs\product\*.md`
4. `C:\Projects\aurora-web\docs\brainstorm\*.md`
5. Public context (EE/toolset deltas): https://nwn.wiki/display/NWN1/Major+Changes+in+NWN+EE
