import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";

export const DEFAULT_CONCEPT_TILEMAP_LAB_MAX_BYTES = 10 * 1024 * 1024;
export const DEFAULT_FULL_LAST_CITY_DIRECT_OPEN_MIN_BYTES = 50 * 1024 * 1024;

export function buildToolsetLaunchSafetyGate({
  modulePath,
  criticalFailureRegistryPath,
  allowFullLastCityDirectOpen = false,
  allowQuarantinedModuleRetry = false,
  allowFullModuleConceptTilemapTarget = false,
  conceptTilemapLabMaxBytes = DEFAULT_CONCEPT_TILEMAP_LAB_MAX_BYTES,
  fullLastCityDirectOpenMinBytes = DEFAULT_FULL_LAST_CITY_DIRECT_OPEN_MIN_BYTES
}) {
  const moduleInfo = classifyToolsetModuleTarget(modulePath, {
    conceptTilemapLabMaxBytes,
    fullLastCityDirectOpenMinBytes
  });
  const registry = readCriticalFailureRegistry(criticalFailureRegistryPath);
  const candidateQuarantine = findCriticalFailureForModule(registry, modulePath, criticalFailureRegistryPath);
  const blockers = [];

  if (candidateQuarantine && !allowQuarantinedModuleRetry) {
    blockers.push({
      code: "candidate_quarantined_after_toolset_critical_failure",
      details: candidateQuarantine
    });
  }
  if (moduleInfo.isFullSizeConceptTilemapTarget && !allowFullModuleConceptTilemapTarget) {
    blockers.push({
      code: "generated_lab_module_too_large_full_module_target",
      details: buildFullSizeConceptTilemapTarget(moduleInfo)
    });
  }
  if (moduleInfo.isFullLastCityModuleTarget && !allowFullLastCityDirectOpen) {
    blockers.push({
      code: "full_last_city_module_direct_open_blocked",
      details: buildFullLastCityModuleTarget(moduleInfo)
    });
  }

  return {
    ok: blockers.length === 0,
    blockerCode: blockers[0]?.code ?? null,
    blockers: blockers.map((blocker) => blocker.code),
    blockerDetails: blockers,
    moduleInfo,
    candidateQuarantine,
    fullSizeConceptTilemapTarget: moduleInfo.isFullSizeConceptTilemapTarget
      ? buildFullSizeConceptTilemapTarget(moduleInfo)
      : null,
    fullLastCityModuleTarget: moduleInfo.isFullLastCityModuleTarget
      ? buildFullLastCityModuleTarget(moduleInfo)
      : null,
    policy: {
      allowFullLastCityDirectOpen,
      allowQuarantinedModuleRetry,
      allowFullModuleConceptTilemapTarget,
      conceptTilemapLabMaxBytes,
      fullLastCityDirectOpenMinBytes,
      reason:
        "No automatic Toolset launch for quarantined modules, full-size generated labs, or full Last City modules after the Loading Inventory List AV family."
    }
  };
}

export function classifyToolsetModuleTarget(
  modulePath,
  {
    conceptTilemapLabMaxBytes = DEFAULT_CONCEPT_TILEMAP_LAB_MAX_BYTES,
    fullLastCityDirectOpenMinBytes = DEFAULT_FULL_LAST_CITY_DIRECT_OPEN_MIN_BYTES
  } = {}
) {
  const normalizedModulePath = modulePath ? resolve(modulePath) : null;
  const moduleBaseName = normalizedModulePath ? basename(normalizedModulePath).toLowerCase() : "";
  const exists = Boolean(normalizedModulePath && existsSync(normalizedModulePath));
  const sizeBytes = exists ? statSync(normalizedModulePath).size : null;
  const isConceptTilemap = moduleBaseName.startsWith("codex_writer_concept_sic_tilemap");
  const isLastCityCodexModule =
    moduleBaseName.startsWith("the_last_city") && moduleBaseName.includes("codex") && moduleBaseName.endsWith(".mod");
  const isFullSizeConceptTilemapTarget =
    isConceptTilemap && Number(sizeBytes ?? 0) > conceptTilemapLabMaxBytes;
  const isFullLastCityModuleTarget =
    isLastCityCodexModule && Number(sizeBytes ?? 0) >= fullLastCityDirectOpenMinBytes;

  return {
    modulePath: normalizedModulePath,
    moduleBaseName,
    exists,
    sizeBytes,
    isConceptTilemap,
    isLastCityCodexModule,
    isFullSizeConceptTilemapTarget,
    isFullLastCityModuleTarget,
    sizeClass: isConceptTilemap
      ? isFullSizeConceptTilemapTarget
        ? "full_module_target"
        : "small_lab_target"
      : isFullLastCityModuleTarget
        ? "full_last_city_module_target"
        : "non_concept_tilemap",
    conceptTilemapLabMaxBytes,
    fullLastCityDirectOpenMinBytes
  };
}

export function readCriticalFailureRegistry(criticalFailureRegistryPath) {
  if (!criticalFailureRegistryPath || !existsSync(criticalFailureRegistryPath)) {
    return { version: "last-city-toolset-critical-failures/v1", records: [] };
  }
  try {
    return JSON.parse(readFileSync(criticalFailureRegistryPath, "utf8"));
  } catch (error) {
    return {
      version: "last-city-toolset-critical-failures/v1",
      records: [],
      unreadable: true,
      registryPath: criticalFailureRegistryPath,
      error: error?.message ?? String(error)
    };
  }
}

export function findCriticalFailureForModule(registry, modulePath, criticalFailureRegistryPath = null) {
  const records = Array.isArray(registry?.records) ? registry.records : [];
  const moduleBaseName = basename(modulePath).toLowerCase();
  const normalizedPath = resolve(modulePath).toLowerCase();
  const match = [...records].reverse().find((record) => {
    if (record.status !== "rejected") {
      return false;
    }
    const recordPath = record.modulePath ? resolve(record.modulePath).toLowerCase() : null;
    const recordBaseName = record.moduleBaseName ? String(record.moduleBaseName).toLowerCase() : null;
    return recordPath === normalizedPath || recordBaseName === moduleBaseName;
  });
  if (!match) {
    return null;
  }
  return {
    blocked: true,
    reason: match.reason,
    recordedAt: match.recordedAt,
    modulePath: match.modulePath,
    moduleBaseName: match.moduleBaseName,
    registryPath: criticalFailureRegistryPath
  };
}

function buildFullSizeConceptTilemapTarget(moduleInfo) {
  return {
    blocked: true,
    reason: "concept tilemap lab target is full-module sized",
    moduleBaseName: moduleInfo.moduleBaseName,
    sizeBytes: moduleInfo.sizeBytes,
    maxBytes: moduleInfo.conceptTilemapLabMaxBytes,
    expected: "small lab module copied from a known-good concept baseline"
  };
}

function buildFullLastCityModuleTarget(moduleInfo) {
  return {
    blocked: true,
    reason: "full Last City module direct Toolset open is blocked by default after Loading Inventory List access violations",
    moduleBaseName: moduleInfo.moduleBaseName,
    sizeBytes: moduleInfo.sizeBytes,
    minBytes: moduleInfo.fullLastCityDirectOpenMinBytes,
    expected:
      "use a focused lab module or run an offline inventory/palette audit before an explicitly supervised override"
  };
}
