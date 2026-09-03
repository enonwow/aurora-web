# Implementation Slice 1: Runtime Settings (R66)

Data: 2026-05-24  
Status: Plan implementacji  
Zakres: backend `runtime-settings` (encje, walidacja, endpointy admin, priorytety ścieżek, testy TDD)

## 1. Podstawa normatywna (r63-r65)

1. `backend/docs/aurora-reverse/admin-runtime-settings-contract-spec-r63.md`
2. `backend/docs/aurora-reverse/module-source-priority-spec-r63.md`
3. `backend/docs/aurora-reverse/path-security-hardening-spec-r63.md`
4. `backend/docs/aurora-reverse/implementation-backlog-r64.md`
5. `backend/docs/aurora-reverse/decision-test-gate-standard-r64.md`
6. `backend/docs/aurora-reverse/resource-precedence-matrix-r65.md`
7. `backend/docs/aurora-reverse/threat-model-decompile-blob-pipeline-r65.md`

## 2. Stan bazowy (AS-IS)

Obecna implementacja pokrywa bazowy kontrakt R63:
1. Endpointy istnieją: `GET /api/v1/settings/runtime`, `PUT /api/v1/settings/runtime`, `GET /api/v1/settings/runtime/haks/resolved`.
2. Jest walidacja schema (`zod`) dla source gate (`moduleDecompiledPath || modulePackedPath`) i `blobStorage.bucket` dla packed path.
3. Bootstrap respektuje priorytet `moduleDecompiledPath` nad `modulePackedPath` oraz robi packed sync tylko w trybie packed-only.
4. Resolver HAK wspiera `disabled|inline|profile|none` oraz deduplikację.

Luki względem r63-r65:
1. Brak `pathSecurity` policy i twardych reguł canonicalizacji/root allowlist/symlink/TOCTOU.
2. Brak split permission dla mutacji pathów (`admin.runtime_paths.write`).
3. `haks/resolved` może zwracać ścieżki bez enforce root policy.
4. Brak jawnych, kontraktowych kodów dla naruszeń path security i bootstrap security fail-fast.
5. Brak pełnego pakietu testów security (`SEC-PATH-*`) oraz klasyfikacji gate P1/P2 dla zmian policy/auth.

## 3. Cel Slice R66

Dostarczyć spójny, security-first runtime settings layer zgodny z R63-R65:
1. Deterministyczny precedence i bootstrap fail-fast bez silent fallback.
2. Twarda walidacja ścieżek i HAK z allowlisted roots.
3. Admin API z rozdzieleniem uprawnień dla zmian high-risk path.
4. Testy TDD (unit/integration/e2e + security matrix) spięte z gate P0/P1/P2.

## 4. Plan implementacji (pakiety prac)

## 4.1 Pakiet A: Encje i model domeny runtime settings

Pliki docelowe:
1. `backend/src/modules/runtime-settings/domain/runtime-settings.types.ts`
2. `backend/src/modules/runtime-settings/domain/runtime-settings.schema.ts`
3. `backend/src/modules/runtime-settings/domain/runtime-settings.defaults.ts`
4. `backend/src/modules/runtime-settings/adapters/outbound/file/file-runtime-settings.repository.ts`

Zakres:
1. Dodać do `RuntimeSettingsPayload` nowy blok `pathSecurity`:
   - `enforce: boolean`
   - `allowUncPaths: boolean`
   - `allowAbsoluteHakEntries: boolean`
   - `symlinkPolicy: "deny" | "allow_inside_root"`
   - `roots.moduleDecompiledRoots: string[]`
   - `roots.modulePackedRoots: string[]`
   - `roots.hakRoots: string[]`
2. Wydzielić jawne typy domenowe:
   - `RuntimeModuleSourceMode = "DECOMPILED_PRIMARY" | "DECOMPILED_ONLY" | "PACKED_SYNC_REQUIRED" | "FAIL_FAST"`
   - `PathSecurityReasonCode` (np. `RUNTIME_PATH_TRAVERSAL_DETECTED`, `RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`, ...).
3. Uzupełnić defaults o bezpieczną konfigurację startową `pathSecurity` (strict, `enforce=true`, `symlinkPolicy=deny`).
4. Dodać migrację kompatybilności w repository:
   - przy odczycie legacy rekordu bez `pathSecurity` wykonać normalizację do nowego kształtu,
   - zapisać rekord już w nowym formacie,
   - bez łamania kontraktu `revision/updatedAt/updatedBy`.

Definition of Done:
1. Runtime settings JSON ma stabilny schema z `pathSecurity`.
2. Legacy plik bez `pathSecurity` podnosi się do nowego kontraktu automatycznie.
3. Brak regresji dla obecnych pól payloadu.

