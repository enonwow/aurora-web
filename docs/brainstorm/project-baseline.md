# Project Baseline

## Purpose
This document captures where we are now, what source projects we use, and what is already known.

## Language Convention
- All project documentation is written in English.
- Engineering notes and future code-facing documentation should use English terminology.

## Source Projects

### Reverse Engineering Source
- Path: `C:\Projects\nwn-last-city\Aurora\reverse`
- Role: knowledge extraction from the original Aurora toolset behavior and data flow.
- Current evidence:
- `README.md`, `STATUS.md`, and `FULL_DOCUMENTATION.md` exist.
- Dedicated `docs`, `refs`, `tools`, and extraction artifacts are present.
- `STATUS.md` (2026-05-18) reports 105 extracted `TPF0` forms and identified import/export handler anchors.

### POC and Experiment Source
- Path: `C:\Projects\nwn-last-city\Areas Generator 3d`
- Role: implementation experiments, validation runs, and technical documentation from prior attempts.
- Current evidence:
- Structured folders exist: `Documentation`, `Assets`, `Tools`, `Tests`, `Reports`, `Exports`, and more.
- `Documentation/Coverage.md` marks multiple topics as implementation-ready.
- `Documentation/RepoFindings.md` includes practical implementation references and open questions.

## What Is Known So Far
- A strong research base already exists for GFF/ARE/GIT/GIC structures and tileset logic.
- Practical implementation references already exist for placement, walkmesh, and rendering-related topics.
- There is enough validated material to start a clean architecture in `aurora-web` without repeating early discovery work.

## Known Gaps and Risks
- Minimap and generated map imagery are marked as a gap in prior coverage.
- EE-only rendering edge cases still require sample corpus validation.
- Some medium-confidence areas still require real-world validation before final implementation decisions.

## Gap Status Updates
- Map imagery gap now has an MVP direction in `docs/product/mvp-client-side-map-capture-and-filters.md` (client-side capture/export path).

## Working Rule for This Repository
- `aurora-web` is the clean implementation repository.
- Reverse engineering and legacy POC repositories are treated as upstream knowledge sources.
- Decisions for `aurora-web` must be recorded in this repository documentation, not only in chat history.
