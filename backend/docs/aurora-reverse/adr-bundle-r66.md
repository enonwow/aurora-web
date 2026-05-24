# ADR Bundle R66 - Backend Decomp Flows

Data: 2026-05-24
Status: Proposed bundle (compiled from R63/R64/R65)
Zakres: backend decomp flows (`module path -> decompile -> staging -> blob ingest -> API/apply`) oraz decyzje governance bezposrednio wspierajace ten flow.

## ADR-66-01: Deterministyczna precedence zrodel i module-bound lane dla ARE/GIT

Kontekst:
- R63 ustala globalny chain `module_decompiled -> module_packed -> hak -> vanilla` i eliminuje silent fallback.
- R65 domyka macierz per typ zasobu i blokuje `hak/override` jako finalne zrodlo dla `ARE/GIT`.
- Flow decomp wymaga stalej i audytowalnej selekcji winnera.

Decyzja:
- Backend stosuje deterministyczny chain z bezwzglednym priorytetem `module_decompiled` nad `module_packed`.
- `ARE` i `GIT` pozostaja module-bound (resolve tylko z lane modulu; brak finalnego resolve z `hak/override`).
- Dla kolizji i missow zawsze emitujemy provenance + diagnostyke.

Konsekwencje:
- Plus: stabilny wynik parser/enrichment, brak cross-lane drift dla area payload.
- Plus: latwiejsze debugowanie konfliktow przez candidate/winner metadata.
- Minus: `override` nie naprawi problemu dla `ARE/GIT`; wymagany fix w module lane.

Otwarte punkty:
- Kontrakt source-bound writes (`resref+source`) nadal wymaga domkniecia (R63 out-of-scope).
- Trzeba dopiac testy parity ARE+GIT dla wszystkich collision scenariuszy R65.

## ADR-66-02: Path security jako fail-fast kontrakt runtime

Kontekst:
- R63 hardening wymaga canonicalize/realpath, allowlist roots, traversal/symlink/junction/TOCTOU guard.
- Bledna konfiguracja pathow ma wysokie ryzyko security i moze skazic caly pipeline.
- R65 threat model rozszerza to o dedykowana kontrole permission dla runtime path write.

Decyzja:
- Kazde naruszenie path policy konczy sie fail-fast (`422` dla API config, startup fatal dla bootstrap).
- Runtime path fields sa mutowalne tylko przez dedykowane uprawnienie administracyjne.
- Zmiany pathow sa audytowane (`updatedBy`, revision, changed_fields).

Konsekwencje:
- Plus: minimalizacja ryzyka escape poza dozwolone rooty i lepsza rozliczalnosc zmian.
- Plus: mniejsze ryzyko cichych, niekontrolowanych fallbackow.
- Minus: ostrzejszy kontrakt podnosi prog wejscia dla srodowisk testowych.

Otwarte punkty:
- Wymagane domkniecie e2e testow TOCTOU swap i symlink race.
- Do doprecyzowania playbook dla awaryjnego odblokowania konfiguracji po startup-fatal.

## ADR-66-03: Kontrakt decompiler CLI z twardym timeoutem i canonical error map

Kontekst:
- R63 decompiler integration wymaga izolowanego `outputDir` per `jobId/attempt`, bounded logs i deterministycznych exit-code mappingow.
- Retry ma byc wlaczany tylko dla bledow przejsciowych.

Decyzja:
- Decompiler uruchamiamy z timeout bounds `5000..300000` (default 60000), bez trybu infinite-run.
- Exit codes mapujemy 1:1 na `PIPELINE_DECOMP_*` z jawna flaga `retryable`.
- Po timeout: graceful stop -> force kill, z diagnostyka tail stdout/stderr.

Konsekwencje:
- Plus: przewidywalne zachowanie workerow i kontrola DoS/hang.
- Plus: spojny error envelope dla API, lifecycle i observability.
- Minus: zbyt ciasne timeouty moga podnosic false-transient retry pressure.

Otwarte punkty:
- Trzeba skalibrowac profile timeoutow per dataset size/tier.
- Nadal otwarty risk supply-chain binarki decompilera (R65 residual risk).

## ADR-66-04: Blob ingest oparty o CAS + checkpoint resume + revision gate

