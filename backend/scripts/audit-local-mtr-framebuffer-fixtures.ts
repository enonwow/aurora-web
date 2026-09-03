import { createHash } from "node:crypto";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { NwnKeyBifResourceReader } from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { extractModuleIfoHakList } from "../src/modules/runtime-settings/application/runtime-settings.application.service";
import {
  buildNwnErfResourceIndexKey,
  readNwnErfResourceFromIndex,
  readNwnErfResourceIndex,
  type NwnErfResourceIndex
} from "../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import { extractAuroraShaderIncludeRefs } from "../src/modules/vfx/domain/aurora-shader-source-graph";

const MTR_RESOURCE_TYPE = 2072;
const SHADER_RESOURCE_TYPE = 2069;
const IFO_RESOURCE_TYPE = 2014;
const DEFAULT_NWN_ROOT =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights";
const DEFAULT_HAK_DIRECTORY = "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak";
const DEFAULT_MODULE_DIRECTORY = "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules";
const DEFAULT_ACTIVE_MODULE =
  "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\tlc_vfx_catalog_lab.mod";
const DEFAULT_OUTPUT =
  "docs/aurora-reverse/artifacts/vfx-material-framebuffer-2026-07-15/local-mtr-framebuffer-fixtures.json";

interface CliOptions {
  nwnRoot: string;
  activeModule: string;
  hakDirectory: string;
  moduleDirectory: string;
  output: string;
}

interface IndexedContainer {
  containerPath: string;
  containerKind: "hak" | "module";
  index: NwnErfResourceIndex;
}

interface ShaderSourceOccurrence {
  sourceKind: "hak" | "module" | "vanilla";
  sourcePath: string;
  resref: string;
  bytes: number;
  sha256: string;
  includeRefs: string[];
  source: string;
}

interface ShaderResourceAudit {
  resref: string;
  resolutionStatus:
    | "missing"
    | "source-priority-selected"
    | "content-identical"
    | "ambiguous-distinct-content";
  distinctSourceHashes: string[];
  occurrences: ShaderSourceOccurrence[];
  selectedSource: ShaderSourceOccurrence | null;
  selectedBy: "active-module" | "module-hak-priority" | "vanilla" | "content-equivalence" | null;
}

interface ShaderGraphAudit {
  roots: string[];
  status: "complete-source-selected" | "incomplete" | "ambiguous";
  reachableRefs: string[];
  unresolvedRefs: string[];
  ambiguousRefs: string[];
}

interface MaterialRecord {
  containerPath: string;
  containerKind: "hak" | "module";
  resref: string;
  bytes: number;
  sha256: string;
  sampleFramebuffer: number | null;
  volumetric: boolean | null;
  customShaderVS: string | null;
  customShaderFS: string | null;
  customShaderGS: string | null;
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const containerPaths = [
    ...(await collectContainers(options.hakDirectory, new Set([".hak"]))),
    ...(await collectContainers(options.moduleDirectory, new Set([".mod", ".erf"])))
  ].sort((left, right) => left.localeCompare(right));
  const materials: MaterialRecord[] = [];
  const indexedContainers: IndexedContainer[] = [];
  const failures: Array<{ containerPath: string; message: string }> = [];