## 4.2 Pakiet B: Walidatory (schema + policy runtime)

Pliki docelowe:
1. `backend/src/modules/runtime-settings/domain/runtime-settings.schema.ts`
2. `backend/src/modules/runtime-settings/application/runtime-settings-path-security.service.ts` (nowy)
3. `backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts`
4. `backend/src/modules/runtime-settings/application/runtime-settings-bootstrap.service.ts`

Zakres:
1. Rozszerzyć walidację `zod` o reguły statyczne:
   - non-empty + trim dla wymaganych rootów `pathSecurity.roots.*`,
   - brak pustych wpisów w root lists,
   - `symlinkPolicy` tylko `deny|allow_inside_root`.
2. Dodać walidator operacyjny (I/O aware) dla ścieżek:
   - canonicalization (`resolve + realpath`),
   - blokada `NUL`/control chars,
   - detekcja traversal (`..` + warianty separatorów),
   - root allowlist check (`candidateCanon` within `rootCanon`),
   - policy absolute HAK entries,
   - symlink/junction policy,
   - hook pod TOCTOU re-check przed odczytem pliku.
3. Spiąć walidator z flow:
   - `PUT /settings/runtime`: walidacja przed `save`, błędy 422,
   - bootstrap: walidacja path policy przed wyborem źródła i przed extract/sync.
4. Ustandaryzować mapping błędów:
   - API: `422` + `code=VALIDATION_FAILED` + `details[].reasonCode` (path-security codes),
   - bootstrap fatal: `RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED` / `RUNTIME_PATH_SECURITY_TOCTOU_DETECTED`.

Definition of Done:
1. Żadna ścieżka użyta przez runtime settings nie przechodzi bez canonical/root policy.
2. `haks/resolved` zwraca wyłącznie ścieżki policy-compliant.
3. Naruszenia path policy mają deterministyczne reason codes.

## 4.3 Pakiet C: Endpointy admina i uprawnienia

Pliki docelowe:
1. `backend/src/modules/runtime-settings/adapters/inbound/http/runtime-settings.controller.ts`
2. `backend/src/modules/runtime-settings/adapters/inbound/http/runtime-settings.schemas.ts`
3. `backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts`
4. `backend/src/modules/auth/*` (permission seeds/guard wiring, zgodnie z aktualnym modułem auth)

Zakres:
1. Zachować kontrakt endpointów R63 (bez zmiany ścieżek URL).
2. Wprowadzić split permissions dla `PUT`:
   - nadal wymagane `admin.config.write`,
   - dodatkowo `admin.runtime_paths.write`, gdy payload zmienia pola high-risk:
     - `paths.*`, `pathSecurity.*`, `hakProfiles`, `sources.*.hakPriorityList`, `sources.*.hakProfileId`.
3. W `replaceRuntimeSettings` dodać diff i audit context:
   - lista zmienionych pól path-sensitive,
   - event `runtime_paths_changed` z `updatedBy`, `revision`, `changed_fields`.
4. Dla `GET /haks/resolved` zwracać wartości canonicalne po policy validation.

Definition of Done:
1. Non-admin i admin bez `admin.runtime_paths.write` nie może zmienić path fields.
2. Mutacje non-path (np. `telemetryDebugMode`) pozostają możliwe przy `admin.config.write`.
3. Każda zmiana path-sensitive ma ślad auditowy.

## 4.4 Pakiet D: Priorytety ścieżek i precedence runtime (R63 + R65)

Pliki docelowe:
1. `backend/src/modules/runtime-settings/application/runtime-settings-bootstrap.service.ts`
2. `backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts`
3. `backend/src/modules/runtime-settings/application/runtime-source-priority.policy.ts` (nowy)

Zakres:
1. Wydzielić jedną policy-funkcję wyboru źródła modułu:
   - `D!=empty && P!=empty => DECOMPILED_PRIMARY`
   - `D!=empty && P==empty => DECOMPILED_ONLY`
   - `D==empty && P!=empty => PACKED_SYNC_REQUIRED`
   - `D==empty && P==empty => FAIL_FAST`
2. Bootstrap używa policy-funkcji i loguje jawny outcome.
3. Packed-only wymusza komplet blob config (`endpoint`, `region`, `bucket`, `modulePrefix`, `accessKeyId`, `secretAccessKey`).
4. Dla HAK precedence utrzymać: `inline > profile > none`, z deduplikacją i zachowaniem kolejności.
5. Spiąć z R65 matrix guardrails (dla tej slice na poziomie runtime settings):
   - globalny chain read policy: `module_decompiled -> module_packed -> hak -> override -> vanilla`,
   - bez zmiany endpointów, ale z gotowym API helperem do downstream provenance.

