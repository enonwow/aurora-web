# ARE/GIT Validation Spec R63 (Agent I1)

Data: 2026-05-24
Status: Draft for backend processing contract
Zakres: walidacja spojnosci ARE/GIT/IFO dla backend processingu (`required fields`, `cardinality`, `broken references`, `degradacja preserve-first`).

## 1. Scope i zasady

1. Spec dotyczy warstwy danych i kontraktu walidacji, nie finalnej semantyki retail runtime.
2. Dla pol o statusie `UNKNOWN_RETAIL` walidator nie moze robic twardej normalizacji semantycznej.
3. Walidator ma byc deterministyczny i raportowac kodowane diagnozy (`code`, `severity`, `path`, `details`).

## 2. Evidence base (reverse)

1. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0600_are_git_ifo_deep_profile.json`
2. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0418_ifo_area_map.json`
3. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0437_git_trigger_schema_profile.json`
4. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0426_door_profile.json`
5. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0426_placeable_profile.json`
6. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0426_waypoint_profile.json`
7. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0858_git_list_grounditem_contract_matrix.json`
8. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0551_git_areaproperties_profile.json`
9. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0518_door_trigger_transition_matrix.json`
10. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\DOOR_TRANSITION_FIELD_STATUS_MATRIX_2026-05-19.md`
11. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\DOOR_TRANSITION_DEST_KEY_ALIAS_COMPAT_2026-05-20.md`
12. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\AURORA_RE_RETAIL_20_ANSWERS_SNAPSHOT_2026-05-18.md`
13. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\AURORA_RE_RETAIL_HARD_CONFIRM_BACKLOG_20.md`

## 3. Severity i policy

1. `ERROR`: obiekt nie spelnia minimalnego kontraktu parse/load dla pipeline backend.
2. `WARN`: obiekt jest przetwarzalny, ale ma niespojnosc albo ryzyko parity.
3. `INFO`: telemetry/diagnostic bez blokowania.

Tryby:
1. `strict`: kazdy `ERROR` blokuje wynik.
2. `warn`: `ERROR` jest degradowany do `WARN` tylko dla reguly oznaczonej jako `degradable=true`.
3. `audit`: nic nie blokuje, wszystko raportowane jako `WARN/INFO`.

## 4. Required fields

## 4.1 ARE top-level required (43/43 w corpusie)

Wymagane pola top-level ARE:
1. `ChanceLightning`
2. `ChanceRain`
3. `ChanceSnow`
4. `Comments`
5. `Creator_ID`
6. `DayNightCycle`
7. `Expansion_List`
8. `Flags`
9. `FogClipDist`
10. `Height`
11. `ID`
12. `IsNight`
13. `LightingScheme`
14. `LoadScreenID`
15. `ModListenCheck`
16. `ModSpotCheck`
17. `MoonAmbientColor`
18. `MoonDiffuseColor`
19. `MoonFogAmount`
20. `MoonFogColor`
21. `MoonShadows`
22. `Name`
23. `NoRest`
24. `OnEnter`
25. `OnExit`
26. `OnHeartbeat`
27. `OnUserDefined`
28. `PlayerVsPlayer`
29. `ResRef`
30. `ShadowOpacity`
31. `SkyBox`
32. `SunAmbientColor`
33. `SunDiffuseColor`
34. `SunFogAmount`
35. `SunFogColor`
36. `SunShadows`
37. `Tag`
38. `Tile_List`
39. `TileBrdrDisabled`
40. `Tileset`
41. `Version`
42. `Width`
43. `WindPower`

Regula:
1. Brak ktoregokolwiek pola -> `ERROR ARE_REQUIRED_FIELD_MISSING`.
2. W `warn/audit` mozna degradawac do `WARN` tylko dla pol skryptowych (`OnEnter`, `OnExit`, `OnHeartbeat`, `OnUserDefined`), bez synthetic default dla pozostalych.

## 4.2 GIT top-level required

Wymagane pola top-level GIT:
1. `AreaProperties`
2. `Creature List`
3. `Door List`
4. `Encounter List`
5. `List`
6. `Placeable List`
7. `SoundList`
8. `StoreList`
9. `TriggerList`
10. `WaypointList`

Warunkowe:
1. `VarTable` jest opcjonalne (obecne 2/25).

Regula:
1. Brak required list/struct -> `ERROR GIT_TOPLEVEL_FIELD_MISSING` (`degradable=true`).
2. Degradacja: backend moze utworzyc pusta liste dla brakujacych list i pusty `AreaProperties` z `WARN GIT_TOPLEVEL_FIELD_SYNTHESIZED`.

## 4.3 IFO fields wymagane do spojnosci mapy area

Wymagane minimum:
1. `Mod_Area_list`
2. `Mod_Entry_Area`

Regula:
1. Brak pola -> `ERROR IFO_REQUIRED_FIELD_MISSING`.

## 5. Cardinality rules

## 5.1 ARE grid cardinality

1. `len(ARE.Tile_List)` musi byc rowne `ARE.Width * ARE.Height`.
2. Naruszenie -> `ERROR ARE_TILE_CARDINALITY_MISMATCH` (`degradable=false`).

## 5.2 GIT list cardinality

1. Wszystkie top-level listy GIT musza byc typu `list`.
2. Dopuszczalne jest `len=0` dla: `TriggerList`, `SoundList`, `Encounter List`, `StoreList`, `WaypointList`, `Door List`, `Creature List`, `Placeable List`, `List`.
3. Naruszenie typu -> `ERROR GIT_LIST_TYPE_INVALID`.
4. Ujemna dlugosc/list-span invalid -> `ERROR GIT_LIST_SPAN_INVALID`.

## 5.3 Trigger minimal cardinality

1. Dla kazdego triggera: `Geometry` powinna istniec.
2. Dla kazdego punktu geometrii: wymagane `PointX`, `PointY`, `PointZ`.
3. Jesli `Geometry` brak lub ma mniej niz 3 punkty: `WARN TRIGGER_GEOMETRY_MIN_CARDINALITY_UNCONFIRMED`.
4. Uwaga: backlog retail ma otwarty punkt o legalnosci triggera bez geometrii, dlatego domyslnie `WARN`, nie `ERROR`.

## 6. Broken references rules

## 6.1 Cross-resource (IFO <-> ARE/GIT)

1. Kazdy wpis `IFO.Mod_Area_list[i]` musi miec pare zasobow `<resref>.ARE` i `<resref>.GIT` w tym samym module.
2. `IFO.Mod_Entry_Area` musi byc elementem `IFO.Mod_Area_list`.
3. `IFO.Mod_Entry_Area` musi rozwiazywac sie do pary `ARE+GIT`.

Naruszenia:
1. `ERROR IFO_AREA_REF_MISSING_ARE`
2. `ERROR IFO_AREA_REF_MISSING_GIT`
3. `ERROR IFO_ENTRY_AREA_NOT_IN_AREA_LIST`
4. `ERROR IFO_ENTRY_AREA_UNRESOLVED`

## 6.2 Door/Trigger linkage references

Zakres referencji:
1. `Door List[*].LinkedTo`
2. `TriggerList[*].LinkedTo`

Reguly:
1. Jesli `LinkedTo` jest puste, brak bledu.
2. Jesli niepuste, walidator probuje rozwiazac target po `Tag` w zbiorach: `Door List`, `WaypointList`, `TriggerList`.
3. Dodatkowo dopuszcza match do area-resref z `Mod_Area_list` jako fallback.
4. Gdy brak dopasowania -> `WARN LINKEDTO_REFERENCE_UNRESOLVED`.
5. Dla drzwi: brak reciprocity pary A->B i B->A -> `WARN DOOR_LINK_RECIPROCITY_MISSING`.

Uzasadnienie:
1. Mapping `LinkedToFlags` i write-path destination fields nie maja hard retail closure, wiec unresolved reference ma status ostrzezenia, nie bloker.

## 7. Alias i normalization policy

## 7.1 Transition keys (door/trigger)

Akceptowane aliasy wejsciowe:
1. `TransitionDestin` i `TransitionDestination` -> canonical `transitionDestination`.
2. `LoadScreenID` i `LoadScreenId` -> canonical `loadScreenId`.

Reguly:
1. `last-wins` dla duplikatow aliasowych.
2. Surowy klucz (`rawKey`) musi byc zapisany do diagnostyki.
3. Nieznane klucze przejsc -> `INFO TRANSITION_UNKNOWN_KEY_IGNORED`.

## 7.2 Ambient volume alias

1. W `GIT.AreaProperties` akceptowac oba klucze: `AmbientSndNitVol`, `AmbientSndNightVol`.
2. Canonical emit ma wystawiac oba:
3. `ambientNightVol.rawNit`
4. `ambientNightVol.rawNight`
5. `ambientNightVol.effective` (bez semantycznej normalizacji retail; tylko policy lokalna).
6. Gdy oba obecne i rozne -> `WARN AMBIENT_NIT_NIGHT_CONFLICT`.

## 8. Numeric/value validation

1. Dla pol int parser musi odrzucac invalid token i overflow.
2. Parse-fail:
3. `ERROR NUMERIC_PARSE_INVALID` dla pol required-hard.
4. `WARN NUMERIC_PARSE_INVALID_DEGRADED` dla pol preserve-first.
5. Plus-prefixed token (`+1`) traktowac jako invalid w strict parser parity -> `WARN NUMERIC_PLUS_PREFIX_REJECTED`.

Zakresy hintowe (nie hard retail claim):
1. `AmbientSndDayVol`, `AmbientSndNitVol`, `AmbientSndNightVol` poza `0..127` -> `WARN AMBIENT_VOLUME_OUT_OF_HINT_RANGE`.
2. Wartosc surowa musi byc zachowana bez clampa na etapie ingest.

## 9. Degradacja preserve-first

Kolejnosc dzialania:
1. Parse surowe pola.
2. Walidacja kontraktu.
3. Zastosowanie degradacji tylko dla regul `degradable=true`.
4. Emisja obiektu + `diagnostics[]`.

Dozwolone degradacje:
1. Brak top-level list GIT -> synthetic pusta lista + warning.
2. Brak `AreaProperties` -> synthetic pusty struct + warning.
3. Alias conflict (`TransitionDestin` vs `TransitionDestination`) -> canonical `last-wins` + warning.
4. Unknown transition key -> ignore + info.

Niedozwolone degradacje:
1. Brak `ARE.Tile_List`.
2. Niespojnosc `Width*Height` vs `Tile_List`.
3. Brak `IFO.Mod_Area_list` albo nierozwiazywalny `Mod_Entry_Area`.

## 10. Diagnostic contract (required output)

Kazdy wpis diagnozy musi miec:
1. `code` (stabilny identyfikator reguly)
2. `severity` (`ERROR|WARN|INFO`)
3. `path` (JSONPath-like, np. `git.doorList[3].linkedTo`)
4. `message`
5. `details` (obiekt z wartosciami pomocniczymi)
6. `degraded` (`true|false`)

Minimalny zestaw kodow:
1. `ARE_REQUIRED_FIELD_MISSING`
2. `ARE_TILE_CARDINALITY_MISMATCH`
3. `GIT_TOPLEVEL_FIELD_MISSING`
4. `GIT_TOPLEVEL_FIELD_SYNTHESIZED`
5. `GIT_LIST_TYPE_INVALID`
6. `IFO_REQUIRED_FIELD_MISSING`
7. `IFO_ENTRY_AREA_NOT_IN_AREA_LIST`
8. `IFO_ENTRY_AREA_UNRESOLVED`
9. `IFO_AREA_REF_MISSING_ARE`
10. `IFO_AREA_REF_MISSING_GIT`
11. `LINKEDTO_REFERENCE_UNRESOLVED`
12. `DOOR_LINK_RECIPROCITY_MISSING`
13. `TRIGGER_GEOMETRY_MIN_CARDINALITY_UNCONFIRMED`
14. `AMBIENT_NIT_NIGHT_CONFLICT`
15. `AMBIENT_VOLUME_OUT_OF_HINT_RANGE`
16. `TRANSITION_UNKNOWN_KEY_IGNORED`
17. `NUMERIC_PARSE_INVALID`
18. `NUMERIC_PLUS_PREFIX_REJECTED`

## 11. R63 decyzja implementacyjna

1. Wdrozyc walidator jako warstwe policy-driven (`strict|warn|audit`) z preserve-first.
2. Traktowac ARE/IFO structural integrity jako hard gate.
3. Traktowac transition semantics i czesc audio/weather jako non-blocking diagnostics do czasu retail hard-confirm.
4. Zapisywac alias provenance (`rawKey`, `rawValue`) dla wszystkich pol z rozjazdem surface.
