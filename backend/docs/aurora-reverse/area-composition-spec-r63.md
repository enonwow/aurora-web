# Area Composition Extraction Spec (R63, Agent C1)

## 1. Scope
Spec definiuje pipeline ekstrakcji area dla backendu Aurora:
- wejscie: ARE + GIT (oraz diagnostyka SET/compose),
- wyjscie: kanoniczny model `composition.*`,
- kompatybilnosc: migracja od legacy `objects[]`.

Dokument jest oparty na evidence z:
- `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\LC_AURORA_RE_KNOWLEDGE_BASE.md`
- `C:\Projects\nwn-last-city\Aurora\reverse\docs\Areas3D-Audits\AREAS3D_RE_AREA_TILESET_PIPELINE_AUDYT_2026-05-18.md`
- `C:\Projects\nwn-last-city\Aurora\reverse\_RECOVERED_FROM_AI_DOCUMENTATIONS\reports\areas3d-handoff\IMPLEMENTATION_REPORTS_FROM_019e3315.md`

## 2. Evidence baseline (reverse)

### 2.1 Kolejnosc i powierzchnia loadera
- Loader area jest modelowany jako `ARE -> GIT` dla tego samego resref.
  - Evidence: `...\LC_AURORA_RE_KNOWLEDGE_BASE.md:1116`.
- Profil `nwn` laduje z GIT: `AreaProperties`, `WaypointList`, `Placeable List`, `Door List`, `Creature List`.
  - Evidence: `...\LC_AURORA_RE_KNOWLEDGE_BASE.md:1218`, `:2215`, `:2282`.
- Profil `nwn2` rozszerza to o `EnvironmentList` i `StoreList`.
  - Evidence: `...\LC_AURORA_RE_KNOWLEDGE_BASE.md:1220`, `:2216`, `:2283`.

### 2.2 Fakty o strukturze GIT/ARE
- W corpusie top-level listy GIT sa stale obecne (`TriggerList`, `SoundList`, `Encounter List`, `StoreList`, `WaypointList`, `Placeable List`, `Door List`, `Creature List`, `List`).
  - Evidence: `...\LC_AURORA_RE_KNOWLEDGE_BASE.md:1538`.
- `GIT.List` ma semantyke ground items, nie `EnvironmentList`.
  - Evidence: `...\LC_AURORA_RE_KNOWLEDGE_BASE.md:2142`.
- `ARE.Tile_List` spelnia kardynalnosc `Width*Height` w corpusie i jest kluczowym gate parity.
  - Evidence: `...\LC_AURORA_RE_KNOWLEDGE_BASE.md:1399`.

### 2.3 Pipeline compose/export i telemetry
- Mapa pipeline area: `are_parser -> set selection -> area_compose -> export_area`.
  - Evidence: `...\AREAS3D_RE_AREA_TILESET_PIPELINE_AUDYT_2026-05-18.md:7-13`.
- `composeStats` i `setSelection` to first-class telemetry compose.
  - Evidence: `...\AREAS3D_RE_AREA_TILESET_PIPELINE_AUDYT_2026-05-18.md:99`, `:104-105`.
- Tile cardinality diagnostics sa wynoszone do `metadata`, `composeStats`, `manifest` i maja policy `warn|strict`.
  - Evidence: `...\IMPLEMENTATION_REPORTS_FROM_019e3315.md:114-119`.
- GIT metadata parser jest odseparowany od `include_placeables` (`include_git_metadata` + status markers).
  - Evidence: `...\IMPLEMENTATION_REPORTS_FROM_019e3315.md:287-289`, `:872-873`.
- Schema top-level list GIT jest telemetryczna i ma gate walidacyjny policy-aware.
  - Evidence: `...\IMPLEMENTATION_REPORTS_FROM_019e3315.md:1085-1090`, `:1104-1108`.
- Legacy sceny bez telemetry schema sa utrzymywane jako backward-compatible.
  - Evidence: `...\IMPLEMENTATION_REPORTS_FROM_019e3315.md:1116`.

## 3. Canonical extraction pipeline (ARE/GIT -> composition.*)

### Stage 0: Source resolution
1. Resolve `ARE`, `GIT`, opcjonalnie `SET` i sidecars z deterministycznym source provenance.
2. Dla kazdego odczytu zapisac `sourcePath/sourceType` w telemetry.
3. Unikac mieszania source podczas compose (source-locked resolution).

### Stage 1: Parse ARE (terrain lane)
1. Odczytac `Width`, `Height`, `Tileset`, `Flags`, `HasTerrain`.
2. Odczytac `Tile_List` jako canonical, `TileList` jako alias fallback.
3. Wyprowadzic `tileListSource` i diagnostyke aliasowa.

### Stage 2: ARE validation gate
1. Obliczyc `expected = Width * Height`.
2. Obliczyc `actual = len(Tile_List)`.
3. Emitowac `tileListCardinality` (`expected`, `actual`, `delta`, `severity`, `code`).
4. Policy:
- `warn`: kontynuuj eksport + issue.
- `strict`: przerwij eksport przed zapisem artefaktow.

### Stage 3: Parse GIT metadata lane
1. Parse first-class list:
- `Placeable List`
- `Door List`
- `Creature List`
- `WaypointList`
- `TriggerList`
- `List` (ground items)
2. Parse preserve-first lane:
- `SoundList`
- `Encounter List`
- `StoreList`
- `EnvironmentList`
- `AreaProperties`
3. Dla kazdej listy policzyc `raw/loaded/failed` + parse diagnostics per entry/per list.
4. Utrzymac `include_git_metadata` jako niezalezny przelacznik od geometrii placeables.

