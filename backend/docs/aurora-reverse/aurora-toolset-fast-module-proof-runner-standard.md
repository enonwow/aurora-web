# Aurora Toolset fast module proof runner

Status: M6-only atomic route with validated target viewport capture  
Runner version: `1.0.0`  
Hard limit: `240000 ms`

The runner follows the skill precedence and registration policy from
[`aurora-toolset-operating-standard.md`](aurora-toolset-operating-standard.md).
In particular, generic Windows or desktop-automation skills may not weaken the
no-global-input rule.

## Purpose

This runner standardizes the M6-only short Toolset route used to create a
disposable module and Area, attach one exact HAK, place one creature, select
one exact Appearance, save, and collect observational evidence. It is not a
generic proof profile. Four minutes is a hard failure boundary, not an expected
duration. A healthy run should normally finish in two to four minutes; no stage
may spend that budget discovering controls.

Canonical entry point:

```powershell
node backend/scripts/run-aurora-toolset-module-proof.mjs `
  --live true `
  --module codex_runner_001 `
  --area proof_area `
  --hak m2a_codex_aproof `
  --appearance M2A_M6_PROOF
```

The default invocation is a dry run. Live UI mutation requires the explicit
`--live true` switch.

## Fixed M6 proof profile only

- tileset: `MicroSet`;
- size: `Tiny`;
- HAK resref: `m2a_codex_aproof`;
- HAK file:
  `C:\Users\enonw\Documents\Neverwinter Nights\hak\m2a_codex_aproof.hak`;
- creature: `Dwarf Mercenary`;
- Appearance: `M2A_M6_PROOF`.

The HAK is selected by exact native text. The Appearance is selected by exact
native text. Remembered list indexes are forbidden.

The CLI accepting another `--hak`, `--appearance`, module, or Area value does
not authorize that value as an execution route. M0, ordered multi-HAK,
multiple-fixture, exact-existing-module, and runtime proof require a dedicated
versioned central profile with a complete manifest before live work.

## State machine and deadlines

| Stage | Cumulative deadline | Required readback |
| --- | ---: | --- |
| preflight | 5 s | zero `nwtoolset` processes; Toolset and HAK files exist |
| module-and-area | 45 s | Welcome, Module Wizard and Area Wizard closed; exact module frame |
| initial-save | 65 s | exact `.mod` title and non-empty wizard-created file |
| hak | 105 s | exact HAK in active HAK list; rebuild warning handled; frame restored |
| creature | 145 s | exact palette leaf; placement completed; Select Objects restored |
| appearance | 180 s | one Creature Properties dialog; exact Appearance readback; screenshot |
| save-and-readback | 215 s | dirty marker cleared and file timestamp/hash changed |
| visual-proof | 235 s | validated `TScrollBox` PNG and Appearance PNG |
| hard stop | 240 s | runner exits failed; it does not continue discovery |

## Safety invariants

1. No global cursor, keyboard, mouse, `SendKeys`, or focus stealing.
2. Modal-opening menu commands use asynchronous `PostMessage`.
3. Bounded synchronous reads use `SendMessageTimeout`; synchronous `WM_CHAR` is
   forbidden.
4. HWNDs are resolved again after every wizard page, modal, HAK rebuild, palette
   change, and property commit.
5. Every mutation has an immediate native readback.
6. Exactly one Toolset process is required. A pre-existing session is never
   adopted by a fresh-module run.
7. Unexpected recovery, access-violation, loading, focus, or error modals stop
   the stage. The runner never creates a second Toolset instance to work around
   them.
8. A responsive Toolset process is not killed automatically after failure.
9. An existing destination `.mod` is never overwritten.
10. A rainbow placeholder is a failed visual proof, even when the saved fields
    or command transports report success.

## Atomic components

- `create-aurora-toolset-module-and-area-no-global-input.mjs`
  owns only Welcome, Module Wizard, and Area Wizard.
- `attach-aurora-toolset-module-hak-no-global-input.mjs`
  binds the verified owner-drawn `Edit -> Module Properties` route, reaches the
  exact `Custom Content` tab with visible-tab readback, and validates the exact
  HAK list. It must not search `GetMenuString` or guess a command ID.
- `inspect-aurora-toolset-palette-no-global-input.mjs`
  selects and places the exact palette creature.
- `select-aurora-toolset-dialog-combo-item-timeout-validated.mjs`
  selects exact Appearance text.
- `commit-aurora-toolset-creature-properties-no-global-input.mjs`
  atomically commits Creature Properties and handles only the known feat warning.
- `save-aurora-toolset-module-no-global-input.mjs`
  validates the dirty-to-saved transition and file mutation.

Each atom can fail independently with its last known native state. A new timed
proof is allowed only after the changed atom passes its own syntax/contract test
and a controlled live test.

## Acceptance commands

Offline contract:

```powershell
node backend/scripts/test-aurora-toolset-module-proof-runner-contract.mjs
node backend/scripts/test-run-aurora-toolset-module-proof-dry-run.mjs
node --check backend/scripts/create-aurora-toolset-module-and-area-no-global-input.mjs
node --check backend/scripts/attach-aurora-toolset-module-hak-no-global-input.mjs
node --check backend/scripts/commit-aurora-toolset-creature-properties-no-global-input.mjs
node --check backend/scripts/run-aurora-toolset-module-proof.mjs
```

Atomic module/Area live test:

```powershell
node backend/scripts/create-aurora-toolset-module-and-area-no-global-input.mjs `
  --module codex_atom_001 `
  --area proof_area `
  --tileset MicroSet `
  --size Tiny `
  --deadlineMs 45000 `
  --out .codex-tmp\aurora-runner\codex_atom_001-module-area.json
```

The full live route uses the target viewport atom, not the retired full-frame
helper. An accepted Area proof requires a capture of the freshly validated
`TScrollBox`, with no window z-order manipulation, plus the profile-specific
manifest.

## Current live-test note

On 2026-07-17 the first atomic launch attempt stopped at preflight after `303 ms`
because one responsive Toolset process already existed with
`m2a_codex_aproof.mod`, a visible `Error` modal, and `Loading Area`. The runner
did not click the modal, kill the process, or launch a second instance. This is
the required fail-closed behavior; the atomic live verification must be repeated
after that independent session is cleanly closed.