Kontekst:
- R63 definiuje staged pipeline: decompile -> manifest -> sync plan -> CAS upload -> commit -> `latest` move.
- Wymagane sa restart-safe joby i ochrona przed stale write na mutable `latest`.

Decyzja:
- Obiekty `cas/*` i `commits/*` sa immutable; mutable jest tylko `refs/<dataset>/latest.json`.
- Update `latest` jest revision-gated (`expected_revision` vs `actual_revision`), konflikt nie moze nadpisac cudzego commitu.
- Resume po restarcie odtwarza checkpoint i wznawia od nastepnego kroku bez duplikacji blobow.

Konsekwencje:
- Plus: deterministyczna lineage i idempotentne ponawianie jobow.
- Plus: bezpieczne recovery po restartach/lease takeover.
- Minus: wyzsza zlozonosc orchestration i utrzymania checkpoint store.

Otwarte punkty:
- Do finalnej decyzji pozostaje miejsce trzymania revision gate (DB vs object ref vs hybryda).
- Do domkniecia strategia conditional write (`If-None-Match` vs lock aplikacyjny).

## ADR-66-05: Lifecycle joba rozdziela `status` i `phase`, z idempotentnym cancel/retry

Kontekst:
- R63 lifecycle spec pokrywa queue/start/progress/complete/fail/cancel/retry oraz resume i lease takeover.
- Potrzebne sa atomowe przejscia, kontrola konfliktow stanu i bounded retry.

Decyzja:
- Utrzymujemy jawna state machine z terminalnymi statusami oraz osobnym granularnym `phase`.
- Retry jest dozwolony tylko dla `retryable=true` i zawsze z limitem attemptow/backoff.
- Cancel/retry endpointy sa idempotentne; API raportuje `cancelRequested/cancelHonored`.

Konsekwencje:
- Plus: przewidywalny polling i latwiejsza obsluga incydentow operacyjnych.
- Plus: brak nieskonczonych retry loopow i mniejsze ryzyko stanu zombie.
- Minus: wiecej branchy testowych (state conflicts, partial cancel windows, rebase-and-retry).

Otwarte punkty:
- Wymaga domkniecia test matrix dla konfliktow lease i granic nieprzerywalnych sekcji.
- Trzeba ustalic jednolity SLO budget dla `completed_with_drift` vs `failed`.

## ADR-66-06: Public Processing API z twarda idempotencja i revision-gated apply

Kontekst:
- R63 API shape normalizuje start/list/status/apply/cancel-delete dla `placeable|creature|area`.
- Reverse-first wymaga `Idempotency-Key` na mutacjach oraz `expectedRevision` na apply.

Decyzja:
- Mutujace POST/DELETE wymagaja `Idempotency-Key`; reuse key z innym payloadem zwraca konflikt.
- `apply` wymaga `expectedRevision`; stale/missing revision jest blokowane canonicalnym bledem.
- Error envelope i mapowanie `code/http/retryable` pozostaja stabilnym kontraktem.

Konsekwencje:
- Plus: bezpieczne retry klienta i odpornosc na duplicate submits.
- Plus: ochrona przed stale overwrite na write boundary.
- Minus: klienci musza wdrozyc discipline key management i revision flow.

Otwarte punkty:
- Potrzebna finalna polityka TTL/retention dla idempotency store.
- Do doprecyzowania granice async apply (`200` vs `202`) per pipeline type.

## ADR-66-07: Verify gates P0/P1/P2 i konwencja komend `npm`

Kontekst:
- R64 domyka konflikt miedzy minimalnym PR gate i wymaganiami podwyzszonego ryzyka.
- R65 security threat model wymaga, by zmiany security-sensitive byly co najmniej P1.

Decyzja:
- Standard gate: `P0=build+unit+e2e`, `P1=P0+mutation` dla zmian logic/auth/guard/policy, `P2=P1` dla release/hardening.
- Komendy dokumentujemy i wykonujemy jako `npm ...` (bez `npm.cmd`).
- Security controls z threat modelu kwalifikujemy minimum do P1, hardening release do P2.

Konsekwencje:
- Plus: jasny i egzekwowalny standard quality/security bez nadmiernego kosztu kazdego PR.
- Plus: zgodnosc cross-platform i mniejsza przypadkowosc uruchomien.
- Minus: mutation runtime kosztuje czasowo przy czestych zmianach w guard/policy.

