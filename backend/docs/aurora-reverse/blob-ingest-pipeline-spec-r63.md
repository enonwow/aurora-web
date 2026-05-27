# Blob Ingest Pipeline Spec R63 (Agent E1)

## 1. Cel
Zaprojektowac deterministyczny, idempotentny i restart-safe pipeline:
- dekompilacja -> staging -> sync do SeaweedFS (S3 bucket),
- bez duplikacji artefaktow,
- z recovery po restarcie procesu/workera,
- z audytowalna provenance kazdego blobu.

## 2. Zakres
W zakresie sa:
- kontrakt danych dla ingest job,
- state machine i checkpointy,
- model kluczy obiektow S3,
- algorytm idempotentnego uploadu,
- recovery po restarcie i po partial-failure.

Poza zakresem sa:
- UI,
- implementacja endpointow,
- migracje DB i kod runtime.

## 3. Fundamenty z reverse (wymagania pochodne)
Projekt opiera sie na faktach i kierunku z `C:\Projects\nwn-last-city\Aurora\reverse`:

1. Deterministyczny wybor zrodla i kolejki priorytetow jest wymagany.
   - Evidence: `areas3d_handoff/IMPLEMENTATION_REPORTS_FROM_019e3315.md:367`.

2. No-op nie moze wykonywac write-path (write/backup/tmp/replace); realna mutacja ma isc atomowo.
   - Evidence: `areas3d_handoff/IMPLEMENTATION_REPORTS_FROM_019e3315.md:913`.

3. Istnieje realne ryzyko mieszania pochodzenia danych przy `first-match-wins`; provenance musi byc first-class.
   - Evidence: `areas3d_handoff/ANALYSIS_TASKS_FOR_THREAD_019e3315.md:494, 949, 2544`.

4. Save/update kontrakty sa revision-gated (`expectedRevision`) i maja konflikt stale-write.
   - Evidence: `docs/Core/WEB_AURORA_TECH_STRATEGY.md:215, 264, 4513`.

5. Manifest-first gate jest preferowany przed ciezkim payloadem.
   - Evidence: `docs/Core/WEB_AURORA_TECH_STRATEGY.md:7889, 7952, 8058`.

6. Artifacts powinny byc spinane do rodziny run/session (pipeline fingerprint).
   - Evidence: `docs/Area-ARE-GIT/DOOR_TRANSITION_ARTIFACT_PIPELINE_FINGERPRINT_2026-05-20.md:7, 17`.

7. Operacje runtime powinny byc idempotentne (powtorne wywolanie nie psuje stanu).
   - Evidence: `runs/LC_AURORA_RE_RUN_2026-05-20_0152.md:68`.

## 4. Definicje
- `IngestJob`: jedna jednostka przetwarzania (zrodlo + profil + policy).
- `Artifact`: plik po dekompilacji lub po transformacji pipeline.
- `Blob`: byt CAS identyfikowany `sha256(content)`.
- `StageManifest`: lekki manifest etapu (metadata, statystyki, diagnozy, provenance).
- `SyncCommit`: atomowe zatwierdzenie zestawu blobow do bucketu.

## 5. Idempotency Model

### 5.1 Klucz joba
`job_key = sha256(source_fingerprint + profile + toolchain_rev + policy_rev)`

Regula:
- ten sam `job_key` ma zwrocic ten sam rezultat logiczny,
- powtorne uruchomienie ma byc `resume`, nie nowy niezalezny run.

### 5.2 Klucz blobu
`blob_key = sha256(bytes)`

Regula:
- ten sam content zawsze mapuje na ten sam obiekt w S3,
- brak write jesli blob juz istnieje i checksum metadata pasuje.

### 5.3 Klucz commitu
`commit_key = sha256(sorted(blob_keys) + stage_manifest_hash + policy_rev)`

Regula:
- commit jest immutable,
- pointer `latest/<dataset>` aktualizujemy CAS-em (revision gate).

