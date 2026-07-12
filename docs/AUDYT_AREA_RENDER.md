# aurora-web — kompletny audyt renderu obszarów

**Data:** 2026-06-26
**Objawy zgłoszone:** (1) wiele obszarów źle pobiera/umieszcza placeable, (2) brak tekstur na kaflach, (3) kafle źle obrócone.
**Wniosek:** trzy niezależne przyczyny źródłowe w warstwie renderu, wszystkie potwierdzone w kodzie. W dwóch przypadkach **testy jednostkowe utrwalają błędne zachowanie**, więc naprawa wymaga też aktualizacji testów.

---

## Objaw 1 — placeable w złych miejscach (wiele obszarów)

Dwie nakładające się przyczyny. Obie w `frontend/src/modules/layout/adapters/three/workspaceAreaRenderCoordinates.ts`, konsumowane w `workspaceObjectMeshLayer.ts:1430-1434`.

### 1.1 Skala: obiekty w metrach, podłoga w jednostkach kafla (10×)

- Kafle: model skalowany `TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE = 0.1` (`workspaceTerrainMesh.ts:23`), środki kafli w **jednostkach kafla** (`width - col - 0.5`). Świat renderu = jednostki kafla (1 = 1 kafel = 10 m).
- Obiekty: parser zapisuje `x = clampNumber(x)` **surowo z GIT, w metrach** (`aurora-gff-area-parser.ts:609`); render zwraca je bez zmian:

```ts
export function resolveAuroraAreaRenderX(sourceX: number, areaWidth: number): number {
  void areaWidth;          // <-- areaWidth celowo ignorowane
  return sourceX;          // <-- metry, brak ÷10
}
```

Placeable o pozycji NWN `x = 25 m` ląduje w renderze na `X = 25` jednostek kafla, podczas gdy podłoga 4-kaflowa zajmuje `X ∈ 0..4`. Efekt: **placeable ~10× za daleko, rozrzucone poza obszarem**. Im większy obszar / dalej od narożnika, tym gorzej — stąd „wiele obszarów".

### 1.2 Handedness: kafle mirrorują X, obiekty nie

- Kafle: `resolveAuroraAreaRenderTileCenterX(col, width) = width - col - 0.5` → **oś X odbita**.
- Obiekty: `resolveAuroraAreaRenderX` zwraca surowe `x` → **nieodbite**.

Nawet po naprawie skali placeable będą **lustrzanie odbite** względem podłogi (lewa/prawa strona zamienione). Sygnałem jest ignorowany parametr `areaWidth` — miał służyć właśnie do odbicia.

> Dowód intencji: `workspaceTerrainMesh.ts:558` liczy natywny środek NWN `col*10+5` (metry, bez odbicia), a render używa `width-col-0.5` (jednostki kafla, z odbiciem). Dwie różne konwencje w jednym pliku.

### Naprawa 1

Ujednolicić obiekty do tej samej ramki co kafle (jednostki kafla + odbicie X):

```ts
export function resolveAuroraAreaRenderX(sourceX: number, areaWidth: number): number {
  return areaWidth - sourceX / 10;     // metry→kafle + odbicie X
}
export function resolveAuroraAreaRenderZ(sourceY: number, areaHeight: number): number {
  void areaHeight;
  return sourceY / 10;                  // metry→kafle (Z bez odbicia, jak kafle)
}
export function resolveAuroraAreaRenderOffsetX(sourceOffsetX: number): number {
  return -sourceOffsetX / 10;           // offsety też ÷10 i znak zgodny z odbiciem X
}
export function resolveAuroraAreaRenderOffsetZ(sourceOffsetY: number): number {
  return sourceOffsetY / 10;
}
```

Uwaga: dokładny znak odbicia/offsetów należy potwierdzić na jednym znanym obszarze (placeable przy drzwiach). **Testy `workspaceAreaRenderCoordinates.test.ts:21-27` utrwalają stare zachowanie (`x` bez zmian) — trzeba je zaktualizować.** Alternatywa: zostawić obiekty bez zmian i to kafle przestać odbijać/skalować — ale wtedy zmiana dotyka więcej kodu kafli.

---

## Objaw 2 — brak tekstur na kaflach

Przyczyna w backendzie: `backend/src/modules/tiles/application/tiles.application.service.ts:1116`.

