import { createHash } from "node:crypto";
import type {
  RuntimeSourceSettings,
  RuntimeSettingsRecord
} from "../../runtime-settings/domain/runtime-settings.types";

export type AuroraVfxSourcePolicyDiagnosticSeverity = "info" | "warn" | "error";

export interface AuroraVfxSourcePolicyDiagnostic {
  code: string;
  severity: AuroraVfxSourcePolicyDiagnosticSeverity;
  message: string;
}

export type AuroraVfxSourceLayer =
  | "module"
  | "hak"
  | "vanilla"
  | "external_fixture";

export type AuroraVfxSourceCandidateKind = "table" | "resource";

export interface AuroraVfxSourcePolicyCandidate {
  candidateId?: string;
  layer: AuroraVfxSourceLayer;
  resourceKind: AuroraVfxSourceCandidateKind;
  resourceKey: string;
  sourcePath?: string;
  hakName?: string;
  sourceHash?: string;
  tableHash?: string;
  resourceHash?: string;
}

export interface AuroraVfxSourcePolicyCandidateTrace
  extends Required<Pick<AuroraVfxSourcePolicyCandidate, "candidateId">> {
  layer: AuroraVfxSourceLayer;
  resourceKind: AuroraVfxSourceCandidateKind;
  resourceKey: string;
  sourcePath?: string;
  hakName?: string;
  sourceHash?: string;
  tableHash?: string;
  resourceHash?: string;
  precedenceRank: number;
}

export interface AuroraVfxHakProvenance {
  hakName: string;
  normalizedHakName: string;
  listIndex: number;
  selected: boolean;
}

export interface AuroraVfxSelectedSourceTrace {
  candidateId: string;
  layer: AuroraVfxSourceLayer;
  resourceKind: AuroraVfxSourceCandidateKind;
  resourceKey: string;
  sourcePath?: string;
  hakName?: string;
  sourceHash?: string;
  tableHash?: string;
  resourceHash?: string;
}

export interface AuroraVfxSourcePolicyCacheKeyParts {
  version: "aurora-vfx-source-policy-cache/v1";
  runtimeSettingsRevision: number;
  hakListHash: string;
  policyHash: string;
  selectedSourceLayer?: AuroraVfxSourceLayer;
  selectedResourceKey?: string;
  selectedTableHash?: string;
  selectedResourceHash?: string;
}

export interface AuroraVfxSourcePolicyTrace {
  version: "aurora-vfx-source-policy/v1";
  policyMode: "runtime-settings-vfx" | "missing-vfx-policy";
  runtimeSettingsRevision: number;
  includeModuleTemp0: boolean;
  includeModulePacked: boolean;
  includeHaks: boolean;
  includeVanilla: boolean;
  hakProfileId: string | null;
  effectiveHakPriorityList: string[];
  hakListHash: string;
  selectedSource?: AuroraVfxSelectedSourceTrace;
  lowerPrecedenceCandidates: AuroraVfxSourcePolicyCandidateTrace[];
  candidates: AuroraVfxSourcePolicyCandidateTrace[];
  vfxHakProvenance: AuroraVfxHakProvenance[];
  diagnostics: AuroraVfxSourcePolicyDiagnostic[];
  cacheKeyParts: AuroraVfxSourcePolicyCacheKeyParts;
}

export interface BuildAuroraVfxSourcePolicyTraceInput {
  settings: Partial<RuntimeSettingsRecord>;
  candidates?: AuroraVfxSourcePolicyCandidate[];
  selectedCandidateId?: string;
  selectedTableHash?: string;
  selectedResourceHash?: string;
}

const VFX_HAKS_TO_SURFACE = new Set(["lc_vfx.hak", "cep3_vfx.hak"]);

