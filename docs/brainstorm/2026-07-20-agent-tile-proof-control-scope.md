# Agent tile proof control scope

## Decision

Add a development-only, local CLI-style script that helps Codex resume a
bounded runtime contract sweep and reject invalid proof artifacts. The script
does not add a browser panel, a backend HTTP endpoint, or a production
dependency.

## Complexity budget

The first iteration is limited to one script, one focused Node assertion test,
package command aliases, and a versioned local JSON contract. It reuses the
existing contract sweep and CDP proof artifacts rather than creating a second
renderer or scheduler.

## Aurora-first classification

No Aurora runtime semantic is implemented or inferred. The control plane only
interprets existing, already-recorded proof gates fail-closed. Aurora behavior
changes remain outside this scope and still require reverse/Toolset evidence.

## Acceptance evidence

- Unit assertions cover stale-worker detection, blocker grouping, and proof
  rejection for stale runtime evidence.
- The command is smoke-tested against the current sweep directory without
  starting a sweep.
- The frame gate is smoke-tested against the existing `r4` artifact and must
  reject it because its runtime freshness is false.
