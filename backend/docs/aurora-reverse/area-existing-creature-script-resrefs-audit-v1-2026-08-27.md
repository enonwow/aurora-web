# Existing Area Creature script ResRefs audit v1

Date: 2026-08-27  
Status: source-closed; offline implementation complete; fresh release certification pending

## Decision

Aurora Web may expose the thirteen exact script-event `ResRef` fields of one
retained type-`4` Area GIT Creature as independent compare-and-swap mutations.
Each field remains independently presence-sensitive. A present empty ResRef is
editable; an absent, duplicated, aliased, wrong-case, wrong-type, malformed, or
stale field remains `PRESERVE_ONLY` and does not authorize field creation or
removal in this first bounded writer profile.

The admitted target profile is an empty string or one canonical lowercase
ASCII resource identifier matching `[a-z0-9_]{1,16}`. The native writer folds
uppercase ASCII to lowercase, but Aurora Web must not rely on that side effect:
source readback may retain canonical source case for compare-and-swap, while a
new target must already be canonical. This restriction is the project resource
identity budget, not a claim that the GFF length byte is the Toolset UI limit.

## Immutable primary authority

The read-only sources are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- `backend/docs/aurora-reverse/aurora-toolset-npc-stage3-standard.md`, SHA-256
  `6c7efe10646a90132447008e1a9f8548c228a4bcc211a691b31b834e99de3ca0`;
- the AUR-S03-04 post-Save GIT summary, SHA-256
  `289ad9c397fa50b12b17cdb54362afbd45911540e4d69bcf9592b8957869fb67`;
- the AUR-S03 final rollback GIT summary, SHA-256
  `6a2f086825ade9c4054acca5b4c86112cd2af40e4acdf6eadf0e17f5df4c23d9`.

Only immutable decompilation artifacts and existing accepted project proof
artifacts were inspected. No Toolset/NWN process or window was controlled, no
browser, service, watcher, capture, Docker command, or mutation test was
started, and no xoreos or other GPL source was inspected or used.

## Native storage closure

The common Creature reader `FUN_00532174` reads the thirteen fields through
`FUN_00aeef98` at decompiled lines `195016-195065`. `FUN_00aeef98`, beginning
at line `968044`, accepts only GFF native type id `0x0b`, returns a bounded
length-prefixed ResRef, and reports missing or wrong-type state separately from
the supplied default.

The common Creature writer `FUN_0053521c` writes the same thirteen object
members through `FUN_00aeffa4` at lines `195240-195252`. `FUN_00aeffa4`,
beginning at line `968883`, creates native type id `0x0b`, writes the
length-prefixed value, and lowercases ASCII `A..Z`. The common reader/writer
offsets and exact labels are symmetric:

| Frontend slot | Native GIT label | Common Creature offset |
| --- | --- | ---: |
| `onHeartbeat` | `ScriptHeartbeat` | `0x10c` |
| `onPerception` | `ScriptOnNotice` | `0x11d` |
| `onSpellCastAt` | `ScriptSpellAt` | `0x12e` |
| `onPhysicalAttacked` | `ScriptAttacked` | `0x13f` |
| `onDamaged` | `ScriptDamaged` | `0x150` |
| `onDisturbed` | `ScriptDisturbed` | `0x161` |
| `onCombatRoundEnd` | `ScriptEndRound` | `0x172` |
| `onConversation` | `ScriptDialogue` | `0x183` |
| `onSpawn` | `ScriptSpawn` | `0x194` |
| `onRested` | `ScriptRested` | `0x1a5` |
| `onDeath` | `ScriptDeath` | `0x1b6` |
| `onUserDefined` | `ScriptUserDefine` | `0x1c7` |
| `onBlocked` | `ScriptOnBlocked` | `0x1d8` |

The placed-Creature read/write lineage invokes the common reader/writer at
decompiled lines `197530` and `197590`. The exact fields therefore belong to
the type-`4` GIT Creature. The paired GIC record does not own them and must
remain byte-identical for a script-only mutation.

## Independent Toolset and runtime convergence

The accepted AUR-S03-04 procedure binds a resource to a concrete `Scripts` tab
event, saves the module, and requires GIT readback. Its retained post-Save
artifact records `script.scriptspawn = "main"` on the exact Dwarf Mercenary
fixture together with the other twelve canonical native fields. The later
accepted proof binds `OnHeartbeat`, observes its NWN marker, and rolls the
fixture back. The final rollback artifact restores
`script.scriptheartbeat = "nw_c2_default1"` and no `ScriptSpawn` field on the
target fixture.

