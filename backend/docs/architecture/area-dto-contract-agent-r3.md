# AREA DTO Contract (Agent R3)

## Scope i zrodla
Kontrakt bazuje na aktualnej dokumentacji i kodzie backendu Aurora:
- `backend/docs/architecture/hexagonal-architecture.md`
- `backend/docs/benchmark/benchmark-candidate-baseline.md`
- obecny modul `areas` (`domain/application/adapters`)
- obecny `catalog` (placeables/creatures/items)

Cel: przygotowac docelowy kontrakt DTO dla `AREA` z kompozycja `placeables/creatures/doors/sounds`, walidacja i metrykami, przy zachowaniu relacji do juz istniejacych endpointow.

## 1) Docelowy DTO: `AreaDetailDto`

```ts
export type AreaBiome = "urban" | "forest" | "dungeon" | "rural" | "interior" | "other";

export interface AreaDimensionsDto {
  width: number;   // > 0
  height: number;  // > 0
}

export interface Position3DDto {
  x: number;
  y: number;
  z: number;
}

export interface RotationDto {
  bearing: number; // 0..360
}

export interface AreaPlaceableDto {
  objectId: string;
  templateId: string;
  resref?: string;
  subtype: "generic" | "container" | "light_source" | "trigger_proxy" | "vfx";
  position: Position3DDto;
  rotation: RotationDto;
  metadata?: Record<string, string | number | boolean>;
}

export interface AreaCreatureDto {
  objectId: string;
  templateId: string;
  resref?: string;
  position: Position3DDto;
  rotation: RotationDto;
  faction?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface AreaDoorDto {
  objectId: string;
  templateId: string;
  resref?: string;
  position: Position3DDto;
  rotation: RotationDto;
  linkedToAreaId?: string;
  linkedToDoorObjectId?: string;
  locked?: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export interface AreaSoundDto {
  soundId: string;
  templateId?: string;
  resref: string;
  kind: "ambient" | "music" | "sfx";
  position?: Position3DDto;     // opcjonalne dla global/ambient
  radius?: number;              // >= 0
  volume?: number;              // 0..1
  loop?: boolean;
  enabled?: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export interface AreaCompositionMetricsDto {
  totalObjects: number;
  placeables: number;
  creatures: number;
  doors: number;
  sounds: number;
  vfxPlaceables: number;
  interactiveObjects: number;
  densityPerTile: number;       // totalObjects / (width*height)
  benchmark: {
    candidateArea: boolean;
    containsDoorHeavyInstance: boolean;
    containsDoorHeavySingleMesh: boolean;
    containsPlaceableHeavyVfx: boolean;
  };
}

export interface AreaDetailDto {
  areaId: string;
  resref?: string;
  name: string;
  biome: AreaBiome;
  tags: string[];
  benchmark: boolean;
  dimensions: AreaDimensionsDto;
  previewImageUrl: string;
  textureAtlas: {
    atlasId: string;
    cacheKey: string;
    strategy: "blob-cache" | "dynamic";
  };
  composition: {
    placeables: AreaPlaceableDto[];
    creatures: AreaCreatureDto[];
    doors: AreaDoorDto[];
    sounds: AreaSoundDto[];
  };
  metrics: AreaCompositionMetricsDto;
  updatedAt: string; // ISO-8601
}
```

## 2) Zasady mapowania kompozycji
- `doors` to logicznie osobna kolekcja, ale zrodlo katalogowe pozostaje zgodne z `catalog/placeables` (`subtype=door`).
- `placeables` nie powinny zawierac drzwi (drzwi przechodza do `doors`), dzieki czemu metryki sa jednoznaczne.
- `sounds` sa niezalezne od `placeables`; nie mapujemy ich przez `placeableSubtype=vfx`.
- Dla kompatybilnosci migracyjnej mozna utrzymac tymczasowe pole `objects[]` (legacy), ale docelowy kontrakt opiera sie o `composition.*`.

## 3) Walidacja DTO (kontraktowa)

Minimalne reguly walidacji (Zod/Nest):
- `areaId`, `name`, `textureAtlas.atlasId`, `updatedAt`: `trim().min(1)`.
- `dimensions.width|height`: `int().positive()`.
- `rotation.bearing`: `number().min(0).max(360)`.
- `sounds.volume`: `number().min(0).max(1)`.
- `sounds.radius`: `number().min(0)`.
- `metrics.totalObjects === placeables + creatures + doors`.
- `metrics.sounds === composition.sounds.length`.
- `metrics.placeables === composition.placeables.length`.
- `metrics.creatures === composition.creatures.length`.
- `metrics.doors === composition.doors.length`.
- `metrics.densityPerTile === totalObjects / (width * height)` (z tolerancja float).

