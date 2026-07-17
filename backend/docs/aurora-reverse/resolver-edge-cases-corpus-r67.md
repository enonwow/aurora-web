# Resolver Edge Cases Corpus R67 (Agent C5)

Data: 2026-05-24  
Status: Draft corpus do implementacji/testow resolvera zrodel (R65/R66 aligned)

## 1. Cel i zakres

Ten corpus zbiera przypadki brzegowe resolvera zrodel dla:
- kolizji kandydatow,
- braku zasobu,
- aliasow `restype`,
- case-sensitivity,
- duplikatow.

Kazdy przypadek ma oczekiwany wynik i poziom ryzyka implementacyjnego/produkcyjnego.

## 2. Skala ryzyka

- `R1 (Critical)`: bledny wynik moze zwrocic zly payload area/runtime lub ukryc blad policy.
- `R2 (High)`: bledny wynik psuje determinism/provenance albo powoduje trudne do debugowania rozjazdy.
- `R3 (Medium)`: bledny wynik dotyczy glownie diagnostyki/trace, ale nie zawsze zmienia finalny winner.
- `R4 (Low)`: niski wplyw funkcjonalny, glownie hygiene/telemetry.

## 3. Katalog edge-case'ow

| ID | Kategoria | Scenariusz | Oczekiwany wynik resolvera (R65/R66) | Ryzyko |
|---|---|---|---|---|
| C-01 | Kolizje | `ARE` w `module_decompiled` i `module_packed` | Winner: `module_decompiled`; `hak/override/vanilla` pozostaja `blocked` dla finalnego `ARE`; trace zawiera tie-break rule | R1 |
| C-02 | Kolizje | `GIT` w `module_decompiled`, `module_packed`, dodatkowo kandydat `hak` | Winner: `module_decompiled`; kandydat `hak` oznaczony jako `SOURCE_LAYER_BLOCKED`; brak cross-lane mix dla pary area | R1 |
| C-03 | Kolizje | `UTC` w `module_packed` i `hak` | Winner: `module_packed` (pelny chain, ale `module` > `hak`); overlay `UTC -> GIT instance` dopiero po wyborze blueprintu | R2 |
| C-04 | Kolizje | `UTP` w `hak` i `override` | Winner: `hak`; `override` przegrywa mimo obecnosci | R2 |
| C-05 | Kolizje | `models/textures` w dwoch HAK o roznych `hakPriorityEffective` | Winner: wyzszy `hakPriorityEffective`; trace z `SOURCE_TIEBREAK_APPLIED` | R2 |
| C-06 | Kolizje | Remis `hakPriorityEffective` w tej samej warstwie | Winner: kandydat pozniej zaindeksowany (`catalogOrder`); wynik stabilny miedzy requestami | R2 |
| M-01 | Brak zasobu | `ARE` istnieje tylko w `hak`/`override`, brak w module | `unresolved`; diagnostyka: `SOURCE_LAYER_BLOCKED` + `SOURCE_RESOLVE_MISS` | R1 |
| M-02 | Brak zasobu | `GIT` istnieje tylko w `vanilla`, brak w module | `unresolved`; diagnostyka blocked-layer zgodna z module-bound policy | R1 |
| M-03 | Brak zasobu | `ARE` jest w module, `GIT` tylko w `hak` | Pair invalid (`ARE/GIT` policy violation), brak cichego fallbacku do `hak` | R1 |
| M-04 | Brak zasobu | `2DA` brak w `module/hak/override`, obecne w `vanilla` | Winner: `vanilla`; jawny fallback diagnostic (bez silent fallback) | R2 |
| M-05 | Brak zasobu | `UTC/UTP/models/textures` brak we wszystkich warstwach | `unresolved`; kompletna candidate trace + `SOURCE_RESOLVE_MISS` | R2 |
| A-01 | Aliasy restype | Ten sam zasob raportowany raz jako kod (`2009/2010/2038`), raz jako token (`NSS/NCS/FAC`) | Normalizacja do wspolnego canonical `FileType` przed matchingiem; brak podwojnych bucketow `(resref, restype)` | R2 |
| A-02 | Aliasy restype | Alias enum-id: `DFT` i `DTF` (to samo ID 2045) | Jednoznaczny canonical type w resolver output; trace zachowuje oryginal jako metadata | R3 |
| A-03 | Aliasy restype | Typy normalizowane runtime (`QST2->QST`, `MDX2->MDX`, `TXB2->TXB`, `MDB2->MDB`, `MDA2->MDA`, `SPT2->SPT`, `JPG2->JPG`) | Resolver scala alias do typu bazowego zanim liczy precedence | R2 |
| A-04 | Aliasy restype | Game-profile alias przez `addTypeAlias(alias, realType)` | Resolver respektuje mapowanie aliasu i nie traktuje aliasu jako osobnego typu finalnego | R2 |
| S-01 | Case-sensitivity | Rozne case rozszerzenia (`.2DA`, `.2da`, `.MdL`) | Ten sam `restype` po `toLower()` rozszerzenia; brak driftu winnera przez case extension | R2 |
| S-02 | Case-sensitivity | Rozny case `resref` (`Foo`, `foo`) | Tozsamosc po hashu lower-case; traktowane jako ten sam candidate key | R2 |
| S-03 | Case-sensitivity | Klucze transition: `LoadScreenID` vs `LoadScreenId` vs near-miss (`loadscreenid`) | Akceptacja tylko znanych aliasow; near-miss ignorowany; effective value wg `last-wins` dla aliasow | R3 |
| S-04 | Case-sensitivity | Profile key mismatch (`AmbientSndNightVol` vs `AmbientSndNitVol`) | Brak automatycznej "zgadywanki"; preserve + jawna diagnostyka alias mismatch | R3 |
| D-01 | Duplikaty | Dwa moduly o tym samym basename (`DEMO-Plague.mod`) w roznych sciezkach | Brak laczenia po basename; selekcja po pelnej sciezce/fingerprint; emit duplicate-basename diagnostic | R1 |
| D-02 | Duplikaty | Duplikat tego samego `(resref, restype, layer)` z roznych originow | Deterministyczny winner wg `catalogOrder`; trace zawiera losers | R2 |
| D-03 | Duplikaty | Hash collision na nazwach po `toLower` (inne nazwy, ten sam hash) | Warning o kolizji hash + zachowana deterministyczna decyzja precedence | R2 |
| D-04 | Duplikaty | Powtorzone klucze aliasowe w ingest (`LoadScreenID` + `LoadScreenId`) | `effective` = ostatnia wartosc, `raw` zachowane do round-trip/diagnostyki | R3 |
| D-05 | Duplikaty | Duplikaty tagow targetu przejsc (`getFirstObjectByTag`) | Resolver metadata oznacza ryzyko niedeterministycznego targetu; brak ukrywania konfliktu | R2 |

