# Audyt aurora-web — podsystem obszarów (area)

**Obiekt:** `C:\Projects\aurora-web` — webowa reimplementacja edytora Aurora (NWN)
**Zakres:** moduł `areas` w backendzie i frontendzie — model, parser GFF, pokrycie pól, ryzyka
**Data:** 2026-06-26
**Kontekst:** porównanie z audytem dekompilacji oryginalnego toolsetu (`C:\Projects\New Folder\AUDYT_AREA.md`)

---

## 1. Struktura modułu

Architektura heksagonalna (ports & adapters), spójna i czytelna. ~6 850 LOC kodu obszaru.

**Backend** (`backend/src/modules/areas/`):

| Warstwa | Pliki |
|---------|-------|
| Domain | `area.types.ts` (214), `area-processing.builders.ts`, `area-thumbnail.ts` |
| Application | `areas.application.service.ts` (538), porty cache/repo |
| Inbound | `areas.controller.ts` (197), `areas.schemas.ts` (zod) |
| Outbound | **`aurora-gff-area-parser.ts` (1577)**, `module-snapshot-area.repository.ts` (1673), `static-area.repository.ts`, cache S3/memory/layered |

**Frontend** (`frontend/src/modules/areas/` + `layout/`): `areaSceneMapper.ts` (638), `httpAreaApiPort.ts` (468), `areaTextureAtlasReadiness.ts`, komponenty `AreaContextMenu`, `AreaSelectionPanel`, `AreasModePanel`, koordynaty renderu Three.js.

