# Observability Event Taxonomy Spec R63 (Agent X1)

Data: 2026-05-24
Status: Draft for backend processing observability contract
Zakres: taksonomia eventow, metryk i atrybutow telemetrycznych dla pipeline `ingest -> parse -> classify -> enrich -> publish` oraz sciezek `fail/retry` dla `placeable`, `creature`, `area`, `blob_ingest`.

## 1. Cel

Zdefiniowac jedna, stabilna taksonomie observability zgodna z Aurora Reverse i standardami backend, tak aby:
1. eventy i metryki byly porownywalne miedzy pipeline types,
2. retry/fail mialy jawny i deterministyczny sygnal operacyjny,
3. etap `classify` i `enrich` byly first-class (bez utraty zgodnosci z R15),
4. low-cardinality pozostalo wymuszone dla Prometheus/OTel.

## 2. Evidence base (Aurora Reverse + backend)

1. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-observability-slo-agent-r15.md`
- canonical event families, metryki `aurora_pipeline_*`, tracing baseline.
2. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-errors-and-validation.md`
- kontrakt `AppException/ErrorEnvelope`, retryable semantics, `PIPELINE_*`.
3. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\processing-job-lifecycle-spec-r63.md`
- lifecycle eventy `enqueued/start/progress/complete/fail/cancel/retry`.
4. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\processing-error-taxonomy-spec-r63.md`
- canonical error.code i severity taxonomy.
5. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\hex-processing-ports-spec-r63.md`
- stage boundaries i port-level observability binding.
6. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\placeable-classification-spec-r63.md`
- `classify` lane (`placeable/door/vfx`) jako osobny kontrakt.
7. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\creature-enrichment-spec-r63.md`
- `enrich` lane (`UTC/2DA/TLK/HAK`) jako osobny kontrakt.
8. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\blob-ingest-pipeline-spec-r63.md`
- ingest/recovery/retry policy i revision-gated publish.

## 3. Canonical dimensions

## 3.1 Obowiazkowe wymiary (logs/events/traces)

1. `pipelineType`: `placeable | creature | area | blob_ingest`
2. `stageGroup`: `ingest | parse | classify | enrich | publish`
3. `result`: `started | completed | failed | retry_scheduled | retry_exhausted | cancelled | completed_with_drift`
4. `attempt`: liczba >= 1
5. `maxAttempts`: liczba >= 1
6. `pipelineVersion`: wersja runtime pipeline
7. `error.code` i `error.retryable` gdy `result` jest failure/retry

## 3.2 Dodatkowe low-cardinality labels (metryki)

1. `final_status`: `completed | completed_with_drift | failed | cancelled`
2. `retry_reason`: `timeout | dependency_unavailable | lock_conflict | rate_limited | transient_io | revision_conflict`
3. `lock_scope`: `source | module | area | template`
4. `drift_type`: `output_mismatch | ordering_mismatch | floating_tolerance_exceeded`

Zakazane labels: `requestId`, `jobId`, `jobKey`, `sourcePath`, raw `details[]`, surowe resref/path/token.

## 4. Stage taxonomy (R63)

## 4.1 Canonical `stage`

1. `ingest.acquire_lock`
2. `ingest.resolve_sources`
3. `ingest.fetch_source`
4. `ingest.stage_manifest`
5. `parse.decode_input`
6. `parse.extract_records`
7. `parse.policy_gate`
8. `classify.placeable_kind`
9. `classify.token_diagnostics`
10. `enrich.overlay_runtime`
11. `enrich.lookup_2da`
12. `enrich.lookup_tlk`
13. `enrich.resolve_hak`
14. `publish.persist_artifacts`
15. `publish.revision_gate`
16. `publish.emit_outbox`
17. `publish.release_lock`

## 4.2 Mapping na legacy R15 stage dashboards

1. `ingest.*` -> `pipeline.stage=fetch.source`
2. `parse.*` -> `pipeline.stage=transform.<pipelineType>`
3. `classify.*` -> `pipeline.stage=transform.<pipelineType>`
4. `enrich.*` -> `pipeline.stage=transform.<pipelineType>`
5. `publish.*` -> `pipeline.stage=persist.artifact`

Wymaganie: event MUSI zawierac `stage` (R63), a opcjonalnie `legacyStage` dla kompatybilnosci wykresow R15.

## 5. Event taxonomy

## 5.1 Job lifecycle events (required)

1. `pipeline.job.enqueued`
2. `pipeline.job.started`
3. `pipeline.job.progress`
4. `pipeline.job.completed`
5. `pipeline.job.completed_with_drift`
6. `pipeline.job.failed`
7. `pipeline.job.cancel_requested`
8. `pipeline.job.cancelled`

## 5.2 Stage lifecycle events (required)

1. `pipeline.stage.started`
2. `pipeline.stage.completed`
3. `pipeline.stage.failed`

Kazdy stage event MUSI miec `stageGroup` i `stage`.

## 5.3 Retry/fail events (required)

1. `pipeline.retry.scheduled`
2. `pipeline.retry.exhausted`
3. `pipeline.source_lock.acquire_started`
4. `pipeline.source_lock.acquire_succeeded`
5. `pipeline.source_lock.acquire_failed`
6. `pipeline.source_lock.conflict`
7. `pipeline.source_lock.released`

## 5.4 Determinism/revision events (required for publish correctness)

1. `pipeline.determinism.check_performed`
2. `pipeline.determinism.drift_detected`
3. `pipeline.revision_gate.conflict_detected`
4. `pipeline.revision_gate.passed`

## 6. Event envelope (JSONL)

## 6.1 Wspolne pola

`timestamp`, `level`, `event`, `requestId`, `jobId`, `jobKey`, `pipelineType`, `pipelineVersion`, `stageGroup`, `stage`, `attempt`, `maxAttempts`, `durationMs`.

## 6.2 Pola warunkowe

1. Failure/retry: `error.code`, `error.retryable`, `error.severity`, `retry.reason`, `retry.backoffMs`, `retry.jitterMs`.
2. Lock: `lock.scope`, `lock.keyHash`, `lock.ownerId`, `lock.leaseMs`, `lock.waitMs`, `lock.conflictType`.
3. Determinism: `determinism.inputHash`, `determinism.outputHash`, `determinism.baselineOutputHash`, `determinism.driftType`, `determinism.seed`.
4. Revision gate: `revision.expected`, `revision.actual`, `revision.conflict`.

## 6.3 Przyklady eventow

```json
{"timestamp":"2026-05-24T12:00:00.000Z","level":"info","event":"pipeline.stage.completed","requestId":"req-1","jobId":"job-1","jobKey":"jk-1","pipelineType":"area","pipelineVersion":"v1.3.0","stageGroup":"ingest","stage":"ingest.resolve_sources","attempt":1,"maxAttempts":3,"durationMs":83.4}
```

```json
{"timestamp":"2026-05-24T12:00:00.300Z","level":"warn","event":"pipeline.retry.scheduled","requestId":"req-1","jobId":"job-1","jobKey":"jk-1","pipelineType":"area","pipelineVersion":"v1.3.0","stageGroup":"parse","stage":"parse.extract_records","attempt":1,"maxAttempts":3,"error":{"code":"PIPELINE_STAGE_TIMEOUT","retryable":true,"severity":"CRITICAL"},"retry":{"reason":"timeout","backoffMs":2000,"jitterMs":211}}
```

