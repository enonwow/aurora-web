# Aurora Reverse Analysis Snapshot

## Snapshot Timestamp (Europe/Warsaw)
`2026-05-20 21:05:14 +02:00`

## Scope
`C:\Projects\nwn-last-city\Aurora\reverse`

## Current State
1. `C:\Projects\nwn-last-city\Aurora\reverse` is a research workspace, not a single Git repo root, with a nested repo in `xoreos`.
2. Documentation is extensive and structured across indexed lanes (`Core`, `ARE/GIT`, `VFX`, `Tilesets`, `Placeables`, `NUI`).
3. Evidence volume is high (`runs`, `docs`, active worker outputs).
4. C++ reverse implementation exists (`cpp_impl`) with parser/test coverage across key modules.
5. Web-oriented strategy is documented in `docs/Core/WEB_AURORA_TECH_STRATEGY.md`.
6. Official status still indicates key parity areas remain open (`REVERSE_KNOWLEDGE_STATUS_2026-05-20.md`).

## Risk Analysis
1. High runtime parity risk: VFX and ARE/GIT lanes are still parser-heavy versus runtime-confirmed behavior.
2. High unresolved P0 ARE/GIT behavior risk: open/in-progress hard-confirm items affect transitions, flags, trigger semantics, visual transforms.
3. High provenance/consistency risk: prior KB overwrite incident indicates ongoing process fragility unless append-only discipline is enforced.
4. Medium source-resolution correctness risk for export pipeline (source mixing/cache-key ambiguity).
5. Medium legal/compliance risk if GPLv3 `xoreos` code is reused directly in `aurora-web`.

## Gaps
1. Missing retail-confirmed runtime truth for critical VFX behavior (blend/sort/collision-style behavior).
2. Missing closure of ARE/GIT P0 hard-confirm points with reproducible A/B artifacts.
3. Missing stable machine-readable bridge from reverse outputs to `aurora-web` contract/parity gates.
4. Incomplete full build/test confidence for `cpp_impl` baseline (walking lane progress exists, broader baseline still blocked by unrelated older modules).

## Recommended Next Actions
1. P0: Close ARE/GIT hard-confirm backlog and promote items to confirmed retail with artifacts.
2. P0: Execute VFX runtime confirmation lane and produce pass/fail matrices for `aurora-web` render assumptions.
3. P0: Define minimal machine-readable reverse contract for ingestion (fields, versions, confidence tags, artifact links).
4. P1: Add automated parity gates in `aurora-web` consuming reverse artifacts (ARE/GIT/VFX fixture tests).
5. P1: Enforce documentation safety rails (single merge flow to core KB, strict append-only worker output policy).
