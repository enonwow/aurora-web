import type { AreaScene, SceneObjectKind } from "../../scene/contracts";
import type {
  AreaTileProcessContractEntry,
  AreaTileProcessContractReadiness
} from "../../tiles/application/areaTileProcessContractReadiness";
import {
  resolveObjectRenderStatus,
  type ObjectRenderStatus
} from "./workspaceSceneInteraction";

export const AREA_WORKSPACE_DIAGNOSTICS_SCHEMA_VERSION =
  "area-workspace-diagnostics.v1" as const;
export const MAX_AREA_WORKSPACE_DIAGNOSTIC_CELLS = 65_536;
export const MAX_AREA_WORKSPACE_DIAGNOSTIC_OBJECTS = 65_536;
export const MAX_AREA_WORKSPACE_DIAGNOSTIC_RESOURCE_ENTRIES = 4_096;

const OBJECT_KINDS: readonly SceneObjectKind[] = [
  "creatures",
  "doors",
  "encounters",
  "items",
  "placeables",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
];

export interface AreaWorkspaceDiagnosticsIssue {
  readonly scope: "cell" | "object" | "resource";
  readonly subjectId: string;
  readonly code: string;
  readonly message: string;
}

export interface AreaWorkspaceDiagnosticCell {
  readonly id: string;
  readonly row: number;
  readonly col: number;
  readonly terrain: string;
  readonly orientation: 0 | 1 | 2 | 3;
  readonly tileId?: number;
  readonly height?: number;
  readonly modelResRef?: string;
  readonly modelSource?: "are-tile-list" | "set-tile-section";
  readonly fallbackReason?: string;
  readonly renderStatus: "ready" | "warning" | "unavailable";
  readonly selected: boolean;
}

export interface AreaWorkspaceDiagnosticObject {
  readonly id: string;
  readonly kind: SceneObjectKind;
  readonly name?: string;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
  readonly renderStatus: ObjectRenderStatus;
  readonly selected: boolean;
}

export interface AreaWorkspaceDiagnosticResourceEntry {
  readonly modelResRef: string;
  readonly tileId: string;
  readonly status: AreaTileProcessContractEntry["status"];
  readonly processStatus: AreaTileProcessContractEntry["processStatus"];
  readonly textureContractStatus: AreaTileProcessContractEntry["textureContractStatus"];
  readonly sourceAssetContractStatus: AreaTileProcessContractEntry["sourceAssetContractStatus"];
  readonly mdlSourceAssetStatus: AreaTileProcessContractEntry["mdlSourceAssetStatus"];
  readonly glbGeometryStatus: AreaTileProcessContractEntry["glbGeometryStatus"];
  readonly materialReadinessStatus: AreaTileProcessContractEntry["materialReadinessStatus"];
  readonly renderLoaderHandoffStatus: AreaTileProcessContractEntry["renderLoaderHandoffStatus"];
  readonly sourceObjectKey?: string;
  readonly sourceObjectExtension?: string;
  readonly sourceAssetOrigin?: string;
  readonly mdlSourceContentSha256?: string;
  readonly modelAssetObjectKey?: string;
  readonly modelAssetContentSha256?: string;
  readonly renderAssetContractBlockers: string;
  readonly mdlGlbMaterialBlockers: string;
  readonly code?: string | null;
  readonly message?: string;
}

export type AreaWorkspaceDiagnosticResources =
  | {
      readonly status: "unavailable";
      readonly reason: "not_loaded" | "readiness_scene_mismatch";
      readonly entries: readonly [];
    }
  | {
      readonly status: AreaTileProcessContractReadiness["status"];
      readonly areaId: string;
      readonly expectedCandidateCount: number;
      readonly pendingCandidateCount: number;
      readonly checkedCandidateCount: number;
      readonly readyCandidateCount: number;
      readonly blockedCandidateCount: number;
      readonly sourceAssetReadyCount: number;
      readonly sourceAssetBlockedCount: number;
      readonly mdlSourceReadyCount: number;
      readonly mdlSourceBlockedCount: number;
      readonly glbGeometryReadyCount: number;
      readonly glbGeometryBlockedCount: number;
      readonly materialTextureContractReadyCount: number;
      readonly materialBindingBlockedCount: number;
      readonly renderLoaderReadyCount: number;
      readonly renderLoaderBlockedCount: number;
      readonly blockerSummary: string;
      readonly textureMaterialBlockerSummary: string;
      readonly renderAssetContractBlockerSummary: string;
      readonly mdlGlbMaterialBlockerSummary: string;
      readonly entries: readonly AreaWorkspaceDiagnosticResourceEntry[];
    };

