# Implementation Slice 2: Source Resolver (R66)

Data: 2026-05-24  
Status: Plan implementacji  
Owner: Agent C4

## 1. Cel Slice 2

Celem Slice 2 jest wdrozenie deterministycznego resolvera zrodel dla lookupu zasobow:
- `ARE`
- `GIT`
- `UTC`
- `UTP`
- `models/textures`
- `2DA`
- `TLK`

Resolver ma zapewnic:
1. Staly precedence chain miedzy warstwami (`module_decompiled`, `module_packed`, `hak`, `override`, `vanilla`).
2. Type-aware policy (wyjatki dla `ARE/GIT`, special flow dla `TLK`).
3. Pelna provenance i debug trace dla kazdej decyzji.
4. Brak cichych fallbackow i deterministyczne tie-break.

## 2. Zakres i granice

## 2.1 In-scope
1. Read-path resolver dla wszystkich typow z listy.
2. Precedence matrix per typ zasobu.
3. Moduly domenowe i adaptery do istniejacych portow backendu.
4. Test matrix: unit, integration, contract.

## 2.2 Out-of-scope (Slice 2)
1. Migracje danych historycznych.
2. Refaktor calego pipeline decompile/extract.
3. Write-targeting contract dla edycji (osobny slice).

## 3. Precedence Matrix (R66)

## 3.1 Globalny chain warstw
Domyslny porzadek kandydatow (highest -> lowest):
1. `module_decompiled`
2. `module_packed`
3. `hak` (wg `hakPriorityEffective`)
4. `override`
5. `vanilla KEY/BIF`

## 3.2 Tie-break rules
1. `module_decompiled` zawsze wygrywa nad `module_packed`.
2. W warstwie `hak` wygrywa najwyzszy `hakPriorityEffective`.
3. Przy remisie w tej samej warstwie wygrywa kandydat pozniej zaindeksowany (stabilny wynik).
4. Kazdy tie-break musi byc zapisany w trace (`winner`, `losers`, `rule`).

## 3.3 Matrix per resource type

| Resource type | Priority 1 | Priority 2 | Priority 3 | Priority 4 | Priority 5 | Rule |
|---|---|---|---|---|---|---|
| `ARE` | `module_decompiled` | `module_packed` | `hak (blocked)` | `override (blocked)` | `vanilla (blocked)` | Module-bound. Final source tylko modul. |
| `GIT` | `module_decompiled` | `module_packed` | `hak (blocked)` | `override (blocked)` | `vanilla (blocked)` | Module-bound. Pairing z `ARE` tego samego area resref. |
| `UTC` | `module_decompiled` | `module_packed` | `hak` | `override` | `vanilla` | Pelny chain. Potem overlay semantyczny: `UTC -> GIT instance`. |
| `UTP` | `module_decompiled` | `module_packed` | `hak` | `override` | `vanilla` | Pelny chain. Potem overlay semantyczny: `UTP -> GIT instance`. |
| `models/textures` | `module_decompiled` | `module_packed` | `hak` | `override` | `vanilla` | Pelny chain runtime asset resolve. |
| `2DA` | `module_decompiled` | `module_packed` | `hak` | `override` | `vanilla` | Pelny chain z provenance i deterministic fallback. |
| `TLK` | `module_decompiled` | `module_packed` | `hak` | `override` | `vanilla` | Najpierw lookup pliku TLK po chainie, potem `locstring inline -> custom TLK -> base TLK`. |

## 4. Architektura modulow (Implementation Plan)

## 4.1 Modul: `source-resolver-core`
Odpowiedzialnosc:
1. Orkiestracja lookupu z policy per typ.
2. Egzekucja precedence chain i tie-break.
3. Zwrot wyniku `ResolvedResource` + `ResolutionTrace`.

Proponowane artefakty:
- `SourceResolverService`
- `SourceResolutionPolicy`
- `ResolutionTraceBuilder`

Kontrakt wyjscia:
- `winner`: source candidate lub `null`
- `provenance`: warstwa, origin path, hak metadata
- `diagnostics`: warnings/errors
- `trace`: ordered candidate evaluation

## 4.2 Modul: `source-catalog`
Odpowiedzialnosc:
1. Utrzymanie indeksu kandydatow po `(resref, restype)`.
2. Zwrot list kandydatow w formacie neutralnym dla resolvera.
3. Oznaczanie blocked/non-blocked candidate lanes.

Proponowane artefakty:
- `ResourceCandidateCatalog`
- `CandidateIndexRecord`
- `CatalogSnapshotVersion`

Uwagi:
- Katalog musi byc immutable per request (deterministic reads).

## 4.3 Modul: `resource-type-policies`
Odpowiedzialnosc:
1. Definicja policy per typ zasobu.
2. Egzekucja ograniczen `module-bound` dla `ARE/GIT`.
3. Specjalne flow `TLK` i fallback semantics.

Proponowane artefakty:
- `AreaResourcePolicy` (`ARE/GIT`)
- `BlueprintPolicy` (`UTC/UTP`)
- `AssetPolicy` (`models/textures`)
- `TwoDaPolicy`
- `TlkPolicy`

## 4.4 Modul: `hak-priority-resolver`
Odpowiedzialnosc:
1. Normalizacja i porzadkowanie kandydatow HAK.
2. Rozstrzyganie remisow `hakPriorityEffective`.
3. Emisja metadanych `hakPrioritySource` do trace.

Proponowane artefakty:
- `HakPrioritySorter`
- `HakTieBreakRule`

## 4.5 Modul: `source-resolver-observability`
Odpowiedzialnosc:
1. Standaryzacja kodow diagnostycznych.
2. Logi decyzyjne i metryki resolve.
3. Surface debug payload dla API/internal events.

