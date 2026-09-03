# Dynamic effective-catalog Encounter UTE construction audit v1

Date: 2026-09-01  
Status: offline implementation verified; live release proof pending  
Scope: construct one new Area Encounter from any currently effective, exact,
admitted `UTE ` blueprint rather than the single retained `x2_gnoll001` profile

## Authority and licensing boundary

The primary authority is the frozen Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The matching functions index has SHA-256
`394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`.
No xoreos or other GPL source was inspected or used.

## Confirmed native UTE-to-instance mapping

The common Encounter reader `FUN_0055d470`, decompiled lines
`215106..215230`, reads `TemplateResRef`, `Tag`, `LocalizedName`, `Active`,
`Difficulty`, `DifficultyIndex`, `Faction`, `MaxCreatures`, `PlayerOnly`,
`RecCreatures`, `Reset`, `ResetTime`, `Respawns`, `SpawnOption`, the five event
ResRefs, and `VarTable` by exact labels. `FUN_0055d8a8`, lines
`215235..215376`, then reads the ordered `CreatureList`.

The reciprocal common writer `FUN_0055dbf8`, lines `215380..215417`, emits
those fields in canonical writer order, calls the common variable writer, and
then calls `FUN_0055ddd0`. The variable writer `FUN_005e9f50`, lines
`284872..284937`, omits `VarTable` when the in-memory table is empty and
otherwise emits ordered type-`0` entries containing `Name`, `Type`, and the
type-specific `Value`. `FUN_0055ddd0`, lines `215421..215447`, emits ordered
type-`0` creature entries with exact `Appearance`, `CR`, `ResRef`, and
`SingleSpawn` fields.

Placed-Encounter reader `FUN_0055e1f8`, lines `215585..215786`, first invokes
the common template reader, then independently reads `XPosition`, `YPosition`,
`ZPosition`, type-`1` `Geometry`, type-`2` `SpawnPointList`, and the optional
same-index GIC `Comment`. Placed writer `FUN_0055e71c`, lines
`215809..215876`, performs the reciprocal operation. This proves that palette
`Comment` and `PaletteID` do not become common GIT fields, while the common UTE
state does. It also proves that origin, polygon, spawn points, and paired GIC
comment are instance-owned lanes rather than template-copy fields.

## Frozen additive contract

The new binary-free profile is
`effective-catalog-ute-encounter-copy-v1`. The client may retain only:

```text
sourceKind=encounter
sourceProfileId=effective-catalog-ute-encounter-copy-v1
templateId
templateResRef
sourceObjectKey
sourceSizeBytes
sourceEtag = lowercase SHA-256
sourceFileType="UTE "
sourceFileVersion="V3.2"
sourceStructTypeId=0xffffffff
```

The template identifier is bounded to 80 ASCII identifier characters, the
source key to 2,048 non-NUL UTF-16 code units, and the source payload to 1 MiB.
`resRef` must equal the exact lowercase native `TemplateResRef`; `tag` must
equal the exact native non-NUL `Tag`. Bearing remains exactly zero.

Compilation re-resolves `(kind=encounter, templateId, sourceObjectKey,
sourceSha256)` from the current effective catalog and verifies byte length,
digest, `UTE `/`V3.2`/root identity, exact native identity fields, supported
root field cardinality/types, canonical `VarTable`, and canonical ordered
`CreatureList`. Preview-only, synthetic, stale, malformed, duplicate-field,
unknown-root-field, or non-canonical sources fail closed.

The writer emits canonical common Encounter fields in the recovered writer
order. It copies an admitted non-empty `VarTable` and omits an empty/absent
one, copies the complete ordered `CreatureList`, excludes palette `PaletteID`
and `Comment`, adds float32 origin coordinates multiplied by ten, retains the
existing backend-owned four-point type-`1` construction polygon, and writes an
empty `SpawnPointList`. The paired type-`7` GIC entry is empty. The client
cannot supply bytes, geometry, spawn points, GIC comment, or dependency data.

The existing 1,024-addition and 100,000-object budgets, complete candidate and
persisted readback, revision fence, atomic ARE/GIT/GIC/IFO publication,
rollback, and privacy-safe diagnostics remain unchanged.

## Implementation closure

Implementation checkpoint `207` and capability revision `2026-09-01.139`
close the offline arbitrary/current-effective Encounter construction slice.
The frontend maps only exact effective UTE catalog rows to binary-free
`aurora_blueprint` provenance and retains that identity through drag-source
cloning and local-draft save/reopen. The backend projector admits only the
frozen profile, the catalog repository resolves the current `ute` winner, and
the candidate compiler rechecks source key, size, digest, native identity,
ResRef, Tag, and the empty dependency boundary before passing bytes to the
writer.

The writer validates the complete supported root field set, rejects unknown or
duplicate labels, canonicalizes non-empty `VarTable` and ordered
`CreatureList`, excludes palette metadata, emits the backend-owned polygon and
empty spawn list, and constructs the paired empty type-`7` GIC entry. Candidate
and persisted readback precede revision-fenced atomic publication.

Accepted resource-bounded gates are `34/34` Encounter construction assertions,
`632/632` projector assertions, `174/174` candidate-compiler assertions,
`66/66` module-snapshot catalog assertions, `13/13` capability assertions,
`79/79` Area Update atomic-publication assertions, `35/35` focused frontend
assertions, and both production builds. The ordinary type-checking Jest
transform exceeded the repository's fixed 1 GiB heap on this very large
writer; production `nest build` supplied the type gate and the repository's
isolated `test:unit:bounded` configuration supplied the executable test gate.

No Docker command, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## Acceptance boundary

Offline acceptance requires negative domain tests, effective-catalog resolver
tests, draft projection, current-winner compilation, writer/readback,
transactional publication, frontend catalog mapping, drag/drop/local-draft
round trip, regression coverage, and both production builds. Fresh guarded
browser Save/reopen and exact-candidate Toolset Save/Build/reopen plus NWN
spawning remain mandatory release proof. This audit does not by itself promote
Encounter authoring or the Area program to complete.
