# Existing Area Trigger event-script ResRefs audit v1

Date: 2026-09-02  
Status: source-closed; offline implementation verified; fresh live proof pending

## Decision

Aurora Web may expose and mutate the complete retained event-script tuple of
one exact type-`1` GIT Trigger:

| Contract key | Native GIT label | GFF type | UI label |
| --- | --- | --- | --- |
| `onDisarm` | `OnDisarm` | 11 / `ResRef` | On Disarm |
| `onTrapTriggered` | `OnTrapTriggered` | 11 / `ResRef` | On Trap Triggered |
| `onClick` | `OnClick` | 11 / `ResRef` | On Click |
| `onHeartbeat` | `ScriptHeartbeat` | 11 / `ResRef` | On Heartbeat |
| `onEnter` | `ScriptOnEnter` | 11 / `ResRef` | On Enter |
| `onExit` | `ScriptOnExit` | 11 / `ResRef` | On Exit |
| `onUserDefined` | `ScriptUserDefine` | 11 / `ResRef` | On User Defined |

All seven exact case-sensitive fields must be present exactly once on the same
native struct. Source values may be empty or match `[A-Za-z0-9_]{1,16}`.
Authored target values may be empty or match `[a-z0-9_]{1,16}` because the
native writer lowercases ASCII A-Z. A missing, duplicate, wrong-case, wrongly
typed, malformed, partial, stale, or unchanged tuple is `PRESERVE_ONLY` or is
rejected without publication. Fields are never synthesized.

This slice admits storage mutation and native event-slot identity only. It does
not claim that any script resource exists, compiles, runs, or fires with a
particular cadence or event ordering. Trap state, activation, links,
variables, geometry, rotation, and arbitrary Trigger creation remain outside
this contract.

## Immutable primary authority

The sole behavioral authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The installed retail `nwtoolset.exe` SHA-256 is
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
No xoreos or other GPL source was inspected or used.

Common Trigger reader `FUN_00656720` begins at decompiled line `345687`.
Lines `346070..346094` read the seven labels above through
`FUN_00aeef98` into seven independent members. The helper at
`968044..968106` accepts only native field type `0xb` and preserves an explicit
empty ResRef.

Reciprocal writer `FUN_0065752c` begins at line `346102`. Lines
`346136..346142` write the same seven members under the same labels through
`FUN_00aeffa4`. The helper at `968883..968929` creates type `0xb`, emits the
native one-byte length prefix, and folds only ASCII A-Z to lowercase. The
placed Trigger reader/writer `FUN_00657a88` / `FUN_00657de0` delegate to that
common record before handling origin, orientation, paired GIC Comment, and
Geometry.

Independent accepted readback
`evidence/area-trigger-construction-2026-08-13/native-toolset-instance-readback.json`
binds Area `demo`, type-`1` `TriggerList[0]`, and all seven labels in the exact
34-field GIT record. The accepted immutable `newgeneric.UTT` adapter readback
also contains all seven source labels. These artifacts prove storage shape and
lineage, not event dispatch.

## Frozen additive contract

`AreaApiObjectPlacement` may add `triggerScriptResRefs` only for one complete
admitted source tuple. The frontend deep-copies it under immutable
`source.triggerScriptResRefsStorage` and authors a separate
`triggerScriptResRefs` target. A changed retained Trigger contributes one
optional member to its existing property mutation:

```json
{
  "kind": "trigger",
  "sourceObjectId": "trigger:0:newgeneric:source",
  "sourceIndex": 0,
  "scripts": {
    "expectedValue": {
      "onDisarm": "",
      "onTrapTriggered": "",
      "onClick": "",
      "onHeartbeat": "",
      "onEnter": "old_enter",
      "onExit": "",
      "onUserDefined": ""
    },
    "value": {
      "onDisarm": "",
      "onTrapTriggered": "",
      "onClick": "",
      "onHeartbeat": "",
      "onEnter": "new_enter",
      "onExit": "",
      "onUserDefined": ""
    }
  }
}
```

Projection requires exact immutable source provenance. Planning reparses the
same source GIT ordinal and verifies the complete expected tuple. Writing
replaces all seven existing fields in place from one validated target tuple,
retains physical field order, and requires exact candidate plus persisted
readback. The tuple may compose with independently admitted Trigger Tag,
TemplateResRef, LocalizedName, Comment, origin, and polygon mutations in the
same atomic transaction.

Every unrelated GIT field, the complete paired GIC, ARE, IFO, and unrelated
resources remain byte-stable for a scripts-only update. The existing endpoint,
authorization, permission, approved-token, body/object/property ceilings,
idempotency, optimistic concurrency, revision fencing, journal,
rollback/recovery, atomic ARE/GIT/GIC/IFO publication, and receipt contract
remain unchanged. No endpoint, binary body, pagination, chunking, or streaming
is added.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_trigger_script_resrefs_cas.v1` with operations
`parse_source|plan|write|readback`, outcome, stable result code,
`changedFieldCount` (`1..7`), and duration. Script ResRefs, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields/bytes, credentials,
and host paths are prohibited from routine event fields and metric labels.
Telemetry failure must not alter validation, mutation, transaction, rollback,
recovery, or publication.

Offline acceptance requires parser rejection coverage, detached source and
target state, complete-tuple cloning, visible `ACTIVE_NOW`/`PRESERVE_ONLY`
controls, Apply/Cancel/reopen/OK/local Save, projector/planner/writer/candidate
readback, scripts-only GIC/ARE/IFO preservation, coexistence with other
admitted Trigger mutations, atomic publication, regression, capability-
catalog coverage, and both production builds.

That offline boundary is now verified. The ten affected backend suites pass
`2,039/2,039`, including parser, projection, stale-source planning, exact GFF
replacement, candidate readback, best-effort content-free telemetry, and
module wiring. The capability catalog separately passes `14/14`, and the full
Area Update integration passes `88/88`. Eleven affected frontend files pass
`1,268/1,268`, the full regression-smoke gate passes `137/137`, and both
production builds pass. The complete frontend unit gate passes
`5,859/5,861`; the same two deterministic failures remain outside this
Trigger slice in the dirty Placeable render-package and material-side
expectations and remain global blockers.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GIT readback, and targeted NWN event dispatch remain independent
release gates. This audit does not certify complete Trigger, Area, tile, or
PathConnect functionality.

## Resource/process statement

This audit used immutable decompilation and accepted readback evidence only.
No Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. No installed skill matches this offline static-decompilation
and TypeScript contract slice.
