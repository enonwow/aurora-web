# Aurora Web Product Vision And MVP Phases

## Product Vision
`aurora-web` is intended to become an expanded, modernized Aurora-style platform:
1. It should preserve core Aurora capabilities.
2. It should progressively extend those capabilities with new workflows.

## MVP Scope (Phase 1)

### Track A: Location Builder (Editor-Oriented)
1. Core goal: create and load locations with Aurora-parity baseline behavior.
2. Focus: stable location creation workflow and reliable rendering pipeline.
3. This is the first foundation block for broader editing capabilities.
4. Detailed MVP editor expectations are defined in `mvp-area-editing-capabilities.md`.
5. Runtime-feel validation via controllable default avatar (WASD + first/third person camera) is defined in `mvp-player-avatar-navigation-and-camera.md`.
6. Core editor selection workflow (mode-based select + `Ctrl` multi-select + `Shift` rectangle selection) is defined in `mvp-selection-modes-and-multi-select.md`.
7. Render settings and debug visualization parity/extension are defined in `mvp-render-settings-and-debug-visualization.md`.
8. Workspace panel layout and UX consistency (collapsible side panels + structured controls) are defined in `mvp-panel-layout-and-ux-system.md`.
9. Client-side top-down map capture with optional visual filters is defined in `mvp-client-side-map-capture-and-filters.md`.
10. Creature animation preview for rig/skeleton validation is defined in `mvp-creature-animation-preview.md`.
11. Experimental AI connector for draft location generation is defined in `mvp-ai-location-generation-connector.md`.
12. Script scope in MVP is limited to assigning existing script references to core slots (area/placeable/creature/door); full script and dialog authoring is postponed to post-MVP phases.
13. Complex property panels may ship as UX shells in MVP (tab/section structure visible), with non-MVP capabilities staged in later phases.
14. Area creation with palette-driven tile authoring (`Features`, `Groups`, `Terrain`) is a hard MVP requirement.
15. MVP save target is local drafts (no default direct production publish); list visibility and save model are defined in `mvp-local-draft-save-and-list-visibility.md`.
16. MVP includes backend-assisted export from local draft to HAK-ready location package; export scope is defined in `mvp-location-export-hak-package.md`.
17. Production area editing uses `copy-on-open` working copy in local drafts to avoid direct shared-write conflicts.

### Track B: GM Demo Mode (Read-Only + Live Actions)
1. Core goal: load locations in non-edit mode for GM/demo usage.
2. Provide operational panels for runtime actions (for example spawning a monster).
3. Send runtime action commands to server-side integration for NWN execution.
4. Detailed DM/GM runtime scope is defined in `mvp-dm-demo-mode.md`.

### Track C: Access Control Foundation (AuthN + AuthZ)
1. Core goal: enforce authenticated access and role-based permissions for all project workflows.
2. Separate `Local Drafts` workspace access from `Production Areas` catalog access.
3. Restrict privileged features (GM/DM operations and system settings) to dedicated roles only.
4. Detailed role model and permission matrix are defined in `mvp-authentication-and-authorization.md`.
5. Production list access must always be server-authorized; UI hiding is not sufficient.
6. Minimal administrator operating surface is defined in `mvp-admin-mode.md`.
7. MVP includes login panel and backend bootstrap of `3-4` test users for early role-path validation.

## MVP Integration Flow (Redis + NWNX Path)
1. User performs action in `aurora-web` (for example spawn creature at position).
2. Backend publishes command to Redis queue/topic with structured payload.
3. NWNX-side consumer receives message in NWN client/server environment.
4. NWN script executes target action based on message type/payload.

## Post-MVP Direction (Future Phases)
1. Placeable editing components.
2. Creature/model editing components.
3. Additional domain panels and workflows.
4. Expanded live-control and automation capabilities.
5. Expanded style-aware AI generation across additional area themes.
6. Full script editor workflows (authoring/compile/search/wizard).
7. Full dialog/conversation editor workflows.

## Architecture And UX Implications
1. System must remain open for new feature modules without major refactor.
2. Contract design must support both:
- editor workflows;
- demo/live-operation workflows.
3. UI navigation and panel system should be designed as extensible from the start.
4. Feature boundaries should avoid hard coupling between location rendering and future editing subsystems.
5. Object preview/inspection workflows should be non-destructive and must not force area reload.
6. Single-object operations should use incremental scene updates instead of full-area rerender.
7. Rendering paths for tiles/placeables/doors/creatures/VFX should converge through one shared render core with thin type adapters.
8. Map image generation should run on client by default to avoid backend GPU/render pressure.

## Delivery Principles For This Vision
1. Contract-first.
2. Diagnosability-first.
3. Branch-first with required quality gates.
4. SOLID-driven extensibility.
