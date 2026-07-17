# Hex Processing Ports Spec R63 (Agent M1)

Data: 2026-05-24
Status: Draft (target architecture)
Zakres: docelowy podzial hex ports/adapters dla processingu `placeable`, `creature`, `area` w etapach `ingest -> parser -> enrichment -> publish`.

## 1. Cel

Zdefiniowac jeden, spojny podzial heksagonalny dla processingu, tak aby:
1. `application` orkiestruje pipeline bez zaleznosci do I/O,
2. parsery i enrichment byly wymienialne adapterami,
3. publish byl revision-gated i idempotentny,
4. `placeable`, `creature`, `area` dzielily wspolne mechanizmy ingest/telemetry/lock, ale mialy osobne porty domenowe.

## 2. Evidence baseline (reverse + backend)

### 2.1 Reverse
1. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Areas3D-Audits\AREAS3D_RE_AREA_TILESET_PIPELINE_AUDYT_2026-05-18.md`
- flow area: `are_parser -> set selection -> area_compose -> export_area`,
- ryzyko source mixing i potrzeba source-locked resolution.

2. `C:\Projects\nwn-last-city\Aurora\reverse\creatures_ultra\06_impl_contract_seed.md`
- creature lane: parse z `GIT Creature List`, preserve-first, revisioned edit pattern.

3. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Placeables\AURORA_RE_PLACEABLE_OBJECT_PROPERTIES_2026-05-18.md`
- placeable: overlay `UTP -> GIT`, strict token/transform boundaries.

4. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\WEB_AURORA_TECH_STRATEGY.md`
- manifest-first gating, expectedRevision gating, preserve-first write boundaries.

### 2.2 Backend
1. `C:\Projects\aurora-web-backend\backend\docs\architecture\hexagonal-architecture.md`
- model `inbound -> application -> ports -> outbound`.

2. `C:\Projects\aurora-web-backend\backend\src\modules\runtime-settings\application\runtime-settings-bootstrap.service.ts`
- istnieje realny wzorzec portow ingest: `PACKED_MODULE_EXTRACTOR`, `MODULE_BLOB_STORAGE`, `RUNTIME_SETTINGS_REPOSITORY`.

3. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\blob-ingest-pipeline-spec-r63.md`
- checkpoint/recovery/idempotency model dla ingest.

4. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\placeable-classification-spec-r63.md`
- klasyfikacja `placeable/door/vfx` jako oddzielny enrichment contract.

5. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\creature-enrichment-spec-r63.md`
- enrichment `UTC/2DA/TLK/HAK` jako osobny lane.

6. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\area-composition-spec-r63.md`
- area composition `ARE+GIT` oraz migracja do `composition.*`.

7. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-observability-slo-agent-r15.md`
- stage-based telemetry i event taxonomy.

## 3. Target processing topology

## 3.1 Inbound adapters
1. `ProcessingPlaceableController` (`/processing/placeable`).
2. `ProcessingCreatureController` (`/processing/creature`).
3. `ProcessingAreaController` (`/processing/area`).
4. `ProcessingJobWorkerAdapter` (queue/async consumer).
5. `ProcessingRecoveryWorkerAdapter` (resume stale lease/checkpoint).

## 3.2 Application layer (use cases)
1. `StartPlaceableProcessingUseCase`.
2. `StartCreatureProcessingUseCase`.
3. `StartAreaProcessingUseCase`.
4. `ResumeProcessingUseCase`.
5. `GetProcessingStatusUseCase`.
6. `ApplyProcessingResultUseCase`.

Kazdy use case wywola 4 etapy: `ingest`, `parser`, `enrichment`, `publish`.

## 3.3 Outbound adapters
1. file/blob/resource adapters (module source, blob CAS, artifact store),
2. parser adapters (ARE/GIT/UTC/UTP parser engines),
3. enrichment adapters (2DA/TLK/HAK lookup i classifiers),
4. publish adapters (revision gate, writer, outbox/events).

## 4. Port split per stage

## 4.1 Shared core ports (wszystkie pipeline types)

1. `PROCESSING_JOB_REPOSITORY`
- create/update job status, stage status, retry counters.

2. `PROCESSING_CHECKPOINT_REPOSITORY`
- save/load checkpoint payload per stage.