Walidacja query dla listy `areas` (docelowo):
- `query?: string`
- `biome?: AreaBiome`
- `tag?: string`
- `benchmark?: boolean`
- `withComposition?: boolean` (default `false`)
- `withMetrics?: boolean` (default `true`)
- `limit: 1..100`, `offset: >=0`

## 4) Agregacja metryk

Algorytm agregacji (po stronie `AreasApplicationService`):
1. `placeables = composition.placeables.length`
2. `creatures = composition.creatures.length`
3. `doors = composition.doors.length`
4. `sounds = composition.sounds.length`
5. `totalObjects = placeables + creatures + doors`
6. `vfxPlaceables = count(placeables where subtype === "vfx")`
7. `interactiveObjects = doors + count(placeables where subtype in ["container", "trigger_proxy", "light_source"])`
8. `densityPerTile = totalObjects / (width * height)`
9. benchmark flags:
   - `containsDoorHeavyInstance` gdy wystepuje `resref=tn_sdoor_14`
   - `containsDoorHeavySingleMesh` gdy wystepuje `resref=tn_gdoor_05`
   - `containsPlaceableHeavyVfx` gdy wystepuje `resref=ad_top_lion_1`

## 5) Minimalne endpointy API (docelowe)

### A. `areas` (rdzen)
1. `GET /api/v1/areas`
2. `GET /api/v1/areas/:areaId`
3. `GET /api/v1/areas/:areaId/preview`
4. `GET /api/v1/areas/:areaId/metrics` (nowy, lekki odczyt metryk)

### B. kompozycja obszaru (minimalny write path)
5. `PATCH /api/v1/areas/:areaId/composition/placeables`
6. `PATCH /api/v1/areas/:areaId/composition/creatures`
7. `PATCH /api/v1/areas/:areaId/composition/doors`
8. `PATCH /api/v1/areas/:areaId/composition/sounds`

### C. lookup dla edytora (read-only)
9. `GET /api/v1/catalog/placeables` (z `subtype=door|vfx|...`)
10. `GET /api/v1/catalog/creatures`
11. `GET /api/v1/catalog/items` (opcjonalnie dla przyszlego rozszerzenia AREA o itemy)
12. `GET /api/v1/catalog/sounds` (nowy)

## 6) Relacje do juz istniejacych endpointow backendu

### Endpointy juz istnieja
- `GET /api/v1/areas`
- `GET /api/v1/areas/:areaId`
- `GET /api/v1/areas/:areaId/preview`
- `GET /api/v1/catalog/placeables`
- `GET /api/v1/catalog/creatures`
- `GET /api/v1/catalog/items`

### Relacje semantyczne
- `areas/:id.composition.placeables[*].templateId` -> `catalog/placeables.templateId`
- `areas/:id.composition.doors[*].templateId` -> `catalog/placeables` z `placeableSubtype=door`
- `areas/:id.composition.creatures[*].templateId` -> `catalog/creatures.templateId`
- `areas/:id.composition.sounds[*].templateId` -> `catalog/sounds.templateId` (po dodaniu)

### Luki do domkniecia
- Brak osobnego modelu `doors` i `sounds` w aktualnym `AreaRecord`.
- Brak endpointu `catalog/sounds`.
- Brak dedykowanego `areas/:id/metrics` (obecnie metryki sa tylko czesciowo implicit przez `objectCounts`).

## 7) Plan zgodnosci wstecznej
1. Etap 1: rozszerzyc `GET /areas/:id` o `composition.doors`, `composition.sounds`, `metrics` bez usuwania starego `objects`.
2. Etap 2: oznaczyc `objects` jako deprecated w OpenAPI.
3. Etap 3: frontend przechodzi na `composition.*`.
4. Etap 4: usunac `objects` po oknie migracyjnym.

## 8) Uwaga implementacyjna
Aktualny model domenowy `AreaObjectKind = "placeable" | "creature" | "item"` nalezy rozdzielic na docelowe read model DTO (kompozycja per kolekcja) i ewentualny model persystencji. Pozwoli to dodac `doors` i `sounds` bez lomu w warstwie aplikacyjnej.