```ts
function collectTileMdlTextureReferences(bytes: Buffer): string[] {
  const references = new Set<string>();
  const text = bytes.toString("latin1");                 // <-- traktuje MDL jak TEKST
  const matches = text.matchAll(
    /(?:^|[\r\n\t ])(?:bitmap|texture\d*|texture)\s+("[^"\r\n]+"|[^\s\r\n]+)/giu
  );
  ...
}
```

Funkcja wyłuskuje nazwy tekstur regexem zakładającym **tekstowy (ASCII) MDL** (`bitmap <nazwa>`). Standardowe modele kafli NWN to **binarne (skompilowane) MDL** — nazwy tekstur leżą w stałych polach `char[]` w strukturach węzłów geometrii, a nie jako tokeny `bitmap`. Dla binarnego MDL regex nie znajduje nic → `textureReferences.length === 0` → `resolveTileMaterialTextureAssets` zwraca `[]` (`:740`) → kontrakt bez `materialTextureAssets` → frontend buduje pustą `textureUrlsByReference` → `workspaceTerrainMesh.ts:1634` pomija nakładanie tekstur. **Kafel renderuje się bez tekstury.**

To wyjaśnia masę statusów `blocked_tile_material_texture_contract_missing` / `..._derived_model_only` w kodzie — kontrakt tekstur kafli jest „zablokowany" dla większości treści.

Łańcuch warunków, z których każdy daje „brak tekstur":
1. `sourceAsset.role !== "mdl_source"` lub brak `objectKey` → `[]` (`:726-732`) — kafel bez rozwiązanego źródła MDL.
2. binarny MDL → 0 referencji (opisane wyżej) — **główna przyczyna**.
3. tekstura nie zsynchronizowana jako blob → `selectPreferredTileTextureContract` zwraca null → pominięta (`:769-772`).

### Naprawa 2

W `collectTileMdlTextureReferences` rozpoznać format po nagłówku: jeśli pierwsze 4 bajty to `00 00 00 00` (binarny MDL) — parsować nazwy tekstur z binarnych struktur węzłów (pola `char[64]` w trimesh/node), zamiast regexa. Dla ASCII MDL zostawić obecną ścieżkę. Dodatkowo obsłużyć materiały EE (`.mtr`) i wielokrotne tekstury (`texture0..3`, `bumpmap`, `tno*`). Najprościej: wpiąć istniejący dekompilator MDL (jeśli jest w pipeline) przed ekstrakcją referencji.

---

## Objaw 3 — kafle źle obrócone

Przyczyna: `workspaceAreaRenderCoordinates.ts:43-50`, stosowana w `workspaceTerrainMesh.ts:1196` (`model.rotation.y += result * π/2`).

```ts
export function resolveAuroraAreaRenderTileOrientation(
  sourceOrientation: number,
  tilesetOrientation = 0
): number {
  void tilesetOrientation;                        // <-- przyjmowane, ale ODRZUCANE
  return normalizeTileOrientation(2 + sourceOrientation);   // <-- stałe +180°
}
```

Dwa problemy:

### 3.1 Stałe `+2` (180°) niespójne z odbiciem X

`Tile_Orientation` NWN to liczba obrotów o 90° **CCW**. Render odbija oś X (objaw 1.2). Odbicie zamienia obrót `o` na `-o = (4 - o) % 4`, a nie `(2 + o) % 4`. Porównanie:

| `o` (ARE) | poprawnie `(4-o)%4` | kod `(2+o)%4` | różnica |
|-----------|--------------------|----------------|---------|
| 0 | 0 | **2** | 180° ❌ |
| 1 | 3 | 3 | OK |
| 2 | 2 | **0** | 180° ❌ |
| 3 | 1 | 1 | OK |

Czyli kafle o orientacji **parzystej (0 i 2) są obrócone o 180°**, nieparzyste przypadkiem trafiają. To dokładnie „część kafli źle obrócona". (Dokładny znak zależy od handedness yaw w Three — do potwierdzenia empirycznie, ale rozbieżność parzystych jest pewna.)

### 3.2 `tilesetOrientation` ignorowane

Funkcja przyjmuje `tilesetOrientation` (czytane z `.set`, przekazane z `workspaceTerrainMesh.ts:1196`) i natychmiast je porzuca (`void`). Jeśli render kafli wymaga złożenia orientacji z `.are` i bazowej z `.set` — ta informacja przepada. Co najmniej martwy/niedokończony kod.

### Naprawa 3

```ts
export function resolveAuroraAreaRenderTileOrientation(
  sourceOrientation: number,
  tilesetOrientation = 0
): number {
  // odbicie X => negacja obrotu CCW; złożyć z bazą z .set
  return normalizeTileOrientation(4 - (sourceOrientation + tilesetOrientation));
}
```

