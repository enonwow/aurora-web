import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const TARGET_SHIFT_AURORA_X = 3;
const TARGET_INSTANCE_ID = "enon_test_effect:vfx-placeable-target";

export const VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE = {
  version: "aurora-vfx-placeable-object-attachment-proof-profile/v2",
  fixtureId: "vfx-broad-row50-placeable",
  sourceFixtureId: "vfx-broad-row50",
  sourceModule: {
    path: "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\tlc_vfx_catalog_lab_iter1.mod",
    sha256: "fda307d129f0c0e17411fb5820c6c528ee66e3a079202be5e8e38be781cff010"
  },
  sourceArea: "enon_test_effect",
  sourceVfx: {
    table: "visualeffects.2da",
    rowId: 50,
    label: "VFX_IMP_DEATH",
    lifecycle: "fire-and-forget" as const,
    triggerCount: 1
  },
  target: {
    kind: "placeable" as const,
    templateResRef: "vfxplcproof",
    tag: "vfx_placeable_target",
    appearanceRowId: 779,
    appearanceLabel: "new:Lance Rack (animated)",
    modelResRef: "plc_lancrak1",
    modelPrefix: "lancrak1",
    impactNode: "lancrak1_impact",
    impactNodePositionAurora: [0, 0, 0.8500000238418579] as const,
    positionAurora: [12.5, 6.8, 0] as const,
    instanceId: TARGET_INSTANCE_ID
  },
  sourcePositionAurora: [12.5, 3.8, 0] as const,
  sourceResources: {
    placeablesTwoDa: {
      hakIndex: 56,
      hakName: "witcher2",
      sha256: "824a067ceaf4441aca60a3fc75518b5d815dae0df5c45b4357fc97e7cc63da9f"
    },
    model: {
      hakIndex: 54,
      hakName: "q_placeables",
      sha256: "03b40827712f303a66d4a4e5fa74e32d6b8cdd7bdc8604a82693f1105d988c12"
    },
    glb: {
      converterVersion: "aurora-mdl-to-glb/v18-source-proven-texture-aliases",
      sha256: "7c86d1d068245ef9b7e4b88e958577e19b35ecba05504a02653c980e2e31a649"
    },
    sourceActor: {
      fixtureId: "vfx-broad-row216",
      instanceId: "enon_test_effect:player-entry",
      bicSha256:
        "5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0"
    }
  }
} as const;

interface ProofSceneModel extends Record<string, unknown> {
  translation?: [number, number, number];
}

export interface ProofSceneActor extends Record<string, unknown> {
  role?: string;
  normalizedPosition?: [number, number, number];
}

interface OmittedOracleObject extends Record<string, unknown> {
  role?: string;
}

interface ProofSceneTexture extends Record<string, unknown> {
  resref?: string;
  resourceKey?: string;
}

interface SourceManifest extends Record<string, unknown> {
  fixtureId?: string;
  comparisonContext?: Record<string, unknown>;
  proofScene?: Record<string, unknown> & {
    models?: ProofSceneModel[];
    actors?: ProofSceneActor[];
    textures?: ProofSceneTexture[];
    omittedOracleObjects?: OmittedOracleObject[];
    sourceEvidence?: string[];
  };
}

export function buildVfxPlaceableObjectAttachmentProofUtp(
  admittedRetailUtp: Buffer
): Buffer {
  const source = parseRawGffDocument(admittedRetailUtp);
  if (
    !source ||
    source.fileType !== "UTP " ||
    source.fileVersion !== "V3.2"
  ) {
    throw new Error("The admitted placeable template is not a UTP V3.2 document.");
  }
  const fields = structuredClone(source.fields) as SupportedGffField[];
  for (const field of fields) {
    if (field.type === "resref" && field.label.startsWith("On")) {
      field.value = "";
    }
  }
  replaceRequiredField(fields, "TemplateResRef", "resref", "vfxplcproof");
  replaceRequiredField(fields, "Tag", "cexostring", "vfx_placeable_target");
  replaceRequiredField(
    fields,
    "Appearance",
    "dword",
    VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.appearanceRowId
  );
  replaceRequiredField(fields, "Comment", "cexostring", "Aurora VFX placeable attachment proof target");
  replaceRequiredField(fields, "Plot", "byte", 1);
  replaceRequiredField(fields, "Useable", "byte", 0);
  replaceRequiredField(fields, "HasInventory", "byte", 0);
  replaceOrAppendField(fields, "Static", "byte", 0);
  return buildGffBuffer(fields, source.fileType, source.rootStructTypeId);
}

function replaceRequiredField(
  fields: SupportedGffField[],
  label: string,
  type: SupportedGffField["type"],
  value: string | number
): void {
  const field = fields.find((candidate) => candidate.label === label);
  if (!field || field.type !== type) {
    throw new Error(`Admitted placeable template field ${label}/${type} is missing.`);
  }
  (field as { value: string | number }).value = value;
}

