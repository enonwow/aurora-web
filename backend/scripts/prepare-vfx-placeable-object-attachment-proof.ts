import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import {
  buildNwnErfResourceIndexKey,
  readNwnErfResourceFromIndex,
  readNwnErfResourceIndex,
  readNwnErfResource
} from "../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import {
  extractModuleIfoHakList
} from "../src/modules/runtime-settings/application/runtime-settings.application.service";
import {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import {
  parsePlaceablesTwoDaRows
} from "../src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository";
import {
  VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE,
  buildVfxPlaceableObjectAttachmentProofManifest,
  buildVfxPlaceableObjectAttachmentProofUtp,
  type ProofSceneActor
} from "./support/vfx-placeable-object-attachment-proof-profile";
import {
  convertAuroraMdlToGlb
} from "../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";

const repoRoot = resolve(__dirname, "../..");
const nwnRoot = resolve(
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights"
);
const nwnUserRoot = resolve(
  process.env.USERPROFILE ?? "C:/Users/enonw",
  "Documents/Neverwinter Nights"
);
const hakRoot = resolve(nwnUserRoot, "hak");
const sourceModule = resolve(
  VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceModule.path
);
const sourceFixtureRoot = resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-broad-row50"
);
const sourceActorFixtureRoot = resolve(
  repoRoot,
  `frontend/public/dev-fixtures/${VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.sourceActor.fixtureId}`
);
const destinationFixtureRoot = resolve(
  repoRoot,
  `frontend/public/dev-fixtures/${VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.fixtureId}`
);
const evidenceRoot = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/evidence/vfx-placeable-object-attachment-row50/profile-v2"
);
const profilePath = resolve(evidenceRoot, "proof-profile.json");
const utpPath = resolve(evidenceRoot, "vfxplcproof.utp");
const exactBicPath = resolve(nwnUserRoot, "localvault/avriemail461.bic");
const nwnExecutable = resolve(nwnRoot, "bin/win32/nwmain.exe");

const expectedTextureProfiles = new Map([
  [
    "plx_wood02.dds",
    {
      sha256: "ed7bcd423e6e3cf745d18a70c44f75f5986a7c0e15ad65955f658b4d9fd78575"
    }
  ],
  [
    "twc03_lance2.tga",
    {
      sha256: "8aae9a7bd16f6d8075c99e51a362bd20b4c3a40d72310232af9fac246695ac5a"
    }
  ]
]);