That historical result proves Toolset binding, Save, native readback, runtime
dispatch for the observed event, and rollback. It does not by itself certify a
future Aurora Web candidate and does not authorize the first web writer to add
or remove a field. Fresh exact-candidate browser, Toolset, packed readback, and
NWN proof remain release gates.

## Frozen additive cross-boundary contract

Area detail may add one exact thirteen-member group. Every member is either:

```ts
type CreatureScriptResRefStorage =
  | { present: false }
  | { present: true; nativeType: "resref"; value: string };
```

The group has the frontend keys from the table above and no extension keys.
Frontend scene provenance keeps only admitted present members as detached
immutable `{ expectedResRef }` records under `source.creatureScriptResRefs`.
Editable targets remain the matching members of
`creatureProperties.scriptSlots`. Each input is independently `ACTIVE_NOW`
only for exact `aurora_git`, `sourceKind=creature`, a non-negative immutable
family ordinal, and its own admitted present provenance. Every other field is
visibly `PRESERVE_ONLY` and non-destructive.

A changed member projects under the existing Creature property mutation:

```json
{
  "kind": "creature",
  "sourceObjectId": "creature:0:nw_dwarfmerc001:...",
  "sourceIndex": 0,
  "scripts": [
    {
      "field": "ScriptSpawn",
      "expectedResRef": "nw_c2_default9",
      "resRef": "main"
    }
  ]
}
```

At least one changed member is required. Members must be unique and emitted in
the canonical table order. The collection may coexist with independently
admitted Creature property members on the same ordinal, but never with deletion
of that ordinal.

## Writer, transaction, and diagnosability requirements

Projection, parsing, exact-ordinal planning, paired writing, and complete
candidate readback fail closed independently. Planning reparses exactly one
case-sensitive native ResRef field for each requested member and compares the
complete expected value. Writing replaces only those existing fields,
preserves their field order and every sibling GIT value, reconstructs an
identical paired GIC, and uses the existing revision-fenced, idempotent,
journaled ARE/GIT/GIC/IFO atomic publication.

No endpoint, binary payload, pagination, chunking, streaming, authorization,
permission, idempotency, fencing, recovery, or transaction budget changes.
Routine diagnostics may expose only contract revision, Creature family,
bounded ordinal, approved native field tokens, changed-member count, stage,
duration, and stable result code. Script values, object IDs, hashes, raw bytes,
source/storage keys, credentials, and host paths are prohibited metric labels.

## Offline implementation closure

The bounded profile is implemented end to end. Backend parsing exposes the
exact thirteen-member presence-sensitive group, snapshot cloning and process
identity retain it, projection emits changed present members only in canonical
native order, exact-ordinal planning performs full-value CAS, and the paired
writer replaces only the requested existing `ResRef` fields. Candidate
readback verifies the complete GIT while the paired GIC and module IFO remain
byte-identical through the existing atomic Area Update transaction.

The frontend validates the exact HTTP group, detaches present-member
provenance, maps native fields to their matching script slots, validates and
deep-clones workspace/history state, and exposes independent visible
`ACTIVE_NOW` or `PRESERVE_ONLY` status for every slot. Draft reduction and
final Apply use the same provenance rule, so a disabled or otherwise injected
unproven value cannot reach saved scene state. The full Workspace regression
proves two authorized edits plus one presentation-only slot through Apply, OK,
reopen, and Ctrl+S local Save while retaining immutable source CAS.

Focused backend domain/parser/projector/writer/compiler/integration tests,
focused frontend domain/transport/mapper/workspace/clone/provenance tests, the
complete `CreaturePropertiesDialog` file (`30/30`), the complete Creature
Workspace regression file (`13/13`), capability catalog revision
`2026-08-27.75` (`13/13`), and both production builds are green. The frontend
build reports only the pre-existing large-chunk advisory.

## Completion boundary

Offline closure requires domain parsing, exact Area-detail extraction, strict
HTTP transport, immutable frontend mapping and workspace validation, per-slot
UI gating, history cloning, Apply/OK/reopen/local-Save regression, projection,
exact-ordinal planning, field-only paired writing, complete readback, combined
mutation coverage, atomic-publication integration, capability catalog evidence,
and both production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, and NWN event dispatch remain independent release
gates. Addition/removal of an absent native field remains a separate future
source-to-writer contract. This audit does not complete Creature authoring,
Area CRUD, renderer/connectivity proof, or the 99-tileset program.
