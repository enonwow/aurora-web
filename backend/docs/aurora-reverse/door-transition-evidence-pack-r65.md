# Door Transition Evidence Pack R65

Date: 2026-05-24
Owner: Agent B3 (Door Transition Evidence Pack)
Scope: evidence-only mapping of door + trigger transition fields to API shape, with per-field confidence.
Evidence sources used: `C:\Projects\nwn-last-city\Aurora\reverse\runs`, `C:\Projects\nwn-last-city\Aurora\reverse\docs\Doors`, `C:\Projects\nwn-last-city\Aurora\reverse\cpp_impl`.

## 1. Confidence scale

- HIGH: field confirmed by multiple independent artifacts and/or explicit parser implementation.
- MEDIUM: field confirmed in corpus, but runtime/API parity is partial or loader path is inconsistent.
- LOW: key-surface only or unresolved runtime/write-path semantics.

## 2. Evidence anchors (selected)

- Door corpus presence: `0426_door_profile` has `LinkedTo`, `LinkedToFlags`, `LoadScreenID` counts at lines 43-45.
- Door + trigger schema presence: `0426_git_object_schema_profile` has `Door List.*` at lines 239-241 and `TriggerList.*` at lines 257-259.
- Transition matrix (cross-source): `0518_door_trigger_transition_matrix` includes `kotorbase_door_reads` with `LinkedToModule` and `TransitionDestin` at lines 107-111; NWN/NWN2 reads only `LinkedToFlags` + `LinkedTo` at lines 99-106.
- Loader/API parity: `0526_transition_loader_parity_matrix` marks `nwn_has_triggerlist=false`, `nwn2_has_triggerlist=false`, `kotorbase_has_triggerlist=true` at lines 6-8; `GetTransitionTarget=0`, `SetTransitionTarget=0` in script usage summary at lines 19-20.
- Trigger transition surface snapshot: `0627_trigger_transition_surface_matrix` has `trigger_entries_total=4` at line 9, `LinkedToFlags` and `LoadScreenID` in field presence at lines 32-33, and `transition_empty` includes `LinkedToModule`/`TransitionDestin`/`LoadScreenID` at lines 77-81.
- Door parser API surface: `cpp_impl/include/aurora/door/door_transition.h` defines `DoorTransitionFields` with `linked_to`, `transition_destination`, `linked_to_module`, `linked_to_flags`, `load_screen_id`.
- Door parser mapping/aliases: `cpp_impl/src/aurora/door/door_transition.cpp` maps keys at lines 94-103 (`LoadScreenID|LoadScreenId`, `TransitionDestin|TransitionDestination`, `LinkedToModule`), ignores unknown keys by design, and returns typed parse statuses.
- Reverse KB caution: `docs/Doors/AURORA_RE_DOOR_KNOWLEDGE_BASE.md` flags unresolved retail mapping for `LinkedToFlags` and unresolved runtime/write-path for `LoadScreenID` and destination/module fields (for example lines 28, 30, 32, 62, 64, 66).

## 3. Proposed API shape (mapping target)

- Door transition payload: `door.transition.{ linkedTo, linkedToFlags, loadScreenId, transitionDestination, linkedToModule }`.
- Trigger transition payload: `trigger.transition.{ linkedTo, linkedToFlags, loadScreenId, transitionDestination?, linkedToModule? }`.
- Raw preservation channel (recommended): `transition.rawFields[]` with original `rawKey/rawValue` for alias/audit safety.

## 4. Field-by-field mapping: DOOR -> API