```json
{"timestamp":"2026-05-24T12:00:02.000Z","level":"info","event":"pipeline.stage.completed","requestId":"req-2","jobId":"job-2","jobKey":"jk-2","pipelineType":"placeable","pipelineVersion":"v1.3.0","stageGroup":"classify","stage":"classify.placeable_kind","attempt":1,"maxAttempts":3,"durationMs":17.2}
```

## 7. Metrics taxonomy (Prometheus/OTel)

Prefiks metryk: `aurora_pipeline_`.

## 7.1 Counters (required)

1. `aurora_pipeline_jobs_total{pipeline_type,final_status,pipeline_version}`
2. `aurora_pipeline_attempts_total{pipeline_type,stage_group,stage,result,error_code,retryable}`
3. `aurora_pipeline_retries_total{pipeline_type,stage_group,stage,reason}`
4. `aurora_pipeline_drift_events_total{pipeline_type,stage,drift_type}`
5. `aurora_pipeline_source_lock_conflicts_total{pipeline_type,lock_scope,conflict_type}`
6. `aurora_pipeline_source_lock_acquire_total{pipeline_type,lock_scope,result}`
7. `aurora_pipeline_revision_gate_conflicts_total{pipeline_type,stage_group}`

## 7.2 Histograms (required)

1. `aurora_pipeline_job_duration_seconds{pipeline_type,final_status}`
2. `aurora_pipeline_stage_duration_seconds{pipeline_type,stage_group,stage,result}`
3. `aurora_pipeline_retry_delay_seconds{pipeline_type,stage_group,stage,reason}`
4. `aurora_pipeline_lock_wait_seconds{pipeline_type,lock_scope,result}`
5. `aurora_pipeline_lock_hold_seconds{pipeline_type,lock_scope}`

## 7.3 Gauges (optional, low-cardinality)

1. `aurora_pipeline_inflight_jobs{pipeline_type}`
2. `aurora_pipeline_source_locks_held{lock_scope}`
3. `aurora_pipeline_retry_queue_depth{pipeline_type}`

## 8. Event -> metric binding rules

1. `pipeline.job.completed|completed_with_drift|failed|cancelled` inkrementuje `aurora_pipeline_jobs_total` i obserwuje `aurora_pipeline_job_duration_seconds`.
2. `pipeline.stage.started|completed|failed` inkrementuje `aurora_pipeline_attempts_total`; `completed|failed` obserwuje `aurora_pipeline_stage_duration_seconds`.
3. `pipeline.retry.scheduled` inkrementuje `aurora_pipeline_retries_total` i obserwuje `aurora_pipeline_retry_delay_seconds`.
4. `pipeline.retry.exhausted` emituje `result=retry_exhausted` na `aurora_pipeline_attempts_total`.
5. `pipeline.source_lock.acquire_*|conflict|released` mapuje na lock counters/histograms.
6. `pipeline.revision_gate.conflict_detected` inkrementuje `aurora_pipeline_revision_gate_conflicts_total`.
7. `pipeline.determinism.drift_detected` inkrementuje `aurora_pipeline_drift_events_total`.

## 9. Fail/retry taxonomy

## 9.1 Retryable (MUST)

1. `PIPELINE_LOCK_TIMEOUT`
2. `PIPELINE_SOURCE_LOCK_CONFLICT`
3. `PIPELINE_DEPENDENCY_UNAVAILABLE`
4. `PIPELINE_DECOMP_TIMEOUT`
5. `PIPELINE_RATE_LIMITED`

Dla powyzszych event `pipeline.retry.scheduled` jest wymagany, jesli `attempt < maxAttempts`.

## 9.2 Non-retryable (MUST)

1. `PIPELINE_INPUT_INVALID`
2. `PIPELINE_PARSE_STRICT_BLOCKED`
3. `PIPELINE_VALIDATION_PARITY_FAILED`
4. `PIPELINE_DETERMINISM_DRIFT`
5. `PIPELINE_RETRY_EXHAUSTED`

Dla powyzszych finalny event to `pipeline.job.failed` albo `pipeline.job.completed_with_drift` (dla drift).

## 10. Trace taxonomy

1. Root span: `pipeline.job`.
2. Child spans: `pipeline.ingest.*`, `pipeline.parse.*`, `pipeline.classify.*`, `pipeline.enrich.*`, `pipeline.publish.*`.
3. Retry NIE tworzy nowego trace; retry jest eventem/spans continuation w tym samym trace.
4. Wymagane atrybuty span: `pipeline.type`, `pipeline.stage_group`, `pipeline.stage`, `pipeline.version`, `attempt`, `max_attempts`, `error.code`, `retryable`.

## 11. Compliance matrix (R63)

Implementacja jest zgodna, gdy:
1. emituje wszystkie eventy required z sekcji 5,
2. kazdy stage event ma `stageGroup` oraz `stage` z sekcji 4,
3. metryki required z sekcji 7 sa podpinane przez reguly z sekcji 8,
4. retry/fail semantics respektuja sekcje 9 i `processing-error-taxonomy-spec-r63.md`,
5. dashboardy R15 dzialaja przez mapping `legacyStage` z sekcji 4.2,
6. brak wysokiej kardynalnosci w labels.

## 12. Migration strategy (bez breaking changes)

1. Etap 1: dodac `stageGroup` + `stage` do eventow bez usuwania legacy `stage`.
2. Etap 2: rozszerzyc metryki o `stage_group` i `stage` jako labels.
3. Etap 3: przelaczyc dashboardy na R63 labels, zostawiajac R15 compatibility window.
4. Etap 4: po stabilizacji usunac zaleznosc na `legacyStage` (opcjonalnie).

## 13. Area event-script publication extension (2026-08-26)

The additive `area-event-script-publication-telemetry.v1` event covers the
revision-fenced validation and publication boundary. Required low-cardinality
fields are `operation=read_source|validate|publish`, `outcome=succeeded|failed`, stable
`resultCode`, optional committed `moduleRevision`, `sourceBytes`,
`includeCount`, `diagnosticCount`, `resourceCount`, and `durationMs`.

The event must not contain module IDs, target/include ResRefs, source text,
artifact bytes, diagnostic messages, provider or host paths, storage keys,
environment values, or raw compiler output. Recovery emits
`area_event_script_publication_recovery` with transaction ID, terminal outcome,
and bounded stable diagnostics. A telemetry sink failure must never change
source query, validation, publication, compensation, or recovery semantics.

The `read_source` operation reports one resource and its bounded source-byte
count only after exact revision/content verification. Its event follows the
same exclusion list: a source query must not add module or target identity,
source text, storage identity, descriptor keys, or failure messages. An
unexpected infrastructure exception is normalized to the stable
`AREA_EVENT_SCRIPT_TRANSACTION_FAILED` result before the telemetry boundary.

## 14. Existing Area Creature SkillList CAS extension (2026-08-28)

