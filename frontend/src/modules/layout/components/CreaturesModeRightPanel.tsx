import type { CreatureViewportRenderPayload } from "../../creatures/application/creatureRenderPayloadResolver";
import { resolveCreatureAnimationStateClip } from "../../creatures/domain/creatureAnimationState";
import type { SceneObject } from "../contracts";

type CreatureRenderPackage = NonNullable<CreatureViewportRenderPayload["renderPackage"]>;

interface CreaturePltLayerDescriptor {
  key: string;
  label: string;
  swatch: {
    hue: number;
    saturation: number;
    minLightness: number;
    lightnessRange: number;
  };
}

interface CreaturesModeRightPanelProps {
  activePayload: CreatureViewportRenderPayload | null;
  activePreviewObject: SceneObject | null;
  previewErrorMessage: string | null;
  onSelectedAnimationNameChange?: (object: SceneObject, animationName: string) => void;
  onSelectedAnimationStateChange?: (object: SceneObject, animationState?: number) => void;
}

interface CreatureAnimationOption {
  name: string;
  modelName: string;
  lengthSeconds: number;
  nodeCount: number;
  nodeNames: string[];
  animRoot?: string;
  animationScale?: number;
  eventCount?: number;
  eventNames?: string[];
}

interface CreatureAnimationPreviewStatus {
  label: string;
  detail: string;
}

interface CreatureAnimationStateStatus {
  state: number;
  label: string;
  detail: string;
}

const CREATURE_PLT_LAYERS: CreaturePltLayerDescriptor[] = [
  { key: "skin", label: "skin", swatch: { hue: 27, saturation: 48, minLightness: 42, lightnessRange: 24 } },
  { key: "hair", label: "hair", swatch: { hue: 36, saturation: 42, minLightness: 24, lightnessRange: 26 } },
  { key: "metal1", label: "metal1", swatch: { hue: 206, saturation: 18, minLightness: 42, lightnessRange: 22 } },
  { key: "metal2", label: "metal2", swatch: { hue: 219, saturation: 16, minLightness: 36, lightnessRange: 22 } },
  { key: "cloth1", label: "cloth1", swatch: { hue: 221, saturation: 52, minLightness: 34, lightnessRange: 25 } },
  { key: "cloth2", label: "cloth2", swatch: { hue: 331, saturation: 48, minLightness: 34, lightnessRange: 25 } },
  { key: "leather1", label: "leather1", swatch: { hue: 24, saturation: 42, minLightness: 28, lightnessRange: 22 } },
  { key: "leather2", label: "leather2", swatch: { hue: 16, saturation: 38, minLightness: 24, lightnessRange: 22 } },
  { key: "tattoo1", label: "tattoo1", swatch: { hue: 199, saturation: 58, minLightness: 36, lightnessRange: 25 } },
  { key: "tattoo2", label: "tattoo2", swatch: { hue: 287, saturation: 52, minLightness: 38, lightnessRange: 25 } }
];
const CREATURE_PLT_PALETTE_ROW_MAX = 175;

const CREATURE_BODY_PART_SLOTS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "head", label: "head" },
  { key: "neck", label: "neck" },
  { key: "torso", label: "torso" },
  { key: "pelvis", label: "pelvis" },
  { key: "rBicep", label: "r bicep" },
  { key: "lBicep", label: "l bicep" },
  { key: "rFArm", label: "r forearm" },
  { key: "lFArm", label: "l forearm" },
  { key: "rHand", label: "r hand" },
  { key: "lHand", label: "l hand" },
  { key: "rThigh", label: "r thigh" },
  { key: "lThigh", label: "l thigh" },
  { key: "rShin", label: "r shin" },
  { key: "lShin", label: "l shin" },
  { key: "rFoot", label: "r foot" },
  { key: "lFoot", label: "l foot" },
  { key: "wings", label: "wings" },
  { key: "tail", label: "tail" }
];

function countAssetRefs(payload: CreatureViewportRenderPayload | null): number {
  const assetRefs = payload?.renderPackage?.assetRefs;
  if (!assetRefs) {
    return 0;
  }
  return Object.values(assetRefs).reduce(
    (total, values) => total + (Array.isArray(values) ? values.length : 0),
    0
  );
}

function hasCandidateModelUrl(candidate: { glbUrl?: string; modelUrl?: string }): boolean {
  return Boolean(candidate.glbUrl?.trim() || candidate.modelUrl?.trim());
}

