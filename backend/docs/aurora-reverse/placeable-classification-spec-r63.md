# Placeable Classification Spec r63

Data: 2026-05-24
Status: Draft for backend->frontend contract
Zakres: klasyfikacja `placeable` / `door` / `vfx` oraz kontrakt DTO dla warstwy API i UI.

## 1. Zrodla dowodowe (Aurora reverse)

1. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0426_git_object_schema_profile.json:5-9,239-247`
2. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Placeables\AURORA_RE_PLACEABLE_OBJECT_PROPERTIES_2026-05-18.md:49-57,191-200`
3. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Doors\AURORA_RE_DOOR_KNOWLEDGE_BASE.md:485-489,558-579,846-848,858-863,910-914`
4. `C:\Projects\nwn-last-city\Aurora\reverse\refs\Tooling\nwtoolset_rcdata_report.json:11436,11930,11938,16456,16466,17886,17894,18251,18257`
5. `C:\Projects\nwn-last-city\Aurora\reverse\docs\VFX-MDL-SHD\VFX_STATUS_AND_GAPS_2026-05-20.md:4,18-22`
6. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\WEB_AURORA_TECH_STRATEGY.md:455,5697,5929-5937,6034-6039,7894-7902,7948-7951,8050-8062,8172-8186`
7. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\WEB_AURORA_TECH_STRATEGY.md:5037,5899`

## 2. Reguly klasyfikacji obiektow

## 2.1 Reguly bazowe (zrodlo GIT)

1. Jezeli rekord pochodzi z `Door List` (`type_8`), klasyfikacja MUSI byc `door`.
2. Jezeli rekord pochodzi z `Placeable List` (`type_9`), klasyfikacja MUSI byc `placeable`.
3. Backend NIE MOZE skladac `Door List` i `Placeable List` do jednej wspolnej rodziny typowanej jako `placeable`.
4. Tozsamosc edycyjna `door` MUSI zachowac `doorIndex` (nie tylko mesh id / object id runtime).

## 2.2 Reguly `vfx`

1. `vfx` jest podtypem `placeable`, a nie osobna lista GIT.
2. Klasyfikacja `vfx` POWINNA byc nadawana, gdy placeable ma dowod emitter/VFX w pakiecie sceny (manifest/scene metadata/validation).
3. Kody diagnostyczne VFX (`SCENE_HELPER_ONLY_WITH_VFX`, `EMITTER_FRAME_RANGE_OUT_OF_BOUNDS`, `MISSING_TEXTURES_EMITTER`) MUSZA byc przenoszone do DTO jako evidence klasyfikacji.
4. `SCENE_HELPER_ONLY_WITH_VFX` pozostaje preview-allowed (INFO/WARN), ale nie oznacza automatycznie gotowosci writeback.

## 2.3 Reguly tokenow i aliasow (wplyw na typowanie)

1. `door`:
1. Alias `LoadScreenID` / `LoadScreenId` jest wspierany.
2. Dla zduplikowanych kluczy obowiazuje `last-wins`.
3. `LinkedToFlags` i `LoadScreenID` odrzucaja plus-prefiksy (`+1`, `+3`).
4. Wartosci ujemne moga byc parser-accepted (preserve-only), ale ich semantyka runtime jest niepotwierdzona.
2. `placeable`:
1. Pola `X/Y/Z/Bearing` sa parse-walidowane po trim (w tym trailing NUL).
2. Underflow float32 dla transform/bearing jest odrzucany.
3. `vfx`:
1. Wielocyfrowe tokeny dziesietne z leading zero (`"01"`) sa odrzucane dla atlas/frame range zgodnie z profile policy.

## 3. Kontrakt DTO backend -> frontend

## 3.1 DTO klasyfikacji encji obszaru

```ts
export type AreaEntityKind = "placeable" | "door" | "vfx";
export type GitSourceList = "Placeable List" | "Door List";

export interface NumericTokenDiagnosticDto {
  canonicalField: string;          // np. LinkedToFlags, LoadScreenID, Bearing
  rawToken: string;
  parsedValue?: number;
  occurrenceIndex?: number;        // dla alias/duplicate chronology
  domainStatus:
    | "ok"
    | "invalid_plus_prefix"
    | "invalid_leading_zero_decimal"
    | "invalid_float32_underflow"
    | "invalid_parse"
    | "runtime_domain_unknown";
}