3. `PROCESSING_SOURCE_LOCK_PORT`
- acquire/release lease (`source/module/area/template`).

4. `PROCESSING_TELEMETRY_PORT`
- structured events + metrics + traces wg R15.

5. `PROCESSING_EVENT_PUBLISHER_PORT`
- outbox/event-bus publish po `publish`.

6. `PROCESSING_CLOCK_PORT`
- deterministyczny time source dla replay/test.

## 4.2 Ingest stage ports

1. `MODULE_SOURCE_POLICY_PORT`
- wybiera aktywne zrodlo (`decompiled` vs `packed`) wg policy R63.

2. `MODULE_SOURCE_RESOLVER_PORT`
- buduje source plan (`module/hak/vanilla`) + provenance.

3. `PACKED_MODULE_EXTRACTOR` (reuse z runtime-settings)
- extract gdy packed source aktywne.

4. `MODULE_BLOB_STORAGE` (reuse z runtime-settings)
- snapshot/blob sync dla packed lane.

5. `INGEST_MANIFEST_PORT`
- tworzy manifest-first payload (hashes, diagnostics summary, provenance).

6. `INGEST_DEDUP_PORT`
- CAS/idempotency check (`blob_key`, `job_key`, `commit_key`).

## 4.3 Parser stage ports

1. `PLACEABLE_PARSER_PORT`
- parse `Placeable List` + token diagnostics + transform validity.

2. `CREATURE_PARSER_PORT`
- parse `Creature List` + `TemplateResRef` + orientation/vector fields.

3. `AREA_PARSER_PORT`
- parse `ARE/GIT` (tiles, lists, top-level schema lanes).

4. `PARSER_DIAGNOSTIC_POLICY_PORT`
- `warn|strict` gate dla parser diagnostics.

## 4.4 Enrichment stage ports

1. `PLACEABLE_CLASSIFICATION_PORT`
- mapuje `placeable/door/vfx` + evidence DTO.

2. `CREATURE_ENRICHMENT_PORT`
- overlay `UTC -> GIT`, rozwiazuje `2DA/TLK/HAK`, buduje validation issues.

3. `AREA_COMPOSITION_PORT`
- sklada canonical `composition.*` i migracje legacy `objects[]`.

4. `TWO_DA_LOOKUP_PORT`
- runtime-safe access do 2DA rows/fields.

5. `TLK_LOOKUP_PORT`
- lookup `dialog/dialogf/custom tlk` + locstring resolution.

6. `HAK_PRIORITY_PORT`
- profile/in-line hak ordering i source layer evidence.

## 4.5 Publish stage ports

1. `PROCESSING_ARTIFACT_REPOSITORY`
- zapis immutable artifacts (`scene`, `manifest`, diagnostics, commit payload).

2. `PROCESSING_REVISION_GATE_PORT`
- compare-and-set `expectedRevision`.

3. `PROCESSING_WRITE_TARGET_PORT`
- write/apply do docelowego area/module (temp+replace, backup policy).

4. `PROCESSING_RESULT_PROJECTION_PORT`
- read model dla `GET /processing/*/:jobId`.

5. `PROCESSING_OUTBOX_PORT`
- enqueue `processing.completed|failed|drift|conflict`.

## 5. Pipeline-specific port bundles

## 5.1 Placeable bundle
- `ingest`: shared ingest ports + source policy `placeable`.
- `parser`: `PLACEABLE_PARSER_PORT`.
- `enrichment`: `PLACEABLE_CLASSIFICATION_PORT`.
- `publish`: `PROCESSING_WRITE_TARGET_PORT` scoped do placeable ops.

## 5.2 Creature bundle
- `ingest`: shared ingest ports + source policy `creature`.
- `parser`: `CREATURE_PARSER_PORT`.
- `enrichment`: `CREATURE_ENRICHMENT_PORT` + `TWO_DA_LOOKUP_PORT` + `TLK_LOOKUP_PORT` + `HAK_PRIORITY_PORT`.
- `publish`: revision-gated creature ops (spawn/update/delete lane).

## 5.3 Area bundle
- `ingest`: shared ingest ports + source policy `area`.
- `parser`: `AREA_PARSER_PORT`.
- `enrichment`: `AREA_COMPOSITION_PORT`.
- `publish`: area composition apply/export + versioned projection.

## 6. Adapter mapping (target)

