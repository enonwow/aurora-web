# Area creation application audit - 2026-08-06

## Executive verdict

**Release verdict: NO-GO for persisting a newly authored Area into a module.**

Aurora Web now has a substantial local Area-authoring workflow: a user can
choose a tileset and dimensions, create a complete grid, place terrain and SET
groups, edit or erase cells, rotate and resize the grid, verify topology, export
an ARE, and transactionally add an ARE/GIT/GIC triplet plus a `Mod_Area_list`
entry to the editable module snapshot. The focused implementation tests pass,
the storage transaction has collision, readback, and rollback controls, and
previous local browser packets prove several editing operations.

The persistence claim is nevertheless unsafe. A brand-new ARE produced by the
current writer has only six root fields while the repository's strict Area
profile requires 43. The empty GIT uses `ItemList` where the canonical
top-level ground-item list is `List`, and omits the native new-Area sound and
music defaults. The empty GIC has zero fields while the verified Toolset-created
GIC has nine. New tiles default all animation-loop bytes to zero, whereas the
verified native wizard profile writes all three as one. The application can
commit those artifacts and return HTTP 201 without any Toolset or NWN acceptance
proof.

The safe current product boundary is therefore:

- local Area editing: **verified as an application feature** for the focused
  operations and tests listed below;
- ARE export from a new draft: **experimental, not Aurora-native**;
- persistence of a new Area triplet: **failed release gate / quarantine
  required**;
- Aurora Toolset and NWN compatibility of app-generated files: **missing**.

This audit did not change application code, run a capture, launch Toolset, or
launch NWN.

## Audit identity and scope

- Repository: `C:\Projects\aurora-web`
- Branch: `codex/tile-matrix-resume-20260729`
- HEAD: `348e8ff0e27677b7c611c56afa4d706685b393f0`
- Effective tree at audit time: 218 modified and 559 untracked status entries
  (777 total)
- Audit date: 2026-08-06
- Primary feature scope: blank Area creation, Area grid editing, verification,
  ARE/GIT/GIC serialization, module registration, and tileset readiness
