# MVP AI Location Generation Connector (Experimental)

## Goal
Enable prompt-driven generation of draft locations through an AI connector that uses project context (style, tilesets, placeable mappings, and existing area patterns).

## MVP Experiment Scope
1. Generate draft apartment locations from prompt, based on known apartment dataset and mapped placeables.
2. Output is a draft area package for review in editor mode (not auto-production publish).
3. Keep generation loop iterative: first outputs may be low quality and are expected to improve with stronger context and feedback.

## Core Input Model (MVP)
1. User prompt (for example apartment theme and constraints).
2. Context pack:
- project style profile;
- allowed tilesets;
- placeable catalog + semantic tags (for example rich apartment vs poor apartment props);
- optional reference areas/examples.
3. Generation profile:
- target density budget;
- object class limits;
- optional quality/variety seed.

## Core Output Model (MVP)
1. Draft area data compatible with existing area pipeline.
2. Placement list with object identity/type/transform.
3. Generation metadata:
- prompt id/version;
- context pack version;
- generator version;
- confidence/quality notes.

## Workflow (MVP)
1. User submits prompt.
2. Connector prepares context pack and sends generation job.
3. AI returns structured draft (not freeform text).
4. Backend validates schema and project constraints.
5. Draft is loaded in editor for human review, fixes, and acceptance/rejection.

## Guardrails
1. AI output is always treated as suggestion/draft.
2. No direct overwrite of production/project canonical areas.
3. Enforce allowlists for tilesets/placeables/object classes by role/project scope.
4. Hard validation before draft is accepted into normal editing flow.

## MVP Phase Focus
1. Phase 1: apartment generation only (using available 10-15 apartment examples and mapping data).
2. Phase 2+: style-aware generation for broader themes (for example dark fantasy forest) using expanded project style context.

## Diagnostics And Telemetry
1. Track prompt -> output latency and validation pass/fail reason.
2. Track acceptance rate of generated drafts after human review.
3. Track frequent failure classes:
- invalid schema;
- style mismatch;
- over/under-density;
- invalid object references.

## Test Requirements
1. Unit tests:
- context-pack assembly;
- mapping/tag selection logic.
2. Integration tests:
- prompt -> draft generation -> validation -> editor preview flow.
3. Regression smoke:
- fixed prompt set should produce valid draft structures across versions.

## Open Inputs Needed
1. Existing mapping/link for placeable semantic groups and apartment profiles.
2. Initial prompt templates and acceptance rubric for generated drafts.