## 6.1 Inbound adapters
1. HTTP/Nest controllers (`processing/*`) z auth matrix R10.
2. Queue consumer adapter dla async start/resume.

## 6.2 Outbound adapters - ingest
1. `FileRuntimeSettingsRepository` -> `RUNTIME_SETTINGS_REPOSITORY` (reuse).
2. `NwnErfPackedModuleExtractorService` -> `PACKED_MODULE_EXTRACTOR` (reuse).
3. `S3ModuleBlobStorageService` -> `MODULE_BLOB_STORAGE` (reuse).
4. `ResourceSourceResolverAdapter` (new) -> `MODULE_SOURCE_RESOLVER_PORT`.
5. `IngestManifestBuilderAdapter` (new) -> `INGEST_MANIFEST_PORT`.

## 6.3 Outbound adapters - parser
1. `PlaceableParserAdapter` (new; parser engine wrapper).
2. `CreatureParserAdapter` (new; GIT/UTC parser wrapper).
3. `AreaParserAdapter` (new; ARE/GIT parser wrapper).

## 6.4 Outbound adapters - enrichment
1. `PlaceableClassificationAdapter` (new).
2. `CreatureEnrichmentAdapter` (new).
3. `AreaCompositionAdapter` (new).
4. `TwoDaLookupAdapter` (new).
5. `TlkLookupAdapter` (new).
6. `HakPriorityResolverAdapter` (new).

## 6.5 Outbound adapters - publish
1. `ArtifactBlobRepositoryAdapter` (new).
2. `RevisionGateAdapter` (new).
3. `AreaWriteTargetAdapter` (new; temp+replace/backup).
4. `OutboxPublisherAdapter` (new).

## 7. Folder/module target layout

```text
backend/src/modules/processing/
  placeable/
    domain/
    application/
      ports/
    adapters/
      inbound/http/
      outbound/parser/
      outbound/enrichment/
      outbound/publish/
  creature/
    domain/
    application/
      ports/
    adapters/
      inbound/http/
      outbound/parser/
      outbound/enrichment/
      outbound/publish/
  area/
    domain/
    application/
      ports/
    adapters/
      inbound/http/
      outbound/parser/
      outbound/enrichment/
      outbound/publish/
  shared/
    application/
      ports/
    adapters/
      outbound/ingest/
      outbound/telemetry/
      outbound/job-store/
```

## 8. Stage contract boundaries (must hold)

1. `ingest` nie wykonuje parse domenowego; zwraca tylko source plan + manifest/provenance.
2. `parser` nie rozstrzyga policy publish; zwraca canonical parse model + diagnostics.
3. `enrichment` nie zapisuje artefaktow writeback; buduje enriched DTO + validation issues.
4. `publish` nie reinterpretuje parser tokenow; uzywa wyjsciowych DTO i revision gate.
5. Wszystkie stage sa restart-safe przez `PROCESSING_CHECKPOINT_REPOSITORY`.

## 9. Observability binding do portow

1. Kazdy stage call emituje `pipeline.stage.started/completed/failed`.
2. `PROCESSING_SOURCE_LOCK_PORT` mapuje lock events (`acquire_*`, `released`, `conflict`).
3. `PROCESSING_REVISION_GATE_PORT` emituje conflict event przy stale revision.
4. `PROCESSING_EVENT_PUBLISHER_PORT` publikuje final state eventy po `publish`.

## 10. R63 implementation order (recommended)

1. Wyciagnac shared ports (`job/checkpoint/lock/telemetry/event`) i modul `processing/shared`.
2. Podlaczyc ingest ports reuse z `runtime-settings` (`PACKED_MODULE_EXTRACTOR`, `MODULE_BLOB_STORAGE`).
3. Dowiezc parser+enrichment dla `area` (najszerszy lane), potem `placeable`, potem `creature`.
4. Na koncu domknac publish apply paths z revision gate i outbox.

## 11. Decision summary

1. `Ingest` jest wspolny i policy-driven, z twarda provenance.
2. `Parser` i `enrichment` sa rozdzielone portami per rodzina (`placeable/creature/area`).
3. `Publish` jest wspolny strukturalnie, ale ma family-specific write adapters.
4. Architektura reuse'uje istniejace porty runtime-settings i dopina brakujace porty processingu bez lamania obecnego wzorca hex.