## 6. Model danych (trwale checkpointy)

### 6.1 Tabele logiczne
1. `blob_ingest_jobs`
- `job_key` (unique)
- `status` (`queued|running|staged|syncing|committed|failed|aborted`)
- `expected_revision`
- `actual_revision`
- `lease_owner`
- `lease_expires_at`
- `created_at`, `updated_at`

2. `blob_ingest_artifacts`
- `job_key`
- `artifact_path`
- `artifact_kind`
- `artifact_hash`
- `size_bytes`
- `stage` (`decompiled|staged|synced`)
- unique(`job_key`, `artifact_hash`, `artifact_kind`)

3. `blob_ingest_checkpoints`
- `job_key`
- `step_name`
- `step_seq`
- `checkpoint_payload_json`
- `completed_at`
- unique(`job_key`, `step_name`)

4. `blob_ingest_events` (append-only)
- `job_key`
- `event_seq`
- `event_type`
- `payload_json`
- `created_at`

5. `blob_sync_objects`
- `blob_key`
- `s3_key`
- `etag`
- `checksum_sha256`
- `first_seen_job_key`
- unique(`blob_key`)

## 7. Bucket layout (SeaweedFS S3)
Zakladany namespace:

- `cas/blobs/sha256/<aa>/<bb>/<full_sha256>.bin`
- `cas/manifests/<job_key>/stage-manifest.json`
- `commits/<dataset>/<commit_key>.json`
- `refs/<dataset>/latest.json`

Reguly:
- obiekty `cas/*` i `commits/*` sa immutable,
- `refs/*/latest.json` jest jedynym mutowalnym pointerem,
- `latest.json` aktualizujemy tylko gdy `expected_revision` pasuje.

## 8. Flow end-to-end

### Krok 0: Acquire lease
- Worker robi `compare-and-set` statusu `queued|failed(retryable)` -> `running`.
- Ustawia lease TTL (np. 60s) i heartbeat co 15s.

### Krok 1: Decompile
- Wykonuje dekompilacje wejscia do workspace tymczasowego.
- Dla kazdego artefaktu liczy `sha256`, size, mime, provenance.
- Zapisuje checkpoint `decompile_done`.

### Krok 2: Stage manifest (manifest-first)
- Generuje `stage-manifest.json` zawierajacy:
  - source fingerprint,
  - lista artefaktow + hashe,
  - diag summary,
  - policy/profile/toolchain revision.
- Liczy `stage_manifest_hash`.
- Zapisuje checkpoint `manifest_done`.

### Krok 3: Plan sync delta
- Dla kazdego `blob_key` sprawdza lokalna tablice `blob_sync_objects`.
- Jesli nieznany, opcjonalnie HEAD w S3 na docelowym `s3_key`.
- Buduje `sync_plan` = `upload[] + already_present[]`.
- Zapisuje checkpoint `sync_plan_done`.

### Krok 4: Upload CAS blobs
- Upload tylko dla `upload[]`.
- Dla kazdego obiektu:
  - PUT do `cas/blobs/...`,
  - metadata: `x-amz-meta-sha256`, `x-amz-meta-job-key`, `x-amz-meta-source-fingerprint`.
- Po sukcesie upsert do `blob_sync_objects`.
- Zapisuje checkpoint `upload_done`.

### Krok 5: Publish commit
- Tworzy immutable `commits/<dataset>/<commit_key>.json`.
- Commit zawiera: blob list, manifest hash, job key, timestamp, diagnostics summary.
- Zapisuje checkpoint `commit_object_done`.

### Krok 6: Move latest ref (revision gate)
- Odczytuje `refs/<dataset>/latest.json` -> `actual_revision`.
- Jezeli `actual_revision != expected_revision`, status `failed_conflict` (retry przez rebase planu).
- Jezeli zgodny: zapisuje nowy `latest.json` z `revision = revision + 1` i `commit_key`.
- Status joba: `committed`.

## 9. Recovery po restarcie

