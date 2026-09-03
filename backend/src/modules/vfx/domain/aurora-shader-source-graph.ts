export interface AuroraShaderSourceRecord {
  resref: string;
  source: string;
  includeRefs: string[];
  sourceAssetId?: string;
  sourceObjectKey?: string;
}

export interface AuroraShaderProgramSourceBundle {
  version: "aurora-shader-program-source/v1";
  status: "complete" | "incomplete";
  stageRoots: {
    vertex?: string;
    fragment?: string;
    geometry?: string;
  };
  sources: AuroraShaderSourceRecord[];
  unresolvedRefs: string[];
}

export interface AuroraMaterialShaderParameter {
  name: string;
  kind: "float" | "int";
  values: number[];
  arity: 1 | 2 | 3 | 4;
}

export function extractAuroraShaderIncludeRefs(source: string): string[] {
  const refs = new Set<string>();
  const pattern = /^\s*#include\s+["<]([^">]+)[">]/gimu;
  for (const match of source.matchAll(pattern)) {
    const normalized = normalizeAuroraShaderResref(match[1]);
    if (normalized) {
      refs.add(normalized);
    }
  }
  return [...refs].sort((left, right) => left.localeCompare(right));
}

export function buildAuroraShaderProgramSourceBundle(input: {
  stageRoots: AuroraShaderProgramSourceBundle["stageRoots"];
  sources: AuroraShaderSourceRecord[];
}): AuroraShaderProgramSourceBundle {
  const vertex = normalizeAuroraShaderResref(input.stageRoots.vertex);
  const fragment = normalizeAuroraShaderResref(input.stageRoots.fragment);
  const geometry = normalizeAuroraShaderResref(input.stageRoots.geometry);
  const stageRoots: AuroraShaderProgramSourceBundle["stageRoots"] = {
    ...(vertex ? { vertex } : {}),
    ...(fragment ? { fragment } : {}),
    ...(geometry ? { geometry } : {})
  };
  const sourcesByResref = new Map<string, AuroraShaderSourceRecord>();
  for (const source of input.sources) {
    const resref = normalizeAuroraShaderResref(source.resref);
    if (!resref || sourcesByResref.has(resref)) {
      continue;
    }
    sourcesByResref.set(resref, {
      ...source,
      resref,
      includeRefs: extractAuroraShaderIncludeRefs(source.source)
    });
  }

  const pending = Object.values(stageRoots).filter((value): value is string => Boolean(value));
  const visited = new Set<string>();
  const unresolved = new Set<string>();
  while (pending.length > 0) {
    const resref = pending.shift();
    if (!resref || visited.has(resref)) {
      continue;
    }
    visited.add(resref);
    const source = sourcesByResref.get(resref);
    if (!source) {
      unresolved.add(resref);
      continue;
    }
    for (const includeRef of source.includeRefs) {
      if (!visited.has(includeRef)) {
        pending.push(includeRef);
      }
    }
  }

  const sources = [...visited]
    .map((resref) => sourcesByResref.get(resref))
    .filter((source): source is AuroraShaderSourceRecord => Boolean(source))
    .sort((left, right) => left.resref.localeCompare(right.resref));
  const unresolvedRefs = [...unresolved].sort((left, right) => left.localeCompare(right));
  return {
    version: "aurora-shader-program-source/v1",
    status: unresolvedRefs.length === 0 ? "complete" : "incomplete",
    stageRoots,
    sources,
    unresolvedRefs
  };
}

function normalizeAuroraShaderResref(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase().replace(/\.shd$/u, "") ?? "";
  return /^[a-z0-9_]+$/u.test(normalized) ? normalized : "";
}
