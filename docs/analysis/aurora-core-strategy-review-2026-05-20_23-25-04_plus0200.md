# Aurora Core Strategy Review Snapshot

## Snapshot Timestamp (Europe/Warsaw)
`2026-05-20 23:25:04 +02:00`

## Scope
1. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\WEB_AURORA_TECH_STRATEGY.md`
2. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\INDEX.md`
3. `C:\Projects\nwn-last-city\Aurora\reverse\cpp_impl\HEARTBEAT_WEB_ARCH.md`

## Current State
1. Core index is organized and points to the main reverse knowledge surfaces, execution boards, and recovery documents.
2. `WEB_AURORA_TECH_STRATEGY.md` is a large append-only architecture log with many checkpoint blocks.
3. `HEARTBEAT_WEB_ARCH.md` mirrors strategy checkpoints in compact heartbeat form.
4. Latest active lineage marker is `WEB_ARCH_2026-05-20_0353` (ordering correction and synthesis of `0350` + `0351`).

## High-Value Active Decisions (from 0350/0351/0353)
1. Alias occurrence ledger at parser/package boundary:
- Preserve raw key/canonical key/order/value and explicit alias policy instead of losing information in dictionary overwrites.
- Critical for `.set` duplicate/alias behavior and door alias semantics.

2. Revisioned edit command boundary:
- Keep ARE/GIT writers as authority.
- UI/AI should submit typed revisioned edit commands (`expectedRevision`) and never perform direct scene-authority writes.

3. Row-position-aware topology preflight:
- Corner sentinel and adjacency checks should be evaluated with row/column context.
- Start in warn mode; promote to strict only after fixture parity is complete.

4. Raw numeric token chronology:
- Preserve numeric token lexical history and alias order (not only normalized numbers).
- Important for signed alias behavior and underflow/format diagnostics.

5. Unified synthesis rule:
- Treat `0350` and `0351` as one combined implementation stream.
- Avoid duplicate work on overlapping alias/topology topics.

## Risk Analysis
1. Most evidence in these blocks is static/source/report-based; execution of full test suites is still pending.
2. Parser parity gaps remain likely where Python structures overwrite duplicate keys.
3. Over-strict topology gates too early can reject valid edge-row cases.
4. Without revisioned command envelopes, concurrent edits remain at risk of stale/lost updates.

## Impact On `aurora-web` Brainstorm
1. Confirms and strengthens current direction in:
- contract-first flow,
- incremental updates,
- diagnostics-first implementation,
- multi-user safety.

2. Adds stronger precision for upcoming contract/backlog work:
- alias policy model in contracts,
- command-envelope model for writes,
- topology preflight semantics,
- numeric-token provenance in diagnostics.

## Recommended Next Actions
1. Add an explicit `AliasOccurrence` model to FE/BE contract backlog.
2. Add a shared `AreaEditCommandEnvelope` draft for all editable object families.
3. Add a topology preflight section to tile/new-area save flows (warn-first policy).
4. Add a diagnostics section for raw numeric token chronology in parser outputs.
5. Keep syncing strategy by reading from latest lineage marker (`0353`) forward.
