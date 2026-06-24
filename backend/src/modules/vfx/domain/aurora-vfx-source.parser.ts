import {
  BLANK_CELL,
  parseAuroraTwoDaTable,
  type AuroraTwoDaCell as SharedAuroraTwoDaCell,
  type AuroraTwoDaDiagnostic as SharedAuroraTwoDaDiagnostic,
  type AuroraTwoDaDiagnosticSeverity as SharedAuroraTwoDaDiagnosticSeverity,
  type AuroraTwoDaParseOptions as SharedAuroraTwoDaParseOptions,
  type AuroraTwoDaRow as SharedAuroraTwoDaRow,
  type AuroraTwoDaSourceLayer,
  type AuroraTwoDaTable as SharedAuroraTwoDaTable
} from "../../../common/aurora/two-da/aurora-two-da-table";

export { BLANK_CELL, parseAuroraTwoDaTable };
export type AuroraVfxDiagnosticSeverity = SharedAuroraTwoDaDiagnosticSeverity;
export type AuroraVfxDiagnostic = SharedAuroraTwoDaDiagnostic;
export type AuroraTwoDaCell = SharedAuroraTwoDaCell;
export type AuroraTwoDaRow = SharedAuroraTwoDaRow;
export type AuroraTwoDaTable = SharedAuroraTwoDaTable;
export type AuroraTwoDaParseOptions = SharedAuroraTwoDaParseOptions;

export type AuroraVfxSourceParseOptions = Omit<SharedAuroraTwoDaParseOptions, "tableName">;
export type AuroraVfxTypeFd = "F" | "D" | "B" | "P" | string;
export type AuroraVfxPhaseKind = "impact" | "duration" | "cessation";
export type AuroraVfxProfileMismatchKind = "sef" | "duration_node" | "delay_duration_fx";

export interface AuroraVfxProfileMismatchSourceField {
  column: string;
  raw: string;
  value: string;
  reason: AuroraVfxProfileMismatchKind;
}

export interface AuroraVfxSourceRowBase<TSourceTable extends string> {
  sourceTable: TSourceTable;
  profile: string;
  sourceHash?: string;
  sourceLayer?: AuroraTwoDaSourceLayer;
  sourceObjectKey?: string;
  rowId: number;
  physicalLineNumber: number;
  label: string;
  rawCells: Record<string, string>;
  extraCells: string[];
  missingColumns: string[];
  profileMismatches: AuroraVfxProfileMismatchSourceField[];
  diagnostics: AuroraVfxDiagnostic[];
}

export interface AuroraVfxPhaseSourceRefs {
  phase: AuroraVfxPhaseKind;
  progFxRowId?: number;
  progFxRaw?: string;
  soundRef?: string;
  soundRaw?: string;
  modelNodeRefs: Record<string, string>;
  rawCells: Record<string, string>;
}

export interface AuroraVfxClientEventSource {
  eventKind: "shake_or_bump";
  rawCells: {
    ShakeType?: string;
    ShakeDelay?: string;
    ShakeDuration?: string;
  };
  shakeType?: number;
  shakeKind: "screen_bump" | "screen_shake" | "unknown";
  delaySeconds?: number;
  durationSeconds?: number;
  diagnostics: AuroraVfxDiagnostic[];
}

export interface AuroraVisualEffectSourceFacts {
  orientWithGroundRaw?: string;
  orientWithObjectRaw?: string;
  lowViolenceRaw?: string;
  lowQualityRaw?: string;
}

export interface AuroraVisualEffectSourceRow
  extends AuroraVfxSourceRowBase<"visualeffects.2da"> {
  typeFd?: AuroraVfxTypeFd;
  visualFacts: AuroraVisualEffectSourceFacts;
  phases: AuroraVfxPhaseSourceRefs[];
  clientEvents: AuroraVfxClientEventSource[];
}

export interface AuroraProgFxSourceRow extends AuroraVfxSourceRowBase<"progfx.2da"> {
  type?: number;
  typeRaw?: string;
  params: Array<{
    column: string;
    raw: string;
    value?: string;
  }>;
}

export interface AuroraAoeSourceRow extends AuroraVfxSourceRowBase<"vfx_persistent.2da"> {
  shapeRaw?: string;
  radiusRaw?: string;
  widthRaw?: string;
  lengthRaw?: string;
  visualFxRaw?: string;
  durationVfxRaw?: string;
  eventScripts: {
    onEnterRaw?: string;
    onExitRaw?: string;
    heartbeatRaw?: string;
  };
  modelFootprintRefs: Record<string, string>;
  soundFootprintRefs: Record<string, string>;
}

