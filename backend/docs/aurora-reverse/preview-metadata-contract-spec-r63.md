# Preview Metadata Contract Spec r63

Data: 2026-05-24
Status: Draft for backend->frontend read contract
Zakres: minimalny kontrakt metadata preview dla `placeable`, `creature`, `area`, tak aby frontend renderowal podglady bez logiki domenowej.

## 1. Cel i zasada

Backend zwraca gotowe do renderu metadata preview:
1. zdeterminowana tozsamosc encji (`instanceId` / `areaInstanceId`),
2. gotowe etykiety i hinty renderingu (`title`, `subtitle`, `previewMode`),
3. gotowy stan bramek (`previewAllowed`, `editSafe`),
4. gotowe podsumowanie diagnostyki (`ERROR/WARN/INFO` + kody).

Frontend nie interpretuje surowych struktur ARE/GIT/UTC/2DA/TLK ani nie wyprowadza typu encji po stronie UI.

## 2. Evidence baseline (Aurora reverse)

1. `area-composition-spec-r63.md`: canonical lane `composition.*`, gate telemetry i policy `warn|strict`.
2. `placeable-classification-spec-r63.md`: rozdzial `door/placeable/vfx`, evidence klasyfikacji i manifest-first gate.
3. `creature-enrichment-spec-r63.md`: kontrakt enrichment + walidacje krytyczne dla renderu creature.
4. `asset-id-strategy-spec-r63.md`: stabilne `instanceId`, `instanceRevisionId`, `areaRevision`, provenance.
5. `source-lists-2da-tlk-spec-r63.md`: zasada `raw id + resolved label` i profile-aware fallback.

## 3. Minimalny wspolny kontrakt DTO

```ts
export type PreviewAssetType = "placeable" | "creature" | "area";
export type PreviewMode = "image" | "scene" | "placeholder";
export type ValidationSeverity = "ERROR" | "WARN" | "INFO";

export interface PreviewValidationCountsDto {
  ERROR: number;
  WARN: number;
  INFO: number;
}

export interface PreviewIssueDto {
  code: string;
  severity: ValidationSeverity;
  source?: "ARE" | "GIT" | "UTC" | "2DA" | "TLK" | "HAK" | "RUNTIME" | "DERIVED";
}

export interface PreviewRenderRefDto {
  previewMode: PreviewMode;
  imageUrl?: string;               // dla card/list
  sceneUrl?: string;               // dla quick 3D preview
  placeholderKey?: string;         // stable fallback key
  manifestAssetType?: "area" | "placeable";
}

export interface PreviewCommonDto {
  schema: "aurora-preview-metadata";
  version: "0.6.3-r63";
  assetType: PreviewAssetType;
  title: string;                   // gotowy label do UI
  subtitle?: string;               // np. resref/tag/tileset
  tags: string[];                  // gotowe badge labels
  previewAllowed: boolean;         // true gdy mozna pokazac preview
  editSafe: boolean;               // true gdy brak blokad mutacji
  validationIssueCounts: PreviewValidationCountsDto;
  topIssues: PreviewIssueDto[];    // max 5, juz posortowane po severity
  render: PreviewRenderRefDto;
  provenance: {
    moduleSourceFingerprint: string;
    sourcePolicy: string;
    runtimeProfile: "xoreos-nwn" | "xoreos-nwn2";
  };
}
```

## 4. Specjalizacje encji