Proponowane diagnostyki:
- `SOURCE_RESOLVE_MISS`
- `SOURCE_LAYER_BLOCKED`
- `SOURCE_TIEBREAK_APPLIED`
- `SOURCE_POLICY_VIOLATION`

## 5. Kontrakty danych

## 5.1 Candidate input (uproszczony)
- `resref`
- `restype`
- `layer` (`module_decompiled|module_packed|hak|override|vanilla`)
- `origin` (path/id)
- `hakPriorityEffective` (optional)
- `catalogOrder` (stabilny index)

## 5.2 Resolver output
- `resolved`: boolean
- `winnerCandidate`: object|null
- `resolutionLayer`: enum|null
- `traceId`: string
- `candidateTrace[]`: ordered decisions
- `diagnostics[]`

## 6. Implementacja krok po kroku

1. Dodac `SourceResolutionPolicy` i typy domenowe.
2. Dodac `SourceResolverService` z globalnym chainem i tie-break.
3. Dodac policy plug-iny per resource type (`ARE/GIT/UTC/UTP/models/textures/2DA/TLK`).
4. Podlaczyc `hak-priority-resolver` do lane `hak`.
5. Podlaczyc `source-catalog` jako jedyne zrodlo candidate list.
6. Dodac trace + diagnostics (log + payload).
7. Zintegrowac z punktami lookupu area/blueprint/asset/2da/tlk.
8. Dodac testy unit/integration/contract.

## 7. Test Matrix (R66)

## 7.1 Unit tests

| ID | Area | Scenario | Expected |
|---|---|---|---|
| U1 | Global precedence | Candidate w kazdej warstwie | Winner = `module_decompiled` |
| U2 | Tie-break hak | 2 kandydaty HAK, rozne `hakPriorityEffective` | Winner = najwyzszy `hakPriorityEffective` |
| U3 | Tie-break stable | Remis priorytetu i warstwy | Winner = pozniej zaindeksowany |
| U4 | ARE policy | `ARE` obecne w `hak/override`, brak w module | `blocked-layer` + unresolved |
| U5 | GIT policy | `GIT` obecne w `vanilla`, brak w module | `blocked-layer` + unresolved |
| U6 | UTC full chain | `UTC` w `module_packed` i `hak` | Winner = `module_packed` |
| U7 | UTP full chain | `UTP` tylko w `override` | Winner = `override` |
| U8 | TLK flow | Locstring inline obecny | Return inline, bez lookup TLK text |
| U9 | TLK flow | Brak inline, custom TLK hit | Return custom TLK value |
| U10 | TLK flow | Brak custom hit, base TLK hit | Return base TLK value |

## 7.2 Integration tests

| ID | Area | Scenario | Expected |
|---|---|---|---|
| I1 | Catalog + resolver | Mixed candidates z wszystkich lane | Deterministyczny winner + complete trace |
| I2 | ARE/GIT pairing | `ARE` from module, `GIT` from hak only | Pair invalid + diagnostic policy violation |
| I3 | HAK ordering | 3 HAK z roznymi priority source | Winner zgodny z `hakPriorityEffective` |
| I4 | 2DA fallback | Brak w module/hak/override, jest w vanilla | Winner = vanilla + fallback diagnostic |
| I5 | Models/textures | Kolizja `hak` vs `override` | Winner = `hak` |

## 7.3 Contract/E2E tests

| ID | Endpoint/Flow | Scenario | Expected |
|---|---|---|---|
| C1 | Area composition | `ARE/GIT` tylko module-packed | Poprawny load area payload |
| C2 | Creature enrichment | `UTC` resolve + GIT overlay | Blueprint + instance overlay bez driftu |
| C3 | Placeable enrichment | `UTP` resolve + GIT overlay | Stable output + provenance |
| C4 | Source diagnostics API | Resolve miss dla `ARE` | `SOURCE_RESOLVE_MISS` + blocked-layer details |
| C5 | Repeatability | Ten sam request 10x | Identyczny winner i trace order |

## 8. Ryzyka i mitigacje

1. Ryzyko: niedeterministyczny porzadek kandydatow z katalogu.  
Mitigacja: immutable snapshot + `catalogOrder` mandatory.

2. Ryzyko: mylenie semantyki `override` vs `hak`.  
Mitigacja: wspolny helper precedence i testy regresji `hak > override`.

3. Ryzyko: bledna implementacja `ARE/GIT module-bound`.  
Mitigacja: osobna policy class + hard tests U4/U5/I2.

4. Ryzyko: niepelna observability.  
Mitigacja: trace mandatory dla kazdego resolve, takze przy miss.

## 9. Kryteria akceptacji Slice 2

1. Dla kazdego typu zasobu dziala policy zgodna z matrix R66.
2. `ARE/GIT` nigdy nie sa finalnie rozwiazywane z `hak/override/vanilla`.
3. `UTC/UTP/models/textures/2DA/TLK` uzywaja pelnego chaina.
4. Kazda decyzja resolvera ma provenance + trace + diagnostics.
5. Wszystkie testy z matrix (`U*`, `I*`, `C*`) przechodza.

## 10. Kolejnosc wdrozenia (proponowana)

1. Core domain + policy interfaces.
2. Resource-type policies.
3. Catalog adapter + hak sorter.
4. Observability + diagnostics.
5. Integracja z pipeline lookup.
6. Pelna macierz testowa i gate CI.

## 11. Referencje

1. `resource-precedence-matrix-r65.md`
2. `module-source-priority-spec-r63.md`
3. `source-lists-2da-tlk-spec-r63.md`
4. `hak-resolution-spec-r63.md`
5. `area-composition-spec-r63.md`
6. `creature-enrichment-spec-r63.md`