export interface AuroraItemPropertyVisualSourceRow
  extends AuroraVfxSourceRowBase<"iprp_visualfx.2da"> {
  nameRaw?: string;
  modelSuffixRaw?: string;
  subtypeProfileRaw?: string;
  profileData: Record<string, string>;
}

export interface AuroraSpellVisualSourceRow extends AuroraVfxSourceRowBase<"spells.2da"> {
  visualSlots: Record<string, string>;
  projectileSlots: Record<string, string>;
  scriptSlots: Record<string, string>;
  soundSlots: Record<string, string>;
}

export interface AuroraDamageHitVisualSourceRow
  extends AuroraVfxSourceRowBase<"damagehitvisual.2da"> {
  visualEffectIdRaw?: string;
  rangedEffectIdRaw?: string;
}

export interface AuroraCatalogVfxPreviewSourceBoundaryInput {
  vfxPreset?: string;
  placeableSubtype?: string;
  rendererPreset?: string;
}

export type AuroraVfxEffectConstructorKind = "EffectVisualEffect" | "EffectBeam";
export type AuroraVfxApplicationMode = "object" | "location";
export type AuroraVfxDurationType = "instant" | "temporary" | "permanent";

export interface AuroraVfxVector3 {
  x: number;
  y: number;
  z: number;
}

export interface AuroraVfxEeTransformTuple {
  scale?: number;
  translate?: AuroraVfxVector3;
  rotate?: AuroraVfxVector3;
}

export type AuroraVfxGetEffectValue =
  | string
  | number
  | boolean
  | AuroraVfxVector3
  | null;

export interface AuroraVfxGetEffectObservation {
  accessor:
    | "GetEffectInteger"
    | "GetEffectFloat"
    | "GetEffectVector"
    | "GetEffectObject"
    | "GetEffectCreator"
    | "GetEffectType"
    | string;
  index?: number;
  valueType?: "integer" | "float" | "vector" | "object" | "string" | "boolean" | "unknown";
  value?: AuroraVfxGetEffectValue;
  profile?: string;
  provenance?: string;
  diagnostics?: AuroraVfxDiagnostic[];
}

export interface AuroraVfxEffectInstance {
  constructorKind: AuroraVfxEffectConstructorKind;
  sourceRowId: number;
  applicationMode: AuroraVfxApplicationMode;
  durationType?: AuroraVfxDurationType;
  durationSeconds?: number;
  missFlag?: boolean;
  eeTransform?: AuroraVfxEeTransformTuple;
  targetRef?: string;
  effectorRef?: string;
  creatorRef?: string;
  bodyNode?: string;
  getEffectObservations?: AuroraVfxGetEffectObservation[];
  diagnostics?: AuroraVfxDiagnostic[];
}

export type AuroraVfxEffectInstanceContext = AuroraVfxEffectInstance;

export interface AuroraVfxPhaseScheduleLanes {
  modelNodeRefs: Partial<Record<AuroraVfxPhaseKind, Record<string, string>>>;
  progFxRefs: Partial<Record<AuroraVfxPhaseKind, string>>;
  soundRefs: Partial<Record<AuroraVfxPhaseKind, string>>;
  clientEvents: AuroraVfxClientEventSource[];
}

export interface AuroraVfxPhaseSchedule {
  sourceRowId: number;
  sourceLabel: string;
  status: "source_only" | "ready";
  effectInstance?: AuroraVfxEffectInstance;
  context?: AuroraVfxEffectInstanceContext;
  phases: AuroraVfxPhaseSourceRefs[];
  lanes: AuroraVfxPhaseScheduleLanes;
  clientEvents: AuroraVfxClientEventSource[];
  diagnostics: AuroraVfxDiagnostic[];
}

export interface AuroraVfxEffectInstanceBuildResult {
  effectInstance?: AuroraVfxEffectInstance;
  diagnostics: AuroraVfxDiagnostic[];
}

