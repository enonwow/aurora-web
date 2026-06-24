import type { SceneObject, SceneObjectVfxPreservePayload } from "../contracts";
import { summarizeAuroraVfxDiagnosticGroups } from "../../scene/domain/auroraVfxPayload";
import {
  buildVfxPayloadFromPlaceablePreview,
  buildVfxPayloadFromRenderPayload
} from "../../placeables/application/placeableVfxPreservePayload";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import { resolvePlaceableModelResolution } from "../application/workspacePlaceableRenderContracts";

interface PlaceablesModeRightPanelProps {
  activePayload: PlaceableViewportRenderPayload | null;
  activePreviewObject: SceneObject | null;
  previewErrorMessage: string | null;
}

function resolveSceneObjectPreviewVfxPayload(
  object: SceneObject | null
): SceneObjectVfxPreservePayload | null {
  if (!object || object.kind !== "placeables") {
    return null;
  }
  if (object.vfxPayload) {
    return object.vfxPayload;
  }
  const templateId = object.id.startsWith("preview:")
    ? object.id.slice("preview:".length)
    : object.id;
  return buildVfxPayloadFromPlaceablePreview({
    templateId,
    resref: object.resRef,
    name: object.name ?? object.tag,
    kind: "placeables"
  }) ?? null;
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
            Status: <strong>{pendingVfxPayload.canonicalStatus} (asset loading)</strong>
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
  const vfxPayload = buildVfxPayloadFromRenderPayload(activePayload);
  const statusLabel = vfxPayload
    ? vfxPayload.extra.visiblePreview === false
      ? `${vfxPayload.canonicalStatus} (source only)`
      : `${vfxPayload.canonicalStatus} (asset ${renderPackage?.status ?? "none"})`
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
