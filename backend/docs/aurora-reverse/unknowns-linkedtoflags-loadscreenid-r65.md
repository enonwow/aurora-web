# Unknowns Closure R65: `LinkedToFlags` + `LoadScreenID` (drzwi/trigger)

> **External GPL quarantine (2026-08-17):** This document's xoreos-derived
> closure is revoked. Its xoreos paths and observations are not admitted
> evidence and must not support implementation or runtime claims. See
> `xoreos-gpl-legacy-reference-quarantine-2026-08-17.md`.

## Zakres i poziom domkniecia
- Zakres: runtime xoreos (`nwn`, `nwn2`, `kotorbase`) + corpus GIT/GIC z `C:\Projects\nwn-last-city\Aurora\reverse`.
- Domkniecie dotyczy kontraktu backend dla adaptera Aurora-web opartego o ten runtime.
- Status retail NWN:EE (zamkniety binary-proof poza xoreos): nadal poza tym zamknieciem.

## Semantyka runtime: `LinkedToFlags`

### Drzwi (`Door List`) - semantyka aktywna
1. Znaczenie wartosci jest jawne w enumie drzwi:
   - `0` = brak linku (`kLinkedToNothing`)
   - `1` = link do drzwi (`kLinkedToDoor`)
   - `2` = link do waypointa (`kLinkedToWaypoint`)
2. Runtime `nwn` i `nwn2` czyta dla drzwi tylko:
   - `LinkedToFlags`
   - `LinkedTo`
3. Rozwiazanie linku jest tag-based (nie resref-based):
   - `getFirstObjectByTag(_linkedTo)`
   - dla `1` cast do `Door`, dla `2` cast do `Waypoint`
4. Link jest cache'owany jednokrotnie (`_evaluatedLink`), wiec po pierwszej ewaluacji nie ma ponownego bindu bez restartu obiektu.
5. Wplyw na zachowanie drzwi:
   - otwarte drzwi: `OnClick` (w NWN2 najpierw `OnClick`, potem `OnUsed`) -> przejscie po linku -> fallback zamkniecia.
   - lock/open/close propaguje sie na linked door tylko gdy link rozwiazal sie do drzwi.

### Triggery (`TriggerList`) - semantyka nieaktywna (metadata)
1. W corpusie pole istnieje i ma stabilny typ (`byte` dla `LinkedToFlags`), ale:
   - `nwn::Area::loadGIT()` nie laduje `TriggerList`
   - `nwn2::Area::loadGIT()` nie laduje `TriggerList`
2. Nawet gdy trigger jest ladowany w innych profilach (np. `kotorbase`, `nwn2::Trigger`), aktualne `Trigger::load()` nie konsumuje `LinkedToFlags` ani `LinkedTo` jako runtime transition bind.
3. Dla adaptera runtime: `Trigger.LinkedToFlags` to authoring/preserve metadata, nie aktywny sygnal przejscia.

## Semantyka runtime: `LoadScreenID`

### Drzwi
1. Pole jest serializowane i obecne w danych drzwi (`8/8`), ale w runtime `nwn`/`nwn2` nie jest czytane w `Door::loadObject()`.
2. W aktualnym adapterze runtime nie ma bezposredniego efektu behawioralnego `LoadScreenID` na przejscie drzwi.

### Triggery
1. Pole jest serializowane i obecne (`4/4`, typ `word`), ale:
   - trigger runtime nie jest ladowany przez `Area::loadGIT` w `nwn`/`nwn2`
   - brak call-site, ktory konsumuje to pole do runtime transition
2. W aktualnym adapterze runtime traktowac jako metadata round-trip.

## Wartosci i rozklady (corpus LC)
1. `LinkedToFlags`:
   - drzwi: tylko `1` (8/8)
   - triggery: tylko `0` (4/4)
2. `LoadScreenID`:
   - drzwi: tylko `0` (8/8)
   - triggery: tylko `0` (4/4)
3. Wykryte krawedzie przejsc drzwi: wzajemne (reciprocal), bez krawedzi jednostronnych w tym corpusie.

## Przypadki brzegowe (istotne dla backend)
1. `LinkedToFlags != 0` i puste `LinkedTo`:
   - runtime nie rozwiaze linku; przejscie nie zajdzie.