**Pokrycie testami — dobre:** parser (9 case'ów + internals), serwis aplikacyjny (22), scene mapper (3), atlas readiness (9), http port (8), plus repozytoria snapshot/cache i smoke regresyjne. Łącznie kilkanaście plików spec dla samego obszaru.

---

## 2. Format plików — parser GFF

### Mocne strony (potwierdzone w kodzie)

**Prawdziwy binarny parser GFF**, nie heurystyka tekstowa: `parseHeader` czyta pełny nagłówek (struct/field/label/data/indices offsety), `parseStructs`, `parseLabels`, `resolveStructFieldIndices`. Walidacja typu pliku — `ARE` dla metadanych, `GIT` dla instancji. Każdy odczyt chroniony `isRangeWithinBuffer` → brak czytania poza buforem przy uszkodzonym pliku.

**✅ Rozwiązuje ryzyko #1 z audytu dekompilacji.** Pola są rozwiązywane przez **aliasy** + `normalizeLabel`:

```ts
function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}
```

Usuwa spacje i wielkość liter, więc niespójne etykiety BioWare (`"Door List"` ze spacją vs `"SoundList"` bez) trafiają w te same aliasy (`doorlist`, `soundlist`). To dokładnie ten problem, który w oryginalnym formacie był pułapką — tutaj obsłużony poprawnie i z marginesem (wiele aliasów na pole).

**Listy instancji `.git`** — wszystkie kluczowe pokryte: `placeablelist`, `doorlist`, `creaturelist`, `itemlist`, `soundlist`. Pozycja czytana z `XPosition`/`YPosition`/`ZPosition` lub zagnieżdżonej struktury `Position`; bearing wyliczany z wektorów orientacji, gdy brak jawnego. Drzwi: tranzycje (`linkedTarget`, `loadScreen`), placeable/creature: appearance, sound: pozycjonowanie 3D. Obiekty zachowują **passthrough `extra`/`preserve`** — nieznane pola nie giną.

**Tile_List `.are`** — `tileId`, `orientation` (normalizacja mod 4), `height`, `modelResRef`; `row`/`col` wyliczane z `width`.

---

## 3. Luki w pokryciu (ustalenia)

**[Wysokie] Brak zapisu GFF / round-trip.** Moduł jest **wyłącznie do odczytu** — nie ma serializera `.are`/`.git` (jedyne `writeUInt32LE` jest wewnątrz parsera przy rekonstrukcji inline field-data, nie pełnym zapisie). Oryginalny toolset zapisuje te pliki. Jeśli celem MVP jest „export flow" wspomniany w `ARCHITECTURE_PHASE_READY.md`, eksport obszaru do GFF nie jest jeszcze pokryty.

**[Średnie] `.are` — pola środowiska/skryptów/rozgrywki nieczytane.** Parser zbiera tylko: `name`, `tag`, `width`, `height`, `tileSet`, `Tile_List` i 5 ID dźwięku (`ambientDay/Night`, `musicDay/Night/Battle`). **Nie** są czytane (a istnieją w oryginale — patrz audyt dekompilacji): oświetlenie `Sun*/Moon*`, `FogClipDist`, `ChanceRain/Snow/Lightning`, `WindPower`, `SkyBox`, `LightingScheme`, `ShadowOpacity`, `DayNightCycle`, `IsNight`; skrypty `OnEnter/OnExit/OnHeartbeat/OnUserDefined`; flagi `PlayerVsPlayer`, `NoRest`, `ModListenCheck/SpotCheck`. Akceptowalne dla pipeline'u render/preview, ale rozjeżdża się z deklaracją „Aurora First / parity".

**[Średnie] `.are` root nie ma passthrough.** W przeciwieństwie do parsera instancji (`extra`/`preserve`), parser metadanych `.are` odrzuca nieznane pola. To blokuje przyszły bezstratny round-trip nawet po dodaniu zapisu.

**[Średnie] Pod-pola kafla gubione.** `Tile_MainLight1/2`, `Tile_SrcLight1/2`, `Tile_AnimLoop1/2/3` nie są zachowywane — per-tile oświetlenie i animacje przepadają.

**[Niskie] `.gic` (komentarze) w ogóle nieobsługiwane** — brak parsera w module.

**[Niskie] `biome` to heurystyka, nie dane.** `inferBiome` zgaduje biom regexem po `resref`/`tileSet` (`city→urban`, `crypt→dungeon`…), z fallbackiem `generic`. NWN nie ma pola „biome", więc to wymyślony wymiar pochodny — OK jako metadana, ale krucha: obszary bez słowa-klucza w nazwie zawsze wpadną w `generic`, brak lokalizacji/aliasów językowych.

---

## 4. Robustność i ryzyka

**Pozytywy:** defensywne `clampNumber`/`clampNonNegative`/`normalizePercentLike`, guardy `Number.isFinite`, `z` fallback do 0, ograniczenia zakresów bufora. Schematy `zod` walidują parametry zapytań (limit 1–1000, offset ≥ 0).

**[Do weryfikacji] Brak walidacji wymiarów kafelkowych.** Parser nie nakłada granic na `width`/`height` z `.are` (ograniczenie `min(16).max(128)` w `areas.schemas.ts` dotyczy innego pola, nie wymiarów siatki). To samo otwarte pytanie co w audycie dekompilacji (NWN: 1–32 kafle). Uszkodzony/wrogi `.are` z ogromnym `width` nie wywali parsera (guard `gridWidth > 0`), ale może zaburzyć mapowanie `row`/`col` i obciążyć render. Warto dodać sanity-bound przy granicy parsowania, by zawodzić szybko.

**[Niskie] Heurystyczne wyliczanie bearingu** z wektorów orientacji, gdy brak jawnego pola — rozsądne, ale przy nietypowych danych może dać inny obrót niż oryginał. Pokryte testami scene mappera.

---

## 5. Rekomendacje

1. **Doprecyzować zakres w dokumentacji** — czy moduł `areas` ma być render/preview (read-only) czy pełną parytetową edycją. Obecny kod to pierwsze; deklaracje projektu sugerują drugie.
2. **Jeśli parytet/eksport są celem:** dodać writer GFF + obsługę `.gic` + przechwytywanie pól środowiska/skryptów. Inaczej formalnie zdescope'ować w kontrakcie.
3. **Dodać passthrough do parsera `.are` root** (jak w parserze instancji) — to najtańszy krok w stronę przyszłego bezstratnego round-tripu.
4. **Zastąpić `inferBiome` jawnym mapowaniem** (manifest/tabela tilesetów) zamiast regexu z cichym `generic`.
5. **Sanity-bound `width`/`height`** przy parsowaniu (np. 1–32) — szybkie wykrycie uszkodzonego wejścia.

---

## 6. Porównanie z audytem dekompilacji

| Temat | Oryginalny toolset (`New Folder`) | aurora-web |
|-------|-----------------------------------|------------|
| Niespójne etykiety list (`"Door List"`) | ryzyko #1 — wymaga dosłownego dopasowania | **rozwiązane** przez `normalizeLabel` + aliasy |
| Pola środowiska/oświetlenia `.are` | pełne (Sun/Moon/weather/scripts) | **nie czytane** (tylko geometria + 5 dźwięków) |
| Zapis plików obszaru | tak (natywny edytor) | **brak** (read-only) |
| Komentarze `.gic` | obsługa komentarzy | **brak** |
| Limit wymiarów | niepotwierdzony w kodzie | niepotwierdzony / brak walidacji |
| Biome | brak (nie istnieje w NWN) | wymiar pochodny (heurystyka) |

---

*Audyt oparty na lekturze kodu modułu `areas` (backend + frontend). Każde twierdzenie wskazuje plik/linię. Pozycje „do weryfikacji" wymagają potwierdzenia decyzją produktową o zakresie MVP.*