The additive `area_creature_skill_list_cas.v1` event covers exact source-list
parsing, current `skills.2da` admission, full-vector planning, candidate write,
and readback. Required low-cardinality fields are
`operation=parse_source|resolve_table|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `sourceCount`, `targetCount`,
`changedRankCount`, `resizeMode=same_length|expand_zero_tail|truncate_tail`,
optional `sourceLayer=module|hak|vanilla`, and `durationMs`.

Approved stable failures distinguish missing or ambiguous native structure,
stale source vector, table lookup failure, table digest/count drift, invalid
resize mode, unconfirmed truncation, out-of-Byte target, and candidate readback
mismatch. Rank values, names, StringRefs, object IDs, table hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, or recovery behavior.

## 15. Existing Area Creature class-level/HP CAS extension (2026-08-28)

The additive `area_creature_class_level_cas.v1` event covers exact roster
parsing, class-level and HP coupling validation, current `racialtypes.2da`
admission, candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|validate_coupling|resolve_table|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `classCount`,
`changedLevelCount`, optional `sourceLayer=module|hak|vanilla`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous `ClassList`,
non-type-`2` class structs, duplicate class IDs, stale class IDs or levels,
opaque-sibling-count drift, per-slot or total-level limit failure, missing HP
coupling, inconsistent target class levels, HP dependency mismatch, racial
table lookup/digest/count drift, derived HP mismatch, and candidate readback
mismatch. Class IDs, levels, HP values, table rows or hashes, object IDs,
ordinals, paths, source/storage keys, raw fields or bytes, credentials, and
host paths are prohibited from event fields and metric labels. A telemetry
sink failure must not alter validation, mutation, transaction, rollback, or
recovery behavior.

## 16. Existing Area Creature class-identity destructive-clear CAS extension (2026-08-28)

The additive `area_creature_class_identity_clear_cas.v1` event covers exact
complete-graph parsing/fingerprinting, explicit destructive-clear validation,
current `classes.2da` and `packages.2da` admission, coupled package planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|fingerprint|validate_confirmation|resolve_classes|resolve_packages|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `classCount`,
`changedSlotCount`, optional
`classesSourceLayer=module|hak|vanilla`, optional
`packagesSourceLayer=module|hak|vanilla`, and `durationMs`.

Approved stable failures distinguish missing/ambiguous `ClassList`, malformed
canonical spell-list graph, stale graph fingerprint, stale roster or levels,
missing destructive confirmation, duplicate/non-admitted target class,
classes-table lookup/digest/count drift, missing or noncanonical
`StartingPackage`, package-table lookup/digest/count drift, target package not
admitted for the target roster, unsupported slot-count/order/level change, and
candidate readback mismatch. Class IDs, levels, package values, table rows or
hashes, object IDs, ordinals, paths, source/storage keys, raw fields or bytes,
credentials, and host paths are prohibited from event fields and metric
labels. A telemetry sink failure must not alter validation, mutation,
transaction, rollback, or recovery behavior.

## 17. Existing Area ground-Item Tag CAS extension (2026-08-29)

The additive `area_item_tag_cas.v1` event covers exact source parsing,
presence/type validation, immutable-ordinal planning, candidate write, and
readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native Tag, wrong
case or type, invalid source or target value, stale source, unchanged pair,
wrong family or ordinal, deletion collision, preservation drift, and candidate
readback mismatch. Tag contents, object IDs, ordinals, hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, or recovery behavior.

## 18. Existing Area ground-Item TemplateResRef CAS extension (2026-08-29)

The additive `area_item_template_resref_cas.v1` event covers exact source
parsing, presence/type/canonical-value validation, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native
TemplateResRef, wrong case or type, noncanonical source or target value, stale
source, unchanged pair, wrong family or ordinal, deletion collision,
preservation drift, and candidate readback mismatch. ResRef values, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields or bytes, credentials,
and host paths are prohibited from event fields and metric labels. A telemetry
sink failure must not alter validation, mutation, transaction, rollback, or
recovery behavior.

## 19. Existing Area ground-Item localized-string CAS extension (2026-08-29)

The additive `area_item_localized_string_cas.v1` event covers exact source
parsing, bounded-profile admission, immutable-ordinal planning, candidate
write, and readback. Required low-cardinality fields are
`operation=parse_source|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native field,
wrong case or type, unsupported `strRef` or entry graph, invalid ASCII or
budget, stale source, unchanged/reordered/duplicate pair, wrong family or
ordinal, deletion collision, preservation drift, and candidate readback
mismatch. Text, base64, `strRef`, object IDs, ordinals, hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, or recovery behavior.

## 20. Existing Area ground-Item variable-table CAS extension (2026-08-29)

The additive `area_item_variable_table_cas.v1` event covers exact source
parsing, bounded-profile admission, immutable-ordinal planning, candidate
write, and typed ordered readback. Required low-cardinality fields are
`operation=parse_source|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `entryCount`, and
`durationMs`.

Approved stable failures distinguish malformed or ambiguous native
`VarTable`, wrong case or native type, unsupported variable type, exceeded
entry or text budget, stale storage, unchanged pair, wrong family or ordinal,
deletion collision, preservation drift, and candidate readback mismatch.
Variable names and values, object IDs, ordinals, hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, or recovery behavior.

## 21. Existing Area ground-Item property-list CAS extension (2026-08-30)

The additive `area_item_property_list_cas.v1` event covers exact source
parsing, canonical writer-profile admission, immutable-ordinal planning,
candidate replacement, and ordered readback. Required low-cardinality fields
are `operation=parse_source|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `sourceCount`, `targetCount`,
`changedEntryCount`, `changeShape=same_length|expanded|contracted|reordered`,
and `durationMs`.

Approved stable failures distinguish absent, duplicated, differently cased, or
wrongly typed `PropertiesList`; non-type-`0` entries; missing, extra,
reordered, differently cased, or wrongly typed entry fields; native-range or
property-48 invariant failure; exceeded entry budget; stale source vector;
unchanged pair; wrong family or ordinal; deletion collision; preservation
drift; and candidate readback mismatch. Property values or labels, object ids,
ordinals, hashes, paths, source/storage keys, raw fields or bytes, credentials,
and host paths are prohibited from event fields and metric labels. A telemetry
sink failure must not alter validation, mutation, transaction, rollback, or
recovery behavior.

## 22. Existing Area ground-Item BaseItem/appearance CAS extension (2026-08-30)