const VISUALEFFECTS_REQUIRED_COLUMNS = ["Label", "Type_FD"];
const PROGFX_REQUIRED_COLUMNS = ["Label", "Type"];
const VFX_PERSISTENT_REQUIRED_COLUMNS = ["LABEL", "SHAPE"];
const IPRP_VISUALFX_REQUIRED_COLUMNS = ["Label", "ModelSuffix"];
const SPELLS_REQUIRED_COLUMNS = ["Label"];
const DAMAGEHITVISUAL_REQUIRED_COLUMNS = ["Label", "VisualEffectID", "RangedEffectID"];

const VISUALEFFECT_SOURCE_FACT_COLUMNS = [
  "OrientWithGround",
  "OrientWithObject",
  "LowViolence",
  "LowQuality"
] as const;

const IMPACT_MODEL_COLUMNS = [
  "Imp_HeadCon_Node",
  "Imp_Impact_Node",
  "Imp_Root_S_Node",
  "Imp_Root_M_Node",
  "Imp_Root_L_Node",
  "Imp_Root_H_Node"
];

const CESSATION_MODEL_COLUMNS = [
  "Ces_HeadCon_Node",
  "Ces_Impact_Node",
  "Ces_Root_S_Node",
  "Ces_Root_M_Node",
  "Ces_Root_L_Node",
  "Ces_Root_H_Node"
];

const AOE_MODEL_FOOTPRINT_COLUMNS = [
  "MODEL01",
  "MODEL02",
  "MODEL03",
  "MODELMIN01",
  "MODELMIN02",
  "MODELMIN03"
];

const AOE_SOUND_FOOTPRINT_COLUMNS = [
  "SoundImpact",
  "SoundDuration",
  "SoundCessation",
  "SoundOneShot",
  "SoundOneShotPercentage"
];

function diagnostic(
  code: string,
  severity: AuroraVfxDiagnosticSeverity,
  message: string
): AuroraVfxDiagnostic {
  return { code, severity, message };
}

function isBlankCell(value: string | undefined): boolean {
  return !value || value === BLANK_CELL;
}

function resolveParseOptions(
  tableName: string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): SharedAuroraTwoDaParseOptions & { profile: string } {
  if (typeof profileOrOptions === "string") {
    return { tableName, profile: profileOrOptions };
  }
  return {
    ...profileOrOptions,
    tableName,
    profile: profileOrOptions.profile ?? "unknown"
  };
}

function toRawCellMap(row: AuroraTwoDaRow): Record<string, string> {
  return Object.fromEntries(row.cells.map((cell) => [cell.column, cell.raw]));
}

