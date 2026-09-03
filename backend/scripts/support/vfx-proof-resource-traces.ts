import type { VfxResourceTraceInput } from "../../src/modules/vfx/application/vfx-processing.types";
import { isAuroraVfxNoTextureToken } from "../../src/modules/vfx/domain/aurora-vfx-dependency-graph";

export interface VfxProofManifestResource {
  resref: string;
  type: string;
  path: string;
  sha256: string;
}

export interface VfxProofEmitterResourceSource {
  nodeName: string;
  sourceModelFileName?: string;
  sourceModelObjectKey?: string;
  texture?: string;
  textureRaw?: string;
  texture0?: string;
  chunkName?: string;
}

export interface BuildVfxProofResourceTracesInput {
  sourceModelFileName: string;
  sourceObjectKeyPrefix: string;
  emitters: readonly VfxProofEmitterResourceSource[];
  resources: readonly VfxProofManifestResource[];
}

export function buildVfxProofResourceTraces(
  input: BuildVfxProofResourceTracesInput
): VfxResourceTraceInput[] {
  const traces: VfxResourceTraceInput[] = [];
  const resourcesByTypeAndRef = new Map(
    input.resources.map((resource) => [resourceKey(resource.type, resource.resref), resource] as const)
  );
  const sourceModelRef = stripKnownResourceExtension(input.sourceModelFileName);
  const sourceModel = resourcesByTypeAndRef.get(resourceKey("mdl", sourceModelRef));

  if (sourceModel) {
    traces.push(
      buildTrace(
        "model",
        sourceModelRef,
        sourceModel,
        undefined,
        input.sourceObjectKeyPrefix
      ),
      buildTrace(
        "source_model",
        input.sourceModelFileName,
        sourceModel,
        undefined,
        input.sourceObjectKeyPrefix
      )
    );
  }

  for (const emitter of input.emitters) {
    const ownerPath = `mdl:${
      emitter.sourceModelFileName ?? emitter.sourceModelObjectKey ?? input.sourceModelFileName
    }/emitter:${emitter.nodeName}`;
    addTextureTraces(
      traces,
      resourcesByTypeAndRef,
      emitter.textureRaw ?? emitter.texture,
      "texture",
      ownerPath,
      input.sourceObjectKeyPrefix
    );
    addTextureTraces(
      traces,
      resourcesByTypeAndRef,
      emitter.texture0,
      "texture0",
      ownerPath,
      input.sourceObjectKeyPrefix
    );

    const chunkRef = emitter.chunkName?.trim();
    if (chunkRef) {
      const chunkResource = resourcesByTypeAndRef.get(
        resourceKey("mdl", stripKnownResourceExtension(chunkRef))
      );
      if (chunkResource) {
        traces.push(
          buildTrace(
            "chunk_model",
            chunkRef,
            chunkResource,
            `${ownerPath}/chunkName`,
            input.sourceObjectKeyPrefix
          )
        );
      }
    }
  }

  return deduplicateTraces(traces);
}

function addTextureTraces(
  traces: VfxResourceTraceInput[],
  resourcesByTypeAndRef: ReadonlyMap<string, VfxProofManifestResource>,
  rawRef: string | undefined,
  fieldName: "texture" | "texture0",
  ownerPath: string,
  sourceObjectKeyPrefix: string
): void {
  const requestedRef = rawRef?.trim();
  if (!requestedRef || isAuroraVfxNoTextureToken(requestedRef)) {
    return;
  }
  const normalizedRef = stripKnownResourceExtension(requestedRef);
  const textureResource = ["tga", "dds", "plt"]
    .map((type) => resourcesByTypeAndRef.get(resourceKey(type, normalizedRef)))
    .find((resource) => resource !== undefined);
  if (textureResource) {
    traces.push(
      buildTrace(
        "texture",
        requestedRef,
        textureResource,
        `${ownerPath}/${fieldName}`,
        sourceObjectKeyPrefix
      )
    );
  }

  const txiResource = resourcesByTypeAndRef.get(resourceKey("txi", normalizedRef));
  if (txiResource) {
    traces.push(
      buildTrace(
        "txi",
        `${normalizedRef}.txi`,
        txiResource,
        `${ownerPath}/${fieldName}.txi`,
        sourceObjectKeyPrefix
      )
    );
  }
}

function buildTrace(
  requestedResourceClass: VfxResourceTraceInput["requestedResourceClass"],
  requestedRef: string,
  resource: VfxProofManifestResource,
  ownerPath: string | undefined,
  sourceObjectKeyPrefix: string
): VfxResourceTraceInput {
  return {
    requestedResourceClass,
    requestedRef,
    ...(ownerPath ? { ownerPath } : {}),
    selectedCandidate: {
      candidateId: `nwn-ee-retail-key-bif:${resource.type.toLowerCase()}:${resource.resref.toLowerCase()}`,
      sourceLayer: "vanilla",
      resourceKey: resourceFileName(resource.path).toLowerCase(),
      sourcePath: `${sourceObjectKeyPrefix.replace(/\/$/u, "")}/${resourceFileName(resource.path)}`,
      resourceHash: resource.sha256,
      precedenceRank: 0
    }
  };
}

function deduplicateTraces(traces: VfxResourceTraceInput[]): VfxResourceTraceInput[] {
  const seen = new Set<string>();
  return traces.filter((trace) => {
    const identity = [
      trace.requestedResourceClass,
      trace.requestedRef.trim().toLowerCase(),
      trace.ownerPath ?? ""
    ].join("|");
    if (seen.has(identity)) {
      return false;
    }
    seen.add(identity);
    return true;
  });
}

function resourceKey(type: string, resref: string): string {
  return `${type.trim().toLowerCase()}:${stripKnownResourceExtension(resref)}`;
}

function stripKnownResourceExtension(value: string): string {
  return value
    .trim()
    .replace(/\.(tga|dds|plt|txi|mtr|mdl|mdb|wav|bmu)$/iu, "")
    .toLowerCase();
}

function resourceFileName(path: string): string {
  return path.replace(/\\/gu, "/").split("/").at(-1) ?? path;
}