Zweryfikować na obszarze z wyraźnie kierunkowym kaflem (np. wejście/schody). **Test `workspaceAreaRenderCoordinates.test.ts:29-35` utrwala `(2+o)` — wymaga aktualizacji.**

---

## Podsumowanie i kolejność napraw

| # | Objaw | Plik:linia | Pewność | Priorytet |
|---|-------|-----------|---------|-----------|
| 1.1 | Placeable 10× za daleko (brak ÷10) | `workspaceAreaRenderCoordinates.ts:6-22` | wysoka | P0 |
| 1.2 | Placeable lustrzane (brak odbicia X) | tamże + `workspaceObjectMeshLayer.ts:1430` | wysoka | P0 |
| 2 | Brak tekstur — regex ASCII na binarnym MDL | `tiles.application.service.ts:1116` | wysoka | P0 |
| 3.1 | Kafle parzyste obrócone o 180° | `workspaceAreaRenderCoordinates.ts:43-50` | średnia-wysoka | P1 |
| 3.2 | `tilesetOrientation` ignorowane | tamże | wysoka (martwy kod) | P1 |

**Uwaga o testach:** objawy 1 i 3 mają testy, które kodują obecne (błędne) zachowanie — `workspaceAreaRenderCoordinates.test.ts`. Naprawa kodu bez aktualizacji testów wywali CI; aktualizacja testów bez naprawy kodu utrwali błąd. Zalecam: najpierw potwierdzić poprawne wartości na jednym realnym obszarze (placeable + kierunkowy kafel), zapisać je jako nowe oczekiwania testów, potem poprawić implementację.

**Kolejność:** 1.1 → 1.2 (placeable wracają na miejsce) → 2 (tekstury) → 3 (rotacja). 1.1/1.2/3 to drobne zmiany w jednym pliku; 2 to większa praca (parser binarnego MDL).

---

*Wszystkie lokalizacje wskazują plik:linia w stanie repo z 2026-06-26. Znaki odbicia/yaw oznaczone „do potwierdzenia" wymagają jednej weryfikacji wizualnej na znanym obszarze — kierunek błędu jest pewny, dokładny znak osi zależny od konwencji kamery.*

---

## Status implementacji (2026-06-26) — KOREKTA

**Moja teza o skali 10× (pkt 1.1) była BŁĘDNA.** Dane przesądzają: w `static-area.repository.ts` obszar o `width: 24` ma placeable z `x = 4.2, 1.2, 5.8, 6.3` — czyli współrzędne obiektów są **już w jednostkach kafla** (0..width), a nie w metrach NWN. Dzielenie przez 10 ścisnęło wszystkie placeable do ~1/10 obszaru przy krawędzi → to ja zepsułem pozycjonowanie. **Wycofane.**

Stan końcowy pliku `workspaceAreaRenderCoordinates.ts` (przywrócony do wersji sprzed mojej ingerencji):

- `resolveAuroraAreaRenderX = areaWidth - sourceX` — samo **odbicie X**, bez skali. To jedyna potrzebna korekta pozycji (obiekty były nieodbite względem odbitej podłogi). Już było obecne, zostawione.
- `resolveAuroraAreaRenderZ = sourceY` — bez zmian (Z nieodbite, bez skali).
- `resolveAuroraAreaRenderYaw = sourceYaw` — przywrócone do identyczności (moja negacja była niezweryfikowana).
- `resolveAuroraAreaRenderTileOrientation = o` — przywrócone (moje `4 - o` było hipotezą bez weryfikacji wizualnej).

Test `workspaceAreaRenderCoordinates.test.ts` przywrócony do wersji odpowiadającej temu stanowi.

**Wniosek o objawie 1:** prawdziwą przyczyną złego pozycjonowania placeable było wyłącznie **brak odbicia X obiektów** (kafle odbite `width-col`, obiekty nie). Skala nie wchodzi w grę — współrzędne są w jednostkach kafla. Sekcję 1.1 wyżej (skala 10×) należy uznać za nieaktualną.

**Objaw 3 (rotacja kafli):** pozostaje otwarty — `(4 - o)` vs `o` wymaga weryfikacji wizualnej na obszarze z kierunkowym kaflem. Nie narzucam zmiany bez potwierdzenia.

**Objaw 2 (tekstury):** bez zmian — jak wyżej, zależny od stanu runtime (`mdl_source` ASCII vs binarny).
