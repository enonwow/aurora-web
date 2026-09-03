import type { SceneObject, SceneObjectVfxPreservePayload } from "../contracts";
import { summarizeAuroraVfxDiagnosticGroups } from "../../scene/domain/auroraVfxPayload";
import { resolveAuroraVfxClaimState } from "../../scene/domain/auroraVfxClaimState";
import {
  buildVfxPayloadFromRenderPayload
} from "../../placeables/application/placeableVfxPreservePayload";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import { resolvePlaceableModelResolution } from "../application/workspacePlaceableRenderContracts";

type MetadataPrimitive = string | number | boolean;

const PLACEABLE_TWO_DA_LIGHT_RADIUS_LABEL = "10 (fx_placeable01/AuroraLight01)";
const PLACEABLE_TWO_DA_LIGHT_FALLOFF_LABEL = "max(0, 1 - distance/radius)";
const PLACEABLE_TWO_DA_LIGHT_RADIUS_TITLE =
  "nwmain.exe CNWCArea::AddPlaceableObjectLight uses fx_placeable01/AuroraLight01; nwn_base.key fx_placeable01.mdl radius 10, shadowradius 15, verticaldisplacement 3; decompiled_all.c:866543-866563 proves linear active-light falloff";
const PLACEABLE_TWO_DA_SHADOW_SELECTION_TITLE =
  "nwmain.exe 0x1408708c0..0x140870b0a CNWPlaceable::LoadLight maps ShadowSize 0->Fx_Shadow_S, 2->Fx_Shadow_L, otherwise Fx_Shadow_M";
const PLACEABLE_TWO_DA_SHADOW_PROJECTION_TITLE =
  "Fx_Shadow_* MDL selection and emitter metadata are source-backed; exact retail shadow-volume/projection pixel parity remains blocked";

interface PlaceablesModeRightPanelProps {
  activePayload: PlaceableViewportRenderPayload | null;
  activePreviewObject: SceneObject | null;
  previewErrorMessage: string | null;
}

function resolveSceneObjectPreviewVfxPayload(
  object: SceneObject | null
): SceneObjectVfxPreservePayload | null {
  return object?.kind === "placeables" ? (object.vfxPayload ?? null) : null;
}

function resolveVfxDiagnosticSummary(
  payload: SceneObjectVfxPreservePayload
): { label: string; title: string } | null {
  const diagnosticCodes = payload.diagnostics.map((diagnostic) => diagnostic.code);
  const visibleDiagnosticCodes = diagnosticCodes.slice(0, 2);
  if (visibleDiagnosticCodes.length < 1) {
    return null;
  }
  return {
    label: `${visibleDiagnosticCodes.join(", ")}${
      diagnosticCodes.length > visibleDiagnosticCodes.length
        ? ` +${diagnosticCodes.length - visibleDiagnosticCodes.length}`
        : ""
    }`,
    title: diagnosticCodes.join(", ")
  };
}

function resolveVfxContractStatus(payload: SceneObjectVfxPreservePayload): string {
  const { rendererEligibility, retailParityStatus } = resolveAuroraVfxClaimState(
    payload.auroraPayload,
    payload.canonicalStatus
  );
  return `${rendererEligibility} / retail ${retailParityStatus}`;
}