async function main(): Promise<void> {
  const [
    moduleBytes,
    ifoBytes,
    areBytes,
    gitBytes,
    baseManifestBytes,
    sourceActorManifestBytes,
    exactBicBytes
  ] = await Promise.all([
    readFile(sourceModule),
    requireErfResource(sourceModule, "module", 2014),
    requireErfResource(
      sourceModule,
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceArea,
      2012
    ),
    requireErfResource(
      sourceModule,
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceArea,
      2023
    ),
    readFile(resolve(sourceFixtureRoot, "manifest.json")),
    readFile(resolve(sourceActorFixtureRoot, "manifest.json")),
    readFile(exactBicPath)
  ]);
  assertHash(
    moduleBytes,
    VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceModule.sha256,
    "source module"
  );

  const orderedHakNames = extractModuleIfoHakList(ifoBytes);
  assertOrderedHakPresent(orderedHakNames, "witcher2");
  assertOrderedHakPresent(orderedHakNames, "q_placeables");
  const orderedHakSources = await Promise.all(
    orderedHakNames.map(async (name, index) => {
      const path = resolve(hakRoot, `${name}.hak`);
      const bytes = await readFile(path);
      const resourceIndex = await readNwnErfResourceIndex(path);
      if (!resourceIndex) {
        throw new Error(`Could not index ordered HAK ${index}:${name}.`);
      }
      return {
        index,
        name,
        path,
        sizeBytes: bytes.length,
        sha256: sha256(bytes),
        resourceIndex
      };
    })
  );
  const orderedHaks = orderedHakSources.map(
    ({ resourceIndex: _resourceIndex, ...hak }) => hak
  );
  const placeablesTableCandidates = [];
  for (const hak of orderedHakSources) {
    if (!hak.resourceIndex.has(buildNwnErfResourceIndexKey("placeables", 2017))) {
      continue;
    }
    const bytes = await requireIndexedErfResource(hak, "placeables", 2017);
    placeablesTableCandidates.push({
      hakIndex: hak.index,
      hakName: hak.name,
      sourcePath: `${hak.path}::placeables.2da`,
      sizeBytes: bytes.length,
      sha256: sha256(bytes),
      rowCount: parsePlaceablesTwoDaRows(bytes).length,
      bytes
    });
  }
  const selectedPlaceablesTable = placeablesTableCandidates.at(-1);
  if (
    !selectedPlaceablesTable ||
    selectedPlaceablesTable.hakIndex !==
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.placeablesTwoDa.hakIndex ||
    selectedPlaceablesTable.hakName !==
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.placeablesTwoDa.hakName
  ) {
    throw new Error("Reverse ordered-HAK placeables.2da winner changed from the profile.");
  }
  const placeablesTwoDa = selectedPlaceablesTable.bytes;
  assertHash(
    placeablesTwoDa,
    VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.placeablesTwoDa.sha256,
    `${selectedPlaceablesTable.hakName}/placeables.2da`
  );
  const selectedRow = parsePlaceablesTwoDaRows(placeablesTwoDa).find(
    (row) =>
      row.rowId ===
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.appearanceRowId
  );
  if (
    !selectedRow ||
    selectedRow.modelResRef !==
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.modelResRef ||
    selectedRow.label !==
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.appearanceLabel
  ) {
    throw new Error("Selected placeables.2da target row changed from the proof profile.");
  }

  const selectedModelSource = [...orderedHakSources]
    .reverse()
    .find((hak) =>
      hak.resourceIndex.has(
        buildNwnErfResourceIndexKey(
          VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.modelResRef,
          2002
        )
      )
    );
  if (
    !selectedModelSource ||
    selectedModelSource.index !==
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.model.hakIndex ||
    selectedModelSource.name !==
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.model.hakName
  ) {
    throw new Error("Reverse ordered-HAK target model winner changed from the profile.");
  }
  const modelMdl = await requireIndexedErfResource(
    selectedModelSource,
    VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.modelResRef,
    2002
  );
  assertHash(
    modelMdl,
    VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.model.sha256,
    `${selectedModelSource.name}/${VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.modelResRef}.mdl`
  );
  const glbBytes = convertAuroraMdlToGlb(modelMdl).bytes;
  assertHash(
    glbBytes,
    VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.glb.sha256,
    `derived ${VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.modelResRef}.glb`
  );
  const glbAudit = inspectTargetGlb(glbBytes);

  const baseReader = await NwnKeyBifResourceReader.open(
    resolve(nwnRoot, "data/nwn_base.key"),
    nwnRoot
  );
  const admittedRetailUtp = await requireKeyBifResource(
    baseReader,
    "plc_chest1",
    NWN_KEY_BIF_RESOURCE_TYPES.UTP
  );
  assertHash(
    admittedRetailUtp,
    "d4bc549f8fb6c682f5fec81e9a1a3cb58aa8d6291649393ebcb29783f7cbe3f1",
    "retail plc_chest1.utp"
  );
  const textureSources = await Promise.all([
    buildTextureSource({
      fileName: "plx_wood02.dds",
      bytes: await requireIndexedErfResource(
        selectedModelSource,
        "plx_wood02",
        2033
      ),
      sourcePath: `${selectedModelSource.path}::plx_wood02.dds`,
      sourceClass: "ordered-hak"
    }),
    buildTextureSource({
      fileName: "twc03_lance2.tga",
      bytes: await requireKeyBifResource(
        baseReader,
        "twc03_lance2",
        NWN_KEY_BIF_RESOURCE_TYPES.TGA
      ),
      sourcePath: `${resolve(nwnRoot, "data/nwn_base.key")}::twc03_lance2.tga`,
      sourceClass: "retail-key-bif"
    })
  ]);

  const utpBytes = buildVfxPlaceableObjectAttachmentProofUtp(admittedRetailUtp);
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(utpPath, utpBytes);

  assertFixtureDestination(destinationFixtureRoot);
  await rm(destinationFixtureRoot, { recursive: true, force: true });
  await mkdir(destinationFixtureRoot, { recursive: true });
  await cp(sourceFixtureRoot, destinationFixtureRoot, {
    recursive: true,
    force: true
  });
  const placeableFixtureRoot = resolve(destinationFixtureRoot, "scene/placeables");
  const placeableTextureFixtureRoot = resolve(placeableFixtureRoot, "textures");
  await mkdir(placeableTextureFixtureRoot, { recursive: true });
  const targetModelPath = resolve(
    placeableFixtureRoot,
    `${VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.modelResRef}.glb`
  );
  await writeFile(targetModelPath, glbBytes);
  for (const source of textureSources) {
    await writeFile(resolve(placeableTextureFixtureRoot, source.fileName), source.bytes);
  }

  const sourceManifest = JSON.parse(baseManifestBytes.toString("utf8")) as Record<
    string,
    unknown
  >;
  const sourceActorManifest = JSON.parse(
    sourceActorManifestBytes.toString("utf8")
  ) as {
    proofScene?: {
      actors?: ProofSceneActor[];
    };
  };
  const sourceActor = sourceActorManifest.proofScene?.actors?.find(
    (actor) =>
      actor.role === "source_creature" &&
      actor.instanceId ===
        VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.sourceActor
          .instanceId
  );
  if (
    !sourceActor ||
    sourceActor.sourceBicSha256 !==
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.sourceActor
        .bicSha256
  ) {
    throw new Error("The exact source actor contract is absent from the admitted fixture.");
  }
  assertHash(
    exactBicBytes,
    VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.sourceActor
      .bicSha256,
    "exact source actor BIC"
  );
  const manifest = {
    ...buildVfxPlaceableObjectAttachmentProofManifest(
      sourceManifest,
      sourceActor
    ),
    placeableObjectAttachmentProofProfile: {
      version: VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.version,
      profilePath,
      targetUtpSha256: sha256(utpBytes),
      targetGlbSha256: sha256(glbBytes),
      selectedPlaceablesTwoDaSha256: sha256(placeablesTwoDa),
      selectedModelMdlSha256: sha256(modelMdl),
      placeablesTwoDaResolution: {
        direction: "reverse-Mod_HakList",
        winnerHakIndex: selectedPlaceablesTable.hakIndex,
        winnerHakName: selectedPlaceablesTable.hakName
      },
      exactImpactNode: glbAudit.impactNode
    }
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const destinationManifestPath = resolve(destinationFixtureRoot, "manifest.json");
  await writeFile(destinationManifestPath, manifestBytes);

  const profile = {
    version: VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.version,
    generatedAt: new Date().toISOString(),
    status: "offline-preflight-ready",
    proofCompleteness: "missing",
    modelVisibility: "not_tested",
    sourcePolicy: {
      auroraFirst: true,
      xoreosUsed: false,
      runtimeAuthority:
        "retail-client-decompilation-plus-ordered-hak-and-retail-key-bif"
    },
    skillSuite: {
      operate: "1.0.15",
      author: "1.0.15",
      prove: "1.0.15"
    },
    sourceModule: {
      path: sourceModule,
      sha256: sha256(moduleBytes),
      area: {
        resref: VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceArea,
        areSha256: sha256(areBytes),
        gitSha256: sha256(gitBytes)
      },
      orderedHaks
    },
    selectedResources: {
      placeablesTwoDa: {
        sourcePath: selectedPlaceablesTable.sourcePath,
        sha256: sha256(placeablesTwoDa),
        row: selectedRow,
        resolutionDirection: "reverse-Mod_HakList",
        candidates: placeablesTableCandidates.map(({ bytes: _bytes, ...candidate }) =>
          candidate
        )
      },
      model: {
        sourcePath: `${selectedModelSource.path}::${VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.modelResRef}.mdl`,
        sha256: sha256(modelMdl),
        glbPath: targetModelPath,
        glbSha256: sha256(glbBytes),
        glbAudit
      },
      targetTemplateUtp: {
        sourcePath: `${resolve(nwnRoot, "data/nwn_base.key")}::plc_chest1.utp`,
        sha256: sha256(admittedRetailUtp),
        mutationPolicy:
          "preserve-retail-fields; replace identity, appearance, scripts, and dynamic-target flags only"
      },
      textures: textureSources.map(({ bytes: _bytes, ...source }) => source)
    },
    target: {
      ...VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target,
      utpPath,
      utpSha256: sha256(utpBytes)
    },
    sourceActor: {
      bicPath: exactBicPath,
      bicSha256: sha256(exactBicBytes),
      contractFixturePath: resolve(sourceActorFixtureRoot, "manifest.json"),
      contractFixtureSha256: sha256(sourceActorManifestBytes),
      contractInstanceId: sourceActor.instanceId,
      positionAurora:
        VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourcePositionAurora
    },
    runtime: {
      executablePath: nwnExecutable,
      executableSha256: sha256(await readFile(nwnExecutable)),
      effect: VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceVfx,
      automaticRetry: false,
      overlapAllowed: false,
      existingOracleReuseRequired: true
    },
    webFixture: {
      fixtureId: VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.fixtureId,
      root: destinationFixtureRoot,
      manifestPath: destinationManifestPath,
      manifestSha256: sha256(manifestBytes),
      targetModelPath
    },
    audit:
      "backend/docs/aurora-reverse/vfx-placeable-object-attachment-proof-audit-2026-08-13.md"
  };
  await writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: profile.status,
        profilePath,
        utpPath,
        destinationFixtureRoot,
        orderedHakCount: orderedHaks.length,
        selectedRow,
        glbAudit
      },
      null,
      2
    )
  );
}