export function buildAuroraVfxSourcePolicyTrace(
  input: BuildAuroraVfxSourcePolicyTraceInput
): AuroraVfxSourcePolicyTrace {
  const diagnostics: AuroraVfxSourcePolicyDiagnostic[] = [];
  const runtimeSettingsRevision = Number.isInteger(input.settings.revision)
    ? Number(input.settings.revision)
    : 0;
  const vfxPolicy = readVfxPolicy(input.settings);

  if (!vfxPolicy) {
    diagnostics.push({
      code: "VFX_INTEGRATION_VFX_SOURCE_POLICY_REQUIRED",
      severity: "error",
      message:
        "Runtime settings must define sources.vfx before VFX source rows or resources are selected."
    });
  }

  const effectiveHakPriorityList = vfxPolicy
    ? resolveEffectiveVfxHakPriorityList(input.settings, vfxPolicy)
    : [];
  const hakListHash = hashStable({
    includeHaks: vfxPolicy?.includeHaks ?? false,
    hakProfileId: vfxPolicy?.hakProfileId.trim() ?? "",
    hakPriorityList: effectiveHakPriorityList
  });

  const candidates = normalizeCandidates(
    input.candidates ?? [],
    vfxPolicy,
    effectiveHakPriorityList
  );
  const selectedSource = selectCandidate(candidates, input.selectedCandidateId);
  if (vfxPolicy && candidates.length > 0 && !selectedSource) {
    diagnostics.push({
      code: "VFX_SOURCE_POLICY_SELECTION_UNRESOLVED",
      severity: "warn",
      message:
        "VFX source candidates were present, but none matched the enabled sources.vfx policy."
    });
  }

  const selectedTableHash =
    input.selectedTableHash ??
    selectedSource?.tableHash ??
    (selectedSource?.resourceKind === "table" ? selectedSource.sourceHash : undefined);
  const selectedResourceHash =
    input.selectedResourceHash ??
    selectedSource?.resourceHash ??
    (selectedSource?.resourceKind === "resource" ? selectedSource.sourceHash : undefined);

  const lowerPrecedenceCandidates = selectedSource
    ? candidates.filter((candidate) => candidate.precedenceRank > selectedSource.precedenceRank)
    : [];
  const vfxHakProvenance = buildVfxHakProvenance(
    effectiveHakPriorityList,
    selectedSource?.hakName
  );
  const policyHash = hashStable({
    includeModuleTemp0: vfxPolicy?.includeModuleTemp0 ?? false,
    includeModulePacked: vfxPolicy?.includeModulePacked ?? false,
    includeHaks: vfxPolicy?.includeHaks ?? false,
    includeVanilla: vfxPolicy?.includeVanilla ?? false,
    hakProfileId: vfxPolicy?.hakProfileId.trim() ?? "",
    effectiveHakPriorityList,
    selectedSource: selectedSource
      ? {
          layer: selectedSource.layer,
          resourceKind: selectedSource.resourceKind,
          resourceKey: selectedSource.resourceKey,
          hakName: selectedSource.hakName,
          sourceHash: selectedSource.sourceHash,
          tableHash: selectedTableHash,
          resourceHash: selectedResourceHash
        }
      : null,
    lowerPrecedenceCandidates: lowerPrecedenceCandidates.map((candidate) => ({
      layer: candidate.layer,
      resourceKind: candidate.resourceKind,
      resourceKey: candidate.resourceKey,
      hakName: candidate.hakName,
      sourceHash: candidate.sourceHash,
      tableHash: candidate.tableHash,
      resourceHash: candidate.resourceHash
    }))
  });

  const cacheKeyParts: AuroraVfxSourcePolicyCacheKeyParts = {
    version: "aurora-vfx-source-policy-cache/v1",
    runtimeSettingsRevision,
    hakListHash,
    policyHash,
    ...(selectedSource
      ? {
          selectedSourceLayer: selectedSource.layer,
          selectedResourceKey: selectedSource.resourceKey
        }
      : {}),
    ...(selectedTableHash ? { selectedTableHash } : {}),
    ...(selectedResourceHash ? { selectedResourceHash } : {})
  };

  return {
    version: "aurora-vfx-source-policy/v1",
    policyMode: vfxPolicy ? "runtime-settings-vfx" : "missing-vfx-policy",
    runtimeSettingsRevision,
    includeModuleTemp0: vfxPolicy?.includeModuleTemp0 ?? false,
    includeModulePacked: vfxPolicy?.includeModulePacked ?? false,
    includeHaks: vfxPolicy?.includeHaks ?? false,
    includeVanilla: vfxPolicy?.includeVanilla ?? false,
    hakProfileId: vfxPolicy?.hakProfileId.trim() || null,
    effectiveHakPriorityList,
    hakListHash,
    selectedSource: selectedSource
      ? {
          candidateId: selectedSource.candidateId,
          layer: selectedSource.layer,
          resourceKind: selectedSource.resourceKind,
          resourceKey: selectedSource.resourceKey,
          ...(selectedSource.sourcePath ? { sourcePath: selectedSource.sourcePath } : {}),
          ...(selectedSource.hakName ? { hakName: selectedSource.hakName } : {}),
          ...(selectedSource.sourceHash ? { sourceHash: selectedSource.sourceHash } : {}),
          ...(selectedTableHash ? { tableHash: selectedTableHash } : {}),
          ...(selectedResourceHash ? { resourceHash: selectedResourceHash } : {})
        }
      : undefined,
    lowerPrecedenceCandidates,
    candidates,
    vfxHakProvenance,
    diagnostics,
    cacheKeyParts
  };
}

export function buildAuroraVfxSourcePolicyCacheKey(
  parts: AuroraVfxSourcePolicyCacheKeyParts,
  outputKind = "source-policy"
): string {
  return hashStable({
    outputKind,
    ...parts
  });
}

