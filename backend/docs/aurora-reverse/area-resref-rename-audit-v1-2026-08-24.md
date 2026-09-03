# Area ResRef Rename Audit v1 (2026-08-24)

## Decision

Aurora Web may implement an Area ResRef rename only as a dedicated,
module-scoped transaction. It is not an ordinary ARE field edit.

The admitted mutation surface is exactly:

1. move the logical `<old>.are`, `<old>.git`, and `<old>.gic` identities to
   `<new>.are`, `<new>.git`, and `<new>.gic` in one successor manifest;
2. replace the exact root `ResRef : ResRef` value in the moved ARE;
3. replace exactly one `Mod_Area_list[*].Area_Name : ResRef` membership in
   `module.ifo`, retaining its physical list position and struct type;
4. replace `Mod_Entry_Area : ResRef` only when its exact current value is the
   old Area ResRef;
5. preserve every other byte-semantic value unless canonical GFF rebuilding is
   required for the two changed GFF documents.

The transaction must fail closed on target collisions, ambiguous source
identity, stale provenance, malformed companions, incomplete scanning, or any
potential inbound literal reference outside the admitted fields. It must not
rewrite transitions, scripts, object tags, world-map data, or unknown fields
by guesswork.

## Primary Aurora evidence

Audited artifacts:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`;
- `C:/Projects/New Folder/export/strings.tsv`, SHA-256
  `864AE0139451D5333307CB2BBCCCE725BBD2D2C6056AC2D5F80F9B5EA50F190F`;
- `C:/Projects/nwn-last-city/Aurora/reverse/reverse/nwtoolset_rcdata_report.json`,
  SHA-256
  `3D9C5D29709BCF4AA037554781D229A2094F3D85370C44A6A5DF9A222F8D87FA`.

### ARE resource-bound identity

`FUN_005a7fc8(int *param_1, char *param_2, char param_3)` loads the ARE family
and copies the reader's resource-name argument `param_2` into Area member
`+0xaa`. It does not read root `ResRef` into that member.

`FUN_005a9f30` writes exact root label `ResRef` from member `+0xaa` through
`FUN_00aeffa4`. That helper creates GFF type `0x0b` (`ResRef`) and lower-cases
ASCII uppercase input. The logical resource name and root field therefore form
one identity invariant; changing only the root value is not a complete rename.

### Area Properties authoring path

RCDATA form `TDLGAREAPROPERTIES`, RVA `0x00AC67B0`, size 16,478 bytes,
contains editable Advanced control `eResRef` with `ecLowerCase` and
`eResRefChange`.

`FUN_00553710` copies Area member `+0xaa` to dialog member `+0x65e`.
`FUN_0055404c` copies the accepted dialog value back to Area member `+0xaa`.
The surrounding `FUN_0057ed2c` path writes the current ARE and refreshes the
Toolset Area registry/UI. The bounded path contains no iteration that rewrites
other GIT resources, NSS/NCS scripts, or transition fields. This proves the
ResRef control is real while disproving any assumption that the properties
dialog itself performs a complete cross-resource reference repair.

### Module membership and lifecycle

The native IFO reader loads exact `Mod_Entry_Area : ResRef` and the
`Mod_Area_list` list of struct type 6 entries containing
`Area_Name : ResRef`. The IFO writer emits the same labels/types and preserves
list order from the module's in-memory Area list.

The Toolset create path `FUN_005c1fd8` writes the new Area resources and appends
the Area object's member `+0xaa` identity to the module Area list. The delete
path `FUN_005c2c24` removes the matching identity from that list and removes
the corresponding Area resources. Together with the IFO reader/writer, these
paths prove that resource triplet identity and module membership must change as
one lifecycle operation.

No xoreos source was used.

## Reference-repair boundary

The following values are not admitted automatic rewrite targets:

- GIT `LinkedTo`, `TransitionDestin`, `TransitionDestination`, or any other
  transition/link field;
- NSS source or NCS bytecode literals;
- object `Tag`, `TemplateResRef`, script ResRefs, conversation ResRefs, or
  arbitrary `CExoString`/`ResRef` values;
- world-map or module-extension fields without an independently closed native
  Area-ResRef contract.

Some of those values may equal an Area ResRef, an object tag, a script ResRef,
or an unrelated token. Replacing an exact string without field semantics could
silently corrupt the module. V1 therefore reports a bounded blocker when an
exact old-identity literal occurs outside the four admitted rename surfaces.
The user must first remove or explicitly re-author that reference through its
own verified feature.

Absence of a literal is not a claim that arbitrary runtime-computed strings
can never identify an Area. It proves only that the deterministic module
snapshot contains no static old-identity token for the admitted scan profile.
The rename transaction does not claim whole-program script analysis.

## Frozen scan profile

The read-only preview and the locked compiler repeat the same immutable scan:

- at most 50,000 manifest objects;
- at most 16 MiB per inspected object and 512 MiB total inspected bytes;
- at most 256 findings;
- canonical lowercase ResRefs matching `[a-z0-9_]{1,16}`;
- case-insensitive exact token matching with non-ResRef boundaries in raw
  single-byte and UTF-16LE/BE representations;
- structured GFF inspection for the target ARE and `module.ifo`, admitting
  only root `$.ResRef`, exactly one
  `$.Mod_Area_list[*].Area_Name`, and an optional exact
  `$.Mod_Entry_Area` old-value match;
- every other static old-identity token is a blocker;
- unreadable required GFF, a violated byte/object/finding budget, or a content
  hash mismatch is a blocker, never an empty scan.

The preview hash binds module revision, old/new ResRefs, all four required
source descriptors and hashes, exact membership/entry status, deterministic
findings, scan version, and budgets. The compiler recomputes it under the
shared lifecycle fencing lease and rejects a stale preview.

## Transaction invariants

1. Source old ARE/GIT/GIC and `module.ifo` descriptors are unique and their
   immutable content records match size and SHA-256.
2. Target new ARE/GIT/GIC logical keys are absent case-insensitively.
3. Old and new ResRefs differ after canonical lowercase validation; case-only
   renames are invalid.
4. The source ARE is V3.2 `ARE ` with exactly one exact-case root
   `ResRef : ResRef` equal to old.
5. GIT and GIC are readable V3.2 companions and remain byte-identical while
   only their logical keys move.
6. IFO has one exact-case `Mod_Area_list : List`, exactly one old membership,
   zero new memberships, and every entry has one exact
   `Area_Name : ResRef`.
7. Exact `Mod_Entry_Area : ResRef` is replaced only if it equals old; the five
   start-location floats remain unchanged.
8. The successor manifest contains new ARE/GIT/GIC and candidate IFO, omits
   old ARE/GIT/GIC, and preserves every survivor descriptor exactly.
9. Publication is one module-head compare-and-set under the existing fencing
   lease. Durable journal, idempotency, compensation, quarantine, and recovery
   follow the established Area lifecycle contract.
10. Independent persisted readback proves new triplet presence, old triplet
    absence, ARE root identity, one new/zero old membership, conditional entry
    replacement, GIT/GIC byte identity, survivor equality, and successor
    revision.

## Diagnostics and proof boundary

Structured events must cover preview start/completion, authorization, lease,
locked rescan, blocker classification, ARE/IFO compilation, journal, staging,
publication, readback, compensation, quarantine, replay, and completion. Raw
ResRefs, paths, bytes, script text, and field values must not become metric
labels. Bounded event context includes hashed module/Area identity,
transaction ID, revisions, preview hash, scan version, finding codes, old/new
descriptor hashes, and readback result.

Offline unit/integration proof is not native certification. The release gate
still requires a fresh exact-candidate Toolset Save/Build/reopen, packed
readback, and NWN module load proving the renamed Area remains loadable and the
entry location remains valid when affected.