function parseNumberCell(value: string | undefined): number | undefined {
  if (isBlankCell(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIntCell(value: string | undefined): number | undefined {
  const parsed = parseNumberCell(value);
  if (typeof parsed !== "number" || !Number.isInteger(parsed)) {
    return undefined;
  }
  return parsed;
}

function getRaw(row: AuroraTwoDaRow, column: string): string | undefined {
  return row.cellsByColumn[column]?.raw;
}

function getCell(row: AuroraTwoDaRow, column: string): AuroraTwoDaCell | undefined {
  return row.cellsByColumn[column];
}

function getValue(row: AuroraTwoDaRow, column: string): string | undefined {
  return row.cellsByColumn[column]?.value;
}

function getNonBlankRaw(row: AuroraTwoDaRow, column: string): string | undefined {
  const cell = getCell(row, column);
  return cell && !cell.blank ? cell.raw : undefined;
}

function getNonBlankRawFromAny(
  row: AuroraTwoDaRow,
  columns: readonly string[]
): string | undefined {
  for (const column of columns) {
    const raw = getNonBlankRaw(row, column);
    if (raw) {
      return raw;
    }
  }
  return undefined;
}

function getLabel(row: AuroraTwoDaRow, columns: readonly string[] = ["Label"]): string {
  for (const column of columns) {
    const cell = getCell(row, column);
    if (cell && !cell.blank) {
      return cell.value;
    }
  }
  return BLANK_CELL;
}

function sourceRowBase<TSourceTable extends string>(
  sourceTable: TSourceTable,
  profile: string,
  row: AuroraTwoDaRow,
  label: string,
  diagnostics: AuroraVfxDiagnostic[]
): AuroraVfxSourceRowBase<TSourceTable> {
  const source = row.source;
  const profileMismatches = collectProfileMismatches(row);
  const mismatchDiagnostics = profileMismatches.map((field) =>
    diagnostic(
      "VFX_SOURCE_PROFILE_MISMATCH_FIELD_PRESERVED",
      "warn",
      `${sourceTable} column ${field.column} was preserved as profile-specific source data and was not promoted to Aurora/NWN1 runtime semantics.`
    )
  );

  return {
    sourceTable,
    profile,
    ...(source?.hash ? { sourceHash: source.hash } : {}),
    ...(source?.layer ? { sourceLayer: source.layer } : {}),
    ...(source?.objectKey ? { sourceObjectKey: source.objectKey } : {}),
    rowId: row.rowId,
    physicalLineNumber: row.physicalLineNumber,
    label,
    rawCells: toRawCellMap(row),
    extraCells: row.extraCells,
    missingColumns: row.missingColumns,
    profileMismatches,
    diagnostics: [...diagnostics, ...mismatchDiagnostics]
  };
}

function collectProfileMismatches(row: AuroraTwoDaRow): AuroraVfxProfileMismatchSourceField[] {
  const fields: AuroraVfxProfileMismatchSourceField[] = [];
  for (const cell of row.cells) {
    if (cell.blank) {
      continue;
    }
    const reason = resolveProfileMismatchReason(cell);
    if (!reason) {
      continue;
    }
    fields.push({
      column: cell.column,
      raw: cell.raw,
      value: cell.value,
      reason
    });
  }
  return fields;
}

function resolveProfileMismatchReason(
  cell: AuroraTwoDaCell
): AuroraVfxProfileMismatchKind | undefined {
  if (/^Dur_.*_Node$/iu.test(cell.column)) {
    return "duration_node";
  }
  if (/^DelayDurationFX$/iu.test(cell.column)) {
    return "delay_duration_fx";
  }
  if (/sef/iu.test(cell.column) || /\.sef$/iu.test(cell.value)) {
    return "sef";
  }
  return undefined;
}

function nonBlankCellsByColumn(
  row: AuroraTwoDaRow,
  columns: readonly string[]
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const column of columns) {
    const raw = getNonBlankRaw(row, column);
    if (raw) {
      output[column] = raw;
    }
  }
  return output;
}

function nonBlankCellsMatching(
  row: AuroraTwoDaRow,
  predicate: (column: string) => boolean
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const cell of row.cells) {
    if (!cell.blank && predicate(cell.column)) {
      output[cell.column] = cell.raw;
    }
  }
  return output;
}

function assertRequiredColumns(
  table: AuroraTwoDaTable,
  requiredColumns: string[],
  code: string
): AuroraVfxDiagnostic[] {
  const header = new Set(table.header);
  const missing = requiredColumns.filter((column) => !header.has(column));
  if (missing.length === 0) {
    return [];
  }
  return [
    diagnostic(
      code,
      "error",
      `Table ${table.tableName} is missing required column(s): ${missing.join(", ")}.`
    )
  ];
}

function buildPhase(
  row: AuroraTwoDaRow,
  phase: AuroraVfxPhaseKind,
  columns: {
    progFx?: string;
    sound?: string;
    modelColumns: string[];
  }
): AuroraVfxPhaseSourceRefs {
  const rawCells: Record<string, string> = {};
  const modelNodeRefs: Record<string, string> = {};

  columns.modelColumns.forEach((column) => {
    const raw = getRaw(row, column);
    if (raw !== undefined) {
      rawCells[column] = raw;
    }
    const modelRef = getNonBlankRaw(row, column);
    if (modelRef) {
      modelNodeRefs[column] = modelRef;
    }
  });

  const progFxRaw = columns.progFx ? getRaw(row, columns.progFx) : undefined;
  if (columns.progFx && progFxRaw !== undefined) {
    rawCells[columns.progFx] = progFxRaw;
  }
  const soundRaw = columns.sound ? getRaw(row, columns.sound) : undefined;
  if (columns.sound && soundRaw !== undefined) {
    rawCells[columns.sound] = soundRaw;
  }

  return {
    phase,
    progFxRowId: parseIntCell(progFxRaw),
    progFxRaw: isBlankCell(progFxRaw) ? undefined : progFxRaw,
    soundRef: isBlankCell(soundRaw) ? undefined : soundRaw,
    soundRaw: isBlankCell(soundRaw) ? undefined : soundRaw,
    modelNodeRefs,
    rawCells
  };
}

function hasPhasePayload(phase: AuroraVfxPhaseSourceRefs): boolean {
  return (
    typeof phase.progFxRowId === "number" ||
    Boolean(phase.progFxRaw) ||
    Boolean(phase.soundRef) ||
    Object.keys(phase.modelNodeRefs).length > 0
  );
}

function buildClientEvents(row: AuroraTwoDaRow): AuroraVfxClientEventSource[] {
  const shakeTypeRaw = getRaw(row, "ShakeType");
  const shakeDelayRaw = getRaw(row, "ShakeDelay");
  const shakeDurationRaw = getRaw(row, "ShakeDuration");
  if (
    isBlankCell(shakeTypeRaw) &&
    isBlankCell(shakeDelayRaw) &&
    isBlankCell(shakeDurationRaw)
  ) {
    return [];
  }

  const shakeType = parseIntCell(shakeTypeRaw);
  const delaySeconds = parseNumberCell(shakeDelayRaw);
  const durationSeconds = parseNumberCell(shakeDurationRaw);
  const shakeKind =
    shakeType === 1 ? "screen_bump" : shakeType === 2 ? "screen_shake" : "unknown";
  const diagnostics = [
    diagnostic(
      "VFX_2DA_SHAKE_CLIENT_EVENT_UNMAPPED",
      "warn",
      "Shake/bump cells were preserved as a client-event source; runtime camera path is not mapped."
    )
  ];

  if (shakeKind === "unknown") {
    diagnostics.push(
      diagnostic(
        "VFX_2DA_SHAKE_TYPE_ENUM_PROFILE_REQUIRED",
        "warn",
        "ShakeType is outside the selected 0/1/2 profile map."
      )
    );
  }

  return [
    {
      eventKind: "shake_or_bump",
      rawCells: {
        ...(shakeTypeRaw !== undefined ? { ShakeType: shakeTypeRaw } : {}),
        ...(shakeDelayRaw !== undefined ? { ShakeDelay: shakeDelayRaw } : {}),
        ...(shakeDurationRaw !== undefined ? { ShakeDuration: shakeDurationRaw } : {})
      },
      shakeType,
      shakeKind,
      delaySeconds,
      durationSeconds,
      diagnostics
    }
  ];
}

export function parseAuroraVisualEffectsTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraVisualEffectSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("visualeffects.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(
      table,
      VISUALEFFECTS_REQUIRED_COLUMNS,
      "VFX_2DA_VISUALEFFECTS_HEADER_REQUIRED"
    )
  ];

  const rows = table.rows.map((row): AuroraVisualEffectSourceRow => {
    const rowDiagnostics: AuroraVfxDiagnostic[] = [];
    const label = getLabel(row);
    const typeFdRaw = getNonBlankRaw(row, "Type_FD");
    const phases = [
      buildPhase(row, "impact", {
        progFx: "ProgFX_Impact",
        sound: "SoundImpact",
        modelColumns: IMPACT_MODEL_COLUMNS
      }),
      buildPhase(row, "duration", {
        progFx: "ProgFX_Duration",
        sound: "SoundDuration",
        modelColumns: []
      }),
      buildPhase(row, "cessation", {
        progFx: "ProgFX_Cessation",
        sound: "SoundCessastion",
        modelColumns: CESSATION_MODEL_COLUMNS
      })
    ];
    const clientEvents = buildClientEvents(row);
    const soundImpact = getNonBlankRaw(row, "SoundImpact");

    if (/screenshake|screenbump/iu.test(soundImpact ?? "") && clientEvents.length === 0) {
      rowDiagnostics.push(
        diagnostic(
          "VFX_2DA_SCREENBUMP_SOUND_NOT_SHAKETYPE",
          "warn",
          "Screen-ish SoundImpact is not enough to create a shake/bump client event."
        )
      );
    }

    if (!typeFdRaw && label !== BLANK_CELL) {
      rowDiagnostics.push(
        diagnostic(
          "VFX_2DA_TYPE_FD_MISSING_FOR_LABELLED_ROW",
          "warn",
          "Labelled visualeffects.2da row has no Type_FD; preserve as source-only data."
        )
      );
    }

    return {
      ...sourceRowBase("visualeffects.2da", profile, row, label, rowDiagnostics),
      typeFd: typeFdRaw,
      visualFacts: {
        orientWithGroundRaw: getNonBlankRaw(row, VISUALEFFECT_SOURCE_FACT_COLUMNS[0]),
        orientWithObjectRaw: getNonBlankRaw(row, VISUALEFFECT_SOURCE_FACT_COLUMNS[1]),
        lowViolenceRaw: getNonBlankRaw(row, VISUALEFFECT_SOURCE_FACT_COLUMNS[2]),
        lowQualityRaw: getNonBlankRaw(row, VISUALEFFECT_SOURCE_FACT_COLUMNS[3])
      },
      phases: phases.filter(hasPhasePayload),
      clientEvents
    };
  });

  return { table, rows, diagnostics };
}

