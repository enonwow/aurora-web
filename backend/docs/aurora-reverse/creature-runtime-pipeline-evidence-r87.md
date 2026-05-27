# Creature Runtime Pipeline Evidence R87

## 1. Scope
- Goal: extract Aurora-first creature behavior from decompilation evidence and map it to backend implementation requirements.
- Evidence source: `C:\Projects\New Folder\export\decompiled_all.c` plus CSV exports from the same folder.
- Focus: load/save flow, field contract, palette behavior, resource lookup, and 2DA dependencies.

## 2. Core Creature Functions (Load/Save)

### 2.1 Creature load from GFF/UTC
- Function: `FUN_00532174(int param_1, int param_2, uint *param_3)`.
- Evidence: `decompiled_all.c` line `193907` (function start), usage block around lines `194114-195064`.
- Role: reads creature data from node handle (`param_2`/`param_3`) into runtime structure.

Key field reads observed:
- Identity and references:
  - `TemplateResRef`, `Gender`, `FirstName`, `LastName`, `Description`, `Conversation`.
- Appearance and body:
  - `Appearance_Type`, `Phenotype`, `PortraitId` + fallback `Portrait`, `Wings_New`, `Tail_New`, `SoundSetFile`.
  - Body/armor part fields (`ArmorPart_*`, `BodyPart_*`, `Appearance_Head`, `Color_*`).
- Alignment/combat:
  - `NaturalAC`, `refbonus`, `willbonus`, `fortbonus`, `GoodEvil`, `LawfulChaotic`, `HitPoints`.
- Challenge and perception:
  - `ChallengeRating` (float), `CRAdjust`, `PerceptionRange`.
- Scripts:
  - `ScriptHeartbeat`, `ScriptOnNotice`, `ScriptSpellAt`, `ScriptAttacked`, `ScriptDamaged`,
    `ScriptDisturbed`, `ScriptEndRound`, `ScriptDialogue`, `ScriptSpawn`, `ScriptRested`,
    `ScriptDeath`, `ScriptUserDefine`, `ScriptOnBlocked`.
- Lists:
  - `SkillList`, `FeatList`, `TemplateList`, `SpecAbilityList`, `ClassList`.

Important behavior details in load flow:
- Faction parsing supports alternate key representation (`FactionID` variants) with type fallback logic.
  - Evidence around line `194246`.
- For class spell containers:
  - Class IDs `1` and `9` use `KnownList`.
  - Other classes use `MemorizedList`.
  - Evidence around lines `194904-194980` and `195312-195360`.
- Spell records loaded from lists are normalized:
  - `SpellCasterLevel` clamped to max `0xF`.
  - `SpellFlags` OR-ed with `1`.
  - Evidence around lines `194804-194832` and list loaders in class loops.

### 2.2 Creature save to GFF/UTC
- Function: `FUN_0053521c(int param_1, int *param_2, uint *param_3)`.
- Evidence: `decompiled_all.c` line `195081` (function start), body includes reciprocal writes for loaded fields.
- Role: serializes runtime creature state back into GFF node.

Key save behavior:
- Writes the same semantic groups as load: identity, appearance, alignment/combat, scripts, and nested lists.
- Persists class spells using the same `KnownList` vs `MemorizedList` split.
  - Evidence around lines `195288-195360`.
- Saves list containers with explicit list-node creation helpers before emitting records.

## 3. Instance Wrappers (GIT-level Creature)

### 3.1 Read instance + embedded creature
- Function: `FUN_0053ab24(...)`.
- Evidence: lines `197397-197530`.
- Behavior:
  - Reads transform from `XPosition`, `YPosition`, `ZPosition`, `XOrientation`, `YOrientation`.
  - Reads optional `Comment`.
  - Calls `FUN_00532174((int)(param_1 + 0x22), param_2, local_38)` to load embedded creature payload.

