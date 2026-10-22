# Offline Binary Module Bootstrap Standard

Status: `CENTRAL CONSUMER ROUTE / structural preflight plus native-geometry route; no visual or runtime proof claimed`

## Purpose

This route accepts a newly built, caller-owned NWN `.mod` binary. It does not
copy, call, or require a project-local Toolset runner. A project may use its
own ERF/GFF asset pipeline to materialize the binary; the central validator
independently binds the resulting immutable bytes and serialized contents.

The profile is `aurora-toolset-binary-module-bootstrap-profile/v1`; an example
is in `proof-profiles/binary-module-bootstrap-profile.example.json`.

## Central structural gate

```powershell
node backend/scripts/validate-aurora-toolset-binary-module-bootstrap.mjs `
  --mode dry-run --profile <caller-owned-profile.json>

node backend/scripts/validate-aurora-toolset-binary-module-bootstrap.mjs `
  --mode preflight --profile <caller-owned-profile.json>
```

`preflight` proves only serialized structure: immutable MOD and HAK hashes,
the exact filename/resref, complete ARE dimensions and Tile_List count, IFO
entry Area/position, ordered `Mod_HakList`, and exact GIT fixture
template/appearance/position. It uses central packed-MOD and GFF readers.
It never starts Toolset or NWN and does not claim native geometry, visual, or
runtime proof.

## Native geometry continuation

The named central entrypoint is
`backend/scripts/aurora-toolset-binary-module-native-geometry.mjs`. It is the
only authorized Toolset route for this binary-bootstrap profile; consumers do
not call the opener, Area atom, Save atom, or a project-local UI adapter.

```powershell
$profile = 'C:\caller-owned\binary-module-bootstrap-profile.json'
$out = 'C:\caller-owned\binary-native-geometry-run'

node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs dry-run `
  --profile $profile --outDir $out
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs explicit-open-startup-admission-dry-run `
  --profile $profile --outDir $out
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs preflight `
  --profile $profile --outDir $out
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs open `
  --profile $profile --outDir $out
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs geometry-observe `
  --profile $profile --outDir $out