2. `LinkedToFlags` poza `{0,1,2}`:
   - wartosc przechodzi przez odczyt numeryczny, ale `evaluateLink()` obsluguje tylko `1` i `2`; efekt praktyczny jak brak dzialajacego linku.
3. Niejednoznaczny tag (duplikaty):
   - `getFirstObjectByTag` wybiera pierwszy obiekt; mozliwy niedeterministyczny target przy konfliktach tagow.
4. Cache linku (`_evaluatedLink`):
   - zmiana tagow/linkow po pierwszej ewaluacji nie odswieza targetu.
5. Parser transition (warstwa `cpp_impl`, nie loader GFF) akceptuje signed int32 i aliasy:
   - `LoadScreenID`/`LoadScreenId` (last-wins)
   - wartosci ujemne sa parsowalne w tym parserze
   - klucze sa case-sensitive, near-missy sa ignorowane
   - prefiks `+` jest odrzucany
   To jest kontrakt parsera tekstowego preserve-only, nie dowod domeny zapisu GFF.

## Wplyw na kontrakt backend (docelowy)

### 1) Read/ingest contract
1. Trzymac pola przejsc jako `preserve-first`:
   - `LinkedToFlags`, `LinkedTo`, `LoadScreenID`, opcjonalnie `LinkedToModule`, `TransitionDestin|TransitionDestination`.
2. W ingest z par key/value utrzymac aliasy i kolejnosc (dla round-trip i diagnostyki).
3. Rozdzielic:
   - `effective` wartosc logiczna (po alias-last-wins)
   - `raw` wystapienia (oryginalna pisownia/porzadek)

### 2) Validation contract
1. Drzwi:
   - `LinkedToFlags in {1,2}` wymaga niepustego `LinkedTo` (blad)
   - `LinkedToFlags == 0` z niepustym `LinkedTo` (warning: martwy payload)
   - `LinkedToFlags` poza `{0,1,2}` (warning/error policy, rekomendacja: warning + compatibility)
   - brak reciprocity linkow drzwi (warning)
2. Triggery:
   - `LinkedToFlags != 0` lub `LinkedTo`/`LoadScreenID` != default oznaczac jako authoring-only metadata (warning informacyjny), bez obietnicy runtime efektu.
3. `LoadScreenID`:
   - dla runtime adaptera traktowac jako opaque metadata; brak inferencji behavior.

### 3) Write/export contract
1. Jesli transition fields nie byly edytowane: emit preserve (ta sama pisownia i kolejnosc kluczy, o ile pipeline to przechowuje).
2. Przy edycji kontrolowanej:
   - canonical key dla loadscreen: `LoadScreenID`
   - alias `LoadScreenId` akceptowany tylko na wejsciu
3. Domena liczbowa na zapisie GFF (rekomendacja twarda):
   - `LinkedToFlags`: `0..255` (byte domain)
   - `LoadScreenID`: `0..65535` (word domain)
   Wartosci ujemne z parsera tekstowego nie powinny byc emitowane do canonical GFF writer.

## Finalny werdykt R65
1. `LinkedToFlags` jest runtime-krytyczne tylko dla drzwi (`0/1/2`), gdzie steruje typem targetu linku po `Tag`.
2. `LinkedToFlags` dla triggerow jest obecnie preserve-only metadata (brak aktywnej sciezki runtime w `nwn`/`nwn2`).
3. `LoadScreenID` dla drzwi i triggerow jest w tym runtime preserve-only metadata (serializowane, ale niekonsumowane przez aktualny loader drzwi/triggerow).
4. Kontrakt backend powinien byc `preserve-first + explicit validation`, bez mapowania `LoadScreenID` i trigger `LinkedTo*` na gwarantowane runtime behavior.

## Glówne dowody (pliki)
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn\door.h`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn\door.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn2\door.h`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn2\door.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn\area.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn2\area.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\kotorbase\door.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\kotorbase\area.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn2\trigger.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\kotorbase\trigger.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0518_door_trigger_transition_matrix.json`
- `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0426_door_profile.json`
- `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0437_git_trigger_schema_profile.json`
- `C:\Projects\nwn-last-city\Aurora\reverse\cpp_impl\src\aurora\door\door_transition.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\cpp_impl\tests\door_transition_test.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\runs\NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`