### 3.2 Save instance + embedded creature
- Function: `FUN_0053ae80(...)`.
- Evidence: lines `197558-197590`.
- Behavior:
  - Writes transform/orientation/comment.
  - Calls `FUN_0053521c(param_1 + 0x88, param_2, param_3)` to persist embedded creature payload.

## 4. Template/Palette-Oriented Wrapper

### 4.1 Read creature template context
- Function: `FUN_006427a4(...)`.
- Evidence: lines `333700-333840`.
- Behavior:
  - Calls `FUN_00532174(param_1 + 0xc, local_48, local_4c)`.
  - Reads template metadata such as `PaletteID`, `Comment`.

### 4.2 Save creature template context
- Function: `FUN_00642de4(...)`.
- Evidence: lines `334022+`.
- Behavior:
  - Calls `FUN_0053521c(param_1 + 0xc, param_2, param_3)`.
  - Writes `PaletteID`, `Comment` and additional template-level metadata.

## 5. Palette Save Rules (Critical Defaults)

- Evidence function region: lines `328424-328437` with `TNWPaletteLoader::SavePaletteTree` messages.
- Observed logic:
  - Reads per-creature `ChallengeRating` and `FactionID` from UTC.
  - If `ChallengeRating` missing -> force `CR = 1.0` and log warning.
  - If `FactionID` missing -> force `Faction = 0` and log warning.

This is critical for backend parity when generating custom creature palettes.

## 6. Resource Lookup Behavior

### 6.1 Creature template by ResRef
- Evidence: `decompiled_all.c` line `309374` (`TCreatureListFiles::GetItemTemplateFromResRef` error path).
- Behavior:
  - Checks resource presence with two type codes (`0x7e8`, `0x7e9`) before opening template object.
  - If neither exists, emits error "Item template '%s' does not exist".

### 6.2 UTC extension usage
- Evidence across reverse artifacts (`utc.csv`, `xrefs_domain.txt`): repeated `*.UTC` scanning and palette integration paths.
- Implication:
  - Backend source resolver should keep UTC-based lookup as first-class for creature blueprints.

## 7. 2DA Dependencies Observed for Creatures

Global runtime 2DA bootstrap includes creature-relevant tables:
- Evidence: `FUN_0065a3c4` region (`decompiled_all.c` around line `348028` and following).
- Includes at least:
  - `Appearance`, `CAPart`, `classes`, `CreatureSize`, `creaturespeed`, `FractionalCR`,
    `racialtypes`, `skills`, `soundset`, `soundsettype`, `spells`, `StateScripts`, `visualeffects`.

Implication for backend:
- Creature enrichment should not be limited to `appearance.2da` only.
- Cache/index strategy should account for these supporting tables for full parity.

## 8. Backend Contract Implications (Aurora-first)

1. Treat `FUN_00532174` as the canonical read contract and `FUN_0053521c` as canonical write contract.
2. Keep dual handling for faction key/value forms and missing-field defaults.
3. Preserve class spell split (`KnownList` for class 1/9, `MemorizedList` otherwise).
4. Normalize spell records exactly as Aurora does (flags bit + caster-level clamp).
5. Implement palette safety defaults (`CR=1`, `Faction=0`) when building custom palette entries.
6. Keep transform/comment handling at instance wrapper level, not mixed into pure template logic.

## 9. Open Questions to Verify in Next Reverse Pass

1. Exact semantic mapping for resource type codes `0x7e8` vs `0x7e9` in the creature template resolver.
2. Whether any additional special-case class IDs use known/memorized behavior in other code paths.
3. Full meaning of unnamed DAT keys near creature fields where string labels were not recovered.

## 10. Ready-to-Implement Summary

The reverse evidence is now strong enough to implement creature parsing/saving in backend as a parity slice:
- deterministic field set,
- deterministic nested list handling,
- deterministic fallback behavior,
- deterministic wrapper separation (instance vs template).

Remaining work is mostly naming/typing polish and targeted validation tests against extracted UTC samples.