Definition of Done:
1. Decyzja źródła modułu jest wyliczana w jednym miejscu i testowana tabelarycznie.
2. Bootstrap nie ma niejawnych fallbacków.
3. Resolver HAK zwraca deterministyczny wynik dla tych samych danych wejściowych.

## 4.5 Pakiet E: TDD i verify gates

Pliki testowe (rozszerzenie + nowe):
1. `backend/test/unit/runtime-settings.schemas.spec.ts`
2. `backend/test/unit/runtime-settings.application.service.spec.ts`
3. `backend/test/unit/runtime-settings-bootstrap.service.spec.ts`
4. `backend/test/unit/runtime-settings-path-security.service.spec.ts` (nowy)
5. `backend/test/runtime-settings.e2e-spec.ts`
6. `backend/test/e2e/runtime-settings.security.e2e-spec.ts` (nowy)

Kolejność TDD (red -> green -> refactor):
1. Schemat i walidacja payloadu:
   - reject: traversal w `hakPriorityList`,
   - reject: absolute HAK poza `hakRoots`,
   - reject: brak root lists przy `enforce=true`,
   - accept: poprawne rooty + relatywne wpisy.
2. Walidator path security (unit):
   - canonical within-root pass,
   - outside-root fail,
   - symlink denied fail,
   - TOCTOU mismatch -> dedicated error.
3. Service-level (`application.service`):
   - `haks/resolved` nigdy nie zwraca pathów poza allowlist,
   - inline/profile precedence + dedupe.
4. Bootstrap:
   - fail-fast przy `FAIL_FAST`,
   - skip sync dla `DECOMPILED_*`,
   - packed sync tylko dla `PACKED_SYNC_REQUIRED` + complete blob config,
   - fail z kodem security przy invalid path policy.
5. E2E admin API:
   - matrix authz: admin/non-admin/admin-without-path-permission,
   - `PUT` path-sensitive wymaga `admin.runtime_paths.write`,
   - `GET haks/resolved` zwraca canonicalne policy-compliant ścieżki,
   - `422` envelope zawiera szczegółowe `details.reasonCode`.

Gate wg r64/r65:
1. P0 (każdy PR):
   - `cd backend`
   - `npm run build`
   - `npm run test:unit`
   - `npm run test:e2e`
2. P1 (ta slice kwalifikuje się min. do P1: auth/guard/policy/security):
   - `cd backend`
   - `npm run build`
   - `npm run test:unit`
   - `npm run test:e2e`
   - skupione negatywne testy auth/guard/policy/security
3. P2 (release/hardening sign-off):
   - ten sam zestaw co P1, obowiązkowo przed merge release.

Mutation testing jest opcjonalne i nie należy do P0/P1/P2. Może zostać
uruchomione wyłącznie na wyraźne żądanie użytkownika.

Definition of Done:
1. Wszystkie nowe przypadki security mają testy automatyczne (`SEC-PATH-*` min. zakres).
2. Zmiany przechodzą P1; release branch przechodzi P2.
3. Brak regresji istniejących endpointów runtime settings.

## 5. Sekwencja wdrożenia (iteracyjna)

1. Iteracja 1: model + schema (`pathSecurity`) + migration read path.
2. Iteracja 2: runtime path security service + integracja z PUT i `haks/resolved`.
3. Iteracja 3: permission split + audit event + e2e authz matrix.
4. Iteracja 4: bootstrap hardening + fail-fast error taxonomy.
5. Iteracja 5: domknięcie testów security i gate P1/P2.

## 6. Ryzyka i mitigacje

1. Ryzyko: breaking change payloadu settings.
   - Mitigacja: migration in-repo + kompatybilne defaults + testy odczytu legacy.
2. Ryzyko: false-positive path rejects w środowiskach z junction/symlink.
   - Mitigacja: kontrolowany fallback `symlinkPolicy=allow_inside_root` i jawne telemetry.
3. Ryzyko: zbyt szerokie blokowanie `PUT` po dodaniu permission split.
   - Mitigacja: granularny diff path-sensitive vs non-path-sensitive + e2e matrix.
4. Ryzyko: niedeterministyczne zachowanie przy różnych separatorach/drive forms.
   - Mitigacja: canonical compare testy na wariantach ścieżek Windows.

## 7. Kryteria akceptacji Slice R66

1. Runtime settings mają pełny kontrakt encji i walidacji zgodny z R63-R65.
2. Path security jest enforce'owane na write i bootstrap.
3. Endpointy admina egzekwują split permissions dla high-risk path mutations.
4. Priorytet ścieżek i HAK resolve jest deterministyczny i testowany.
5. Zestaw testów TDD + gate P1/P2 przechodzi bez regresji.
