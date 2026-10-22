# Canonical Aurora sources

Skill suite contract: `1.0.15`. Runner versions are independent; validate a
runner by its declared contract tests rather than comparing its version string
to this skill-suite version.

Resolve `AURORA_STANDARD_ROOT`, falling back to `C:\Projects\aurora-web`.
Read live files from that root; do not copy their content into another project.

## Always read for live Toolset work

- `backend/docs/aurora-reverse/aurora-toolset-operating-standard.md`
- `backend/docs/aurora-reverse/aurora-toolset-session-workflow.md`
- `backend/docs/aurora-reverse/aurora-toolset-no-global-input-runbook-2026-07-02.md`

## Read by operation

- Camera or viewport:
  `aurora-toolset-camera-standard-2026-07-11.md`,
  `aurora-toolset-viewport-target-standard.md`,
  `aurora-toolset-tile-focus-calibration-2026-07-11.md`
- Palette placement:
  `aurora-toolset-palette-placement-standard.md` plus the family-specific
  placement standard.
- Selection/transform:
  `aurora-toolset-object-selection-standard.md`,
  `aurora-toolset-adjust-location-standard.md`,
  `aurora-toolset-bearing-rotation-standard.md`,
  `aurora-toolset-undo-redo-standard.md`
- Module proof:
  `aurora-toolset-fast-module-proof-runner-standard.md`
- Proof capture:
  `proof-capture-safety-contract-2026-07-10.md`
- Background NWN observation without bringing it above other windows:
  `aur-s07-runtime-execution-standard.md`, section
  `Discriminated per-window observation`. Occlusion and minimization are
  distinct: select the authorized existing PrintWindow entrypoint for an
  occluded window; restore an iconic window only through its separately
  authorized no-activation transition. Do not assume the configured MCP uses
  this method or silently replace physical proof with per-window observation.
  For long background observation while the user works in other windows,
  follow that standard's explicit ambient-window observation policy. Sampled
  foreground/predecessor changes are observations with an unverified cause,
  not permission to change window order or evidence of globally stable UI.
  Keep exact NWN identity, geometry, monitor and modal guards; do not infer
  the opt-in policy from a successful strict capture or an old MCP catalog.

All relative document names above live under
`backend/docs/aurora-reverse`.

## Entrypoints

- Governed Area session:
  `backend/scripts/aurora-toolset-session.mjs`
- Fast disposable module proof:
  `backend/scripts/run-aurora-toolset-module-proof.mjs`
- Offline binary-bootstrap native geometry and explicit-open admission:
  `backend/scripts/aurora-toolset-binary-module-native-geometry.mjs` with
  `aurora-toolset-binary-module-bootstrap-standard.md`
- Read-only modal discovery:
  `backend/scripts/list-aurora-toolset-top-windows-readonly.mjs` and
  `backend/scripts/inspect-aurora-toolset-visible-windows-no-global-input.mjs`
- Safe modal preflight:
  `backend/scripts/preflight-aurora-toolset-no-modal-no-global-input.mjs`
- Explicitly authorized stale Build Module close only:
  `backend/scripts/close-aurora-toolset-stale-build-session.mjs` and
  `aurora-toolset-stale-build-session-close-standard.md`

Use `rg --files backend/scripts` to locate a verified task-specific atom before
creating code. A consuming project's product dependency policy does not
restrict this shared Aurora operator tooling: execute the canonical runner or
verified atom directly. Do not create, qualify, or require a project-local
Toolset runner or UI adapter as a replacement.