The additive `area_item_base_appearance_cas.v1` event covers effective
`baseitems.2da` admission, exact source-profile binding, immutable-ordinal
planning, coupled BaseItem/appearance replacement, and complete candidate
readback. Required low-cardinality fields are
`operation=resolve_catalog|parse_source|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `sourceModelType=0|1|2|3`,
`targetModelType=0|1|2|3`, `changedFieldCount`, `tableRowCount`, and
`durationMs`.

Approved stable failures distinguish missing or malformed effective catalog,
catalog descriptor drift, absent physical row, invalid ModelType, absent,
duplicated, differently cased or wrongly typed BaseItem, incomplete or extra
recognized appearance profile, native-range failure, stale source vector,
unchanged pair, wrong family or ordinal, deletion collision, preservation
drift, and candidate readback mismatch. BaseItem and appearance values, row
labels, object ids, ordinals, hashes, paths, source/storage keys, raw fields or
bytes, credentials, and host paths are prohibited from event fields and metric
labels. A telemetry sink failure must not alter validation, mutation,
transaction, rollback, or recovery behavior.

## 23. Existing Area ground-Item static visual-transform CAS extension (2026-08-30)

The additive `area_item_static_visual_transform_cas.v1` event covers exact
source parsing, bounded static-profile admission, immutable-ordinal planning,
candidate create/replace/remove, and complete readback. Required
low-cardinality fields are
`operation=parse_source|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`,
`presenceTransition=absent_to_present|present_to_present|present_to_absent`,
`changedComponentCount`, and `durationMs`.

Approved stable failures distinguish aliased, duplicated, differently cased,
or wrongly typed `VisTransformList`; wrong Scope or child/controller type;
missing, extra, duplicated, animated, or malformed controller members;
non-binary32, non-finite, default-present, or out-of-profile values; stale
source, unchanged pair, wrong family or ordinal, deletion collision,
presentation/target drift, preservation drift, and candidate readback
mismatch. Raw float values, Item identities, ordinals, hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, or recovery behavior.

## 24. Dynamic effective-catalog ground-Item construction extension (2026-08-30)

The implemented additive `area_dynamic_item_blueprint_copy.v1` event covers effective UTI
resolution, immutable source validation, native parse, effective
`baseitems.2da` admission, common-profile admission, candidate write, and
readback. Fields required on every event are
`operation=resolve_blueprint|validate_identity|parse_source|resolve_baseitems|admit_profile|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, and `durationMs`. Parsed and
later stages additionally carry `propertyCount`, `variableCount`, and
`nestedInventoryState=absent|empty|expanded|blocked`; BaseItem-resolved and later stages
also carry `modelType=0|1|2|3`. No source layer is emitted because the current
resolver result does not expose one as an independently validated primitive.

Approved stable failures distinguish catalog unavailability, missing or stale
winner, family/object-key/digest/native-identity mismatch, size or GFF failure,
missing root or dependency BaseItem row, invalid ModelType, dependency
identity/count/byte failure, malformed common/appearance/property/variable or
reference profile through paired-profile rejection, and candidate readback mismatch.
Template IDs, ResRefs, Tags, field values,
localized text, object IDs, hashes, source keys, paths, raw fields or bytes,
credentials, and host paths are prohibited from event fields and metric
labels. A telemetry sink failure must not alter validation, writing,
transaction, rollback, recovery, or publication behavior.

Retained ground-Item `ItemList` additions sourced from the exact current
effective UTI catalog reuse this same event and ordered operation taxonomy.
Resolution and conversion report only the existing bounded
`propertyCount`/`variableCount`, `nestedInventoryState`, `modelType`, duration,
outcome, and stable result codes; retained/new entry counts, source ordinals,
target positions, catalog identities, ResRefs, Tags, digests, object keys,
paths, and raw values are not added. No second event is required, and telemetry
failure remains unable to affect compare-and-swap, candidate writing,
readback, rollback, recovery, or publication.

## 25. Item-blueprint nested-inventory pre-publication extension (2026-08-30)

The implemented additive `itemBlueprintNestedReferenceValidation` event covers
the effective-catalog and immutable-closure gate executed before publishing a
created or updated UTI with non-empty `ItemList` or `Equip_ItemList` references.
Every event carries `contractVersion=item-blueprint-nested-inventory/v1`,
`stage=pre-publication`, `outcome=accepted|rejected`, a stable `reason`,
`inventoryReferenceCount`, `equipmentReferenceCount`,
`uniqueReferenceCount`, and `durationMs`.

Approved stable rejection reasons are
`ITEM_BLUEPRINT_REFERENCE_CATALOG_UNAVAILABLE`,
`ITEM_BLUEPRINT_REFERENCE_INVALID`, and `ITEM_BLUEPRINT_REFERENCE_CYCLE`.
Accepted validation uses `reason=expanded`. ResRefs, template IDs, object keys,
digests, paths, raw fields or bytes, credentials, and host paths are prohibited
from event fields and metric labels. The event is diagnostic only; failure to
emit it must not weaken validation or permit publication of an unresolved,
stale, malformed, or cyclic reference graph.

## 26. Existing Area Store editor-Comment CAS extension (2026-08-30)

The additive `area_store_editor_comment_cas.v1` event covers exact paired
source parsing, immutable-ordinal planning, candidate write, and readback.
Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous paired Store lists,
wrong struct type or cardinality, missing/duplicated/mistyped `Comment`, invalid
or over-budget source/target text, stale or unchanged pair, wrong family or
ordinal, duplicate mutation, deletion collision, preservation drift, and
candidate readback mismatch. Comment contents, object identities, ordinals,
hashes, paths, source/storage keys, raw fields or bytes, credentials, and host
paths are prohibited from event fields and metric labels. A telemetry sink
failure must not alter validation, writing, transaction, rollback, recovery,
or publication behavior.

## 27. Existing Area Store commerce-vector CAS extension (2026-08-30)

The implemented additive `area_store_commerce_cas.v1` event covers exact source parsing,
complete-vector admission, immutable-ordinal planning, candidate write, and
readback. Required low-cardinality fields are
`operation=parse_source|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing, duplicated, differently cased,
or wrongly typed commerce fields; a noncanonical `BlackMarket` byte; invalid,
partial, stale, or unchanged vectors; wrong family or ordinal; duplicate
mutation; deletion collision; preservation drift; and candidate readback
mismatch. Commerce values, object identities, ordinals, hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, writing, transaction, rollback, recovery, or publication
behavior.

## 28. Existing Area Store script-ResRef CAS extension (2026-08-30)

The implemented additive `area_store_script_resrefs_cas.v1` event covers exact source
parsing, complete-pair admission, immutable-ordinal planning, candidate write,
and readback. Required low-cardinality fields are
`operation=parse_source|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing, duplicated, differently cased,
wrongly typed, invalid, or over-length `OnOpenStore`/`OnStoreClosed` fields;
partial, stale, or unchanged pairs; noncanonical target ResRefs; wrong family
or ordinal; duplicate mutation; deletion collision; preservation drift; and
candidate readback mismatch. Script ResRefs, object identities, ordinals,
hashes, paths, source/storage keys, raw fields or bytes, credentials, and host
paths are prohibited from event fields and metric labels. A telemetry sink
failure must not alter validation, writing, transaction, rollback, recovery,
or publication behavior.

## 29. Existing Area Store variable-table CAS extension (2026-08-30)

The implemented additive `area_store_variable_table_cas.v1` event covers exact source
parsing, bounded-profile admission, immutable-ordinal planning, candidate
write, and typed ordered readback. Required low-cardinality fields are
`operation=parse_source|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `entryCount`, and
`durationMs`.

Approved stable failures distinguish malformed or ambiguous native
`VarTable`, wrong case or native type, unsupported variable type, exceeded
entry or text budget, stale or unchanged table, wrong family or ordinal,
duplicate mutation, deletion collision, preservation drift, and candidate
readback mismatch. Variable names and values, object identities, ordinals,
hashes, paths, source/storage keys, raw fields or bytes, credentials, and host
paths are prohibited from event fields and metric labels. A telemetry sink
failure must not alter validation, mutation, transaction, rollback, recovery,
or publication behavior.

## 30. Existing Area Store restrictions CAS extension (2026-08-31)

The additive `area_store_restrictions_cas.v1` event covers exact source
parsing, effective-`baseitems.2da` binding, bounded-profile admission,
immutable-ordinal planning, candidate write, and ordered pair readback.
Required low-cardinality fields are
`operation=parse_source|bind_catalog|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `entryCount`,
`changedListCount`, and `durationMs`.