```ts
export interface PlaceablePreviewMetadataDto extends PreviewCommonDto {
  assetType: "placeable";
  areaInstanceId: string;
  areaRevision: string;
  instanceId: string;
  instanceRevisionId: string;
  sourceList: "Placeable List";
  sourceIndex: number;
  kind: "placeable" | "vfx";
  templateResRef: string;
  tag?: string;
  transform: {
    position: { x: number; y: number; z: number };
    bearing?: number;
  };
  appearance: {
    rawAppearanceId?: number;
    resolvedLabel?: string;        // backend-resolved, frontend nic nie lookupuje
  };
}

export interface CreaturePreviewMetadataDto extends PreviewCommonDto {
  assetType: "creature";
  areaInstanceId: string;
  areaRevision: string;
  instanceId: string;
  instanceRevisionId: string;
  sourceList: "Creature List";
  sourceIndex: number;
  templateResRef?: string;
  tag?: string;
  appearanceType: number | null;
  portrait: {
    portraitId: number | null;
    portraitResRef?: string;
    imageUrl?: string;
  };
  transform: {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; bearingDegrees: number };
  };
  labels: {
    raceName?: string;
    classNames?: string[];
  };
}

export interface AreaPreviewMetadataDto extends PreviewCommonDto {
  assetType: "area";
  areaInstanceId: string;
  areaRevision: string;
  areaResref: string;
  dimensions: { width: number; height: number };
  tileset: string;
  hasTerrain?: boolean;
  compositionCounts: {
    placeables: number;
    creatures: number;
    doors: number;
    waypoints: number;
    triggers: number;
    items: number;
  };
  audio?: {
    ambientDayId?: number;
    ambientNightId?: number;
    resolvedAmbientLabel?: string;
  };
}
```

## 5. Reguly mapowania backendowego (must-have)

1. `title` i `subtitle` musza byc gotowe do UI i nie wymagaja lookupu 2DA/TLK po stronie frontend.
2. `previewAllowed`:
1. `false` tylko gdy payload ma blokade renderu (np. krytyczne braki zasobow/appearance).
2. `true` dla WARN/INFO, w tym `SCENE_HELPER_ONLY_WITH_VFX`.
3. `editSafe`:
1. `false` gdy `validationIssueCounts.ERROR > 0`.
2. `true` gdy `ERROR == 0` (nawet przy WARN/INFO).
4. `topIssues` zwraca backend, juz posortowane: `ERROR`, potem `WARN`, potem `INFO`.
5. `kind` dla placeable:
1. domyslnie `placeable`,
2. `vfx` tylko gdy backend ma evidence VFX z manifest/validation.
6. `sourceList/sourceIndex` i ID (`instanceId`, `areaRevision`) sa wymagane dla encji instancyjnych.
7. Backend zwraca `raw id + resolved label` (np. `appearance.rawAppearanceId` + `appearance.resolvedLabel`, analogicznie dla ambient).

## 6. Invariants kontraktu

1. `assetType="placeable"` nigdy nie wskazuje `sourceList="Door List"`.
2. `assetType="creature"` musi miec `sourceList="Creature List"`.
3. `schema/version` sa stale i wersjonowane (`aurora-preview-metadata`, `0.6.3-r63`).
4. Ten sam snapshot danych i policy musi dawac te same `instanceId`/`areaInstanceId`.
5. Brak renderowalnego assetu nie zrywa kontraktu: backend ustawia `render.previewMode="placeholder"` i `previewAllowed` wg policy.

## 7. Minimalny envelope API

```ts
export type PreviewMetadataDto =
  | PlaceablePreviewMetadataDto
  | CreaturePreviewMetadataDto
  | AreaPreviewMetadataDto;

export interface PreviewMetadataEnvelopeDto {
  data: PreviewMetadataDto;
  generatedAt: string;             // ISO-8601 UTC
}
```

## 8. Minimalne przyklady payload

### 8.1 Placeable (vfx)

```json
{
  "data": {
    "schema": "aurora-preview-metadata",
    "version": "0.6.3-r63",
    "assetType": "placeable",
    "title": "ad_top_lion_1",
    "subtitle": "Placeable List #21",
    "tags": ["vfx", "preview-allowed"],
    "previewAllowed": true,
    "editSafe": true,
    "validationIssueCounts": { "ERROR": 0, "WARN": 1, "INFO": 0 },
    "topIssues": [{ "code": "SCENE_HELPER_ONLY_WITH_VFX", "severity": "WARN", "source": "DERIVED" }],
    "render": { "previewMode": "scene", "sceneUrl": "/api/v1/previews/placeables/ai1_x/scene", "manifestAssetType": "placeable" },
    "provenance": { "moduleSourceFingerprint": "modfp_x", "sourcePolicy": "DECOMPILED_PRIMARY", "runtimeProfile": "xoreos-nwn" },
    "areaInstanceId": "ar1_x",
    "areaRevision": "rev1_x",
    "instanceId": "ai1_x",
    "instanceRevisionId": "air1_x",
    "sourceList": "Placeable List",
    "sourceIndex": 21,
    "kind": "vfx",
    "templateResRef": "ad_top_lion_1",
    "transform": { "position": { "x": 12.5, "y": 9.0, "z": 0.0 }, "bearing": 180.0 },
    "appearance": { "rawAppearanceId": 412, "resolvedLabel": "Lion Top FX" }
  },
  "generatedAt": "2026-05-24T10:00:00Z"
}
```