async function requireErfResource(
  erfPath: string,
  resref: string,
  resourceType: number
): Promise<Buffer> {
  const bytes = await readNwnErfResource(erfPath, resref, resourceType);
  if (!bytes) {
    throw new Error(`Missing ERF resource ${erfPath}::${resref}/${resourceType}`);
  }
  return bytes;
}

async function requireIndexedErfResource(
  source: {
    path: string;
    resourceIndex: NonNullable<
      Awaited<ReturnType<typeof readNwnErfResourceIndex>>
    >;
  },
  resref: string,
  resourceType: number
): Promise<Buffer> {
  const bytes = await readNwnErfResourceFromIndex(
    source.path,
    source.resourceIndex,
    resref,
    resourceType
  );
  if (!bytes) {
    throw new Error(
      `Missing indexed ERF resource ${source.path}::${resref}/${resourceType}`
    );
  }
  return bytes;
}

async function requireKeyBifResource(
  reader: NwnKeyBifResourceReader,
  resref: string,
  resourceType: number
): Promise<Buffer> {
  const bytes = await reader.read(resref, resourceType);
  if (!bytes) {
    throw new Error(`Missing KEY/BIF resource ${resref}/${resourceType}`);
  }
  return bytes;
}

function buildTextureSource(input: {
  fileName: string;
  bytes: Buffer;
  sourcePath: string;
  sourceClass: "ordered-hak" | "retail-key-bif";
}) {
  const expected = expectedTextureProfiles.get(input.fileName);
  if (!expected) {
    throw new Error(`No expected hash for ${input.fileName}`);
  }
  assertHash(input.bytes, expected.sha256, input.fileName);
  return {
    fileName: input.fileName,
    bytes: input.bytes,
    sourcePath: input.sourcePath,
    sizeBytes: input.bytes.length,
    sha256: sha256(input.bytes),
    sourceClass: input.sourceClass,
    exactBytesPreserved: true
  };
}

