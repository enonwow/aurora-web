# MVP AI Connector Generation Pipeline

## Goal
Define clean boundaries for AI-assisted location generation so it integrates with existing contracts and validation gates.

## Architectural Boundaries
1. `AI Connector`:
- orchestrates prompt/context exchange with generation model.
2. `Context Builder`:
- composes project style, mapping, tileset, and catalog constraints.
3. `Generation Validator`:
- enforces schema, allowlists, and hard constraints.
4. `Draft Publisher`:
- stores draft artifacts for editor review flow.

## Pipeline
1. Prompt intake.
2. Context pack build (versioned).
3. Structured generation request.
4. Structured response parsing.
5. Validation and normalization.
6. Draft artifact publish.
7. Editor-side review/acceptance.

## Contract Requirements
1. AI connector request/response schemas are versioned.
2. Output must be machine-validated before entering editor flow.
3. Generator output format should map to normalized render input path, not custom one-off structures.

## Safety And Reliability
1. Use queued jobs with retry policy and idempotency key.
2. Store prompt/context/output metadata for reproducibility.
3. Block drafts with unresolved object references or disallowed categories.

## Integration With Existing Architecture
1. Generated drafts feed the same unified render pipeline as manually edited areas.
2. No separate render behavior for AI-generated content.
3. Existing telemetry/debug hooks apply to generated artifacts.
