# Area waypoint construction audit v1

Date: 2026-08-13  
Status: verified implementation authority for the exact base-UTW profile below  
Scope: construct a new `WaypointList`/GIC pair from the immutable
`nw_waypoint001.utw` blueprint and a scene position/yaw

## Decision

Aurora Web may construct a new Area waypoint only when the retained draft
identifies the following immutable source profile:

- profile: `nwn-base-key-utw-v1`;
- resource: `nw_waypoint001`, type `2058` (`UTW`);
- GFF identity: `UTW ` / `V3.2`, root struct type `0xffffffff`;
- source SHA-256:
  `13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a`.

The server resolves those bytes from the configured vanilla
`nwn_base.key`/BIF source and recomputes the digest. Draft bytes, host paths,
unverified HAK/module/custom overrides, and arbitrary waypoint ResRefs are not
accepted by this profile.

## Immutable evidence

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The waypoint blueprint-to-instance lineage is explicit in that source:

- `FUN_00651388` opens the waypoint blueprint GFF, delegates the common
  waypoint fields to `FUN_00658170`, and then reads blueprint-only `PaletteID`
  and `Comment`;
- `FUN_00658170` reads `TemplateResRef`, `Tag`, `LocalizedName`,
  `Description`, `Appearance`, `LinkedTo`, `HasMapNote`, `MapNote`, and
  `MapNoteEnabled`; it supplies native defaults of `1`, `0`, an empty
  localized string, and `1` for the optional fields missing from the source;
- `FUN_00658b4c` writes those common fields to the waypoint instance and does
  not write blueprint-only `PaletteID` or `Comment` to GIT;
- `FUN_00659bfc` writes `XPosition`, `YPosition`, `ZPosition`,
  `XOrientation`, and `YOrientation` to the GIT instance and writes `Comment`
  to the paired GIC entry.