  for (const containerPath of containerPaths) {
    try {
      const index = await readNwnErfResourceIndex(containerPath);
      if (!index) {
        failures.push({ containerPath, message: "unsupported-or-invalid-erf-index" });
        continue;
      }
      const containerKind = extname(containerPath).toLowerCase() === ".hak" ? "hak" : "module";
      indexedContainers.push({ containerPath, containerKind, index });
      for (const entry of index.values()) {
        if (entry.resourceType !== MTR_RESOURCE_TYPE) continue;
        const bytes = await readNwnErfResourceFromIndex(
          containerPath,
          index,
          entry.resref,
          MTR_RESOURCE_TYPE
        );
        if (!bytes) continue;
        const source = bytes.toString("utf8");
        materials.push({
          containerPath,
          containerKind,
          resref: entry.resref,
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          sampleFramebuffer: readIntegerDirective(source, "sample_framebuffer"),
          volumetric: readBooleanDirective(source, "volumetric"),
          customShaderVS: readStringDirective(source, "customshadervs", "custom_shader_vs"),
          customShaderFS: readStringDirective(source, "customshaderfs", "custom_shader_fs"),
          customShaderGS: readStringDirective(source, "customshadergs", "custom_shader_gs")
        });
      }
    } catch (error) {
      failures.push({
        containerPath,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  materials.sort((left, right) =>
    `${left.containerPath}|${left.resref}`.localeCompare(`${right.containerPath}|${right.resref}`)
  );
  const candidates = materials.filter(
    (material) =>
      (material.sampleFramebuffer !== null && material.sampleFramebuffer !== 0) ||
      material.volumetric === true
  );
  const nwnRoot = resolve(options.nwnRoot);
  const activeModulePath = resolve(options.activeModule);
  const activeModuleIndex = await readNwnErfResourceIndex(activeModulePath);
  const activeModuleIfo = activeModuleIndex
    ? await readNwnErfResourceFromIndex(
        activeModulePath,
        activeModuleIndex,
        "module",
        IFO_RESOURCE_TYPE
      )
    : null;
  const moduleHakPriority = activeModuleIfo ? extractModuleIfoHakList(activeModuleIfo) : [];
  const vanillaKeyPath = resolve(nwnRoot, "data", "nwn_base.key");
  const vanillaReader = await NwnKeyBifResourceReader.open(vanillaKeyPath, nwnRoot);
  const shaderRoots = deduplicateOrdered(
    candidates.flatMap((candidate) => [
      candidate.customShaderVS,
      candidate.customShaderFS,
      candidate.customShaderGS
    ]).filter((value): value is string => Boolean(value))
  );
  const shaderResources = await auditShaderResources(
    shaderRoots,
    indexedContainers,
    vanillaReader,
    vanillaKeyPath,
    activeModulePath,
    moduleHakPriority
  );
  const shaderResourcesByRef = new Map(
    shaderResources.map((resource) => [resource.resref, resource])
  );
  const shaderGraphs = deduplicateShaderRootSets(candidates).map((roots) =>
    buildShaderGraphAudit(roots, shaderResourcesByRef)
  );
  const payload = {
    version: "aurora-local-mtr-framebuffer-fixture-audit/v1",
    generatedAt: new Date().toISOString(),
    status:
      candidates.length === 0
        ? "no-source-candidate-found"
        : shaderGraphs.every((graph) => graph.status === "complete-source-selected")
          ? "source-candidates-and-priority-selected-shader-graphs-found"
          : "source-candidates-found-shader-graph-selection-open",
    sourcePolicy: {
      resourceType: MTR_RESOURCE_TYPE,
      shaderResourceType: SHADER_RESOURCE_TYPE,
      nwnRoot,
      vanillaKeyPath,
      activeModulePath,
      activeModuleIfoFound: Boolean(activeModuleIfo),
      moduleHakPriority,
      hakDirectory: resolve(options.hakDirectory),
      moduleDirectory: resolve(options.moduleDirectory),
      readOnly: true
    },
    counts: {
      containersScanned: containerPaths.length,
      materialsScanned: materials.length,
      candidates: candidates.length,
      failures: failures.length,
      shaderRoots: shaderRoots.length,
      shaderResources: shaderResources.length,
      shaderGraphs: shaderGraphs.length
    },
    candidates,
    shaderAudit: {
      selectionPolicy:
        "Shader source selection follows active module resources, then module.ifo HAK priority, then vanilla. Content equivalence is used only when an active module priority list is unavailable; unrelated local HAK/module copies never win by filename order.",
      roots: shaderRoots,
      resources: shaderResources,
      graphs: shaderGraphs
    },
    materials,
    failures
  };
  const outputPath = resolve(process.cwd(), options.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify({ output: options.output, status: payload.status, counts: payload.counts }, null, 2)}\n`
  );
}

async function auditShaderResources(
  roots: string[],
  indexedContainers: IndexedContainer[],
  vanillaReader: NwnKeyBifResourceReader,
  vanillaKeyPath: string,
  activeModulePath: string,
  moduleHakPriority: string[]
): Promise<ShaderResourceAudit[]> {
  const resources = new Map<string, ShaderResourceAudit>();
  const queue = [...roots];
  while (queue.length > 0) {
    const resref = normalizeResref(queue.shift());
    if (!resref || resources.has(resref)) continue;
    const occurrences = await readShaderOccurrences(
      resref,
      indexedContainers,
      vanillaReader,
      vanillaKeyPath
    );
    const distinctSourceHashes = deduplicateOrdered(
      occurrences.map((occurrence) => occurrence.sha256)
    );
    const prioritySelection = selectShaderSourceByPriority(
      occurrences,
      activeModulePath,
      moduleHakPriority
    );
    const resolutionStatus = prioritySelection
      ? "source-priority-selected"
      : occurrences.length === 0
        ? "missing"
        : moduleHakPriority.length === 0 && distinctSourceHashes.length === 1
          ? "content-identical"
          : "ambiguous-distinct-content";
    resources.set(resref, {
      resref,
      resolutionStatus,
      distinctSourceHashes,
      occurrences,
      selectedSource:
        prioritySelection?.source ?? (resolutionStatus === "content-identical" ? occurrences[0] : null),
      selectedBy:
        prioritySelection?.selectedBy ??
        (resolutionStatus === "content-identical" ? "content-equivalence" : null)
    });
    occurrences.forEach((occurrence) => queue.push(...occurrence.includeRefs));
  }
  return [...resources.values()].sort((left, right) => left.resref.localeCompare(right.resref));
}

function selectShaderSourceByPriority(
  occurrences: ShaderSourceOccurrence[],
  activeModulePath: string,
  moduleHakPriority: string[]
): {
  source: ShaderSourceOccurrence;
  selectedBy: "active-module" | "module-hak-priority" | "vanilla";
} | null {
  const normalizedActiveModule = resolve(activeModulePath).toLowerCase();
  const activeModule = occurrences.find(
    (occurrence) =>
      occurrence.sourceKind === "module" &&
      resolve(occurrence.sourcePath).toLowerCase() === normalizedActiveModule
  );
  if (activeModule) return { source: activeModule, selectedBy: "active-module" };
  for (const hakName of moduleHakPriority) {
    const normalizedHakName = normalizeHakName(hakName);
    const hakSource = occurrences.find(
      (occurrence) =>
        occurrence.sourceKind === "hak" &&
        normalizeHakName(occurrence.sourcePath) === normalizedHakName
    );
    if (hakSource) return { source: hakSource, selectedBy: "module-hak-priority" };
  }
  const vanilla = occurrences.find((occurrence) => occurrence.sourceKind === "vanilla");
  return vanilla ? { source: vanilla, selectedBy: "vanilla" } : null;
}

function normalizeHakName(value: string): string {
  return basename(value).trim().replace(/\.hak$/iu, "").toLowerCase();
}

async function readShaderOccurrences(
  resref: string,
  indexedContainers: IndexedContainer[],
  vanillaReader: NwnKeyBifResourceReader,
  vanillaKeyPath: string
): Promise<ShaderSourceOccurrence[]> {
  const occurrences: ShaderSourceOccurrence[] = [];
  const key = buildNwnErfResourceIndexKey(resref, SHADER_RESOURCE_TYPE);
  for (const container of indexedContainers) {
    if (!container.index.has(key)) continue;
    const bytes = await readNwnErfResourceFromIndex(
      container.containerPath,
      container.index,
      resref,
      SHADER_RESOURCE_TYPE
    );
    if (!bytes) continue;
    occurrences.push(toShaderSourceOccurrence(
      container.containerKind,
      container.containerPath,
      resref,
      bytes
    ));
  }
  const vanillaBytes = await vanillaReader.read(resref, SHADER_RESOURCE_TYPE);
  if (vanillaBytes) {
    occurrences.push(toShaderSourceOccurrence("vanilla", vanillaKeyPath, resref, vanillaBytes));
  }
  return occurrences.sort((left, right) =>
    `${left.sourceKind}|${left.sourcePath}`.localeCompare(`${right.sourceKind}|${right.sourcePath}`)
  );
}

function toShaderSourceOccurrence(
  sourceKind: ShaderSourceOccurrence["sourceKind"],
  sourcePath: string,
  resref: string,
  bytes: Buffer
): ShaderSourceOccurrence {
  const source = bytes.toString("utf8");
  return {
    sourceKind,
    sourcePath,
    resref,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    includeRefs: extractAuroraShaderIncludeRefs(source),
    source
  };
}

function deduplicateShaderRootSets(candidates: MaterialRecord[]): string[][] {
  const sets = new Map<string, string[]>();
  candidates.forEach((candidate) => {
    const roots = deduplicateOrdered([
      candidate.customShaderVS,
      candidate.customShaderFS,
      candidate.customShaderGS
    ].filter((value): value is string => Boolean(value)));
    if (roots.length > 0) sets.set(roots.join("|"), roots);
  });
  return [...sets.values()];
}

function buildShaderGraphAudit(
  roots: string[],
  resourcesByRef: ReadonlyMap<string, ShaderResourceAudit>
): ShaderGraphAudit {
  const reachable = new Set<string>();
  const unresolved = new Set<string>();
  const ambiguous = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const resref = normalizeResref(queue.shift());
    if (!resref || reachable.has(resref)) continue;
    reachable.add(resref);
    const resource = resourcesByRef.get(resref);
    if (!resource || resource.resolutionStatus === "missing") {
      unresolved.add(resref);
      continue;
    }
    if (resource.resolutionStatus === "ambiguous-distinct-content") {
      ambiguous.add(resref);
      resource.occurrences.forEach((occurrence) => queue.push(...occurrence.includeRefs));
      continue;
    }
    queue.push(...(resource.selectedSource?.includeRefs ?? []));
  }
  return {
    roots,
    status:
      unresolved.size > 0
        ? "incomplete"
        : ambiguous.size > 0
          ? "ambiguous"
          : "complete-source-selected",
    reachableRefs: [...reachable].sort(),
    unresolvedRefs: [...unresolved].sort(),
    ambiguousRefs: [...ambiguous].sort()
  };
}

function normalizeResref(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .pop()!
    .replace(/\.shd$/iu, "")
    .toLowerCase();
}

function deduplicateOrdered(values: string[]): string[] {
  return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
}

async function collectContainers(root: string, extensions: ReadonlySet<string>): Promise<string[]> {
  const resolvedRoot = resolve(root);
  try {
    if (!(await stat(resolvedRoot)).isDirectory()) return [];
  } catch {
    return [];
  }
  const results: string[] = [];
  const queue = [resolvedRoot];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(path);
      } else if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase())) {
        results.push(path);
      }
    }
  }
  return results;
}

function readIntegerDirective(source: string, key: string): number | null {
  const value = readStringDirective(source, key);
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readBooleanDirective(source: string, key: string): boolean | null {
  const value = readStringDirective(source, key)?.toLowerCase();
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

function readStringDirective(source: string, ...keys: string[]): string | null {
  for (const key of keys) {
    const match = source.match(new RegExp(`^\\s*${key}\\s+([^\\s;/]+)`, "imu"));
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function readCliOptions(args: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (key?.startsWith("--") && value && !value.startsWith("--")) {
      values.set(key, value);
      index += 1;
    }
  }
  return {
    nwnRoot: values.get("--nwn-root") ?? DEFAULT_NWN_ROOT,
    activeModule: values.get("--active-module") ?? DEFAULT_ACTIVE_MODULE,
    hakDirectory: values.get("--hak-dir") ?? DEFAULT_HAK_DIRECTORY,
    moduleDirectory: values.get("--module-dir") ?? DEFAULT_MODULE_DIRECTORY,
    output: values.get("--out") ?? DEFAULT_OUTPUT
  };
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
