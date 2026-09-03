import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  inspectAreaGitGicPair,
  mutateExistingAreaObjectsInGitGic,
} from "../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import { parseRawGffDocument } from "../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type {
  SupportedGffField,
} from "../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  isExactEffectivePortraitsTwoDaTable,
  parseEffectivePortraitsTwoDa,
} from "../src/modules/catalog/domain/effective-portraits-two-da";
import {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES,
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { extractModuleIfoHakList } from "../src/modules/runtime-settings/application/runtime-settings.application.service";
import {
  buildNwnErfV10,
  parseNwnErfV10,
  type NwnErfResourceEntry,
} from "../src/modules/runtime-settings/domain/nwn-erf-v10";

const BACKEND_ROOT = resolve(__dirname, "..");
const MODULES_DIR = resolve(
  process.env.USERPROFILE ?? "",
  "Documents",
  "Neverwinter Nights",
  "modules",
);
const HAK_DIR = resolve(
  process.env.USERPROFILE ?? "",
  "Documents",
  "Neverwinter Nights",
  "hak",
);
const DEFAULT_RETAIL_ROOT = resolve(
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights",
);
const RESOURCE_TYPES = Object.freeze({ are: 2012, ifo: 2014, git: 2023, gic: 2046 });
const SOURCE_PROFILE_ID = "effective-catalog-utp-placeable-copy-v1";
type SupportedGffStruct = Extract<SupportedGffField, { type: "list" }>["value"][number];
type ObjectPairCounts = Readonly<{
  creature: number;
  door: number;
  encounter: number;
  item: number;
  placeable: number;
  sound: number;
  store: number;
  trigger: number;
  waypoint: number;
}>;

interface CliOptions {
  readonly sourceManifestPath: string;
  readonly outputModulePath: string;
  readonly candidateManifestPath: string;
  readonly profilePath: string;
  readonly retailRoot: string;
  readonly keyPath: string;
  readonly templateId: string;
  readonly templateResRef: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

interface AreaCreateCandidateManifest {
  schemaVersion: string;
  status: string;
  command?: {
    area?: { resRef?: string; name?: string };
    dimensions?: { width?: number; height?: number };
  };
  source?: { orderedHaks?: Array<{ resref?: string; path?: string; sha256?: string }> };
  output?: {
    module?: { path?: string; sha256?: string };
    exactCandidateReadback?: boolean;
  };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  assertSafeOutputPaths(options);
  await requireFile(options.sourceManifestPath, "source Area Create candidate manifest");
  await requireFile(options.keyPath, "retail nwn_base.key");

  const sourceManifestBytes = await readFile(options.sourceManifestPath);
  const sourceManifest = JSON.parse(sourceManifestBytes.toString("utf8")) as AreaCreateCandidateManifest;
  const areaResRef = requireAreaCreateCandidateManifest(sourceManifest);
  const sourceModulePath = resolve(sourceManifest.output!.module!.path!);
  const sourceModuleBytes = await readFile(sourceModulePath);
  if (sha256(sourceModuleBytes) !== sourceManifest.output!.module!.sha256) {
    throw new Error("dynamic_placeable_source_module_hash_mismatch");
  }

  const sourceArchive = parseNwnErfV10(sourceModuleBytes, sourceModulePath);
  if (sourceArchive.signature !== "MOD ") {
    throw new Error("dynamic_placeable_source_module_signature_invalid");
  }
  const sourceGit = requireResource(sourceArchive.entries, areaResRef, RESOURCE_TYPES.git);
  const sourceGic = requireResource(sourceArchive.entries, areaResRef, RESOURCE_TYPES.gic);
  requireResource(sourceArchive.entries, areaResRef, RESOURCE_TYPES.are);
  requireResource(sourceArchive.entries, "module", RESOURCE_TYPES.ifo);
  const sourceInspection = inspectAreaGitGicPair(sourceGit.bytes, sourceGic.bytes);
  if (sourceInspection.total !== 0) {
    throw new Error("dynamic_placeable_source_area_must_be_empty");
  }

  const retailReader = await NwnKeyBifResourceReader.open(options.keyPath, options.retailRoot);
  const blueprintBytes = await retailReader.read(
    options.templateResRef,
    NWN_KEY_BIF_RESOURCE_TYPES.UTP,
  );
  if (!blueprintBytes) {
    throw new Error(`dynamic_placeable_retail_utp_missing:${options.templateResRef}`);
  }
  const blueprint = inspectDynamicBlueprint(blueprintBytes, options.templateResRef);
  const portraitsBytes = await retailReader.read("portraits", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
  if (!portraitsBytes) {
    throw new Error("dynamic_placeable_retail_portraits_two_da_missing");
  }
  const portraits = parseEffectivePortraitsTwoDa({
    bytes: portraitsBytes,
    sourceObjectKey: "modules/current/__aurora/sources/vanilla/portraits.2da",
    sourceLayer: "vanilla",
  });
  if (!isExactEffectivePortraitsTwoDaTable(portraits)) {
    throw new Error("dynamic_placeable_retail_portraits_two_da_invalid");
  }
  const resolvedPortraitId = resolvePortraitId(blueprint.document.fields, portraits.rows);
  const sourceObjectKey =
    `modules/current/__aurora/sources/vanilla/templates/${options.templateResRef}.utp`;
  const sourceSha256 = sha256(blueprintBytes);

  const mutation = mutateExistingAreaObjectsInGitGic({
    sourceGit: Buffer.from(sourceGit.bytes),
    sourceGic: Buffer.from(sourceGic.bytes),
    deletions: [],
    additions: [{
      kind: "placeable",
      localObjectId: "native-proof-dynamic-placeable-0",
      sourceProfileId: SOURCE_PROFILE_ID,
      sourceObjectKey,
      templateResRef: options.templateResRef,
      resRef: options.templateResRef,
      tag: blueprint.tag,
      sourceSha256,
      resolvedPortraitId,
      blueprintBytes: Buffer.from(blueprintBytes),
      x: options.x,
      y: options.y,
      z: options.z,
      bearing: options.bearing,
    }],
  });
  assertExactSinglePlaceableCounts(mutation.candidate.counts);

  const outputEntries = sourceArchive.entries.map((entry) => {
    if (entry.resref === areaResRef && entry.type === RESOURCE_TYPES.git) {
      return { ...entry, bytes: Buffer.from(mutation.gitBytes) };
    }
    if (entry.resref === areaResRef && entry.type === RESOURCE_TYPES.gic) {
      return { ...entry, bytes: Buffer.from(mutation.gicBytes) };
    }
    return { ...entry, bytes: Buffer.from(entry.bytes) };
  });
  const outputModuleBytes = buildNwnErfV10({
    header: sourceArchive.header,
    localizedStrings: sourceArchive.localizedStrings,
    entries: outputEntries,
  });
  await mkdir(dirname(options.outputModulePath), { recursive: true });
  await writeFile(options.outputModulePath, outputModuleBytes, { flag: "wx" });

  const readbackModuleBytes = await readFile(options.outputModulePath);
  const readbackArchive = parseNwnErfV10(readbackModuleBytes, options.outputModulePath);
  assertUntargetedResourcesPreserved(sourceArchive.entries, readbackArchive.entries, areaResRef);
  const readbackGit = requireResource(readbackArchive.entries, areaResRef, RESOURCE_TYPES.git).bytes;
  const readbackGic = requireResource(readbackArchive.entries, areaResRef, RESOURCE_TYPES.gic).bytes;
  if (!readbackGit.equals(mutation.gitBytes) || !readbackGic.equals(mutation.gicBytes)) {
    throw new Error("dynamic_placeable_packed_pair_exact_readback_mismatch");
  }
  assertExactSinglePlaceableCounts(inspectAreaGitGicPair(readbackGit, readbackGic).counts);
  const packedFixture = inspectPackedFixture(
    readbackGit,
    readbackGic,
    options.templateResRef,
    blueprint.tag,
    resolvedPortraitId,
    blueprint.comment,
  );
  const sourceModuleAfter = await readFile(sourceModulePath);
  if (!sourceModuleAfter.equals(sourceModuleBytes)) {
    throw new Error("dynamic_placeable_source_module_changed");
  }

  const actualHakResrefs = extractModuleIfoHakList(
    requireResource(readbackArchive.entries, "module", RESOURCE_TYPES.ifo).bytes,
  ).map((value) => String(value).toLowerCase());
  const declaredHaks = sourceManifest.source?.orderedHaks ?? [];
  if (
    actualHakResrefs.length === 0
    || JSON.stringify(actualHakResrefs) !==
      JSON.stringify(declaredHaks.map((hak) => String(hak.resref ?? "").toLowerCase()))
  ) {
    throw new Error("dynamic_placeable_ordered_hak_binding_invalid");
  }
  const orderedHakList = await Promise.all(actualHakResrefs.map(async (resref, index) => {
    const declared = declaredHaks[index];
    const path = resolve(declared?.path ?? resolve(HAK_DIR, `${resref}.hak`));
    const bytes = await readFile(path);
    const digest = sha256(bytes);
    if (declared?.sha256 !== digest) {
      throw new Error(`dynamic_placeable_ordered_hak_hash_mismatch:${resref}`);
    }
    return { resref, path, sha256: digest };
  }));
  const entryPoint = readModuleEntryPoint(options.outputModulePath);
  const dimensions = sourceManifest.command?.dimensions;
  const width = Number(dimensions?.width);
  const height = Number(dimensions?.height);
  if (
    !Number.isInteger(width)
    || !Number.isInteger(height)
    || width < 1
    || height < 1
  ) {
    throw new Error("dynamic_placeable_source_area_dimensions_invalid");
  }

  const moduleRecord = await fileRecord(options.outputModulePath, readbackModuleBytes);
  const generatedAt = new Date().toISOString();
  const expectedObjectCounts = {
    placeables: 1,
    doors: 0,
    creatures: 0,
    encounters: 0,
    items: 0,
    sounds: 0,
    stores: 0,
    triggers: 0,
    waypoints: 0,
    total: 1,
  };
  const fixture = {
    ordinal: 0,
    sourceProfileId: SOURCE_PROFILE_ID,
    templateId: options.templateId,
    templateResRef: options.templateResRef,
    sourceObjectKey,
    sourceSha256,
    sourceFileType: "UTP ",
    sourceFileVersion: "V3.2",
    sourceStructTypeId: 0xffffffff,
    tag: blueprint.tag,
    resolvedPortraitId,
    position: packedFixture.position,
    bearing: packedFixture.bearing,
    gicComment: blueprint.comment,
  };
  const profile = {
    version: "aurora-toolset-binary-dynamic-placeable-profile/v1",
    id: `${basename(options.outputModulePath, ".mod")}:${areaResRef}:${options.templateResRef}`,
    proofKind: "dynamic-placeable-catalog-copy",
    module: {
      resref: basename(options.outputModulePath, ".mod"),
      path: options.outputModulePath,
      sha256: moduleRecord.sha256,
    },
    area: {
      resref: areaResRef,
      displayName: String(sourceManifest.command?.area?.name ?? areaResRef),
      width,
      height,
    },
    entryPoint,
    orderedHakList,
    fixtures: [{
      id: "dynamic-placeable-0",
      kind: "placeable",
      templateResRef: options.templateResRef,
      position: packedFixture.position,
    }],
    fixture,
    toolsetCapture: {
      targetClass: "TScrollBox",
      areaResRef,
      objectKind: "placeable",
      objectOrdinal: 0,
      templateResRef: options.templateResRef,
      artifactDirectory: resolve(
        BACKEND_ROOT,
        "docs",
        "aurora-reverse",
        "evidence",
        "area-dynamic-placeable-native-proof-2026-08-19",
        "native",
      ),
      viewportArtifact: "viewport.png",
      resultArtifact: "viewport.capture.json",
    },
    git: { expectedObjectCounts },
    gic: { required: true, expectedComment: blueprint.comment },
    provenance: {
      candidateManifest: options.candidateManifestPath,
      sourceAreaCreateCandidateManifest: {
        path: options.sourceManifestPath,
        sha256: sha256(sourceManifestBytes),
      },
      retailKey: await fileRecord(options.keyPath, await readFile(options.keyPath)),
      portraitTable: portraits.descriptor,
      exactCurrentPairWriter: true,
    },
    noLocalToolsetAdapter: true,
  };
  const candidateManifest = {
    schemaVersion: "aurora-area-dynamic-placeable-native-proof-module.v1",
    generatedAt,
    status: "candidate-built-awaiting-live-certification",
    safety: {
      sourceModuleReadOnly: true,
      sourceModuleBytesUnchanged: true,
      outputCreatedExclusively: true,
    },
    claimBoundary: {
      exactRetailBlueprint: true,
      exactCurrentPairWriter: true,
      exactCandidateReadback: true,
      toolsetOpenSaveReopen: "missing",
      nwnRuntimeLoad: "missing",
      hakPrecedence: "not-claimed",
    },
    source: {
      areaCreateCandidateManifest: {
        path: options.sourceManifestPath,
        sha256: sha256(sourceManifestBytes),
      },
      module: await fileRecord(sourceModulePath, sourceModuleBytes),
      retailKey: profile.provenance.retailKey,
      blueprint: {
        resref: options.templateResRef,
        bytes: blueprintBytes.length,
        sha256: sourceSha256,
        sourceObjectKey,
      },
      portraitsTwoDa: portraits.descriptor,
      orderedHakList,
    },
    mutation: {
      sourceCounts: sourceInspection.counts,
      candidateCounts: mutation.candidate.counts,
      addedCounts: mutation.addedCounts,
      fixture,
      sourceGitSha256: sha256(sourceGit.bytes),
      sourceGicSha256: sha256(sourceGic.bytes),
      candidateGitSha256: sha256(readbackGit),
      candidateGicSha256: sha256(readbackGic),
    },
    output: {
      module: moduleRecord,
      exactCandidateReadback: true,
      untargetedResourcesByteIdentical: true,
      profile: options.profilePath,
    },
  };

  await mkdir(dirname(options.candidateManifestPath), { recursive: true });
  await writeFile(
    options.candidateManifestPath,
    `${JSON.stringify(candidateManifest, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  await writeFile(options.profilePath, `${JSON.stringify(profile, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    status: candidateManifest.status,
    outputModulePath: options.outputModulePath,
    candidateManifestPath: options.candidateManifestPath,
    profilePath: options.profilePath,
    areaResRef,
    fixture,
    outputSha256: moduleRecord.sha256,
  }, null, 2)}\n`);
}

function parseOptions(args: readonly string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error("Arguments must be supplied as --name value pairs.");
    }
    values.set(key.slice(2), value);
  }
  const sourceManifestPath = requiredPath(values.get("source-manifest"), "--source-manifest");
  const outputModulePath = requiredPath(values.get("output"), "--output");
  const stamp = basename(outputModulePath, ".mod");
  const evidenceDir = resolve(
    BACKEND_ROOT,
    "docs",
    "aurora-reverse",
    "evidence",
    "area-dynamic-placeable-native-proof-2026-08-19",
  );
  const retailRoot = resolve(values.get("retail-root") ?? DEFAULT_RETAIL_ROOT);
  return {
    sourceManifestPath,
    outputModulePath,
    candidateManifestPath: resolve(values.get("manifest") ?? resolve(evidenceDir, `${stamp}.candidate.json`)),
    profilePath: resolve(values.get("profile") ?? resolve(evidenceDir, `${stamp}.profile.json`)),
    retailRoot,
    keyPath: resolve(values.get("key") ?? resolve(retailRoot, "data", "nwn_base.key")),
    templateId: values.get("template-id") ?? "plc_plc_watertrough",
    templateResRef: values.get("template-resref") ?? "plc_watertrough",
    x: finiteNumber(values.get("x") ?? "1", "--x"),
    y: finiteNumber(values.get("y") ?? "1", "--y"),
    z: finiteNumber(values.get("z") ?? "0", "--z"),
    bearing: finiteNumber(values.get("bearing") ?? "0", "--bearing"),
  };
}

function assertSafeOutputPaths(options: CliOptions): void {
  if (dirname(options.outputModulePath).toLowerCase() !== MODULES_DIR.toLowerCase()) {
    throw new Error(`Dynamic Placeable proof output must stay directly in ${MODULES_DIR}.`);
  }
  const moduleResRef = basename(options.outputModulePath, ".mod");
  if (!/^aw_dp_proof_[a-z0-9_]{1,20}$/u.test(moduleResRef) || moduleResRef.length > 32) {
    throw new Error("Dynamic Placeable proof module ResRef must use the aw_dp_proof_ prefix.");
  }
  if (
    existsSync(options.outputModulePath)
    || existsSync(options.candidateManifestPath)
    || existsSync(options.profilePath)
  ) {
    throw new Error("Dynamic Placeable proof output already exists; choose a fresh identity.");
  }
  if (!/^[a-z0-9_]{1,64}$/u.test(options.templateId)) {
    throw new Error("Dynamic Placeable templateId is invalid.");
  }
  if (!/^[a-z0-9_]{1,16}$/u.test(options.templateResRef)) {
    throw new Error("Dynamic Placeable TemplateResRef is invalid.");
  }
}

function requireAreaCreateCandidateManifest(manifest: AreaCreateCandidateManifest): string {
  const areaResRef = manifest.command?.area?.resRef;
  if (
    manifest.schemaVersion !== "aurora-area-create-native-proof-module.v1"
    || manifest.status !== "candidate-built-awaiting-live-certification"
    || manifest.output?.exactCandidateReadback !== true
    || typeof manifest.output?.module?.path !== "string"
    || !sha256Value(manifest.output?.module?.sha256)
    || typeof areaResRef !== "string"
    || !/^[a-z0-9_]{1,16}$/u.test(areaResRef)
  ) {
    throw new Error("dynamic_placeable_source_area_create_manifest_invalid");
  }
  return areaResRef;
}

function inspectDynamicBlueprint(bytes: Buffer, templateResRef: string) {
  const document = parseRawGffDocument(bytes);
  if (
    !document
    || document.fileType !== "UTP "
    || document.fileVersion !== "V3.2"
    || document.rootStructTypeId !== 0xffffffff
  ) {
    throw new Error("dynamic_placeable_retail_utp_identity_invalid");
  }
  const nativeTemplate = requireTypedField(document.fields, "TemplateResRef", "resref").value;
  const tag = requireTypedField(document.fields, "Tag", "cexostring").value;
  const comment = requireTypedField(document.fields, "Comment", "cexostring").value;
  if (nativeTemplate !== templateResRef || tag.length === 0) {
    throw new Error("dynamic_placeable_retail_utp_identity_mismatch");
  }
  return { document, tag, comment };
}

function resolvePortraitId(
  fields: readonly SupportedGffField[],
  rows: readonly { rowIndex: number; baseResRef: string }[],
): number {
  const direct = fields.filter((field) => field.label === "PortraitId");
  const legacy = fields.filter((field) => field.label === "Portrait");
  if (direct.length + legacy.length !== 1) {
    throw new Error("dynamic_placeable_portrait_identity_ambiguous");
  }
  if (direct.length === 1) {
    const field = requireTypedField(fields, "PortraitId", "word");
    if (!Number.isInteger(field.value) || field.value < 0 || field.value > 0xffff) {
      throw new Error("dynamic_placeable_portrait_id_invalid");
    }
    return field.value;
  }
  const value = requireTypedField(fields, "Portrait", "resref").value;
  if (!/^po_[A-Za-z0-9_]{1,13}$/u.test(value)) {
    throw new Error("dynamic_placeable_legacy_portrait_invalid");
  }
  const matches = rows.filter((row) => row.baseResRef === value.slice(3).toLowerCase());
  if (matches.length !== 1 || matches[0]!.rowIndex > 0xffff) {
    throw new Error("dynamic_placeable_legacy_portrait_row_not_unique");
  }
  return matches[0]!.rowIndex;
}

function inspectPackedFixture(
  gitBytes: Buffer,
  gicBytes: Buffer,
  templateResRef: string,
  tag: string,
  portraitId: number,
  comment: string,
) {
  const git = parseRawGffDocument(gitBytes);
  const gic = parseRawGffDocument(gicBytes);
  if (git?.fileType !== "GIT " || gic?.fileType !== "GIC ") {
    throw new Error("dynamic_placeable_packed_pair_identity_invalid");
  }
  const gitList = requireTypedField(git.fields, "Placeable List", "list");
  const gicList = requireTypedField(gic.fields, "Placeable List", "list");
  if (gitList.value.length !== 1 || gicList.value.length !== 1) {
    throw new Error("dynamic_placeable_packed_pair_cardinality_invalid");
  }
  const gitPlaceable = requireStructType(gitList.value[0], 9, "GIT");
  const gicPlaceable = requireStructType(gicList.value[0], 9, "GIC");
  if (
    requireTypedField(gitPlaceable.fields, "TemplateResRef", "resref").value !== templateResRef
    || requireTypedField(gitPlaceable.fields, "Tag", "cexostring").value !== tag
    || requireTypedField(gitPlaceable.fields, "PortraitId", "word").value !== portraitId
    || requireTypedField(gicPlaceable.fields, "Comment", "cexostring").value !== comment
  ) {
    throw new Error("dynamic_placeable_packed_fixture_readback_mismatch");
  }
  return {
    position: [
      requireTypedField(gitPlaceable.fields, "X", "float").value,
      requireTypedField(gitPlaceable.fields, "Y", "float").value,
      requireTypedField(gitPlaceable.fields, "Z", "float").value,
    ],
    bearing: requireTypedField(gitPlaceable.fields, "Bearing", "float").value,
  };
}

function requireTypedField<T extends SupportedGffField["type"]>(
  fields: readonly SupportedGffField[],
  label: string,
  type: T,
): Extract<SupportedGffField, { type: T }> {
  const matches = fields.filter((field) => field.label === label);
  if (matches.length !== 1 || matches[0]!.type !== type) {
    throw new Error(`dynamic_placeable_exact_field_invalid:${label}:${type}`);
  }
  return matches[0] as Extract<SupportedGffField, { type: T }>;
}

function requireStructType(
  value: SupportedGffStruct | undefined,
  typeId: number,
  label: string,
): SupportedGffStruct {
  if (!value || value.typeId !== typeId) {
    throw new Error(`dynamic_placeable_${label.toLowerCase()}_struct_type_invalid`);
  }
  return value;
}

function assertExactSinglePlaceableCounts(counts: ObjectPairCounts): void {
  if (
    counts.placeable !== 1
    || counts.creature !== 0
    || counts.door !== 0
    || counts.encounter !== 0
    || counts.item !== 0
    || counts.sound !== 0
    || counts.store !== 0
    || counts.trigger !== 0
    || counts.waypoint !== 0
  ) {
    throw new Error(`dynamic_placeable_candidate_counts_invalid:${JSON.stringify(counts)}`);
  }
}

function assertUntargetedResourcesPreserved(
  source: readonly NwnErfResourceEntry[],
  candidate: readonly NwnErfResourceEntry[],
  areaResRef: string,
): void {
  if (source.length !== candidate.length) {
    throw new Error("dynamic_placeable_module_resource_count_changed");
  }
  for (const entry of source) {
    const retained = candidate.find(
      (value) => value.resref === entry.resref && value.type === entry.type,
    );
    if (!retained) {
      throw new Error(`dynamic_placeable_module_resource_missing:${entry.resref}:${entry.type}`);
    }
    const targeted = entry.resref === areaResRef &&
      (entry.type === RESOURCE_TYPES.git || entry.type === RESOURCE_TYPES.gic);
    if (!targeted && !retained.bytes.equals(entry.bytes)) {
      throw new Error(`dynamic_placeable_untargeted_resource_changed:${entry.resref}:${entry.type}`);
    }
  }
}

function readModuleEntryPoint(modulePath: string) {
  const output = execFileSync(process.execPath, [
    resolve(BACKEND_ROOT, "scripts", "read-aurora-toolset-bootstrap-entry-readback.mjs"),
    "--module",
    modulePath,
  ], { encoding: "utf8", windowsHide: true, timeout: 60_000 });
  const parsed = JSON.parse(output) as { area?: string; position?: number[] };
  if (typeof parsed.area !== "string" || !Array.isArray(parsed.position) ||
    parsed.position.length !== 3 || !parsed.position.every(Number.isFinite)) {
    throw new Error("dynamic_placeable_module_entry_readback_invalid");
  }
  return { area: parsed.area, position: parsed.position };
}

function requireResource(
  entries: readonly NwnErfResourceEntry[],
  resref: string,
  type: number,
): NwnErfResourceEntry {
  const matches = entries.filter((entry) => entry.resref === resref && entry.type === type);
  if (matches.length !== 1) {
    throw new Error(`dynamic_placeable_required_resource_invalid:${resref}:${type}`);
  }
  return matches[0]!;
}

async function requireFile(path: string, label: string): Promise<void> {
  const details = await stat(path).catch(() => null);
  if (!details?.isFile() || details.size === 0) {
    throw new Error(`Required ${label} is missing or empty: ${path}.`);
  }
}

async function fileRecord(path: string, bytes: Uint8Array) {
  const details = await stat(path);
  return {
    path: resolve(path),
    bytes: details.size,
    sha256: sha256(bytes),
    lastModified: details.mtime.toISOString(),
  };
}

function finiteNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid finite number: ${label}.`);
  return parsed;
}

function requiredPath(value: string | undefined, label: string): string {
  if (!value) throw new Error(`Missing required path: ${label}.`);
  return resolve(value);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Value(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