Approved stable failures distinguish malformed or ambiguous native lists,
wrong label/type/entry struct, missing or wrongly typed `BaseItem`, negative or
out-of-catalog values, exceeded entry budget, catalog drift, stale or unchanged
pair, wrong family or ordinal, duplicate mutation, deletion collision,
preservation drift, and candidate readback mismatch. Base-item IDs/names,
object identities, ordinals, table hashes, paths, source/storage keys, raw
fields or bytes, credentials, and host paths are prohibited from event fields
and metric labels. A telemetry sink failure must not alter validation,
mutation, transaction, rollback, recovery, or publication behavior.

## 31. Existing Area Store inventory CAS extension (2026-08-31)

The additive `area_store_inventory_cas.v1` event covers exact five-bucket
source parsing, effective-`baseitems.2da` binding, bounded-profile admission,
immutable-ordinal planning, deterministic repository packing, candidate
write, and complete readback. Required low-cardinality fields are
`operation=parse_source|bind_catalog|admit_profile|plan|pack|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `bucketCount`, `entryCount`,
`changedEntryCount`, and `durationMs`.

Approved stable failures distinguish malformed or ambiguous StoreList/bucket/
ItemList shape, wrong bucket or child struct type, missing/duplicate/wrongly
typed identity or repository fields, prohibited mode fields, invalid Infinite,
exceeded entry budget, missing or invalid BaseItem row dimensions, catalog
drift, stale or unchanged pair, duplicate source selection, cross-bucket move,
packing-page exhaustion, wrong family or ordinal, duplicate mutation, deletion
collision, preservation drift, and candidate readback mismatch. ResRefs,
BaseItem IDs, object identities, ordinals, table hashes, paths, source/storage
keys, coordinates, dimensions, raw fields or bytes, credentials, and host
paths are prohibited from event fields and metric labels. A telemetry sink
failure must not alter validation, packing, mutation, transaction, rollback,
recovery, or publication behavior.

## 32. Existing Area Creature tail-only class-slot resize CAS extension (2026-08-31)

The additive `area_creature_class_slot_resize_cas.v1` event covers exact
complete-graph parsing and fingerprinting, tail-shape admission, destructive
truncation confirmation, current `classes.2da` and `packages.2da` admission,
HP coupling, candidate writing, and readback. Required low-cardinality fields
are
`operation=parse_source|fingerprint|admit_resize|validate_confirmation|resolve_classes|resolve_packages|validate_hp_coupling|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `sourceClassCount`,
`targetClassCount`, `resizeMode=append_tail|truncate_tail`,
`appendedSlotCount`, `removedSlotCount`, optional
`classesSourceLayer=module|hak|vanilla`, optional
`packagesSourceLayer=module|hak|vanilla`, and `durationMs`.

Approved stable failures distinguish missing or ambiguous `ClassList`, stale
graph fingerprint or source vectors, a zero/out-of-range count, unchanged
cardinality, non-tail shape, retained-prefix drift, duplicate or non-admitted
target class, table lookup/digest/count drift, an invalid confirmation flag,
missing or noncanonical `StartingPackage`, package incompatibility, missing or
inconsistent HP coupling, derived HP mismatch, preservation drift, and
candidate readback mismatch. Class IDs, levels, package and HP values, object
identities, ordinals, hashes, paths, source/storage keys, raw fields or bytes,
credentials, and host paths are prohibited from event fields and metric
labels. A telemetry sink failure must not alter validation, mutation,
transaction, rollback, recovery, or publication behavior.

## 33. Existing Area Trigger Tag CAS extension (2026-08-31)

The additive `area_trigger_tag_cas.v1` event covers exact source parsing,
presence/type validation, immutable-ordinal planning, candidate write, and
readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native Tag,
wrong-case or type, invalid source or target value, stale source, unchanged
pair, wrong family or ordinal, duplicate mutation, deletion collision,
preservation drift, and candidate readback mismatch. Tag contents, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields or bytes, credentials,
and host paths are prohibited from event fields and metric labels. A telemetry
sink failure must not alter validation, mutation, transaction, rollback,
recovery, or publication behavior.

## 35. Existing Area Encounter Active CAS extension (2026-08-31)

The additive `area_encounter_active_cas.v1` event covers exact source parsing,
canonical-byte admission, immutable-ordinal planning, candidate write, and
readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native Active,
wrong-case or type, a noncanonical source/target byte, stale source, unchanged
pair, wrong family or ordinal, duplicate mutation, deletion collision,
preservation drift, and candidate readback mismatch. Active values, object
IDs, ordinals, hashes, paths, source/storage keys, raw fields or bytes,
credentials, and host paths are prohibited from event fields and metric
labels. A telemetry sink failure must not alter validation, mutation,
transaction, rollback, recovery, or publication behavior.

## 34. Existing Area Encounter Tag CAS extension (2026-08-31)

The additive `area_encounter_tag_cas.v1` event covers exact source parsing,
presence/type validation, immutable-ordinal planning, candidate write, and
readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native Tag,
wrong-case or type, invalid source or target value, stale source, unchanged
pair, wrong family or ordinal, duplicate mutation, deletion collision,
preservation drift, and candidate readback mismatch. Tag contents, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields or bytes, credentials,
and host paths are prohibited from event fields and metric labels. A telemetry
sink failure must not alter validation, mutation, transaction, rollback,
recovery, or publication behavior.

## 36. Existing Area Encounter PlayerOnly CAS extension (2026-08-31)

The additive `area_encounter_player_only_cas.v1` event covers exact source
parsing, canonical-byte admission, immutable-ordinal planning, candidate
write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native PlayerOnly,
wrong-case or type, a noncanonical source/target byte, stale source, unchanged
pair, wrong family or ordinal, duplicate mutation, deletion collision,
preservation drift, and candidate readback mismatch. PlayerOnly values, object
IDs, ordinals, hashes, paths, source/storage keys, raw fields or bytes,
credentials, and host paths are prohibited from event fields and metric
labels. A telemetry sink failure must not alter validation, mutation,
transaction, rollback, recovery, or publication behavior.

## 37. Existing Area Encounter Reset CAS extension (2026-08-31)

The additive `area_encounter_reset_cas.v1` event covers exact source parsing,
canonical-byte admission, immutable-ordinal planning, candidate write, and
readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native Reset,
wrong-case or type, a noncanonical source/target byte, stale source, unchanged
pair, wrong family or ordinal, duplicate mutation, deletion collision,
preservation drift, and candidate readback mismatch. Reset values, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields or bytes, credentials,
and host paths are prohibited from event fields and metric labels. A telemetry
sink failure must not alter validation, mutation, transaction, rollback,
recovery, or publication behavior.