- Read-only task lineage reviewed:
  - `codex://threads/019f7c89-2412-7fa3-89fc-f309e3804842`
    (tileset work #3)
  - `codex://threads/019fae15-2213-73c3-ac4c-ee6ad70de021`
    (tileset work #4)
- Related broader audit:
  `docs/audits/application-audit-2026-08-06.md`

Evidence statuses in this report are limited to `verified`, `failed`, or
`missing`. A browser canvas proves only the local application state. It is not
native Aurora Toolset or NWN parity evidence.

## Current feature path

| Stage | Current implementation | Audit status |
| --- | --- | --- |
| Start | `New blank local Area`; ResRef, SET, width and height (2..32) | verified in source/tests |
| Edit | terrain, crossers, groups, replace, rotate, height, erase, grid rotate/resize, undo/redo | verified locally for selected operations; full Aurora parity missing |
| Verify | topology, SET fingerprint, tile/group legality, model resolution stats | verified, but not a native GFF validator |
| Serialize ARE | new six-field root plus complete `Tile_List`; source-backed edit preserves supported fields | verified implementation; failed strict new-Area profile |
| Serialize GIT/GIC | minimal empty resources | verified implementation; failed/missing native profile |
| Register | patch `module.ifo` `Mod_Area_list` and preserve supported fields | verified in focused tests, including a real module IFO fixture |
| Persist | collision check, writes, byte-equality readback, rollback on failure | verified transaction mechanics; native acceptance missing |
| Toolset/NWN | reopen, Save, Build Module, packed readback, runtime load | missing |

The relevant entry points are:

- `frontend/src/modules/layout/components/AuroraAreaEditingPanel.tsx`
- `frontend/src/modules/areas/adapters/httpAreaEditingApi.ts`
- `frontend/src/modules/areas/adapters/httpAreaEditingExport.ts`
- `backend/src/modules/areas/adapters/inbound/http/area-editing.controller.ts`
- `backend/src/modules/areas/application/area-editing.application.service.ts`
- `backend/src/modules/areas/adapters/outbound/blob/aurora-gff-area-editing-writer.ts`
- `backend/src/modules/areas/adapters/outbound/blob/aurora-gff-module-ifo-area-writer.ts`

## Native differential baseline

The accepted AUR-S05-05 proof created a native Area through the retail Toolset
wizard on an isolated scratch module and then read the packed resources back.
It is the strongest available baseline for this feature:

| Property | Verified Toolset result |
| --- | --- |
| Route | `Wizards`, position 0, command 133, `TdlgAreaWizard` |
| Choices | `MicroSet` index 21, `Tiny` index 0 |
| Identity | ResRef `area002`, name `Area 001`, tag `Area001` |
| Grid | `tms01`, 2x2, four tiles |
| ARE | 2,377 bytes, 5 structs, 83 fields, 53 labels |
| Tile defaults | light bytes 0; `AnimLoop1/2/3` all 1 |
| GIT | 724 bytes, 2 structs, 19 fields, 19 labels, zero objects |
| GIT audio | ambient 31/31, volumes 32/32, environment 0, music 20/20/34, delay 90000 |
| GIC | 392 bytes, 1 struct, 9 fields, 9 labels |
| IFO | fourth Area entry present after Save |
| Cleanup | exact native delete and packed rollback verified |

Evidence:

- `backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-05-new-area/README.md`
- `backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-05-new-area/validation.json`
- `backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-05-new-area/area002-after-create-save/`

This is a native reference artifact, not proof of the Aurora Web writer.

## Findings

### AREA-APP-P0-01 - the persistence route commits a file set that fails the repository's strict Area profile

Status: **failed**.

For a new draft, `serializeAreaEditingDraftToAreGff()` emits these six root
fields only: `Name`, `Tag`, `Width`, `Height`, `Tileset`, and `Tile_List`.
`backend/docs/aurora-reverse/are-git-validation-spec-r63.md` requires 43 ARE
root fields and classifies every non-script omission as
`ARE_REQUIRED_FIELD_MISSING`. The current new writer omits, among others,
`ResRef`, version/identity fields, weather, lighting, rest/PvP settings, script
hooks, expansion data, and border state.

`verifyArea()` and `exportAre()` validate topology and SET consistency. They do
not execute this strict resource profile. `persistNewArea()` then writes the
minimal ARE, GIT and GIC, verifies that storage returned identical bytes, and
can report creation success. Byte equality proves storage integrity, not Aurora
validity.

Impact: a user-facing successful persistence can create module resources that
the project's own strict validator would reject and that have no native
consumer proof.

Required action: feature-flag or disable `POST /areas/editing/persist/new-area`
outside a development profile until an independent strict validator and native
acceptance packet both pass.

### AREA-APP-P1-02 - new tile defaults differ from the verified Toolset wizard

Status: **failed** for the only verified native profile.

For newly authored cells, `appendByte()` uses zero when a light or animation
byte is unset. The focused writer test explicitly expects
`Tile_AnimLoop1/2/3 = 0`. The verified `MicroSet/Tiny` wizard artifact has all
four tiles at `Tile_AnimLoop1/2/3 = 1`; only the four light bytes are zero.

This is a real semantic differential, not merely a missing field. The one
native fixture does not prove that every tileset and size uses the same defaults,
so the correct remedy is a versioned, wizard-derived creation profile rather
than an undocumented global guess.

### AREA-APP-P1-03 - the empty GIT has the wrong ground-item label and omits native defaults

Status: **failed**.

The empty GIT writer emits nine empty lists and `AreaProperties`, but names the
ground-item list `ItemList`. The strict GIT profile requires top-level `List`.
`ItemList` is valid vocabulary in other GFF contexts (for example inventories),
but it is not the canonical top-level placed-item list for this Area GIT
contract.

The verified Toolset-created empty GIT also contains 19 fields including the
ambient and music defaults listed above. The current app GIT contains no such
defaults. Its own unit test validates only the app's generated label set and
therefore locks in the mismatch.

### AREA-APP-P1-04 - the empty GIC profile is absent

Status: **missing**.

`serializeEmptyAreaGic()` creates a GIC with zero root fields. The native
wizard-created GIC has one struct with nine fields and nine labels. The current
evidence does not yet identify and classify all nine fields, so this audit does
not guess their meanings or claim that every omission is fatal. It does prove
that the app output is not the verified native creation profile.

### AREA-APP-P1-05 - no app-generated candidate has passed a native acceptance route

Status: **missing**.

There is no evidence packet showing this sequence for bytes emitted by Aurora
Web:

1. add the exact candidate ARE/GIT/GIC and IFO entry to an isolated module;
2. open the Area in retail Toolset;
3. Save and Build Module without unexpected modal, exception, or data loss;
4. read back the packed resources and compare their structure;
5. load the Area in NWN and record settled runtime evidence.

AUR-S05-05 proves Toolset's own wizard, not this candidate. The local CUD and
matrix canvases prove the web renderer, not native parsing.

### AREA-APP-P1-06 - tileset coverage is far below a release-complete Area claim

Status: **missing**.

The current immutable matrix describes 99 tilesets and 53,700 definitions. Its
read-only status at audit time reports:

- accepted add/render rows: 618 of 53,136 (1.163%);
- accepted group rows: 618 of 9,114 (6.781%);
- completed packets: 87 of 3,890 (2.237%);
- PathNode reference evaluated: 43,653 of 52,767 candidate rows;
- native PathConnect accepted: 0 of 52,767.

The 618 accepted rows are useful local visual evidence. They cannot support a
claim that every selectable tile can be placed, connected, traversed, saved,
and reopened by Aurora. PathNode symbols derived from the documented
reference corpus remain reference-only and cannot be promoted to native
connectivity.

Source: `output/proof/tile-add-connect-matrix-v2-path-node-aware-v2`.

### AREA-APP-P1-07 - the matrix control plane reports a resumable plan over a stale interrupted capture

Status: **failed**.

The checkpoint correctly remains at packet 87 with next chunk
`mst04-group-chunk-0002`. No matching Node/Chrome capture process exists, but
`heartbeat.json` still says `phase: capturing`, last updated
`2026-07-29T22:38:04.211Z`, and the capture directory retains a Chrome profile,
lifecycle log, and progress frame for that chunk. The read-only status command
nevertheless reports the plan ready and recommends `capture_next_chunk` rather
than an interrupted-capture recovery state.

Impact: the one-active-lease and crash-recovery semantics are ambiguous. A
future operator can mistake stale state for a clean continuation or overwrite
diagnostic residue.

Required action: make status explicitly classify stale heartbeat plus partial
capture residue; require an auditable recover/reject decision before any next
capture starts.

### AREA-APP-P1-08 - expansion resize is an application extension, not Aurora parity

Status: **failed** as a parity claim; **verified** as a local complete-grid
operation.

The web editor exposes four-edge expansion and contraction. The serializer
creates a complete `Width * Height` tile list and refuses sparse source
provenance, which is a sound application-level safeguard.

Retail Toolset AUR-S05-06 is a verified negative route: expanding a native 2x2
Area to 4x4 preserved only four tile records, left 12 null cells, and subsequent
fill/Undo caused access violations. The accepted native rule is to create an
Area at its final dimensions through the wizard and require
`Tile_List.length == Width * Height`.

The UI and documentation must label web resize as a project extension. It must
not be presented as a recovered Aurora authoring semantic until a controlled
differential profile proves it.

### AREA-APP-P2-09 - focused tests are strong on internal consistency but self-referential on native structure

Status: **failed** as a native acceptance gate.

Focused tests passed:

| Gate | Result |
| --- | --- |
| Backend Area schemas, writer, and service | 3 suites / 29 tests passed |
| Frontend Area API, export, domain, mapper, and canvas selection | 5 files / 74 tests passed |
| Matrix planner contract | passed |
| Matrix control contract | passed |

The persistence test calls the project's parser on the project's generated
bytes and expects `ItemList`; it does not compare the result with the native
AUR-S05-05 artifact or the strict 43-field/10-field profile. Parseability by a
shared local codec is necessary but not independent evidence.

During this audit the broader frontend unit invocation also reproduced the
known red baseline with 111 failing tests. The broader release state remains
documented in `docs/audits/application-audit-2026-08-06.md`.

### AREA-APP-P2-10 - the FE-BE contract does not define the new authoring transaction

Status: **missing**.

The mandatory FE-BE contract v1 contains the general Area read/draft/export
surface, but no versioned contract for `/areas/editing/verify`,
`/areas/editing/export/area.are`, or `/areas/editing/persist/new-area`. The
frontend and backend agree today through shared implementation assumptions,
not through the canonical cross-boundary contract required by project rules.

Required action: add a versioned Area-authoring contract covering the draft,
verification receipt, preservation fingerprints, exact mutation permission,
resource transaction result, diagnostics, and rollback semantics before the
route is enabled for release.

### AREA-APP-P1-11 - the checkout cannot identify a reviewable release candidate

Status: **failed**.

The audit ran at one HEAD but across 777 dirty status entries, including
uncommitted Area UI/backend code and matrix scripts. The focused green results
therefore describe this workstation state, not a reproducible commit. The
broader application test gates remain red.

## Assessment of the two predecessor tasks

### Tileset task #3

Verified contributions:

- fresh local packets for group placement, tile replacement, tile transform,
  and eraser behavior, including undo/redo;
- initial 99-tileset/53,700-definition matrix planning;
- fail-closed separation between documented PathNode references and native
  PathConnect;
- control scripts and diagnostics for bounded capture work.

Correct limitation: the task described its CUD packets as local application
proof, not Toolset/NWN parity.

### Tileset task #4

Verified contributions:

- v2 plan binding and safer exact resume commands;
- correction of the texture-count assumption;
- progress to 87 accepted packets / 618 add-render rows;
- an exact numbered MTR diffuse-family recovery rule;
- a durable thread audit and a controlled stop before
  `mst04-group-chunk-0002`.

Unclosed boundary: neither task established native PathConnect, a complete
tileset matrix, or Toolset/NWN acceptance of Aurora Web's newly serialized
Area resources. Those omissions were generally reported honestly; they remain
release blockers for Area creation.

## Required remediation order

1. Quarantine new-Area persistence behind a disabled-by-default feature flag;
   relabel new-draft ARE download as experimental.
2. Extract a versioned canonical creation profile from AUR-S05-05: all ARE
   defaults, exact `ResRef`/name/tag policy, tile defaults, top-level GIT
   `List`, native GIT sound/music defaults, the nine GIC fields, and IFO entry
   structure.
3. Make a strict independent validator run inside `persistNewArea()` before the
   first write. It must not use the serializer's own expected labels as its
   oracle.
4. Add golden differential tests against the immutable Toolset-created
   resource triplet and at least one additional controlled size/tileset
   profile. Do not generalize arbitrary 2..32 defaults from one 2x2 sample.
5. Run an app-generated candidate through isolated Toolset open, Save, Build,
   packed readback, and NWN runtime proof under the current safety contracts.
6. Keep resize explicitly project-local; retain the complete-grid invariant and
   reject every sparse source Area.
7. Restore crash-recovery truthfulness in the matrix status/heartbeat path.
8. Continue matrix coverage without promoting the reference PathNode corpus to
   PathConnect. Gate any "connected/traversable" claim on a native differential
   profile.
9. Add the authoring HTTP contract, clean the checkout, and require focused and
   broad green gates on one immutable revision.

## Acceptance criteria

New Area persistence may move from NO-GO only when all of the following are
`verified` on the same immutable candidate:

1. the emitted ARE passes the strict 43-field profile and exact tile
   cardinality;
2. the emitted GIT has canonical top-level lists and a declared native default
   profile;
3. the emitted GIC matches a documented native field profile;
4. `module.ifo` registration and transactional rollback pass independent
   readback;
5. Toolset opens, saves, and builds the exact app candidate without data loss;
6. the packed resource diff is classified field by field;
7. NWN loads the created Area in a settled runtime proof packet;
8. the claim states the tileset/size coverage actually proved and does not
   infer missing PathConnect semantics;
9. all proof hashes, binary identity, code revision, configuration, and capture
   provenance are bound in the packet.