function readVfxPolicy(
  settings: Partial<RuntimeSettingsRecord>
): RuntimeSourceSettings | null {
  const source = settings.sources?.vfx;
  if (!source || typeof source !== "object") {
    return null;
  }
  if (
    typeof source.includeModuleTemp0 !== "boolean" ||
    typeof source.includeModulePacked !== "boolean" ||
    typeof source.includeHaks !== "boolean" ||
    typeof source.includeVanilla !== "boolean" ||
    typeof source.hakProfileId !== "string" ||
    !Array.isArray(source.hakPriorityList)
  ) {
    return null;
  }
  return source;
}

function resolveEffectiveVfxHakPriorityList(
  settings: Partial<RuntimeSettingsRecord>,
  policy: RuntimeSourceSettings
): string[] {
  if (!policy.includeHaks) {
    return [];
  }
  if (policy.hakPriorityList.length > 0) {
    return deduplicateOrdered(policy.hakPriorityList);
  }
  const profileId = policy.hakProfileId.trim();
  if (!profileId) {
    return [];
  }
  return deduplicateOrdered(settings.hakProfiles?.[profileId] ?? []);
}

function normalizeCandidates(
  candidates: AuroraVfxSourcePolicyCandidate[],
  policy: RuntimeSourceSettings | null,
  hakPriorityList: string[]
): AuroraVfxSourcePolicyCandidateTrace[] {
  return candidates
    .map((candidate, index) => ({
      candidateId: candidate.candidateId ?? `${candidate.layer}:${candidate.resourceKey}:${index}`,
      layer: candidate.layer,
      resourceKind: candidate.resourceKind,
      resourceKey: candidate.resourceKey,
      ...(candidate.sourcePath ? { sourcePath: candidate.sourcePath } : {}),
      ...(candidate.hakName ? { hakName: candidate.hakName } : {}),
      ...(candidate.sourceHash ? { sourceHash: candidate.sourceHash } : {}),
      ...(candidate.tableHash ? { tableHash: candidate.tableHash } : {}),
      ...(candidate.resourceHash ? { resourceHash: candidate.resourceHash } : {}),
      precedenceRank: resolveCandidatePrecedenceRank(candidate, policy, hakPriorityList)
    }))
    .filter((candidate) => Number.isFinite(candidate.precedenceRank))
    .sort((left, right) => {
      const rankDelta = left.precedenceRank - right.precedenceRank;
      if (rankDelta !== 0) {
        return rankDelta;
      }
      return left.candidateId.localeCompare(right.candidateId);
    });
}

function selectCandidate(
  candidates: AuroraVfxSourcePolicyCandidateTrace[],
  selectedCandidateId: string | undefined
): AuroraVfxSourcePolicyCandidateTrace | undefined {
  if (selectedCandidateId) {
    return candidates.find((candidate) => candidate.candidateId === selectedCandidateId);
  }
  return candidates[0];
}

function resolveCandidatePrecedenceRank(
  candidate: AuroraVfxSourcePolicyCandidate,
  policy: RuntimeSourceSettings | null,
  hakPriorityList: string[]
): number {
  if (!policy) {
    return Number.POSITIVE_INFINITY;
  }
  if (
    candidate.layer === "module" &&
    (policy.includeModuleTemp0 || policy.includeModulePacked)
  ) {
    return 0;
  }
  if (candidate.layer === "hak" && policy.includeHaks) {
    const normalizedCandidateHak = normalizeHakName(candidate.hakName ?? "");
    const hakIndex = hakPriorityList
      .map(normalizeHakName)
      .findIndex((hakName) => hakName === normalizedCandidateHak);
    return 100 + (hakIndex >= 0 ? hakIndex : hakPriorityList.length + 100);
  }
  if (candidate.layer === "vanilla" && policy.includeVanilla) {
    return 300;
  }
  if (candidate.layer === "external_fixture") {
    return 400;
  }
  return Number.POSITIVE_INFINITY;
}

function buildVfxHakProvenance(
  hakPriorityList: string[],
  selectedHakName: string | undefined
): AuroraVfxHakProvenance[] {
  const normalizedSelectedHakName = normalizeHakName(selectedHakName ?? "");
  return hakPriorityList
    .map((hakName, index) => ({
      hakName,
      normalizedHakName: normalizeHakName(hakName),
      listIndex: index,
      selected: normalizeHakName(hakName) === normalizedSelectedHakName
    }))
    .filter((entry) => VFX_HAKS_TO_SURFACE.has(entry.normalizedHakName));
}

function normalizeHakName(value: string): string {
  const trimmed = value.trim().replace(/\\/gu, "/");
  const fileName = trimmed.split("/").pop() ?? trimmed;
  const lower = fileName.toLowerCase();
  if (!lower) {
    return "";
  }
  return lower.endsWith(".hak") ? lower : `${lower}.hak`;
}

function deduplicateOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = normalizeHakName(trimmed);
    if (!trimmed || seen.has(key)) {
      continue;
    }
    seen.add(key);
    ordered.push(trimmed);
  }
  return ordered;
}

function hashStable(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
}