export function parseAuroraProgFxTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraProgFxSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("progfx.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(table, PROGFX_REQUIRED_COLUMNS, "VFX_2DA_PROGFX_HEADER_REQUIRED")
  ];

  const rows = table.rows.map((row): AuroraProgFxSourceRow => {
    const typeRaw = getRaw(row, "Type");
    const params = table.header
      .filter((column) => /^Param\d+$/u.test(column))
      .map((column) => {
        const raw = getRaw(row, column) ?? BLANK_CELL;
        return {
          column,
          raw,
          ...(isBlankCell(raw) ? {} : { value: getValue(row, column) ?? raw })
        };
      });

    return {
      ...sourceRowBase("progfx.2da", profile, row, getLabel(row), []),
      type: parseIntCell(typeRaw),
      typeRaw: isBlankCell(typeRaw) ? undefined : typeRaw,
      params
    };
  });

  return { table, rows, diagnostics };
}

export function parseAuroraAoeTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraAoeSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("vfx_persistent.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(
      table,
      VFX_PERSISTENT_REQUIRED_COLUMNS,
      "VFX_2DA_VFX_PERSISTENT_HEADER_REQUIRED"
    )
  ];

  const rows = table.rows.map((row): AuroraAoeSourceRow => {
    const rowDiagnostics = [
      diagnostic(
        "VFX_AOE_ROW_NOT_VISUALEFFECTS_ROW",
        "warn",
        "vfx_persistent.2da rows are AOE footprint/source facts, not visualeffects.2da rows."
      )
    ];
    return {
      ...sourceRowBase("vfx_persistent.2da", profile, row, getLabel(row, ["LABEL", "Label"]), rowDiagnostics),
      shapeRaw: getNonBlankRawFromAny(row, ["SHAPE", "Shape"]),
      radiusRaw: getNonBlankRawFromAny(row, ["RADIUS", "Radius"]),
      widthRaw: getNonBlankRawFromAny(row, ["WIDTH", "Width"]),
      lengthRaw: getNonBlankRawFromAny(row, ["LENGTH", "Length"]),
      visualFxRaw: getNonBlankRawFromAny(row, ["VisualFX", "VISUALFX"]),
      durationVfxRaw: getNonBlankRawFromAny(row, ["DurationVFX", "DURATIONVFX"]),
      eventScripts: {
        onEnterRaw: getNonBlankRawFromAny(row, ["ONENTER", "OnEnter"]),
        onExitRaw: getNonBlankRawFromAny(row, ["ONEXIT", "OnExit"]),
        heartbeatRaw: getNonBlankRawFromAny(row, ["HEARTBEAT", "Heartbeat"])
      },
      modelFootprintRefs: nonBlankCellsByColumn(row, AOE_MODEL_FOOTPRINT_COLUMNS),
      soundFootprintRefs: nonBlankCellsByColumn(row, AOE_SOUND_FOOTPRINT_COLUMNS)
    };
  });

  return { table, rows, diagnostics };
}

export function parseAuroraItemPropertyVisualFxTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraItemPropertyVisualSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("iprp_visualfx.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(
      table,
      IPRP_VISUALFX_REQUIRED_COLUMNS,
      "VFX_2DA_IPRP_VISUALFX_HEADER_REQUIRED"
    )
  ];

  const rows = table.rows.map((row): AuroraItemPropertyVisualSourceRow => {
    const rowDiagnostics = [
      diagnostic(
        "VFX_IPRP_VISUALFX_MODELSUFFIX_NOT_VISUALEFFECTS_ROW",
        "warn",
        "iprp_visualfx.2da ModelSuffix is item-property source data and is not a visualeffects.2da phase row."
      )
    ];
    return {
      ...sourceRowBase("iprp_visualfx.2da", profile, row, getLabel(row), rowDiagnostics),
      nameRaw: getNonBlankRaw(row, "Name"),
      modelSuffixRaw: getNonBlankRaw(row, "ModelSuffix"),
      subtypeProfileRaw: getNonBlankRawFromAny(row, ["SubType", "Subtype", "Profile"]),
      profileData: nonBlankCellsMatching(
        row,
        (column) => !["Label", "Name", "ModelSuffix"].includes(column)
      )
    };
  });

  return { table, rows, diagnostics };
}

