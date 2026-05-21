# MVP AI Generation Job Contract

## Goal
Define a minimal backend job contract for AI-based draft location generation.

## Job Flow
1. Create generation job.
2. Process asynchronously.
3. Validate output.
4. Publish draft artifact.
5. Expose status and result for editor review.

## Suggested Endpoint Set (MVP)
1. `POST /ai/generation/jobs`
- input: prompt + generation profile + context profile id.
- output: `jobId`.

2. `GET /ai/generation/jobs/{jobId}`
- output: status (`queued`, `running`, `failed`, `validated`, `published`) + timings + error category.

3. `GET /ai/generation/jobs/{jobId}/draft`
- output: validated draft payload + metadata.

## Minimal Job Metadata
1. `jobId`
2. `promptVersion`
3. `contextPackVersion`
4. `generatorVersion`
5. `createdAt` / `updatedAt`
6. `status`
7. `validationReport`

## Validation Gates
1. Schema validity.
2. Allowed object classes and category allowlists.
3. Allowed tileset/style profile alignment.
4. Reference integrity (object/template ids resolvable).

## Failure Categories
1. connector/transport failure
2. invalid structured output
3. validation failure
4. publish failure

## Security
1. Role-restricted endpoints (not public).
2. Full audit trail for who created and accepted/rejected draft.
3. No direct production publish path in MVP.