## 4. Minimalny zestaw diagnostyk wymaganych przez corpus

1. `SOURCE_RESOLVE_MISS`
2. `SOURCE_LAYER_BLOCKED`
3. `SOURCE_TIEBREAK_APPLIED`
4. `SOURCE_POLICY_VIOLATION`
5. `SOURCE_DUPLICATE_BASENAME`
6. `SOURCE_RESTYPE_ALIAS_NORMALIZED`
7. `SOURCE_CASE_ALIAS_IGNORED`
8. `SOURCE_HASH_COLLISION_WARNING`

## 5. Material dowodowy (reverse + R65/R66)

1. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\resource-precedence-matrix-r65.md`
2. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\implementation-slice-source-resolver-r66.md`
3. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\unknowns-linkedtoflags-loadscreenid-r65.md`
4. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0619_mod_basename_collision_scan.json`
5. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0635_mod_restype_matrix.json`
6. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0827_trap_script_area_alias_matrix.json`
7. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-19_2012_module_ifo_script_alias_probe.json`
8. `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\types.h`
9. `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\util.cpp`
10. `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\resman.h`
11. `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\resman.cpp`

## 6. Kryterium gotowosci corpusu do testow

Corpus R67 uznaje sie za gotowy, gdy kazdy przypadek z sekcji 3 ma:
1. fixture wejscia (`candidate set` + policy context),
2. jawny expected winner/unresolved,
3. expected diagnostics,
4. mapping do testu (`unit`/`integration`/`contract`).
