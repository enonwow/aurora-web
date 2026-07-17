# Testing And Runtime QA

Source Status: docs-verified from `neverwinter.nim` script compiler docs/source, Beamdog changelog lane, NWN Lexicon debug/runtime helper pages, and NWNX:EE logging/console docs. Runtime evidence is still required for any target module.

## What This Domain Controls

Proof that a NWN feature works in the intended context. Use this reference whenever the task asks whether content is "done", "working", "safe to release", "balanced", "compiled", "tested", "runtime verified", or "live ready".

## Evidence Ladder

1. `design-only`: design exists, but no files or runtime were checked.
2. `static-checked`: module/source files, 2DA/TLK/HAK/NWSync config, scripts, or diffs were inspected.
3. `compiled`: NWScript/content build succeeded with the relevant compiler/tooling.
4. `instrumented`: debug messages, logs, assertions, or telemetry were added intentionally and can prove a path.
5. `runtime-tested`: verified in Toolset, local server, NWN client, logs, or a throwaway module.
6. `regression-tested`: tested against old/new characters, success/failure paths, restart, and packaging.
7. `live-verified`: verified safely on the real server with rollback and monitoring.

Never collapse these labels. A compiled script is not runtime proof; a local runtime test is not live proof; live proof without rollback notes is not release proof.

## Source-Backed Testing Facts

- `neverwinter.nim` includes the official NWN:EE script compiler source and CLI utility.
- `nwn_script_comp` can compile one or many scripts and writes artifacts near source files unless output options are used.
- Beamdog's NWN:EE docs/changelog lane identifies the open-source standalone script compiler path through `neverwinter.nim`.
- NWN Lexicon categorizes Debug functions separately from gameplay functions.
- `PrintString` writes a message to the log file.
- `WriteTimestampedLogEntry` writes timestamped entries to the NWN log file.
- `SendMessageToPC` can be used for debugging visible values and script position, but too many messages can be dropped.
- `GetIsObjectValid` is the safer proof for object references than comparing only to `OBJECT_INVALID` when object IDs may point to destroyed or missing objects.
- `OBJECT_SELF` is always valid for the currently running script, but delayed scripts on destroyed caller objects can fail to invoke.
- EE preprocessor macros such as `__FUNCTION__`, `__FILE__`, and `__LINE__` can make debug output traceable to exact script locations.
- `GetScriptBacktrace` can generate a VM debug view and can include stack data, but needs debug info for names/symbols and can be slow on large scripts.
- The NWN:EE script editing tutorial recommends combining on-screen debug feedback with log output because each proves a different kind of issue.
- NWNX core exposes log-level, timestamp/date/plugin/source formatting, secondary log file, console `runscript`, and `eval`/`evalx` commands.
- NWNX plugin loading and log levels are controlled by environment variables set before server start.
- NWNX Util can register server console commands that execute script chunks and can report the server user directory.

## Runtime Proof Recipe

For any feature, produce this proof bundle:

1. `scope`: feature name, module/build version, branch, script/data files, and domains touched.
2. `static`: changed resrefs, tags, rows, StringRefs, HAK/TLK/NWSync files, and scripts.
3. `compile`: exact compiler/tool, command, output, warnings/errors, and generated artifacts.
4. `instrumentation`: debug labels, log prefixes, test variables, and temporary commands.
5. `paths`: success path, failure path, old character path, fresh character path, and multiplayer path if relevant.
6. `state`: before/after values for locals, DB rows, inventory, XP/gold, quest journal, area objects, and persistent tables.
7. `packaging`: client asset delivery, HAK/TLK/NWSync version, clean-client join/download result, and rollback manifest if relevant.
8. `observed`: screenshot, client message, log excerpt, server console output, saved-game state, DB query, or exact blocker.
9. `cleanup`: temporary debug code removed or intentionally feature-flagged; rollback path documented.

## Minimum QA By Domain

- Areas/transitions: enter/exit both directions, invalid target, party member crossing, generated/copy-area cleanup, map pin/readability, and restart if generated.
- Items/loot/shops: full inventory, stack merge/split, identified/unidentified value, equip/unequip/acquire/unacquire, shop buy/sell/identify, and stolen/plot/cursed cases if relevant.
- Creatures/encounters: spawn, perception, combat, death, loot/XP, reset/exhausted behavior, party scaling, summons/associates, and load under repeat spawns.
- NWScript systems: event owner, `OBJECT_SELF`, accessors, delayed/assigned/executed calls, invalid-object guards, instruction count risk, and compile warnings.
- 2DA/TLK/HAK/NWSync: row ownership, clean install, client delivery, old module rollback, save compatibility, and version-specific source files.
- NUI: open, close, reopen, duplicate window id, watched binds, event ids, refresh/update, multiple players, disconnect, and asset delivery.
- Quests/dialogue/journal: conditional and action re-check, abort, disconnect, range break, party sharing, replay after relog, journal completed state, and reward idempotency.
- Economy/crafting/progression: faucet/sink totals, repeatable farming, failed craft/purchase, full inventory, vendor gold/max buy price, XP/gold rollback, and telemetry.
- Persistence/NWNX: relog, server restart, crash simulation if safe, schema migration, stale object references, plugin loaded/not loaded, DB error path, and backup restore.
- Deployment/ops: start command, settings, secrets redaction, logs, health checks, NWSync verification, backup, rollback, and live observation window.

## Instrumentation Patterns

- Prefix every temporary log with a stable token, for example `NWN_SKILL_QA:<feature>:<path>`.
- Include player CD key/account/character only when needed and redact it from shared artifacts.
- Include `__FILE__`, `__LINE__`, and a path id in temporary debug helpers when the EE version supports preprocessors.
- Prefer `PrintString` or `WriteTimestampedLogEntry` for repeated paths and `SendMessageToPC`/on-screen debug for immediate visible confirmation.
- Use `GetIsObjectValid` before dereferencing objects returned from local variables, lookup functions, loops, transitions, or delayed callbacks.
- For NWNX servers, capture core/plugin log level, loaded/skipped plugin env vars, and log file path before trusting NWNX-only behavior.
- Keep debug code behind a test flag or remove it before release unless it is intentionally part of live telemetry.

## Output Shape

When asked for testing or review, return:

```text
Status: design-only | static-checked | compiled | instrumented | runtime-tested | regression-tested | live-verified
Scope:
Evidence:
Source-backed facts:
Runtime observations:
Failed paths / blockers:
Release risk:
Next proof step:
```

## Guardrails

- Do not mark a feature done from design, screenshots of code, or model explanation alone.
- Do not treat a single happy-path client test as multiplayer, persistence, packaging, or live proof.
- Do not remove debug instrumentation until the proof bundle has the necessary logs/screenshots.
- Do not leave noisy debug output active on a live server unless it is gated and intentional.
- Do not treat NWNX console/eval tests as vanilla NWN behavior.
- Do not use speculative community notes as proof; label them `community-example` or `unverified`.
- Do not promote a test result from one module/server to general guidance without a `project-specific` label.

## Sources

- `neverwinter.nim` README and `nwn_script_comp.nim`.
- Beamdog NWN:EE docs/changelog.
- NWN Lexicon Debug Functions, `PrintString`, `WriteTimestampedLogEntry`, `SendMessageToPC`, `GetIsObjectValid`, `OBJECT_SELF`, Preprocessors, and `GetScriptBacktrace`.
- NWN Lexicon NWN:EE Script Editing Tutorial.
- NWNX:EE Core/plugin management docs and NWNX:EE Util docs.