### 9.1 Restart workera
- Nowy worker skanuje `blob_ingest_jobs` ze statusem `running` i `lease_expires_at < now()`.
- Przejmuje job lease CAS-em.
- Odtwarza ostatni checkpoint i wznawia od nastepnego kroku.

### 9.2 Restart miedzy uploadami
- Resume bierze `sync_plan` z checkpointu.
- Dla kazdego blobu:
  - jesli jest w `blob_sync_objects`, pomija upload,
  - jesli brak wpisu, HEAD/verify metadata; przy zgodnosci dopisuje wpis i pomija PUT,
  - inaczej ponawia PUT.

### 9.3 Restart po `commit_object_done`, przed update `latest`
- Resume sprawdza czy `commits/<dataset>/<commit_key>.json` istnieje.
- Jesli tak: przechodzi od razu do Kroku 6 (`latest` CAS update).
- Gwarancja: brak duplikacji commit objects (identyczny `commit_key`).

## 10. Zasady atomowosci i no-op
1. Zapis checkpointu jest atomowy (single row upsert w transakcji).
2. Kazdy krok jest replay-safe.
3. No-op sync (`upload[]` puste i `latest` juz wskazuje `commit_key`) konczy sie `committed_no_change`.
4. Przy no-op nie wykonujemy mutacji pointera ani write-pathu ubocznego.

## 11. Failure policy

### 11.1 Retryable
- timeout, 5xx S3, lease preemption race, network reset.
- backoff: 1s, 2s, 4s, 8s, max 60s, max attempts per step = 8.

### 11.2 Non-retryable
- checksum mismatch po uploadzie,
- malformed manifest,
- revision conflict bez strategii rebase,
- authz failure bucket write.

### 11.3 Conflict handling
- `latest` revision conflict -> status `failed_conflict`.
- Operator/queue moze odpalic `rebase-and-retry` (nowy expected revision, ten sam CAS blob set).

## 12. Obserwowalnosc
Metryki minimalne:
- `blob_ingest_jobs_total{status}`
- `blob_ingest_step_duration_ms{step}`
- `blob_ingest_resume_total`
- `blob_ingest_uploaded_bytes_total`
- `blob_ingest_deduplicated_blobs_total`
- `blob_ingest_revision_conflicts_total`

Logi (structured):
- `job_key`, `step`, `attempt`, `lease_owner`, `checkpoint_seq`, `blob_key`, `s3_key`, `commit_key`, `revision_before`, `revision_after`.

## 13. Kontrakt minimalny API/worker
1. `StartIngest(source_fingerprint, profile, policy_rev, expected_revision?) -> job_key`
2. `ResumeIngest(job_key)`
3. `GetIngestStatus(job_key)`
4. `AbortIngest(job_key, reason)`
5. `RebaseAndRetry(job_key, new_expected_revision)`

## 14. Acceptance criteria (R63)
1. Powtorne uruchomienie tego samego `job_key` nie tworzy nowych blobow dla identycznych bytes.
2. Restart w dowolnym kroku od 1 do 6 nie psuje spojnosc i finalnie prowadzi do jednego `commit_key`.
3. Konflikt `latest` revision jest wykrywany deterministycznie i nie nadpisuje cudzego commitu.
4. Dla no-op sync nie ma dodatkowych write operacji.
5. Kazdy blob i commit ma audytowalna provenance (`source_fingerprint`, `policy_rev`, `toolchain_rev`, `job_key`).

## 15. Otwarte decyzje implementacyjne
1. Czy `latest` revision gate trzymamy w DB, w obiekcie `refs/.../latest.json`, czy hybrydowo.
2. Czy wymagamy twardo conditional PUT (`If-None-Match`) czy fallback na HEAD+CAS lock aplikacyjny.
3. Jak agresywnie czyścic osierocone multipart uploady (TTL i scheduler cleanup).
4. Czy checksum canonicalny to tylko SHA-256, czy SHA-256 + size + mime tuple.