function inspectTargetGlb(bytes: Buffer) {
  if (bytes.toString("ascii", 0, 4) !== "glTF") {
    throw new Error("Target GLB has an invalid signature.");
  }
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(
    bytes
      .subarray(20, 20 + jsonLength)
      .toString("utf8")
      .replace(/\0+$/u, "")
  ) as {
    asset?: { generator?: string };
    scenes?: Array<{
      extras?: {
        aurora?: {
          sourceModel?: string;
          sourceHierarchy?: Array<{
            name?: string;
            nodeType?: string;
            position?: number[];
          }>;
        };
      };
    }>;
  };
  const aurora = json.scenes?.[0]?.extras?.aurora;
  const hierarchy = aurora?.sourceHierarchy ?? [];
  const impact = hierarchy.find(
    (node) =>
      node.name ===
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.impactNode
  );
  const emitterNodes = hierarchy.filter((node) => node.nodeType === "emitter");
  if (
    aurora?.sourceModel !==
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.modelResRef ||
    JSON.stringify(impact?.position) !==
      JSON.stringify(
        VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target
          .impactNodePositionAurora
      ) ||
    emitterNodes.length !== 0 ||
    !json.asset?.generator?.includes(
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.glb.converterVersion
    )
  ) {
    throw new Error("Target GLB source hierarchy changed from the admitted profile.");
  }
  return {
    sourceModel: aurora.sourceModel,
    sourceHierarchyNodeCount: hierarchy.length,
    impactNode: impact,
    emitterNodeCount: emitterNodes.length,
    generator: json.asset?.generator
  };
}

function assertOrderedHakPresent(orderedHakNames: readonly string[], name: string): void {
  if (!orderedHakNames.some((candidate) => candidate.toLowerCase() === name)) {
    throw new Error(`Source module ordered HAK list does not contain ${name}.`);
  }
}

function assertFixtureDestination(path: string): void {
  const expectedParent = resolve(repoRoot, "frontend/public/dev-fixtures");
  if (
    !path.startsWith(`${expectedParent}\\`) ||
    basename(path) !== VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.fixtureId
  ) {
    throw new Error(`Unsafe generated fixture destination: ${path}`);
  }
}

function assertHash(bytes: Buffer, expected: string, label: string): void {
  const actual = sha256(bytes);
  if (actual !== expected.toLowerCase()) {
    throw new Error(`${label} SHA-256 changed: expected ${expected}, got ${actual}`);
  }
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