export interface AreaWorkspaceDiagnosticsReport {
  readonly schemaVersion: typeof AREA_WORKSPACE_DIAGNOSTICS_SCHEMA_VERSION;
  readonly generatedAtIso: string;
  readonly area: {
    readonly sceneId: string;
    readonly areaName: string;
    readonly source: AreaScene["source"];
    readonly updatedAtUnixMs: number;
    readonly width: number;
    readonly height: number;
    readonly tileCount: number;
    readonly objectCount: number;
    readonly tilesetResRefs: readonly string[];
  };
  readonly selection: {
    readonly tileIds: readonly string[];
    readonly objectIds: readonly string[];
  };
  readonly statusByKind: Readonly<Record<SceneObjectKind, Readonly<Record<ObjectRenderStatus, number>>>>;
  readonly cells: readonly AreaWorkspaceDiagnosticCell[];
  readonly objects: readonly AreaWorkspaceDiagnosticObject[];
  readonly resources: AreaWorkspaceDiagnosticResources;
  readonly issues: readonly AreaWorkspaceDiagnosticsIssue[];
  readonly summary: {
    readonly cellWarnings: number;
    readonly objectErrors: number;
    readonly objectWarnings: number;
    readonly nonRenderObjects: number;
    readonly resourceReady: number;
    readonly resourceBlocked: number;
    readonly issueCount: number;
  };
}

export type AreaWorkspaceDiagnosticsBuildResult =
  | { readonly ok: true; readonly report: AreaWorkspaceDiagnosticsReport }
  | { readonly ok: false; readonly code: string; readonly message: string };

export interface BuildAreaWorkspaceDiagnosticsReportInput {
  readonly generatedAtIso: string;
  readonly scene: AreaScene;
  readonly selectedTileIds: readonly string[];
  readonly selectedObjectIds: readonly string[];
  readonly tileProcessReadiness?: AreaTileProcessContractReadiness | null;
}

function failure(code: string, message: string): AreaWorkspaceDiagnosticsBuildResult {
  return { ok: false, code, message };
}

function isCanonicalIsoTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function hasUniqueIds(items: readonly { readonly id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function selectedExistingIds(
  selectedIds: readonly string[],
  existingIds: ReadonlySet<string>
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const id of selectedIds) {
    if (!existingIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function buildStatusByKind(
  objects: readonly AreaWorkspaceDiagnosticObject[]
): Record<SceneObjectKind, Record<ObjectRenderStatus, number>> {
  const result = Object.fromEntries(
    OBJECT_KINDS.map((kind) => [kind, { ok: 0, warning: 0, error: 0, non_render: 0 }])
  ) as Record<SceneObjectKind, Record<ObjectRenderStatus, number>>;
  for (const object of objects) result[object.kind][object.renderStatus] += 1;
  return result;
}

function mapResourceEntry(
  entry: AreaTileProcessContractEntry
): AreaWorkspaceDiagnosticResourceEntry {
  return {
    modelResRef: entry.modelResRef,
    tileId: entry.tileId,
    status: entry.status,
    processStatus: entry.processStatus,
    textureContractStatus: entry.textureContractStatus,
    sourceAssetContractStatus: entry.sourceAssetContractStatus,
    mdlSourceAssetStatus: entry.mdlSourceAssetStatus,
    glbGeometryStatus: entry.glbGeometryStatus,
    materialReadinessStatus: entry.materialReadinessStatus,
    renderLoaderHandoffStatus: entry.renderLoaderHandoffStatus,
    ...(entry.sourceObjectKey ? { sourceObjectKey: entry.sourceObjectKey } : {}),
    ...(entry.sourceObjectExtension ? { sourceObjectExtension: entry.sourceObjectExtension } : {}),
    ...(entry.sourceAssetOrigin ? { sourceAssetOrigin: entry.sourceAssetOrigin } : {}),
    ...(entry.mdlSourceContentSha256
      ? { mdlSourceContentSha256: entry.mdlSourceContentSha256 }
      : {}),
    ...(entry.modelAssetObjectKey ? { modelAssetObjectKey: entry.modelAssetObjectKey } : {}),
    ...(entry.modelAssetContentSha256
      ? { modelAssetContentSha256: entry.modelAssetContentSha256 }
      : {}),
    renderAssetContractBlockers: entry.renderAssetContractBlockers,
    mdlGlbMaterialBlockers: entry.mdlGlbMaterialBlockers,
    ...(entry.code !== undefined ? { code: entry.code } : {}),
    ...(entry.message !== undefined ? { message: entry.message } : {})
  };
}

export function buildAreaWorkspaceDiagnosticsReport(
  input: BuildAreaWorkspaceDiagnosticsReportInput
): AreaWorkspaceDiagnosticsBuildResult {
  if (!isCanonicalIsoTimestamp(input.generatedAtIso)) {
    return failure(
      "invalid_generated_at",
      "Diagnostics generatedAtIso must be a canonical ISO timestamp."
    );
  }
  if (!input.scene.sceneId || input.scene.sceneId.includes("\0")) {
    return failure("invalid_scene_id", "Diagnostics require a non-empty Area scene id.");
  }
  if (
    !Number.isSafeInteger(input.scene.width) ||
    !Number.isSafeInteger(input.scene.height) ||
    input.scene.width < 1 ||
    input.scene.height < 1
  ) {
    return failure("invalid_area_dimensions", "Diagnostics require positive integer Area dimensions.");
  }
  if (input.scene.tiles.length > MAX_AREA_WORKSPACE_DIAGNOSTIC_CELLS) {
    return failure(
      "cell_budget_exceeded",
      `Diagnostics reports support at most ${MAX_AREA_WORKSPACE_DIAGNOSTIC_CELLS} cells.`
    );
  }
  if (input.scene.objects.length > MAX_AREA_WORKSPACE_DIAGNOSTIC_OBJECTS) {
    return failure(
      "object_budget_exceeded",
      `Diagnostics reports support at most ${MAX_AREA_WORKSPACE_DIAGNOSTIC_OBJECTS} objects.`
    );
  }
  if (!hasUniqueIds(input.scene.tiles)) {
    return failure("duplicate_tile_id", "Diagnostics require unique tile ids.");
  }
  if (!hasUniqueIds(input.scene.objects)) {
    return failure("duplicate_object_id", "Diagnostics require unique object ids.");
  }
  if (
    input.tileProcessReadiness &&
    input.tileProcessReadiness.entries.length > MAX_AREA_WORKSPACE_DIAGNOSTIC_RESOURCE_ENTRIES
  ) {
    return failure(
      "resource_entry_budget_exceeded",
      `Diagnostics reports support at most ${MAX_AREA_WORKSPACE_DIAGNOSTIC_RESOURCE_ENTRIES} tile resource entries.`
    );
  }

  const tileIds = new Set(input.scene.tiles.map((tile) => tile.id));
  const objectIds = new Set(input.scene.objects.map((object) => object.id));
  const selectedTileIds = selectedExistingIds(input.selectedTileIds, tileIds);
  const selectedObjectIds = selectedExistingIds(input.selectedObjectIds, objectIds);
  const selectedTileSet = new Set(selectedTileIds);
  const selectedObjectSet = new Set(selectedObjectIds);

  const cells: AreaWorkspaceDiagnosticCell[] = [...input.scene.tiles]
    .sort((left, right) => left.row - right.row || left.col - right.col || compareText(left.id, right.id))
    .map((tile) => ({
      id: tile.id,
      row: tile.row,
      col: tile.col,
      terrain: tile.terrain,
      orientation: tile.orientation,
      ...(tile.tileId !== undefined ? { tileId: tile.tileId } : {}),
      ...(tile.height !== undefined ? { height: tile.height } : {}),
      ...(tile.modelResRef ? { modelResRef: tile.modelResRef } : {}),
      ...(tile.modelSource ? { modelSource: tile.modelSource } : {}),
      ...(tile.fallbackReason ? { fallbackReason: tile.fallbackReason } : {}),
      renderStatus: tile.fallbackReason
        ? "warning"
        : tile.modelResRef
          ? "ready"
          : "unavailable",
      selected: selectedTileSet.has(tile.id)
    }));

  const objects: AreaWorkspaceDiagnosticObject[] = [...input.scene.objects]
    .sort((left, right) => compareText(left.kind, right.kind) || compareText(left.id, right.id))
    .map((object) => ({
      id: object.id,
      kind: object.kind,
      ...(object.name !== undefined ? { name: object.name } : {}),
      resRef: object.resRef,
      tag: object.tag,
      x: object.x,
      y: object.y,
      z: object.z,
      bearing: object.bearing,
      renderStatus: resolveObjectRenderStatus(object),
      selected: selectedObjectSet.has(object.id)
    }));

  const issues: AreaWorkspaceDiagnosticsIssue[] = [];
  for (const cell of cells) {
    if (!cell.fallbackReason) continue;
    issues.push({
      scope: "cell",
      subjectId: cell.id,
      code: "CELL_FALLBACK_ACTIVE",
      message: cell.fallbackReason
    });
  }
  for (const object of objects) {
    if (object.renderStatus === "warning") {
      issues.push({
        scope: "object",
        subjectId: object.id,
        code: "OBJECT_RENDER_WARNING",
        message: "Object renderer reports a warning state."
      });
    } else if (object.renderStatus === "error") {
      issues.push({
        scope: "object",
        subjectId: object.id,
        code: "OBJECT_RENDER_ERROR",
        message: "Object renderer reports an error state."
      });
    }
  }

  let resources: AreaWorkspaceDiagnosticResources;
  const readiness = input.tileProcessReadiness;
  if (!readiness) {
    resources = { status: "unavailable", reason: "not_loaded", entries: [] };
  } else if (readiness.areaId !== input.scene.sceneId) {
    resources = {
      status: "unavailable",
      reason: "readiness_scene_mismatch",
      entries: []
    };
    issues.push({
      scope: "resource",
      subjectId: input.scene.sceneId,
      code: "RESOURCE_READINESS_STALE",
      message: "Tile resource readiness belongs to a different Area."
    });
  } else {
    const entries = readiness.entries
      .map(mapResourceEntry)
      .sort(
        (left, right) =>
          compareText(left.modelResRef, right.modelResRef) || compareText(left.tileId, right.tileId)
      );
    resources = {
      status: readiness.status,
      areaId: readiness.areaId,
      expectedCandidateCount: readiness.expectedCandidateCount ?? readiness.checkedCandidateCount,
      pendingCandidateCount: readiness.pendingCandidateCount ?? 0,
      checkedCandidateCount: readiness.checkedCandidateCount,
      readyCandidateCount: readiness.readyCandidateCount,
      blockedCandidateCount: readiness.blockedCandidateCount,
      sourceAssetReadyCount: readiness.sourceAssetReadyCount,
      sourceAssetBlockedCount: readiness.sourceAssetBlockedCount,
      mdlSourceReadyCount: readiness.mdlSourceReadyCount,
      mdlSourceBlockedCount: readiness.mdlSourceBlockedCount,
      glbGeometryReadyCount: readiness.glbGeometryReadyCount,
      glbGeometryBlockedCount: readiness.glbGeometryBlockedCount,
      materialTextureContractReadyCount: readiness.materialTextureContractReadyCount,
      materialBindingBlockedCount: readiness.materialBindingBlockedCount,
      renderLoaderReadyCount: readiness.renderLoaderReadyCount,
      renderLoaderBlockedCount: readiness.renderLoaderBlockedCount,
      blockerSummary: readiness.blockerSummary,
      textureMaterialBlockerSummary: readiness.textureMaterialBlockerSummary,
      renderAssetContractBlockerSummary: readiness.renderAssetContractBlockerSummary,
      mdlGlbMaterialBlockerSummary: readiness.mdlGlbMaterialBlockerSummary,
      entries
    };
    for (const entry of entries) {
      if (entry.status !== "blocked") continue;
      issues.push({
        scope: "resource",
        subjectId: entry.tileId,
        code: "RESOURCE_CONTRACT_BLOCKED",
        message: entry.message ?? entry.code ?? entry.renderAssetContractBlockers
      });
    }
  }

  const statusByKind = buildStatusByKind(objects);
  const tilesetResRefs = Array.from(
    new Set(input.scene.tiles.map((tile) => tile.tilesetResRef).filter((value): value is string => Boolean(value)))
  ).sort(compareText);
  const resourceReady = resources.status === "unavailable" ? 0 : resources.readyCandidateCount;
  const resourceBlocked = resources.status === "unavailable" ? 0 : resources.blockedCandidateCount;

  return {
    ok: true,
    report: {
      schemaVersion: AREA_WORKSPACE_DIAGNOSTICS_SCHEMA_VERSION,
      generatedAtIso: input.generatedAtIso,
      area: {
        sceneId: input.scene.sceneId,
        areaName: input.scene.areaName,
        source: input.scene.source,
        updatedAtUnixMs: input.scene.updatedAtUnixMs,
        width: input.scene.width,
        height: input.scene.height,
        tileCount: cells.length,
        objectCount: objects.length,
        tilesetResRefs
      },
      selection: { tileIds: selectedTileIds, objectIds: selectedObjectIds },
      statusByKind,
      cells,
      objects,
      resources,
      issues,
      summary: {
        cellWarnings: cells.filter((cell) => cell.renderStatus === "warning").length,
        objectErrors: objects.filter((object) => object.renderStatus === "error").length,
        objectWarnings: objects.filter((object) => object.renderStatus === "warning").length,
        nonRenderObjects: objects.filter((object) => object.renderStatus === "non_render").length,
        resourceReady,
        resourceBlocked,
        issueCount: issues.length
      }
    }
  };
}

export function buildAreaWorkspaceDiagnosticsFilename(sceneId: string): string {
  const normalized = sceneId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 64);
  return `${normalized || "area"}_area_diagnostics.json`;
}