### 8.2 Creature

```json
{
  "data": {
    "schema": "aurora-preview-metadata",
    "version": "0.6.3-r63",
    "assetType": "creature",
    "title": "c_wingsmeph",
    "subtitle": "Creature List #4",
    "tags": ["utc-resolved"],
    "previewAllowed": true,
    "editSafe": true,
    "validationIssueCounts": { "ERROR": 0, "WARN": 0, "INFO": 1 },
    "topIssues": [{ "code": "CREATURE_WINGS_TAIL_RUNTIME_GAP", "severity": "INFO", "source": "RUNTIME" }],
    "render": { "previewMode": "image", "imageUrl": "/api/v1/previews/creatures/ai1_y.png" },
    "provenance": { "moduleSourceFingerprint": "modfp_x", "sourcePolicy": "DECOMPILED_PRIMARY", "runtimeProfile": "xoreos-nwn" },
    "areaInstanceId": "ar1_x",
    "areaRevision": "rev1_x",
    "instanceId": "ai1_y",
    "instanceRevisionId": "air1_y",
    "sourceList": "Creature List",
    "sourceIndex": 4,
    "templateResRef": "c_wingsmeph",
    "appearanceType": 102,
    "portrait": { "portraitId": 73, "portraitResRef": "po_c_wingsmeph", "imageUrl": "/api/v1/previews/portraits/po_c_wingsmeph.png" },
    "transform": { "position": { "x": 4.0, "y": 5.2, "z": 0.0 }, "orientation": { "x": 0.0, "y": 1.0, "bearingDegrees": 0.0 } },
    "labels": { "raceName": "Outsider", "classNames": ["Fighter"] }
  },
  "generatedAt": "2026-05-24T10:00:00Z"
}
```

### 8.3 Area

```json
{
  "data": {
    "schema": "aurora-preview-metadata",
    "version": "0.6.3-r63",
    "assetType": "area",
    "title": "wnd_slms_swamp__with_placeables",
    "subtitle": "16x16 / tnn01",
    "tags": ["composition-ready"],
    "previewAllowed": true,
    "editSafe": true,
    "validationIssueCounts": { "ERROR": 0, "WARN": 0, "INFO": 0 },
    "topIssues": [],
    "render": { "previewMode": "scene", "sceneUrl": "/api/v1/previews/areas/ar1_z/scene", "manifestAssetType": "area" },
    "provenance": { "moduleSourceFingerprint": "modfp_x", "sourcePolicy": "DECOMPILED_PRIMARY", "runtimeProfile": "xoreos-nwn" },
    "areaInstanceId": "ar1_z",
    "areaRevision": "rev1_z",
    "areaResref": "wnd_slms_swamp__with_placeables",
    "dimensions": { "width": 16, "height": 16 },
    "tileset": "tnn01",
    "compositionCounts": { "placeables": 36, "creatures": 12, "doors": 4, "waypoints": 18, "triggers": 7, "items": 3 },
    "audio": { "ambientDayId": 15, "ambientNightId": 9, "resolvedAmbientLabel": "Swamp Ambient" }
  },
  "generatedAt": "2026-05-24T10:00:00Z"
}
```

## 9. Minimalna checklista akceptacyjna

1. Frontend renderuje card preview dla `placeable/creature/area` bez lookupu 2DA/TLK i bez parsowania GIT.
2. Frontend nie liczy sam bramek (`previewAllowed`, `editSafe`) ani severity.
3. `sourceList/sourceIndex` i `instanceId/areaRevision` sa obecne dla preview encji instancyjnych.
4. `WARN/INFO` nie blokuja preview, `ERROR` blokuje `editSafe`.
5. Gdy brak assetu podgladu, backend zwraca `previewMode="placeholder"` zamiast niekompletnego payloadu.