| Serialized key(s) | API field | Mapping rule | Confidence | Evidence |
|---|---|---|---|---|
| `LinkedTo` | `door.transition.linkedTo` | trim + preserve string | HIGH | `0426_door_profile` lines 43; `0426_git_object_schema_profile` line 239; `door_transition.cpp` lines 94-95 |
| `LinkedToFlags` | `door.transition.linkedToFlags` | parse to int32; invalid token -> parse error status | HIGH | `0426_door_profile` line 44; `0426_git_object_schema_profile` line 240; `door_transition.cpp` lines 96, 55-63 |
| `LoadScreenID` | `door.transition.loadScreenId` | parse to int32; invalid token -> parse error status | HIGH | `0426_door_profile` line 45; `0426_git_object_schema_profile` line 241; `door_transition.cpp` lines 98, 68-76 |
| `LoadScreenId` | `door.transition.loadScreenId` | explicit alias of `LoadScreenID` | HIGH | `door_transition.cpp` line 98 |
| `TransitionDestin` | `door.transition.transitionDestination` | preserve string; alias-normalized | MEDIUM | `0518` lines 107-111; `door_transition.cpp` line 100 |
| `TransitionDestination` | `door.transition.transitionDestination` | explicit alias; same target field | MEDIUM | `door_transition.cpp` line 100 |
| `LinkedToModule` | `door.transition.linkedToModule` | preserve string; optional field | MEDIUM | `0518` lines 107-111; `door_transition.cpp` line 102 |
| any unknown key | `door.transition.rawFields[]` only (or ignored if raw channel absent) | do not crash parse; keep compatibility | HIGH | parser dispatch only handles known keys (`door_transition.cpp` lines 94-103); unknown-key ignore behavior validated in tests |

Door semantic caveat:

- `LinkedToFlags` enum meaning is not retail-hard-closed in current evidence pack scope, so API must treat it as preserve-first numeric domain, not as trusted gameplay enum.

## 5. Field-by-field mapping: TRIGGER -> API

| Serialized key(s) | API field | Mapping rule | Confidence | Evidence |
|---|---|---|---|---|
| `LinkedTo` | `trigger.transition.linkedTo` | trim + preserve string | MEDIUM | `0426_git_object_schema_profile` line 257; `0437_git_trigger_schema_profile` lines 104, 157 |
| `LinkedToFlags` | `trigger.transition.linkedToFlags` | preserve numeric value; parser domain policy should be explicit | MEDIUM | `0426_git_object_schema_profile` line 258; `0437` lines 105, 160, 252 |
| `LoadScreenID` | `trigger.transition.loadScreenId` | preserve numeric value; runtime effect unknown | MEDIUM | `0426_git_object_schema_profile` line 259; `0437` lines 106, 163, 255 |
| `TransitionDestin` / `TransitionDestination` | `trigger.transition.transitionDestination` | keep as optional compatibility field, preserve-only | LOW | `0627` transition-empty surface lines 77-81 (no non-empty sample in this corpus slice) |
| `LinkedToModule` | `trigger.transition.linkedToModule` | keep as optional compatibility field, preserve-only | LOW | `0627` transition-empty surface lines 77-81 |

Trigger runtime caveat:

- For NWN/NWN2 runtime parity, `TriggerList` is present in data artifacts but loader path is marked absent in `0526` summary (`nwn_has_triggerlist=false`, `nwn2_has_triggerlist=false`), so trigger transition fields are data-supported but runtime-behavior confidence is limited.

## 6. API confidence summary

- Door base trio (`LinkedTo`, `LinkedToFlags`, `LoadScreenID`): HIGH confidence for data/API mapping.
- Door destination/module fields (`TransitionDestin(ation)`, `LinkedToModule`): MEDIUM confidence for API presence (preserve-first), LOW-MEDIUM for runtime/write semantics.
- Trigger base trio (`LinkedTo`, `LinkedToFlags`, `LoadScreenID`): MEDIUM confidence (strong data presence, weaker runtime parity in NWN/NWN2 path).
- Trigger destination/module fields: LOW confidence (surface-level only in this evidence set, no non-empty sampled values).

## 7. Implementation guardrails (derived from evidence)

- Preserve-first: do not drop unknown/alias fields silently when ingesting transition payloads.
- Keep numeric diagnostics for `LinkedToFlags` and `LoadScreenID` (raw token + parse result), especially for migration phases.
- Do not hard-code gameplay enum semantics for `LinkedToFlags` in API contract until retail-hard confirmation is produced.
- Keep door and trigger transition operation families separated in API to avoid false parity assumptions.