## 38. Existing Area Encounter ResetTime CAS extension (2026-08-31)

The additive `area_encounter_reset_time_cas.v1` event covers exact source
parsing, bounded-INT admission, immutable-ordinal planning, candidate write,
and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native ResetTime,
wrong-case or type, an out-of-range source/target integer, stale source,
unchanged pair, wrong family or ordinal, duplicate mutation, deletion
collision, preservation drift, and candidate readback mismatch. ResetTime
values, object IDs, ordinals, hashes, paths, source/storage keys, raw fields or
bytes, credentials, and host paths are prohibited from event fields and metric
labels. A telemetry sink failure must not alter validation, mutation,
transaction, rollback, recovery, or publication behavior.

## 39. Existing Area Encounter SpawnOption CAS extension (2026-08-31)

The additive `area_encounter_spawn_option_cas.v1` event covers exact source
parsing, two-row INT admission, immutable-ordinal planning, candidate write,
and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native SpawnOption,
wrong-case or type, a noncanonical source/target index, stale source,
unchanged pair, wrong family or ordinal, duplicate mutation, deletion
collision, preservation drift, and candidate readback mismatch. SpawnOption
values and labels, object IDs, ordinals, hashes, paths, source/storage keys,
raw fields or bytes, credentials, and host paths are prohibited from event
fields and metric labels. A telemetry sink failure must not alter validation,
mutation, transaction, rollback, recovery, or publication behavior.

## 40. Existing Area Encounter Respawns CAS extension (2026-08-31)

The additive `area_encounter_respawns_cas.v1` event covers exact source
parsing, finite-or-sentinel INT admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native Respawns,
wrong-case or type, a source/target integer outside `-1|0..32000`, stale
source, unchanged pair, wrong family or ordinal, duplicate mutation, deletion
collision, preservation drift, and candidate readback mismatch. Respawns
values and Infinite state, object IDs, ordinals, hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 41. Existing Area Encounter creature-count pair CAS extension (2026-08-31)

The additive `area_encounter_creature_counts_cas.v1` event covers exact source
parsing, bounded coherent-pair admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native
MaxCreatures/RecCreatures, wrong-case or type, an out-of-range or incoherent
source/target pair, stale source, unchanged pair, wrong family or ordinal,
duplicate mutation, deletion collision, preservation drift, and candidate
readback mismatch. Count values, object IDs, ordinals, hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 42. Existing Area Encounter event-script ResRef tuple CAS extension (2026-09-01)

The additive `area_encounter_script_resrefs_cas.v1` event covers exact source
parsing, complete five-member tuple admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish a missing, partial, or ambiguous native
tuple; wrong-case labels or wrong GFF types; a malformed, over-budget, or
non-canonical target ResRef; stale source; unchanged tuple; wrong family or
ordinal; duplicate mutation; deletion collision; preservation drift; and
candidate readback mismatch. Script ResRefs, object IDs, ordinals, hashes,
paths, source/storage keys, raw fields or bytes, credentials, and host paths
are prohibited from event fields and metric labels. A telemetry sink failure
must not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 43. Existing Area Encounter catalog-bound Faction CAS extension (2026-09-01)

The additive `area_encounter_faction_cas.v1` event covers exact source
parsing, module-faction catalog binding, immutable-ordinal planning, fresh
catalog revalidation, candidate write, and readback. Required low-cardinality
fields are `operation=parse_source|bind_catalog|plan|revalidate_catalog|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native `Faction`,
wrong-case label or GFF type, row zero, out-of-catalog source or target, stale
catalog digest/count, unchanged pair, wrong family or ordinal, duplicate
mutation, deletion collision, preservation drift, and candidate readback
mismatch. Faction IDs/names, object IDs, ordinals, catalog hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 44. Existing Area Encounter catalog-bound Difficulty pair CAS extension (2026-09-01)

The additive `area_encounter_difficulty_cas.v1` event covers exact source-pair
parsing, effective ordered `encdifficulty.2da` binding, immutable-ordinal
planning, fresh catalog revalidation, two-field candidate write, and readback.
Required low-cardinality fields are
`operation=parse_source|bind_catalog|plan|revalidate_catalog|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedPairCount`, and
`durationMs`.

Approved stable failures distinguish a missing, partial, or ambiguous native
`Difficulty`/`DifficultyIndex` pair; wrong-case labels or wrong GFF types;
out-of-range or catalog-incoherent source/target pairs; stale catalog
digest/count; unchanged pair; wrong family or ordinal; duplicate mutation;
deletion collision; preservation drift; and candidate readback mismatch.
Difficulty values, row indices, labels, STRREFs, object IDs, ordinals, catalog
hashes, paths, source/storage keys, raw fields or bytes, credentials, and host
paths are prohibited from event fields and metric labels. A telemetry sink
failure must not alter validation, mutation, transaction, rollback, recovery,
or publication behavior.

## 45. Existing Area Encounter inline LocalizedName CAS extension (2026-09-01)

The additive `area_encounter_localized_name_cas.v1` event covers exact source
storage parsing, bounded inline-profile admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native
`LocalizedName`, wrong-case label or GFF type, unsupported TLK/multilingual or
nonzero-identifier storage, malformed or over-budget text, stale source,
unchanged pair, wrong family or ordinal, duplicate mutation, deletion
collision, preservation drift, and candidate readback mismatch. Name text,
base64, raw bytes, TLK text, object IDs, ordinals, hashes, paths,
source/storage keys, credentials, and host paths are prohibited from event
fields and metric labels. A telemetry sink failure must not alter validation,
mutation, transaction, rollback, recovery, or publication behavior.

## 46. Existing Area Encounter paired-GIC editor Comment CAS extension (2026-09-01)

The additive `area_encounter_editor_comment_cas.v1` event covers exact paired
source parsing, bounded Comment admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish a missing, ambiguous, wrong-case, or
wrongly typed native paired Comment; cardinality or family mismatch; malformed,
NUL-bearing, or over-budget text; stale source; unchanged pair; wrong ordinal;
duplicate mutation; deletion collision; preservation drift; and candidate
readback mismatch. Comment contents, object IDs, ordinals, hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 47. Existing Area Encounter ordered VarTable CAS extension (2026-09-01)

The additive `area_encounter_variable_table_cas.v1` event covers exact source
parsing, bounded ordered-entry admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedEntryCount`, and
`durationMs`.

Approved stable failures distinguish a missing, ambiguous, wrong-case, or
wrongly typed native `VarTable`; a non-zero entry struct type; missing,
ambiguous, wrong-case, or wrongly typed `Name`, `Type`, or `Value`; unsupported
type discriminant; entry-count, name, string, aggregate-byte, signed-int32, or
exact-float32 budget failure; NUL-bearing text; family mismatch; stale source;
wrong ordinal; duplicate mutation; deletion collision; preservation drift; and
candidate readback mismatch. Variable names and values, object IDs, ordinals,
hashes, paths, source/storage keys, raw fields or bytes, credentials, and host
paths are prohibited from event fields and metric labels. A telemetry sink
failure must not alter validation, mutation, transaction, rollback, recovery,
or publication behavior.

