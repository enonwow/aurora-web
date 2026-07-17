# Aurora Toolset Session Workflow

Status: canonical executable workflow for Aurora Toolset open, Area oracle capture, viewport observation/target verification, and targeted close.

Public entrypoint:

```powershell
cd C:\Projects\aurora-web\backend
npm run areas:toolset-session -- <command>
```

Do not invoke the opener, Area opener, queue runner, capture script, or close script directly during normal Toolset work. They are adapters owned by `backend/scripts/aurora-toolset-session.mjs`. The opener enforces this boundary: a live direct/legacy call returns `toolset_noncanonical_entrypoint_rejected`; offline `--preflightOnly` remains available.

## Single-load invariant

One session owns at most:

- one `nwtoolset.exe` process start;
- one module-load owner: `mru`, `explicit_open`, `recovery`, or `external`;
- one module reaching ready state;
- one currently selected Area;
- one capture per Area resref.

Once a module-load owner exists, `File > Open` is permanently forbidden for that process. A final module title is not required: any `TdlgProgress`, module title, `Loading Inventory List`, `Loading GIT Files`, or recovery prompt proves that Toolset already owns a load.

`MRU0` is selection context, not proof that loading started. The manager no longer adds a fixed 15-second startup pause. It continuously checks welcome, progress, modal, and module-frame state. A load signal claims owner `mru`/`external`; that ownership is sticky even if the progress dialog later disappears. Explicit selection is allowed only from an unowned welcome/Open state and only for an exact module-list text match.

Recovery prompts are a hard blocker for unattended oracle capture. Historical manual recovery remains useful evidence, but automation must not click Yes/No and then attempt another module open.

## Commands

### Inspect

```powershell
npm run areas:toolset-session -- status
```

Read-only. Shows the persistent session state and current `nwtoolset` processes.

### Reconcile an orphaned ledger

```powershell
npm run areas:toolset-session -- reconcile
```

This never starts or controls Toolset. It is allowed only when the saved
session is active but its owned process is absent; it records the exact blocker
and releases the stale legacy guard. A live session must be closed normally.

### Offline preflight

```powershell
npm run areas:toolset-session -- preflight
```

Required before `open`. It verifies the exact filename and pinned SHA-256 of the approved module, the current 169-Area queue, zero Toolset/NWN processes, no unsafe `temp0` recovery state, and dry opener behavior without starting Toolset.

### Open once

```powershell
npm run areas:toolset-session -- open
```

Requires state `prepared`. It rejects the primary display (`windowLeft >= 0`), starts at most one Toolset process on the dedicated left monitor (`X=-1920`), performs passive observation, and records the load owner. It does not open an Area.

### Capture the queue

```powershell
npm run areas:toolset-session -- run-queue
```

Requires state `module_ready`. It never starts Toolset and never opens a module. It selects Area entries sequentially, settles, captures with targeted `PrintWindow`, and writes stable PNG names containing the Area resref.

For one or more additional Areas after an already verified Area, use the same
canonical command with an explicit continuation flag:

```powershell
npm run areas:toolset-session -- run-queue `
  --continueAreaNavigation true `
  --queue <exact-area-queue.json> `
  --capture false
```

This path is allowed only from `area_ready`, requires exactly one responding
Toolset process and an already verified current Area, and never starts Toolset
or opens a module. It exists for sequential oracle/observer work; it is not a
restart or fallback path.

### Observe and verify a viewport target

```powershell
npm run areas:toolset-session -- observe --sourceModulePath <decompiled-module-directory>

npm run areas:toolset-session -- verify-viewport-target `
  --tileX 1 --tileY 1 --tileId 197 --orientation 1 `
  --yawDegrees 135 --pitchDegrees 68 --zoomPixelsPerTile 143
```

`observe` captures only the already validated current viewport and writes its
source/visual context. `verify-viewport-target` resolves the source tile and
requires direct tile identity plus full numeric camera readbacks. It is an
evaluation gate, not a duration-based camera command. See
`aurora-toolset-viewport-target-standard.md`.

### Targeted close

```powershell
npm run areas:toolset-session -- close
```

Posts targeted close messages, verifies zero remaining Toolset processes, and releases the legacy module-open guard.

### Full approved run

```powershell
npm run areas:toolset-session -- all
```

This is the normal end-to-end command: `preflight -> open -> run-queue -> close`. Any blocker stops the chain and performs targeted close when a process may exist. It never retries or reopens the module.

For a small validation slice before the full queue:

```powershell
npm run areas:toolset-session -- all --limit 1
```

## Durable artifacts

Default directory:

`C:\Projects\aurora-web\.codex-tmp\area-toolset-oracle-20260710`

- `session-state.json` — persistent process/load/Area/capture state and event log;
- `manifest.json` — queue result and per-Area status;
- `captures/NNN-resref.png` — stable Toolset proof PNG;
- `captures/NNN-resref.capture.json` — per-capture diagnostic manifest.

## Blocker policy

Stop immediately and close only the owned Toolset process on recovery, Access Violation, unexpected module, multiple processes, missing load owner, stale progress timeout, invalid capture, or Area mismatch.

Never retry inside the same run. Never use global cursor or keyboard input. Never save or modify the module.

## Corrected incident finding (2026-07-10)

The prior claim that `moduleOpenActionCount=1` proved a single module load was false. That counter covered only the automation's explicit selection and did not observe Toolset's startup/MRU load. The user-provided frame showed `the_last_city - codex.mod` already loading (`Loading Inventory List` / `Loading GIT Files`) before automation submitted another module selection. This is a startup race and a second-module attempt.

The regression fix removes the alternate `integration-test` profile from the canonical manager, removes its direct npm opener alias, rejects unsafe restart/reuse overrides, and requires a sticky passive-startup ownership decision before any Open action.

Offline ERF/GFF audit found 170 complete ARE/GIT/GIC triples, zero malformed GFF resources, zero missing pairs, zero duplicate resource keys, and zero unreachable structs. `cdx_mapflat01` is the only Area resource outside the requested 169-Area queue and was historically deployed before documented full-module inventory-load failures; this is a lead, not a proven root cause.

Historical Last City AV evidence remains in the registry. A canonical single probe is permitted only for the exact pinned Last City SHA-256 after explicit user authorization and a clean preflight; arbitrary quarantine/full-module overrides remain rejected.

## Successful three-Area session (2026-07-11)

The corrected workflow passed a live test on `the_last_city - codex.mod`:

- one process, PID `7652`, proof monitor `X=-1920`;
- `moduleLoadOwner=mru`, `explicitOpenCount=0`, no second module action;
- exact module title verified and `accessViolationDetected=false`;
- Area viewers verified sequentially for `enon_test_mount`, `enon_test_ah`, and `enon_test_chest`;
- targeted close completed with `afterProcesses=[]` and `afterWindows=[]`.

The durable result is
`backend/docs/aurora-reverse/artifacts/toolset-session-20260711/three-area-live-result.json`.
Performance findings and the faster persistent Area navigator design are in
`backend/docs/aurora-reverse/aurora-toolset-performance-plan-2026-07-11.md`.

The optimized repeat run also passed with `opened=3`. It removed the fixed
post-module 15-second delay, replaced the Area 8-second delay with viewer-state
detection, and separated navigation from optional capture. See
`backend/docs/aurora-reverse/artifacts/toolset-session-20260711/three-area-repeat-optimized-result.json`.