A read-only KEY/BIF extraction on 2026-08-13 used
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key`.
The exact `nw_waypoint001` type-2058 payload was 1004 bytes and had the SHA-256
frozen above. Its root contains:

- `Comment`: the stock patrol-path explanation;
- `Description`: empty localized string with string reference `0xffffffff`;
- `LinkedTo`: empty string;
- `TemplateResRef`: `nw_waypoint001`;
- `LocalizedName`: string reference `14817` with no embedded entries;
- `Tag`: `NW_WAYPOINT001`;
- `HasMapNote`: byte `0`;
- `PaletteID`: byte `5`.

It omits `Appearance`, `MapNote`, and `MapNoteEnabled`; the defaults above are
therefore observable in the decompiled Aurora loader rather than guessed.

The accepted live Toolset placement proof is retained under
`backend/docs/aurora-reverse/evidence/palette-placement-corrected-live-2026-07-14/`.
It placed and saved `nw_waypoint001`, changed the waypoint count from zero to
one, and independently read back native position
`(33.116241455078125, 47.747222900390625, 3.5019426345825195)`.

The packed proof module
`C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_npc_item_live_20260713.mod`
has SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its `demo.git` waypoint is struct type `5` and carries the blueprint-derived
fields plus the five transform floats. The paired `demo.gic` struct type `5`
contains the blueprint `Comment` and no inferred runtime payload.

No xoreos source or other GPL implementation was used.

## Frozen mapping

The new GIT `WaypointList` entry has struct type `5` and exactly the following
profile-derived fields:

```text
Appearance      = byte(1)
LinkedTo        = blueprint LinkedTo
TemplateResRef  = blueprint TemplateResRef
Tag             = blueprint Tag
LocalizedName   = blueprint LocalizedName
Description     = blueprint Description
HasMapNote      = blueprint HasMapNote
MapNote         = empty localized string, strRef 0xffffffff
MapNoteEnabled  = byte(1)
XPosition       = float32(scene.x * 10)
YPosition       = float32(scene.y * 10)
ZPosition       = float32(scene.z * 10)
XOrientation    = float32(cos(scene.bearing))
YOrientation    = float32(-sin(scene.bearing))
```

The paired GIC `WaypointList` entry also has struct type `5` and contains
`Comment` copied from the exact blueprint. `PaletteID` is blueprint/editor
metadata and is not written to either instance entry.

Both entries are appended in retained scene order after surviving source
entries. All pre-existing source ordinals continue to govern deletion and
transform planning before additions are appended.

## Validation and diagnostics

The construction boundary fails closed when source profile, ResRef, digest,
GFF identity, root type, blueprint field type/cardinality, scene identity, or
finite transform validation differs. It also rejects duplicate local object
IDs and more than 1024 additions in one Area Update.

Independent readback verifies the nine-family GIT/GIC cardinalities, the exact
new waypoint fields, the paired comment, source/candidate hashes, and additive
receipt counts. Diagnostics contain bounded family counts, object ordinals,
profile ID, and hashes; they never expose source bytes or host filesystem
paths.

## Non-admission and exit criteria

This audit does not admit waypoint property overrides, map-note authoring,
variables, scripts, transition edits, HAK/module/custom blueprint precedence,
or construction of any other object family. Each requires its own Aurora-first
evidence and additive profile.

Unit, integration, round-trip, determinism, atomic-publication, persisted
readback, and regression gates are required. Mutation testing is optional and
requires an explicit user request. Product-level
completion still requires fresh Toolset Save/Build/reopen and NWN runtime proof
for the exact committed candidate.

## Implementation and verification checkpoint

The bounded exact-base-UTW construction slice is implemented across the
backend compiler boundary and frontend draft provenance:

- the frontend factory emits explicit `aurora_blueprint` provenance for new
  waypoints and preserves it in local drafts;
- the draft projector admits only the frozen profile and rejects identity,
  property, family, budget, duplicate-ID, and transform drift;
- the production source adapter reads type `2058` from configured
  `nwn_base.key`, recomputes the digest, and returns defensive bytes behind an
  application port;
- the paired GIT/GIC writer appends native type-`5` structs and verifies exact
  parse/serialize/readback results;
- the Update compiler resolves the blueprint and reports bounded addition
  counts and provenance;
- the read-only Update validation endpoint now invokes that same full compiler
  for ARE/GIT/GIC plus preserved IFO. It cannot issue a successful preflight
  receipt while waypoint blueprint or companion compilation would fail.

A production-adapter readback on 2026-08-13 returned profile
`nwn-base-key-utw-v1`, template `nw_waypoint001`, 1004 bytes, and the frozen
SHA-256. The binary-free evidence record is
`evidence/area-waypoint-construction-2026-08-13/base-utw-production-adapter-readback.json`.

Automated evidence after the final preflight correction:

- backend build: passed;
- focused waypoint/preflight integration set: 6 suites, 268 tests passed;
- all Area Update suites: 14 suites, 200 tests passed;
- frontend waypoint factory/profile/draft set: 3 files, 27 tests passed;
- frontend production build: passed;
- backend waypoint mutation scope: 305 killed, 11 survived, 2 no coverage,
  156 intentionally ignored diagnostic string/regex mutants; 95.91% total and
  96.52% covered score. Report SHA-256:
  `65f584beab6193a263359b23d3ce871d82e44e6f65f29a563ef9ee4b5a0eebe6`;
- backend full-compiler validation preflight: 167/167 non-string mutants
  killed, 100%. Report SHA-256:
  `582ead033900f3cd444fe2bb4b4af629c0fcf127454bad6423f6677e73c1ff4a`;
- frontend profile mutation scope: 8/8 mutants killed, 100%. Report SHA-256:
  `0c8e11940efd76565af4a39ffe5ec64ac9067a3e39161896069abc294419afd1`.

The older broad validation mutation profile was also measured and remains a
program-level quality debt: 454 killed, 7 timed out, 253 survived, and 47 had
no coverage (60.58%). Its report SHA-256 is
`9f3f6d6c3680de488b739337432bafc9d7d0a5b7de03406b83a1d415fee8dfa9`.
This does not weaken the 100% focused preflight result. The historical global
mutation score remains informational and is not a completion gate.

This checkpoint verifies implementation, deterministic binary materialization,
and preflight behavior only. It deliberately does not claim fresh product-level
Toolset Save/Build/reopen or NWN runtime certification; those remain mandatory
at the final candidate boundary.