```

`preflight` rejects every pre-existing `nwtoolset.exe`, including a responsive
but stalled Wizard/Build Module process. It neither closes nor reuses that
process. `open` creates at most one new session and binds the exact module
resref/hash plus both Area identities: serialized resref and the ARE-native
display name used by Toolset's Area tree. `geometry-observe` opens only that
Area, performs the central native Save/readback gate, and fail-closes on an
invalid-locations or `Inaccessable Objects` condition.

### Explicit-open startup admission

The native route owns `aurora-toolset-explicit-open-startup-admission/v3`. It
always starts `nwtoolset.exe` without a module argument and enters immediate
passive observation. A mismatching `MRU0` is recorded as `mruConflict`; it is
not a preflight rejection and never authorizes an INI/MRU write.

Only a clean, unowned Welcome may submit `Open an existing Module`. The route
sets the exact radio state with `BM_SETCHECK(checked)`, then performs its
synchronous `BM_CLICK` and reads both `Open an existing Module=checked` and
`Start normally=unchecked` before posting `OK`; a checked Open radio alone is
insufficient. The module list must
contain exactly the requested MOD filename or resref and the selected text is
read back. An already validated unowned blank frame may use the
canonical Open-dialog transition. Once a recovery prompt, progress/load signal,
or module frame claims an owner, the owner is sticky: `File > Open`, another
selection, retry, and reuse are forbidden. A wrong MRU load remains a failed
startup result and is never accepted as the requested module.

`open` requires the child result to prove `moduleLoadOwner=explicit_open`, one
submitted exact list selection, and an exact requested module frame title. It
writes the admission and child process/window readback to the manifest before
any native Area or Save work. The central integration test covers both branches:
Welcome selection wins and an MRU load wins first.

### Exact `temp0` recovery admission

An existing native `modules\temp0` cache is not automatically corrupt and is
not permission to archive, delete, rename, or bypass it. For a cold
model-proof preparation, the public route may issue
`aurora-toolset-verified-temp0-recovery-admission/v1` only after it proves:

- the installed MOD equals the profile-pinned source SHA-256;
- the MOD contains only supported resource types with unique cache filenames;
- `temp0` contains exactly the expected file set;
- every cache file is a regular non-reparse file whose length and SHA-256 equal
  the corresponding ERF resource;
- no missing, extra, non-file, reparse, or duplicate-mapped entry exists.

The admission is stored in the immutable native-geometry manifest and
revalidated immediately before launch/prompt handling. Only the exact known
recovery prompt with unique `Yes`/`Tak` and `No`/`Nie` controls may receive one
targeted non-destructive `Yes`/`Tak` `BM_CLICK`. Success requires
`moduleLoadOwner=verified_temp0_recovery`, one recorded recovery action, and
the exact clean requested module frame. This path never uses global input,
edits INI/MRU state, falls through to `File > Open`, or mutates `temp0`.
Any identity, prompt, frame, dirty-state, or repeat mismatch fails closed.

#### Aurora evidence and v2/v3 corrections

The local canonical no-global-input runbook records the native `TdlgWelcome`
control contract: exact `TRadioButton` text `Open an existing Module`, exact
`TButton` text `OK`, followed by `BM_SETCHECK`, synchronous radio `BM_CLICK`,
and then `OK`. This is Aurora Toolset evidence, not an inferred UI convention.
The v1 live packet for `m2a_now01` proved that a radio `BM_CLICK`/readback
alone can still fall through to MRU loading. v2 therefore bound and recorded
the set-check readback before the click. Its `m2a_now01` packet still failed,
but it also recorded a blank `TdlgProgress` immediately after its owned
Welcome transition. The current central workflow already identifies the
post-Welcome `Loading Custom Palettes...` progress as non-module startup work;
v3 extends that evidence to the same anonymous progress surface only in that
exact owned transition. It records the reason and continues waiting for its
owned `Open` dialog. It also reads the sibling `Start normally` state, so it
fails before `OK` if both radios remain checked. No new `WM_COMMAND`, focus,
INI/MRU mutation, retry, or reuse is inferred from either packet.

The native Save can repack the MOD, so the route deliberately emits
`geometry_saved_pending_entry_observation` rather than accepting a stale
pre-save hash. It writes the exact post-save module hash, Area and entry
coordinate as the request for the existing central user-owned entry-surface
observation. After that observation has been ingested and bound to the
post-save hash, finish without replaying Toolset actions:

```powershell
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs geometry-finalize `
  --profile $profile --outDir $out `
  --entrySurfaceObservation "$out\entry-surface-observation.json"
```

This emits `binary-native-geometry-profile.json`, version
`aurora-toolset-binary-native-geometry-profile/v1`. It binds the post-save MOD
hash, ordered HAK hashes, Area resref/display name, entry evidence, exact GIT
fixture template/appearance/positions, accepted native Save state, and the
owned artifact directory. Validate it independently:

```powershell
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs validate-geometry `
  --profile $profile --outDir $out --geometryProfile "$out\binary-native-geometry-profile.json"
```

That immutable geometry profile is the input contract for a later exact
TScrollBox capture and AUR-S07 runtime profile. It does not itself claim a
viewport PNG, model visibility, Test Module result, or NWN runtime proof.
The stalled Wizard/Build Module session is never a source, destination, or
recovery target for this route.

### Preserving a failed v1 explicit-open packet before v2

The failed v1 Welcome/MRU packet is evidence and must not be deleted or
manually renamed. When the exact same binary profile and artifact directory
contain only the v1 `unexpected_module_window_loaded` failure (with no Area,
Save, queue, or geometry work), use this public archive-only transition:

```powershell
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs restart-failed-startup-admission-dry-run `
  --profile $profile --outDir $out
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs restart-failed-startup-admission `
  --profile $profile --outDir $out
```

The second command requires zero `nwtoolset.exe` and `nwmain.exe` processes.
It atomically moves the v1 manifest to `$out\restart-history`, writes the
hash-bound `$out\binary-native-geometry-restart.json`, and changes no UI,
INI/MRU setting, MOD, HAK, or process. It is one-use and cannot authorize a
generic reset, a different profile/module, or a failure after native work.
After it reports `binary_native_failed_startup_manifest_archived`, rerun the
ordinary `preflight`; this writes a new v2 manifest in the same `$out` without
losing the v1 evidence. `open` remains a separately authorized action.

### Preserving a failed v2 packet before v3

When the v1 archive record exists and the new v2 packet records the same
`unexpected_module_window_loaded` failure before any Area, Save, queue, or
geometry work, preserve both packets through this distinct one-use transition:

```powershell
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs restart-failed-v2-startup-admission-dry-run `
  --profile $profile --outDir $out
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs restart-failed-v2-startup-admission `
  --profile $profile --outDir $out
```

It requires the v1 restart record to bind the same profile and MOD hash, zero
Toolset/NWN processes, and writes `binary-native-geometry-restart-v3.json`.
It archives the v2 manifest only; it cannot reset another failure class or
authorize a live retry. A new ordinary `preflight` then creates the v3 packet.

### Preserving a failed v3 pre-start guard-write packet

`module_open_session_guard_write_failed` is a pre-start infrastructure failure
only when the failed packet proves that no Toolset, Area, Save, queue,
geometry, or post-save work occurred. It is not an alternate meaning of an
MRU failure, and the v1/v2 restart commands must continue to reject it.

Use the separate, one-use public transition only when the exact failed v3
packet, profile hash, MOD hash, and artifact directory are unchanged; there
are zero Toolset and NWN processes; and the canonical module-open guard is
readable, terminal/released, ownerless, and can be opened `r+` without writing
or changing its bytes:

```powershell
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs restart-failed-v3-guard-write-admission-dry-run `
  --profile $profile --outDir $out
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs restart-failed-v3-guard-write-admission `
  --profile $profile --outDir $out
```

The transition neither releases nor rewrites the shared guard. It atomically
archives only the immutable failed manifest, records its hash and the
unchanged guard hashes in
`binary-native-geometry-restart-v3-guard-write.json`, and permits a later
separately authorized same-outDir `preflight`. If the non-mutating `r+` probe
still fails, it reports the host-level guard blocker; it must not delete,
rename manually, retry `open`, create another artifact directory, or bypass
the guard.

## Boundaries

- The profile is a central contract, not a Meshy-specific adapter.
- A passing binary preflight is insufficient for geometry, Toolset visual, or
  NWN runtime acceptance.
- The route never overwrites a caller-owned MOD and does not emit native UI
messages.

The consumer-CWD integration regression is parameterized so it never embeds a
project path in the shared standard:

```powershell
$env:AURORA_BINARY_BOOTSTRAP_INTEGRATION_PROFILE = '<caller-profile.json>'
$env:AURORA_BINARY_BOOTSTRAP_INTEGRATION_CWD = '<consumer-project-root>'
node backend/scripts/test-validate-aurora-toolset-binary-module-bootstrap-consumer-cwd.mjs
```
# Isolated hidden pre-Area continuation, 2026-09-07

Version `aurora-hidden-pre-area-continuation/v1` is implemented in the isolated
`codex/native-hidden-pre-area-20260907` checkout. It is not deployed or live
qualified by the offline tests. It applies only to a successful explicit Open
followed by the Area queue's exact pre-dispatch `No visible Toolset module window`
failure, with a hidden clean TfrmFrame and sole visible iconic TApplication.

Public commands (absolute paths; use the actual still-owned run):

```text
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs continue-pre-area-hidden-frame-dry-run --profile <profile.json> --outDir <geometry-dir> --failure <failed-observe.json> --windows <recorded-windows.json>
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs continue-pre-area-hidden-frame --profile <profile.json> --outDir <geometry-dir> --failure <failed-observe.json> --windows <recorded-windows.json>
node backend/scripts/aurora-toolset-binary-module-native-geometry.mjs geometry-observe --profile <profile.json> --outDir <geometry-dir>
```

The dry-run is read-only. Its optional `--stateFixture` accepts only
`aurora-hidden-pre-area-test-state/v1`; that result explicitly cannot admit live
actions. Live commands reject this option. Before restore and Area dispatch,
check the same PID, full seven-digit StartTime, frame/application HWNDs, clean
module title, no modal, no existing Area and zero NWN. Use the existing
SW_SHOWNOACTIVATE/SetWindowPos atom and require full non-primary DISPLAY1 bounds.
No new process, Open, transport, or `$pid` workaround is introduced.

`hidden-pre-area-v1/` reserves one attempt and preserves exact original evidence
bytes, source/producer hashes, intent and before/after state. An incomplete
directory, failed/partial restore or consumed Area intent refuses retry. The
resumed Area queue writes in that subdirectory; the historical queue failure is
preserved. Save/readback success may advance the root manifest with references
to its original failure. This route does not repair or bypass downstream Save
or S07 admission. A closed historical owner is never reusable.
