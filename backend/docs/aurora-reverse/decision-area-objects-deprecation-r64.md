# Decision Closure B2: Deprecation `objects[]` -> `composition.*` dla Area DTO (R64)

Data: 2026-05-24
Status: Final
Zakres: finalny harmonogram deprecacji legacy `objects[]` na rzecz canonical `composition.*` w `AreaPreviewMetadataDto`, z milestone'ami backend/frontend i kryteriami rollback.

## 1. Podstawa decyzyjna (Aurora Reverse + docs)

Decyzja opiera sie na:
1. `backend/docs/aurora-reverse/area-composition-spec-r63.md`
2. `backend/docs/aurora-reverse/schema-evolution-rules-spec-r63.md`
3. `backend/docs/aurora-reverse/preview-metadata-contract-spec-r63.md`
4. `backend/docs/aurora-reverse/processing-api-shape-spec-r63.md`

Normy przyjete bez zmian:
1. `composition.*` jest canonical source-of-truth dla area.
2. `objects[]` moze istniec tylko jako lane legacy/shadow w oknie migracyjnym.
3. Minimalne okno deprecacji: `max(2 release cycle, 90 dni)`; najwczesniejsze usuniecie: `T2=2026-08-22`.
4. Etapy rollout: A (dual-read+dual-write), B (dual-read+write-new), C (dual-read z hard warning), D (remove legacy).

## 2. Finalna decyzja

1. Utrzymujemy plan T0/T1/T2/T3 z R63 jako harmonogram normatywny.
2. Backend i frontend przechodza przez te same bramki etapowe; przejscie nastepuje tylko po spelnieniu gate'ow telemetrycznych.
3. `objects[]` zostaje usuniete z kontraktu produkcyjnego nie wczesniej niz 2026-08-22, a pelne zamkniecie ryzyka migracji nastapi do 2026-09-21.

## 3. Harmonogram finalny (R64)

## 3.1 Kamienie milowe globalne

1. `T0` (2026-05-24): start deprecacji i komunikacja kontraktowa (`Deprecation: true`, `Sunset` ustawiony na date T2).
2. `T1` (2026-06-21): przejscie na read-old/write-new (`composition.*` write-only, `objects[]` tylko shadow outbound gdy wlaczone).
3. `T2` (2026-08-22): najwczesniejszy termin usuniecia `objects[]`.
4. `T3` (2026-09-21): hard closure okna 120 dni (koniec awaryjnych fallbackow dla tej migracji).

## 3.2 Milestones backend/frontend per etap

| Etap | Okno dat | Backend milestone | Frontend milestone | Wyjscie z etapu |
|---|---|---|---|---|
| A | 2026-05-24 -> 2026-06-21 | Wlaczone `dual-read + dual-write`; `composition.*` canonical; `objects[]` generowane jako shadow projection; telemetry `LEGACY_OBJECTS_COMPOSITION_MISMATCH`. | UI/klienci czytaja `composition.*` jako primary; `objects[]` tylko fallback; parser ignoruje unknown fields/tags. | `P95 contract parse success >= 99.9%`, brak P0/P1, stabilne mapowanie `objects[] -> composition.*`. |
| B | 2026-06-22 -> 2026-07-20 | `dual-read + write-new`; zapis tylko `composition.*`; shadow `objects[]` tylko outbound i flagowany. | Brak nowego kodu zalezonego od `objects[]`; telemetry klienta raportuje realne uzycie fallbacku. | Legacy usage <5% przez min. 14 dni, brak regresji identity/invariants. |
| C | 2026-07-21 -> 2026-08-21 | `dual-read` z twardym warningiem (`CONTRACT_FIELD_DEPRECATED`), naglowki `Deprecation/Sunset`, strict-checki mismatch (`409/422` wg policy). | Fallback `objects[]` domyslnie OFF; wlaczany tylko awaryjnie feature flaga. | Legacy usage <=1% przez 14 dni, brak nowych P1 zwiazanych z area DTO. |
| D | od 2026-08-22 (stabilizacja do 2026-09-21) | Usuniecie `objects[]` z kontraktu i projection; `read-new/write-new only`; cleanup flag migracyjnych. | Usuniecie kodu fallback `objects[]` z produkcyjnego UI/SDK; pozostaje tylko parser `composition.*`. | 30 dni bez incydentu migracyjnego; zamkniecie decyzji na T3. |

## 4. Kryteria rollback (decision guardrails)

## 4.1 Triggery rollback natychmiastowego

Rollback do poprzedniego etapu jest wymagany, gdy wystapi dowolny warunek:
1. Wykrycie utraty danych lane (`objects[] <-> composition.*` nie jest bezstratne), w tym utrata `GIT.List -> composition.items[]`.
2. `P95 contract parse success` spada ponizej `99.9%` dla aktywnych klientow.
3. Pojawia sie otwarty incydent `P0/P1` zwiazany z kontraktem area DTO.
4. Skok `LEGACY_OBJECTS_COMPOSITION_MISMATCH` wskazuje systemic drift (nie pojedyncze rekordy).

## 4.2 Akcje rollback per etap

1. `D -> C`: przywrocic outbound shadow (`X-Aurora-Legacy-Fields=include`, `migration.area.emitLegacyObjectsShadow=true`), utrzymac `composition.*` jako canonical.
2. `C -> B`: cofnac hard-warning mode do dual compatibility (`X-Aurora-Migration-Mode=dual`), utrzymac strict tylko w canary/CI.
3. `B -> A`: tymczasowo przywrocic dual-write dla legacy shadow i ponownie walidowac mapowanie deterministyczne.
4. Kazdy rollback musi byc odnotowany jako incident z planem re-entry i nowa data gate review.

## 4.3 Warunki ponownego wejscia po rollback

Powrot do wyzszego etapu dopiero po spelnieniu wszystkich warunkow:
1. 14 dni telemetry bez przekroczenia progow gate.
2. Brak otwartych P0/P1.
3. Potwierdzone testy kontraktowe `objects[] <-> composition.*` bez utraty lane preserve-first.

## 5. Ownership i odpowiedzialnosc

1. Backend owner: utrzymanie canonical `composition.*`, flag migracyjnych i naglowkow deprecacji.
2. Frontend owner: usuniecie zaleznosci od `objects[]`, monitorowanie fallback usage i gotowosc rollback feature flag.
3. Wspolny go/no-go na granicach `T1`, `T2`, `T3` na podstawie telemetry i contract tests.

## 6. Finalny stan po T3 (2026-09-21)

1. `objects[]` nie wystepuje w produkcyjnym area DTO ani w write-path.
2. `composition.*` pozostaje jedynym kontraktem danych area.
3. Flagi migracyjne dla legacy lane sa wygaszone (poza kontrolowanym incident override).