function replaceOrAppendField(
  fields: SupportedGffField[],
  label: string,
  type: SupportedGffField["type"],
  value: string | number
): void {
  const field = fields.find((candidate) => candidate.label === label);
  if (field) {
    if (field.type !== type) {
      throw new Error(`Admitted placeable template field ${label} has type ${field.type}.`);
    }
    (field as { value: string | number }).value = value;
    return;
  }
  fields.push({ label, type: type as "byte", value } as SupportedGffField);
}

export function buildVfxPlaceableObjectAttachmentProofManifest<T extends SourceManifest>(
  source: T,
  sourceActor: ProofSceneActor
) {
  if (!source.proofScene) {
    throw new Error("The row50 source manifest has no proofScene contract.");
  }
  if (
    sourceActor.role !== "source_creature" ||
    sourceActor.instanceId !==
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.sourceActor
        .instanceId ||
    sourceActor.sourceBicSha256 !==
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.sourceActor
        .bicSha256
  ) {
    throw new Error("The admitted source actor does not match the exact BIC contract.");
  }

  const proofScene = source.proofScene;
  const shiftedModels = (proofScene.models ?? []).map((model) => ({
    ...model,
    ...(model.translation
      ? {
          translation: [
            model.translation[0] - TARGET_SHIFT_AURORA_X,
            model.translation[1],
            model.translation[2]
          ] as [number, number, number]
        }
      : {})
  }));
  const shiftedActors = (proofScene.actors ?? []).map((actor) => {
    const position = actor.normalizedPosition ?? [0, 0, 0];
    return {
      ...actor,
      role: actor.role === "target_creature" ? "context_creature" : actor.role,
      normalizedPosition: [
        position[0] - TARGET_SHIFT_AURORA_X,
        position[1],
        position[2]
      ] as [number, number, number]
    };
  });

  return {
    ...source,
    fixtureId: VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.fixtureId,
    sourceFixtureId: VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceFixtureId,
    comparisonContext: {
      ...(source.comparisonContext ?? {}),
      cameraMatchEstablished: false,
      sceneMatchEstablished: false,
      ownerTargetMatchEstablished: true,
      comparisonStatus:
        "source-backed-placeable-target-and-source-actor-open-exact-camera-scene-material-and-visual-parity"
    },
    proofScene: {
      ...proofScene,
      status: "source-backed-exact-row50-area-placeable-impact-target",
      effectOrigin: { x: 12.5, y: 6.8, z: 0 },
      models: [
        ...shiftedModels,
        {
          role: "target_placeable",
          instanceId: TARGET_INSTANCE_ID,
          sourceResref:
            VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.modelResRef,
          resourceKey: "scene/placeables/plc_lancrak1.glb",
          sourcePath:
            "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak\\q_placeables.hak",
          sourceSha256:
            VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.sourceResources.model.sha256,
          translation: [0, 0, 0] as [number, number, number],
          orientationQuarterTurns: 0
        }
      ],
      textures: dedupeProofSceneTextures([
        ...(proofScene.textures ?? []),
        {
          resref: "plx_wood02",
          resourceKey: "scene/placeables/textures/plx_wood02.dds"
        },
        {
          resref: "twc03_lance2",
          resourceKey: "scene/placeables/textures/twc03_lance2.tga"
        }
      ]),
      actors: [
        ...shiftedActors,
        {
          ...sourceActor,
          normalizedPosition: [0, -3, 0] as [number, number, number],
          bearingRadians: 0,
          sourceForwardAuroraXY: [0, 1],
          sourceForwardSource:
            "vfx placeable profile: target=(12.5,6.8), source=(12.5,3.8)"
        }
      ],
      omittedOracleObjects: (proofScene.omittedOracleObjects ?? []).filter(
        (entry) => entry.role !== "source_creature"
      ),
      objectAttachmentTarget: {
        version: "aurora-vfx-object-attachment-target/v1",
        phase: "impact",
        targetKind: "placeable",
        sourceKind: "proof-scene-model-instance",
        sourceId: TARGET_INSTANCE_ID,
        targetSpecialNodePrefix:
          VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.target.modelPrefix
      },
      sourceEvidence: [
        ...(proofScene.sourceEvidence ?? []),
        "frontend/public/dev-fixtures/vfx-broad-row216/manifest.json#proofScene.actors[source_creature]",
        "backend/docs/aurora-reverse/vfx-placeable-object-attachment-proof-audit-2026-08-13.md"
      ]
    }
  };
}

function dedupeProofSceneTextures(
  textures: ProofSceneTexture[]
): ProofSceneTexture[] {
  const byResref = new Map<string, ProofSceneTexture>();
  for (const texture of textures) {
    const key = texture.resref?.trim().toLowerCase();
    if (key) {
      byResref.set(key, texture);
    }
  }
  return [...byResref.values()];
}