## 48. Existing Area Encounter CreatureList.SingleSpawn vector CAS extension (2026-09-01)

The additive `area_encounter_creature_single_spawn_cas.v1` event covers exact
source-list parsing, immutable identity admission, complete-vector CAS
projection, immutable-ordinal replanning, nested byte-only candidate write,
and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedEntryCount`, and
`durationMs`.

Approved stable failures distinguish a missing, ambiguous, wrong-case, or
wrongly typed native `CreatureList`; a non-zero entry struct type; a wrong
field count, order, label, or GFF type; invalid signed-int32 Appearance,
non-binary32 CR, invalid ResRef shape, or non-boolean SingleSpawn byte;
entry-count overflow; source/target cardinality or identity drift; stale
source; wrong family or ordinal; duplicate mutation; deletion collision;
preservation drift; and candidate readback mismatch. ResRefs, Appearance and
CR values, object IDs, ordinals, hashes, paths, source/storage keys, raw
fields or bytes, credentials, and host paths are prohibited from event fields
and metric labels. A telemetry sink failure must not alter validation,
mutation, transaction, rollback, recovery, or publication behavior.

## 49. Existing Area Encounter ordered SpawnPointList structural CAS extension (2026-09-01)

The additive `area_encounter_spawn_point_list_cas.v1` event covers exact
source-list parsing, complete-vector admission, immutable-ordinal planning,
canonical structural candidate write, and readback. Required low-cardinality
fields are `operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedEntryCount`, and
`durationMs`.

Approved stable failures distinguish a missing, ambiguous, wrong-case, or
wrongly typed native `SpawnPointList`; a non-`2` entry struct type; wrong field
count, order, label, or GFF type; non-finite or non-binary32 values; entry-count
overflow; stale or unchanged source/target vectors; a populated-list origin
transform collision; wrong family or ordinal; duplicate mutation; deletion
collision; preservation drift; and candidate readback mismatch. Coordinates,
orientation values, object IDs, ordinals, hashes, paths, source/storage keys,
raw fields or bytes, credentials, and host paths are prohibited from event
fields and metric labels. A telemetry sink failure must not alter validation,
mutation, transaction, rollback, recovery, or publication behavior.

## 50. Existing Area Encounter ordered CreatureList structural CAS extension (2026-09-01)

The additive `area_encounter_creature_list_structural_cas.v1` event supersedes
the narrower SingleSpawn-only classification for new writes. It covers exact
source-list parsing, structural-target admission, effective UTC resolution,
catalog identity and tuple verification, complete-list planning, canonical
nested-list write, and candidate/persisted readback. Required low-cardinality
fields are `operation=parse_source|resolve_blueprint|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `targetEntryCount`,
`retainedEntryCount`, `blueprintEntryCount`, `changedEntryCount`, and
`durationMs`.

Approved stable failures distinguish a malformed native list or entry, stale
source vector, duplicate retained source index, malformed structural binding,
missing or stale effective catalog winner, source byte/hash/size drift,
unsupported UTC identity, `TemplateResRef`/`Appearance_Type`/
`ChallengeRating` tuple mismatch, entry-count overflow, wrong family or
ordinal, deletion collision, preservation drift, and candidate readback
mismatch. ResRefs, template IDs, source keys, hashes, object IDs, paths,
ordinals, Appearance, CR, raw GFF fields or bytes, credentials, and host paths
are prohibited from event fields and metric labels. A telemetry sink failure
must not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 51. Existing Area Waypoint Tag CAS extension (2026-09-01)

The additive `area_waypoint_tag_cas.v1` event covers exact source parsing,
presence/type validation, immutable-ordinal planning, candidate write, and
readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native Tag,
wrong-case or type, invalid source or target value, stale source, unchanged
pair, wrong family or ordinal, duplicate mutation, deletion collision,
preservation drift, and candidate readback mismatch. Tag contents, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields or bytes, credentials,
and host paths are prohibited from event fields and metric labels. A telemetry
sink failure must not alter validation, mutation, transaction, rollback,
recovery, or publication behavior.

## 52. Existing Area Waypoint inline LocalizedName CAS extension (2026-09-01)

The additive `area_waypoint_localized_name_cas.v1` event covers exact source
storage parsing, bounded inline-profile admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native
`LocalizedName`, wrong-case or type, unsupported localized-string profile,
invalid source or target value, stale source, unchanged pair, wrong family or
ordinal, duplicate mutation, deletion collision, preservation drift, and
candidate readback mismatch. Name text, base64, raw bytes, TLK text, object
IDs, ordinals, hashes, paths, source/storage keys, credentials, and host paths
are prohibited from event fields and metric labels. A telemetry sink failure
must not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 53. Existing Area Waypoint inline Description CAS extension (2026-09-01)

The additive `area_waypoint_description_cas.v1` event covers exact source
storage parsing, bounded inline-profile admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish missing or ambiguous native
`Description`, wrong-case or type, unsupported localized-string profile,
invalid source or target value, stale source, unchanged pair, wrong family or
ordinal, duplicate mutation, deletion collision, preservation drift, and
candidate readback mismatch. Description text, base64, raw bytes, TLK text,
object IDs, ordinals, hashes, paths, source/storage keys, credentials, and host
paths are prohibited from event fields and metric labels. A telemetry sink
failure must not alter validation, mutation, transaction, rollback, recovery,
or publication behavior.

## 54. Existing Area Waypoint paired-GIC editor Comment CAS extension (2026-09-01)

The additive `area_waypoint_editor_comment_cas.v1` event covers exact paired
source parsing, bounded Comment admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish a missing, ambiguous, wrong-case, or
wrongly typed native paired Comment; cardinality or family mismatch; malformed,
NUL-bearing, or over-budget text; stale source; unchanged pair; wrong ordinal;
duplicate mutation; deletion collision; preservation drift; and candidate
readback mismatch. Comment contents, object IDs, ordinals, hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 55. Existing Area Waypoint MapNote vector CAS extension (2026-09-01)

The additive `area_waypoint_map_note_cas.v1` event covers exact source parsing,
complete `HasMapNote`/`MapNote`/`MapNoteEnabled` admission, immutable-ordinal
planning, candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount` (`0..3`),
and `durationMs`.

Approved stable failures distinguish a missing, partial, ambiguous,
wrong-case, wrongly typed, non-binary, TLK-backed, multilingual, malformed,
non-ASCII, or over-budget vector; stale source; unchanged vector; wrong family
or ordinal; duplicate mutation; deletion collision; preservation drift; and
candidate readback mismatch. Map-note text, base64, raw bytes, object IDs,
ordinals, hashes, paths, source/storage keys, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 56. Existing Area Waypoint ordered VarTable CAS extension (2026-09-01)

The additive `area_waypoint_variable_table_cas.v1` event covers exact source
list parsing, complete ordered-vector admission, immutable-ordinal planning,
canonical candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedEntryCount`, and
`durationMs`.

