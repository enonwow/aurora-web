# Decision Closure A2: `DELETE /processing/creature` Permission (R64)

Data: 2026-05-24  
Status: Closed

## Kontekst
W aktualnej dokumentacji istnieje jawnie opisana luka: `DELETE /processing/creature/:jobId` tymczasowo uzywa `dm.spawn_creature`.
- `backend/docs/architecture/processing-authorization-matrix-agent-r10.md` (Open Gap)
- `backend/docs/standards/backend-security-error-observability-ssot-agent-r46.md` ("do czasu wydzielenia osobnego permission")
- `backend/docs/aurora-reverse/processing-api-shape-spec-r63.md` (sekcja 6.6, current gap policy)

Pytanie decyzyjne: czy zostac przy mapowaniu tymczasowym, czy zamknac temat przez nowe permission.

## Opcje
1. Pozostawic mapowanie tymczasowe (`dm.spawn_creature`) dla DELETE.
2. Wprowadzic nowe permission dedykowane dla cancel/delete jobu `creature`.

## Trade-off
### Opcja 1: Tymczasowe mapowanie
Plusy:
1. Brak kosztu migracji i brak zmian rolloutowych.
2. Zero ryzyka krótkoterminowej regresji po stronie tokenow/sesji.

Minusy:
1. Slaba separacja odpowiedzialnosci: "spawn/apply" i "cancel/delete" to inne ryzyko biznesowe.
2. Gorszy least-privilege i auditability (trudniej odpowiedziec "kto moze usuwac/cancelowac").
3. Niespelniony kierunek z R10 (dedykowane permission dla dedykowanych kontroli).

### Opcja 2: Nowe permission
Proponowane permission: `dm.manage_creature_jobs`.

Plusy:
1. Czysty podzial semantyczny: `dm.spawn_creature` dla start/apply, `dm.manage_creature_jobs` dla cancel/delete.
2. Lepszy least-privilege i latwiejsze przyszle delegowanie uprawnien.
3. Lepsza zgodnosc z deny-by-default i explicit capability standardem (R41/R46).

Minusy:
1. Wymaga migracji polityki auth, dekoratora endpointu i testow.
2. Ryzyko chwilowych 403 dla starych sesji, jesli endpoint zostanie przelaczony zbyt szybko.

## Finalna rekomendacja
Wybieramy **Opcje 2**: wprowadzamy nowe permission `dm.manage_creature_jobs` i odchodzimy od mapowania tymczasowego dla `DELETE /processing/creature/:jobId`.

To zamyka decyzje A2 i likwiduje "open gap" z R10/R46/R63 bez zmiany kontraktu HTTP (zmienia sie tylko polityka auth).

## Plan migracji (bezpieczny, etapowy)
1. Etap 1 (compat prep)
- Dodac `dm.manage_creature_jobs` do katalogu permissions (`auth.policy.ts`).
- Przypisac permission co najmniej do rol `dm` i `admin` w `ROLE_PERMISSIONS`.
- Na tym etapie `DELETE /processing/creature/:jobId` nadal korzysta z `dm.spawn_creature`.

2. Etap 2 (stabilizacja sesji)
- Odczekac minimum `max_session_ttl + bufor operacyjny` albo wymusic odswiezenie sesji po wdrozeniu etapu 1.
- Monitorowac `403 FORBIDDEN_PERMISSION` dla sciezki `DELETE /processing/creature/:jobId`.

3. Etap 3 (cutover)
- Przelaczyc dekorator endpointu DELETE na `@Permissions("dm.manage_creature_jobs")`.
- `POST /processing/creature` i `POST /processing/creature/:jobId/apply` pozostaja na `dm.spawn_creature`.

4. Etap 4 (doc + test closure)
- Zaktualizowac matryce i SSOT (R10, R46, R63) do nowego mapowania.
- Uzupelnic testy jednostkowe/e2e:
  - allow: `dm/admin` z `dm.manage_creature_jobs` dla DELETE,
  - deny: brak nowego permission,
  - brak regresji dla start/apply na `dm.spawn_creature`.

## Kryteria uznania decyzji za wdrozona
1. DELETE `processing/creature` jest autoryzowany przez `dm.manage_creature_jobs`.
2. Start/apply `processing/creature` nadal wymagaja `dm.spawn_creature`.
3. Brak podwyzszonego poziomu 403 po cutover poza akceptowalnym oknem migracyjnym.
4. Dokumenty R10/R46/R63 nie zawieraja juz informacji o "tymczasowym" mapowaniu dla DELETE creature.

## Status decyzji
Decision A2: **CLOSED** (kierunek: dedykowane permission + etapowa migracja).