function hasDerivedModelSiblingUrl(renderPackage: CreatureRenderPackage): boolean {
  return renderPackage.skeletonModelCandidates.some((candidate) => {
    const modelUrl = candidate.glbUrl?.trim() || candidate.modelUrl?.trim() || "";
    return /\/__aurora\/derived\/models\/[^/]+\.glb(?:$|[?#])/iu.test(modelUrl);
  });
}

function hasCreatureHeadFallbackCandidate(renderPackage: CreatureRenderPackage): boolean {
  return (
    hasDerivedModelSiblingUrl(renderPackage) &&
    renderPackage.partModelCandidates.some((candidate) => {
      const slot = candidate.slot.trim().toLowerCase();
      const hasModelUrl = hasCandidateModelUrl(candidate);
      const modelResRef = candidate.modelResRef?.trim() ?? "";
      return slot === "head" && !hasModelUrl && /^(p[a-z][a-z])\d+_head\d+$/iu.test(modelResRef);
    })
  );
}

function normalizeCreatureModelName(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function shouldSuppressCreatureEquipmentOverlaysForInspector(
  renderPackage: CreatureRenderPackage | undefined
): boolean {
  const modelType = renderPackage?.appearanceProfile?.modelType?.trim().toUpperCase();
  return modelType === "S";
}

function collectSuppressedCreatureEquipmentModelNames(
  renderPackage: CreatureRenderPackage | undefined
): Set<string> {
  if (!shouldSuppressCreatureEquipmentOverlaysForInspector(renderPackage)) {
    return new Set();
  }
  return new Set(
    (renderPackage?.equipmentModelCandidates ?? [])
      .flatMap((candidate) => candidate.itemModelPartResRefs ?? [])
      .map(normalizeCreatureModelName)
      .filter(Boolean)
  );
}

function resolveCreatureDirectSourceModelName(
  renderPackage: CreatureRenderPackage | undefined
): string {
  return normalizeCreatureModelName(
    renderPackage?.sourceModelCandidates.find(
      (candidate) => candidate.confidence === "direct-model"
    )?.resref ?? renderPackage?.appearanceProfile?.raceModel
  );
}

function shouldBypassEmptyCreatureDriverModel(
  renderPackage: CreatureRenderPackage | undefined
): boolean {
  return (
    resolveCreatureDirectSourceModelName(renderPackage) === "c_gennode" &&
    Boolean(renderPackage?.partModelCandidates.some(hasCandidateModelUrl))
  );
}

function shouldSuppressEmptyDriverAnimationOptions(
  renderPackage: CreatureRenderPackage | undefined
): boolean {
  return (
    shouldBypassEmptyCreatureDriverModel(renderPackage) &&
    !Boolean(renderPackage?.skeletonModelCandidates.some(hasCandidateModelUrl))
  );
}

function resolveCreatureViewportModelLabel(
  renderPackage: CreatureRenderPackage | undefined
): string {
  if (!renderPackage) {
    return "missing";
  }
  if (shouldBypassEmptyCreatureDriverModel(renderPackage)) {
    return "part model group";
  }
  if (renderPackage.modelUrl?.trim() || renderPackage.glbUrl?.trim()) {
    return "direct model";
  }
  if (renderPackage.partModelCandidates.some(hasCandidateModelUrl)) {
    return "part model group";
  }
  if (hasCreatureHeadFallbackCandidate(renderPackage)) {
    return "head fallback";
  }
  if (renderPackage.skeletonModelCandidates.some(hasCandidateModelUrl)) {
    return "skeleton fallback";
  }
  const emitterCount = renderPackage.auroraEmitter?.emitters.length ?? 0;
  const lightCount = renderPackage.auroraLight?.lights.length ?? 0;
  if (emitterCount > 0 && lightCount > 0) {
    return "emitter/light preview";
  }
  if (emitterCount > 0) {
    return "emitter preview";
  }
  if (lightCount > 0) {
    return "light preview";
  }
  return "primitive fallback";
}

function collectCreatureAnimationOptions(
  renderPackage: CreatureRenderPackage | undefined
): CreatureAnimationOption[] {
  if (shouldSuppressEmptyDriverAnimationOptions(renderPackage)) {
    return [];
  }
  const optionsByName = new Map<string, CreatureAnimationOption>();
  const bypassedDriverModelName = shouldBypassEmptyCreatureDriverModel(renderPackage)
    ? resolveCreatureDirectSourceModelName(renderPackage)
    : "";
  renderPackage?.sourceMdlInspection?.models.forEach((model) => {
    if (
      bypassedDriverModelName &&
      normalizeCreatureModelName(model.modelName) === bypassedDriverModelName
    ) {
      return;
    }
    model.animations.forEach((animation) => {
      const name = animation.name.trim();
      const normalizedName = name.toLowerCase();
      if (!name || optionsByName.has(normalizedName)) {
        return;
      }
      optionsByName.set(normalizedName, {
        name,
        modelName: model.modelName,
        lengthSeconds: animation.lengthSeconds,
        nodeCount: animation.nodeCount,
        nodeNames: animation.nodeNames,
        animRoot: animation.animRoot,
        animationScale: animation.animationScale,
        eventCount: animation.events?.length,
        eventNames: animation.events?.map((event) => event.name)
      });
    });
  });
  return Array.from(optionsByName.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

function collectDirectCreatureSourceSkinPlaybackNodeNames(
  renderPackage: CreatureRenderPackage | undefined
): Set<string> {
  const directModelName = normalizeCreatureModelName(renderPackage?.appearanceProfile?.raceModel);
  if (!directModelName) {
    return new Set();
  }
  const sourceModel = renderPackage?.sourceMdlInspection?.models.find(
    (model) => normalizeCreatureModelName(model.modelName) === directModelName
  );
  const sourceNodes = sourceModel?.nodes ?? [];
  const hasSourceSkinNode = sourceNodes.some((node) => {
    const nodeType = node.nodeType.trim().toLowerCase();
    return nodeType === "skin" || nodeType === "skinmesh";
  });
  if (!hasSourceSkinNode) {
    return new Set();
  }
  const rootNodeNames = new Set(
    [directModelName, ...(sourceModel?.rootNodeNames ?? []).map(normalizeCreatureModelName)]
      .map((name) => name.trim())
      .filter(Boolean)
  );
  return new Set(
    sourceNodes
      .map((node) => normalizeCreatureModelName(node.name))
      .filter((nodeName) => nodeName && !rootNodeNames.has(nodeName))
  );
}

function animationTargetsAnyCreatureNode(
  selectedOption: CreatureAnimationOption | undefined,
  nodeNames: Set<string>
): boolean {
  return Boolean(
    selectedOption &&
      nodeNames.size > 0 &&
      selectedOption.nodeNames.some((nodeName) =>
        nodeNames.has(normalizeCreatureModelName(nodeName))
      )
  );
}

function isDirectSourceSkinnedCreatureAnimationGuarded(
  renderPackage: CreatureRenderPackage | undefined,
  selectedOption: CreatureAnimationOption | undefined
): boolean {
  if (!renderPackage || !selectedOption) {
    return false;
  }
  const directModelName = normalizeCreatureModelName(renderPackage.appearanceProfile?.raceModel);
  const selectedModelName = normalizeCreatureModelName(selectedOption.modelName);
  if (!directModelName || selectedModelName !== directModelName) {
    return false;
  }
  return animationTargetsAnyCreatureNode(
    selectedOption,
    collectDirectCreatureSourceSkinPlaybackNodeNames(renderPackage)
  );
}

function isDirectSupermodelCreatureAnimationPlayable(
  renderPackage: CreatureRenderPackage | undefined,
  selectedOption: CreatureAnimationOption | undefined
): boolean {
  if (!renderPackage || !selectedOption) {
    return false;
  }
  const directModelName = normalizeCreatureModelName(renderPackage.appearanceProfile?.raceModel);
  const selectedModelName = normalizeCreatureModelName(selectedOption.modelName);
  if (!directModelName || !selectedModelName || selectedModelName === directModelName) {
    return false;
  }
  const directSourceModel = renderPackage.sourceMdlInspection?.models.find(
    (model) => normalizeCreatureModelName(model.modelName) === directModelName
  );
  const visibleSkinNodeNames = new Set(
    (directSourceModel?.nodes ?? [])
      .filter((node) => {
        const nodeType = node.nodeType.trim().toLowerCase();
        return nodeType === "skin" || nodeType === "skinmesh";
      })
      .map((node) => normalizeCreatureModelName(node.name))
      .filter(Boolean)
  );
  if (visibleSkinNodeNames.size === 0) {
    return true;
  }
  return !selectedOption.nodeNames.some((nodeName) =>
    visibleSkinNodeNames.has(normalizeCreatureModelName(nodeName))
  );
}

function isDirectSimpleCreatureAnimationGuarded(
  renderPackage: CreatureRenderPackage | undefined,
  selectedOption: CreatureAnimationOption | undefined
): boolean {
  const appearanceProfile = renderPackage?.appearanceProfile;
  if (!appearanceProfile || !selectedOption) {
    return false;
  }
  const modelType = appearanceProfile.modelType?.trim().toUpperCase();
  if (modelType !== "S") {
    return false;
  }
  const directModelName = normalizeCreatureModelName(appearanceProfile.raceModel);
  const selectedModelName = normalizeCreatureModelName(selectedOption.modelName);
  if (!directModelName || selectedModelName !== directModelName) {
    return false;
  }
  return animationTargetsAnyCreatureNode(
    selectedOption,
    collectDirectCreatureSourceSkinPlaybackNodeNames(renderPackage)
  );
}

function resolveCreatureSelectedAnimationName(object: SceneObject | null): string {
  const value = object?.creatureProperties?.advancedSettings?.animationName?.trim();
  return value && value.length > 0 ? value : "";
}

function resolveCreaturePipelineSupermodelLabel(
  renderPackage: CreatureRenderPackage | undefined
): string {
  const directModelName = normalizeCreatureModelName(renderPackage?.appearanceProfile?.raceModel);
  const directSourceModel = renderPackage?.sourceMdlInspection?.models.find(
    (model) => normalizeCreatureModelName(model.modelName) === directModelName
  );
  const inspectedSupermodel = directSourceModel?.supermodel?.trim();
  if (inspectedSupermodel) {
    return inspectedSupermodel;
  }
  const commandName = renderPackage?.skeletonPipelineEvidence?.supermodelCommandName?.trim();
  return commandName && commandName.toLowerCase() !== "setsupermodel" ? commandName : "-";
}

function normalizeCreaturePltPaletteRow(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(CREATURE_PLT_PALETTE_ROW_MAX, Math.trunc(value)));
}

function normalizeRuntimePartValue(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(255, Math.trunc(value)));
}

function resolvePltLayerSwatchColor(
  layer: CreaturePltLayerDescriptor,
  row: number | undefined
): string {
  if (row === undefined) {
    return "rgba(54, 75, 101, 0.46)";
  }
  const ratio = row / CREATURE_PLT_PALETTE_ROW_MAX;
  return `hsl(${layer.swatch.hue} ${layer.swatch.saturation}% ${
    layer.swatch.minLightness + ratio * layer.swatch.lightnessRange
  }%)`;
}

function CreaturePltLayerSummary({
  colors
}: {
  colors: Record<string, number | undefined> | undefined;
}) {
  const rows = CREATURE_PLT_LAYERS.map((layer) => ({
    layer,
    row: normalizeCreaturePltPaletteRow(colors?.[layer.key])
  }));
  const populatedRows = rows.filter(({ row }) => row !== undefined).length;

  return (
    <section className="creature-plt-layer-summary" aria-label="creature PLT layers">
      <p>
        PLT layers: <strong>{populatedRows}/10</strong>
      </p>
      <ul className="creature-plt-layer-list" aria-label="PLT layer rows">
        {rows.map(({ layer, row }) => (
          <li
            className={`creature-plt-layer-row${row === undefined ? " is-empty" : ""}`}
            key={layer.key}
          >
            <span
              aria-hidden="true"
              className="creature-plt-layer-swatch"
              style={{ backgroundColor: resolvePltLayerSwatchColor(layer, row) }}
            />
            <span>{layer.label}</span>
            <strong>{row ?? "-"}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CreatureBodyPartSummary({
  bodyParts
}: {
  bodyParts: Record<string, number | undefined> | undefined;
}) {
  const rows = CREATURE_BODY_PART_SLOTS.map((slot) => ({
    slot,
    part: normalizeRuntimePartValue(bodyParts?.[slot.key])
  })).filter(({ part }) => part !== undefined);

  return (
    <section className="creature-body-part-summary" aria-label="creature body part slots">
      <p>
        body parts: <strong>{rows.length}/{CREATURE_BODY_PART_SLOTS.length}</strong>
      </p>
      {rows.length > 0 ? (
        <ul className="creature-body-part-list" aria-label="body part rows">
          {rows.map(({ slot, part }) => (
            <li className="creature-body-part-row" key={slot.key}>
              <span>{slot.label}</span>
              <strong>{part}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function formatInspectorValue(value: number | string | boolean | undefined): string {
  if (value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function CreatureAppearanceProfileSummary({
  appearanceProfile
}: {
  appearanceProfile: CreatureRenderPackage["appearanceProfile"] | undefined;
}) {
  if (!appearanceProfile) {
    return null;
  }

  const sizeLabel =
    appearanceProfile.sizeCategoryLabel ??
    (appearanceProfile.sizeCategory !== undefined
      ? `size ${appearanceProfile.sizeCategory}`
      : undefined);
  return (
    <section className="creature-render-detail-summary" aria-label="creature appearance profile">
      <p>
        appearance:{" "}
        <strong>
          {formatInspectorValue(appearanceProfile.appearanceLabel ?? appearanceProfile.appearanceType)}
        </strong>
      </p>
      <p>
        model type: <strong>{formatInspectorValue(appearanceProfile.modelType)}</strong>
      </p>
      <p>
        race model: <strong>{formatInspectorValue(appearanceProfile.raceModel)}</strong>
      </p>
      <p>
        size: <strong>{formatInspectorValue(sizeLabel)}</strong>
      </p>
    </section>
  );
}

function CreatureModelCandidateSummary({
  renderPackage
}: {
  renderPackage: CreatureRenderPackage | undefined;
}) {
  const sourceModels = renderPackage?.sourceModelCandidates ?? [];
  const skeletonModels = renderPackage?.skeletonModelCandidates ?? [];
  const partModels = renderPackage?.partModelCandidates ?? [];
  const equipmentModels = renderPackage?.equipmentModelCandidates ?? [];
  const suppressEquipmentOverlays =
    shouldSuppressCreatureEquipmentOverlaysForInspector(renderPackage);
  if (
    sourceModels.length === 0 &&
    skeletonModels.length === 0 &&
    partModels.length === 0 &&
    equipmentModels.length === 0
  ) {
    return null;
  }

  return (
    <section className="creature-render-detail-summary" aria-label="creature model candidates">
      {sourceModels.length > 0 ? (
        <ul className="creature-render-detail-list" aria-label="source model rows">
          {sourceModels.slice(0, 4).map((candidate) => (
            <li className="creature-render-detail-row" key={`${candidate.source}:${candidate.resref}`}>
              <span>{candidate.resref}</span>
              <strong>{candidate.confidence}</strong>
            </li>
          ))}
        </ul>
      ) : null}
      {skeletonModels.length > 0 ? (
        <ul className="creature-render-detail-list" aria-label="skeleton model rows">
          {skeletonModels.slice(0, 4).map((candidate) => (
            <li
              className="creature-render-detail-row"
              key={`${candidate.source}:${candidate.resref}`}
            >
              <span title={candidate.modelPrefix}>{candidate.resref}</span>
              <strong title={candidate.glbUrl ?? candidate.modelUrl ?? candidate.assetId}>
                {candidate.glbUrl || candidate.modelUrl ? "url-ready" : candidate.confidence}
              </strong>
            </li>
          ))}
        </ul>
      ) : null}
      {partModels.length > 0 ? (
        <ul className="creature-render-detail-list" aria-label="part model rows">
          {partModels.slice(0, 8).map((candidate) => {
            const modelLabel = candidate.modelResRef ?? candidate.partModelName;
            const targetLabel = candidate.nodeName
              ? `${modelLabel} -> ${candidate.nodeName}`
              : modelLabel;
            return (
              <li
                className="creature-render-detail-row"
                key={`${candidate.slot}:${candidate.partId}:${candidate.partModelName}`}
              >
                <span title={targetLabel}>{candidate.slot}</span>
                <strong title={targetLabel}>{targetLabel}</strong>
              </li>
            );
          })}
        </ul>
      ) : null}
      {equipmentModels.length > 0 ? (
        <ul className="creature-render-detail-list" aria-label="equipment model rows">
          {equipmentModels.slice(0, 8).map((candidate) => {
            const slotLabel = candidate.slotLabels.join("/") || "unknown";
            const targetLabel =
              candidate.primaryAttachmentTarget ?? candidate.attachmentTargets[0] ?? "rootdummy";
            const itemLabel = candidate.itemName
              ? `${candidate.resref} (${candidate.itemName})`
              : candidate.resref;
            const partLabel =
              candidate.itemModelPartResRefs && candidate.itemModelPartResRefs.length > 0
                ? ` models ${candidate.itemModelPartResRefs.join("/")}`
                : candidate.itemModelType
                  ? ` model ${candidate.itemModelType}`
                  : candidate.itemModelParts && candidate.itemModelParts.length > 0
                    ? ` parts ${candidate.itemModelParts.join("/")}`
                    : "";
            const renderStatusLabel = suppressEquipmentOverlays
              ? "not rendered (model type S): "
              : "";
            const detailLabel = `${renderStatusLabel}${itemLabel}${partLabel} -> ${targetLabel}`;
            return (
              <li
                className="creature-render-detail-row"
                key={`${candidate.source}:${candidate.resref}:${candidate.slotMask ?? slotLabel}`}
              >
                <span title={detailLabel}>{slotLabel}</span>
                <strong title={detailLabel}>{detailLabel}</strong>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function CreaturePipelineEvidenceSummary({
  renderPackage
}: {
  renderPackage: CreatureRenderPackage | undefined;
}) {
  const materialEvidence = renderPackage?.materialPipelineEvidence;
  const skeletonEvidence = renderPackage?.skeletonPipelineEvidence;
  if (!materialEvidence && !skeletonEvidence) {
    return null;
  }

  return (
    <section className="creature-render-detail-summary" aria-label="creature render pipeline evidence">
      {materialEvidence ? (
        <>
          <p>
            PLT shader:{" "}
            <strong>
              {materialEvidence.pltVertexShaderName}/{materialEvidence.pltFragmentShaderName}
            </strong>
          </p>
          <p>
            PLT uniform: <strong>{materialEvidence.pltSchemeUniformPattern}</strong>
          </p>
        </>
      ) : null}
      {skeletonEvidence ? (
        <>
          <p>
            supermodel: <strong>{resolveCreaturePipelineSupermodelLabel(renderPackage)}</strong>
          </p>
          <p>
            skin node: <strong>{skeletonEvidence.skinnedMeshNodeType}</strong>
          </p>
        </>
      ) : null}
    </section>
  );
}

function CreatureSourceMdlFeatureSummary({
  renderPackage
}: {
  renderPackage: CreatureRenderPackage | undefined;
}) {
  const emitters = renderPackage?.auroraEmitter?.emitters ?? [];
  const lights = renderPackage?.auroraLight?.lights ?? [];
  const materials = renderPackage?.auroraMaterial?.materials ?? [];
  const textureBindings = renderPackage?.textureBindings ?? [];
  if (
    emitters.length === 0 &&
    lights.length === 0 &&
    materials.length === 0 &&
    textureBindings.length === 0
  ) {
    return null;
  }

  return (
    <section className="creature-render-detail-summary" aria-label="creature source MDL features">
      <p>
        source features:{" "}
        <strong>
          E{emitters.length} / L{lights.length} / M{materials.length} / T{textureBindings.length}
        </strong>
      </p>
      {emitters.length > 0 ? (
        <ul className="creature-render-detail-list" aria-label="creature emitter rows">
          {emitters.slice(0, 5).map((emitter, index) => {
            const atlasLabel = emitter.atlas
              ? `${emitter.atlas.effectiveXGrid}x${emitter.atlas.effectiveYGrid}`
              : "";
            const laneLabel =
              emitter.chunkName ??
              emitter.texture ??
              emitter.renderMode ??
              emitter.emitterType ??
              "-";
            return (
              <li
                className="creature-render-detail-row"
                key={`${emitter.sourceModelAssetId}:${emitter.nodeName}:${index}`}
              >
                <span title={`${emitter.sourceModelFileName}:${emitter.nodeName}`}>
                  {emitter.nodeName}
                </span>
                <strong title={emitter.blendMode ?? emitter.renderMode ?? undefined}>
                  {atlasLabel ? `${laneLabel} ${atlasLabel}` : laneLabel}
                </strong>
              </li>
            );
          })}
        </ul>
      ) : null}
      {lights.length > 0 ? (
        <ul className="creature-render-detail-list" aria-label="creature light rows">
          {lights.slice(0, 5).map((light, index) => {
            const lightLabel = light.ambientOnly
              ? "ambient"
              : light.radius !== undefined
                ? `r${light.radius}`
                : light.multiplier !== undefined
                  ? `x${light.multiplier}`
                  : "point";
            return (
              <li
                className="creature-render-detail-row"
                key={`${light.sourceModelAssetId}:${light.nodeName}:${index}`}
              >
                <span title={`${light.sourceModelFileName}:${light.nodeName}`}>
                  {light.nodeName}
                </span>
                <strong>{lightLabel}</strong>
              </li>
            );
          })}
        </ul>
      ) : null}
      {materials.length > 0 ? (
        <ul className="creature-render-detail-list" aria-label="creature material rows">
          {materials.slice(0, 5).map((material) => (
            <li
              className="creature-render-detail-row"
              key={`${material.materialAssetId}:${material.materialFileName}`}
            >
              <span title={material.materialObjectKey}>{material.materialFileName}</span>
              <strong>{material.state.textureSlots?.length ?? 0} slots</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function formatSourceMdlCountMap(counts: Record<string, number>): string {
  const entries = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (entries.length === 0) {
    return "-";
  }
  return entries
    .slice(0, 6)
    .map(([nodeType, count]) => `${nodeType} ${count}`)
    .join(" / ");
}

function formatSourceMdlSeconds(value: number): string {
  if (!Number.isFinite(value)) {
    return "0s";
  }
  return `${Number(value.toFixed(2))}s`;
}

function formatSourceMdlAnimationSummary(animation: {
  lengthSeconds: number;
  nodeCount: number;
  animRoot?: string;
  animationScale?: number;
  events?: Array<{ name: string }>;
  eventCount?: number;
  eventNames?: string[];
}): string {
  const parts = [
    `${formatSourceMdlSeconds(animation.lengthSeconds)} / ${animation.nodeCount} nodes`
  ];
  if (animation.animRoot) {
    parts.push(`root ${animation.animRoot}`);
  }
  if (typeof animation.animationScale === "number" && Number.isFinite(animation.animationScale)) {
    parts.push(`scale ${Number(animation.animationScale.toFixed(3))}`);
  }
  const eventNames =
    animation.eventNames ??
    animation.events?.map((event) => event.name).filter((name) => name.length > 0) ??
    [];
  const eventCount =
    typeof animation.eventCount === "number" ? animation.eventCount : eventNames.length;
  if (eventCount > 0) {
    const label = eventNames.length > 0 ? `:${eventNames.slice(0, 3).join(",")}` : "";
    parts.push(`events ${eventCount}${label}`);
  }
  return parts.join(" / ");
}

function CreatureSourceMdlInspectionSummary({
  renderPackage
}: {
  renderPackage: CreatureRenderPackage | undefined;
}) {
  const suppressedEquipmentModelNames =
    collectSuppressedCreatureEquipmentModelNames(renderPackage);
  const models = (renderPackage?.sourceMdlInspection?.models ?? []).filter(
    (model) => !suppressedEquipmentModelNames.has(normalizeCreatureModelName(model.modelName))
  );
  if (models.length === 0) {
    return null;
  }

  const nodeCount = models.reduce((total, model) => total + model.nodeCount, 0);
  const animationCount = models.reduce((total, model) => total + model.animationCount, 0);
  const nodeRows = models.flatMap((model) =>
    model.nodes.slice(0, 8).map((node) => ({ model, node }))
  );
  const animationRows = models.flatMap((model) =>
    model.animations.slice(0, 3).map((animation) => ({ model, animation }))
  );

  return (
    <section className="creature-render-detail-summary" aria-label="creature source MDL inspection">
      <p>
        source MDL:{" "}
        <strong>
          {models.length} models / {nodeCount} nodes / {animationCount} anims
        </strong>
      </p>
      <ul className="creature-render-detail-list" aria-label="creature source MDL model rows">
        {models.slice(0, 5).map((model) => {
          const rootLabel = model.rootNodeNames.length > 0 ? model.rootNodeNames.join(", ") : "-";
          const modelLabel = model.supermodel
            ? `${model.modelName} -> ${model.supermodel}`
            : model.modelName;
          return (
            <li
              className="creature-render-detail-row"
              key={`${model.sourceModelAssetId}:${model.modelName}`}
            >
              <span title={`${model.sourceModelFileName}; roots: ${rootLabel}`}>
                {modelLabel}
              </span>
              <strong title={model.nodeTypes.join(", ")}>
                {formatSourceMdlCountMap(model.nodeTypeCounts)}
              </strong>
            </li>
          );
        })}
      </ul>
      {nodeRows.length > 0 ? (
        <ul className="creature-render-detail-list" aria-label="creature source MDL node rows">
          {nodeRows.slice(0, 10).map(({ model, node }) => (
            <li
              className="creature-render-detail-row"
              key={`${model.sourceModelAssetId}:${node.name}`}
            >
              <span title={model.sourceModelFileName}>{node.name}</span>
              <strong>
                {node.parentName ? `${node.nodeType} <- ${node.parentName}` : node.nodeType}
              </strong>
            </li>
          ))}
        </ul>
      ) : null}
      {animationRows.length > 0 ? (
        <ul className="creature-render-detail-list" aria-label="creature source MDL animation rows">
          {animationRows.slice(0, 6).map(({ model, animation }) => (
            <li
              className="creature-render-detail-row"
              key={`${model.sourceModelAssetId}:${animation.name}`}
            >
              <span title={animation.targetModel ?? model.modelName}>{animation.name}</span>
              <strong>
                {formatSourceMdlAnimationSummary(animation)}
              </strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function CreatureDiagnosticsSummary({
  diagnostics
}: {
  diagnostics: CreatureRenderPackage["diagnostics"] | undefined;
}) {
  if (!diagnostics || diagnostics.length === 0) {
    return null;
  }

  return (
    <section className="creature-render-detail-summary" aria-label="creature render diagnostics">
      <ul className="creature-render-detail-list" aria-label="diagnostic rows">
        {diagnostics.slice(0, 5).map((diagnostic) => (
          <li className="creature-render-detail-row" key={diagnostic.code}>
            <span title={diagnostic.message}>{diagnostic.code}</span>
            <strong>{diagnostic.severity}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CreatureAnimationSelector({
  activePreviewObject,
  renderPackage,
  onSelectedAnimationNameChange,
  onSelectedAnimationStateChange
}: {
  activePreviewObject: SceneObject;
  renderPackage: CreatureRenderPackage | undefined;
  onSelectedAnimationNameChange?: (object: SceneObject, animationName: string) => void;
  onSelectedAnimationStateChange?: (object: SceneObject, animationState?: number) => void;
}) {
  const animationOptions = collectCreatureAnimationOptions(renderPackage);
  const selectedAnimationName = resolveCreatureSelectedAnimationName(activePreviewObject);
  const normalizedSelected = selectedAnimationName.toLowerCase();
  const selectedOption = animationOptions.find(
    (option) => option.name.toLowerCase() === normalizedSelected
  );
  const canSelect = animationOptions.length > 0 && Boolean(onSelectedAnimationNameChange);
  const animationState = activePreviewObject.creatureProperties?.advancedSettings?.animationState;
  const previewStatus = resolveCreatureAnimationPreviewStatus(
    renderPackage,
    selectedAnimationName,
    animationOptions.length,
    selectedOption
  );
  const stateStatus = resolveCreatureAnimationStateStatus(
    activePreviewObject,
    selectedAnimationName,
    animationOptions
  );

  return (
    <section className="creature-render-detail-summary" aria-label="creature animation controls">
      <p>
        animation:{" "}
        <strong>{selectedOption?.name ?? (selectedAnimationName || "auto")}</strong>
      </p>
      <p>
        preview playback: <strong>{previewStatus.label}</strong>
      </p>
      <p>
        playback detail: <strong>{previewStatus.detail}</strong>
      </p>
      {stateStatus ? (
        <>
          <p>
            animation state: <strong>{stateStatus.state}</strong>
          </p>
          <p>
            state mapping: <strong>{stateStatus.label}</strong>
          </p>
          <p>
            state detail: <strong>{stateStatus.detail}</strong>
          </p>
        </>
      ) : null}
      <label className="creature-animation-selector">
        <span>Animation State</span>
        <input
          aria-label="Creature animation state"
          type="number"
          step="1"
          disabled={!onSelectedAnimationStateChange}
          value={typeof animationState === "number" ? Math.trunc(animationState) : ""}
          onChange={(event) => {
            const value = event.target.value.trim();
            const parsed = Number(value);
            onSelectedAnimationStateChange?.(
              activePreviewObject,
              value.length > 0 && Number.isFinite(parsed) ? Math.trunc(parsed) : undefined
            );
          }}
        />
      </label>
      <label className="creature-animation-selector">
        <span>Animation</span>
        <select
          aria-label="Creature animation"
          disabled={!canSelect}
          value={selectedAnimationName}
          onChange={(event) =>
            onSelectedAnimationNameChange?.(activePreviewObject, event.target.value)
          }
        >
          <option value="">Auto idle</option>
          {animationOptions.map((option) => (
            <option key={option.name} value={option.name}>
              {option.name} ({formatSourceMdlSeconds(option.lengthSeconds)} / {option.nodeCount} nodes)
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function resolveCreatureAnimationStateStatus(
  activePreviewObject: SceneObject | null,
  selectedAnimationName: string,
  animationOptions: readonly CreatureAnimationOption[]
): CreatureAnimationStateStatus | null {
  const rawState = activePreviewObject?.creatureProperties?.advancedSettings?.animationState;
  if (typeof rawState !== "number" || !Number.isFinite(rawState)) {
    return null;
  }
  const state = Math.trunc(rawState);
  if (selectedAnimationName.trim()) {
    return {
      state,
      label: "overridden by animation",
      detail: selectedAnimationName.trim()
    };
  }
  const stateResolution = resolveCreatureAnimationStateClip(
    state,
    animationOptions.map((option) => option.name)
  );
  if (stateResolution.matchedClipName) {
    return {
      state,
      label: "mapped",
      detail: stateResolution.matchedClipName
    };
  }
  if (stateResolution.candidateClipNames.length > 0) {
    return {
      state,
      label: "state clip unavailable",
      detail: stateResolution.candidateClipNames.join(" | ")
    };
  }
  return {
    state,
    label: "unmapped",
    detail: "no creature state clip map"
  };
}

function resolveCreatureAnimationPreviewStatus(
  renderPackage: CreatureRenderPackage | undefined,
  selectedAnimationName: string,
  animationOptionCount: number,
  selectedOption?: CreatureAnimationOption
): CreatureAnimationPreviewStatus {
  if (animationOptionCount === 0) {
    return {
      label: "no source clips",
      detail: "no source MDL animations"
    };
  }
  const viewportModelLabel = resolveCreatureViewportModelLabel(renderPackage);
  const isPartModelCreature = viewportModelLabel === "part model group";
  if (isPartModelCreature && selectedAnimationName) {
    return {
      label: "selected clip",
      detail: "anchored multipart playback"
    };
  }
  if (isPartModelCreature) {
    return {
      label: "auto idle",
      detail: "anchored multipart idle preview"
    };
  }
  if (selectedAnimationName) {
    const directModelName = normalizeCreatureModelName(renderPackage?.appearanceProfile?.raceModel);
    const selectedModelName = normalizeCreatureModelName(selectedOption?.modelName);
    if (
      viewportModelLabel === "direct model" &&
      directModelName.length > 0 &&
      selectedModelName.length > 0 &&
      selectedModelName !== directModelName
    ) {
      if (isDirectSupermodelCreatureAnimationPlayable(renderPackage, selectedOption)) {
        return {
          label: "selected clip",
          detail: "retargeted supermodel playback"
        };
      }
      return {
        label: "safe pose",
        detail: "selected supermodel clip guarded"
      };
    }
    if (
      viewportModelLabel === "direct model" &&
      isDirectSourceSkinnedCreatureAnimationGuarded(renderPackage, selectedOption)
    ) {
      return {
        label: "selected clip",
        detail: "source skinning playback"
      };
    }
    if (
      viewportModelLabel === "direct model" &&
      isDirectSimpleCreatureAnimationGuarded(renderPackage, selectedOption)
    ) {
      return {
        label: "safe pose",
        detail: "selected direct-source clip guarded"
      };
    }
    return {
      label: "selected clip",
      detail: "direct model playback"
    };
  }
  return {
    label: "auto idle",
    detail: "direct model idle preview"
  };
}

export function CreaturesModeRightPanel({
  activePayload,
  activePreviewObject,
  previewErrorMessage,
  onSelectedAnimationNameChange,
  onSelectedAnimationStateChange
}: CreaturesModeRightPanelProps) {
  if (previewErrorMessage) {
    return (
      <article className="sidebar-section workspace-sidebar-minimal" aria-label="creatures mode inspector">
        <h2>Creatures Mode</h2>
        <p>{previewErrorMessage}</p>
      </article>
    );
  }

  if (!activePreviewObject) {
    return (
      <article className="sidebar-section workspace-sidebar-minimal" aria-label="creatures mode inspector">
        <h2>Creatures Mode</h2>
        <p>Select a creature to inspect its Aurora render contract.</p>
      </article>
    );
  }

  if (!activePayload) {
    return (
      <article className="sidebar-section workspace-sidebar-minimal" aria-label="creatures mode inspector">
        <h2>Creatures Mode</h2>
        <p>
          templateId: <strong>{activePreviewObject.id}</strong>
        </p>
        <p>
          resref: <strong>{activePreviewObject.resRef}</strong>
        </p>
        <p>Loading render payload...</p>
      </article>
    );
  }

  const renderPackage = activePayload.renderPackage;
  const diagnosticsCount = renderPackage?.diagnostics.length ?? 0;
  const sourceModelCount = renderPackage?.sourceModelCandidates.length ?? 0;
  const skeletonModelCount = renderPackage?.skeletonModelCandidates.length ?? 0;
  const skeletonModelUrlCount =
    renderPackage?.skeletonModelCandidates.filter(hasCandidateModelUrl).length ?? 0;
  const partModelCount = renderPackage?.partModelCandidates.length ?? 0;
  const partModelUrlCount =
    renderPackage?.partModelCandidates.filter(hasCandidateModelUrl).length ?? 0;
  const textureCount = renderPackage?.textureUrls?.length ?? 0;
  const viewportModelLabel = resolveCreatureViewportModelLabel(renderPackage);

  return (
    <article className="sidebar-section workspace-sidebar-minimal" aria-label="creatures mode inspector">
      <h2>Creatures Mode</h2>
      <p>
        templateId: <strong>{activePayload.templateId}</strong>
      </p>
      <p>
        resref: <strong>{activePayload.creature.resref}</strong>
      </p>
      <p>
        category: <strong>{activePayload.creature.category}</strong>
      </p>
      <p>
        status: <strong>{renderPackage?.status ?? "missing"}</strong>
      </p>
      <p>
        model URL: <strong>{renderPackage?.modelUrl || renderPackage?.glbUrl ? "yes" : "no"}</strong>
      </p>
      <p>
        viewport model: <strong>{viewportModelLabel}</strong>
      </p>
      <p>
        source models: <strong>{sourceModelCount}</strong>
      </p>
      <p>
        skeleton models:{" "}
        <strong>
          {skeletonModelUrlCount}/{skeletonModelCount}
        </strong>
      </p>
      <p>
        part models:{" "}
        <strong>
          {partModelUrlCount}/{partModelCount}
        </strong>
      </p>
      <p>
        texture URLs: <strong>{textureCount}</strong>
      </p>
      <p>
        asset refs: <strong>{countAssetRefs(activePayload)}</strong>
      </p>
      <p>
        diagnostics: <strong>{diagnosticsCount}</strong>
      </p>
      <CreatureAppearanceProfileSummary appearanceProfile={renderPackage?.appearanceProfile} />
      <CreatureModelCandidateSummary renderPackage={renderPackage} />
      <CreaturePipelineEvidenceSummary renderPackage={renderPackage} />
      <CreatureAnimationSelector
        activePreviewObject={activePreviewObject}
        renderPackage={renderPackage}
        onSelectedAnimationNameChange={onSelectedAnimationNameChange}
        onSelectedAnimationStateChange={onSelectedAnimationStateChange}
      />
      <CreatureSourceMdlInspectionSummary renderPackage={renderPackage} />
      <CreatureSourceMdlFeatureSummary renderPackage={renderPackage} />
      <CreatureDiagnosticsSummary diagnostics={renderPackage?.diagnostics} />
      <CreatureBodyPartSummary bodyParts={renderPackage?.bodyParts} />
      <CreaturePltLayerSummary colors={renderPackage?.colors} />
    </article>
  );
}