export function parseAuroraSpellsTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraSpellVisualSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("spells.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(table, SPELLS_REQUIRED_COLUMNS, "VFX_2DA_SPELLS_HEADER_REQUIRED")
  ];

  const rows = table.rows.map((row): AuroraSpellVisualSourceRow => {
    const rowDiagnostics = [
      diagnostic(
        "VFX_SPELLS_SOURCE_FACTS_NOT_VISUALEFFECTS_ROW",
        "warn",
        "spells.2da visual/projectile/script/sound slots remain spell-source facts until an owning effect/application path resolves them."
      )
    ];
    return {
      ...sourceRowBase("spells.2da", profile, row, getLabel(row), rowDiagnostics),
      visualSlots: nonBlankCellsMatching(row, (column) => /visual/iu.test(column)),
      projectileSlots: nonBlankCellsMatching(row, (column) => /projectile|^proj/iu.test(column)),
      scriptSlots: nonBlankCellsMatching(row, (column) => /script$/iu.test(column)),
      soundSlots: nonBlankCellsMatching(row, (column) => /sound/iu.test(column))
    };
  });

  return { table, rows, diagnostics };
}

export function parseAuroraDamageHitVisualTwoDa(
  input: Buffer | string,
  profileOrOptions: string | AuroraVfxSourceParseOptions = "unknown"
): {
  table: AuroraTwoDaTable;
  rows: AuroraDamageHitVisualSourceRow[];
  diagnostics: AuroraVfxDiagnostic[];
} {
  const parseOptions = resolveParseOptions("damagehitvisual.2da", profileOrOptions);
  const table = parseAuroraTwoDaTable(input, parseOptions);
  const profile = parseOptions.profile;
  const diagnostics = [
    ...table.diagnostics,
    ...assertRequiredColumns(
      table,
      DAMAGEHITVISUAL_REQUIRED_COLUMNS,
      "VFX_2DA_DAMAGEHITVISUAL_HEADER_REQUIRED"
    )
  ];

  const rows = table.rows.map((row): AuroraDamageHitVisualSourceRow => {
    const rowDiagnostics = [
      diagnostic(
        "VFX_DAMAGEHIT_ROW_NOT_GENERIC_EFFECTVISUALEFFECT",
        "warn",
        "damagehitvisual.2da rows are combat-event source facts and are not generic EffectVisualEffect requests."
      )
    ];
    return {
      ...sourceRowBase("damagehitvisual.2da", profile, row, getLabel(row), rowDiagnostics),
      visualEffectIdRaw: getNonBlankRaw(row, "VisualEffectID"),
      rangedEffectIdRaw: getNonBlankRaw(row, "RangedEffectID")
    };
  });

  return { table, rows, diagnostics };
}

export function diagnoseCatalogVfxPreviewSourceBoundary(
  input: AuroraCatalogVfxPreviewSourceBoundaryInput
): AuroraVfxDiagnostic[] {
  const diagnostics: AuroraVfxDiagnostic[] = [];
  if (input.vfxPreset && input.vfxPreset.trim().length > 0) {
    diagnostics.push(
      diagnostic(
        "VFX_CATALOG_VFXPRESET_METADATA_NOT_PHASE_SOURCE",
        "warn",
        "Catalog vfxPreset metadata is preview/source-list metadata and is not a visualeffects.2da source row."
      )
    );
  }
  if (input.placeableSubtype?.trim().toLowerCase() === "vfx") {
    diagnostics.push(
      diagnostic(
        "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
        "warn",
        "Placeable subtype vfx is catalog/source-list data and is not an EffectVisualEffect instance."
      )
    );
  }
  if (input.rendererPreset?.trim().toLowerCase() === "vfx-emitter") {
    diagnostics.push(
      diagnostic(
        "VFX_CURRENT_VFX_PRESET_RESOURCE_NODE_PREVIEW_ONLY",
        "warn",
        "vfx-emitter rendererPreset identifies the current preview lane, not canonical VFX runtime source semantics."
      )
    );
  }
  return diagnostics;
}

