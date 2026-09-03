# Existing Area advanced gameplay flags audit v1

Date: 2026-08-22

## Decision

Aurora Web may expose bounded existing-Area editing for exactly these values:

- terrain type as `{ interior, natural, subterranean }`, backed by root
  `Flags : DWord` values `0..7`;
- player-versus-player mode as `0 | 1 | 2 | 3`, backed by root
  `PlayerVsPlayer : Byte`;
- no-rest as a boolean, backed by root `NoRest : Byte` values `0 | 1`.

All other controls on the Toolset Advanced tab remain preserve-only under this
audit. In particular, this audit does not admit Listen/Spot modifiers, loading
screen selection, variables, or profile-dependent fields.

## Primary evidence and integrity

The reverse-engineering source admitted for this audit is the same frozen
Toolset export already used by the existing Area field audits:

| Artifact | SHA-256 |
| --- | --- |
| `C:\Projects\New Folder\export\decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:\Projects\New Folder\export\functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| `C:\Projects\New Folder\export\strings.tsv` | `864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f` |

The installed retail Toolset resource used to identify the exact Advanced-tab
controls is RCDATA `TDLGAREAPROPERTIES` extracted read-only from
`C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`.
Its 16,478-byte payload has SHA-256
`17903f30797a851c826320ac63aaa450db4813a41f4236766ea080f109df8c16`.

No xoreos source, code, name mapping, or runtime behavior was used.

## Native ARE reader evidence

`FUN_005a7fc8` reads the Area root fields. In the frozen export:

- line 255183 requests exact label `Flags` through `FUN_00aeee7c`;
- lines 255184-255187 project its low three bits into Area members;
- lines 255234-255235 request `PlayerVsPlayer` through `FUN_00aeed68`;
- lines 255236-255237 request `NoRest` through the same helper.

The helper contracts are independently visible in the same export:

- `FUN_00aeee7c`, lines 967969-967989, accepts only native field type id `4`
  (`DWord`);
- `FUN_00aeed68`, lines 967891-967912, accepts only native field type id `0`
  (`Byte`).

The exact bit/member mapping from the reader is:

| Native bit | Mask | Area member | Semantic name |
| --- | ---: | --- | --- |
| 0 | `1` | `+0x17c` | `interior` |
| 1 | `2` | `+0x184` | `subterranean` |
| 2 | `4` | `+0x180` | `natural` |

## Native ARE writer evidence

`FUN_005a9f30` serializes the same Area members:

- lines 255877-255885 rebuild `Flags` from `+0x17c`, `+0x180`, and `+0x184`
  using masks `1`, `4`, and `2`, then call `FUN_00aefe60`;
- line 255914 writes `PlayerVsPlayer` through `FUN_00aefd1c`;
- line 255915 writes `NoRest` through `FUN_00aefd1c`.

`FUN_00aefe60`, lines 968787-968814, writes field type id `4` (`DWord`).
`FUN_00aefd1c`, lines 968691-968718, writes field type id `0` (`Byte`).
The reader and writer therefore agree on labels, types, and the complete
three-bit terrain mapping. Because the writer reconstructs only these three
bits, a retained `Flags` value outside `0..7` is not admitted for editing; it
must be preserved byte-for-byte.

## Toolset semantic evidence

The Toolset default/config loader around lines 103432-103501 names
`PlayerVsPlayer`, `Interior`, `Natural`, `Subterranean`, `ListenCheck`,
`SpotCheck`, and `NoRest`. `FUN_0048a1f8` at lines 103523-103547, with the
symmetric transfer in `FUN_0048a2f8` at lines 103552-103577, maps:

- `Interior` to Area member `+0x17c`;
- `Natural` to `+0x180`;
- `Subterranean` to `+0x184`;
- player-versus-player mode to `+0x14d`;
- no-rest to `+0x14e`.

The installed `TDLGAREAPROPERTIES` resource exposes these exact Advanced-tab
widgets:

- `xbNoRest`: `TCheckBox`, caption `No Rest`;
- `cbPlayerVsPlayer`: `TComboBox`, `Style=csDropDownList`;
- terrain radios `Exterior` / `Interior`;
- terrain radios `Natural` / `Artificial`;
- terrain radios `Underground` / `Above ground`.

The UI therefore confirms that each terrain bit is an independent binary
choice, `NoRest` is binary, and PvP is a closed selection.

## Retail PvP value table

The exact retail `pvpsettings.2da` was read from the installed KEY/BIF set by
the repository's read-only `NwnKeyBifResourceReader`. Its relevant rows are:

| Row | label | value | strref |
| ---: | --- | ---: | ---: |
| 0 | `none` | 0 | 8020 |
| 1 | `party` | 1 | 8018 |
| 2 | `full` | 2 | 8019 |
| 3 | `default` | 3 | 8027 |

The Toolset loader at lines 208392-208499 loads `pvpsettings`, reads the
`strref` and `value` columns, and fills the closed combo box. Consequently the
only admitted PvP values are exactly `0..3`; row ordinals or display text are
not persisted substitutes.

## Frozen application contract

The Area detail exposes each source value only for one uniquely present,
exactly cased, correctly typed root field whose value satisfies the profile:

```ts
type AreaPlayerVsPlayerMode = 0 | 1 | 2 | 3;

interface AreaTerrainTypeFlags {
  interior: boolean;
  natural: boolean;
  subterranean: boolean;
}

interface AreaAdvancedFlags {
  terrainType?: AreaTerrainTypeFlags;
  playerVsPlayer?: AreaPlayerVsPlayerMode;
  noRest?: boolean;
}

interface ExistingAreaAdvancedFlagMutation<T> {
  expectedValue: T;
  value: T;
}

interface ExistingAreaAdvancedFlagMutations {
  terrainType?: ExistingAreaAdvancedFlagMutation<AreaTerrainTypeFlags>;
  playerVsPlayer?: ExistingAreaAdvancedFlagMutation<AreaPlayerVsPlayerMode>;
  noRest?: ExistingAreaAdvancedFlagMutation<boolean>;
}
```

`Flags` conversion is exact:

```text
value = (interior ? 1 : 0)
      | (subterranean ? 2 : 0)
      | (natural ? 4 : 0)
```

Every mutation is strict CAS. The backend reparses the retained ARE, requires
an exact source match, replaces only the requested field, then independently
parses candidate readback and compares the requested target. It never creates
a missing field or masks an unknown flag bit. An absent scene target means
preserve; a requested target without exact immutable source provenance is an
error. Empty or unchanged mutation objects are invalid.

Unrequested ARE fields and the GIT/GIC/IFO companions remain byte-preserved.
Existing authorization, concurrency, idempotency, publication, and recovery
contracts are unchanged.

## Remaining proof boundary

This audit establishes native storage, value domains, and editor semantics. It
does not certify the Aurora Web browser UI, Toolset Save/Build/reopen, or NWN
runtime behavior. Those remain separate release evidence and the broader
`properties_advanced_flags` capability must remain partial until the remaining
advanced properties and required proofs are closed.

Post-audit note: the later primary-source audits
`area-existing-check-modifiers-audit-v1-2026-08-22.md` and
`area-existing-loading-screen-id-audit-v1-2026-08-24.md` extend the admitted
storage-only subset with exact Listen/Spot Int values and the exact Area root
`LoadScreenID : Word`. They do not relax this audit's preserve-first rules or
promote the broader capability beyond partial.
