# Schema Evolution Rules Spec R63 (Agent W1)

Data: 2026-05-24
Status: Draft for backend API/DTO governance
Zakres: reguly ewolucji kontraktow API/DTO dla `placeable`, `creature`, `area` (compatibility, versioning, deprecation windows, migration flags).

## 1. Scope i cele

Dokument definiuje jednolity policy layer dla zmian kontraktow:
1. Jak wprowadzac zmiany bez zrywania klientow (`compatibility-first`).
2. Jak wersjonowac payloady i endpointy (`schema + transport versioning`).
3. Jak prowadzic deprecacje i kiedy wolno usuwac pola.
4. Jak sterowac migracja flagami runtime/API.

Dokument jest normatywny dla DTO:
1. `PlaceablePreviewMetadataDto` / klasyfikacja `placeable|vfx`.
2. `CreatureEnrichmentDto` + `CreaturePreviewMetadataDto`.
3. `AreaPreviewMetadataDto` + `composition.*` (w tym migracja z `objects[]`).

## 2. Evidence baseline (Aurora Reverse R63)

Zasady sa oparte o:
1. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\placeable-classification-spec-r63.md`
2. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\creature-enrichment-spec-r63.md`
3. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\area-composition-spec-r63.md`
4. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\preview-metadata-contract-spec-r63.md`
5. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\asset-id-strategy-spec-r63.md`
6. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\source-lists-2da-tlk-spec-r63.md`
7. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\processing-job-lifecycle-spec-r63.md`

## 3. Versioning model (obowiazkowy)

## 3.1 Warstwy wersji

Kazdy payload i endpoint MUSI miec rozdzielone warstwy wersji:
1. `transportVersion`:
- zarzadzana przez route/media-type (np. `/api/v1/...`).
- breaking change HTTP shape/status semantics wymaga nowej transport major (`v2`).
2. `schema`:
- stable schema id, np. `aurora-preview-metadata`, `aurora-creature-enrichment`.
3. `schemaVersion`:
- format `MAJOR.MINOR.PATCH-rNN` (np. `0.6.3-r63`).
- `MAJOR`: breaking field semantics/requiredness.
- `MINOR`: backward-compatible additive changes.
- `PATCH`: non-breaking corrections/diagnostics/text.

## 3.2 Zasada zgodnosci wersji

1. Producent (backend) MOZE emitowac nowszy `MINOR/PATCH`, jesli klient konsumuje starszy minor i stosuje forward-compatible parser.
2. Klient MUSI ignorowac nieznane pola i nieznane `tags`.
3. Nieznane wartosci enum MUSZA byc mapowane do `unknown` lane (nie hard fail), chyba ze endpoint jest strict-typed i jawnie oznaczony jako `strict-contract`.
4. Zmiana `MAJOR` wymaga:
- nowego endpointu albo negotiated media-type,
- rownoleglego okresu dual-serve.

## 4. Compatibility taxonomy

## 4.1 Zmiany kompatybilne (dozwolone bez nowego MAJOR)

1. Dodanie pola opcjonalnego.
2. Dodanie nowego kodu diagnostycznego (`code`) przy zachowaniu `severity`.
3. Dodanie nowego `tag` i nowej sekcji telemetrycznej opcjonalnej.
4. Dodanie nowego wariantu preview (`previewMode`) tylko wtedy, gdy istnieje fallback `placeholder`.
5. Rozszerzenie list `composition.*` o preserve-first lane opcjonalne.

## 4.2 Zmiany niekompatybilne (wymagaja MAJOR)

1. Usuniecie pola bez okresu dual-write/deprecation.
2. Zmiana pola z optional -> required.
3. Zmiana typu (`number -> string`, `object -> array`) bez alias lane.
4. Zmiana znaczenia semantycznego pola przy tej samej nazwie.
5. Zmiana invariants identity (`instanceId`, `areaInstanceId`, `sourceIndex`) bez migracji wersji.

## 4.3 Alias i rename policy

1. Rename MUSI byc wdrazany jako:
- etap 1: dual-read + dual-write (`old` + `new`),
- etap 2: read-old/write-new,
- etap 3: remove-old po oknie deprecacji.
2. Aliasy MUSZA byc jawnie dokumentowane w migration flags i w changelog kontraktu.
3. Preserve-first: surowe dane (`rawToken`, `preserveRaw`) nie moga byc tracone przez rename.

## 5. Invariants kontraktowe dla placeable/creature/area

## 5.1 Wspolne invariants

1. `schema` i `version` MUSZA byc obecne w kazdym DTO.
2. `validationIssueCounts` MUSI byc spojne z `topIssues`.
3. `previewAllowed` i `editSafe` sa backend-authoritative (frontend nie liczy tych flag samodzielnie).
4. `sourceList/sourceIndex` oraz stable identity (`instanceId`/`areaRevision`) sa immutable w granicach tej samej rewizji danych.

## 5.2 Placeable

1. `kind="vfx"` pozostaje podtypem `placeable`, nie osobnym top-level assetType.
2. `sourceList` dla placeable/vfx pozostaje `Placeable List`.
3. Zmiana klasyfikacji logicznej (`placeable -> vfx`) jest non-breaking tylko gdy pole `kind` juz istnieje i klient ma fallback.

## 5.3 Creature

1. Brak UTC (`utcResolved=false`) jest dopuszczalny kontraktowo.
2. Dodanie nowych pol enrichment jest non-breaking tylko jako opcjonalne.
3. `appearanceType` oraz transform lane nie moga zmienic typu bez MAJOR.

## 5.4 Area

1. `composition.*` jest canonical source-of-truth.
2. `objects[]` moze istniec tylko jako legacy shadow lane w okresie migracji.
3. `GIT.List -> composition.items[]` nie moze byc utracone podczas migracji.

## 6. Deprecation windows (normatywne)

## 6.1 Domyslne okna

1. Minimalne okno deprecacji dla pola: `max(2 release cycle, 90 dni kalendarzowych)`.
2. Dla breaking rename identity/enum semantics: `max(3 release cycle, 120 dni)`.
3. Krytyczne bezpieczenstwo/data-corruption fix moze skrocic okno, ale wymaga:
- hotfix notice,
- compatibility shim dla poprzedniego payloadu przez minimum 30 dni.

## 6.2 Harmonogram bazowy dla R63

Punkt startu: 2026-05-24 (R63).

1. `T0` (2026-05-24): ogloszenie deprecacji + dual-read/write.
2. `T1` (2026-06-21): read-old/write-new (shadow old lane tylko outbound).
3. `T2` (2026-08-22): najwczesniejsza data usuniecia deprecated lane (90 dni od T0).
4. `T3` (2026-09-21): hard removal dla zmian identity/semantics wymagajacych 120 dni.

Usuniecie przed `2026-08-22` jest niedozwolone dla zwyklej deprecacji.

## 7. Migration flags (runtime + API)

## 7.1 Flagi globalne

Rekomendowany kontrakt flag:
1. `X-Aurora-Contract-Version`: oczekiwana wersja schema (`0.6.x-r63` wildcard dopuszczalny po stronie gateway).
2. `X-Aurora-Migration-Mode`: `off | dual | strict`.
3. `X-Aurora-Legacy-Fields`: `include | omit`.

Semantyka:
1. `off`: nowy kontrakt tylko, bez shadow fields.
2. `dual`: nowy kontrakt + legacy shadow fields.
3. `strict`: reject request/response mismatch (do canary i CI contract tests).

## 7.2 Flagi per domena

1. Area:
- `migration.area.enableCompositionCanonical=true`
- `migration.area.emitLegacyObjectsShadow=true|false`
2. Placeable:
- `migration.placeable.enableVfxEvidence=true`
- `migration.placeable.emitTokenDiagnostics=true`
3. Creature:
- `migration.creature.enableUtcOverlayMarkers=true`
- `migration.creature.emitPreserveRaw=true`

## 7.3 Reguly uzycia flag

1. Flagi migracyjne MUSZA byc monotoniczne per release (brak cofania defaultu w dol bez incident exception).
2. Dla endpointow publicznych domyslnie startuje `dual`, a po koncu okna deprecacji przechodzi na `off`.
3. `strict` wlaczac tylko dla:
- canary consumerow,
- contract-tests,
- wewnetrznych narzedzi walidacyjnych.

## 8. Rollout policy (compatibility-first)

## 8.1 Etapy rolloutu

1. Etap A: `dual-read + dual-write`, telemetry mismatch enabled.
2. Etap B: `dual-read + write-new`, ostrzezenia deprecacyjne per response.
3. Etap C: `read-new + optional legacy outbound`.
4. Etap D: `read-new/write-new only`, legacy usuniete po oknie.

## 8.2 Gate do przejscia etapow

Przejscie do kolejnego etapu wymaga:
1. `P95 contract parse success >= 99.9%` dla aktywnych klientow.
2. Brak otwartych `P0/P1` regression tickets zwiazanych z kontraktem.
3. Telemetry `legacy field usage` ponizej 5% przez minimum 14 dni.

## 9. API behavior i komunikacja deprecacji

1. Deprecated pola MUSZA miec naglowek ostrzegawczy:
- `Deprecation: true`
- `Sunset: <RFC1123 date>`
2. Response body SHOULD zawierac:
- `contractWarnings[]` z kodem `CONTRACT_FIELD_DEPRECATED`.
3. Dla requestow strict mismatch:
- `409` dla conflict semantycznego,
- `422` dla invalid shape.

## 10. Contract test requirements

Minimalny zestaw testow:
1. Forward compatibility parser (`unknown fields`, `unknown tags`, `unknown diagnostics`).
2. Dual mode snapshot tests (`legacy on/off`).
3. Identity invariants (`instanceId`, `areaRevision`, `sourceIndex`) niezmienne w tej samej rewizji.
4. Area migration tests: `objects[] <-> composition.*` bez utraty lane.
5. Placeable/Creature tests: brak utraty `classificationEvidence` i `preserveRaw`.

## 11. Non-goals

1. Dokument nie definiuje nowych pol biznesowych dla samych encji.
2. Dokument nie narzuca jednego storage layout bazy danych.
3. Dokument nie zastępuje specyfikacji domenowych R63; jest warstwa governance ewolucji.