function readMetadataString(
  metadata: Record<string, MetadataPrimitive> | undefined,
  key: string
): string | null {
  const value = metadata?.[key];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function readMetadataNumber(
  metadata: Record<string, MetadataPrimitive> | undefined,
  key: string
): number | null {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatLightNumber(value: number | null): string {
  if (value === null) {
    return "-";
  }
  return Number(value.toFixed(6)).toString();
}

function formatLightColorSwatch(red: number | null, green: number | null, blue: number | null): string | null {
  if (red === null || green === null || blue === null) {
    return null;
  }
  const maxChannel = Math.max(red, green, blue);
  if (!Number.isFinite(maxChannel) || maxChannel <= 0) {
    return null;
  }
  const toByte = (value: number) =>
    Math.round(Math.min(1, Math.max(0, value / maxChannel)) * 255);
  return `rgb(${toByte(red)}, ${toByte(green)}, ${toByte(blue)})`;
}

function resolveShadowSizeAssetLabel(shadowSize: number | null): string {
  if (shadowSize === null) {
    return "-";
  }
  const lane = Math.trunc(shadowSize);
  if (lane === 0) {
    return "Fx_Shadow_S (fx_shadow_s.mdl)";
  }
  if (lane === 2) {
    return "Fx_Shadow_L (fx_shadow_l.mdl)";
  }
  return "Fx_Shadow_M (fx_shadow_m.mdl)";
}

function resolvePlaceableLightInspector(
  payload: PlaceableViewportRenderPayload
): {
  colorLabel: string;
  colorSwatchColor: string | null;
  colorTitle: string;
  colorSwatchAriaLabel: string;
  sourceRgbLabel: string;
  toolsetRgbLabel: string | null;
  offsetLabel: string;
  shadowSizeLabel: string;
  shadowAssetLabel: string;
  shadowAssetTitle: string;
  shadowProjectionLabel: string;
  shadowProjectionTitle: string;
  lightStateLabel: string;
  radiusLabel: string;
  falloffLabel: string;
  radiusTitle: string;
} | null {
  const metadata = payload.placeable.metadata;
  const colorRaw = readMetadataString(metadata, "source2daLightColorRaw");
  const colorRow = readMetadataNumber(metadata, "source2daLightColorRow");
  if (!colorRaw && colorRow === null) {
    return null;
  }

  const colorName = readMetadataString(metadata, "source2daLightColorLabel") ?? colorRaw ?? "row";
  const red = readMetadataNumber(metadata, "source2daLightRed");
  const green = readMetadataNumber(metadata, "source2daLightGreen");
  const blue = readMetadataNumber(metadata, "source2daLightBlue");
  const toolsetRed = readMetadataNumber(metadata, "source2daToolsetRed");
  const toolsetGreen = readMetadataNumber(metadata, "source2daToolsetGreen");
  const toolsetBlue = readMetadataNumber(metadata, "source2daToolsetBlue");
  const hasToolsetColor = toolsetRed !== null && toolsetGreen !== null && toolsetBlue !== null;
  const displayRed = hasToolsetColor ? toolsetRed : red;
  const displayGreen = hasToolsetColor ? toolsetGreen : green;
  const displayBlue = hasToolsetColor ? toolsetBlue : blue;
  const offsetX = readMetadataNumber(metadata, "source2daLightOffsetX");
  const offsetY = readMetadataNumber(metadata, "source2daLightOffsetY");
  const offsetZ = readMetadataNumber(metadata, "source2daLightOffsetZ");
  const shadowSize = readMetadataNumber(metadata, "source2daShadowSize");
  const lightState = payload.placeable.placeableRuntime?.state?.lightState;
  const sourceRgbLabel = `${formatLightNumber(red)}, ${formatLightNumber(green)}, ${formatLightNumber(blue)}`;
  const toolsetRgbLabel = hasToolsetColor
    ? `${formatLightNumber(toolsetRed)}, ${formatLightNumber(toolsetGreen)}, ${formatLightNumber(toolsetBlue)}`
    : null;

  return {
    colorLabel: `${colorName}${colorRow !== null ? ` #${colorRow}` : ""}`,
    colorSwatchColor: formatLightColorSwatch(displayRed, displayGreen, displayBlue),
    colorTitle: hasToolsetColor
      ? `lightcolor.2da TOOLSET RGB ${toolsetRgbLabel}`
      : `lightcolor.2da RGB ${sourceRgbLabel}`,
    colorSwatchAriaLabel: hasToolsetColor
      ? `lightcolor.2da toolset color swatch ${colorName}${colorRow !== null ? ` #${colorRow}` : ""}`
      : `lightcolor.2da color swatch ${colorName}${colorRow !== null ? ` #${colorRow}` : ""}`,
    sourceRgbLabel,
    toolsetRgbLabel,
    offsetLabel: `${formatLightNumber(offsetX)}, ${formatLightNumber(offsetY)}, ${formatLightNumber(offsetZ)}`,
    shadowSizeLabel: formatLightNumber(shadowSize),
    shadowAssetLabel: resolveShadowSizeAssetLabel(shadowSize),
    shadowAssetTitle: PLACEABLE_TWO_DA_SHADOW_SELECTION_TITLE,
    shadowProjectionLabel: "preview proxy; retail parity blocked",
    shadowProjectionTitle: PLACEABLE_TWO_DA_SHADOW_PROJECTION_TITLE,
    lightStateLabel:
      typeof lightState === "number" && Number.isFinite(lightState)
        ? Math.trunc(lightState) === 0
          ? "off (0)"
          : `on (${Math.trunc(lightState)})`
        : "default on",
    radiusLabel: PLACEABLE_TWO_DA_LIGHT_RADIUS_LABEL,
    falloffLabel: PLACEABLE_TWO_DA_LIGHT_FALLOFF_LABEL,
    radiusTitle: PLACEABLE_TWO_DA_LIGHT_RADIUS_TITLE
  };
}

export function PlaceablesModeRightPanel({
  activePayload,
  activePreviewObject,
  previewErrorMessage
}: PlaceablesModeRightPanelProps) {
  if (previewErrorMessage) {
    return (
      <article className="sidebar-section workspace-sidebar-minimal" aria-label="placeables mode inspector">
        <h2>Placeables Mode</h2>
        <p>{previewErrorMessage}</p>
      </article>
    );
  }

  if (!activePayload) {
    const pendingVfxPayload =
      resolveSceneObjectPreviewVfxPayload(activePreviewObject) ?? null;
    const pendingVfxDiagnosticSummary = pendingVfxPayload
      ? resolveVfxDiagnosticSummary(pendingVfxPayload)
      : null;
    const pendingVfxDiagnosticGroupSummary = pendingVfxPayload
      ? summarizeAuroraVfxDiagnosticGroups(pendingVfxPayload.auroraPayload)
      : null;
    if (pendingVfxPayload) {
      return (
        <article className="sidebar-section workspace-sidebar-minimal" aria-label="placeables mode inspector">
          <h2>Placeables Mode</h2>
          <p>
            Status: <strong>{resolveVfxContractStatus(pendingVfxPayload)} (asset loading)</strong>
          </p>
          <p>Type: vfx / subtype: vfx</p>
          <p>
            Model URL: <strong>not rendered for VFX</strong>
          </p>
          <p>
            Texture URLs: <strong>loading</strong>
          </p>
          <p>
            Preview mode: <strong>{pendingVfxPayload.previewMode}</strong>
          </p>
          {pendingVfxDiagnosticSummary ? (
            <p>
              VFX diagnostics:{" "}
              <strong title={pendingVfxDiagnosticSummary.title}>
                {pendingVfxDiagnosticSummary.label}
              </strong>
            </p>
          ) : null}
          {pendingVfxDiagnosticGroupSummary ? (
            <p>
              VFX diagnostic groups:{" "}
              <strong title={pendingVfxDiagnosticGroupSummary.title}>
                {pendingVfxDiagnosticGroupSummary.label}
              </strong>
            </p>
          ) : null}
        </article>
      );
    }
    return (
      <article className="sidebar-section workspace-sidebar-minimal" aria-label="placeables mode inspector">
        <h2>Placeables Mode</h2>
        <p>Loading render payload...</p>
      </article>
    );
  }

  const modelResolution = resolvePlaceableModelResolution(activePayload);
  const render = activePayload.placeable.render;
  const renderPackage = activePayload.renderPackage;
  const textureCount = Array.isArray(renderPackage?.textureUrls) ? renderPackage.textureUrls.length : 0;
  const vfxPayload = render.isVfx
    ? buildVfxPayloadFromRenderPayload(activePayload)
    : undefined;
  const statusLabel = vfxPayload
    ? vfxPayload.extra.visiblePreview === false
      ? `${resolveVfxContractStatus(vfxPayload)} (source only)`
      : `${resolveVfxContractStatus(vfxPayload)} (asset ${renderPackage?.status ?? "none"})`
    : (renderPackage?.status ?? "none");
  const modelUrlLabel = vfxPayload
    ? "not rendered for VFX"
    : modelResolution.modelUrl
      ? "yes"
      : "no";
  const vfxDiagnosticSummary = vfxPayload
    ? resolveVfxDiagnosticSummary(vfxPayload)
    : null;
  const vfxDiagnosticGroupSummary = vfxPayload
    ? summarizeAuroraVfxDiagnosticGroups(vfxPayload.auroraPayload)
    : null;
  const lightInspector = resolvePlaceableLightInspector(activePayload);

  return (
    <article className="sidebar-section workspace-sidebar-minimal" aria-label="placeables mode inspector">
      <h2>Placeables Mode</h2>
      <p>
        Status: <strong>{statusLabel}</strong>
      </p>
      <p>
        Type: {render.frontendType} / subtype: {activePayload.placeable.placeableSubtype}
      </p>
      <p>
        Model URL: <strong>{modelUrlLabel}</strong>
      </p>
      <p>
        Texture URLs: <strong>{textureCount}</strong>
      </p>
      {lightInspector ? (
        <>
          <p>
            LightColor:{" "}
            <span className="placeable-light-color-chip">
              {lightInspector.colorSwatchColor ? (
                <span
                  aria-label={lightInspector.colorSwatchAriaLabel}
                  className="placeable-light-color-swatch"
                  role="img"
                  style={{ backgroundColor: lightInspector.colorSwatchColor }}
                  title={lightInspector.colorTitle}
                />
              ) : null}
              <strong title={lightInspector.colorTitle}>{lightInspector.colorLabel}</strong>
            </span>
          </p>
          <p>
            RGB: <strong>{lightInspector.sourceRgbLabel}</strong>
          </p>
          {lightInspector.toolsetRgbLabel ? (
            <p>
              Toolset RGB: <strong>{lightInspector.toolsetRgbLabel}</strong>
            </p>
          ) : null}
          <p>
            LightOffset: <strong>{lightInspector.offsetLabel}</strong>
          </p>
          <p>
            ShadowSize: <strong>{lightInspector.shadowSizeLabel}</strong>
          </p>
          <p>
            Shadow asset:{" "}
            <strong title={lightInspector.shadowAssetTitle}>{lightInspector.shadowAssetLabel}</strong>
          </p>
          <p>
            Shadow projection:{" "}
            <strong title={lightInspector.shadowProjectionTitle}>
              {lightInspector.shadowProjectionLabel}
            </strong>
          </p>
          <p>
            LightState: <strong>{lightInspector.lightStateLabel}</strong>
          </p>
          <p>
            Radius: <strong title={lightInspector.radiusTitle}>{lightInspector.radiusLabel}</strong>
          </p>
          <p>
            Falloff: <strong title={lightInspector.radiusTitle}>{lightInspector.falloffLabel}</strong>
          </p>
        </>
      ) : null}
      {vfxPayload ? (
        <p>
          Preview mode: <strong>{vfxPayload.previewMode}</strong>
        </p>
      ) : null}
      {vfxPayload?.extra.visiblePreview === false ? (
        <p>
          Visible preview: <strong>none (source only)</strong>
        </p>
      ) : null}
      {vfxDiagnosticSummary ? (
        <p>
          VFX diagnostics:{" "}
          <strong title={vfxDiagnosticSummary.title}>{vfxDiagnosticSummary.label}</strong>
        </p>
      ) : null}
      {vfxDiagnosticGroupSummary ? (
        <p>
          VFX diagnostic groups:{" "}
          <strong title={vfxDiagnosticGroupSummary.title}>
            {vfxDiagnosticGroupSummary.label}
          </strong>
        </p>
      ) : null}
      {!vfxPayload && modelResolution.fallbackReason ? (
        <p>Fallback reason: {modelResolution.fallbackReason}</p>
      ) : null}
    </article>
  );
}