### Stage 4: Normalize/profile policy
1. Runtime profile (`xoreos-nwn` / `xoreos-nwn2`) steruje interpretacja lane runtime-consumed vs preserve-only.
2. Alias policy:
- `AmbientSndNitVol` vs `AmbientSndNightVol` (dual-key ingest, explicit source key).
- `Tile_List` vs `TileList`.
3. Transform policy preserve-first:
- prefer `Position/Orientation`, fallback do `X/Y/Z` i `Bearing` lub `XOrientation/YOrientation`.

### Stage 5: Compose projection -> `composition.*`
Kanoniczna projekcja DTO:
- `composition.tiles[]` <- ARE `Tile_List` (+ parity fields tile properties).
- `composition.placeables[]` <- `Placeable List`.
- `composition.doors[]` <- `Door List`.
- `composition.creatures[]` <- `Creature List`.
- `composition.waypoints[]` <- `WaypointList`.
- `composition.triggers[]` <- `TriggerList`.
- `composition.items[]` <- top-level `GIT.List` (ground items).
- `composition.sounds[]` <- `SoundList` (preserve-first; runtime may be gap).
- `composition.encounters[]` <- `Encounter List` (preserve-first).
- `composition.stores[]` <- `StoreList` (profile-aware runtime lane).
- `composition.environment[]` <- `EnvironmentList` (profile-aware runtime lane).
- `composition.areaProperties` <- `GIT.AreaProperties` (+ observed/unknown keys).

### Stage 6: Diagnostics and artifacts
1. Emit telemetry rownolegle do `composition.*`:
- `scene.metadata.*`
- `scene.metadata.composeStats.*`
- `manifest.*`
2. Minimalny zestaw:
- `setSelectionDiagnostics`
- `tileListCardinality`
- `gitTopLevelListSchema`
- `gitParseDiagnosticsPerList`
- `gitMetadataStatus` / `gitMetadataPolicy`
- `runtimeProfile`

### Stage 7: Validation gates (policy)
1. `GIT_TOP_LEVEL_LIST_SCHEMA_MISMATCH` policy-aware severity (`warn|strict`).
2. Parse-failure issues per list (`*_PARSE_FAILED`) z indeksami preview.
3. Preserve-only lanes nie sa cicho dropowane; sa oznaczane jako telemetryczne i ewentualnie warningowane profilem runtime.

## 4. Migracja z legacy `objects[]`

## 4.1 Cel
Przejsc na `composition.*` bez zerwania kompatybilnosci API i bez utraty danych preserve-first.

## 4.2 Wejscie (read path)
1. Jezeli payload ma `composition.*`: to jest source-of-truth.
2. Jezeli brak `composition.*`, a jest `objects[]`:
- zmapowac `objects[]` do `composition.*` deterministycznie,
- zapisac `migration.meta.source = "legacy_objects"`,
- emitowac `migration warning` tylko informacyjny (nie blocker).

## 4.3 Mapowanie `objects[]` -> `composition.*`
1. `kind=placeable` -> `composition.placeables[]`
2. `kind=creature` -> `composition.creatures[]`
3. `kind=door` -> `composition.doors[]`
4. `kind=sound` -> `composition.sounds[]`
5. `kind=item` -> `composition.items[]`
6. `kind` nieznany -> `composition.unknown[]` (preserve-first, bez drop).

## 4.4 Wspolistnienie i konflikt
1. Gdy obecne sa oba (`objects[]` i `composition.*`), canonical jest `composition.*`.
2. Gdy wykryto rozjazd count/payload:
- `warn`: issue `LEGACY_OBJECTS_COMPOSITION_MISMATCH` + metadata diff summary.
- `strict`: reject write.
3. Dla kompatybilnosci outbound mozna tymczasowo generowac `objects[]` jako projection z `composition.*` (shadow field, deprecated).

## 4.5 Etapy deprecacji
1. Etap A: dual-read, dual-write (`composition.*` canonical, `objects[]` shadow).
2. Etap B: dual-read, single-write (`composition.*` only write).
3. Etap C: dual-read z hard warning na `objects[]`.
4. Etap D: remove `objects[]` po oknie migracyjnym.

## 4.6 Uzasadnienie reverse-first
Reverse pokazuje preferowany wzorzec: dodawac telemetry i structured lane bez zrywania legacy consumerow, a gate aktywowac gdy producer wystawia nowy kontrakt (`gitTopLevelListSchema`).
- Evidence: `...\IMPLEMENTATION_REPORTS_FROM_019e3315.md:94-98`, `:134-137`, `:455`, `:1116`.

## 5. Minimalny acceptance matrix dla C1
1. `ARE->GIT` ekstrakcja i source provenance jest deterministyczna.
2. `Tile_List` cardinality gate dziala (`warn|strict`).
3. Top-level list schema gate dziala (`warn|strict`).
4. `composition.*` zawiera wszystkie lane z sekcji Stage 5 (runtime + preserve-first).
5. `GIT.List` nie jest gubione; trafia do `composition.items[]`.
6. `AreaProperties` alias `NitVol/NightVol` jest jawny i profile-aware.
7. Migracja `objects[] -> composition.*` jest bezstratna (preserve-first) i ma jawny telemetry marker.

## 6. Non-goals
- Ten dokument nie definiuje write-path editora dla wszystkich list GIT (sound/encounter/store/environment) - tylko kontrakt ekstrakcji i migracji read modelu.
- Ten dokument nie zamyka retail hard-confirm wszystkich semantics runtime; utrzymuje profile-aware parity policy.
