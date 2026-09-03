# Dynamic effective-catalog Waypoint UTW construction audit v1

Date: 2026-09-01  
Status: offline implementation verified; live release proof pending  
Scope: construct one new Area Waypoint from any currently effective, exact,
admitted `UTW ` blueprint rather than the single retained `nw_waypoint001`
profile

## Authority and licensing boundary

The primary authority is the frozen Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The matching functions index has SHA-256
`394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`.
No xoreos or other GPL source was inspected or used.

## Confirmed native UTW-to-instance mapping

The common Waypoint reader `FUN_00658170`, decompiled lines
`346780..347154`, reads `TemplateResRef`, `Tag`, `LocalizedName`,
`Description`, optional `Appearance` with default `1`, `LinkedTo`,
`HasMapNote`, optional `MapNote` with an empty localized-string default,
optional `MapNoteEnabled` with default `1`, and `VarTable` through
`FUN_005e966c`.

The reciprocal common writer `FUN_00658b4c`, lines `347158..347314`, emits
the common fields in this canonical order: `Appearance`, `LinkedTo`,
`TemplateResRef`, `Tag`, `LocalizedName`, `Description`, `HasMapNote`,
`MapNote`, `MapNoteEnabled`, then the canonical variable writer
`FUN_005e9f50`. The variable writer omits an empty table and otherwise emits
ordered type-`0` entries with `Name`, `Type`, and the type-specific `Value`.

Placed-Waypoint writer `FUN_00659bfc`, lines `347723..347810`, calls the
common writer, then emits `XPosition`, `YPosition`, `ZPosition`,
`XOrientation`, and `YOrientation`; its paired GIC member contains the palette
`Comment`. The recovered orientation convention is
`XOrientation=cos(bearing)` and `YOrientation=-sin(bearing)`. `PaletteID` is
not copied into GIT.

## Frozen additive contract

The binary-free profile is `effective-catalog-utw-waypoint-copy-v1`. The
client may retain only:

```text
sourceKind=waypoint
sourceProfileId=effective-catalog-utw-waypoint-copy-v1
templateId
templateResRef
sourceObjectKey
sourceSizeBytes
sourceEtag = lowercase SHA-256
sourceFileType="UTW "
sourceFileVersion="V3.2"
sourceStructTypeId=0xffffffff
```

The template identifier is bounded to 80 ASCII identifier characters, the
source key to 2,048 non-NUL UTF-16 code units, and the source payload to 1 MiB.
`resRef` must equal the exact lowercase native `TemplateResRef`; `tag` must
equal the exact native non-NUL `Tag`. Finite scene coordinates and bearing use
the existing Area Update domains.

Compilation re-resolves `(kind=waypoint, templateId, sourceObjectKey,
sourceSha256)` from the current effective catalog and verifies byte length,
digest, `UTW `/`V3.2`/root identity, exact native identity fields, supported
root field cardinality/types, and canonical `VarTable`. Preview-only,
synthetic, stale, malformed, duplicate-field, unknown-root-field, or
non-canonical sources fail closed. Waypoints have no blueprint dependency
closure in this profile.

The writer emits all common fields in recovered canonical order, materializes
the native defaults for absent optional fields, copies an admitted non-empty
`VarTable` and omits an empty/absent one, excludes `PaletteID` and `Comment`
from GIT, adds float32 origin coordinates multiplied by ten, and writes the
recovered float32 orientation pair. The paired type-`5` GIC entry contains the
admitted blueprint `Comment`, defaulting to an empty string only when that
optional palette field is absent. The client cannot supply bytes, native
orientation components, GIC comment, or dependency data.

The existing 1,024-addition and 100,000-object budgets, complete candidate and
persisted readback, revision fence, atomic ARE/GIT/GIC/IFO publication,
rollback, and privacy-safe diagnostics remain unchanged.

## Implementation closure

Implementation checkpoint `208` and capability revision `2026-09-01.140`
close the offline arbitrary/current-effective Waypoint construction slice.
The backend effective catalog now indexes `utw` winners and exposes bounded
list/preview queries. Compilation re-resolves the current winner and validates
its exact source key, byte length, digest, GFF identity, native ResRef/Tag, and
empty dependency boundary before the admitted bytes reach the generic paired
object writer.

The projector preserves arbitrary finite bearing, while the writer emits the
recovered common-field order, canonical optional `VarTable`, float32 native
origin and orientation, and the paired type-`5` GIC comment. Candidate and
persisted readback precede revision-fenced atomic publication. The frontend
uses a dedicated port and strict binary-free mapper, paginates and caches the
catalog under the existing bounded workspace pattern, and preserves detached
source provenance through drag-source cloning and local-draft save/reopen.

Accepted resource-bounded gates are `11/11` construction assertions,
`633/633` projector assertions, `175/175` candidate-compiler assertions,
`67/67` module-snapshot catalog assertions, `13/13` capability assertions,
`80/80` Area Update atomic-publication assertions, `2/2` focused backend
application/controller assertions, and `37/37` focused frontend assertions,
plus both production builds. Two unrelated dirty-tree expectations remain in
the complete backend application/controller files: the health test pins an
older VFX runtime revision and the ASCII emitter test omits the now-produced
`sourceModelHash`; neither failing assertion exercises the Waypoint lane.

No Docker command, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## Acceptance boundary

Offline acceptance requires catalog indexing/listing, negative domain tests,
effective-catalog resolver tests, draft projection, current-winner
compilation, writer/readback, transactional publication, frontend catalog
mapping, drag/drop/local-draft round trip, regression coverage, and both
production builds. Fresh guarded browser Save/reopen and exact-candidate
Toolset Save/Build/reopen plus NWN spawning remain mandatory release proof.
This audit does not by itself promote Waypoint authoring or the Area program
to complete.
