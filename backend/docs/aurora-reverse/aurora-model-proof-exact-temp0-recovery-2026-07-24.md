# Exact `temp0` Recovery for Candidate-Bound Model Proof

Date: 2026-07-24

Status: implemented central operator transition; offline contract tests pass;
live r32 proof pending at the time of this record.

## Scope

This decision covers the cold preparation of one immutable Aurora model-proof
candidate when native Toolset state already contains
`Documents\Neverwinter Nights\modules\temp0`. It does not authorize general
Toolset recovery, cache cleanup, model authoring, Save, Build, repack, INI/MRU
mutation, global input, or a new model iteration.

## Blocker and exact evidence

The existing public model-proof preparation previously rejected every
pre-existing `temp0`, even when the cache was the only native continuation path
for the exact approved MOD. The r32 audit compared the installed
`m2a_m0r32.mod` against the current cache using the central ERF parser. The MOD
and profile source SHA-256 are:

`a952e05746710c8461e74b38dbf93e6cc5c86314771330d68724579c11693573`

The cache contained exactly six regular files and no extras. Each file was
byte-identical to its corresponding MOD resource:

| Cache file | Resource type | SHA-256 |
| --- | ---: | --- |
| `m2a_m0a32.are` | 2012 | `9baa35c615dc7f51ec0e102a2e9aaeb7f8405ac65ea0caad81bf64b82f84eb8e` |
| `module.ifo` | 2014 | `c2464ffef9f4f241b823b25691350544f85f131c64c9e8ec91a19de58104c608` |
| `m2a_m0a32.git` | 2023 | `71f2e9947a2e5188da57df46bf8b386beaf47175d5f8c9b8171aa065cb15af05` |
| `nw_dwarfmerc001.utc` | 2027 | `8620162184737f26aaf9342feaa02ef7b986445031572592954300cab102658d` |
| `repute.fac` | 2038 | `558f11b6f97ef110b45f45e71982eb42a2ed8cb8b1555025cddc1f9ec73266a4` |
| `m2a_m0a32.gic` | 2046 | `1c75f9dec1ed95a7dabd39bafbbf88e01f427263cd74a14c1bb9da0d98963966` |

## Decision

The public binary-bootstrap route now owns a separate
`aurora-toolset-verified-temp0-recovery-admission/v1`. It is issued only when:

1. the installed MOD equals the profile-pinned source hash;
2. every supported MOD resource maps to one unique expected cache filename;
3. the cache file set exactly equals that expected set;
4. every cache entry is a regular non-reparse file;
5. every cache file length and SHA-256 equal its MOD resource.

The admission is persisted in the native-geometry manifest and revalidated
immediately before the live action. The opener recognizes only the exact known
Aurora recovery text and unique `Yes`/`Tak` and `No`/`Nie` controls. It may send
one targeted `BM_CLICK` to non-destructive `Yes`/`Tak`, then records
`moduleLoadOwner=verified_temp0_recovery` and requires the exact clean requested
module frame.

This uses the already established Aurora recovery-prompt precedent; it does not
infer a new UI meaning. The new work is the exact candidate/cache identity gate
that makes the existing non-destructive action safe for this public route.

## Fail-closed boundaries

The route rejects any source/hash drift, unsupported resource, duplicate cache
mapping, missing or extra entry, byte mismatch, non-file or reparse entry,
unknown or repeated modal, dirty/wrong frame, or admission mutation. It never:

- archives, deletes, renames, rewrites, or repurposes `temp0`;
- edits `nwtoolset.ini` or MRU state;
- uses global keyboard/mouse input;
- sends `File > Open` after recovery;
- treats a preparation failure as model invisibility or permission for r33.

Rollback is code-only: revert the recovery helper, its binary/preparation
integration, route-manifest entries, tests, and this documentation. Native
Toolset cache and user configuration require no rollback because this
transition does not mutate them.

## Contract evidence

The following central tests pass:

```powershell
node backend/scripts/test-aurora-toolset-verified-temp0-recovery-contract.mjs
node backend/scripts/test-prepare-aurora-model-proof-120s-contract.mjs
node backend/scripts/test-aurora-toolset-binary-module-native-geometry-contract.mjs
node backend/scripts/test-toolset-explicit-open-startup-admission-integration.mjs
node backend/scripts/test-aurora-model-proof-120s-contract.mjs
```

The exact recovery test covers acceptance of an exact synthetic MOD/cache and
rejection of admission mutation, changed resource bytes, an extra file, a
missing file, and a non-file cache entry. It also enforces the public
preparation/binary/opener integration, parses the complete generated
PowerShell transition with the PowerShell AST parser, and enforces the
no-global-input boundary.

The first public r32 preparation attempt stopped before launching Toolset
because that parser gate was not yet present and the generated script contained
one mismatched array terminator. The durable failed preparation packet records
`startsToolset=false`. The terminator was corrected in the public opener and
the AST parser check was added to the central contract before any live retry.

A later attempt reached the exact recovery modal but failed before submitting
the action because PowerShell selected the `char,char` `String.Replace`
overload for an empty replacement. The handler now selects the `string,string`
overload explicitly. The public preparation route also owns a narrowly bound
same-PID continuation:
`continue-verified-temp0-recovery-dry-run` followed by
`continue-verified-temp0-recovery`. It requires the original zero-process
plan, failed binary manifest, exact MOD/cache admission, exact PID/start time,
unchanged blank frame and `Confirmation` hwnd, one responsive Toolset and zero
NWN processes. It revalidates all identities and calls the same public binary
route with exact-session adoption; it cannot launch a second Toolset.
Because repairing a profile-pinned route necessarily changes the model-proof
profile hash, the continuation preserves and records both the original plan
hash and current profile hash. It permits that tooling-maintenance difference
only while the profile path/id, binary profile hash, installed/source MOD,
ordered HAKs, target module/Area, failed cache admission, PID/start time and
window identities remain exact.

Live certification remains separate from these offline contracts. It must use
the public preparation transition on the immutable r32 candidate, followed by
the candidate-bound Toolset and NWN proof workflow.
## Live result: targeted recovery action did not settle

The exact r32 same-PID continuation passed its read-only attempt-2 admission
on Toolset PID `31700`. The public binary route revalidated the byte-identical
MOD-to-`temp0` mapping, matched the exact English recovery message, resolved
one `&Tak` and one `&Nie`, and submitted exactly one targeted
`PostMessage(BM_CLICK)` to the non-destructive affirmative button.

The same `Confirmation` hwnd `68414` and button hwnd `68416` remained visible
after the bounded five-second readback. The route emitted
`toolset_verified_temp0_recovery_prompt_did_not_close` and performed no retry,
global input, Save, Build, INI/MRU change, cache mutation, second Toolset
start, or NWN start. This is a public transition failure, not a visual model
failure and not admission for another model iteration.

## One-use client-button continuation

The durable non-settle result is not treated as evidence that the queued
`BM_CLICK` executed, and it is not a reason to request a manual click. The
public preparation route has one separate, one-use continuation:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-verified-temp0-recovery-client-click-dry-run --profile <profile> --prepOutDir <same-prep-dir>
node backend/scripts/prepare-aurora-model-proof-120s.mjs continue-verified-temp0-recovery-client-click --profile <profile> --prepOutDir <same-prep-dir>
```

It admits only the exact failed child packet above, an unchanged responsive
process/start time, blank frame and `Confirmation` HWND, the unique stored and
freshly revalidated affirmative button HWND, and the same byte-identical
`temp0` admission. It then posts one local client `WM_LBUTTONDOWN/UP` pair to
that native `TButton`, waits up to five seconds for the exact modal to vanish,
and resumes the existing public opener with
`verifiedTemp0RecoveryActionAlreadySubmitted=true`. It never sends a second
`BM_CLICK`, does not start a process, save/build, mutate cache/INI/MRU, or use
global input. A modal that still remains receives a durable terminal blocker;
there is no third transport or manual-user fallback.
