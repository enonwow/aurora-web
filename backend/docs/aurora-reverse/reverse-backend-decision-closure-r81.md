# Reverse Backend Decision Closure R81 (Agent R10)

Data: 2026-05-24  
Zakres: finalne domkniecie decyzji backendowych na bazie findings `r78-r80`.

## 1. Podstawa decyzji

Decyzja oparta o:
- `reverse-findings-area-object-contracts-r78.md`
- `reverse-findings-resource-pipeline-r78.md`
- `reverse-next-targeted-decomp-plan-r78.md`
- `reverse-findings-binary-format-clues-r79.md`
- `reverse-validation-matrix-r79.md`
- `reverse-backend-readiness-r79.md`
- `reverse-high-value-function-dossiers-r80.md`

## 2. Decyzje finalne: implementowac teraz

### 2.1 Runtime/source control-plane (TAK, teraz)
1. `GET/PUT /api/v1/settings/runtime`.
2. `GET /api/v1/settings/runtime/haks/resolved`.
3. Internal: `TlkResolverService`, `TwoDaLookupService`, `ModuleIfoMetadataService`.

Uzasadnienie:
- Najmocniejszy i spojny evidence chain dla bootstrap+resolver+IFO read/write: `FUN_0057F8B8`, `FUN_00ABCFEC`, `FUN_005B5BC4`, `FUN_005BB574`, `FUN_005888F0`.
- Round-trip `Module.IFO` jest potwierdzony i stabilny kontraktowo.

### 2.2 Processing jobs control-plane (TAK, teraz)
1. `POST /api/v1/processing/{type}`.
2. `GET /api/v1/processing/jobs/{jobId}`.
3. `POST /api/v1/processing/jobs/{jobId}:cancel`.
4. `POST /api/v1/processing/jobs/{jobId}:retry`.
5. `GET /api/v1/processing/{type}`.

Uzasadnienie:
- Lifecycle jobs nie wymaga pelnego domkniecia semantyki parserow `ARE/GIT`.
- Ryzyko reverse nie blokuje control-plane API.

## 3. Decyzje finalne: odlozyc (HOLD)

### 3.1 Strict `processing/area` (HOLD)
Zakres hold:
- twarde kontrakty parse/validate dla `tiles/placeables/doors/creatures/triggers`.
- finalne reguly cardinality i strict validation dla pelnego lane `ARE/GIT`.

Powod:
- Mimo mocnych sygnalow dla czesci call-site'ow GIT, nadal brak jednoznacznie zamknietego i kanonicznego call-chainu (wiele wariantow sciezek; niepewnosc semantyki branchy).
- Wysokie ryzyko regresji zgodnosci przy "zbyt pewnym" mapowaniu 1:1.

### 3.2 Strict transition alias policy (HOLD)
Zakres hold:
- twarde egzekwowanie polityk aliasow/duplikatow `LoadScreenID/LoadScreenId` i `LinkedToFlags` (np. definitywne `last-wins`).

Powod:
- Read/write call-site sa znalezione, ale policy merge/duplicate nie jest jeszcze twardo potwierdzona.

### 3.3 Hard `HAK_V1.0` format gate (HOLD)
Zakres hold:
- blokowanie przetwarzania na podstawie niepelnie potwierdzonych checkow formatu.

Powod:
- `FUN_004AF534` i `FUN_00541CD4` to nadal clues, nie domkniety kontrakt hard-fail.

### 3.4 Strict UTC->creature i UTP->placeable enrichment mapping (HOLD)
Zakres hold:
- finalne, nieodwracalne mapowanie branchy UT* do zachowan domenowych.

Powod:
- Pipeline UT* jest dobrze widoczny, ale czesc sygnalow pozostaje posrednia i istnieje ryzyko noise/overfit.

## 4. Co wymaga jeszcze dekompilacji i dlaczego

### 4.1 P0 (blokuje odblokowanie HOLD)
1. Kanoniczny lane `ARE/GIT`:
   - namierzenie i zamkniecie: `AreaProperties`, `Door List`, `Placeable List`, `Creature List` + ich relacji caller/callee.
   - Dlaczego: bez tego nie da sie bezpiecznie wlaczyc strict `processing/area`.

2. Pelna polityka transition keys:
   - `LoadScreenID/LoadScreenId`, `LinkedToFlags` (duplikaty, aliasy, kolejnosc, parse numeric).
   - Dlaczego: bez tego nie mozna ustalic kompatybilnych gate'ow walidacyjnych.

3. Domkniecie call-chain `resource -> parser -> object lane`:
   - resolver (`HAK/TLK`) -> parser struktur -> lane obiektowe.
   - Dlaczego: to warunek zachowania fidelity end-to-end.

### 4.2 P1 (nie blokuje startu, ale blokuje hardening)
1. Potwierdzenie `HAK_V1.0` jako realnego hard gate.
2. Domkniecie szczegolow branchy UT* dla strict enrichment.
3. Doprecyzowanie regul konfliktow HAK w edge-case'ach.

## 5. Finalny werdykt R10

1. **Implementowac teraz**: runtime/source resolver + HAK/TLK/2DA + Module.IFO read/write + processing jobs control-plane.
2. **Odlozyc**: strict `processing/area`, strict alias/duplicate policy transitions, hard `HAK_V1.0` gate, strict UT* enrichment mapping.
3. **Dekompilowac dalej**: przede wszystkim P0 dla `ARE/GIT` i transition policy; po ich domknieciu odblokowac funkcje z HOLD.

## 6. Brama zamkniecia HOLD (warunki przejscia)

Aby przeniesc funkcje z HOLD do "implementowac teraz", wymagane sa jednoczesnie:
1. jedna tabela adresowa `ARE/GIT` z mapowaniem `adres -> rola -> 2 dowody` dla parsera i serializacji,
2. potwierdzona polityka alias/duplikat dla transition keys na probkach binarnych,
3. testy zgodnosci round-trip (parse->serialize->parse) dla `AreaProperties` i list obiektowych.
