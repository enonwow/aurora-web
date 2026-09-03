# Existing Area Event Script ResRefs Audit v1 (2026-08-21)

## Decision

Aurora Web may edit four already-present Area root fields:

| Application slot | Exact ARE label | GFF type |
| --- | --- | --- |
| `onEnter` | `OnEnter` | 11 / `ResRef` |
| `onExit` | `OnExit` | 11 / `ResRef` |
| `onHeartbeat` | `OnHeartbeat` | 11 / `ResRef` |
| `onUserDefined` | `OnUserDefined` | 11 / `ResRef` |

This is an existing-field, preserve-first mutation only. It does not authorize
materializing an absent field, resolving a script catalog entry, compiling an
NSS source, or claiming runtime event behavior.

## Primary evidence

Audited source artifacts:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`;
- `C:/Projects/New Folder/export/strings.tsv`, SHA-256
  `864AE0139451D5333307CB2BBCCCE725BBD2D2C6056AC2D5F80F9B5EA50F190F`.

The Area reader `FUN_005a7fc8` reads the four exact labels through
`FUN_00aeef98` at decompiled lines 255243-255258. The same Area-family function
also reads `Width`, `Height`, `Tileset`, and `Tile_List`. The implementation of
`FUN_00aeef98` at lines 968044-968104 accepts only field type `0xb`, reads the
one-byte ResRef length, and copies the value into the 17-byte destination.

The Area writer `FUN_005a9f30` writes the same four labels through
`FUN_00aeffa4` at lines 255918-255921. `FUN_00aeffa4` at lines 968883-968931
creates field type `0xb`, stores a one-byte length, and lowercases ASCII `A-Z`
while copying. This establishes exact labels, type, maximum 16-byte payload,
and native lowercase canonicalization. `strings.tsv` lines 10819-10822 and
10869-10872 independently identify the reader and writer labels.

No xoreos source was used.

## Frozen application contract

- An admitted value is either empty or 1-16 lowercase ASCII characters from
  `[a-z0-9_]`. Empty means the event is unbound.
- Aurora Web does not silently trim, truncate, replace, lowercase, or otherwise
  normalize user input. Non-canonical input fails before serialization.
- Absence is distinct from an empty ResRef.
- A field is editable only when the retained ARE contains exactly one
  case-sensitive label with GFF type 11 and a canonical source value.
- Each changed field carries an exact `{ expectedResRef, resRef }` CAS pair.
- Missing, duplicate, wrong-case, wrong-type, stale, unchanged, over-length, or
  non-canonical mutations fail closed.
- Unchanged or unsupported fields remain byte-preserved through the retained
  ARE path. GIT, GIC, and IFO companions must remain unchanged for this slice.

## Remaining proof boundary

Implementation and static readback cannot close:

1. script catalog existence and NSS/NCS compile status;
2. a fresh browser interaction/readback capture;
3. Toolset Save/Build/reopen and NWN event-dispatch proof.

Until those are captured, the catalog row may become `implemented` but its
release state remains `blocked`.