export function buildAuroraVfxEffectInstanceFromCatalogPreview(
  input: AuroraCatalogVfxPreviewSourceBoundaryInput
): AuroraVfxEffectInstanceBuildResult {
  return {
    diagnostics: [
      ...diagnoseCatalogVfxPreviewSourceBoundary(input),
      diagnostic(
        "VFX_CATALOG_PREVIEW_NOT_EFFECT_INSTANCE",
        "warn",
        "Catalog/placeable VFX preview metadata cannot construct an AuroraVfxEffectInstance."
      )
    ]
  };
}

function buildPhaseScheduleLanes(
  phases: AuroraVfxPhaseSourceRefs[],
  clientEvents: AuroraVfxClientEventSource[]
): AuroraVfxPhaseScheduleLanes {
  const modelNodeRefs: AuroraVfxPhaseScheduleLanes["modelNodeRefs"] = {};
  const progFxRefs: AuroraVfxPhaseScheduleLanes["progFxRefs"] = {};
  const soundRefs: AuroraVfxPhaseScheduleLanes["soundRefs"] = {};

  for (const phase of phases) {
    if (Object.keys(phase.modelNodeRefs).length > 0) {
      modelNodeRefs[phase.phase] = phase.modelNodeRefs;
    }
    if (phase.progFxRaw) {
      progFxRefs[phase.phase] = phase.progFxRaw;
    }
    if (phase.soundRaw) {
      soundRefs[phase.phase] = phase.soundRaw;
    }
  }

  return {
    modelNodeRefs,
    progFxRefs,
    soundRefs,
    clientEvents
  };
}

function validateEffectInstanceForSchedule(
  instance: AuroraVfxEffectInstance | undefined
): AuroraVfxDiagnostic[] {
  if (!instance) {
    return [];
  }

  const diagnostics = [...(instance.diagnostics ?? [])];
  if (instance.constructorKind === "EffectBeam") {
    if (!instance.effectorRef) {
      diagnostics.push(
        diagnostic(
          "VFX_EFFECTBEAM_EFFECTOR_REQUIRED",
          "error",
          "EffectBeam requires an effector/source object before scheduling."
        )
      );
    }
    if (!instance.targetRef) {
      diagnostics.push(
        diagnostic(
          "VFX_EFFECTBEAM_TARGET_REQUIRED",
          "error",
          "EffectBeam requires a target object before scheduling."
        )
      );
    }
    if (!instance.bodyNode) {
      diagnostics.push(
        diagnostic(
          "VFX_EFFECTBEAM_BODY_NODE_REQUIRED",
          "error",
          "EffectBeam requires BODY_NODE context before scheduling."
        )
      );
    }
  }

  return diagnostics;
}

export function buildAuroraVfxPhaseSchedule(
  sourceRow: AuroraVisualEffectSourceRow,
  effectInstance?: AuroraVfxEffectInstance
): AuroraVfxPhaseSchedule {
  const phases = sourceRow.phases;
  const scheduledClientEvents = effectInstance ? sourceRow.clientEvents : [];
  const lanes = buildPhaseScheduleLanes(phases, scheduledClientEvents);
  const instanceDiagnostics = validateEffectInstanceForSchedule(effectInstance);
  const diagnostics: AuroraVfxDiagnostic[] = [...instanceDiagnostics];

  if (!effectInstance) {
    diagnostics.push(
      diagnostic(
        "VFX_EFFECT_INSTANCE_CONTEXT_REQUIRED",
        "warn",
        "visualeffects.2da source rows cannot schedule runtime phases without an effect instance."
      )
    );
  } else if (effectInstance.sourceRowId !== sourceRow.rowId) {
    diagnostics.push(
      diagnostic(
        "VFX_EFFECT_INSTANCE_ROW_MISMATCH",
        "error",
        "Effect instance source row does not match the visualeffects.2da source row."
      )
    );
  }

  if (!effectInstance && sourceRow.clientEvents.length > 0) {
    diagnostics.push(
      diagnostic(
        "VFX_CLIENT_EVENT_EFFECT_INSTANCE_REQUIRED",
        "warn",
        "Shake/bump client events require effect application context before scheduling."
      )
    );
  }

  return {
    sourceRowId: sourceRow.rowId,
    sourceLabel: sourceRow.label,
    status:
      effectInstance && diagnostics.every((entry) => entry.severity !== "error")
        ? "ready"
        : "source_only",
    effectInstance,
    context: effectInstance,
    phases,
    lanes,
    clientEvents: scheduledClientEvents,
    diagnostics: [...sourceRow.diagnostics, ...diagnostics]
  };
}