export interface ClassificationEvidenceDto {
  sourceList: GitSourceList;
  sourceIndex: number;             // doorIndex/placeableIndex
  manifestAssetType?: "placeable" | "area";
  validationCodes?: string[];      // np. SCENE_HELPER_ONLY_WITH_VFX
  tokenDiagnostics?: NumericTokenDiagnosticDto[];
}

export interface AreaEntityDto {
  kind: AreaEntityKind;
  objectId: string;
  templateResRef?: string;
  position?: { x: number; y: number; z: number };
  bearing?: number;
  classificationEvidence: ClassificationEvidenceDto;
}
```

## 3.2 Reguly mapowania DTO

1. `Door List` -> `kind = "door"`, `sourceList = "Door List"`.
2. `Placeable List` -> domyslnie `kind = "placeable"`, `sourceList = "Placeable List"`.
3. `Placeable List` + evidence VFX -> `kind = "vfx"` (z zachowaniem `sourceList = "Placeable List"`).
4. `door` i `placeable/vfx` maja osobne sciezki edycyjne i osobne indeksy list.

## 3.3 Manifest-first contract (pakiet sceny)

```ts
export interface ScenePackageManifestDto {
  schema: string;                              // np. nwn-web-scene-package
  assetType: "area" | "placeable";
  meshCount: number;
  materialCount: number;
  textureCount: number;
  validationIssues?: Array<{ code: string; severity: "ERROR" | "WARN" | "INFO" }>;
  validationIssueCounts: { ERROR: number; WARN: number; INFO: number };
  hakPriorityEffective?: string[];
  hakPrioritySource?: string;
  gitCreatureCount?: number;
  gitDoorCount?: number;
  gitTriggerCount?: number;
  gitWaypointCount?: number;
}
```

Regula bramki:
1. `ERROR > 0` => frontend nie powinien hydradowac scene jako edit-safe.
2. `WARN/INFO` => preview dozwolony, ale diagnostyka musi byc widoczna.

## 3.4 Command contract writeback (revisioned)

```ts
export interface AreaEditCommandEnvelopeDto<TAction = unknown> {
  areaResref: string;
  entityFamily: "placeable" | "door" | "tile";
  expectedRevision: string;
  operations: TAction[];
  dryRun?: boolean;
}

export interface AreaEditResultDto {
  revisionBefore: string;
  revisionAfter: string;
  changedBytes: number;
  backupCreated: boolean;
  backupPath?: string;
  diagnostics: Array<{ code: string; severity: "ERROR" | "WARN" | "INFO"; message: string }>;
  writeBlockedReason?: "missing_revision" | "stale_revision" | "validation_error";
  summary?: Record<string, number | string | boolean>;
}
```

Wymagania:
1. `expectedRevision` jest wymagane dla operacji mutujacych.
2. Stale/missing revision MUSI zwracac blokade zapisu.
3. `door` commands pozostaja oddzielone od `placeable` commands (osobne DTO operacji i indeksow).

## 4. Minimalne invariants backendowe

1. `kind = "door"` nigdy nie pochodzi z `Placeable List`.
2. `kind = "vfx"` zawsze ma `sourceList = "Placeable List"`.
3. Dla `door`, aliasy `LoadScreenID/LoadScreenId` musza byc reprezentowalne w diagnostyce chronology.
4. DTO nie moze tracic `rawToken` dla pol objetych surowa walidacja token-shape.

## 5. Zakres niepotwierdzony (explicit unknowns)

1. Retail/runtime semantyka `LinkedToFlags` (szczegolnie wartosci ujemne) pozostaje `runtime_domain_unknown`.
2. Retail/runtime wplyw `LoadScreenID` jest nadal niepotwierdzony.
3. Dlatego pola transition dla `door` pozostaja preserve-first: parser-accepted != runtime-authoritative.

## 6. Implementacyjna checklista backendu

1. Dodac `kind/sourceList/sourceIndex/classificationEvidence` do DTO encji obszaru.
2. Dodac `ScenePackageManifestDto` i gate `ERROR==0` przed edit-safe hydration.
3. Wystawic `NumericTokenDiagnosticDto` dla door/placeable/vfx parser paths.
4. Utrzymac rozdzielne komendy writeback dla `door` i `placeable` z `expectedRevision`.