Approved stable failures distinguish an ambiguous, wrong-case, or wrongly
typed native `VarTable`; a non-zero entry struct type; wrong field count,
label, or GFF type; unsupported native variable type; malformed or
over-budget name/string data; invalid int32 or non-binary32 float; stale or
unchanged vectors; wrong family or ordinal; duplicate mutation; deletion
collision; preservation drift; and candidate readback mismatch. Variable
names and values, object IDs, ordinals, hashes, paths, source/storage keys,
raw fields or bytes, credentials, and host paths are prohibited from event
fields and metric labels. A telemetry sink failure must not alter validation,
mutation, transaction, rollback, recovery, or publication behavior.

## 57. Existing Area Waypoint Appearance CAS extension (2026-09-01)

The additive `area_waypoint_appearance_cas.v1` event covers exact source Byte
parsing, effective-`waypoint.2da` admission, immutable-ordinal planning,
current-table revalidation, candidate write, and readback. Required
low-cardinality fields are
`operation=parse_source|resolve_table|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount` (`0|1`),
`sourceLayer=module|hak|vanilla|none`, and `durationMs`.

Approved stable failures distinguish a missing, ambiguous, wrong-case, or
wrongly typed native `Appearance`; malformed, absent, stale, or over-budget
effective table; missing source or target physical row; invalid Byte value;
wrong family or ordinal; unchanged pair; duplicate mutation; deletion
collision; preservation drift; and candidate readback mismatch. Display
labels, STRREF text, model ResRefs, object IDs, ordinals, hashes, paths,
source/storage keys, raw table/GFF fields or bytes, credentials, and host paths
are prohibited from event fields and metric labels. A telemetry sink failure
must not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 58. Existing Area Creature SpecAbilityList CAS extension (2026-09-02)

The additive `area_creature_special_ability_list_cas.v1` event covers exact
source-list parsing, effective `spells.2da` resolution, complete-profile
admission, raw-GIT ordinal planning, canonical repeated-entry write, and
candidate/persisted readback. Required low-cardinality fields are
`operation=parse_source|resolve_table|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`,
`changedRowCountBucket=0|1|2_4|5_16|17_plus`, optional
`sourceLayer=module|hak|vanilla`, and `durationMs`.

Approved stable failures distinguish missing or ambiguous native structure,
noncanonical source order/flags/caster levels, opaque siblings, stale source
profile, table lookup failure, table digest/count drift, missing or hidden row,
invalid UserType-specific caster profile, use-count overflow, and candidate or
persisted readback mismatch. Spell IDs, use counts, caster levels, names,
StringRefs, table hashes, object IDs, ordinals, paths, source/storage keys, raw
fields or bytes, credentials, and host paths are prohibited from event fields
and metric labels. A telemetry sink failure must not alter validation,
mutation, transaction, rollback, or recovery behavior.

## 59. Existing Area Trigger paired-GIC editor Comment CAS extension (2026-09-02)

The additive `area_trigger_editor_comment_cas.v1` event covers exact paired
source parsing, bounded Comment admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount`, and
`durationMs`.

Approved stable failures distinguish a missing, ambiguous, wrong-case, or
wrongly typed native paired Comment; cardinality or family mismatch; malformed,
NUL-bearing, or over-budget text; stale source; unchanged pair; wrong ordinal;
duplicate mutation; deletion collision; preservation drift; and candidate
readback mismatch. Comment contents, object IDs, ordinals, hashes, paths,
source/storage keys, raw fields or bytes, credentials, and host paths are
prohibited from event fields and metric labels. A telemetry sink failure must
not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 60. Existing Area Trigger complete event-script ResRef tuple CAS extension (2026-09-02)

The additive `area_trigger_script_resrefs_cas.v1` event covers exact complete-
tuple source parsing, immutable-ordinal planning, candidate write, and
readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount` (`1..7`),
and `durationMs`.

Approved stable failures distinguish a missing, partial, ambiguous, wrong-
case, or wrongly typed native tuple; malformed or noncanonical source/target
ResRefs; stale or unchanged tuples; wrong family or ordinal; duplicate
mutation; deletion collision; preservation drift; and candidate readback
mismatch. Script ResRefs, object IDs, ordinals, hashes, paths, source/storage
keys, raw fields or bytes, credentials, and host paths are prohibited from
event fields and metric labels. A telemetry sink failure must not alter
validation, mutation, transaction, rollback, recovery, or publication
behavior.

## 61. Existing Area Trigger transition-storage tuple CAS extension (2026-09-02)

The additive `area_trigger_transition_storage_cas.v1` event covers exact
complete-tuple source parsing, immutable-ordinal planning, candidate write,
and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedFieldCount` (`1..3`),
and `durationMs`.

Approved stable failures distinguish a missing, partial, ambiguous, wrong-
case, or wrongly typed native tuple; a malformed or over-budget CExoString;
out-of-range Byte or Word values; stale or unchanged tuples; wrong family or
ordinal; duplicate mutation; deletion collision; preservation drift; and
candidate or persisted readback mismatch. Transition values, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields or bytes,
credentials, and host paths are prohibited from event fields and metric
labels. A telemetry sink failure must not alter validation, mutation,
transaction, rollback, recovery, or publication behavior.

## 62. Existing Area Trigger ordered VarTable CAS extension (2026-09-05)

The additive `area_trigger_variable_table_cas.v1` event covers exact source
parsing, bounded ordered-entry admission, immutable-ordinal planning,
candidate write, and readback. Required low-cardinality fields are
`operation=parse_source|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `changedEntryCount`, and
`durationMs`.

Stable failures distinguish malformed or unsupported source, invalid or
unchanged pair, stale expected table, wrong family or ordinal, deletion
collision, duplicate mutation, candidate/persisted readback drift, and
preservation drift. Variable names and values, object IDs, ordinals, hashes,
paths, source/storage keys, raw fields or bytes, credentials, and host paths
are prohibited from event fields and metric labels. A telemetry sink failure
must not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.

## 63. Existing Area Creature class spell-entry replacement CAS extension (2026-09-14)

The additive `area_creature_class_spell_entry_replacement_cas.v1` event covers
exact source parsing, effective `classes.2da` and `spells.2da` resolution,
bounded replacement admission, immutable-ordinal planning, candidate write,
and readback. Required low-cardinality fields are
`operation=parse_source|resolve_tables|admit_profile|plan|write|readback`,
`outcome=succeeded|failed`, stable `resultCode`, `replacementCount`,
`affectedListCount`, `changedFieldCount`, optional
`classesSourceLayer=module|hak|vanilla`, optional
`spellsSourceLayer=module|hak|vanilla`, and `durationMs`.

Stable failures distinguish missing or ambiguous native structure, unsupported
class/list ownership, metamagic source entry, stale source graph, absent or
stale effective table descriptors, malformed table rows, missing/hidden or
same-row target, class-level mismatch, duplicate or noncanonical targets,
wrong family or ordinal, deletion collision, preservation drift, and
candidate/persisted readback mismatch. Spell IDs, source/target pairs, list
paths, object identities, table or graph hashes, display text, StringRefs,
paths, source/storage keys, raw GFF/2DA content, credentials, and host paths
are prohibited from event fields and metric labels. A telemetry sink failure
must not alter validation, mutation, transaction, rollback, recovery, or
publication behavior.