Otwarte punkty:
- Trzeba zautomatyzowac klasyfikacje PR do P0/P1/P2 (manual jest podatny na blad).
- Do uzgodnienia prog SLA czasu verify dla duzych PR security.

## ADR-66-08: Minimalny runtime set 2DA/TLK i kontrakt brakow P0/P1

Kontekst:
- R65 definiuje minimalny zestaw tabel i TLK potrzebny do poprawnego processingu placeable/creature/area.
- Decomp flow musi byc preserve-first, ale rozroznia hard-fail i soft-fail.

Decyzja:
- Utrzymujemy canonical fallback chain 2DA/TLK: `module_decompiled -> module_packed -> hak -> vanilla`.
- Braki klasyfikujemy kodami `P0_MISSING_SOURCE/P0_ROW_MISSING` (hard-fail) oraz `P1_UNRESOLVED_REFERENCE/P1_TLK_UNRESOLVED` (soft-fail preserve-first).
- Dla kazdego missa emitujemy `entityType`, `resourceName`, `lookupKey`, `sourceProvenance`, `hakPriorityEffective`.

Konsekwencje:
- Plus: przewidywalny baseline runtime i brak cichego gubienia danych.
- Plus: diagnostyka pozwala odroznic problem danych od problemu source layer.
- Minus: przy niepelnych datasetach wzrasta liczba ostrzezen P1 i koszt triage.

Otwarte punkty:
- Dokument ma status draft; potrzebna finalizacja listy P0/P1 oraz acceptance tests.
- Do dopracowania alias policy cross-profile (`AmbientSndNitVol` vs `AmbientSndNightVol`) w strict mode.

## ADR-66-09: Rozdzielenie uprawnien dla `DELETE /processing/creature/:jobId`

Kontekst:
- R64 zamyka luke, gdzie cancel/delete creature job dzielilo permission z operacjami spawn/apply.
- Least-privilege i auditability wymagaja osobnej capability dla job management.

Decyzja:
- `DELETE /processing/creature/:jobId` przechodzi na dedykowane permission `dm.manage_creature_jobs`.
- `POST /processing/creature` i `/apply` pozostaja na `dm.spawn_creature`.
- Migracja przebiega etapowo (compat prep -> session stabilization -> cutover -> test/doc closure).

Konsekwencje:
- Plus: czytelny podzial semantyczny uprawnien i lepsza kontrola operacyjna.
- Plus: mniejsze ryzyko nadmiernych uprawnien dla operatorow.
- Minus: ryzyko chwilowych 403 przy niedomknietej migracji sesji/polityk.

Otwarte punkty:
- Potrzebne potwierdzenie, ze wszystkie role produkcyjne maja poprawny rollout nowej permission.
- Wymagane monitorowanie post-cutover i thresholdy akceptowalnych 403.

## Zrodla (R63/R64/R65)

1. `backend/docs/aurora-reverse/module-source-priority-spec-r63.md`
2. `backend/docs/aurora-reverse/admin-runtime-settings-contract-spec-r63.md`
3. `backend/docs/aurora-reverse/path-security-hardening-spec-r63.md`
4. `backend/docs/aurora-reverse/decompiler-integration-spec-r63.md`
5. `backend/docs/aurora-reverse/blob-ingest-pipeline-spec-r63.md`
6. `backend/docs/aurora-reverse/processing-job-lifecycle-spec-r63.md`
7. `backend/docs/aurora-reverse/processing-api-shape-spec-r63.md`
8. `backend/docs/aurora-reverse/processing-error-taxonomy-spec-r63.md`
9. `backend/docs/aurora-reverse/decision-command-conventions-r64.md`
10. `backend/docs/aurora-reverse/decision-test-gate-standard-r64.md`
11. `backend/docs/aurora-reverse/implementation-backlog-r64.md`
12. `backend/docs/aurora-reverse/decision-processing-creature-delete-permission-r64.md`
13. `backend/docs/aurora-reverse/threat-model-decompile-blob-pipeline-r65.md`
14. `backend/docs/aurora-reverse/resource-precedence-matrix-r65.md`
15. `backend/docs/aurora-reverse/minimal-runtime-2da-tlk-set-r65.md`
