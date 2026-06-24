import * as THREE from "three";
import type { PlaceableViewportRenderPayload } from "../../../placeables/application/placeableRenderPayloadResolver";
import type { SceneObjectKind } from "../../contracts";
import type { RuntimeState } from "./workspaceThreeRuntime";

export const PLACEABLE_MODEL_STATUS_EVENT = "workspace:placeable-model-status";
const AURORA_ALPHA_COMPANION_BASE_ALPHA_COLOR_SCALE = 0.55;
const AURORA_WHITE_ALPHA_MASK_COLOR_SCALE = 0.55;
let auroraLightHaloTexture: THREE.CanvasTexture | null | undefined;

export interface PlaceableModelStatusEventDetail {
  status: string;
  [key: string]: string | number;
}

export function decoratePlaceableModelForObjectSelection(
  model: THREE.Object3D,
  objectId: string,
  objectKind: SceneObjectKind,
  objectLabel: string
): void {
  model.traverse((node) => {
    node.userData = {
      ...node.userData,
      objectId,
      objectKind,
      objectLabel
    };
  });
}

export function createPlaceableGeometryFromPayload(
  payload: PlaceableViewportRenderPayload,
  objectRadius: number
): THREE.BufferGeometry {
  if (isPlaceableVfxPayload(payload)) {
    return createPlaceableVfxGeometryFromPayload(payload, objectRadius);
  }

  if (shouldUseLowProfilePlaceableFallback(payload)) {
    return createPlaceableFallbackGeometry(objectRadius);
  }

  const renderContract = payload.placeable.render;
  if (renderContract.frontendType === "door" || renderContract.isDoor) {
    return new THREE.BoxGeometry(objectRadius * 0.9, objectRadius * 2.3, objectRadius * 0.34);
  }
  if (renderContract.frontendType === "vfx" || renderContract.isVfx) {
    return new THREE.OctahedronGeometry(objectRadius * 0.88, 0);
  }
  switch (payload.placeable.placeableSubtype) {
    case "door":
      return new THREE.BoxGeometry(objectRadius * 0.9, objectRadius * 2.3, objectRadius * 0.34);
    case "container":
      return new THREE.BoxGeometry(objectRadius * 1.2, objectRadius * 1.0, objectRadius * 1.0);
    case "light_source":
      return new THREE.ConeGeometry(objectRadius * 0.64, objectRadius * 1.9, 20);
    case "trigger_proxy":
      return new THREE.CylinderGeometry(
        objectRadius * 0.82,
        objectRadius * 0.82,
        objectRadius * 0.55,
        20
      );
    case "vfx":
      return new THREE.OctahedronGeometry(objectRadius * 0.88, 0);
    case "generic":
    default:
      return createPlaceableFallbackGeometry(objectRadius);
  }
}

export function createPlaceableFallbackGeometry(objectRadius: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(objectRadius * 0.92, objectRadius * 0.08, objectRadius * 0.92);
}

export function isPlaceableVfxPayload(payload: PlaceableViewportRenderPayload): boolean {
  const renderContract = payload.placeable.render;
  return (
    renderContract.frontendType === "vfx" ||
    renderContract.isVfx ||
    payload.placeable.placeableSubtype === "vfx"
  );
}

function isAlphaOnlyTexture(texture: THREE.Texture): boolean {
  const image = texture.image as { data?: ArrayLike<number> } | undefined;
  const data = image?.data;
  if (!data || data.length < 4) {
    return false;
  }
  const pixelCount = Math.floor(data.length / 4);
  const sampleCount = Math.min(pixelCount, 2048);
  const step = Math.max(1, Math.floor(pixelCount / sampleCount));
  let alphaSamples = 0;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const jitter = step > 1 ? (sampleIndex * 97) % step : 0;
    const pixelIndex = Math.min(pixelCount - 1, sampleIndex * step + jitter);
    const offset = pixelIndex * 4;
    const red = Number(data[offset] ?? 0);
    const green = Number(data[offset + 1] ?? 0);
    const blue = Number(data[offset + 2] ?? 0);
    const alpha = Number(data[offset + 3] ?? 255);
    if (red > 4 || green > 4 || blue > 4) {
      return false;
    }
    if (alpha > 4) {
      alphaSamples += 1;
    }
  }
  return alphaSamples > 0;
}

function isWhiteAlphaMaskTexture(texture: THREE.Texture): boolean {
  const image = texture.image as { data?: ArrayLike<number> } | undefined;
  const data = image?.data;
  if (!data || data.length < 16 || !hasMeaningfulTextureAlpha(texture)) {
    return false;
  }
  const pixelCount = Math.floor(data.length / 4);
  const sampleCount = Math.min(pixelCount, 2048);
  const step = Math.max(1, Math.floor(pixelCount / sampleCount));
  let sampled = 0;
  let whiteRgbSamples = 0;
  let variedAlphaSamples = 0;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const jitter = step > 1 ? (sampleIndex * 97) % step : 0;
    const pixelIndex = Math.min(pixelCount - 1, sampleIndex * step + jitter);
    const offset = pixelIndex * 4;
    const red = Number(data[offset] ?? 0);
    const green = Number(data[offset + 1] ?? 0);
    const blue = Number(data[offset + 2] ?? 0);
    const alpha = Number(data[offset + 3] ?? 255);
    sampled += 1;
    if (red >= 224 && green >= 224 && blue >= 224) {
      whiteRgbSamples += 1;
    }
    if (alpha > 8 && alpha < 248) {
      variedAlphaSamples += 1;
    }
  }
  return (
    sampled > 0 &&
    whiteRgbSamples / sampled > 0.72 &&
    variedAlphaSamples / sampled > 0.04
  );
}

function createVisibleTextureFromAlphaOnlyTexture(texture: THREE.Texture): THREE.Texture | null {
  const image = texture.image as {
    data?: ArrayLike<number>;
    width?: number;
    height?: number;
  } | undefined;
  const data = image?.data;
  const width = image?.width;
  const height = image?.height;
  if (!data || !width || !height || width < 1 || height < 1) {
    return null;
  }

  const output = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const sourceOffset = index * 4;
    const targetOffset = index * 4;
    const alpha = Number(data[sourceOffset + 3] ?? 0);
    output[targetOffset] = alpha;
    output[targetOffset + 1] = alpha;
    output[targetOffset + 2] = alpha;
    output[targetOffset + 3] = Math.max(0, Math.min(255, alpha));
  }

  const visibleTexture = new THREE.DataTexture(output, width, height, THREE.RGBAFormat);
  visibleTexture.colorSpace = THREE.SRGBColorSpace;
  visibleTexture.flipY = texture.flipY;
  visibleTexture.wrapS = texture.wrapS;
  visibleTexture.wrapT = texture.wrapT;
  visibleTexture.magFilter = texture.magFilter;
  visibleTexture.minFilter = texture.minFilter;
  visibleTexture.generateMipmaps = texture.generateMipmaps;
  visibleTexture.userData = {
    ...texture.userData,
    auroraConvertedAlphaOnlyTexture: true
  };
  visibleTexture.needsUpdate = true;
  return visibleTexture;
}

function createVisibleTextureFromWhiteAlphaMaskTexture(texture: THREE.Texture): {
  texture: THREE.Texture;
  alphaMap: THREE.Texture;
} | null {
  const image = texture.image as {
    data?: ArrayLike<number>;
    width?: number;
    height?: number;
  } | undefined;
  const data = image?.data;
  const width = image?.width;
  const height = image?.height;
  if (!data || !width || !height || width < 1 || height < 1) {
    return null;
  }

  const output = new Uint8Array(width * height * 4);
  const alphaOutput = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const sourceOffset = index * 4;
    const targetOffset = index * 4;
    const alpha = Math.max(0, Math.min(255, Number(data[sourceOffset + 3] ?? 0)));
    const visibleValue = Math.round(alpha * AURORA_WHITE_ALPHA_MASK_COLOR_SCALE);
    output[targetOffset] = visibleValue;
    output[targetOffset + 1] = visibleValue;
    output[targetOffset + 2] = visibleValue;
    output[targetOffset + 3] = alpha;
    alphaOutput[targetOffset] = alpha;
    alphaOutput[targetOffset + 1] = alpha;
    alphaOutput[targetOffset + 2] = alpha;
    alphaOutput[targetOffset + 3] = 255;
  }

  const visibleTexture = new THREE.DataTexture(output, width, height, THREE.RGBAFormat);
  const alphaMap = new THREE.DataTexture(alphaOutput, width, height, THREE.RGBAFormat);
  visibleTexture.colorSpace = THREE.SRGBColorSpace;
  visibleTexture.flipY = texture.flipY;
  visibleTexture.wrapS = texture.wrapS;
  visibleTexture.wrapT = texture.wrapT;
  visibleTexture.magFilter = texture.magFilter;
  visibleTexture.minFilter = texture.minFilter;
  visibleTexture.generateMipmaps = texture.generateMipmaps;
  alphaMap.flipY = texture.flipY;
  alphaMap.wrapS = texture.wrapS;
  alphaMap.wrapT = texture.wrapT;
  alphaMap.magFilter = texture.magFilter;
  alphaMap.minFilter = texture.minFilter;
  alphaMap.generateMipmaps = texture.generateMipmaps;
  visibleTexture.userData = {
    ...texture.userData,
    auroraConvertedWhiteAlphaMaskTexture: true,
    auroraWhiteAlphaMaskApplication: "source-alpha-visible-mask"
  };
  alphaMap.userData = {
    ...texture.userData,
    auroraConvertedWhiteAlphaMaskTexture: true,
    auroraWhiteAlphaMaskApplication: "source-alpha-alpha-map"
  };
  visibleTexture.needsUpdate = true;
  alphaMap.needsUpdate = true;
  return {
    texture: visibleTexture,
    alphaMap
  };
}

function isBlackKeyedTexture(texture: THREE.Texture): boolean {
  const image = texture.image as { data?: ArrayLike<number> } | undefined;
  const data = image?.data;
  if (!data || data.length < 16) {
    return false;
  }
  const pixelCount = Math.floor(data.length / 4);
  const sampleCount = Math.min(pixelCount, 2048);
  const step = Math.max(1, Math.floor(pixelCount / sampleCount));
  let blackSamples = 0;
  let brightSamples = 0;
  let transparentSamples = 0;
  let sampled = 0;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const jitter = step > 1 ? (sampleIndex * 97) % step : 0;
    const pixelIndex = Math.min(pixelCount - 1, sampleIndex * step + jitter);
    const offset = pixelIndex * 4;
    const red = Number(data[offset] ?? 0);
    const green = Number(data[offset + 1] ?? 0);
    const blue = Number(data[offset + 2] ?? 0);
    const alpha = Number(data[offset + 3] ?? 255);
    const brightness = Math.max(red, green, blue);
    sampled += 1;
    if (alpha < 16) {
      transparentSamples += 1;
    }
    if (brightness <= 24) {
      blackSamples += 1;
    } else if (brightness > 48) {
      brightSamples += 1;
    }
  }
  if (sampled === 0) {
    return false;
  }
  const blackRatio = blackSamples / sampled;
  const brightRatio = brightSamples / sampled;
  const transparentRatio = transparentSamples / sampled;
  return transparentRatio < 0.18 && blackRatio > 0.12 && brightRatio > 0.04;
}

function hasBlackKeyCandidatePixels(texture: THREE.Texture): boolean {
  const image = texture.image as { data?: ArrayLike<number> } | undefined;
  const data = image?.data;
  if (!data || data.length < 16) {
    return false;
  }
  const pixelCount = Math.floor(data.length / 4);
  const sampleCount = Math.min(pixelCount, 2048);
  const step = Math.max(1, Math.floor(pixelCount / sampleCount));
  let blackSamples = 0;
  let brightSamples = 0;
  let transparentSamples = 0;
  let sampled = 0;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const jitter = step > 1 ? (sampleIndex * 97) % step : 0;
    const pixelIndex = Math.min(pixelCount - 1, sampleIndex * step + jitter);
    const offset = pixelIndex * 4;
    const red = Number(data[offset] ?? 0);
    const green = Number(data[offset + 1] ?? 0);
    const blue = Number(data[offset + 2] ?? 0);
    const alpha = Number(data[offset + 3] ?? 255);
    const brightness = Math.max(red, green, blue);
    sampled += 1;
    if (alpha < 16) {
      transparentSamples += 1;
    }
    if (brightness <= 24) {
      blackSamples += 1;
    } else if (brightness > 48) {
      brightSamples += 1;
    }
  }
  if (sampled === 0) {
    return false;
  }
  const blackRatio = blackSamples / sampled;
  const brightRatio = brightSamples / sampled;
  const transparentRatio = transparentSamples / sampled;
  return transparentRatio < 0.18 && blackRatio > 0.04 && brightRatio > 0;
}

function hasMeaningfulTextureAlpha(texture: THREE.Texture): boolean {
  const image = texture.image as { data?: ArrayLike<number> } | undefined;
  const data = image?.data;
  if (!data || data.length < 16) {
    return false;
  }
  const pixelCount = Math.floor(data.length / 4);
  const sampleCount = Math.min(pixelCount, 2048);
  const step = Math.max(1, Math.floor(pixelCount / sampleCount));
  let transparentSamples = 0;
  let sampled = 0;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const jitter = step > 1 ? (sampleIndex * 97) % step : 0;
    const pixelIndex = Math.min(pixelCount - 1, sampleIndex * step + jitter);
    const alpha = Number(data[pixelIndex * 4 + 3] ?? 255);
    sampled += 1;
    if (alpha < 242) {
      transparentSamples += 1;
    }
  }
  return sampled > 0 && transparentSamples / sampled > 0.04;
}

function createVisibleTextureFromBlackKeyTexture(texture: THREE.Texture): {
  texture: THREE.Texture;
  alphaMap: THREE.Texture;
} | null {
  const image = texture.image as {
    data?: ArrayLike<number>;
    width?: number;
    height?: number;
  } | undefined;
  const data = image?.data;
  const width = image?.width;
  const height = image?.height;
  if (!data || !width || !height || width < 1 || height < 1) {
    return null;
  }

  const output = new Uint8Array(width * height * 4);
  const alphaOutput = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const sourceOffset = index * 4;
    const targetOffset = index * 4;
    const red = Number(data[sourceOffset] ?? 0);
    const green = Number(data[sourceOffset + 1] ?? 0);
    const blue = Number(data[sourceOffset + 2] ?? 0);
    const sourceAlpha = Number(data[sourceOffset + 3] ?? 255);
    const brightness = Math.max(red, green, blue);
    const blackKeyCutoff = 24;
    const normalizedBrightness = Math.max(
      0,
      Math.min(1, (brightness - blackKeyCutoff) / (255 - blackKeyCutoff))
    );
    const keyedAlpha =
      brightness <= blackKeyCutoff
        ? 0
        : Math.round(Math.min(255, Math.pow(normalizedBrightness, 0.86) * 255));
    output[targetOffset] = red;
    output[targetOffset + 1] = green;
    output[targetOffset + 2] = blue;
    output[targetOffset + 3] = Math.max(0, Math.min(255, sourceAlpha));
    alphaOutput[targetOffset] = keyedAlpha;
    alphaOutput[targetOffset + 1] = keyedAlpha;
    alphaOutput[targetOffset + 2] = keyedAlpha;
    alphaOutput[targetOffset + 3] = 255;
  }

  const visibleTexture = new THREE.DataTexture(output, width, height, THREE.RGBAFormat);
  const alphaMap = new THREE.DataTexture(alphaOutput, width, height, THREE.RGBAFormat);
  visibleTexture.colorSpace = THREE.SRGBColorSpace;
  visibleTexture.flipY = texture.flipY;
  visibleTexture.wrapS = texture.wrapS;
  visibleTexture.wrapT = texture.wrapT;
  visibleTexture.magFilter = texture.magFilter;
  visibleTexture.minFilter = texture.minFilter;
  visibleTexture.generateMipmaps = texture.generateMipmaps;
  alphaMap.flipY = texture.flipY;
  alphaMap.wrapS = texture.wrapS;
  alphaMap.wrapT = texture.wrapT;
  alphaMap.magFilter = texture.magFilter;
  alphaMap.minFilter = texture.minFilter;
  alphaMap.generateMipmaps = texture.generateMipmaps;
  visibleTexture.userData = {
    ...texture.userData,
    auroraConvertedBlackKeyTexture: true,
    auroraBlackKeyAlphaApplication: "alpha-map-single-pass"
  };
  alphaMap.userData = {
    ...texture.userData,
    auroraConvertedBlackKeyAlphaMap: true,
    auroraBlackKeyAlphaApplication: "alpha-map-single-pass"
  };
  visibleTexture.needsUpdate = true;
  alphaMap.needsUpdate = true;
  return {
    texture: visibleTexture,
    alphaMap
  };
}

function createVisibleTextureFromAlphaCompanionTexture(
  texture: THREE.Texture,
  alphaTexture: THREE.Texture
): {
  texture: THREE.Texture;
  alphaMap: THREE.Texture;
} | null {
  const alphaImage = alphaTexture.image as {
    data?: ArrayLike<number>;
    width?: number;
    height?: number;
  } | undefined;
  const alphaData = alphaImage?.data;
  const width = alphaImage?.width;
  const height = alphaImage?.height;
  if (!alphaData || !width || !height || width < 1 || height < 1) {
    return null;
  }

  const baseImage = texture.image as {
    data?: ArrayLike<number>;
    width?: number;
    height?: number;
  } | undefined;
  const baseWidth =
    typeof baseImage?.width === "number" && baseImage.width > 0 ? baseImage.width : null;
  const baseHeight =
    typeof baseImage?.height === "number" && baseImage.height > 0 ? baseImage.height : null;
  const baseData = baseImage?.data && baseWidth && baseHeight ? baseImage.data : null;
  const useCompanionAlpha = hasMeaningfulTextureAlpha(alphaTexture);
  const useBaseAlpha = baseData ? hasMeaningfulTextureAlpha(texture) : false;
  const output = new Uint8Array(width * height * 4);
  const alphaOutput = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const alphaSourceOffset = index * 4;
    const targetOffset = index * 4;
    const alphaRed = Number(alphaData[alphaSourceOffset] ?? 0);
    const alphaGreen = Number(alphaData[alphaSourceOffset + 1] ?? 0);
    const alphaBlue = Number(alphaData[alphaSourceOffset + 2] ?? 0);
    const companionAlpha = Number(alphaData[alphaSourceOffset + 3] ?? 255);
    const mask = Math.max(
      0,
      Math.min(255, useCompanionAlpha ? companionAlpha : Math.max(alphaRed, alphaGreen, alphaBlue))
    );
    const x = index % width;
    const y = Math.floor(index / width);
    const baseX =
      baseData && baseWidth ? Math.min(baseWidth - 1, Math.floor((x * baseWidth) / width)) : x;
    const baseY =
      baseData && baseHeight ? Math.min(baseHeight - 1, Math.floor((y * baseHeight) / height)) : y;
    const baseOffset =
      baseData && baseWidth ? (baseY * baseWidth + baseX) * 4 : index * 4;
    const baseRed = baseData ? Number(baseData[baseOffset] ?? 255) : mask;
    const baseGreen = baseData ? Number(baseData[baseOffset + 1] ?? 255) : mask;
    const baseBlue = baseData ? Number(baseData[baseOffset + 2] ?? 255) : mask;
    const baseAlpha = baseData && useBaseAlpha ? Number(baseData[baseOffset + 3] ?? 255) : 255;
    const alpha = Math.round((Math.max(0, Math.min(255, baseAlpha)) * mask) / 255);
    const colorMask = mask;
    const colorScale = useBaseAlpha ? AURORA_ALPHA_COMPANION_BASE_ALPHA_COLOR_SCALE : 1;
    output[targetOffset] = Math.round((baseRed * colorMask * colorScale) / 255);
    output[targetOffset + 1] = Math.round((baseGreen * colorMask * colorScale) / 255);
    output[targetOffset + 2] = Math.round((baseBlue * colorMask * colorScale) / 255);
    output[targetOffset + 3] = alpha;
    alphaOutput[targetOffset] = mask;
    alphaOutput[targetOffset + 1] = mask;
    alphaOutput[targetOffset + 2] = mask;
    alphaOutput[targetOffset + 3] = 255;
  }

  const visibleTexture = new THREE.DataTexture(output, width, height, THREE.RGBAFormat);
  const alphaMap = new THREE.DataTexture(alphaOutput, width, height, THREE.RGBAFormat);
  visibleTexture.colorSpace = THREE.SRGBColorSpace;
  visibleTexture.flipY = alphaTexture.flipY;
  visibleTexture.wrapS = alphaTexture.wrapS;
  visibleTexture.wrapT = alphaTexture.wrapT;
  visibleTexture.magFilter = alphaTexture.magFilter;
  visibleTexture.minFilter = alphaTexture.minFilter;
  visibleTexture.generateMipmaps = alphaTexture.generateMipmaps;
  alphaMap.flipY = alphaTexture.flipY;
  alphaMap.wrapS = alphaTexture.wrapS;
  alphaMap.wrapT = alphaTexture.wrapT;
  alphaMap.magFilter = alphaTexture.magFilter;
  alphaMap.minFilter = alphaTexture.minFilter;
  alphaMap.generateMipmaps = alphaTexture.generateMipmaps;
  visibleTexture.userData = {
    ...texture.userData,
    auroraConvertedAlphaCompanionTexture: true,
    auroraAlphaCompanionApplication: useCompanionAlpha ? "source-alpha-channel" : "source-luminance",
    auroraAlphaCompanionColorApplication: baseData
      ? baseWidth === width && baseHeight === height
        ? "base-rgb-multiplied-by-alpha-companion"
        : "base-rgb-resampled-multiplied-by-alpha-companion"
      : "alpha-companion-luminance-visible-map"
  };
  alphaMap.userData = {
    ...alphaTexture.userData,
    auroraConvertedAlphaCompanionTexture: true,
    auroraAlphaCompanionApplication: useCompanionAlpha ? "source-alpha-channel" : "source-luminance"
  };
  visibleTexture.needsUpdate = true;
  alphaMap.needsUpdate = true;
  return {
    texture: visibleTexture,
    alphaMap
  };
}

type ResolvedVfxMaterialTexture = {
  texture: THREE.Texture;
  alphaMap?: THREE.Texture | null;
  sharedTexture: boolean;
  alphaOnlyConverted: boolean;
  blackKeyConverted: boolean;
  alphaCompanionApplied: boolean;
  softAlphaConverted: boolean;
};

interface ResolveVfxMaterialTextureOptions {
  forceBlackKey?: boolean;
  alphaTexture?: THREE.Texture | null;
}

type PlaceableVfxPreviewMaterial = THREE.SpriteMaterial | THREE.MeshBasicMaterial;

const PLACEABLE_VFX_DEFAULT_THREE_RENDER_ORDER = 12;
const AURORA_UNTINTED_TEXTURE_COLOR = new THREE.Color(0xffffff);
const AURORA_SOFT_ALPHA_LIGHTEN_OPACITY_SCALE = 0.28;
const AURORA_EMITTER_SPAWN_RECTANGLE_AXIS_GATE_CM = 4;

interface ResolvedAuroraEmitterAtlas {
  xGridRaw?: number;
  yGridRaw?: number;
  effectiveXGrid: number;
  effectiveYGrid: number;
  fps?: number;
  fpsTimeline?: ResolvedAuroraEmitterNumberKeyframe[];
  frameStart?: number;
  frameStartTimeline?: ResolvedAuroraEmitterNumberKeyframe[];
  frameEnd?: number;
  frameEndTimeline?: ResolvedAuroraEmitterNumberKeyframe[];
  random: boolean;
  frameCapacity: number;
}

interface AuroraAtlasPlaybackBinding {
  atlas: ResolvedAuroraEmitterAtlas;
  frameSeed: number;
  nowBaseMs: number;
  ageSeconds?: number;
}

interface AuroraAtlasFrameAddress {
  rawFrame: number;
  frame: number;
  column: number;
  row: number;
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

interface AuroraAtlasFrameRangeState {
  frameStart: number;
  frameEnd: number;
  frameRange: number;
  direction: 1 | -1;
}

interface AuroraAtlasCheckpointFrameState {
  rawFrame: number;
  frameStep: number;
  checkpointElapsedSeconds: number;
  secondsPerFrame?: number;
  evaluatedFps?: number;
  frameRangeState?: AuroraAtlasFrameRangeState;
  catchUpSteps: number;
  reset: boolean;
}

interface ResolvedAuroraEmitterSimulation {
  xSize?: number;
  ySize?: number;
  spawnType?: number;
  birthrate?: number;
  lifeExp?: number;
  mass?: number;
  velocity?: number;
  randvel?: number;
  spread?: number;
  particleRot?: number;
  bounce?: boolean;
  bounceCoefficient?: number;
  blastRadius?: number;
  blastLength?: number;
  blurLength?: number;
  blurLengthRaw?: number;
  detonate?: number;
  lightningScale?: number;
  lightningDelay?: number;
  lightningRadius?: number;
  deadspace?: number;
  p2p?: boolean;
  p2pType?: string;
  p2pBezier2?: number;
  p2pBezier3?: number;
  p2pSource?: number;
  p2pTarget?: number;
  combineTime?: number;
  grav?: number;
  drag?: number;
  threshold?: number;
  inherit?: boolean;
  inheritVel?: boolean;
  inheritLocal?: boolean;
  inheritPart?: boolean;
  affectedByWind?: boolean;
  sizeStart?: number;
  sizeMid?: number;
  sizeEnd?: number;
  sizeStartY?: number;
  sizeMidY?: number;
  sizeEndY?: number;
  alphaStart?: number;
  alphaMid?: number;
  alphaEnd?: number;
  colorStart?: [number, number, number];
  colorMid?: [number, number, number];
  colorEnd?: [number, number, number];
  percentStart?: number;
  percentMid?: number;
  percentEnd?: number;
  timeline?: ResolvedAuroraEmitterSimulationTimeline;
  colorTimeline?: ResolvedAuroraEmitterColorTimeline;
}

interface ResolvedAuroraEmitterNumberKeyframe {
  time: number;
  value: number;
}

interface ResolvedAuroraEmitterColorKeyframe {
  time: number;
  value: [number, number, number];
}

interface ResolvedAuroraEmitterVector3Keyframe {
  time: number;
  value: [number, number, number];
}

interface ResolvedAuroraEmitterOrientationKeyframe {
  time: number;
  value: {
    axis: [number, number, number];
    angleRadians: number;
  };
}

interface ResolvedAuroraEmitterAnimationEvent {
  time: number;
  type: string;
  animationName?: string;
}

const AURORA_EMITTER_SIMULATION_TIMELINE_KEYS = [
  "xSize",
  "ySize",
  "birthrate",
  "lifeExp",
  "mass",
  "velocity",
  "randvel",
  "spread",
  "particleRot",
  "blastRadius",
  "blastLength",
  "blurLength",
  "detonate",
  "bounceCoefficient",
  "fps",
  "frameStart",
  "frameEnd",
  "lightningScale",
  "lightningDelay",
  "lightningRadius",
  "p2pBezier2",
  "p2pBezier3",
  "combineTime",
  "grav",
  "drag",
  "threshold",
  "sizeStart",
  "sizeMid",
  "sizeEnd",
  "sizeStartY",
  "sizeMidY",
  "sizeEndY",
  "percentStart",
  "percentMid",
  "percentEnd",
  "alphaStart",
  "alphaMid",
  "alphaEnd"
] as const;

type ResolvedAuroraEmitterSimulationTimelineKey =
  (typeof AURORA_EMITTER_SIMULATION_TIMELINE_KEYS)[number];

type ResolvedAuroraEmitterSimulationTimeline = Partial<
  Record<ResolvedAuroraEmitterSimulationTimelineKey, ResolvedAuroraEmitterNumberKeyframe[]>
>;

type ResolvedAuroraEmitterColorTimelineKey = "colorStart" | "colorMid" | "colorEnd";

type ResolvedAuroraEmitterColorTimeline = Partial<
  Record<ResolvedAuroraEmitterColorTimelineKey, ResolvedAuroraEmitterColorKeyframe[]>
>;

const AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS = new Set<
  ResolvedAuroraEmitterSimulationTimelineKey
>([
  "xSize",
  "ySize",
  "birthrate",
  "lifeExp",
  "randvel",
  "spread",
  "blastRadius",
  "blastLength",
  "blurLength",
  "detonate",
  "fps",
  "frameStart",
  "frameEnd",
  "lightningScale",
  "lightningDelay",
  "lightningRadius",
  "p2pBezier2",
  "p2pBezier3",
  "combineTime",
  "threshold",
  "sizeStart",
  "sizeMid",
  "sizeEnd",
  "sizeStartY",
  "sizeMidY",
  "sizeEndY",
  "percentStart",
  "percentMid",
  "percentEnd",
  "alphaStart",
  "alphaMid",
  "alphaEnd"
]);

function shouldForceVfxBlackKeyFromBlendMode(blendMode: unknown): boolean {
  return typeof blendMode === "string" && /add|additive|light|lighten/iu.test(blendMode);
}

type AuroraEmitterBlendBucket = "normal" | "punch_through" | "fallback_mode_2";

interface ResolvedAuroraEmitterBlendMode {
  raw?: string;
  normalized: string;
  bucket: AuroraEmitterBlendBucket;
  runtimeMode: 0 | 1 | 2;
  shaderVariant: "non-punch" | "punch-through";
  authoringCandidate?: "Lighten";
  diagnostic?: string;
}

type AuroraEmitterRenderModeBucket =
  | "normal"
  | "billboard_to_local_z"
  | "billboard_to_world_z"
  | "linked"
  | "aligned_to_world_z"
  | "aligned_to_particle_dir"
  | "motion_blur"
  | "unknown";

interface ResolvedAuroraEmitterRenderMode {
  raw?: string;
  normalized: string;
  bucket: AuroraEmitterRenderModeBucket;
  runtimeMode?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  diagnostic?: string;
}

function normalizeAuroraEmitterRenderModeToken(renderMode: unknown): string {
  return typeof renderMode === "string"
    ? renderMode.trim().toLowerCase().replace(/[\s-]+/gu, "_")
    : "";
}

function resolveAuroraEmitterRenderMode(
  renderMode: unknown
): ResolvedAuroraEmitterRenderMode {
  const raw =
    typeof renderMode === "string" && renderMode.trim().length > 0
      ? renderMode.trim()
      : undefined;
  const normalized = normalizeAuroraEmitterRenderModeToken(renderMode);
  if (normalized.length === 0 || normalized === "normal" || normalized === "billboard") {
    return {
      ...(raw ? { raw } : {}),
      normalized,
      bucket: "normal",
      runtimeMode: 0
    };
  }
  if (
    normalized.includes("billboard_to_local_z") ||
    normalized.includes("billboard_local_z") ||
    (normalized.includes("billboard") && normalized.includes("local_z"))
  ) {
    return {
      ...(raw ? { raw } : {}),
      normalized,
      bucket: "billboard_to_local_z",
      runtimeMode: 1
    };
  }
  if (
    normalized.includes("billboard_to_world_z") ||
    normalized.includes("billboard_world_z") ||
    normalized.includes("billboard_to_worldz") ||
    normalized.includes("billboard_worldz") ||
    (normalized.includes("billboard") && normalized.includes("world_z"))
  ) {
    return {
      ...(raw ? { raw } : {}),
      normalized,
      bucket: "billboard_to_world_z",
      runtimeMode: 2
    };
  }
  if (normalized.includes("linked")) {
    return {
      ...(raw ? { raw } : {}),
      normalized,
      bucket: "linked",
      runtimeMode: 3
    };
  }
  if (
    normalized.includes("aligned_to_world_z") ||
    normalized.includes("aligned_world_z") ||
    normalized.includes("aligned_to_worldz") ||
    normalized.includes("aligned_worldz")
  ) {
    return {
      ...(raw ? { raw } : {}),
      normalized,
      bucket: "aligned_to_world_z",
      runtimeMode: 4
    };
  }
  if (
    normalized.includes("aligned_to_particle_dir") ||
    normalized.includes("aligned_to_particle") ||
    normalized.includes("aligned_particle") ||
    normalized.includes("particle_dir")
  ) {
    return {
      ...(raw ? { raw } : {}),
      normalized,
      bucket: "aligned_to_particle_dir",
      runtimeMode: 5
    };
  }
  if (normalized.includes("motion_blur") || normalized.includes("motionblur")) {
    return {
      ...(raw ? { raw } : {}),
      normalized,
      bucket: "motion_blur",
      runtimeMode: 6
    };
  }
  return {
    ...(raw ? { raw } : {}),
    normalized,
    bucket: "unknown",
    diagnostic: "VFX_UNKNOWN_RENDER_MODE_RAW_TOKEN_PRESERVED"
  };
}

function normalizeAuroraEmitterBlendModeToken(blendMode: unknown): string {
  return typeof blendMode === "string"
    ? blendMode.trim().toLowerCase().replace(/[\s-]+/gu, "_")
    : "";
}

function resolveAuroraEmitterBlendMode(
  blendMode: unknown
): ResolvedAuroraEmitterBlendMode {
  const raw =
    typeof blendMode === "string" && blendMode.trim().length > 0
      ? blendMode.trim()
      : undefined;
  const normalized = normalizeAuroraEmitterBlendModeToken(blendMode);
  if (normalized.includes("punch")) {
    return {
      ...(raw ? { raw } : {}),
      normalized,
      bucket: "punch_through",
      runtimeMode: 1,
      shaderVariant: "punch-through"
    };
  }
  if (normalized === "normal" || normalized.length === 0) {
    return {
      ...(raw ? { raw } : {}),
      normalized,
      bucket: "normal",
      runtimeMode: 0,
      shaderVariant: "non-punch"
    };
  }
  return {
    ...(raw ? { raw } : {}),
    normalized,
    bucket: "fallback_mode_2",
    runtimeMode: 2,
    shaderVariant: "non-punch",
    ...(normalized.includes("lighten") ? { authoringCandidate: "Lighten" as const } : {}),
    diagnostic: normalized.includes("lighten")
      ? "VFX_LIGHTEN_MODE2_EQUATION_CAPTURE_REQUIRED"
      : "VFX_UNKNOWN_BLEND_MODE2_RAW_TOKEN_PRESERVED"
  };
}

interface AuroraEmitterMaterialBlendState {
  blending: THREE.Blending;
  depthWrite: boolean;
  transparent: boolean;
  alphaTest: number;
  blendEquation?: THREE.BlendingEquation;
  blendSrc?: THREE.BlendingSrcFactor;
  blendDst?: THREE.BlendingDstFactor;
  blendEquationAlpha?: THREE.BlendingEquation | null;
  blendSrcAlpha?: THREE.BlendingSrcFactor | null;
  blendDstAlpha?: THREE.BlendingDstFactor | null;
  previewMode?:
    | "aurora-blend-fallback-mode-2-non-punch-adapter"
    | "aurora-blend-lighten-additive-adapter"
    | "aurora-blend-lighten-alpha-additive-adapter"
    | "aurora-blend-lighten-soft-alpha-adapter"
    | "aurora-blend-punch-through-alpha-test"
    | "aurora-blend-normal-non-punch-adapter";
  auroraBlendMode: ResolvedAuroraEmitterBlendMode;
}

interface AuroraParticleRenderStateRecord {
  rawBlendLiteral?: string;
  runtimeBlendBucket: AuroraEmitterBlendBucket;
  runtimeBlendMode: 0 | 1 | 2;
  transparentLaneState0: boolean;
  punchThroughState1: boolean;
  shaderState2Enabled: true;
  twoSidedCullState3?: boolean;
  lightingState5Restore: true;
  requestedDepthWrite: boolean;
  particleShaderVariantFlag: "non-punch" | "punch-through";
  particleNonPunchVariantFlag: boolean;
  blendFuncWrapperInvoked: boolean;
  blendFuncFactorsCaptured: false;
  renderStateCacheWrapperRequired: true;
  previewMode:
    | "aurora-non-punch-transparent-depthwrite-off-record"
    | "aurora-punch-through-depthwrite-on-record"
    | "aurora-source-opaque-depthwrite-on-record";
  diagnostics: string[];
}

interface AuroraParticleDrawRecord {
  activeParticleCount: number;
  drawParticleCount: number;
  drawVertexCount: number;
  vertexUploadCount: number;
  verticesPerParticle: 6;
  indexedBuffer: false;
  drawApiCandidate: "glDrawArrays";
  drawModeArg: 3;
  drawModeEnumCaptured: false;
  drawModePreview: "triangle-list-shaped-six-vertex-quad";
  previewMode:
    | "aurora-textured-particle-draw-array-record"
    | "aurora-linked-particle-segment-draw-array-record";
  diagnostics: string[];
}

function resolveAuroraParticleRenderStateRecord(
  state: AuroraEmitterMaterialBlendState,
  auroraEmitter?: PlaceableAuroraEmitterNode | null
): AuroraParticleRenderStateRecord {
  const isPunchThrough = state.auroraBlendMode.bucket === "punch_through";
  const twoSidedTexture = auroraEmitter?.sourceState?.twoSidedTexture;
  const sourceOpaque = auroraEmitter?.sourceState?.transparency === false && !isPunchThrough;
  return {
    ...(state.auroraBlendMode.raw ? { rawBlendLiteral: state.auroraBlendMode.raw } : {}),
    runtimeBlendBucket: state.auroraBlendMode.bucket,
    runtimeBlendMode: state.auroraBlendMode.runtimeMode,
    transparentLaneState0: !isPunchThrough && !sourceOpaque,
    punchThroughState1: isPunchThrough,
    shaderState2Enabled: true,
    ...(typeof twoSidedTexture === "boolean" ? { twoSidedCullState3: !twoSidedTexture } : {}),
    lightingState5Restore: true,
    requestedDepthWrite: isPunchThrough || sourceOpaque,
    particleShaderVariantFlag: state.auroraBlendMode.shaderVariant,
    particleNonPunchVariantFlag: !isPunchThrough,
    blendFuncWrapperInvoked: !isPunchThrough && !sourceOpaque,
    blendFuncFactorsCaptured: false,
    renderStateCacheWrapperRequired: true,
    previewMode: isPunchThrough
      ? "aurora-punch-through-depthwrite-on-record"
      : sourceOpaque
        ? "aurora-source-opaque-depthwrite-on-record"
        : "aurora-non-punch-transparent-depthwrite-off-record",
    diagnostics: [
      "VFX_PARTICLE_RENDER_STATE_RECORD_REQUIRED",
      "VFX_RENDER_STATE_CACHE_WRAPPER_REQUIRED",
      "VFX_BLEND_FUNC_FACTORS_CAPTURE_REQUIRED",
      isPunchThrough
        ? "VFX_PUNCH_THROUGH_DEPTHWRITE_LANE_REQUIRED"
        : sourceOpaque
          ? "VFX_SOURCE_TRANSPARENCY_FALSE_OPAQUE_DEPTHWRITE_REQUIRED"
          : "VFX_NONPUNCH_TRANSPARENT_DEPTHWRITE_OFF_REQUIRED",
      ...(typeof twoSidedTexture === "boolean"
        ? ["VFX_TWOSIDEDTEX_STATE3_CULL_LANE_REQUIRED"]
        : [])
    ]
  };
}

function buildAuroraParticleDrawRecord(
  activeParticleCount: number,
  options: { linked?: boolean } = {}
): AuroraParticleDrawRecord {
  const safeActiveParticleCount = Math.max(0, Math.trunc(activeParticleCount));
  const drawParticleCount = options.linked
    ? Math.max(0, safeActiveParticleCount - 1)
    : safeActiveParticleCount;
  return {
    activeParticleCount: safeActiveParticleCount,
    drawParticleCount,
    drawVertexCount: drawParticleCount * 6,
    vertexUploadCount: drawParticleCount * 6,
    verticesPerParticle: 6,
    indexedBuffer: false,
    drawApiCandidate: "glDrawArrays",
    drawModeArg: 3,
    drawModeEnumCaptured: false,
    drawModePreview: "triangle-list-shaped-six-vertex-quad",
    previewMode: options.linked
      ? "aurora-linked-particle-segment-draw-array-record"
      : "aurora-textured-particle-draw-array-record",
    diagnostics: [
      "VFX_PARTICLE_DRAW_RECORD_REQUIRED",
      "VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED",
      "VFX_PARTICLE_DRAW_MODE_ARG3_ENUM_TABLE_CAPTURE_REQUIRED",
      "VFX_PARTICLE_DRAW_TRIANGLE_INFERENCE_NOT_ENUM_PROOF",
      ...(options.linked ? ["VFX_LINKED_DRAW_COUNT_ACTIVE_PARTICLES_MINUS_ONE"] : [])
    ]
  };
}

function applyAuroraParticleDrawRecordUserData(
  target: THREE.Object3D | THREE.Material | THREE.BufferGeometry,
  record: AuroraParticleDrawRecord
): void {
  target.userData = {
    ...target.userData,
    auroraParticleDrawRecord: record,
    auroraParticleDrawPreviewMode: record.previewMode,
    auroraParticleDrawActiveCount: record.activeParticleCount,
    auroraParticleDrawParticleCount: record.drawParticleCount,
    auroraParticleDrawVertexCount: record.drawVertexCount,
    auroraParticleVertexUploadCount: record.vertexUploadCount,
    auroraParticleDrawVerticesPerParticle: record.verticesPerParticle,
    auroraParticleDrawIndexedBuffer: record.indexedBuffer,
    auroraParticleDrawApiCandidate: record.drawApiCandidate,
    auroraParticleDrawModeArg: record.drawModeArg,
    auroraParticleDrawModeEnumCaptured: record.drawModeEnumCaptured,
    auroraParticleDrawModePreview: record.drawModePreview,
    auroraParticleDrawDiagnostics: record.diagnostics
  };
}

function resolveAuroraEmitterMaterialBlendState(
  auroraEmitter: PlaceableAuroraEmitterNode | null
): AuroraEmitterMaterialBlendState {
  const auroraBlendMode = resolveAuroraEmitterBlendMode(auroraEmitter?.blendMode);
  if (auroraBlendMode.bucket === "punch_through") {
    return {
      blending: THREE.NormalBlending,
      depthWrite: true,
      transparent: true,
      alphaTest: 0.5,
      previewMode: "aurora-blend-punch-through-alpha-test",
      auroraBlendMode
    };
  }
  if (auroraBlendMode.authoringCandidate === "Lighten") {
    return {
      blending: THREE.CustomBlending,
      depthWrite: false,
      transparent: true,
      alphaTest: 0,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.AddEquation,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
      previewMode: "aurora-blend-lighten-additive-adapter",
      auroraBlendMode
    };
  }
  return {
    blending: THREE.NormalBlending,
    depthWrite: false,
    transparent: true,
    alphaTest: 0,
    previewMode:
      auroraBlendMode.bucket === "fallback_mode_2"
        ? "aurora-blend-fallback-mode-2-non-punch-adapter"
        : "aurora-blend-normal-non-punch-adapter",
    auroraBlendMode
  };
}

function applyAuroraEmitterMaterialBlendState(
  material: PlaceableVfxPreviewMaterial,
  state: AuroraEmitterMaterialBlendState,
  auroraEmitter?: PlaceableAuroraEmitterNode | null
): void {
  const renderState = resolveAuroraParticleRenderStateRecord(state, auroraEmitter);
  const sourceOpaque =
    auroraEmitter?.sourceState?.transparency === false &&
    state.auroraBlendMode.bucket !== "punch_through";
  material.blending = sourceOpaque ? THREE.NoBlending : state.blending;
  material.depthWrite = sourceOpaque ? true : state.depthWrite;
  material.transparent = sourceOpaque ? false : state.transparent;
  material.alphaTest = Math.max(material.alphaTest, state.alphaTest);
  material.blendEquation = state.blendEquation ?? THREE.AddEquation;
  material.blendSrc = state.blendSrc ?? THREE.SrcAlphaFactor;
  material.blendDst = state.blendDst ?? THREE.OneMinusSrcAlphaFactor;
  material.blendEquationAlpha = state.blendEquationAlpha ?? null;
  material.blendSrcAlpha = state.blendSrcAlpha ?? null;
  material.blendDstAlpha = state.blendDstAlpha ?? null;
  material.userData = {
    ...material.userData,
    auroraEmitterBlendStatePreviewMode: state.previewMode,
    auroraEmitterBlendBucket: state.auroraBlendMode.bucket,
    auroraEmitterBlendRuntimeMode: state.auroraBlendMode.runtimeMode,
    auroraEmitterBlendShaderVariant: state.auroraBlendMode.shaderVariant,
    auroraEmitterBlendAuthoringCandidate: state.auroraBlendMode.authoringCandidate,
    auroraEmitterBlendDiagnostic: state.auroraBlendMode.diagnostic,
    auroraEmitterTransparencyMaterialPreviewMode: sourceOpaque
      ? "source-transparency-false-opaque-material"
      : undefined,
    auroraEmitterTransparencyMaterialDiagnostic: sourceOpaque
      ? "VFX_SOURCE_TRANSPARENCY_FALSE_OPAQUE_DEPTHWRITE_REQUIRED"
      : undefined,
    auroraParticleRenderState: renderState,
    auroraParticleRenderStatePreviewMode: renderState.previewMode,
    auroraParticleRenderStateDiagnostics: renderState.diagnostics,
    auroraParticleTransparentLaneState0: renderState.transparentLaneState0,
    auroraParticlePunchThroughState1: renderState.punchThroughState1,
    auroraParticleShaderState2Enabled: renderState.shaderState2Enabled,
    auroraParticleTwoSidedCullState3: renderState.twoSidedCullState3,
    auroraParticleLightingState5Restore: renderState.lightingState5Restore,
    auroraParticleRequestedDepthWrite: renderState.requestedDepthWrite,
    auroraParticleShaderVariantFlag: renderState.particleShaderVariantFlag,
    auroraParticleNonPunchVariantFlag: renderState.particleNonPunchVariantFlag,
    auroraParticleBlendFuncWrapperInvoked: renderState.blendFuncWrapperInvoked,
    auroraParticleBlendFuncFactorsCaptured: renderState.blendFuncFactorsCaptured,
    auroraParticleRenderStateCacheWrapperRequired: renderState.renderStateCacheWrapperRequired,
    auroraEmitterThreeBlendEquation: state.blendEquation,
    auroraEmitterThreeBlendSrc: state.blendSrc,
    auroraEmitterThreeBlendDst: state.blendDst,
    auroraEmitterThreeBlendEquationAlpha: state.blendEquationAlpha,
    auroraEmitterThreeBlendSrcAlpha: state.blendSrcAlpha,
    auroraEmitterThreeBlendDstAlpha: state.blendDstAlpha,
    auroraEmitterThreeBlendAdapterDiagnostic:
      "VFX_THREE_MATERIAL_BLEND_PREVIEW_ONLY"
  };
  material.needsUpdate = true;
}

function shouldForceVfxBlackKeyForMaterial(
  material: THREE.Material,
  group: THREE.Object3D
): boolean {
  return (
    material.userData?.auroraEmitterAdditivePreview === true ||
    shouldForceVfxBlackKeyFromBlendMode(material.userData?.auroraEmitterBlendMode) ||
    shouldForceVfxBlackKeyFromBlendMode(group.userData?.auroraEmitterBlendMode) ||
    (material.userData?.auroraVfxGeneratedMaterial === true &&
      (typeof material.userData?.vfxTextureDeliveryUrl === "string" ||
        typeof group.userData?.auroraEmitterTexture === "string"))
  );
}

function shouldForceVfxBlackKeyForEmitterTexture(
  auroraEmitter: PlaceableAuroraEmitterNode | null,
  textureDeliveryUrl: string | null
): boolean {
  if (shouldForceVfxBlackKeyFromBlendMode(auroraEmitter?.blendMode)) {
    return true;
  }
  const textureReference = normalizeAuroraEmitterToken(auroraEmitter?.texture);
  const deliveryReference = normalizeAuroraEmitterToken(textureDeliveryUrl);
  return textureReference.length > 0 || deliveryReference.length > 0;
}

export function resolvePlaceableVfxAlphaCompanionTextureReference(
  textureReference: string | null | undefined
): string | null {
  const normalizedReference =
    typeof textureReference === "string" ? textureReference.trim().toLowerCase() : "";
  if (normalizedReference.length === 0 || normalizedReference.endsWith("a")) {
    return null;
  }
  return `${normalizedReference}a`;
}

function resolveVfxMaterialTexture(
  texture: THREE.Texture,
  options: ResolveVfxMaterialTextureOptions = {}
): ResolvedVfxMaterialTexture {
  const alphaCompanionTexture = options.alphaTexture
    ? createVisibleTextureFromAlphaCompanionTexture(texture, options.alphaTexture)
    : null;
  if (alphaCompanionTexture) {
    return {
      texture: alphaCompanionTexture.texture,
      alphaMap: alphaCompanionTexture.alphaMap,
      sharedTexture: false,
      alphaOnlyConverted: false,
      blackKeyConverted: false,
      alphaCompanionApplied: true,
      softAlphaConverted: false
    };
  }

  if (!isAlphaOnlyTexture(texture)) {
    if (isWhiteAlphaMaskTexture(texture)) {
      const visibleTexture = createVisibleTextureFromWhiteAlphaMaskTexture(texture);
      return {
        texture: visibleTexture?.texture ?? texture,
        alphaMap: visibleTexture?.alphaMap ?? null,
        sharedTexture: visibleTexture ? false : true,
        alphaOnlyConverted: false,
        blackKeyConverted: false,
        alphaCompanionApplied: false,
        softAlphaConverted: Boolean(visibleTexture)
      };
    }
    if (
      isBlackKeyedTexture(texture) ||
      (options.forceBlackKey === true &&
        !hasMeaningfulTextureAlpha(texture) &&
        hasBlackKeyCandidatePixels(texture))
    ) {
      const visibleTexture = createVisibleTextureFromBlackKeyTexture(texture);
      return {
        texture: visibleTexture?.texture ?? texture,
        alphaMap: visibleTexture?.alphaMap ?? null,
        sharedTexture: visibleTexture ? false : true,
        alphaOnlyConverted: false,
        blackKeyConverted: Boolean(visibleTexture),
        alphaCompanionApplied: false,
        softAlphaConverted: false
      };
    }
    return {
      texture,
      alphaMap: null,
      sharedTexture: true,
      alphaOnlyConverted: false,
      blackKeyConverted: false,
      alphaCompanionApplied: false,
      softAlphaConverted: false
    };
  }

  const visibleTexture = createVisibleTextureFromAlphaOnlyTexture(texture);
  return {
    texture: visibleTexture ?? texture,
    alphaMap: null,
    sharedTexture: visibleTexture ? false : true,
    alphaOnlyConverted: Boolean(visibleTexture),
    blackKeyConverted: false,
    alphaCompanionApplied: false,
    softAlphaConverted: false
  };
}

function sanitizePositiveAtlasInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : null;
}

function sanitizeNonNegativeAtlasInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : null;
}

function sanitizeNonNegativeAtlasNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function sanitizeFiniteEmitterNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeNonNegativeEmitterNumber(value: unknown): number | undefined {
  const finite = sanitizeFiniteEmitterNumber(value);
  return finite !== undefined && finite >= 0 ? finite : undefined;
}

function sanitizeNonNegativeEmitterInteger(value: unknown): number | undefined {
  const nonNegative = sanitizeNonNegativeEmitterNumber(value);
  return nonNegative !== undefined ? Math.trunc(nonNegative) : undefined;
}

function sanitizeEmitterBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function sanitizeEmitterString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function sanitizeEmitterColor(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 3) {
    return undefined;
  }
  const [red, green, blue] = value;
  if (
    typeof red !== "number" ||
    typeof green !== "number" ||
    typeof blue !== "number" ||
    !Number.isFinite(red) ||
    !Number.isFinite(green) ||
    !Number.isFinite(blue)
  ) {
    return undefined;
  }
  return [red, green, blue];
}

function sanitizeEmitterNumberKeyframes(
  value: unknown,
  options: { nonNegativeValue?: boolean } = {}
): ResolvedAuroraEmitterNumberKeyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const frames = value
    .map((entry): ResolvedAuroraEmitterNumberKeyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      if (
        typeof candidate.time !== "number" ||
        typeof candidate.value !== "number" ||
        !Number.isFinite(candidate.time) ||
        !Number.isFinite(candidate.value) ||
        candidate.time < 0 ||
        (options.nonNegativeValue === true && candidate.value < 0)
      ) {
        return null;
      }
      return {
        time: candidate.time,
        value: candidate.value
      };
    })
    .filter((frame): frame is ResolvedAuroraEmitterNumberKeyframe => frame !== null)
    .sort((left, right) => left.time - right.time);

  const uniqueFrames: ResolvedAuroraEmitterNumberKeyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({ ...frame });
  });

  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeEmitterVector3Keyframes(
  value: unknown
): ResolvedAuroraEmitterVector3Keyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const frames = value
    .map((entry): ResolvedAuroraEmitterVector3Keyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      const vector = sanitizeAuroraEmitterTransformVector(candidate.value);
      if (
        typeof candidate.time !== "number" ||
        !Number.isFinite(candidate.time) ||
        candidate.time < 0 ||
        !vector
      ) {
        return null;
      }
      return {
        time: candidate.time,
        value: vector
      };
    })
    .filter((frame): frame is ResolvedAuroraEmitterVector3Keyframe => frame !== null)
    .sort((left, right) => left.time - right.time);

  const uniqueFrames: ResolvedAuroraEmitterVector3Keyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({ time: frame.time, value: [...frame.value] });
  });

  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeEmitterOrientationKeyframes(
  value: unknown
): ResolvedAuroraEmitterOrientationKeyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const frames = value
    .map((entry): ResolvedAuroraEmitterOrientationKeyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      const orientation = sanitizeAuroraEmitterTransformOrientation(candidate.value);
      if (
        typeof candidate.time !== "number" ||
        !Number.isFinite(candidate.time) ||
        candidate.time < 0 ||
        !orientation
      ) {
        return null;
      }
      return {
        time: candidate.time,
        value: orientation
      };
    })
    .filter((frame): frame is ResolvedAuroraEmitterOrientationKeyframe => frame !== null)
    .sort((left, right) => left.time - right.time);

  const uniqueFrames: ResolvedAuroraEmitterOrientationKeyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({
      time: frame.time,
      value: {
        axis: [frame.value.axis[0], frame.value.axis[1], frame.value.axis[2]],
        angleRadians: frame.value.angleRadians
      }
    });
  });

  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeEmitterColorKeyframes(
  value: unknown
): ResolvedAuroraEmitterColorKeyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const frames = value
    .map((entry): ResolvedAuroraEmitterColorKeyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      const color = sanitizeEmitterColor(candidate.value);
      if (
        typeof candidate.time !== "number" ||
        !Number.isFinite(candidate.time) ||
        candidate.time < 0 ||
        !color
      ) {
        return null;
      }
      return {
        time: candidate.time,
        value: color
      };
    })
    .filter((frame): frame is ResolvedAuroraEmitterColorKeyframe => frame !== null)
    .sort((left, right) => left.time - right.time);

  const uniqueFrames: ResolvedAuroraEmitterColorKeyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({ time: frame.time, value: [...frame.value] });
  });

  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function resolveAuroraEmitterSimulationTimeline(
  value: unknown
): ResolvedAuroraEmitterSimulationTimeline | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const source = value as Partial<Record<keyof ResolvedAuroraEmitterSimulationTimeline, unknown>>;
  const timeline: ResolvedAuroraEmitterSimulationTimeline = {};
  AURORA_EMITTER_SIMULATION_TIMELINE_KEYS.forEach((key) => {
    const frames = sanitizeEmitterNumberKeyframes(source[key], {
      nonNegativeValue: AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS.has(key)
    });
    if (frames) {
      timeline[key] = frames;
    }
  });
  return Object.keys(timeline).length > 0 ? timeline : undefined;
}

function resolveAuroraEmitterColorTimeline(
  value: unknown
): ResolvedAuroraEmitterColorTimeline | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const source = value as Partial<Record<ResolvedAuroraEmitterColorTimelineKey, unknown>>;
  const timeline: ResolvedAuroraEmitterColorTimeline = {};
  (["colorStart", "colorMid", "colorEnd"] as const).forEach((key) => {
    const frames = sanitizeEmitterColorKeyframes(source[key]);
    if (frames) {
      timeline[key] = frames;
    }
  });
  return Object.keys(timeline).length > 0 ? timeline : undefined;
}

function resolveAuroraEmitterNumberKeyframePeak(
  frames: ResolvedAuroraEmitterNumberKeyframe[] | undefined
): number | undefined {
  if (!frames || frames.length === 0) {
    return undefined;
  }
  const peak = Math.max(...frames.map((frame) => frame.value));
  return Number.isFinite(peak) ? peak : undefined;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveAuroraEmitterAtlas(
  emitter: PlaceableAuroraEmitterNode | null
): ResolvedAuroraEmitterAtlas | null {
  const source = emitter?.atlas;
  if (!source) {
    return null;
  }
  const effectiveXGrid =
    sanitizePositiveAtlasInteger(source.effectiveXGrid) ??
    sanitizePositiveAtlasInteger(source.xGridRaw) ??
    1;
  const effectiveYGrid =
    sanitizePositiveAtlasInteger(source.effectiveYGrid) ??
    sanitizePositiveAtlasInteger(source.yGridRaw) ??
    1;
  if (effectiveXGrid <= 1 && effectiveYGrid <= 1) {
    return null;
  }
  return {
    ...(typeof source.xGridRaw === "number" ? { xGridRaw: Math.max(0, Math.trunc(source.xGridRaw)) } : {}),
    ...(typeof source.yGridRaw === "number" ? { yGridRaw: Math.max(0, Math.trunc(source.yGridRaw)) } : {}),
    effectiveXGrid,
    effectiveYGrid,
    ...(sanitizeNonNegativeAtlasNumber(source.fps) !== null
      ? { fps: sanitizeNonNegativeAtlasNumber(source.fps)! }
      : {}),
    ...(sanitizeNonNegativeAtlasInteger(source.frameStart) !== null
      ? { frameStart: sanitizeNonNegativeAtlasInteger(source.frameStart)! }
      : {}),
    ...(sanitizeNonNegativeAtlasInteger(source.frameEnd) !== null
      ? { frameEnd: sanitizeNonNegativeAtlasInteger(source.frameEnd)! }
      : {}),
    random: source.random === true,
    frameCapacity: Math.max(1, effectiveXGrid * effectiveYGrid)
  };
}

function resolveAuroraEmitterSimulationSource(
  source: PlaceableAuroraEmitterNode["simulation"] | null | undefined
): ResolvedAuroraEmitterSimulation | null {
  if (!source) {
    return null;
  }
  const timeline = resolveAuroraEmitterSimulationTimeline(source.timeline);
  const colorTimeline = resolveAuroraEmitterColorTimeline(source.colorTimeline);
  const rawBlurLength = sanitizeFiniteEmitterNumber(source.blurLength);
  const simulation: ResolvedAuroraEmitterSimulation = {
    ...(sanitizeNonNegativeEmitterNumber(source.xSize) !== undefined
      ? { xSize: sanitizeNonNegativeEmitterNumber(source.xSize) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.ySize) !== undefined
      ? { ySize: sanitizeNonNegativeEmitterNumber(source.ySize) }
      : {}),
    ...(sanitizeNonNegativeEmitterInteger(source.spawnType) !== undefined
      ? { spawnType: sanitizeNonNegativeEmitterInteger(source.spawnType) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.birthrate) !== undefined
      ? { birthrate: sanitizeNonNegativeEmitterNumber(source.birthrate) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.lifeExp) !== undefined
      ? { lifeExp: sanitizeNonNegativeEmitterNumber(source.lifeExp) }
      : {}),
    ...(sanitizeFiniteEmitterNumber(source.mass) !== undefined
      ? { mass: sanitizeFiniteEmitterNumber(source.mass) }
      : {}),
    ...(sanitizeFiniteEmitterNumber(source.velocity) !== undefined
      ? { velocity: sanitizeFiniteEmitterNumber(source.velocity) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.randvel) !== undefined
      ? { randvel: sanitizeNonNegativeEmitterNumber(source.randvel) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.spread) !== undefined
      ? { spread: sanitizeNonNegativeEmitterNumber(source.spread) }
      : {}),
    ...(sanitizeFiniteEmitterNumber(source.particleRot) !== undefined
      ? { particleRot: sanitizeFiniteEmitterNumber(source.particleRot) }
      : {}),
    ...(sanitizeEmitterBoolean(source.bounce) !== undefined
      ? { bounce: sanitizeEmitterBoolean(source.bounce) }
      : {}),
    ...(sanitizeFiniteEmitterNumber(source.bounceCoefficient) !== undefined
      ? { bounceCoefficient: sanitizeFiniteEmitterNumber(source.bounceCoefficient) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.blastRadius) !== undefined
      ? { blastRadius: sanitizeNonNegativeEmitterNumber(source.blastRadius) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.blastLength) !== undefined
      ? { blastLength: sanitizeNonNegativeEmitterNumber(source.blastLength) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.blurLength) !== undefined
      ? { blurLength: sanitizeNonNegativeEmitterNumber(source.blurLength) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.detonate) !== undefined
      ? { detonate: sanitizeNonNegativeEmitterNumber(source.detonate) }
      : {}),
    ...(rawBlurLength !== undefined ? { blurLengthRaw: rawBlurLength } : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.lightningScale) !== undefined
      ? { lightningScale: sanitizeNonNegativeEmitterNumber(source.lightningScale) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.lightningDelay) !== undefined
      ? { lightningDelay: sanitizeNonNegativeEmitterNumber(source.lightningDelay) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.lightningRadius) !== undefined
      ? { lightningRadius: sanitizeNonNegativeEmitterNumber(source.lightningRadius) }
      : {}),
    ...(sanitizeFiniteEmitterNumber(source.deadspace) !== undefined
      ? { deadspace: sanitizeFiniteEmitterNumber(source.deadspace) }
      : {}),
    ...(sanitizeEmitterBoolean(source.p2p) !== undefined
      ? { p2p: sanitizeEmitterBoolean(source.p2p) }
      : {}),
    ...(sanitizeEmitterString(source.p2pType) !== undefined
      ? { p2pType: sanitizeEmitterString(source.p2pType) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.p2pBezier2) !== undefined
      ? { p2pBezier2: sanitizeNonNegativeEmitterNumber(source.p2pBezier2) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.p2pBezier3) !== undefined
      ? { p2pBezier3: sanitizeNonNegativeEmitterNumber(source.p2pBezier3) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.p2pSource) !== undefined
      ? { p2pSource: sanitizeNonNegativeEmitterNumber(source.p2pSource) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.p2pTarget) !== undefined
      ? { p2pTarget: sanitizeNonNegativeEmitterNumber(source.p2pTarget) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.combineTime) !== undefined
      ? { combineTime: sanitizeNonNegativeEmitterNumber(source.combineTime) }
      : {}),
    ...(sanitizeFiniteEmitterNumber(source.grav) !== undefined
      ? { grav: sanitizeFiniteEmitterNumber(source.grav) }
      : {}),
    ...(sanitizeFiniteEmitterNumber(source.drag) !== undefined
      ? { drag: sanitizeFiniteEmitterNumber(source.drag) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.threshold) !== undefined
      ? { threshold: sanitizeNonNegativeEmitterNumber(source.threshold) }
      : {}),
    ...(sanitizeEmitterBoolean(source.inherit) !== undefined
      ? { inherit: sanitizeEmitterBoolean(source.inherit) }
      : {}),
    ...(sanitizeEmitterBoolean(source.inheritVel) !== undefined
      ? { inheritVel: sanitizeEmitterBoolean(source.inheritVel) }
      : {}),
    ...(sanitizeEmitterBoolean(source.inheritLocal) !== undefined
      ? { inheritLocal: sanitizeEmitterBoolean(source.inheritLocal) }
      : {}),
    ...(sanitizeEmitterBoolean(source.inheritPart) !== undefined
      ? { inheritPart: sanitizeEmitterBoolean(source.inheritPart) }
      : {}),
    ...(sanitizeEmitterBoolean(source.affectedByWind) !== undefined
      ? { affectedByWind: sanitizeEmitterBoolean(source.affectedByWind) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.sizeStart) !== undefined
      ? { sizeStart: sanitizeNonNegativeEmitterNumber(source.sizeStart) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.sizeMid) !== undefined
      ? { sizeMid: sanitizeNonNegativeEmitterNumber(source.sizeMid) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.sizeEnd) !== undefined
      ? { sizeEnd: sanitizeNonNegativeEmitterNumber(source.sizeEnd) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.sizeStartY) !== undefined
      ? { sizeStartY: sanitizeNonNegativeEmitterNumber(source.sizeStartY) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.sizeMidY) !== undefined
      ? { sizeMidY: sanitizeNonNegativeEmitterNumber(source.sizeMidY) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.sizeEndY) !== undefined
      ? { sizeEndY: sanitizeNonNegativeEmitterNumber(source.sizeEndY) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.alphaStart) !== undefined
      ? { alphaStart: sanitizeNonNegativeEmitterNumber(source.alphaStart) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.alphaMid) !== undefined
      ? { alphaMid: sanitizeNonNegativeEmitterNumber(source.alphaMid) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.alphaEnd) !== undefined
      ? { alphaEnd: sanitizeNonNegativeEmitterNumber(source.alphaEnd) }
      : {}),
    ...(sanitizeEmitterColor(source.colorStart) ? { colorStart: sanitizeEmitterColor(source.colorStart) } : {}),
    ...(sanitizeEmitterColor(source.colorMid) ? { colorMid: sanitizeEmitterColor(source.colorMid) } : {}),
    ...(sanitizeEmitterColor(source.colorEnd) ? { colorEnd: sanitizeEmitterColor(source.colorEnd) } : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.percentStart) !== undefined
      ? { percentStart: sanitizeNonNegativeEmitterNumber(source.percentStart) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.percentMid) !== undefined
      ? { percentMid: sanitizeNonNegativeEmitterNumber(source.percentMid) }
      : {}),
    ...(sanitizeNonNegativeEmitterNumber(source.percentEnd) !== undefined
      ? { percentEnd: sanitizeNonNegativeEmitterNumber(source.percentEnd) }
      : {}),
    ...(timeline ? { timeline } : {}),
    ...(colorTimeline ? { colorTimeline } : {})
  };
  return Object.keys(simulation).length > 0 ? simulation : null;
}

function resolveAuroraEmitterSimulation(
  emitter: PlaceableAuroraEmitterNode | null
): ResolvedAuroraEmitterSimulation | null {
  return resolveAuroraEmitterSimulationSource(emitter?.simulation);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function computeAuroraAtlasRandomFrameOffset(
  frameSeed: number,
  frameStep: number,
  frameRange: number
): number {
  const seed = Math.trunc(frameSeed);
  const step = Math.trunc(frameStep);
  let hash =
    Math.imul(seed + 0x9e3779b9, 0x85ebca6b) ^
    Math.imul(step + 0xc2b2ae35, 0x27d4eb2f);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d);
  hash ^= hash >>> 12;
  return (hash >>> 0) % frameRange;
}

function resolveAuroraAtlasFrameRangeState(
  atlas: ResolvedAuroraEmitterAtlas,
  elapsedSeconds?: number
): AuroraAtlasFrameRangeState {
  const timelineFrameStart = sampleAuroraEmitterNumberKeyframesAtElapsed(
    atlas.frameStartTimeline,
    elapsedSeconds,
    true
  );
  const timelineFrameEnd = sampleAuroraEmitterNumberKeyframesAtElapsed(
    atlas.frameEndTimeline,
    elapsedSeconds,
    true
  );
  const frameStartSource = timelineFrameStart ?? atlas.frameStart ?? 0;
  const frameEndSource = timelineFrameEnd ?? atlas.frameEnd ?? Math.max(0, atlas.frameCapacity - 1);
  const frameStart = clampNumber(Math.trunc(frameStartSource), 0, atlas.frameCapacity - 1);
  const frameEnd = clampNumber(Math.trunc(frameEndSource), 0, atlas.frameCapacity - 1);
  return {
    frameStart,
    frameEnd,
    frameRange: Math.max(1, Math.abs(frameEnd - frameStart) + 1),
    direction: frameStart <= frameEnd ? 1 : -1
  };
}

function computeAuroraAtlasRawFrameAtStep(
  atlas: ResolvedAuroraEmitterAtlas,
  frameSeed: number,
  frameStep: number,
  elapsedSeconds?: number
): number {
  const rangeState = resolveAuroraAtlasFrameRangeState(atlas, elapsedSeconds);
  const frameOffset = atlas.random
    ? computeAuroraAtlasRandomFrameOffset(
        frameSeed,
        Math.max(0, Math.trunc(frameStep)),
        rangeState.frameRange
      )
    : positiveModulo(Math.max(0, Math.trunc(frameStep)), rangeState.frameRange);
  return rangeState.frameStart + rangeState.direction * frameOffset;
}

function resolveAuroraAtlasElapsedSeconds(
  nowBaseMs: number,
  ageSeconds?: number
): number {
  if (typeof ageSeconds === "number" && Number.isFinite(ageSeconds)) {
    return Math.max(0, ageSeconds);
  }
  const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  return Math.max(0, (nowMs - nowBaseMs) * 0.001);
}

function resolveAuroraAtlasCheckpointFrameState(
  material: PlaceableVfxPreviewMaterial,
  atlas: ResolvedAuroraEmitterAtlas,
  frameSeed: number,
  nowBaseMs: number,
  ageSeconds?: number
): AuroraAtlasCheckpointFrameState {
  const elapsedSeconds = resolveAuroraAtlasElapsedSeconds(nowBaseMs, ageSeconds);
  const rangeState = resolveAuroraAtlasFrameRangeState(atlas, elapsedSeconds);
  const timelineFps = sampleAuroraEmitterNumberKeyframesAtElapsed(
    atlas.fpsTimeline,
    elapsedSeconds,
    true
  );
  const fps =
    typeof timelineFps === "number" && Number.isFinite(timelineFps) && timelineFps >= 0
      ? timelineFps
      : atlas.fps ?? 0;
  if (fps <= 0 || rangeState.frameRange <= 1) {
    return {
      rawFrame: computeAuroraAtlasRawFrameAtStep(atlas, frameSeed, 0, elapsedSeconds),
      frameStep: 0,
      checkpointElapsedSeconds: elapsedSeconds,
      frameRangeState: rangeState,
      catchUpSteps: 0,
      reset: false
    };
  }
  const secondsPerFrame = 1 / fps;
  const previousStep =
    typeof material.userData.auroraAtlasCheckpointFrameStep === "number"
      ? Math.max(0, Math.trunc(material.userData.auroraAtlasCheckpointFrameStep))
      : 0;
  const previousCheckpoint =
    typeof material.userData.auroraAtlasCheckpointElapsedSeconds === "number" &&
    Number.isFinite(material.userData.auroraAtlasCheckpointElapsedSeconds)
      ? Math.max(0, material.userData.auroraAtlasCheckpointElapsedSeconds)
      : 0;
  const shouldReset =
    elapsedSeconds + 1e-9 < previousCheckpoint ||
    material.userData.auroraAtlasCheckpointFrameSeed !== frameSeed ||
    material.userData.auroraAtlasCheckpointFrameStart !== rangeState.frameStart ||
    material.userData.auroraAtlasCheckpointFrameEnd !== rangeState.frameEnd ||
    material.userData.auroraAtlasCheckpointFrameRange !== rangeState.frameRange;
  const baseStep = shouldReset ? 0 : previousStep;
  const baseCheckpoint = shouldReset ? 0 : previousCheckpoint;
  const catchUpSteps = Math.max(
    0,
    Math.floor((elapsedSeconds - baseCheckpoint + 1e-9) / secondsPerFrame)
  );
  const frameStep = baseStep + catchUpSteps;
  return {
    rawFrame: computeAuroraAtlasRawFrameAtStep(atlas, frameSeed, frameStep, elapsedSeconds),
    frameStep,
    checkpointElapsedSeconds: baseCheckpoint + catchUpSteps * secondsPerFrame,
    secondsPerFrame,
    evaluatedFps: fps,
    frameRangeState: rangeState,
    catchUpSteps,
    reset: shouldReset
  };
}

function resolveAuroraAtlasFrameAddress(
  atlas: ResolvedAuroraEmitterAtlas,
  rawFrame: number
): AuroraAtlasFrameAddress {
  const frame = positiveModulo(rawFrame, atlas.frameCapacity);
  const column = frame % atlas.effectiveXGrid;
  const row = Math.floor(frame / atlas.effectiveXGrid);
  const u0 = column / atlas.effectiveXGrid;
  const u1 = (column + 1) / atlas.effectiveXGrid;
  const v0 = 1 - (row + 1) / atlas.effectiveYGrid;
  const v1 = 1 - row / atlas.effectiveYGrid;
  return {
    rawFrame,
    frame,
    column,
    row,
    u0,
    u1,
    v0,
    v1
  };
}

function buildAuroraAtlasFrameUserData(
  address: AuroraAtlasFrameAddress
): Record<string, number> {
  return {
    auroraAtlasRawFrame: address.rawFrame,
    auroraAtlasFrame: address.frame,
    auroraAtlasColumn: address.column,
    auroraAtlasRow: address.row,
    auroraAtlasU0: address.u0,
    auroraAtlasU1: address.u1,
    auroraAtlasV0: address.v0,
    auroraAtlasV1: address.v1
  };
}

function buildAuroraAtlasCheckpointUserData(
  atlas: ResolvedAuroraEmitterAtlas,
  frameSeed: number,
  state: AuroraAtlasCheckpointFrameState
): Record<string, number | string | boolean | undefined> {
  const rangeState = state.frameRangeState ?? resolveAuroraAtlasFrameRangeState(atlas);
  const usesCheckpoint = typeof state.secondsPerFrame === "number";
  return {
    auroraAtlasCheckpointPreviewMode: usesCheckpoint
      ? "per-particle-checkpoint-catch-up-preview"
      : "static-or-single-frame-atlas",
    auroraAtlasCheckpointFrameSeed: frameSeed,
    auroraAtlasCheckpointFrameStart: rangeState.frameStart,
    auroraAtlasCheckpointFrameEnd: rangeState.frameEnd,
    auroraAtlasCheckpointFrameRange: rangeState.frameRange,
    auroraAtlasCheckpointFrameDirection: rangeState.direction,
    auroraAtlasFrameRangePreviewMode:
      rangeState.direction < 0
        ? "descending-frame-range-preserved"
        : "ascending-frame-range-preserved",
    auroraAtlasCheckpointFrameStep: state.frameStep,
    auroraAtlasCheckpointElapsedSeconds: state.checkpointElapsedSeconds,
    auroraAtlasCheckpointCatchUpSteps: state.catchUpSteps,
    auroraAtlasCheckpointReset: state.reset,
    auroraAtlasSecondsPerFrame: state.secondsPerFrame,
    auroraAtlasEvaluatedFps: state.evaluatedFps,
    auroraAtlasFpsTimelinePreviewMode: atlas.fpsTimeline
      ? "runtime-fps-keyframe-atlas-checkpoint-preview"
      : undefined,
    auroraAtlasFrameRangeTimelinePreviewMode:
      atlas.frameStartTimeline || atlas.frameEndTimeline
        ? "runtime-frame-range-keyframe-atlas-checkpoint-preview"
        : undefined,
    auroraAtlasFrameStepIntegerConversionDiagnostic: usesCheckpoint
      ? "VFX_ATLAS_FRAME_STEP_INTEGER_CONVERSION_DIAGNOSTIC"
      : undefined
  };
}

function applyAuroraAtlasTextureState(texture: THREE.Texture): void {
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
  texture.userData = {
    ...texture.userData,
    auroraAtlasTextureUsesGeometryUv: true
  };
  texture.needsUpdate = true;
}

function createSurfaceEmitterVisibilityFallbackTexture(): THREE.Texture {
  const texture = new THREE.DataTexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
    THREE.RGBAFormat
  );
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  texture.userData = {
    ...texture.userData,
    auroraSurfaceEmitterVisibilityFallbackTexture: true
  };
  return texture;
}

function applySurfaceEmitterVisibilityFallbackMaterial(
  material: THREE.MeshBasicMaterial,
  profile: PlaceableVfxPreviewProfile
): void {
  if (
    profile.particleSizeVisibilityFloorPreviewMode !==
    "surface-emitter-catalog-visibility-floor"
  ) {
    return;
  }
  material.map = createSurfaceEmitterVisibilityFallbackTexture();
  material.alphaMap = null;
  material.alphaTest = 0;
  material.userData = {
    ...material.userData,
    auroraSurfaceEmitterVisibilityFallbackMaterial: true,
    auroraSurfaceEmitterVisibilityFallbackPreviewMode:
      "source-color-alpha-visible-catalog-preview"
  };
  material.needsUpdate = true;
}

function applySurfaceEmitterVisibilityFallbackMaterialFromGroup(
  material: THREE.MeshBasicMaterial | THREE.SpriteMaterial,
  group: THREE.Object3D
): void {
  if (
    group.userData?.auroraEmitterParticleSizeVisibilityFloorPreviewMode !==
    "surface-emitter-catalog-visibility-floor"
  ) {
    return;
  }
  material.map = createSurfaceEmitterVisibilityFallbackTexture();
  if (material instanceof THREE.MeshBasicMaterial) {
    material.alphaMap = null;
    material.alphaTest = 0;
  }
  material.userData = {
    ...material.userData,
    auroraSurfaceEmitterVisibilityFallbackMaterial: true,
    auroraSurfaceEmitterVisibilityFallbackPreviewMode:
      "source-color-alpha-visible-catalog-preview-post-texture-load"
  };
  material.needsUpdate = true;
}

function applyAuroraAtlasFrameToGeometry(
  geometry: THREE.BufferGeometry,
  address: AuroraAtlasFrameAddress
): void {
  const uvAttribute = geometry.getAttribute("uv");
  if (!uvAttribute || uvAttribute.count < 6) {
    return;
  }
  uvAttribute.setXY(0, address.u0, address.v0);
  uvAttribute.setXY(1, address.u1, address.v0);
  uvAttribute.setXY(2, address.u0, address.v1);
  uvAttribute.setXY(3, address.u0, address.v1);
  uvAttribute.setXY(4, address.u1, address.v0);
  uvAttribute.setXY(5, address.u1, address.v1);
  uvAttribute.needsUpdate = true;
  geometry.userData = {
    ...geometry.userData,
    ...buildAuroraAtlasFrameUserData(address),
    auroraAtlasPreviewMode: "per-particle-vertex-uv-preview",
    auroraAtlasUvSource: "aurora-particle-vertex-buffer"
  };
}

function applyAuroraParticleVertexColorToGeometry(
  geometry: THREE.BufferGeometry,
  color: THREE.Color,
  mode:
    | "aurora-particle-vertex-color"
    | "aurora-particle-color-ambient-tint-disabled"
    | "aurora-particle-soft-alpha-lighten-color-floor"
    | "semantic-scene-tint-vertex-color"
    | "semantic-fallback-vertex-color"
): void {
  const colorAttribute = geometry.getAttribute("color");
  if (!colorAttribute || colorAttribute.count < 6) {
    return;
  }
  const colorIntensity = Math.max(1, color.r, color.g, color.b);
  for (let index = 0; index < colorAttribute.count; index += 1) {
    if (colorAttribute.itemSize >= 4) {
      const alpha =
        typeof colorAttribute.getW === "function"
          ? colorAttribute.getW(index)
          : typeof geometry.userData.auroraVfxParticleVertexAlpha === "number"
            ? geometry.userData.auroraVfxParticleVertexAlpha
            : 1;
      colorAttribute.setXYZW(index, color.r, color.g, color.b, alpha);
    } else {
      colorAttribute.setXYZ(index, color.r, color.g, color.b);
    }
  }
  colorAttribute.needsUpdate = true;
  geometry.userData = {
    ...geometry.userData,
    auroraVfxParticleVertexColorSource: [color.r, color.g, color.b],
    auroraVfxParticleVertexColorIntensity: colorIntensity,
    auroraVfxParticleVertexColorPreviewMode: mode,
    ...(colorIntensity > 1
      ? {
          auroraVfxParticleVertexColorHdrPreviewMode:
            "aurora-hdr-color-vector-preserved"
        }
      : {}),
    auroraVfxParticleVertexColorPackedPreview: [
      Math.round(clampNumber(color.r, 0, 1) * 255),
      Math.round(clampNumber(color.g, 0, 1) * 255),
      Math.round(clampNumber(color.b, 0, 1) * 255),
      geometry.userData.auroraVfxParticleVertexAlphaPackedPreview ?? 255
    ]
  };
}

function shouldApplyAuroraLightenAlphaRgbScale(material: PlaceableVfxPreviewMaterial): boolean {
  const blendMode = material.userData?.auroraEmitterBlendMode;
  return typeof blendMode === "string" && /lighten/iu.test(blendMode);
}

function shouldUseAuroraAlphaCompanionMaterialColor(
  material: PlaceableVfxPreviewMaterial
): boolean {
  return (
    material.userData?.auroraAlphaCompanionTexture === true ||
    material.userData?.auroraSoftAlphaMaskTexture === true
  );
}

function applyAuroraLightenAlphaRgbScaleToMaterial(
  material: PlaceableVfxPreviewMaterial,
  alpha: number
): void {
  if (!(material instanceof THREE.MeshBasicMaterial)) {
    return;
  }
  const sourceColor = material.userData?.auroraVfxParticleMaterialColorSource;
  if (!Array.isArray(sourceColor) || sourceColor.length < 3) {
    return;
  }
  const scale = shouldUseAuroraAlphaCompanionMaterialColor(material)
    ? clampNumber(Math.max(alpha, 0.5), 0, 1)
    : clampNumber(alpha, 0, 1);
  const red = Math.max(0, Number(sourceColor[0] ?? 1) * scale);
  const green = Math.max(0, Number(sourceColor[1] ?? 1) * scale);
  const blue = Math.max(0, Number(sourceColor[2] ?? 1) * scale);
  const colorIntensity = Math.max(1, red, green, blue);
  material.color.setRGB(red, green, blue);
  material.userData = {
    ...material.userData,
    auroraVfxLightenAlphaMaterialColorPreviewMode:
      "lighten-material-rgb-scaled-by-particle-alpha",
    auroraVfxLightenAlphaMaterialColorIntensity: colorIntensity,
    ...(colorIntensity > 1
      ? {
          auroraVfxLightenAlphaMaterialColorHdrPreviewMode:
            "aurora-hdr-color-vector-preserved"
        }
      : {}),
    auroraVfxParticleMaterialColorPackedPreview: [
      Math.round(clampNumber(red, 0, 1) * 255),
      Math.round(clampNumber(green, 0, 1) * 255),
      Math.round(clampNumber(blue, 0, 1) * 255),
      Math.round(scale * 255)
    ]
  };
  material.needsUpdate = true;
}

function applyAuroraLightenAlphaRgbScaleToGeometry(
  geometry: THREE.BufferGeometry,
  alpha: number
): void {
  const colorAttribute = geometry.getAttribute("color");
  const sourceColor = geometry.userData.auroraVfxParticleVertexColorSource;
  if (
    !colorAttribute ||
    colorAttribute.count < 6 ||
    !Array.isArray(sourceColor) ||
    sourceColor.length < 3
  ) {
    return;
  }
  const scale = clampNumber(alpha, 0, 1);
  const red = Math.max(0, Number(sourceColor[0] ?? 1) * scale);
  const green = Math.max(0, Number(sourceColor[1] ?? 1) * scale);
  const blue = Math.max(0, Number(sourceColor[2] ?? 1) * scale);
  const colorIntensity = Math.max(1, red, green, blue);
  for (let index = 0; index < colorAttribute.count; index += 1) {
    if (colorAttribute.itemSize >= 4) {
      const alpha =
        typeof colorAttribute.getW === "function"
          ? colorAttribute.getW(index)
          : typeof geometry.userData.auroraVfxParticleVertexAlpha === "number"
            ? geometry.userData.auroraVfxParticleVertexAlpha
            : 1;
      colorAttribute.setXYZW(index, red, green, blue, alpha);
    } else {
      colorAttribute.setXYZ(index, red, green, blue);
    }
  }
  colorAttribute.needsUpdate = true;
  geometry.userData = {
    ...geometry.userData,
    auroraVfxLightenAlphaRgbPreviewMode: "lighten-rgb-scaled-by-particle-alpha",
    auroraVfxLightenAlphaRgbIntensity: colorIntensity,
    ...(colorIntensity > 1
      ? {
          auroraVfxLightenAlphaRgbHdrPreviewMode:
            "aurora-hdr-color-vector-preserved"
        }
      : {}),
    auroraVfxParticleVertexColorPackedPreview: [
      Math.round(clampNumber(red, 0, 1) * 255),
      Math.round(clampNumber(green, 0, 1) * 255),
      Math.round(clampNumber(blue, 0, 1) * 255),
      geometry.userData.auroraVfxParticleVertexAlphaPackedPreview ?? Math.round(scale * 255)
    ]
  };
}

function resolveAuroraSoftAlphaLightenColorFloor(
  material: PlaceableVfxPreviewMaterial,
  profile: PlaceableVfxPreviewProfile,
  resolvedColor: THREE.Color,
  elapsedSeconds: number | undefined
): THREE.Color | null {
  if (
    !shouldUseAuroraAlphaCompanionMaterialColor(material) ||
    !shouldForceVfxBlackKeyFromBlendMode(material.userData?.auroraEmitterBlendMode)
  ) {
    return null;
  }
  const currentStrength = Math.max(resolvedColor.r, resolvedColor.g, resolvedColor.b);
  if (currentStrength >= 0.08) {
    return null;
  }
  const floorVector =
    sampleAuroraEmitterProfileColorTimeline(profile, "colorEnd", elapsedSeconds) ??
    profile.particleColorEnd ??
    profile.particleColorMid;
  if (!floorVector) {
    return null;
  }
  const floorColor = createAuroraColorFromVector(floorVector);
  floorColor.multiplyScalar(0.42);
  return new THREE.Color(
    Math.max(resolvedColor.r, floorColor.r),
    Math.max(resolvedColor.g, floorColor.g),
    Math.max(resolvedColor.b, floorColor.b)
  );
}

function applyAuroraParticleVertexAlphaToGeometry(
  geometry: THREE.BufferGeometry,
  opacity: number,
  mode:
    | "aurora-particle-vertex-alpha"
    | "hidden-no-texture"
    | "hidden-schedule"
    | "hidden-linked-endpoint"
    | "hidden-degenerate-segment"
    | "hidden-degenerate-motion-blur"
    | "hidden-p2p-threshold"
    | "hidden-deadspace-angle"
    | "material-base-opacity-sync" = "aurora-particle-vertex-alpha"
): void {
  const alpha = clampNumber(opacity, 0, 1);
  const alphaAttribute = geometry.getAttribute("auroraAlpha");
  if (!alphaAttribute || alphaAttribute.count < 6) {
    return;
  }
  const colorAttribute = geometry.getAttribute("color");
  for (let index = 0; index < alphaAttribute.count; index += 1) {
    alphaAttribute.setX(index, alpha);
    if (colorAttribute instanceof THREE.BufferAttribute && colorAttribute.itemSize >= 4) {
      colorAttribute.setW(index, alpha);
    }
  }
  alphaAttribute.needsUpdate = true;
  if (colorAttribute instanceof THREE.BufferAttribute && colorAttribute.itemSize >= 4) {
    colorAttribute.needsUpdate = true;
  }
  const packedAlpha = Math.round(alpha * 255);
  const packedColor = Array.isArray(geometry.userData.auroraVfxParticleVertexColorPackedPreview)
    ? geometry.userData.auroraVfxParticleVertexColorPackedPreview
    : [255, 255, 255, packedAlpha];
  geometry.userData = {
    ...geometry.userData,
    auroraVfxParticleVertexAlphaPreviewMode: mode,
    auroraVfxParticleVertexAlpha: alpha,
    auroraVfxParticleVertexAlphaPackedPreview: packedAlpha,
    auroraVfxParticleVertexColorPackedPreview: [
      packedColor[0] ?? 255,
      packedColor[1] ?? 255,
      packedColor[2] ?? 255,
      packedAlpha
    ]
  };
}

function applyAuroraMotionBlurEndpointAlphaToGeometry(
  geometry: THREE.BufferGeometry,
  baseAlpha: number,
  previousEndpointScale: number
): void {
  const alpha = clampNumber(baseAlpha, 0, 1);
  const previousAlphaScale = clampNumber(previousEndpointScale, 0, 1);
  const previousAlpha = alpha * previousAlphaScale;
  const currentAlpha = alpha;
  const endpointAlphas = [
    previousAlpha,
    previousAlpha,
    currentAlpha,
    currentAlpha,
    previousAlpha,
    currentAlpha
  ];
  const alphaAttribute = geometry.getAttribute("auroraAlpha");
  const colorAttribute = geometry.getAttribute("color");
  if (!(alphaAttribute instanceof THREE.BufferAttribute) || alphaAttribute.count < 6) {
    return;
  }
  for (let index = 0; index < 6; index += 1) {
    const endpointAlpha = endpointAlphas[index] ?? alpha;
    alphaAttribute.setX(index, endpointAlpha);
    if (colorAttribute instanceof THREE.BufferAttribute && colorAttribute.itemSize >= 4) {
      colorAttribute.setW(index, endpointAlpha);
    }
  }
  alphaAttribute.needsUpdate = true;
  if (colorAttribute instanceof THREE.BufferAttribute && colorAttribute.itemSize >= 4) {
    colorAttribute.needsUpdate = true;
  }
  const packedColor = Array.isArray(geometry.userData.auroraVfxParticleVertexColorPackedPreview)
    ? geometry.userData.auroraVfxParticleVertexColorPackedPreview
    : [255, 255, 255, Math.round(alpha * 255)];
  geometry.userData = {
    ...geometry.userData,
    auroraMotionBlurEndpointAlphaPreviewMode:
      "previous-endpoint-packed-alpha-scaled-by-size-over-travel",
    auroraMotionBlurPreviousEndpointAlphaScale: previousAlphaScale,
    auroraMotionBlurPreviousEndpointAlpha: previousAlpha,
    auroraMotionBlurCurrentEndpointAlpha: currentAlpha,
    auroraVfxParticleVertexAlphaPreviewMode: "aurora-motion-blur-endpoint-vertex-alpha",
    auroraVfxParticleVertexAlpha: currentAlpha,
    auroraVfxParticleVertexAlphaEndpointA: previousAlpha,
    auroraVfxParticleVertexAlphaEndpointB: currentAlpha,
    auroraVfxParticleVertexAlphaPackedPreview: Math.round(currentAlpha * 255),
    auroraVfxParticleVertexColorPackedPreview: [
      packedColor[0] ?? 255,
      packedColor[1] ?? 255,
      packedColor[2] ?? 255,
      Math.round(currentAlpha * 255)
    ],
    auroraMotionBlurPreviousEndpointPackedColorPreview: [
      packedColor[0] ?? 255,
      packedColor[1] ?? 255,
      packedColor[2] ?? 255,
      Math.round(previousAlpha * 255)
    ],
    auroraMotionBlurCurrentEndpointPackedColorPreview: [
      packedColor[0] ?? 255,
      packedColor[1] ?? 255,
      packedColor[2] ?? 255,
      Math.round(currentAlpha * 255)
    ]
  };
}

function resolveAuroraMotionBlurPreviousEndpointAlphaScale(
  segmentLength: number,
  doubledParticleWidth: number
): number {
  if (segmentLength <= 1e-6) {
    return 0;
  }
  return clampNumber(Math.max(0.001, doubledParticleWidth) / segmentLength, 0, 1);
}

function resolveAuroraMotionBlurLengthSecondsAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): number {
  const timelineBlurLength = sampleAuroraEmitterProfileTimeline(
    profile,
    "blurLength",
    elapsedSeconds
  );
  const blurLength =
    typeof timelineBlurLength === "number" && timelineBlurLength > 0
      ? timelineBlurLength
      : profile.blurLengthSource;
  return Math.max(0.001, blurLength ?? 1);
}

function applyVfxParticleOpacity(
  material: PlaceableVfxPreviewMaterial,
  geometry: THREE.BufferGeometry | undefined,
  opacity: number,
  mode:
    | "aurora-particle-vertex-alpha"
    | "hidden-no-texture"
    | "hidden-schedule"
    | "hidden-linked-endpoint"
    | "hidden-degenerate-segment"
    | "hidden-degenerate-motion-blur"
    | "hidden-p2p-threshold"
    | "hidden-deadspace-angle"
    | "material-base-opacity-sync" = "aurora-particle-vertex-alpha"
): void {
  const sourceAlpha = clampNumber(opacity, 0, 1);
  const alphaScale =
    typeof material.userData?.auroraVfxSoftAlphaOpacityScale === "number"
      ? clampNumber(material.userData.auroraVfxSoftAlphaOpacityScale, 0.05, 1)
      : 1;
  const alpha = clampNumber(sourceAlpha * alphaScale, 0, 1);
  material.opacity = alpha;
  material.userData = {
    ...material.userData,
    auroraVfxParticleAlphaPreviewMode: mode,
    auroraVfxParticleSourceAlpha: sourceAlpha,
    ...(alphaScale !== 1
      ? {
          auroraVfxParticleAlphaScale: alphaScale,
          auroraVfxParticleAlphaScalePreviewMode: "soft-alpha-lighten-opacity-normalization"
        }
      : {}),
    auroraVfxParticleAlpha: alpha
  };
  if (geometry) {
    applyAuroraParticleVertexAlphaToGeometry(geometry, alpha, mode);
    if (shouldApplyAuroraLightenAlphaRgbScale(material)) {
      applyAuroraLightenAlphaRgbScaleToGeometry(geometry, alpha);
      if (shouldUseAuroraAlphaCompanionMaterialColor(material)) {
        applyAuroraLightenAlphaRgbScaleToMaterial(material, alpha);
      }
    }
  }
}

function setVfxMaterialTexture(
  material: PlaceableVfxPreviewMaterial,
  particleTexture: ResolvedVfxMaterialTexture,
  vfxColor: THREE.Color,
  atlasPlayback: AuroraAtlasPlaybackBinding | null = null
): void {
  material.map = particleTexture.texture;
  material.alphaMap = particleTexture.alphaMap ?? null;
  material.alphaTest = Math.max(
    material.alphaTest,
    particleTexture.alphaOnlyConverted ||
      particleTexture.blackKeyConverted ||
      particleTexture.softAlphaConverted
      ? 0.02
      : particleTexture.alphaCompanionApplied
        ? 0.01
        : 0
  );
  material.color.copy(resolveVfxMaterialTintColor(vfxColor));
  if (shouldForceVfxBlackKeyFromBlendMode(material.userData?.auroraEmitterBlendMode)) {
    const useSoftAlphaLighten =
      particleTexture.alphaCompanionApplied || particleTexture.softAlphaConverted;
    const useAlphaWeightedLighten =
      useSoftAlphaLighten ||
      particleTexture.alphaOnlyConverted ||
      particleTexture.blackKeyConverted;
    material.blending = THREE.CustomBlending;
    material.blendEquation = THREE.AddEquation;
    material.blendSrc = useAlphaWeightedLighten ? THREE.SrcAlphaFactor : THREE.OneFactor;
    material.blendDst = useSoftAlphaLighten ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor;
    material.blendEquationAlpha = THREE.AddEquation;
    material.blendSrcAlpha = THREE.OneFactor;
    material.blendDstAlpha = useSoftAlphaLighten ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor;
    material.userData = {
      ...material.userData,
      ...(useSoftAlphaLighten
        ? { auroraVfxSoftAlphaOpacityScale: AURORA_SOFT_ALPHA_LIGHTEN_OPACITY_SCALE }
        : {}),
      auroraEmitterBlendStatePreviewMode: useSoftAlphaLighten
        ? "aurora-blend-lighten-soft-alpha-adapter"
        : useAlphaWeightedLighten
          ? "aurora-blend-lighten-alpha-additive-adapter"
          : "aurora-blend-lighten-additive-adapter"
    };
  }
  const atlasFrameState = atlasPlayback
    ? resolveAuroraAtlasCheckpointFrameState(
        material,
        atlasPlayback.atlas,
        atlasPlayback.frameSeed,
        atlasPlayback.nowBaseMs,
        atlasPlayback.ageSeconds
      )
    : null;
  const atlasFrameAddress = atlasPlayback && atlasFrameState
    ? resolveAuroraAtlasFrameAddress(
        atlasPlayback.atlas,
        atlasFrameState.rawFrame
      )
    : null;
  if (atlasPlayback) {
    applyAuroraAtlasTextureState(material.map);
    if (material.alphaMap) {
      applyAuroraAtlasTextureState(material.alphaMap);
    }
  }
  material.userData = {
    ...material.userData,
    auroraSharedTexture: particleTexture.sharedTexture,
    auroraAlphaOnlyTexture: particleTexture.alphaOnlyConverted,
    auroraBlackKeyTexture: particleTexture.blackKeyConverted,
    auroraAlphaCompanionTexture: particleTexture.alphaCompanionApplied,
    auroraSoftAlphaMaskTexture: particleTexture.softAlphaConverted,
    ...(atlasPlayback
      ? {
          auroraAtlas: atlasPlayback.atlas,
          auroraAtlasFrameSeed: atlasPlayback.frameSeed,
          auroraAtlasNowBaseMs: atlasPlayback.nowBaseMs,
          ...(atlasFrameAddress ? buildAuroraAtlasFrameUserData(atlasFrameAddress) : {}),
          ...(atlasFrameState
            ? buildAuroraAtlasCheckpointUserData(
                atlasPlayback.atlas,
                atlasPlayback.frameSeed,
                atlasFrameState
              )
            : {}),
          auroraAtlasPreviewMode:
            typeof atlasPlayback.ageSeconds === "number"
              ? "particle-age-vertex-uv-preview"
              : "per-particle-vertex-uv-preview"
        }
      : {})
  };
  material.needsUpdate = true;
}

function resolveVfxMaterialTintColor(fallbackColor: THREE.Color): THREE.Color {
  return fallbackColor;
}

function createAuroraTexturedParticleQuadGeometry(
  width: number,
  height: number
): THREE.BufferGeometry {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -halfWidth,
        -halfHeight,
        0,
        halfWidth,
        -halfHeight,
        0,
        -halfWidth,
        halfHeight,
        0,
        -halfWidth,
        halfHeight,
        0,
        halfWidth,
        -halfHeight,
        0,
        halfWidth,
        halfHeight,
        0
      ],
      3
    )
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      [
        0,
        0,
        1,
        0,
        0,
        1,
        0,
        1,
        1,
        0,
        1,
        1
      ],
      2
    )
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(new Array(24).fill(1), 4)
  );
  geometry.setAttribute(
    "auroraAlpha",
    new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1], 1)
  );
  geometry.userData = {
    ...geometry.userData,
    auroraVfxTexturedParticleQuad: true,
    auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list",
    auroraVfxParticleVertexCount: 6,
    auroraParticleDrawIndexedBuffer: false,
    auroraParticleDrawApiCandidate: "glDrawArrays",
    auroraParticleDrawModeArg: 3,
    auroraParticleDrawModeEnumCaptured: false,
    auroraParticleDrawVerticesPerParticle: 6,
    auroraParticleDrawModePreview: "triangle-list-shaped-six-vertex-quad",
    auroraParticleDrawDiagnostics: [
      "VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED",
      "VFX_PARTICLE_DRAW_MODE_ARG3_ENUM_TABLE_CAPTURE_REQUIRED"
    ],
    auroraVfxParticleVertexColor: true,
    auroraVfxParticleVertexColorLayout: "rgba-per-vertex-packed-color-preview",
    auroraVfxParticleVertexAlpha: true,
    auroraVfxParticleVertexAlphaLayout: "alpha-per-vertex-packed-color-preview",
    auroraVfxParticleVertexAlphaThreeAdapter: "three-use-color-alpha"
  };
  return geometry;
}

function createAuroraTexturedParticleBatchGeometry(
  record: AuroraParticleDrawRecord
): THREE.BufferGeometry {
  const vertexCount = record.drawVertexCount;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const colors = new Float32Array(vertexCount * 4);
  const alphas = new Float32Array(vertexCount);
  const defaultUv = [
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    1,
    1,
    0,
    1,
    1
  ];
  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    const uvOffset = vertexIndex * 2;
    const colorOffset = vertexIndex * 4;
    const defaultUvOffset = (vertexIndex % 6) * 2;
    uvs[uvOffset] = defaultUv[defaultUvOffset] ?? 0;
    uvs[uvOffset + 1] = defaultUv[defaultUvOffset + 1] ?? 0;
    colors[colorOffset] = 1;
    colors[colorOffset + 1] = 1;
    colors[colorOffset + 2] = 1;
    colors[colorOffset + 3] = 0;
    alphas[vertexIndex] = 0;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));
  geometry.setAttribute("auroraAlpha", new THREE.BufferAttribute(alphas, 1));
  geometry.userData = {
    ...geometry.userData,
    auroraVfxTexturedParticleBatch: true,
    auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list",
    auroraVfxParticleVertexCount: 6,
    auroraParticleBatchGeometryPreviewMode: "aurora-contiguous-particle-vertex-buffer",
    auroraParticleBatchVertexStride: 6,
    auroraParticleBatchVertexCapacity: vertexCount,
    auroraParticleBatchActiveParticleCapacity: record.drawParticleCount,
    auroraVfxParticleVertexColor: true,
    auroraVfxParticleVertexColorLayout: "rgba-per-vertex-packed-color-preview",
    auroraVfxParticleVertexAlpha: true,
    auroraVfxParticleVertexAlphaLayout: "alpha-per-vertex-packed-color-preview",
    auroraVfxParticleVertexAlphaThreeAdapter: "three-use-color-alpha"
  };
  applyAuroraParticleDrawRecordUserData(geometry, record);
  return geometry;
}

function resolveAuroraCameraBillboardBasis(
  parent: THREE.Object3D | null,
  center: THREE.Vector3,
  camera: THREE.Camera,
  rollRadians = 0
): { right: THREE.Vector3; up: THREE.Vector3; normal: THREE.Vector3 } {
  const localCameraPosition = camera.position.clone();
  parent?.worldToLocal(localCameraPosition);
  const normal = localCameraPosition.sub(center);
  if (normal.lengthSq() <= 1e-10) {
    normal.set(0, 0, 1);
  } else {
    normal.normalize();
  }

  const cameraWorldQuaternion = new THREE.Quaternion();
  camera.getWorldQuaternion(cameraWorldQuaternion);
  const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraWorldQuaternion);
  if (parent) {
    const parentWorldQuaternion = new THREE.Quaternion();
    parent.getWorldQuaternion(parentWorldQuaternion);
    cameraUp.applyQuaternion(parentWorldQuaternion.invert());
  }
  cameraUp.addScaledVector(normal, -cameraUp.dot(normal));
  if (cameraUp.lengthSq() <= 1e-10) {
    cameraUp.set(0, 1, 0);
    cameraUp.addScaledVector(normal, -cameraUp.dot(normal));
  }
  if (cameraUp.lengthSq() <= 1e-10) {
    cameraUp.set(1, 0, 0);
    cameraUp.addScaledVector(normal, -cameraUp.dot(normal));
  }
  cameraUp.normalize();

  const right = new THREE.Vector3().crossVectors(cameraUp, normal);
  if (right.lengthSq() <= 1e-10) {
    right.set(1, 0, 0);
  } else {
    right.normalize();
  }
  const up = new THREE.Vector3().crossVectors(normal, right).normalize();

  if (rollRadians !== 0) {
    const roll = new THREE.Matrix4().makeRotationAxis(normal, rollRadians);
    right.applyMatrix4(roll).normalize();
    up.applyMatrix4(roll).normalize();
  }

  return { right, up, normal };
}

function hideAuroraParticleInBatchGeometry(
  geometry: THREE.BufferGeometry,
  particleIndex: number
): void {
  const alphaAttribute = geometry.getAttribute("auroraAlpha");
  const colorAttribute = geometry.getAttribute("color");
  if (!(alphaAttribute instanceof THREE.BufferAttribute)) {
    return;
  }
  const vertexOffset = particleIndex * 6;
  for (let localIndex = 0; localIndex < 6; localIndex += 1) {
    const index = vertexOffset + localIndex;
    alphaAttribute.setX(index, 0);
    if (colorAttribute instanceof THREE.BufferAttribute && colorAttribute.itemSize >= 4) {
      colorAttribute.setW(index, 0);
    }
  }
}

function copyAuroraParticleSlotGeometryToBatchGeometry(
  slotMesh: THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>,
  batchGeometry: THREE.BufferGeometry,
  particleIndex: number,
  batchParent: THREE.Object3D | null,
  options?: { slotTransformSpace?: "scene-child" | "detached-parent-local" }
): boolean {
  const sourcePosition = slotMesh.geometry.getAttribute("position");
  const sourceUv = slotMesh.geometry.getAttribute("uv");
  const sourceColor = slotMesh.geometry.getAttribute("color");
  const sourceAlpha = slotMesh.geometry.getAttribute("auroraAlpha");
  const targetPosition = batchGeometry.getAttribute("position");
  const targetUv = batchGeometry.getAttribute("uv");
  const targetColor = batchGeometry.getAttribute("color");
  const targetAlpha = batchGeometry.getAttribute("auroraAlpha");
  if (
    !(sourcePosition instanceof THREE.BufferAttribute) ||
    !(targetPosition instanceof THREE.BufferAttribute) ||
    sourcePosition.count < 6 ||
    targetPosition.count < particleIndex * 6 + 6
  ) {
    return false;
  }

  const slotTransformSpace = options?.slotTransformSpace ?? "scene-child";
  if (slotTransformSpace === "detached-parent-local") {
    slotMesh.updateMatrix();
  } else {
    slotMesh.updateMatrixWorld(true);
  }
  const vertex = new THREE.Vector3();
  const vertexOffset = particleIndex * 6;
  for (let localIndex = 0; localIndex < 6; localIndex += 1) {
    const targetIndex = vertexOffset + localIndex;
    vertex.fromBufferAttribute(sourcePosition, localIndex);
    if (slotTransformSpace === "detached-parent-local") {
      vertex.applyMatrix4(slotMesh.matrix);
    } else {
      slotMesh.localToWorld(vertex);
      batchParent?.worldToLocal(vertex);
    }
    targetPosition.setXYZ(targetIndex, vertex.x, vertex.y, vertex.z);
    if (
      sourceUv instanceof THREE.BufferAttribute &&
      targetUv instanceof THREE.BufferAttribute &&
      sourceUv.count > localIndex &&
      targetUv.count > targetIndex
    ) {
      targetUv.setXY(targetIndex, sourceUv.getX(localIndex), sourceUv.getY(localIndex));
    }
    if (
      sourceColor instanceof THREE.BufferAttribute &&
      targetColor instanceof THREE.BufferAttribute &&
      sourceColor.count > localIndex &&
      targetColor.count > targetIndex
    ) {
      if (targetColor.itemSize >= 4) {
        const alpha =
          sourceColor.itemSize >= 4
            ? sourceColor.getW(localIndex)
            : sourceAlpha instanceof THREE.BufferAttribute
              ? sourceAlpha.getX(localIndex)
              : 1;
        targetColor.setXYZW(
          targetIndex,
          sourceColor.getX(localIndex),
          sourceColor.getY(localIndex),
          sourceColor.getZ(localIndex),
          alpha
        );
      } else {
        targetColor.setXYZ(
          targetIndex,
          sourceColor.getX(localIndex),
          sourceColor.getY(localIndex),
          sourceColor.getZ(localIndex)
        );
      }
    }
    if (
      sourceAlpha instanceof THREE.BufferAttribute &&
      targetAlpha instanceof THREE.BufferAttribute &&
      sourceAlpha.count > localIndex &&
      targetAlpha.count > targetIndex
    ) {
      targetAlpha.setX(targetIndex, sourceAlpha.getX(localIndex));
    }
  }
  return true;
}

function updateVfxMaterialAtlasFrame(
  material: PlaceableVfxPreviewMaterial,
  ageSeconds?: number,
  geometry?: THREE.BufferGeometry
): void {
  const atlas = material.userData.auroraAtlas as ResolvedAuroraEmitterAtlas | undefined;
  const frameSeed = material.userData.auroraAtlasFrameSeed;
  const nowBaseMs = material.userData.auroraAtlasNowBaseMs;
  if (
    !atlas ||
    !material.map ||
    typeof frameSeed !== "number" ||
    typeof nowBaseMs !== "number"
  ) {
    return;
  }
  const frameState = resolveAuroraAtlasCheckpointFrameState(
    material,
    atlas,
    frameSeed,
    nowBaseMs,
    ageSeconds
  );
  const rawFrame = frameState.rawFrame;
  const frameAddress = resolveAuroraAtlasFrameAddress(atlas, rawFrame);
  applyAuroraAtlasTextureState(material.map);
  if (material.alphaMap) {
    applyAuroraAtlasTextureState(material.alphaMap);
  }
  const materialFrameIsCurrent = material.userData.auroraAtlasRawFrame === rawFrame;
  const geometryFrameIsCurrent =
    !geometry || geometry.userData?.auroraAtlasRawFrame === rawFrame;
  if (!materialFrameIsCurrent) {
    material.userData = {
      ...material.userData,
      ...buildAuroraAtlasFrameUserData(frameAddress)
    };
  }
  material.userData = {
    ...material.userData,
    ...buildAuroraAtlasCheckpointUserData(atlas, frameSeed, frameState)
  };
  if (geometry && !geometryFrameIsCurrent) {
    applyAuroraAtlasFrameToGeometry(geometry, frameAddress);
  }
  if (geometry) {
    geometry.userData = {
      ...geometry.userData,
      ...buildAuroraAtlasCheckpointUserData(atlas, frameSeed, frameState)
    };
  }
  if (typeof ageSeconds === "number") {
    material.userData = {
      ...material.userData,
      auroraAtlasPreviewMode: "particle-age-vertex-uv-preview",
      auroraAtlasParticleAgeSeconds: ageSeconds
    };
  } else if (!materialFrameIsCurrent) {
    material.userData = {
      ...material.userData,
      auroraAtlasPreviewMode: "per-particle-vertex-uv-preview"
    };
  }
}

export function createPlaceableVfxGeometryFromPayload(
  payload: PlaceableViewportRenderPayload,
  objectRadius: number
): THREE.BufferGeometry {
  const fingerprint = buildPlaceableVfxFingerprint(payload);
  if (/(shaft|light|plc_v\d+)/iu.test(fingerprint)) {
    return new THREE.CylinderGeometry(
      objectRadius * 0.18,
      objectRadius * 0.34,
      objectRadius * 4.2,
      24,
      1,
      true
    );
  }

  return new THREE.OctahedronGeometry(objectRadius * 0.88, 1);
}

function computeVfxParticleCycle(
  elapsedSeconds: number,
  phase: number,
  speed: number,
  lifeSeconds: number | undefined
): number {
  if (lifeSeconds && lifeSeconds > 0) {
    return positiveModulo(elapsedSeconds / lifeSeconds + phase / (Math.PI * 2), 1);
  }
  return positiveModulo(elapsedSeconds * speed + phase, 1);
}

interface VfxParticleSchedule {
  visible: boolean;
  normalizedAge: number;
  ageSeconds?: number;
}

function hasAuthoredAuroraEmitterBirthrate(profile: PlaceableVfxPreviewProfile): boolean {
  return (
    (typeof profile.birthrate === "number" && Number.isFinite(profile.birthrate)) ||
    (Array.isArray(profile.birthrateKeyframes) && profile.birthrateKeyframes.length > 0)
  );
}

function resolveAuroraEmitterBirthrateAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): number | undefined {
  const timelineBirthrate = sampleAuroraEmitterProfileTimeline(
    profile,
    "birthrate",
    elapsedSeconds
  );
  const sourceBirthrate =
    typeof timelineBirthrate === "number" && Number.isFinite(timelineBirthrate)
      ? timelineBirthrate
      : profile.birthrate;
  return typeof sourceBirthrate === "number" && Number.isFinite(sourceBirthrate)
    ? sourceBirthrate
    : undefined;
}

function resolveVfxParticleSpawnOffsetSeconds(
  profile: PlaceableVfxPreviewProfile,
  index: number,
  elapsedSeconds?: number
): number {
  if (profile.motionMode === "single") {
    return 0;
  }
  if (profile.emissionMode === "burst") {
    return index * 0.012;
  }
  const evaluatedBirthrate = resolveAuroraEmitterBirthrateAtElapsed(profile, elapsedSeconds);
  const birthrate =
    typeof evaluatedBirthrate === "number" && evaluatedBirthrate > 0 ? evaluatedBirthrate : 0;
  if (birthrate > 0) {
    return profile.fountainNormalPreviewMode ? (index + 1) / birthrate : index / birthrate;
  }
  if (hasAuthoredAuroraEmitterBirthrate(profile)) {
    return Number.POSITIVE_INFINITY;
  }
  const lifeSeconds =
    typeof profile.lifeSeconds === "number" && profile.lifeSeconds > 0 ? profile.lifeSeconds : 1;
  return (index / Math.max(1, profile.count)) * lifeSeconds;
}

function resolveVfxDetonateEventTimeSeconds(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number
): number {
  const events = profile.detonateEvents;
  if (!events || events.length === 0) {
    return 0;
  }
  if (profile.loopEmission === false) {
    return events[0]?.time ?? 0;
  }
  const sortedEvents = events.slice().sort((left, right) => left.time - right.time);
  const duration = Math.max(
    profile.lifeSeconds ?? 0,
    sortedEvents[sortedEvents.length - 1]?.time ?? 0
  );
  if (duration <= 1e-6) {
    return sortedEvents[0]?.time ?? 0;
  }
  const localTime = positiveModulo(elapsedSeconds, duration);
  for (let index = sortedEvents.length - 1; index >= 0; index -= 1) {
    const event = sortedEvents[index];
    if (event && event.time <= localTime) {
      return elapsedSeconds - (localTime - event.time);
    }
  }
  return elapsedSeconds - localTime + (sortedEvents[0]?.time ?? 0);
}

function resolveVfxParticleSchedule(
  profile: PlaceableVfxPreviewProfile,
  index: number,
  elapsedSeconds: number,
  phase: number,
  speed: number
): VfxParticleSchedule {
  if (elapsedSeconds < 0) {
    return { visible: false, normalizedAge: 0 };
  }
  const lifeSeconds =
    typeof profile.lifeSeconds === "number" && profile.lifeSeconds > 0
      ? profile.lifeSeconds
      : undefined;
  if (!lifeSeconds) {
    return {
      visible: true,
      normalizedAge: computeVfxParticleCycle(elapsedSeconds, phase, speed, undefined)
    };
  }

  if (profile.motionMode === "explosion") {
    const burstOffset = resolveVfxParticleSpawnOffsetSeconds(profile, index, elapsedSeconds);
    if (!Number.isFinite(burstOffset)) {
      return { visible: false, normalizedAge: 0 };
    }
    const detonateTime = resolveVfxDetonateEventTimeSeconds(profile, elapsedSeconds);
    const burstAge = elapsedSeconds - detonateTime - burstOffset;
    if (burstAge < 0 || (!profile.loopEmission && burstAge > lifeSeconds)) {
      return { visible: false, normalizedAge: 0 };
    }
    const wrappedAge = profile.loopEmission
      ? positiveModulo(burstAge, lifeSeconds)
      : clampNumber(burstAge, 0, lifeSeconds);
    return {
      visible: true,
      normalizedAge: clampNumber(wrappedAge / lifeSeconds, 0, 1),
      ageSeconds: wrappedAge
    };
  }

  const spawnOffset = resolveVfxParticleSpawnOffsetSeconds(profile, index, elapsedSeconds);
  if (!Number.isFinite(spawnOffset)) {
    return { visible: false, normalizedAge: 0 };
  }
  const localAge = elapsedSeconds - spawnOffset;
  if (localAge < 0) {
    return { visible: false, normalizedAge: 0 };
  }
  if (profile.motionMode === "single" && !profile.loopEmission && localAge > lifeSeconds) {
    return { visible: false, normalizedAge: 1 };
  }
  const age = profile.loopEmission === false
    ? clampNumber(localAge, 0, lifeSeconds)
    : positiveModulo(localAge, lifeSeconds);
  return {
    visible: true,
    normalizedAge: clampNumber(age / lifeSeconds, 0, 1),
    ageSeconds: age
  };
}

function shouldUseTemporalParticleSchedule(profile: PlaceableVfxPreviewProfile): boolean {
  return (
    (typeof profile.emitterStartDelaySeconds === "number" &&
      profile.emitterStartDelaySeconds > 0) ||
    (profile.motionMode === "single" && profile.loopEmission === true) ||
    profile.height > 0 ||
    profile.zeroMotionPreviewMode === "explicit-zero-kinematics-temporal-particles-preview"
  );
}

function isAuroraEmitterColorVisible(color: [number, number, number] | undefined): boolean {
  if (!color) {
    return false;
  }
  return color[0] > 0.001 || color[1] > 0.001 || color[2] > 0.001;
}

function resolveStaticVfxParticleRepresentativeAge(
  profile: PlaceableVfxPreviewProfile
): number {
  if (
    profile.zeroMotionPreviewMode === "explicit-zero-kinematics-static-sheet-preview" &&
    !isAuroraEmitterColorVisible(profile.particleColorStart) &&
    isAuroraEmitterColorVisible(profile.particleColorEnd)
  ) {
    return 1;
  }
  return 0;
}

function resolveStaticVfxParticleSchedule(profile: PlaceableVfxPreviewProfile): VfxParticleSchedule {
  const normalizedAge = resolveStaticVfxParticleRepresentativeAge(profile);
  const lifeSeconds =
    typeof profile.lifeSeconds === "number" && profile.lifeSeconds > 0
      ? profile.lifeSeconds
      : undefined;
  return {
    visible: true,
    normalizedAge,
    ...(lifeSeconds ? { ageSeconds: normalizedAge * lifeSeconds } : {})
  };
}

function shouldSuppressProceduralParticleModulation(
  profile: PlaceableVfxPreviewProfile
): boolean {
  return profile.zeroMotionPreviewMode !== undefined;
}

function lerpNumber(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function resolveAuroraEmitterCurvePercent(
  profile: PlaceableVfxPreviewProfile,
  key: "percentStart" | "percentMid" | "percentEnd",
  fallback: number,
  elapsedSeconds: number | undefined
): number {
  const profileValue =
    key === "percentStart"
      ? profile.particlePercentStart
      : key === "percentMid"
        ? profile.particlePercentMid
        : profile.particlePercentEnd;
  return clampNumber(
    sampleAuroraEmitterProfileTimeline(profile, key, elapsedSeconds) ?? profileValue ?? fallback,
    0,
    1
  );
}

function resolveAuroraEmitterCurvePercents(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): { start: number; mid: number; end: number } {
  let start = resolveAuroraEmitterCurvePercent(profile, "percentStart", 0, elapsedSeconds);
  let end = resolveAuroraEmitterCurvePercent(profile, "percentEnd", 1, elapsedSeconds);
  if (end < start) {
    [start, end] = [end, start];
  }
  const mid = clampNumber(
    resolveAuroraEmitterCurvePercent(profile, "percentMid", (start + end) * 0.5, elapsedSeconds),
    start,
    end
  );
  return { start, mid, end };
}

function sampleAuroraEmitterNumberCurve(
  profile: PlaceableVfxPreviewProfile,
  start: number,
  mid: number | undefined,
  end: number,
  normalizedAge: number,
  elapsedSeconds: number | undefined
): number {
  const age = clampNumber(normalizedAge, 0, 1);
  const percents = resolveAuroraEmitterCurvePercents(profile, elapsedSeconds);
  if (age <= percents.start) {
    return start;
  }
  if (age >= percents.end) {
    return end;
  }
  if (typeof mid !== "number" || !Number.isFinite(mid)) {
    const span = Math.max(percents.end - percents.start, 1e-6);
    return lerpNumber(start, end, clampNumber((age - percents.start) / span, 0, 1));
  }
  if (age <= percents.mid) {
    const span = Math.max(percents.mid - percents.start, 1e-6);
    return lerpNumber(start, mid, clampNumber((age - percents.start) / span, 0, 1));
  }
  const span = Math.max(percents.end - percents.mid, 1e-6);
  return lerpNumber(mid, end, clampNumber((age - percents.mid) / span, 0, 1));
}

function sampleAuroraEmitterNumberKeyframesAtElapsed(
  frames: ResolvedAuroraEmitterNumberKeyframe[] | undefined,
  elapsedSeconds: number | undefined,
  loop = true
): number | undefined {
  if (!frames || frames.length === 0) {
    return undefined;
  }
  if (frames.length === 1) {
    return frames[0]?.value;
  }

  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];
  if (!firstFrame || !lastFrame) {
    return undefined;
  }

  const firstTime = firstFrame.time;
  const lastTime = lastFrame.time;
  const duration = lastTime - firstTime;
  let sampleTime =
    typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
      ? elapsedSeconds
      : firstTime;

  if (duration > 1e-6) {
    sampleTime = loop
      ? firstTime + positiveModulo(sampleTime - firstTime, duration)
      : clampNumber(sampleTime, firstTime, lastTime);
  }

  if (sampleTime <= firstTime || duration <= 1e-6) {
    return firstFrame.value;
  }
  if (sampleTime >= lastTime) {
    return lastFrame.value;
  }

  for (let index = 1; index < frames.length; index += 1) {
    const current = frames[index];
    const previous = frames[index - 1];
    if (!current || !previous || sampleTime > current.time) {
      continue;
    }
    const segmentDuration = current.time - previous.time;
    if (segmentDuration <= 1e-6) {
      return current.value;
    }
    return lerpNumber(
      previous.value,
      current.value,
      clampNumber((sampleTime - previous.time) / segmentDuration, 0, 1)
    );
  }

  return lastFrame.value;
}

function sampleAuroraEmitterProfileTimeline(
  profile: PlaceableVfxPreviewProfile,
  key: ResolvedAuroraEmitterSimulationTimelineKey,
  elapsedSeconds: number | undefined
): number | undefined {
  return sampleAuroraEmitterNumberKeyframesAtElapsed(
    profile.simulationTimeline?.[key],
    elapsedSeconds,
    profile.loopEmission !== false
  );
}

function sampleAuroraEmitterProfileSizeTimeline(
  profile: PlaceableVfxPreviewProfile,
  key: "sizeStart" | "sizeMid" | "sizeEnd" | "sizeStartY" | "sizeMidY" | "sizeEndY",
  elapsedSeconds: number | undefined
): number | undefined {
  const value = sampleAuroraEmitterProfileTimeline(profile, key, elapsedSeconds);
  if (typeof value !== "number") {
    return undefined;
  }
  return value * (profile.particleSizeTimelineScale ?? 1);
}

function lerpAuroraColorVector(
  start: [number, number, number],
  end: [number, number, number],
  amount: number
): [number, number, number] {
  return [
    lerpNumber(start[0], end[0], amount),
    lerpNumber(start[1], end[1], amount),
    lerpNumber(start[2], end[2], amount)
  ];
}

function sampleAuroraEmitterColorCurve(
  profile: PlaceableVfxPreviewProfile,
  start: [number, number, number],
  mid: [number, number, number] | undefined,
  end: [number, number, number],
  normalizedAge: number,
  elapsedSeconds: number | undefined
): [number, number, number] {
  const age = clampNumber(normalizedAge, 0, 1);
  const percents = resolveAuroraEmitterCurvePercents(profile, elapsedSeconds);
  if (age <= percents.start) {
    return start;
  }
  if (age >= percents.end) {
    return end;
  }
  if (!mid) {
    const span = Math.max(percents.end - percents.start, 1e-6);
    return lerpAuroraColorVector(start, end, clampNumber((age - percents.start) / span, 0, 1));
  }
  if (age <= percents.mid) {
    const span = Math.max(percents.mid - percents.start, 1e-6);
    return lerpAuroraColorVector(start, mid, clampNumber((age - percents.start) / span, 0, 1));
  }
  const span = Math.max(percents.end - percents.mid, 1e-6);
  return lerpAuroraColorVector(mid, end, clampNumber((age - percents.mid) / span, 0, 1));
}

function sampleAuroraEmitterColorKeyframesAtElapsed(
  frames: ResolvedAuroraEmitterColorKeyframe[] | undefined,
  elapsedSeconds: number | undefined,
  loop = true
): [number, number, number] | undefined {
  if (!frames || frames.length === 0) {
    return undefined;
  }
  if (frames.length === 1) {
    return frames[0]?.value;
  }

  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];
  if (!firstFrame || !lastFrame) {
    return undefined;
  }

  const firstTime = firstFrame.time;
  const lastTime = lastFrame.time;
  const duration = lastTime - firstTime;
  let sampleTime =
    typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
      ? elapsedSeconds
      : firstTime;

  if (duration > 1e-6) {
    sampleTime = loop
      ? firstTime + positiveModulo(sampleTime - firstTime, duration)
      : clampNumber(sampleTime, firstTime, lastTime);
  }

  if (sampleTime <= firstTime || duration <= 1e-6) {
    return firstFrame.value;
  }
  if (sampleTime >= lastTime) {
    return lastFrame.value;
  }

  for (let index = 1; index < frames.length; index += 1) {
    const current = frames[index];
    const previous = frames[index - 1];
    if (!current || !previous || sampleTime > current.time) {
      continue;
    }
    const segmentDuration = current.time - previous.time;
    if (segmentDuration <= 1e-6) {
      return current.value;
    }
    return lerpAuroraColorVector(
      previous.value,
      current.value,
      clampNumber((sampleTime - previous.time) / segmentDuration, 0, 1)
    );
  }

  return lastFrame.value;
}

function sampleAuroraEmitterProfileColorTimeline(
  profile: PlaceableVfxPreviewProfile,
  key: ResolvedAuroraEmitterColorTimelineKey,
  elapsedSeconds: number | undefined
): [number, number, number] | undefined {
  return sampleAuroraEmitterColorKeyframesAtElapsed(
    profile.particleColorTimeline?.[key],
    elapsedSeconds,
    profile.loopEmission !== false
  );
}

function formatAuroraColorHexFromVector(color: [number, number, number]): string {
  return `#${color.map(formatAuroraColorChannelHex).join("")}`;
}

function createAuroraColorFromVector(color: [number, number, number]): THREE.Color {
  const sanitizedColor: [number, number, number] = [
    Math.max(0, Number(color[0] ?? 0)),
    Math.max(0, Number(color[1] ?? 0)),
    Math.max(0, Number(color[2] ?? 0))
  ];
  if (Math.max(...sanitizedColor) <= 1) {
    return new THREE.Color(formatAuroraColorHexFromVector(sanitizedColor));
  }
  return new THREE.Color(sanitizedColor[0], sanitizedColor[1], sanitizedColor[2]);
}

function resolveVfxParticleAgeSeconds(
  normalizedAge: number,
  lifeSeconds: number | undefined
): number | undefined {
  return lifeSeconds && lifeSeconds > 0 ? normalizedAge * lifeSeconds : undefined;
}

function resolveVfxParticleOpacity(
  profile: PlaceableVfxPreviewProfile,
  normalizedAge: number,
  fallbackOpacity: number,
  elapsedSeconds?: number
): number {
  const timelineStart = sampleAuroraEmitterProfileTimeline(profile, "alphaStart", elapsedSeconds);
  const timelineMid = sampleAuroraEmitterProfileTimeline(profile, "alphaMid", elapsedSeconds);
  const timelineEnd = sampleAuroraEmitterProfileTimeline(profile, "alphaEnd", elapsedSeconds);
  const hasAlphaCurve =
    typeof timelineStart === "number" ||
    typeof timelineMid === "number" ||
    typeof timelineEnd === "number" ||
    typeof profile.particleAlphaStart === "number" ||
    typeof profile.particleAlphaMid === "number" ||
    typeof profile.particleAlphaEnd === "number";
  if (!hasAlphaCurve) {
    return fallbackOpacity;
  }
  const start = timelineStart ?? profile.particleAlphaStart ?? profile.baseOpacity;
  const mid = timelineMid ?? profile.particleAlphaMid;
  const end = timelineEnd ?? profile.particleAlphaEnd ?? start;
  const sourceAlpha = clampNumber(
    sampleAuroraEmitterNumberCurve(
      profile,
      start,
      mid,
      end,
      normalizedAge,
      elapsedSeconds
    ),
    0,
    1
  );
  return typeof profile.particleAlphaPreviewClamp === "number"
    ? Math.min(sourceAlpha, profile.particleAlphaPreviewClamp)
    : sourceAlpha;
}

function resolveInitialVfxParticleOpacity(
  profile: PlaceableVfxPreviewProfile,
  particleTexture: THREE.Texture | null,
  index = 0,
  phase = 0,
  speed = 1
): number {
  if (!particleTexture) {
    return 0;
  }
  const initialElapsedSeconds = -(profile.emitterStartDelaySeconds ?? 0);
  const schedule = shouldUseTemporalParticleSchedule(profile)
    ? resolveVfxParticleSchedule(profile, index, initialElapsedSeconds, phase, speed)
    : resolveStaticVfxParticleSchedule(profile);
  if (!schedule.visible) {
    return 0;
  }
  return resolveVfxParticleOpacity(
    profile,
    schedule.normalizedAge,
    profile.baseOpacity,
    Math.max(0, initialElapsedSeconds)
  );
}

function resolveVfxParticleVerticalOffset(
  profile: PlaceableVfxPreviewProfile,
  normalizedAge: number,
  baseOffset: number
): number {
  const gravityBias = profile.gravityBias ?? 0;
  if (gravityBias === 0) {
    return baseOffset;
  }
  const gravityOffset = gravityBias * profile.height * normalizedAge * normalizedAge * 0.35;
  return baseOffset + gravityOffset;
}

function resolveAuroraBounceCoefficientAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): number | undefined {
  const timelineCoefficient = sampleAuroraEmitterProfileTimeline(
    profile,
    "bounceCoefficient",
    elapsedSeconds
  );
  const coefficient = timelineCoefficient ?? profile.bounceCoefficient;
  return typeof coefficient === "number" && Number.isFinite(coefficient)
    ? clampNumber(coefficient, 0, 1)
    : undefined;
}

function applyAuroraBounceFloorPlaneOffset(
  profile: PlaceableVfxPreviewProfile,
  offset: THREE.Vector3,
  elapsedSeconds?: number
): THREE.Vector3 {
  const bounceCoefficient = resolveAuroraBounceCoefficientAtElapsed(profile, elapsedSeconds);
  if (
    typeof bounceCoefficient !== "number" ||
    bounceCoefficient <= 0 ||
    offset.y >= 0
  ) {
    return offset;
  }
  offset.y = -offset.y * bounceCoefficient;
  return offset;
}

function resolveAuroraBouncedVerticalOffset(
  profile: PlaceableVfxPreviewProfile,
  verticalOffset: number,
  elapsedSeconds?: number
): number {
  const bounceCoefficient = resolveAuroraBounceCoefficientAtElapsed(profile, elapsedSeconds);
  if (
    typeof bounceCoefficient !== "number" ||
    bounceCoefficient <= 0 ||
    verticalOffset >= 0
  ) {
    return verticalOffset;
  }
  return -verticalOffset * bounceCoefficient;
}

function applyAuroraSplatFloorPlaneToMesh(
  mesh: THREE.Mesh,
  profile: PlaceableVfxPreviewProfile,
  rollRadians = 0
): boolean {
  if (profile.splat !== true || mesh.position.y >= 0) {
    return false;
  }
  mesh.position.y = 0;
  mesh.rotation.set(-Math.PI / 2, 0, rollRadians);
  mesh.userData = {
    ...mesh.userData,
    auroraEmitterSplatLanded: true,
    auroraEmitterSplatParticlePreviewMode: "floor-plane-splat-preview",
    auroraParticleBasisPreviewMode: "aurora-splat-floor-plane-basis",
    auroraParticleBillboardRoll: rollRadians
  };
  return true;
}

function resolveVfxParticleDriftScale(_profile: PlaceableVfxPreviewProfile): number {
  return 1;
}

function resolveVfxParticleBlurStretch(profile: PlaceableVfxPreviewProfile): number {
  return profile.blurStretch ?? 1;
}

function resolveVfxParticleSeed(index: number, salt: number): number {
  return (((index + 1) * salt) % 1000) / 1000;
}

const AURORA_EMITTER_RANDVEL_GATE = 0.01;

function resolveAuroraEmitterSignedRandomUnit(index: number, salt: number): number {
  return resolveVfxParticleSeed(index, salt) * 2 - 1;
}

function hasAuroraEmitterRandvelTerm(profile: PlaceableVfxPreviewProfile): boolean {
  const motionScale = profile.emitterMotionUnitScale ?? 1;
  const randomVelocityGate =
    profile.particleRandomVelocityGate ?? AURORA_EMITTER_RANDVEL_GATE * motionScale;
  if (
    typeof profile.particleRandomVelocity === "number" &&
    Math.abs(profile.particleRandomVelocity) > randomVelocityGate
  ) {
    return true;
  }
  return Boolean(
    profile.simulationTimeline?.randvel?.some((frame) =>
      Math.abs(Math.max(0, frame.value) * motionScale) > randomVelocityGate
    )
  );
}

function hasAuroraEmitterRandvelSource(profile: PlaceableVfxPreviewProfile): boolean {
  return (
    typeof profile.particleRandomVelocity === "number" ||
    Boolean(profile.simulationTimeline?.randvel?.length)
  );
}

function hasAuroraEmitterVelocityTimeline(profile: PlaceableVfxPreviewProfile): boolean {
  const motionScale = profile.emitterMotionUnitScale ?? 1;
  return Boolean(
    profile.simulationTimeline?.velocity?.some((frame) =>
      Math.abs(frame.value * motionScale) > 1e-10
    )
  );
}

function hasAuroraEmitterKinematicTimeline(profile: PlaceableVfxPreviewProfile): boolean {
  return Boolean(
    profile.simulationTimeline?.velocity?.length ||
    profile.simulationTimeline?.randvel?.length ||
    profile.simulationTimeline?.spread?.length
  );
}

function hasAuroraEmitterMassTimeline(profile: PlaceableVfxPreviewProfile): boolean {
  const motionScale = profile.emitterMotionUnitScale ?? 1;
  return Boolean(
    profile.simulationTimeline?.mass?.some((frame) =>
      Math.abs(frame.value * motionScale) > 1e-10
    )
  );
}

function hasAuroraEmitterMassSource(profile: PlaceableVfxPreviewProfile): boolean {
  return (
    typeof profile.particleAccelerationY === "number" ||
    Boolean(profile.simulationTimeline?.mass?.length)
  );
}

function resolveAuroraEmitterParticleVelocityAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): number {
  const timelineVelocity = sampleAuroraEmitterProfileTimeline(
    profile,
    "velocity",
    elapsedSeconds
  );
  if (typeof timelineVelocity === "number") {
    return timelineVelocity * (profile.emitterMotionUnitScale ?? 1);
  }
  return profile.particleVelocity ?? 0;
}

function resolveAuroraEmitterParticleRandomVelocityAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): number {
  const timelineRandomVelocity = sampleAuroraEmitterProfileTimeline(
    profile,
    "randvel",
    elapsedSeconds
  );
  if (typeof timelineRandomVelocity === "number") {
    return Math.max(0, timelineRandomVelocity) * (profile.emitterMotionUnitScale ?? 1);
  }
  return profile.particleRandomVelocity ?? 0;
}

function resolveAuroraEmitterParticleSpreadRadiansAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): number {
  const timelineSpread = sampleAuroraEmitterProfileTimeline(profile, "spread", elapsedSeconds);
  if (typeof timelineSpread === "number") {
    return resolveAuroraEmitterSpreadRadians(Math.max(0, timelineSpread));
  }
  return profile.particleSpreadRadians ?? 0;
}

function resolveAuroraEmitterParticleAccelerationYAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): number {
  const timelineMass = sampleAuroraEmitterProfileTimeline(profile, "mass", elapsedSeconds);
  if (typeof timelineMass === "number") {
    return -timelineMass * (profile.emitterMotionUnitScale ?? 1);
  }
  return profile.particleAccelerationY ?? 0;
}

function resolveAuroraEmitterParticleSpeed(
  profile: PlaceableVfxPreviewProfile,
  index: number,
  elapsedSeconds?: number
): number {
  const baseVelocity = resolveAuroraEmitterParticleVelocityAtElapsed(profile, elapsedSeconds);
  const randomVelocity = resolveAuroraEmitterParticleRandomVelocityAtElapsed(
    profile,
    elapsedSeconds
  );
  const motionScale = profile.emitterMotionUnitScale ?? 1;
  const randomVelocityGate =
    profile.particleRandomVelocityGate ?? AURORA_EMITTER_RANDVEL_GATE * motionScale;
  const randomSpeedTerm = Math.abs(randomVelocity) > randomVelocityGate
    ? randomVelocity * 0.01 * resolveAuroraEmitterSignedRandomUnit(index, 571)
    : 0;
  return baseVelocity + randomSpeedTerm;
}

function hasAuroraKinematicMotion(profile: PlaceableVfxPreviewProfile): boolean {
  return (
    Boolean(profile.p2pTargetOffset) ||
    (typeof profile.particleVelocity === "number" && profile.particleVelocity !== 0) ||
    hasAuroraEmitterVelocityTimeline(profile) ||
    hasAuroraEmitterRandvelTerm(profile) ||
    hasAuroraEmitterMassTimeline(profile) ||
    (typeof profile.particleAccelerationY === "number" && profile.particleAccelerationY !== 0)
  );
}

function resolveAuroraKinematicDirection(
  profile: PlaceableVfxPreviewProfile,
  index: number,
  phase: number,
  elapsedSeconds?: number
): THREE.Vector3 {
  if (profile.p2pTargetOffset && profile.p2pTargetOffset.lengthSq() > 1e-10) {
    return profile.p2pTargetOffset.clone().sub(new THREE.Vector3(0, profile.baseLift, 0)).normalize();
  }
  const spread = clampNumber(
    resolveAuroraEmitterParticleSpreadRadiansAtElapsed(profile, elapsedSeconds),
    0,
    Math.PI * 2
  );
  if (spread <= 1e-6) {
    return new THREE.Vector3(0, 1, 0);
  }

  const maxPolarAngle = clampNumber(spread * 0.5, 0, Math.PI);
  const polarAngle = resolveVfxParticleSeed(index, 733) * maxPolarAngle;
  const azimuth = phase + resolveVfxParticleSeed(index, 421) * Math.PI * 2;
  const sinPolar = Math.sin(polarAngle);
  const direction = new THREE.Vector3(
    Math.cos(azimuth) * sinPolar,
    Math.cos(polarAngle),
    Math.sin(azimuth) * sinPolar
  );
  if (direction.lengthSq() <= 1e-10) {
    direction.set(0, 1, 0);
  }
  return direction.normalize();
}

function resolveAuroraP2PGravityAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): number {
  const timelineGravity = sampleAuroraEmitterProfileTimeline(profile, "grav", elapsedSeconds);
  return Math.abs(timelineGravity ?? profile.p2pGravity ?? 0);
}

function resolveAuroraP2PDragAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): number {
  const timelineDrag = sampleAuroraEmitterProfileTimeline(profile, "drag", elapsedSeconds);
  return Math.abs(timelineDrag ?? profile.p2pDrag ?? 0);
}

function resolveAuroraP2PCombineTimeAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number | undefined
): number | undefined {
  const timelineCombineTime = sampleAuroraEmitterProfileTimeline(
    profile,
    "combineTime",
    elapsedSeconds
  );
  const combineTime = timelineCombineTime ?? profile.p2pCombineTime;
  return typeof combineTime === "number" &&
    Number.isFinite(combineTime) &&
    combineTime > 1e-6
    ? combineTime
    : undefined;
}

function resolveAuroraP2PBezierTangentAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  key: "p2pBezier2" | "p2pBezier3",
  staticValue: number | undefined,
  fallback: number,
  elapsedSeconds: number | undefined
): number {
  const timelineTangent = sampleAuroraEmitterProfileTimeline(profile, key, elapsedSeconds);
  return clampNumber(timelineTangent ?? staticValue ?? fallback, 0, 4);
}

function resolveAuroraP2PTravelAmount(
  profile: PlaceableVfxPreviewProfile,
  normalizedAge: number,
  ageSeconds?: number
): number {
  const age = resolveAuroraP2PTravelAge(profile, normalizedAge, ageSeconds);
  if (profile.p2pMotionMode === "bezier") {
    return age;
  }

  const gravity = resolveAuroraP2PGravityAtElapsed(profile, ageSeconds);
  const drag = resolveAuroraP2PDragAtElapsed(profile, ageSeconds);
  const gravityExponent = clampNumber(1 + gravity * 0.35, 0.35, 4);
  const gravityAmount = 1 - Math.pow(1 - age, gravityExponent);
  if (drag <= 1e-6) {
    return clampNumber(gravityAmount, 0, 1);
  }
  const dragEase = 1 - Math.exp(-drag * Math.max(age, 0.001));
  return clampNumber(gravityAmount * (0.72 + dragEase * 0.28), 0, 1);
}

function resolveAuroraP2PTravelAge(
  profile: PlaceableVfxPreviewProfile,
  normalizedAge: number,
  ageSeconds?: number
): number {
  let age = clampNumber(normalizedAge, 0, 1);
  const combineTime = resolveAuroraP2PCombineTimeAtElapsed(profile, ageSeconds);
  if (combineTime !== undefined && typeof ageSeconds === "number" && Number.isFinite(ageSeconds)) {
    if (profile.p2pMotionMode === "gravity") {
      const lifeSeconds = Math.max(profile.lifeSeconds ?? combineTime, 0.001);
      const gravityTravelSeconds = Math.max(lifeSeconds - combineTime, 0.001);
      age =
        ageSeconds <= combineTime
          ? 0
          : clampNumber((ageSeconds - combineTime) / gravityTravelSeconds, 0, 1);
    } else {
      age = clampNumber(ageSeconds / combineTime, 0, 1);
    }
  }
  return age;
}

function resolveAuroraP2PBezierOffset(
  profile: PlaceableVfxPreviewProfile,
  startPosition: THREE.Vector3,
  normalizedAge: number,
  ageSeconds?: number
): THREE.Vector3 | null {
  const targetPosition = profile.p2pTargetOffset;
  if (!targetPosition) {
    return null;
  }
  const travel = targetPosition.clone().sub(startPosition);
  const distance = travel.length();
  if (distance <= 1e-8) {
    return new THREE.Vector3();
  }

  const travelDirection = travel.clone().multiplyScalar(1 / distance);
  let bowDirection = new THREE.Vector3(0, 1, 0);
  bowDirection.addScaledVector(travelDirection, -bowDirection.dot(travelDirection));
  if (bowDirection.lengthSq() <= 1e-10) {
    bowDirection.set(1, 0, 0);
    bowDirection.addScaledVector(travelDirection, -bowDirection.dot(travelDirection));
  }
  if (bowDirection.lengthSq() <= 1e-10) {
    bowDirection.set(0, 0, 1);
    bowDirection.addScaledVector(travelDirection, -bowDirection.dot(travelDirection));
  }
  bowDirection.normalize();

  const sourceTangent = resolveAuroraP2PBezierTangentAtElapsed(
    profile,
    "p2pBezier2",
    profile.p2pBezier2,
    0.33,
    ageSeconds
  );
  const targetTangent = resolveAuroraP2PBezierTangentAtElapsed(
    profile,
    "p2pBezier3",
    profile.p2pBezier3,
    0.66,
    ageSeconds
  );
  const controlA = startPosition
    .clone()
    .addScaledVector(bowDirection, distance * sourceTangent);
  const controlB = targetPosition
    .clone()
    .addScaledVector(bowDirection, distance * targetTangent);
  const age = resolveAuroraP2PTravelAge(profile, normalizedAge, ageSeconds);
  const inverse = 1 - age;
  const position = startPosition
    .clone()
    .multiplyScalar(inverse * inverse * inverse)
    .add(controlA.multiplyScalar(3 * inverse * inverse * age))
    .add(controlB.multiplyScalar(3 * inverse * age * age))
    .add(targetPosition.clone().multiplyScalar(age * age * age));
  return position.sub(startPosition);
}

function resolveAuroraKinematicOffset(
  profile: PlaceableVfxPreviewProfile,
  index: number,
  phase: number,
  normalizedAge: number,
  basePosition?: THREE.Vector3,
  ageSecondsOverride?: number
): THREE.Vector3 | null {
  const lifeSeconds = Math.max(profile.lifeSeconds ?? 1, 0.001);
  const ageSeconds =
    typeof ageSecondsOverride === "number" && Number.isFinite(ageSecondsOverride)
      ? ageSecondsOverride
      : clampNumber(normalizedAge, 0, 1) * lifeSeconds;
  if (profile.p2pTargetOffset) {
    const startPosition = basePosition ?? new THREE.Vector3(0, profile.baseLift, 0);
    if (profile.p2pMotionMode === "bezier") {
      return resolveAuroraP2PBezierOffset(
        profile,
        startPosition,
        normalizedAge,
        ageSeconds
      );
    }
    const travel = profile.p2pTargetOffset.clone().sub(startPosition);
    return travel.multiplyScalar(resolveAuroraP2PTravelAmount(profile, normalizedAge, ageSeconds));
  }
  if (!hasAuroraKinematicMotion(profile)) {
    return null;
  }
  const velocity = resolveAuroraEmitterParticleSpeed(profile, index, ageSeconds) *
    resolveVfxParticleDriftScale(profile);
  const offset = resolveAuroraKinematicDirection(profile, index, phase, ageSeconds).multiplyScalar(
    velocity * ageSeconds
  );
  const accelerationY = resolveAuroraEmitterParticleAccelerationYAtElapsed(profile, ageSeconds);
  if (accelerationY !== 0) {
    offset.y += 0.5 * accelerationY * ageSeconds * ageSeconds;
  }
  applyAuroraBounceFloorPlaneOffset(profile, offset, ageSeconds);
  const clampDistance = profile.kinematicTravelClampDistance;
  if (
    typeof clampDistance === "number" &&
    Number.isFinite(clampDistance) &&
    clampDistance > 0 &&
    offset.lengthSq() > clampDistance * clampDistance
  ) {
    offset.setLength(clampDistance);
  }
  if (
    profile.particleKinematicCoordinateSpace === "world" &&
    profile.particleKinematicOrientationInverse
  ) {
    offset.applyQuaternion(profile.particleKinematicOrientationInverse);
  }
  return offset;
}

function resolveAuroraP2PThresholdState(
  profile: PlaceableVfxPreviewProfile,
  particlePosition: THREE.Vector3,
  ageSeconds?: number
): { distance: number; threshold: number; culled: boolean } | null {
  const timelineThreshold = sampleAuroraEmitterProfileTimeline(profile, "threshold", ageSeconds);
  const threshold =
    typeof timelineThreshold === "number"
      ? timelineThreshold * (profile.p2pThresholdUnitScale ?? 1)
      : profile.p2pThreshold;
  if (
    !profile.p2pTargetOffset ||
    profile.p2pMotionMode !== "gravity" ||
    typeof threshold !== "number" ||
    !Number.isFinite(threshold) ||
    threshold <= 0
  ) {
    return null;
  }
  const distance = particlePosition.distanceTo(profile.p2pTargetOffset);
  return {
    distance,
    threshold,
    culled: distance <= threshold
  };
}

function updateAuroraP2PThresholdUserData(
  object: THREE.Object3D,
  profile: PlaceableVfxPreviewProfile,
  particlePosition: THREE.Vector3 = object.position,
  ageSeconds?: number
): { distance: number; threshold: number; culled: boolean } | null {
  const state = resolveAuroraP2PThresholdState(profile, particlePosition, ageSeconds);
  if (!state) {
    return null;
  }
  object.userData = {
    ...object.userData,
    auroraEmitterP2PDistanceToTarget: state.distance,
    auroraEmitterP2PThreshold: state.threshold,
    auroraEmitterP2PThresholdCull: state.culled,
    auroraEmitterP2PThresholdCullPreviewMode: "source-threshold-target-cull-preview"
  };
  return state;
}

function applyAuroraP2PThresholdCullToMesh(
  mesh: THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>,
  material: PlaceableVfxPreviewMaterial,
  profile: PlaceableVfxPreviewProfile,
  ageSeconds?: number
): boolean {
  const thresholdState = updateAuroraP2PThresholdUserData(mesh, profile, mesh.position, ageSeconds);
  if (!thresholdState?.culled) {
    return false;
  }
  applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-p2p-threshold");
  return true;
}

const auroraDeadspaceCameraPosition = new THREE.Vector3();
const auroraDeadspaceToCameraDirection = new THREE.Vector3();

function resolveAuroraDeadspaceCullState(
  profile: PlaceableVfxPreviewProfile,
  particlePosition: THREE.Vector3,
  motionDirection: THREE.Vector3,
  camera: THREE.Camera
): { angleRadians: number; thresholdRadians: number; culled: boolean } | null {
  if (
    typeof profile.deadspaceAngleRadians !== "number" ||
    !Number.isFinite(profile.deadspaceAngleRadians) ||
    profile.deadspaceAngleRadians <= 0 ||
    motionDirection.lengthSq() <= 1e-10
  ) {
    return null;
  }
  camera.getWorldPosition(auroraDeadspaceCameraPosition);
  auroraDeadspaceToCameraDirection.copy(auroraDeadspaceCameraPosition).sub(particlePosition);
  if (auroraDeadspaceToCameraDirection.lengthSq() <= 1e-10) {
    return null;
  }
  const dot = clampNumber(
    motionDirection.clone().normalize().dot(auroraDeadspaceToCameraDirection.normalize()),
    -1,
    1
  );
  const angleRadians = Math.acos(dot);
  const thresholdRadians = clampNumber(profile.deadspaceAngleRadians, 0, Math.PI);
  return {
    angleRadians,
    thresholdRadians,
    culled: angleRadians <= thresholdRadians
  };
}

function applyAuroraDeadspaceCullToMesh(
  mesh: THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>,
  material: PlaceableVfxPreviewMaterial,
  profile: PlaceableVfxPreviewProfile,
  motionDirection: THREE.Vector3,
  camera: THREE.Camera
): boolean {
  const deadspaceState = resolveAuroraDeadspaceCullState(
    profile,
    mesh.position,
    motionDirection,
    camera
  );
  if (!deadspaceState) {
    return false;
  }
  mesh.userData = {
    ...mesh.userData,
    auroraEmitterDeadspaceAngleToCamera: deadspaceState.angleRadians,
    auroraEmitterDeadspaceAngleRadians: deadspaceState.thresholdRadians,
    auroraEmitterDeadspaceCull: deadspaceState.culled,
    auroraEmitterDeadspaceCullPreviewMode: "view-direction-deadspace-angle-preview"
  };
  if (!deadspaceState.culled) {
    return false;
  }
  applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-deadspace-angle");
  return true;
}

interface AuroraParticleColorSample {
  color: THREE.Color;
  mode:
    | "aurora-particle-vertex-color"
    | "aurora-particle-color-ambient-tint-disabled"
    | "aurora-particle-soft-alpha-lighten-color-floor"
    | "semantic-scene-tint-vertex-color"
    | "semantic-fallback-vertex-color";
}

function resolveAuroraParticleColorSampleAtAge(
  material: PlaceableVfxPreviewMaterial,
  defaultColor: THREE.Color,
  profile: PlaceableVfxPreviewProfile,
  normalizedAge: number,
  elapsedSeconds?: number
): AuroraParticleColorSample {
  let resolvedColor: THREE.Color;
  let vertexColorMode:
    | "aurora-particle-vertex-color"
    | "aurora-particle-color-ambient-tint-disabled"
    | "aurora-particle-soft-alpha-lighten-color-floor"
    | "semantic-scene-tint-vertex-color"
    | "semantic-fallback-vertex-color";
  if (material.userData?.auroraEmitterPreviewColorMode === "semantic-scene-tint-preview") {
    resolvedColor = defaultColor;
    vertexColorMode = "semantic-scene-tint-vertex-color";
  } else {
    const start =
      sampleAuroraEmitterProfileColorTimeline(profile, "colorStart", elapsedSeconds) ??
      profile.particleColorStart;
    const mid =
      sampleAuroraEmitterProfileColorTimeline(profile, "colorMid", elapsedSeconds) ??
      profile.particleColorMid;
    const end =
      sampleAuroraEmitterProfileColorTimeline(profile, "colorEnd", elapsedSeconds) ??
      profile.particleColorEnd ??
      start;
    if (!start || !end) {
      resolvedColor = defaultColor;
      vertexColorMode = "semantic-fallback-vertex-color";
    } else {
      resolvedColor = createAuroraColorFromVector(
        sampleAuroraEmitterColorCurve(
          profile,
          start,
          mid,
          end,
          normalizedAge,
          elapsedSeconds
        )
      );
      vertexColorMode =
        material.userData?.auroraEmitterIsTinted === false
          ? "aurora-particle-color-ambient-tint-disabled"
          : "aurora-particle-vertex-color";
    }
  }
  const softAlphaColorFloor = resolveAuroraSoftAlphaLightenColorFloor(
    material,
    profile,
    resolvedColor,
    elapsedSeconds
  );
  if (softAlphaColorFloor) {
    resolvedColor = softAlphaColorFloor;
    vertexColorMode = "aurora-particle-soft-alpha-lighten-color-floor";
  }
  return {
    color: resolvedColor,
    mode: vertexColorMode
  };
}

function applyVfxParticleColorAtAge(
  material: PlaceableVfxPreviewMaterial,
  defaultColor: THREE.Color,
  profile: PlaceableVfxPreviewProfile,
  normalizedAge: number,
  elapsedSeconds?: number,
  geometry?: THREE.BufferGeometry
): void {
  const colorSample = resolveAuroraParticleColorSampleAtAge(
    material,
    defaultColor,
    profile,
    normalizedAge,
    elapsedSeconds
  );
  const resolvedColor = colorSample.color;
  const vertexColorMode = colorSample.mode;

  material.userData = {
    ...material.userData,
    auroraVfxParticleColorPreviewMode: vertexColorMode,
    auroraVfxParticleColor: [resolvedColor.r, resolvedColor.g, resolvedColor.b]
  };
  if (geometry) {
    if (material instanceof THREE.MeshBasicMaterial) {
      if (shouldUseAuroraAlphaCompanionMaterialColor(material)) {
        material.vertexColors = false;
        material.color.copy(resolvedColor);
        material.userData = {
          ...material.userData,
          auroraVfxParticleMaterialColorSource: [
            resolvedColor.r,
            resolvedColor.g,
            resolvedColor.b
          ],
          auroraVfxParticleColorPreviewMode: "aurora-particle-material-color"
        };
      } else {
        material.vertexColors = true;
        material.color.copy(AURORA_UNTINTED_TEXTURE_COLOR);
      }
      material.needsUpdate = true;
    }
    applyAuroraParticleVertexColorToGeometry(geometry, resolvedColor, vertexColorMode);
    if (shouldApplyAuroraLightenAlphaRgbScale(material)) {
      applyAuroraLightenAlphaRgbScaleToGeometry(
        geometry,
        typeof geometry.userData.auroraVfxParticleVertexAlpha === "number"
          ? geometry.userData.auroraVfxParticleVertexAlpha
          : material.opacity
      );
    }
    return;
  }
  material.color.copy(resolvedColor);
}

function resolveVfxParticleSizeAtAge(
  profile: PlaceableVfxPreviewProfile,
  fallbackSize: number,
  normalizedAge: number,
  elapsedSeconds?: number
): number {
  const start =
    sampleAuroraEmitterProfileSizeTimeline(profile, "sizeStart", elapsedSeconds) ??
    profile.particleSizeStart ??
    fallbackSize;
  const mid =
    sampleAuroraEmitterProfileSizeTimeline(profile, "sizeMid", elapsedSeconds) ??
    profile.particleSizeMid;
  const end =
    sampleAuroraEmitterProfileSizeTimeline(profile, "sizeEnd", elapsedSeconds) ??
    profile.particleSizeEnd ??
    start;
  return clampNumber(
    sampleAuroraEmitterNumberCurve(
      profile,
      start,
      mid,
      end,
      normalizedAge,
      elapsedSeconds
    ),
    0.001,
    profile.sizeMax * 2
  );
}

function resolvePositiveVfxParticleSize(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function resolveAuroraParticleSizeYSourceValue(
  profile: PlaceableVfxPreviewProfile,
  value: number | undefined
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value > 0) {
    return value;
  }
  return value === 0 && profile.bubblePreviewMode === "source-bubble-particle-preview"
    ? 0
    : undefined;
}

function resolveVfxParticleSizeYAtAge(
  profile: PlaceableVfxPreviewProfile,
  fallbackSize: number,
  normalizedAge: number,
  elapsedSeconds?: number
): number {
  const xStart =
    sampleAuroraEmitterProfileSizeTimeline(profile, "sizeStart", elapsedSeconds) ??
    profile.particleSizeStart ??
    fallbackSize;
  const xMid =
    sampleAuroraEmitterProfileSizeTimeline(profile, "sizeMid", elapsedSeconds) ??
    profile.particleSizeMid;
  const xEnd =
    sampleAuroraEmitterProfileSizeTimeline(profile, "sizeEnd", elapsedSeconds) ??
    profile.particleSizeEnd ??
    xStart;
  const start =
    resolveAuroraParticleSizeYSourceValue(
      profile,
      sampleAuroraEmitterProfileSizeTimeline(profile, "sizeStartY", elapsedSeconds)
    ) ??
    resolveAuroraParticleSizeYSourceValue(profile, profile.particleSizeYStart) ??
    xStart;
  const mid =
    resolveAuroraParticleSizeYSourceValue(
      profile,
      sampleAuroraEmitterProfileSizeTimeline(profile, "sizeMidY", elapsedSeconds)
    ) ??
    resolveAuroraParticleSizeYSourceValue(profile, profile.particleSizeYMid) ??
    xMid;
  const end =
    resolveAuroraParticleSizeYSourceValue(
      profile,
      sampleAuroraEmitterProfileSizeTimeline(profile, "sizeEndY", elapsedSeconds)
    ) ??
    resolveAuroraParticleSizeYSourceValue(profile, profile.particleSizeYEnd) ??
    xEnd ??
    start;
  return clampNumber(
    sampleAuroraEmitterNumberCurve(
      profile,
      start,
      mid,
      end,
      normalizedAge,
      elapsedSeconds
    ),
    profile.bubblePreviewMode === "source-bubble-particle-preview" ? 0 : 0.001,
    profile.sizeMax * 3
  );
}

interface AuroraSplatLandedParticleSizeState {
  particleSizeX: number;
  particleSizeY: number;
  sizeYSource: "source-size-end-y" | "size-end-y-fallback-to-x-end";
}

function resolveAuroraSplatLandedParticleSizeState(
  profile: PlaceableVfxPreviewProfile,
  fallbackSize: number,
  elapsedSeconds?: number
): AuroraSplatLandedParticleSizeState {
  const start =
    sampleAuroraEmitterProfileSizeTimeline(profile, "sizeStart", elapsedSeconds) ??
    profile.particleSizeStart ??
    fallbackSize;
  const end =
    sampleAuroraEmitterProfileSizeTimeline(profile, "sizeEnd", elapsedSeconds) ??
    profile.particleSizeEnd ??
    start;
  const endYSource =
    resolvePositiveVfxParticleSize(
      sampleAuroraEmitterProfileSizeTimeline(profile, "sizeEndY", elapsedSeconds)
    ) ?? resolvePositiveVfxParticleSize(profile.particleSizeYEnd);
  const endY = endYSource ?? end;
  return {
    particleSizeX: clampNumber(end, 0.001, profile.sizeMax * 2),
    particleSizeY: clampNumber(endY, 0.001, profile.sizeMax * 3),
    sizeYSource: endYSource === undefined ? "size-end-y-fallback-to-x-end" : "source-size-end-y"
  };
}

function applyAuroraSplatLandedParticleSizeState(
  mesh: THREE.Mesh,
  material: PlaceableVfxPreviewMaterial,
  geometry: THREE.BufferGeometry,
  state: AuroraSplatLandedParticleSizeState,
  interpolatedParticleSizeX: number,
  interpolatedParticleSizeY: number
): void {
  const userData = {
    auroraEmitterSplatEndSizeGate: true,
    auroraEmitterSplatSizePreviewMode: "landed-splat-end-size-gate",
    auroraEmitterSplatInterpolatedSizeX: interpolatedParticleSizeX,
    auroraEmitterSplatInterpolatedSizeY: interpolatedParticleSizeY,
    auroraEmitterSplatEndSizeX: state.particleSizeX,
    auroraEmitterSplatEndSizeY: state.particleSizeY,
    auroraEmitterSplatEndSizeYSource: state.sizeYSource
  };
  mesh.userData = {
    ...mesh.userData,
    ...userData
  };
  material.userData = {
    ...material.userData,
    ...userData
  };
  geometry.userData = {
    ...geometry.userData,
    ...userData
  };
}

interface AuroraParticleSoftnessState {
  value: number;
  maxHalfExtent: number;
  reason:
    | "derived-from-max-evaluated-half-extent"
    | "zero-for-splat"
    | "zero-for-billboard-to-local-z"
    | "zero-for-billboard-to-world-z"
    | "zero-for-zero-size";
}

function resolveAuroraParticleSoftnessState(
  profile: PlaceableVfxPreviewProfile,
  renderMode: ResolvedAuroraEmitterRenderMode,
  particleSizeX: number,
  particleSizeY: number
): AuroraParticleSoftnessState {
  const maxHalfExtent = Math.max(0, particleSizeX * 0.5, particleSizeY * 0.5);
  if (profile.splat === true) {
    return {
      value: 0,
      maxHalfExtent,
      reason: "zero-for-splat"
    };
  }
  if (renderMode.bucket === "billboard_to_local_z") {
    return {
      value: 0,
      maxHalfExtent,
      reason: "zero-for-billboard-to-local-z"
    };
  }
  if (renderMode.bucket === "billboard_to_world_z") {
    return {
      value: 0,
      maxHalfExtent,
      reason: "zero-for-billboard-to-world-z"
    };
  }
  if (maxHalfExtent <= 1e-6) {
    return {
      value: 0,
      maxHalfExtent,
      reason: "zero-for-zero-size"
    };
  }
  return {
    value: 1 / Math.min(maxHalfExtent * 0.2, 0.2),
    maxHalfExtent,
    reason: "derived-from-max-evaluated-half-extent"
  };
}

function applyAuroraParticleSoftnessState(
  material: PlaceableVfxPreviewMaterial,
  geometry: THREE.BufferGeometry | undefined,
  profile: PlaceableVfxPreviewProfile,
  renderMode: ResolvedAuroraEmitterRenderMode,
  particleSizeX: number,
  particleSizeY: number
): void {
  const softness = resolveAuroraParticleSoftnessState(
    profile,
    renderMode,
    particleSizeX,
    particleSizeY
  );
  const userData = {
    auroraParticleSoftness: softness.value,
    auroraParticleSoftnessUniformSlot: 0,
    auroraParticleSoftnessShaderNameCandidate: "particleSoftness",
    auroraParticleSoftnessSlotBindingStatus: "candidate-name-unconfirmed",
    auroraParticleSoftnessPreviewMode: "aurora-particle-shader-float-slot-0",
    auroraParticleSoftnessSource: "max-evaluated-half-extent",
    auroraParticleSoftnessMaxHalfExtent: softness.maxHalfExtent,
    auroraParticleSoftnessGate: softness.reason,
    auroraParticleSoftnessFormula:
      softness.reason === "derived-from-max-evaluated-half-extent"
        ? "1.0 / min(maxHalfExtent * 0.2, 0.2)"
        : "forced-zero"
  };
  material.userData = {
    ...material.userData,
    ...userData
  };
  if (geometry) {
    geometry.userData = {
      ...geometry.userData,
      ...userData
    };
  }
}

function resolveVfxParticleRotationAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  baseAngle: number,
  elapsedSeconds: number
): number {
  const rotationRate = resolveVfxParticleRotationRateRadiansAtElapsed(profile, elapsedSeconds);
  return typeof rotationRate === "number"
    ? baseAngle + rotationRate * elapsedSeconds
    : baseAngle;
}

function resolveVfxParticleRotationRateRadiansAtElapsed(
  profile: PlaceableVfxPreviewProfile,
  elapsedSeconds: number
): number | undefined {
  const timelineRotationRate = sampleAuroraEmitterProfileTimeline(
    profile,
    "particleRot",
    elapsedSeconds
  );
  if (typeof timelineRotationRate === "number") {
    return resolveAuroraParticleRotationRateRadians(timelineRotationRate);
  }
  return profile.particleRotationRate;
}

function hasAuroraParticleRotationRateSource(profile: PlaceableVfxPreviewProfile): boolean {
  return (
    typeof profile.particleRotationRate === "number" ||
    Boolean(profile.simulationTimeline?.particleRot?.length)
  );
}

function resolveVfxSurfaceSpawnOffset(
  profile: PlaceableVfxPreviewProfile,
  index: number,
  phase: number,
  fallbackRadius: number
): { x: number; z: number } {
  const surfaceWidth = profile.emitterSurfaceWidth ?? 0;
  const surfaceDepth = profile.emitterSurfaceDepth ?? 0;
  if (profile.emitterSurfaceSampling === true) {
    const unitScale = profile.emitterSurfaceUnitScale;
    const xSourceCm = profile.emitterSurfaceWidthSourceCm;
    const zSourceCm = profile.emitterSurfaceDepthSourceCm;
    const xAxisEnabled =
      typeof xSourceCm === "number"
        ? xSourceCm >= AURORA_EMITTER_SPAWN_RECTANGLE_AXIS_GATE_CM
        : surfaceWidth > 0;
    const zAxisEnabled =
      typeof zSourceCm === "number"
        ? zSourceCm >= AURORA_EMITTER_SPAWN_RECTANGLE_AXIS_GATE_CM
        : surfaceDepth > 0;
    const sampleAuroraAxis = (
      sourceCm: number | undefined,
      fallbackHalfExtent: number,
      magnitudeSeed: number,
      signSeed: number,
      axisEnabled: boolean
    ): number => {
      if (!axisEnabled) {
        return 0;
      }
      if (
        typeof sourceCm === "number" &&
        Number.isFinite(sourceCm) &&
        sourceCm > 0 &&
        typeof unitScale === "number" &&
        Number.isFinite(unitScale) &&
        unitScale > 0
      ) {
        const halfExtentIntegerCm = Math.max(
          0,
          Math.min(
            Math.floor(sourceCm * 0.5),
            Math.floor(fallbackHalfExtent / unitScale)
          )
        );
        if (halfExtentIntegerCm <= 0) {
          return 0;
        }
        const magnitudeCm = magnitudeSeed % (halfExtentIntegerCm + 1);
        const sign = signSeed % 2 === 0 ? -1 : 1;
        return sign * magnitudeCm * unitScale;
      }
      const seed = ((magnitudeSeed % 1000) / 1000 - 0.5) * 2;
      return seed * fallbackHalfExtent;
    };
    return {
      x: sampleAuroraAxis(
        xSourceCm,
        surfaceWidth * 0.5,
        (index + 1) * 977,
        (index + 1) * 571,
        xAxisEnabled
      ),
      z: sampleAuroraAxis(
        zSourceCm,
        surfaceDepth * 0.5,
        (index + 1) * 619,
        (index + 1) * 349,
        zAxisEnabled
      )
    };
  }

  return {
    x: Math.cos(phase) * fallbackRadius,
    z: Math.sin(phase) * fallbackRadius
  };
}

function resolveAuroraEmitterSurfaceSpawnMode(
  profile: PlaceableVfxPreviewProfile
): string | undefined {
  if (profile.emitterSurfaceSampling !== true) {
    return undefined;
  }
  const hasWidth =
    typeof profile.emitterSurfaceEffectiveWidth === "number"
      ? profile.emitterSurfaceEffectiveWidth > 0
      : typeof profile.emitterSurfaceWidth === "number" && profile.emitterSurfaceWidth > 0;
  const hasDepth =
    typeof profile.emitterSurfaceEffectiveDepth === "number"
      ? profile.emitterSurfaceEffectiveDepth > 0
      : typeof profile.emitterSurfaceDepth === "number" && profile.emitterSurfaceDepth > 0;
  if (hasWidth && hasDepth) {
    return "source-xsize-ysize-plane";
  }
  if (hasWidth) {
    return "source-xsize-line";
  }
  if (hasDepth) {
    return "source-ysize-line";
  }
  return "source-point";
}

function resolveAuroraEmitterSurfacePreviewMode(
  profile: PlaceableVfxPreviewProfile
): PlaceableVfxPreviewProfile["emitterSurfacePreviewMode"] | undefined {
  if (profile.emitterSurfacePreviewMode) {
    return profile.emitterSurfacePreviewMode;
  }
  const spawnMode = resolveAuroraEmitterSurfaceSpawnMode(profile);
  if (spawnMode === "source-xsize-ysize-plane") {
    return "xsize-ysize-spawn-rectangle-preview";
  }
  if (spawnMode) {
    return "xsize-ysize-spawn-surface-preview";
  }
  return undefined;
}

function resolveVfxParticleWindOffset(
  profile: PlaceableVfxPreviewProfile,
  index: number,
  elapsedSeconds: number
): THREE.Vector3 | null {
  if (profile.affectedByWind !== true) {
    return null;
  }
  const windDrift = profile.windDrift ?? Math.max(0, profile.drift * 0.42);
  if (windDrift <= 0) {
    return null;
  }
  const seed = ((index * 571) % 1000) / 1000;
  const phase = seed * Math.PI * 2;
  const gust = 0.62 + 0.38 * Math.sin(elapsedSeconds * 0.73 + phase);
  return new THREE.Vector3(
    Math.cos(elapsedSeconds * 0.31 + phase) * windDrift * gust,
    0,
    Math.sin(elapsedSeconds * 0.19 + phase * 0.7) * windDrift * 0.55 * gust
  );
}

function addVfxParticleWindOffset(
  position: THREE.Vector3,
  profile: PlaceableVfxPreviewProfile,
  index: number,
  elapsedSeconds: number
): THREE.Vector3 {
  const windOffset = resolveVfxParticleWindOffset(profile, index, elapsedSeconds);
  return windOffset ? position.add(windOffset) : position;
}

function applyVfxParticleWindOffset(
  object: THREE.Object3D,
  profile: PlaceableVfxPreviewProfile,
  index: number,
  elapsedSeconds: number
): void {
  const windOffset = resolveVfxParticleWindOffset(profile, index, elapsedSeconds);
  if (!windOffset) {
    return;
  }
  object.position.x += windOffset.x;
  object.position.z += windOffset.z;
  object.userData = {
    ...object.userData,
    auroraEmitterAffectedByWindOffset: [windOffset.x, windOffset.z],
    auroraEmitterAffectedByWindPreviewMode: "aurora-source-affectedbywind-horizontal-drift"
  };
}

function resolveVfxParticleMotionDirection(
  profile: PlaceableVfxPreviewProfile,
  phase: number,
  objectRadius: number
): THREE.Vector3 {
  const lateral = Math.max(profile.drift, profile.radius * 0.35, objectRadius * 0.08);
  const vertical = Math.max(profile.height, objectRadius * 0.12);
  const direction = new THREE.Vector3(
    Math.cos(phase) * lateral,
    vertical,
    Math.sin(phase) * lateral
  );
  if (profile.motionMode === "explosion") {
    direction.y *= 0.36;
  }
  if (direction.lengthSq() <= 1e-10) {
    direction.set(0, 1, 0);
  }
  return direction.normalize();
}

function orientVfxParticleAlignedMesh(
  mesh: THREE.Mesh,
  motionDirection: THREE.Vector3,
  camera: THREE.Camera
): void {
  const localCameraPosition = camera.position.clone();
  mesh.parent?.worldToLocal(localCameraPosition);
  const toCamera = localCameraPosition.sub(mesh.position);
  if (toCamera.lengthSq() <= 1e-10) {
    toCamera.set(0, 0, 1);
  } else {
    toCamera.normalize();
  }

  const up = motionDirection.clone();
  if (up.lengthSq() <= 1e-10) {
    up.set(0, 1, 0);
  } else {
    up.normalize();
  }

  let right = new THREE.Vector3().crossVectors(up, toCamera);
  if (right.lengthSq() <= 1e-10) {
    right = new THREE.Vector3(1, 0, 0);
  } else {
    right.normalize();
  }
  const normal = new THREE.Vector3().crossVectors(right, up).normalize();
  const rotationMatrix = new THREE.Matrix4().makeBasis(right, up, normal);
  mesh.quaternion.setFromRotationMatrix(rotationMatrix);
}

function orientVfxCameraBillboardMesh(
  mesh: THREE.Mesh,
  camera: THREE.Camera,
  rollRadians = 0
): void {
  const { right, up, normal } = resolveAuroraCameraBillboardBasis(
    mesh.parent,
    mesh.position,
    camera,
    rollRadians
  );
  const rotationMatrix = new THREE.Matrix4().makeBasis(right, up, normal);
  mesh.quaternion.setFromRotationMatrix(rotationMatrix);
  mesh.userData = {
    ...mesh.userData,
    auroraParticleBasisPreviewMode: "aurora-render-normal-camera-billboard-basis",
    auroraParticleBillboardRoll: rollRadians
  };
}

function updateAuroraEndpointPairQuadGeometry(
  mesh: THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>,
  start: THREE.Vector3,
  end: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  previewMode:
    | "aurora-linked-current-next-endpoint-vertex-buffer"
    | "aurora-motion-blur-previous-current-endpoint-vertex-buffer"
): number {
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (length <= 1e-6) {
    return 0;
  }
  direction.multiplyScalar(1 / length);

  const center = start.clone().add(end).multiplyScalar(0.5);
  const cameraPosition = camera.position.clone();
  mesh.parent?.worldToLocal(cameraPosition);
  let toCamera = cameraPosition.sub(center);
  if (toCamera.lengthSq() <= 1e-10) {
    toCamera = new THREE.Vector3(0, 0, 1);
  } else {
    toCamera.normalize();
  }

  let widthAxis = new THREE.Vector3().crossVectors(direction, toCamera);
  if (widthAxis.lengthSq() <= 1e-10) {
    widthAxis = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
  }
  if (widthAxis.lengthSq() <= 1e-10) {
    widthAxis = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(1, 0, 0));
  }
  if (widthAxis.lengthSq() <= 1e-10) {
    widthAxis.set(1, 0, 0);
  } else {
    widthAxis.normalize();
  }

  const halfWidth = Math.max(0.001, width) * 0.5;
  const halfWidthVector = widthAxis.multiplyScalar(halfWidth);
  const startLocal = start.clone().sub(center);
  const endLocal = end.clone().sub(center);
  const vertices = [
    startLocal.clone().sub(halfWidthVector),
    startLocal.clone().add(halfWidthVector),
    endLocal.clone().sub(halfWidthVector),
    endLocal.clone().sub(halfWidthVector),
    startLocal.clone().add(halfWidthVector),
    endLocal.clone().add(halfWidthVector)
  ];
  const positions = mesh.geometry.getAttribute("position");
  if (positions instanceof THREE.BufferAttribute && positions.count >= 6) {
    vertices.forEach((vertex, vertexIndex) => {
      positions.setXYZ(vertexIndex, vertex.x, vertex.y, vertex.z);
    });
    positions.needsUpdate = true;
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
  }

  mesh.position.copy(center);
  mesh.quaternion.identity();
  mesh.scale.set(1, 1, 1);
  mesh.userData = {
    ...mesh.userData,
    auroraParticleBasisPreviewMode: previewMode,
    auroraEndpointPairGeometryPreviewMode: "six-vertex-endpoint-pair-quad",
    auroraEndpointPairStart: [start.x, start.y, start.z],
    auroraEndpointPairEnd: [end.x, end.y, end.z],
    auroraEndpointPairCenter: [center.x, center.y, center.z],
    auroraEndpointPairWidth: width,
    auroraEndpointPairDistance: length
  };
  mesh.geometry.userData = {
    ...mesh.geometry.userData,
    auroraEndpointPairGeometryPreviewMode: "six-vertex-endpoint-pair-quad",
    auroraEndpointPairBasisPreviewMode: previewMode,
    auroraEndpointPairDistance: length,
    auroraEndpointPairWidth: width
  };
  return length;
}

function cloneAuroraChunkModelParticle(template: THREE.Object3D): THREE.Object3D {
  const clone = template.clone(true);
  clone.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    if (Array.isArray(node.material)) {
      node.material = node.material.map((material) => material.clone());
    } else {
      node.material = node.material.clone();
    }
    node.castShadow = false;
    node.receiveShadow = false;
    node.userData = {
      ...node.userData,
      auroraVfxChunkModelParticleMesh: true
    };
  });
  return clone;
}

function normalizeAuroraChunkModelParticle(
  particle: THREE.Object3D,
  targetMaxAxis: number
): void {
  const bounds = new THREE.Box3().setFromObject(particle);
  if (bounds.isEmpty()) {
    return;
  }
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const maxAxis = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxAxis) || maxAxis <= 0) {
    return;
  }
  const scale = targetMaxAxis / maxAxis;
  particle.scale.multiplyScalar(scale);
  const center = new THREE.Vector3();
  bounds.getCenter(center);
  particle.position.x -= center.x * scale;
  particle.position.y -= center.y * scale;
  particle.position.z -= center.z * scale;
}

function createAuroraChunkModelParticlePreview(
  template: THREE.Object3D,
  profile: PlaceableVfxPreviewProfile,
  objectRadius: number,
  assetId: string,
  deliveryUrl: string | null,
  auroraEmitter: PlaceableAuroraEmitterNode | null
): THREE.Group {
  const group = new THREE.Group();
  const rawParticleCount = Number.isFinite(profile.count)
    ? Math.max(0, Math.trunc(profile.count))
    : 1;
  const particleCount =
    rawParticleCount === 0
      ? 0
      : clampNumber(rawParticleCount, 1, profile.motionMode === "explosion" ? 32 : 18);
  const baseTargetSize = clampNumber(
    Math.max(profile.sizeMin, objectRadius * 0.18),
    objectRadius * 0.08,
    objectRadius * 1.25
  );
  const nowBaseMs = resolveAuroraEmitterPreviewNowBaseMs(profile);

  for (let index = 0; index < particleCount; index += 1) {
    const phase = (index / particleCount) * Math.PI * 2;
    const radiusSeed = 0.16 + (((index * 977) % 1000) / 1000) * 0.84;
    const radius = radiusSeed * profile.radius;
    const surfaceOffset = resolveVfxSurfaceSpawnOffset(profile, index, phase, radius);
    const speed = 0.12 + (((index * 571) % 1000) / 1000) * 0.24;
    const particle = cloneAuroraChunkModelParticle(template);
    normalizeAuroraChunkModelParticle(particle, baseTargetSize);
    const baseScale = particle.scale.clone();
    particle.userData = {
      ...particle.userData,
      vfxPreviewRole: "chunk-model-particle",
      auroraChunkModelAssetId: assetId,
      auroraChunkModelDeliveryUrl: deliveryUrl,
      auroraChunkParticleIndex: index
    };
    applyAuroraEmitterRenderOrderAdapter(particle, auroraEmitter);
    particle.traverse((node) => {
      if (node !== particle && (node instanceof THREE.Mesh || node instanceof THREE.Sprite)) {
        applyAuroraEmitterRenderOrderAdapter(node, auroraEmitter);
      }
    });
    particle.onBeforeRender = () => {
      const elapsed = ((typeof performance !== "undefined" ? performance.now() : Date.now()) - nowBaseMs) / 1000;
      const schedule = resolveVfxParticleSchedule(profile, index, elapsed, phase, speed);
      particle.visible = schedule.visible;
      if (!schedule.visible) {
        return;
      }
      const cycle = schedule.normalizedAge;
      const wave = Math.sin(cycle * Math.PI);
      const driftScale = resolveVfxParticleDriftScale(profile);
      const verticalOffset =
        profile.motionMode === "explosion"
          ? (cycle - 0.18) * profile.height
          : wave * profile.height;
      const resolvedVerticalOffset = resolveAuroraBouncedVerticalOffset(
        profile,
        resolveVfxParticleVerticalOffset(profile, cycle, verticalOffset),
        schedule.ageSeconds
      );
      const kinematicOffset = resolveAuroraKinematicOffset(
        profile,
        index,
        phase,
        cycle,
        new THREE.Vector3(surfaceOffset.x, profile.baseLift, surfaceOffset.z),
        schedule.ageSeconds
      );
      if (kinematicOffset) {
        particle.position.set(
          surfaceOffset.x + kinematicOffset.x,
          profile.baseLift + kinematicOffset.y,
          surfaceOffset.z + kinematicOffset.z
        );
      } else {
        particle.position.set(
          surfaceOffset.x + Math.cos(phase + elapsed * 0.35) * profile.drift * cycle * driftScale,
          profile.baseLift + resolvedVerticalOffset,
          surfaceOffset.z + Math.sin(phase + elapsed * 0.31) * profile.drift * cycle * driftScale
        );
      }
      const thresholdState = updateAuroraP2PThresholdUserData(
        particle,
        profile,
        particle.position,
        schedule.ageSeconds
      );
      if (thresholdState?.culled) {
        particle.visible = false;
        return;
      }
      const size = resolveVfxParticleSizeAtAge(profile, baseTargetSize, cycle, elapsed);
      const ySize = resolveVfxParticleSizeYAtAge(profile, baseTargetSize, cycle, elapsed);
      const scalar = size / baseTargetSize;
      particle.scale.copy(baseScale).multiplyScalar(scalar);
      particle.scale.y *= ySize / Math.max(0.001, size);
      particle.rotation.y = phase + elapsed * (profile.particleRotationRate ?? 0.35);
      particle.rotation.x = profile.motionMode === "explosion" ? cycle * Math.PI * 0.35 : 0;
    };
    group.add(particle);
  }

  group.userData = {
    ...group.userData,
    vfxPreviewRole: "chunk-model-particles",
    auroraChunkModelParticleCount: particleCount,
    auroraChunkModelAssetId: assetId,
    auroraChunkModelDeliveryUrl: deliveryUrl
  };
  applyAuroraEmitterRenderOrderAdapter(group, auroraEmitter);
  return group;
}

function findAuroraLightAnimationByName(
  animations: PlaceableAuroraLightAnimation[],
  animationName: string | null
): PlaceableAuroraLightAnimation | null {
  if (!animationName) {
    return null;
  }
  const normalized = normalizeAuroraEmitterToken(animationName);
  if (!normalized) {
    return null;
  }
  const alias =
    normalized === "activate" || normalized === "activated"
      ? "on"
      : normalized === "deactivate" || normalized === "deactivated"
        ? "off"
        : normalized;
  return (
    animations.find((animation) => normalizeAuroraEmitterToken(animation.animationName) === alias) ??
    animations.find((animation) => normalizeAuroraEmitterToken(animation.animationName) === normalized) ??
    null
  );
}

function resolveAuroraLightAnimationSelection(
  payload: PlaceableViewportRenderPayload,
  light: PlaceableAuroraLightNode
): PlaceableAuroraLightAnimation | null {
  const animations = Array.isArray(light.animations) ? light.animations : [];
  if (animations.length === 0) {
    return null;
  }
  const metadataAnimationName = readPlaceableMetadataString(payload, [
    "animationName",
    "animationStateName",
    "auroraAnimationName",
    "vfxAnimationName",
    "animationState"
  ]);
  if (metadataAnimationName) {
    return findAuroraLightAnimationByName(animations, metadataAnimationName);
  }
  const runtimeAnimationState = payload.placeable.placeableRuntime?.state?.animationState;
  if (typeof runtimeAnimationState === "number" && Number.isFinite(runtimeAnimationState)) {
    return findAuroraLightAnimationByName(
      animations,
      resolveAuroraPlaceableAnimationStateName(runtimeAnimationState)
    );
  }
  const metadataAnimationState = readPlaceableMetadataNumber(payload, ["animationState"]);
  if (typeof metadataAnimationState === "number" && Number.isFinite(metadataAnimationState)) {
    return findAuroraLightAnimationByName(
      animations,
      resolveAuroraPlaceableAnimationStateName(metadataAnimationState)
    );
  }
  return (
    findAuroraLightAnimationByName(animations, "default") ??
    findAuroraLightAnimationByName(animations, "on") ??
    animations.find((animation) => normalizeAuroraEmitterToken(animation.animationName) !== "off") ??
    animations[0] ??
    null
  );
}

function sampleAuroraLightNumberKeyframesAtElapsed(
  frames: Array<{ time: number; value: number }> | undefined,
  elapsedSeconds: number | undefined,
  loop = true
): number | undefined {
  if (!frames || frames.length === 0) {
    return undefined;
  }
  if (frames.length === 1) {
    return frames[0]?.value;
  }
  const sortedFrames = frames
    .filter((frame) => Number.isFinite(frame.time) && Number.isFinite(frame.value))
    .sort((left, right) => left.time - right.time);
  const firstFrame = sortedFrames[0];
  const lastFrame = sortedFrames[sortedFrames.length - 1];
  if (!firstFrame || !lastFrame) {
    return undefined;
  }
  const duration = lastFrame.time - firstFrame.time;
  let sampleTime =
    typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
      ? elapsedSeconds
      : firstFrame.time;
  if (duration > 1e-6) {
    sampleTime = loop
      ? firstFrame.time + positiveModulo(sampleTime - firstFrame.time, duration)
      : clampNumber(sampleTime, firstFrame.time, lastFrame.time);
  }
  if (sampleTime <= firstFrame.time || duration <= 1e-6) {
    return firstFrame.value;
  }
  if (sampleTime >= lastFrame.time) {
    return lastFrame.value;
  }
  for (let index = 1; index < sortedFrames.length; index += 1) {
    const current = sortedFrames[index];
    const previous = sortedFrames[index - 1];
    if (!current || !previous || sampleTime > current.time) {
      continue;
    }
    const segmentDuration = current.time - previous.time;
    if (segmentDuration <= 1e-6) {
      return current.value;
    }
    return lerpNumber(
      previous.value,
      current.value,
      clampNumber((sampleTime - previous.time) / segmentDuration, 0, 1)
    );
  }
  return lastFrame.value;
}

function sampleAuroraLightColorKeyframesAtElapsed(
  frames: Array<{ time: number; value: [number, number, number] }> | undefined,
  elapsedSeconds: number | undefined,
  loop = true
): [number, number, number] | undefined {
  if (!frames || frames.length === 0) {
    return undefined;
  }
  if (frames.length === 1) {
    return frames[0]?.value;
  }
  const sortedFrames = frames
    .filter((frame) =>
      Number.isFinite(frame.time) && frame.value.every((channel) => Number.isFinite(channel))
    )
    .sort((left, right) => left.time - right.time);
  const firstFrame = sortedFrames[0];
  const lastFrame = sortedFrames[sortedFrames.length - 1];
  if (!firstFrame || !lastFrame) {
    return undefined;
  }
  const duration = lastFrame.time - firstFrame.time;
  let sampleTime =
    typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
      ? elapsedSeconds
      : firstFrame.time;
  if (duration > 1e-6) {
    sampleTime = loop
      ? firstFrame.time + positiveModulo(sampleTime - firstFrame.time, duration)
      : clampNumber(sampleTime, firstFrame.time, lastFrame.time);
  }
  if (sampleTime <= firstFrame.time || duration <= 1e-6) {
    return firstFrame.value;
  }
  if (sampleTime >= lastFrame.time) {
    return lastFrame.value;
  }
  for (let index = 1; index < sortedFrames.length; index += 1) {
    const current = sortedFrames[index];
    const previous = sortedFrames[index - 1];
    if (!current || !previous || sampleTime > current.time) {
      continue;
    }
    const segmentDuration = current.time - previous.time;
    if (segmentDuration <= 1e-6) {
      return current.value;
    }
    return lerpAuroraColorVector(
      previous.value,
      current.value,
      clampNumber((sampleTime - previous.time) / segmentDuration, 0, 1)
    );
  }
  return lastFrame.value;
}

function sampleAuroraLightVector3KeyframesAtElapsed(
  frames: Array<{ time: number; value: [number, number, number] }> | undefined,
  elapsedSeconds: number | undefined,
  loop = true
): [number, number, number] | undefined {
  return sampleAuroraLightColorKeyframesAtElapsed(frames, elapsedSeconds, loop);
}

function toAuroraLightThreeColor(value: [number, number, number] | undefined): THREE.Color {
  const color = value ?? [1, 1, 1];
  return new THREE.Color(
    clampNumber(color[0], 0, 1),
    clampNumber(color[1], 0, 1),
    clampNumber(color[2], 0, 1)
  );
}

function resolveAuroraLightWorldPosition(
  light: PlaceableAuroraLightNode,
  animation: PlaceableAuroraLightAnimation | null,
  elapsedSeconds: number | undefined,
  objectRadius: number
): THREE.Vector3 {
  const sourcePosition =
    sampleAuroraLightVector3KeyframesAtElapsed(
      animation?.positionTimeline,
      elapsedSeconds,
      true
    ) ?? light.transform?.position ?? [0, 0, 0];
  return mapAuroraVectorToThree(sourcePosition).multiplyScalar(Math.max(objectRadius, 0.5));
}

function resolveAuroraLightWorldRadius(
  light: PlaceableAuroraLightNode,
  animation: PlaceableAuroraLightAnimation | null,
  elapsedSeconds: number | undefined,
  objectRadius: number
): number {
  const sourceRadius =
    sampleAuroraLightNumberKeyframesAtElapsed(
      animation?.radiusTimeline,
      elapsedSeconds,
      true
    ) ?? light.radius ?? 1;
  return Math.max(objectRadius * 0.9, sourceRadius * Math.max(objectRadius, 0.5));
}

function getAuroraLightHaloTexture(): THREE.CanvasTexture | null {
  if (auroraLightHaloTexture !== undefined) {
    return auroraLightHaloTexture;
  }
  if (typeof document === "undefined") {
    auroraLightHaloTexture = null;
    return auroraLightHaloTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context || typeof context.createRadialGradient !== "function") {
    auroraLightHaloTexture = null;
    return auroraLightHaloTexture;
  }

  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.18, "rgba(255, 255, 255, 0.55)");
  gradient.addColorStop(0.48, "rgba(255, 255, 255, 0.18)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  auroraLightHaloTexture = new THREE.CanvasTexture(canvas);
  auroraLightHaloTexture.colorSpace = THREE.SRGBColorSpace;
  auroraLightHaloTexture.needsUpdate = true;
  return auroraLightHaloTexture;
}

function createPlaceableVfxLightPreviewGroup(
  payload: PlaceableViewportRenderPayload,
  objectRadius: number,
  showDiagnosticGizmos = false
): THREE.Group {
  const lights = resolveAuroraLightsForPreview(payload);
  const group = new THREE.Group();
  const nowBaseMs = typeof performance !== "undefined" ? performance.now() : Date.now();

  lights.forEach((light, index) => {
    const animation = resolveAuroraLightAnimationSelection(payload, light);
    const initialColor = toAuroraLightThreeColor(
      sampleAuroraLightColorKeyframesAtElapsed(animation?.colorTimeline, 0, true) ?? light.color
    );
    const initialRadius = resolveAuroraLightWorldRadius(light, animation, 0, objectRadius);
    const multiplier =
      typeof light.multiplier === "number" && Number.isFinite(light.multiplier)
        ? Math.max(0, light.multiplier)
        : 1;
    const lightNode = new THREE.Group();
    lightNode.position.copy(resolveAuroraLightWorldPosition(light, animation, 0, objectRadius));

    const pointLight = new THREE.PointLight(initialColor, multiplier, initialRadius, 2);
    pointLight.userData = {
      auroraLightPreviewRole: "source-mdl-point-light",
      auroraLightNodeName: light.nodeName
    };
    lightNode.add(pointLight);

    const haloTexture = getAuroraLightHaloTexture();
    const haloMaterial = haloTexture
      ? new THREE.SpriteMaterial({
          map: haloTexture,
          color: initialColor,
          transparent: true,
          opacity: clampNumber(0.2 + multiplier * 0.035, 0.22, 0.42),
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      : null;
    const halo = haloMaterial ? new THREE.Sprite(haloMaterial) : null;
    if (halo) {
      halo.scale.setScalar(Math.max(objectRadius * 0.55, Math.sqrt(initialRadius) * 0.32));
      halo.renderOrder = PLACEABLE_VFX_DEFAULT_THREE_RENDER_ORDER - 18 - index;
      halo.userData = {
        auroraLightPreviewRole: "source-mdl-light-halo",
        auroraLightNodeName: light.nodeName
      };
      lightNode.add(halo);
    }

    const radiusMaterial = showDiagnosticGizmos
      ? new THREE.MeshBasicMaterial({
          color: initialColor,
          transparent: true,
          opacity: clampNumber(0.08 + multiplier * 0.02, 0.08, 0.18),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          wireframe: true
        })
      : null;
    const radiusGizmo = radiusMaterial
      ? new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), radiusMaterial)
      : null;
    if (radiusGizmo) {
      radiusGizmo.scale.setScalar(Math.max(objectRadius * 0.42, initialRadius * 0.18));
      radiusGizmo.renderOrder = PLACEABLE_VFX_DEFAULT_THREE_RENDER_ORDER - 12 - index;
      radiusGizmo.userData = {
        auroraLightPreviewRole: "source-mdl-light-radius-gizmo",
        auroraLightNodeName: light.nodeName
      };
      lightNode.add(radiusGizmo);
    }

    const coreMaterial = new THREE.MeshBasicMaterial({
      color: initialColor,
      transparent: true,
      opacity: showDiagnosticGizmos ? 0.78 : 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), coreMaterial);
    if (core) {
      core.scale.setScalar(Math.max(objectRadius * 0.16, 0.055));
      core.renderOrder = PLACEABLE_VFX_DEFAULT_THREE_RENDER_ORDER - 20 - index;
      core.userData = {
        auroraLightPreviewRole: "source-mdl-light-core",
        auroraLightNodeName: light.nodeName
      };
      lightNode.add(core);
    }

    const updateLightPreview = (elapsedOverride?: number): void => {
      const elapsed =
        elapsedOverride ??
        ((typeof performance !== "undefined" ? performance.now() : Date.now()) - nowBaseMs) /
          1000;
      const color = toAuroraLightThreeColor(
        sampleAuroraLightColorKeyframesAtElapsed(animation?.colorTimeline, elapsed, true) ??
          light.color
      );
      const radius = resolveAuroraLightWorldRadius(light, animation, elapsed, objectRadius);
      lightNode.position.copy(
        resolveAuroraLightWorldPosition(light, animation, elapsed, objectRadius)
      );
      pointLight.color.copy(color);
      pointLight.distance = radius;
      pointLight.intensity = multiplier;
      if (haloMaterial && halo) {
        haloMaterial.color.copy(color);
        haloMaterial.opacity = clampNumber(0.2 + multiplier * 0.035, 0.22, 0.42);
        halo.scale.setScalar(Math.max(objectRadius * 0.55, Math.sqrt(radius) * 0.32));
      }
      if (radiusMaterial && radiusGizmo) {
        radiusMaterial.color.copy(color);
        radiusMaterial.opacity = clampNumber(0.08 + multiplier * 0.02, 0.08, 0.18);
        radiusGizmo.scale.setScalar(Math.max(objectRadius * 0.42, radius * 0.18));
      }
      if (coreMaterial) {
        coreMaterial.color.copy(color);
      }
      lightNode.userData = {
        ...lightNode.userData,
        auroraLightColor: [color.r, color.g, color.b],
        auroraLightWorldRadius: radius
      };
    };
    updateLightPreview(0);
    (halo ?? radiusGizmo ?? core ?? pointLight).onBeforeRender = () => updateLightPreview();

    lightNode.userData = {
      ...lightNode.userData,
      vfxPreviewKind: "light",
      vfxPreviewRole: "aurora-light-node",
      vfxPreviewLayout: "source_mdl_light",
      auroraLightNodeName: light.nodeName,
      auroraLightSourceModelFileName: light.sourceModelFileName,
      auroraLightRadius: light.radius,
      auroraLightMultiplier: light.multiplier,
      auroraLightColor: light.color,
      auroraLightAmbientOnly: light.ambientOnly,
      auroraLightDynamicType: light.dynamicType,
      auroraLightAffectDynamic: light.affectDynamic,
      auroraLightShadow: light.shadow,
      auroraLightPriority: light.lightPriority,
      auroraLightSelectedAnimationName: animation?.animationName,
      auroraLightSelectedAnimationLengthSeconds: animation?.lengthSeconds,
      auroraLightAnimationNames: light.animations?.map((entry) => entry.animationName) ?? [],
      auroraLightPreviewMode: "source-mdl-light-node-preview",
      auroraLightVisualPreviewMode: showDiagnosticGizmos
        ? "source-mdl-light-diagnostic-gizmos"
        : "source-mdl-light-visible-preview",
      auroraLightDiagnosticGizmosVisible: showDiagnosticGizmos,
      auroraLightVisiblePlaceholderDiagnostic: showDiagnosticGizmos
        ? "VFX_LIGHT_NODE_DIAGNOSTIC_GIZMO_DEBUG_ONLY"
        : undefined
    };
    group.add(lightNode);
  });

  group.userData = {
    ...group.userData,
    vfxPreviewKind: "light",
    vfxPreviewRole: "aurora-light-node-group",
    vfxPreviewLayout: "source_mdl_light",
    vfxEmitterCount: 0,
    vfxLightCount: lights.length,
    vfxTextureStatus: "not-requested",
    auroraLightNodes: lights.map((light) => light.nodeName),
    auroraLightPreviewMode: "source-mdl-light-node-preview",
    auroraLightVisualPreviewMode: showDiagnosticGizmos
      ? "source-mdl-light-diagnostic-gizmos"
      : "source-mdl-light-visible-preview",
    auroraLightDiagnosticGizmosVisible: showDiagnosticGizmos,
    auroraLightVisiblePlaceholderDiagnostic: showDiagnosticGizmos
      ? "VFX_LIGHT_NODE_DIAGNOSTIC_GIZMO_DEBUG_ONLY"
      : undefined
  };
  return group;
}

interface PlaceableVfxPreviewGroupOptions {
  particleTexture?: THREE.Texture | null;
  textureDeliveryUrl?: string | null;
  particleTexturesByReference?: Map<string, THREE.Texture>;
  textureDeliveryUrlsByReference?: Map<string, string>;
  chunkModelsByAssetId?: Map<string, THREE.Object3D>;
  chunkModelUrlsByAssetId?: Map<string, string>;
  showLightDiagnosticGizmos?: boolean;
}

export function createPlaceableVfxPreviewGroup(
  payload: PlaceableViewportRenderPayload,
  objectRadius: number,
  colorHex: string,
  options: PlaceableVfxPreviewGroupOptions = {}
): THREE.Group {
  const auroraEmitters = resolveAuroraEmittersForPreview(payload);
  if (auroraEmitters.length === 0) {
    const auroraLights = resolveAuroraLightsForPreview(payload);
    if (auroraLights.length > 0) {
      return createPlaceableVfxLightPreviewGroup(
        payload,
        objectRadius,
        options.showLightDiagnosticGizmos === true
      );
    }
    const group = new THREE.Group();
    group.userData = {
      ...group.userData,
      vfxPreviewKind: "source_missing",
      vfxPreviewRole: "aurora-emitter-missing",
      vfxPreviewLayout: "no_aurora_emitter",
      vfxEmitterCount: 0,
      vfxTextureStatus: "not-requested",
      auroraEmitterPreviewMode: "source-emitter-payload-required",
      auroraEmitterMissingDiagnostic: "VFX_AURORA_MDL_EMITTER_PAYLOAD_REQUIRED",
      auroraEmitterTextureFallbackForbiddenDiagnostic:
        "VFX_TEXTURE_ONLY_MOCK_FALLBACK_FORBIDDEN"
    };
    return group;
  }
  if (auroraEmitters.length <= 1) {
    const childGroup = createPlaceableVfxEmitterPreviewGroup(
      payload,
      objectRadius,
      colorHex,
      options,
      auroraEmitters[0] ?? null,
      0,
      Math.max(1, auroraEmitters.length)
    );
    const group = new THREE.Group();
    group.add(childGroup);
    group.userData = {
      ...group.userData,
      ...childGroup.userData
    };
    return group;
  }

  const group = new THREE.Group();
  const childGroups = auroraEmitters.map((emitter, index) =>
    createPlaceableVfxEmitterPreviewGroup(
      payload,
      objectRadius,
      colorHex,
      options,
      emitter,
      index,
      auroraEmitters.length
    )
  );
  childGroups.forEach((childGroup) => group.add(childGroup));
  const textureStatuses = childGroups.map((childGroup) => childGroup.userData.vfxTextureStatus);
  const chunkNames = auroraEmitters
    .map((emitter) => resolveAuroraEmitterChunkName(emitter))
    .filter((chunkName): chunkName is string => Boolean(chunkName));
  const schedulePreviewModes = childGroups
    .map((childGroup) => childGroup.userData.auroraEmitterSchedulePreviewMode)
    .filter((mode): mode is string => typeof mode === "string" && mode.length > 0);
  const uniqueSchedulePreviewModes = Array.from(new Set(schedulePreviewModes));
  const scheduleDiagnostics = Array.from(
    new Set(
      childGroups.flatMap((childGroup) => {
        const diagnostics = childGroup.userData.auroraEmitterScheduleDiagnostics;
        return Array.isArray(diagnostics) ? diagnostics.filter((entry) => typeof entry === "string") : [];
      })
    )
  );
  group.userData = {
    ...group.userData,
    vfxPreviewKind: "multi_emitter",
    vfxPreviewRole: "aurora-multi-emitter",
    vfxPreviewLayout: "multi_emitter",
    vfxEmitterCount: auroraEmitters.length,
    vfxTextureStatus: textureStatuses.every((status) => status === "applied")
      ? "applied"
      : textureStatuses.every(
            (status) =>
              typeof status === "string" &&
              (status === "chunk-model-source-only" ||
                status === "chunk-model-loading" ||
                status === "chunk-model-applied")
          )
        ? textureStatuses.every((status) => status === "chunk-model-applied")
          ? "chunk-model-applied"
          : textureStatuses.some((status) => status === "chunk-model-loading")
            ? "chunk-model-loading"
            : "chunk-model-source-only"
        : textureStatuses.some((status) => status === "loading")
          ? "loading"
          : "missing",
    auroraEmitterNodes: auroraEmitters.map((emitter) => emitter.nodeName),
    auroraEmitterSourceModelFileNames: auroraEmitters.map(
      (emitter) => emitter.sourceModelFileName
    ),
    auroraEmitterSourceModelObjectKeys: auroraEmitters.map(
      (emitter) => emitter.sourceModelObjectKey
    ),
    auroraEmitterTextures: auroraEmitters.map((emitter) => emitter.texture ?? ""),
    auroraEmitterChunkNames: chunkNames,
    auroraEmitterRenderModes: auroraEmitters.map((emitter) => emitter.renderMode ?? ""),
    auroraEmitterBlendModes: auroraEmitters.map((emitter) => emitter.blendMode ?? ""),
    auroraEmitterStartDelaySeconds: childGroups.map(
      (childGroup) => childGroup.userData.auroraEmitterStartDelaySeconds ?? 0
    ),
    auroraEmitterSchedulePreviewModes: schedulePreviewModes,
    auroraEmitterSchedulePreviewMode:
      uniqueSchedulePreviewModes.length === 1
        ? uniqueSchedulePreviewModes[0]
        : "multi-emitter-mixed-local-clock-preview",
    auroraEmitterScheduleDiagnostics: scheduleDiagnostics
  };
  return group;
}

function createPlaceableVfxEmitterPreviewGroup(
  payload: PlaceableViewportRenderPayload,
  objectRadius: number,
  colorHex: string,
  options: PlaceableVfxPreviewGroupOptions,
  auroraEmitterOverride: PlaceableAuroraEmitterNode | null,
  emitterIndex: number,
  emitterCount: number
): THREE.Group {
  let profile = resolvePlaceableVfxPreviewProfile(
    payload,
    objectRadius,
    auroraEmitterOverride
  );
  const auroraEmitter = auroraEmitterOverride ?? resolvePrimaryAuroraEmitter(payload);
  let auroraAtlas = resolveAuroraEmitterAtlas(auroraEmitter);
  const auroraBaseSimulation = resolveAuroraEmitterSimulation(auroraEmitter);
  const auroraSimulation = profile.activeSimulation ?? auroraBaseSimulation;
  const auroraRenderMode = resolveAuroraEmitterRenderMode(auroraEmitter?.renderMode);
  const auroraBlendMode = resolveAuroraEmitterBlendMode(auroraEmitter?.blendMode);
  const auroraAnimationSelection = resolveAuroraEmitterAnimationSelection(payload, auroraEmitter);
  const auroraTransform = resolveAuroraEmitterActiveTransform(auroraEmitter, auroraAnimationSelection);
  const emitterColorHex = resolvePlaceableVfxColor(payload, auroraEmitter) ?? colorHex;
  profile = applyAuroraEmitterLocalClockScheduleToProfile(
    profile,
    emitterIndex,
    emitterCount
  );
  const nowBaseMs = resolveAuroraEmitterPreviewNowBaseMs(profile);
  if (
    auroraAtlas &&
    (profile.simulationTimeline?.fps?.length ||
      profile.simulationTimeline?.frameStart?.length ||
      profile.simulationTimeline?.frameEnd?.length)
  ) {
    auroraAtlas = {
      ...auroraAtlas,
      ...(profile.simulationTimeline?.fps?.length
        ? { fpsTimeline: profile.simulationTimeline.fps }
        : {}),
      ...(profile.simulationTimeline?.frameStart?.length
        ? { frameStartTimeline: profile.simulationTimeline.frameStart }
        : {}),
      ...(profile.simulationTimeline?.frameEnd?.length
        ? { frameEndTimeline: profile.simulationTimeline.frameEnd }
        : {})
    };
  }
  const group = new THREE.Group();
  const auroraChunkName = resolveAuroraEmitterChunkName(auroraEmitter);
  const chunkModelAssetId =
    typeof auroraEmitter?.chunkModelAssetId === "string"
      ? auroraEmitter.chunkModelAssetId.trim()
      : "";
  const chunkModelContract = resolveAuroraEmitterChunkModelContract(payload, auroraEmitter);
  const chunkModelContractDeliveryUrl =
    typeof chunkModelContract?.deliveryUrl === "string" &&
    chunkModelContract.deliveryUrl.trim().length > 0
      ? chunkModelContract.deliveryUrl
      : null;
  const chunkModelDeliveryUrl =
    (chunkModelAssetId
      ? options.chunkModelUrlsByAssetId?.get(chunkModelAssetId) ?? null
      : null) ?? chunkModelContractDeliveryUrl;
  const chunkModelTemplate =
    chunkModelAssetId.length > 0
      ? options.chunkModelsByAssetId?.get(chunkModelAssetId) ?? null
      : null;
  const chunkModelAssetStatus = auroraChunkName
    ? chunkModelTemplate
      ? "applied"
      : chunkModelDeliveryUrl
        ? "loading"
        : chunkModelAssetId
          ? "contract-missing"
          : "asset-missing"
    : undefined;
  const hasTextureNullNoChunk =
    !auroraChunkName && isPlaceableVfxNullTextureReference(auroraEmitter?.texture);
  const normalizedEmitterTextureReference =
    !hasTextureNullNoChunk &&
    !auroraChunkName &&
    typeof auroraEmitter?.texture === "string" &&
    auroraEmitter.texture.trim().length > 0
      ? auroraEmitter.texture.trim().toLowerCase()
      : null;
  const textureDeliveryUrl =
    hasTextureNullNoChunk
      ? null
      : (normalizedEmitterTextureReference
          ? options.textureDeliveryUrlsByReference?.get(normalizedEmitterTextureReference) ?? null
          : null) ??
        options.textureDeliveryUrl ??
        null;
  const particleTexture =
    hasTextureNullNoChunk
      ? null
      : (normalizedEmitterTextureReference
          ? options.particleTexturesByReference?.get(normalizedEmitterTextureReference) ?? null
          : null) ??
        options.particleTexture ??
        null;
  const alphaCompanionTextureReference = normalizedEmitterTextureReference
    ? resolvePlaceableVfxAlphaCompanionTextureReference(normalizedEmitterTextureReference)
    : null;
  const alphaCompanionTexture = alphaCompanionTextureReference
    ? options.particleTexturesByReference?.get(alphaCompanionTextureReference) ?? null
    : null;
  const hasSoftAlphaParticleTexture =
    Boolean(alphaCompanionTexture) ||
    (particleTexture ? isWhiteAlphaMaskTexture(particleTexture) : false);
  const softAlphaParticleCountSource = profile.count;
  if (hasTextureNullNoChunk) {
    profile = {
      ...profile,
      count: 0,
      particleCountSource: profile.count,
      particleCountPreviewMode: "texture-null-no-textured-draw",
      emissionMode: undefined,
      loopEmission: false
    };
  }
  const shouldCapSoftAlphaParticlePreview =
    hasSoftAlphaParticleTexture &&
    auroraBlendMode.authoringCandidate === "Lighten" &&
    profile.kind !== "beam" &&
    profile.layout === "camera_billboard" &&
    profile.count > 6;
  if (shouldCapSoftAlphaParticlePreview) {
    profile = {
      ...profile,
      count: 6,
      baseOpacity: Math.min(profile.baseOpacity, 0.08),
      particleCountLimit:
        profile.particleCountLimit !== undefined ? Math.min(profile.particleCountLimit, 6) : 6,
      particleCountPreviewMode: "soft-alpha-preview-capped"
    };
  }
  const auroraMaterialBlendState = resolveAuroraEmitterMaterialBlendState(auroraEmitter);
  const auroraParticleRenderState = resolveAuroraParticleRenderStateRecord(
    auroraMaterialBlendState,
    auroraEmitter
  );
  const auroraParticleDrawRecord = buildAuroraParticleDrawRecord(profile.count, {
    linked: profile.linkedParticles === true
  });
  applyAuroraEmitterRenderOrderAdapter(group, auroraEmitter);
  group.userData = {
    ...group.userData,
    vfxPreviewKind: profile.kind,
    vfxPreviewLayout: profile.layout,
    vfxPreviewRole:
      profile.layout === "world_z_sheet"
        ? "world-z-texture-sheets"
        : profile.layout === "world_z_billboard"
          ? "world-z-ground-billboards"
          : profile.layout === "world_z_aligned"
            ? "world-z-aligned-billboards"
            : profile.layout === "local_z_billboard"
              ? "local-z-billboards"
            : profile.layout === "linked_billboard"
              ? "linked-particle-segments"
            : profile.layout === "motion_blur"
              ? "motion-blur-endpoint-particles"
            : profile.layout === "particle_aligned"
              ? "particle-aligned-trails"
              : "texture-particles",
    vfxTextureDeliveryUrl: textureDeliveryUrl,
    vfxTextureStatus: hasTextureNullNoChunk
      ? "null-texture"
      : particleTexture
        ? "applied"
        : textureDeliveryUrl
          ? "loading"
          : "missing",
    auroraEmitterIndex: emitterIndex,
    auroraEmitterCount: emitterCount,
    auroraEmitterPackageSource: payload.renderPackage?.auroraEmitter?.source,
    auroraEmitterSource: auroraEmitter?.source,
    auroraEmitterSourceModelFileName: auroraEmitter?.sourceModelFileName,
    auroraEmitterSourceModelObjectKey: auroraEmitter?.sourceModelObjectKey,
    auroraEmitterSourceModelAssetId: auroraEmitter?.sourceModelAssetId,
    auroraEmitterNode: auroraEmitter?.nodeName,
    auroraEmitterType: auroraEmitter?.emitterType,
    auroraEmitterRenderMode: auroraEmitter?.renderMode,
    auroraEmitterRenderBucket: auroraRenderMode.bucket,
    auroraEmitterRenderRuntimeMode: auroraRenderMode.runtimeMode,
    auroraEmitterRenderDiagnostic: auroraRenderMode.diagnostic,
    auroraEmitterBlendMode: auroraEmitter?.blendMode,
    auroraEmitterBlendBucket: auroraBlendMode.bucket,
    auroraEmitterBlendRuntimeMode: auroraBlendMode.runtimeMode,
    auroraEmitterBlendShaderVariant: auroraBlendMode.shaderVariant,
    auroraEmitterBlendAuthoringCandidate: auroraBlendMode.authoringCandidate,
    auroraEmitterBlendDiagnostic: auroraBlendMode.diagnostic,
    auroraParticleRenderState,
    auroraParticleRenderStatePreviewMode: auroraParticleRenderState.previewMode,
    auroraParticleRenderStateDiagnostics: auroraParticleRenderState.diagnostics,
    auroraParticleTransparentLaneState0: auroraParticleRenderState.transparentLaneState0,
    auroraParticlePunchThroughState1: auroraParticleRenderState.punchThroughState1,
    auroraParticleShaderState2Enabled: auroraParticleRenderState.shaderState2Enabled,
    auroraParticleTwoSidedCullState3: auroraParticleRenderState.twoSidedCullState3,
    auroraParticleLightingState5Restore: auroraParticleRenderState.lightingState5Restore,
    auroraParticleRequestedDepthWrite: auroraParticleRenderState.requestedDepthWrite,
    auroraParticleShaderVariantFlag: auroraParticleRenderState.particleShaderVariantFlag,
    auroraParticleNonPunchVariantFlag: auroraParticleRenderState.particleNonPunchVariantFlag,
    auroraParticleBlendFuncWrapperInvoked: auroraParticleRenderState.blendFuncWrapperInvoked,
    auroraParticleBlendFuncFactorsCaptured: auroraParticleRenderState.blendFuncFactorsCaptured,
    auroraParticleRenderStateCacheWrapperRequired:
      auroraParticleRenderState.renderStateCacheWrapperRequired,
    auroraEmitterTexture: auroraEmitter?.texture,
    auroraEmitterTextureNullNoChunk: hasTextureNullNoChunk || undefined,
    auroraEmitterTextureNullPreviewMode: hasTextureNullNoChunk
      ? "texture-null-no-textured-draw"
      : undefined,
    auroraEmitterTextureNullDiagnostic: hasTextureNullNoChunk
      ? "VFX_TEXTURE_NULL_NO_CHUNK_NO_TEXTURED_DRAW"
      : undefined,
    auroraEmitterAlphaCompanionTexture: alphaCompanionTextureReference ?? undefined,
    auroraEmitterAlphaCompanionTextureStatus: alphaCompanionTextureReference
      ? alphaCompanionTexture
        ? "applied"
        : "missing"
      : undefined,
    auroraEmitterSoftAlphaParticleCountSource: shouldCapSoftAlphaParticlePreview
      ? softAlphaParticleCountSource
      : undefined,
    auroraEmitterSoftAlphaParticleCountPreviewMode: shouldCapSoftAlphaParticlePreview
      ? "soft-alpha-preview-capped"
      : undefined,
    auroraEmitterChunkName: auroraChunkName,
    auroraEmitterParticlePayloadKind: auroraChunkName ? "chunk_model" : "texture",
    auroraEmitterChunkPreviewMode: auroraChunkName
      ? chunkModelTemplate
        ? "chunk-model-particle-preview"
        : chunkModelDeliveryUrl
          ? "chunk-model-asset-loading"
        : "chunk-model-source-only"
      : undefined,
    auroraEmitterChunkModelAssetId: chunkModelAssetId || undefined,
    auroraEmitterChunkModelFileName: auroraEmitter?.chunkModelFileName,
    auroraEmitterChunkModelObjectKey: auroraEmitter?.chunkModelObjectKey,
    auroraEmitterChunkModelDeliveryUrl: chunkModelDeliveryUrl,
    auroraEmitterChunkModelAssetStatus: chunkModelAssetStatus,
    auroraEmitterTextureIgnoredByChunkName:
      auroraChunkName && typeof auroraEmitter?.texture === "string"
        ? auroraEmitter.texture
        : undefined,
    auroraEmitterSourceState: auroraEmitter?.sourceState,
    auroraEmitterRenderOrder: auroraEmitter?.sourceState?.renderOrder,
    auroraEmitterRenderHintRaw: auroraEmitter?.sourceState?.renderHintRaw,
    auroraEmitterRenderHintMode: auroraEmitter?.sourceState?.renderHintMode,
    auroraEmitterRenderHintPreviewMode:
      typeof auroraEmitter?.sourceState?.renderHintRaw === "string"
        ? "source-renderhint-decompile-enum-preserved"
        : undefined,
    auroraEmitterRenderHintDiagnostic:
      typeof auroraEmitter?.sourceState?.renderHintRaw === "string"
        ? "VFX_RENDERHINT_GL_STATE_CAPTURE_REQUIRED"
        : undefined,
    auroraEmitterCustomShaderVS: auroraEmitter?.sourceState?.customShaderVS,
    auroraEmitterCustomShaderFS: auroraEmitter?.sourceState?.customShaderFS,
    auroraEmitterCustomShaderGS: auroraEmitter?.sourceState?.customShaderGS,
    auroraEmitterCustomShaderPreviewMode:
      typeof auroraEmitter?.sourceState?.customShaderVS === "string" ||
      typeof auroraEmitter?.sourceState?.customShaderFS === "string" ||
      typeof auroraEmitter?.sourceState?.customShaderGS === "string"
        ? "source-custom-shader-names-preserved"
        : undefined,
    auroraEmitterCustomShaderDiagnostic:
      typeof auroraEmitter?.sourceState?.customShaderVS === "string" ||
      typeof auroraEmitter?.sourceState?.customShaderFS === "string" ||
      typeof auroraEmitter?.sourceState?.customShaderGS === "string"
        ? "VFX_CUSTOM_SHADER_GL_BINDING_CAPTURE_REQUIRED"
        : undefined,
    auroraEmitterTransparency: auroraEmitter?.sourceState?.transparency,
    auroraEmitterTransparencyPreviewMode:
      typeof auroraEmitter?.sourceState?.transparency === "boolean"
        ? "source-transparency-flag-preserved"
        : undefined,
    auroraEmitterTwoSidedMaterial: auroraEmitter?.sourceState?.twoSidedMaterial,
    auroraEmitterTwoSidedMaterialPreviewMode:
      typeof auroraEmitter?.sourceState?.twoSidedMaterial === "boolean"
        ? "source-twosided-material-flag-preserved"
        : undefined,
    auroraEmitterTwoSidedTexture: auroraEmitter?.sourceState?.twoSidedTexture,
    auroraEmitterSampleFramebuffer: auroraEmitter?.sourceState?.sampleFramebuffer,
    auroraEmitterSampleFramebufferPreviewMode:
      typeof auroraEmitter?.sourceState?.sampleFramebuffer === "number"
        ? "source-sample-framebuffer-int-preserved"
        : typeof auroraEmitter?.sourceState?.sampleFramebuffer === "boolean"
          ? "source-sample-framebuffer-flag-preserved"
        : undefined,
    auroraEmitterVolumetric: auroraEmitter?.sourceState?.volumetric,
    auroraEmitterVolumetricPreviewMode:
      typeof auroraEmitter?.sourceState?.volumetric === "boolean"
        ? "source-volumetric-flag-preserved"
        : undefined,
    ...buildAuroraEmitterTwoSidedMaterialRenderLaneUserData(auroraEmitter),
    ...buildAuroraEmitterFramebufferRenderLaneUserData(auroraEmitter),
    ...buildAuroraEmitterTextureSideUserData(auroraEmitter),
    auroraEmitterLoop: auroraEmitter?.sourceState?.loop,
    auroraEmitterIsTinted: auroraEmitter?.sourceState?.isTinted,
    ...buildAuroraEmitterTextureTintUserData(auroraEmitter),
    ...buildPlaceableVfxPreviewColorUserData(payload, emitterColorHex, auroraEmitter),
    auroraEmitterSplat: auroraEmitter?.sourceState?.splat,
    auroraEmitterSplatPreviewMode: profile.splatPreviewMode,
    auroraEmitterSplatDiagnostics: profile.splatDiagnostics,
    auroraEmitterRotateTexture: auroraEmitter?.sourceState?.rotateTexture,
    auroraEmitterRotateTexturePreviewMode: profile.rotateTexturePreviewMode,
    auroraEmitterRotateTextureDiagnostics: profile.rotateTextureDiagnostics,
    auroraEmitterSourceStatePreviewMode: auroraEmitter?.sourceState
      ? "source-state-preserved"
      : undefined,
    auroraEmitterAtlas: auroraAtlas,
    auroraEmitterAtlasFpsTimeline: auroraAtlas?.fpsTimeline,
    auroraEmitterAtlasFrameStartTimeline: auroraAtlas?.frameStartTimeline,
    auroraEmitterAtlasFrameEndTimeline: auroraAtlas?.frameEndTimeline,
    auroraEmitterAtlasPreviewMode: auroraAtlas
      ? "per-particle-vertex-uv-preview"
      : undefined,
    auroraEmitterAvailableAnimations: profile.availableAnimationNames,
    auroraEmitterSelectedAnimationName: profile.selectedAnimationName,
    auroraEmitterSelectedAnimationLengthSeconds: profile.selectedAnimationLengthSeconds,
    auroraEmitterSelectedAnimationTransitionSeconds: profile.selectedAnimationTransitionSeconds,
    auroraEmitterAnimationState: profile.selectedAnimationState,
    auroraEmitterAnimationSelectionSource: profile.selectedAnimationSource,
    auroraEmitterAnimationPreviewMode: profile.selectedAnimationPreviewMode,
    auroraEmitterAnimationSelectionDiagnostic: profile.selectedAnimationDiagnostic,
    auroraEmitterAnimationEmissionMuted: profile.selectedAnimationEmissionMuted,
    auroraEmitterStartDelaySeconds: profile.emitterStartDelaySeconds,
    auroraEmitterScheduleStepSeconds: profile.emitterScheduleStepSeconds,
    auroraEmitterScheduleDurationSeconds: profile.emitterScheduleDurationSeconds,
    auroraEmitterSchedulePreviewMode: profile.emitterSchedulePreviewMode,
    auroraEmitterScheduleDiagnostics: profile.emitterScheduleDiagnostics,
    auroraEmitterBaseSimulation: auroraBaseSimulation,
    auroraEmitterSimulation: auroraSimulation,
    auroraEmitterSimulationPreviewMode: auroraSimulation ? "profile-parameter-preview" : undefined,
    auroraEmitterBaseLift: profile.baseLift,
    auroraEmitterSourceTransformAnchorPreviewMode: profile.sourceTransformAnchorPreviewMode,
    auroraEmitterSimulationTimelinePreviewMode: profile.simulationTimeline
      ? "runtime-keyframe-sampled-preview"
      : undefined,
    auroraEmitterColorTimeline: profile.particleColorTimeline,
    auroraEmitterColorTimelinePreviewMode: profile.particleColorTimeline
      ? "runtime-color-keyframe-sampled-preview"
      : undefined,
    auroraEmitterUpdateMode: profile.motionMode,
    auroraEmitterUpdateModePreviewMode: profile.motionMode
      ? "aurora-update-mode-preview"
      : undefined,
    auroraEmitterFountainNormalPreviewMode: profile.fountainNormalPreviewMode,
    auroraEmitterFountainNormalSpawnIntervalSeconds:
      profile.fountainNormalSpawnIntervalSeconds,
    auroraEmitterFountainNormalDiagnostics: profile.fountainNormalDiagnostics,
    auroraEmitterFountainTrailPreviewMode: profile.fountainTrailPreviewMode,
    auroraEmitterFountainTrailSpacingMeters: profile.fountainTrailSpacingMeters,
    auroraEmitterFountainTrailDiagnostics: profile.fountainTrailDiagnostics,
    auroraEmitterLinkedPreviewMode: profile.linkedParticles
      ? "linked-active-list-adjacency-preview"
      : undefined,
    auroraEmitterLinkedActiveCountAtDraw: profile.linkedParticles ? profile.count : undefined,
    auroraEmitterLinkedDrawSegmentCount: profile.linkedParticles
      ? Math.max(0, profile.count - 1)
      : undefined,
    auroraEmitterLinkedDiagnostics: profile.linkedParticles
      ? [
          "VFX_LINKED_ACTIVE_LIST_ADJACENCY_REQUIRED",
          "VFX_LINKED_NOT_TRIANGLESTRIP_RING_BUFFER"
        ]
      : undefined,
    auroraEmitterEmissionMode: profile.emissionMode,
    auroraEmitterEmissionPreviewMode:
      profile.fountainTrailPreviewMode ?? (profile.emissionMode
        ? "birthrate-lifetime-scheduled-preview"
        : undefined),
    auroraEmitterBirthrate: profile.birthrate,
    auroraEmitterBirthrateKeyframes: profile.birthrateKeyframes?.map((frame) => ({
      time: frame.time,
      value: frame.value
    })),
    auroraEmitterBirthrateKeyframePreviewMode: profile.birthrateKeyframes
      ? "birthrate-key-controller-peak-preview"
      : undefined,
    auroraEmitterBirthrateTimelineEvaluationPreviewMode: profile.birthrateKeyframes
      ? "runtime-keyframe-sampled-spawn-rate"
      : undefined,
    auroraEmitterBirthrateAtPreviewTime: profile.birthrateKeyframes
      ? resolveAuroraEmitterBirthrateAtElapsed(profile, 0)
      : undefined,
    auroraEmitterLifeSeconds: profile.lifeSeconds,
    auroraEmitterParticleCount: profile.count,
    auroraEmitterParticleCountSource: profile.particleCountSource,
    auroraEmitterParticleCountLimit: profile.particleCountLimit,
    auroraEmitterParticleCountPreviewMode: profile.particleCountPreviewMode,
    auroraEmitterBirthratePositiveGateBlocked: profile.sourceBirthrateGateBlocked,
    auroraEmitterLifeExpPositiveGateBlocked: profile.sourceLifeExpGateBlocked,
    auroraEmitterEmissionGatePreviewMode: profile.emissionGatePreviewMode,
    auroraEmitterEmissionDiagnostics: profile.emissionDiagnostics,
    auroraEmitterParticleRotationRateSource: profile.particleRotationRateSource,
    auroraEmitterParticleRotationRateRadians: profile.particleRotationRate,
    auroraEmitterParticleRotationRatePreviewMode: profile.particleRotationRatePreviewMode,
    auroraEmitterParticleRotationRateTimeline: profile.simulationTimeline?.particleRot,
    auroraEmitterParticleRotationRateTimelinePreviewMode: profile.simulationTimeline?.particleRot
      ? "runtime-particle-rot-keyframe-sampled-preview"
      : undefined,
    auroraEmitterSurfaceMotionPreviewMode: profile.surfaceMotionPreviewMode,
    auroraEmitterParticleSizeMin: profile.sizeMin,
    auroraEmitterParticleSizeMax: profile.sizeMax,
    auroraEmitterParticleSizeStart: profile.particleSizeStart,
    auroraEmitterParticleSizeMid: profile.particleSizeMid,
    auroraEmitterParticleSizeEnd: profile.particleSizeEnd,
    auroraEmitterParticleSizeYStart: profile.particleSizeYStart,
    auroraEmitterParticleSizeYMid: profile.particleSizeYMid,
    auroraEmitterParticleSizeYEnd: profile.particleSizeYEnd,
    auroraEmitterParticleSizeYFallbackPreviewMode: profile.particleSizeYFallbackPreviewMode,
    auroraEmitterParticleSizeSourcePreviewMode: profile.particleSizeSourcePreviewMode,
    auroraEmitterParticleSizeVisibilityFloorPreviewMode:
      profile.particleSizeVisibilityFloorPreviewMode,
    auroraEmitterBubblePreviewMode: profile.bubblePreviewMode,
    auroraEmitterBubbleAlphaPreviewMode: profile.bubbleAlphaPreviewMode,
    auroraEmitterBubbleDiagnostics: profile.bubbleDiagnostics,
    auroraEmitterParticleAlphaStart: profile.particleAlphaStart,
    auroraEmitterParticleAlphaMid: profile.particleAlphaMid,
    auroraEmitterParticleAlphaEnd: profile.particleAlphaEnd,
    auroraEmitterParticleAlphaSourcePreviewMode: profile.particleAlphaSourcePreviewMode,
    auroraEmitterParticleAlphaPreviewClamp: profile.particleAlphaPreviewClamp,
    auroraEmitterParticleAlphaPreviewClampMode: profile.particleAlphaPreviewClampMode,
    auroraEmitterParticleColorStart: profile.particleColorStart,
    auroraEmitterParticleColorMid: profile.particleColorMid,
    auroraEmitterParticleColorEnd: profile.particleColorEnd,
    auroraEmitterParticlePercentStart: profile.particlePercentStart,
    auroraEmitterParticlePercentMid: profile.particlePercentMid,
    auroraEmitterParticlePercentEnd: profile.particlePercentEnd,
    auroraEmitterParticleInterpolationPreviewMode:
      profile.particleColorStart !== undefined ||
      profile.particleColorEnd !== undefined ||
      profile.particleAlphaStart !== undefined ||
      profile.particleAlphaEnd !== undefined ||
      profile.particleSizeStart !== undefined ||
      profile.particleSizeEnd !== undefined ||
      profile.particleSizeYStart !== undefined ||
      profile.particleSizeYEnd !== undefined
        ? "particle-color-alpha-size-linear-start-end"
        : undefined,
    auroraEmitterMidCurveSourcePreviewMode:
      profile.particleColorMid !== undefined ||
      profile.particleAlphaMid !== undefined ||
      profile.particleSizeMid !== undefined ||
      profile.particleSizeYMid !== undefined ||
      profile.particleColorTimeline?.colorMid ||
      profile.simulationTimeline?.alphaMid ||
      profile.simulationTimeline?.sizeMid ||
      profile.simulationTimeline?.sizeMidY
        ? "particle-mid-runtime-curve-preview"
        : undefined,
    auroraEmitterPercentCurvePreviewMode:
      profile.particlePercentStart !== undefined ||
      profile.particlePercentMid !== undefined ||
      profile.particlePercentEnd !== undefined ||
      profile.simulationTimeline?.percentStart ||
      profile.simulationTimeline?.percentMid ||
      profile.simulationTimeline?.percentEnd
        ? "particle-percent-runtime-curve-preview"
        : undefined,
    auroraEmitterParticleVelocity: profile.particleVelocity,
    auroraEmitterParticleVelocityTimeline: profile.simulationTimeline?.velocity,
    auroraEmitterParticleRandomVelocity: profile.particleRandomVelocity,
    auroraEmitterParticleRandomVelocityTimeline: profile.simulationTimeline?.randvel,
    auroraEmitterRandvelGate:
      hasAuroraEmitterRandvelSource(profile)
        ? AURORA_EMITTER_RANDVEL_GATE
        : undefined,
    auroraEmitterRandvelWorldGate: profile.particleRandomVelocityGate,
    auroraEmitterRandvelPreviewMode:
      hasAuroraEmitterRandvelSource(profile)
        ? hasAuroraEmitterRandvelTerm(profile)
          ? "signed-speed-term-gated-0.01"
          : "source-randvel-below-0.01-gate"
        : undefined,
    auroraEmitterRandvelDiagnostics:
      hasAuroraEmitterRandvelSource(profile)
        ? [
            "VFX_EMITTER_RANDVEL_GATE_001_REQUIRED",
            "VFX_EMITTER_RANDVEL_SIGNED_SPEED_TERM_REQUIRED",
            "VFX_EMITTER_RANDVEL_RANDOM_TERM_DIAGNOSTIC"
          ]
        : undefined,
    auroraEmitterParticleSpreadRadians: profile.particleSpreadRadians,
    auroraEmitterParticleSpreadTimeline: profile.simulationTimeline?.spread,
    auroraEmitterKinematicTimelinePreviewMode: hasAuroraEmitterKinematicTimeline(profile)
      ? "runtime-velocity-randvel-spread-keyframe-sampled-preview"
      : undefined,
    auroraEmitterParticleAccelerationY: profile.particleAccelerationY,
    auroraEmitterParticleMassTimeline: profile.simulationTimeline?.mass,
    auroraEmitterParticleAccelerationYTimelinePreviewMode: profile.simulationTimeline?.mass?.length
      ? "runtime-mass-keyframe-acceleration-preview"
      : undefined,
    auroraEmitterParticleKinematicCoordinateSpace: profile.particleKinematicCoordinateSpace,
    auroraEmitterParticleKinematicCoordinateSpacePreviewMode:
      profile.particleKinematicCoordinateSpacePreviewMode,
    auroraEmitterKinematicTravelClampDistance: profile.kinematicTravelClampDistance,
    auroraEmitterKinematicTravelClampPreviewMode: profile.kinematicTravelClampPreviewMode,
    auroraEmitterAffectedByWind: profile.affectedByWind,
    auroraEmitterWindDrift: profile.windDrift,
    auroraEmitterAffectedByWindPreviewMode: profile.affectedByWind
      ? "aurora-source-affectedbywind-horizontal-drift"
      : undefined,
    auroraEmitterZeroMotionPreviewMode: profile.zeroMotionPreviewMode,
    auroraEmitterProceduralModulationPreviewMode: shouldSuppressProceduralParticleModulation(profile)
      ? "suppressed-for-explicit-zero-kinematics"
      : undefined,
    auroraEmitterKinematicsPreviewMode: hasAuroraKinematicMotion(profile)
      ? "velocity-spread-integrated-preview"
      : undefined,
    auroraEmitterSinglePreviewMode: profile.singlePreviewMode,
    auroraEmitterSingleDiagnostics: profile.singleDiagnostics,
    auroraEmitterLoopEmission: profile.loopEmission,
    auroraEmitterPhysicsPreviewMode:
      profile.blurStretch !== undefined ||
      profile.deadspaceAngleRadians !== undefined ||
      hasAuroraEmitterMassSource(profile)
        ? "aurora-source-motion-fields-preview"
        : undefined,
    auroraEmitterGravityBias: profile.gravityBias,
    auroraEmitterDragDamping: undefined,
    auroraEmitterBlurLengthSource: profile.blurLengthSource,
    auroraEmitterBlurLengthTimeline: profile.simulationTimeline?.blurLength,
    auroraEmitterBlurLengthTimelinePreviewMode: profile.simulationTimeline?.blurLength
      ? "runtime-blurlength-keyframe-previous-position-blend"
      : undefined,
    auroraEmitterMotionBlurRawBlurLengthSource: profile.motionBlurRawBlurLengthSource,
    auroraEmitterMotionBlurBlurLengthPreviewMode: profile.motionBlurBlurLengthPreviewMode,
    auroraEmitterBlurStretch: profile.blurStretch,
    auroraEmitterBlurStretchPreviewMode: profile.blurStretchPreviewMode,
    auroraEmitterMotionBlurPreviewMode: profile.motionBlurPreviewMode,
    auroraEmitterMotionBlurDiagnostics: profile.motionBlurDiagnostics,
    auroraEmitterTrailStretch: profile.trailStretch,
    auroraEmitterInherit: profile.inherit,
    auroraEmitterInheritVelocity: profile.inheritVel,
    auroraEmitterInheritLocal: profile.inheritLocal,
    auroraEmitterInheritParticle: profile.inheritPart,
    auroraEmitterInheritPreviewMode:
      profile.inherit !== undefined ||
      profile.inheritVel !== undefined ||
      profile.inheritLocal !== undefined ||
      profile.inheritPart !== undefined
        ? "source-inherit-flags-preserved"
        : undefined,
    auroraEmitterInheritParticlePreviewMode: profile.inheritParticlePreviewMode,
    auroraEmitterInheritDiagnostics: profile.inheritDiagnostics,
    auroraEmitterDeadspaceDegrees: profile.deadspaceDegrees,
    auroraEmitterDeadspaceAngleRadians: profile.deadspaceAngleRadians,
    auroraEmitterDeadspacePreviewMode:
      profile.deadspaceAngleRadians !== undefined ? "view-direction-deadspace-angle-preview" : undefined,
    auroraEmitterBounceFactor: profile.bounceCoefficient,
    auroraEmitterBounceCoefficient:
      auroraSimulation?.bounce === true ? auroraSimulation.bounceCoefficient : undefined,
    auroraEmitterBounceCoefficientTimeline: profile.simulationTimeline?.bounceCoefficient,
    auroraEmitterBounceCoefficientTimelinePreviewMode:
      profile.simulationTimeline?.bounceCoefficient
        ? "runtime-bounce-coefficient-keyframe-preview"
        : undefined,
    auroraEmitterBouncePreviewMode: profile.bouncePreviewMode,
    auroraEmitterBounceDiagnostics: profile.bounceDiagnostics,
    auroraEmitterP2PPreviewMode: profile.p2pPreviewMode,
    auroraEmitterP2PReferencePreviewMode: profile.p2pReferencePreviewMode,
    auroraEmitterP2PTargetNodeName: profile.p2pTargetNodeName,
    auroraEmitterP2PMappedTarget: profile.p2pTargetOffset
      ? [
          profile.p2pTargetOffset.x,
          profile.p2pTargetOffset.y,
          profile.p2pTargetOffset.z
        ]
      : undefined,
    auroraEmitterP2PMotionMode: profile.p2pMotionMode,
    auroraEmitterP2PBezier2: profile.p2pBezier2,
    auroraEmitterP2PBezier2Timeline: profile.simulationTimeline?.p2pBezier2,
    auroraEmitterP2PBezier3: profile.p2pBezier3,
    auroraEmitterP2PBezier3Timeline: profile.simulationTimeline?.p2pBezier3,
    auroraEmitterP2PBezierTimelinePreviewMode:
      profile.simulationTimeline?.p2pBezier2 || profile.simulationTimeline?.p2pBezier3
        ? "runtime-p2p-bezier-keyframe-arc-preview"
        : undefined,
    auroraEmitterP2PBezierPreviewMode: profile.p2pBezierPreviewMode,
    auroraEmitterP2PGravity: profile.p2pGravity,
    auroraEmitterP2PGravityTimeline: profile.simulationTimeline?.grav,
    auroraEmitterP2PDrag: profile.p2pDrag,
    auroraEmitterP2PDragTimeline: profile.simulationTimeline?.drag,
    auroraEmitterP2PPhysicsTimelinePreviewMode:
      profile.simulationTimeline?.grav || profile.simulationTimeline?.drag
        ? "runtime-grav-drag-keyframe-travel-preview"
        : undefined,
    auroraEmitterP2PThreshold: profile.p2pThreshold,
    auroraEmitterP2PThresholdTimeline: profile.simulationTimeline?.threshold,
    auroraEmitterP2PThresholdTimelinePreviewMode: profile.simulationTimeline?.threshold
      ? "runtime-threshold-keyframe-target-cull-preview"
      : undefined,
    auroraEmitterP2PThresholdPreviewMode:
      profile.p2pThreshold !== undefined || profile.simulationTimeline?.threshold
        ? "source-threshold-target-cull-preview"
        : undefined,
    auroraEmitterP2PCombineTime: profile.p2pCombineTime,
    auroraEmitterP2PCombineTimeTimeline: profile.simulationTimeline?.combineTime,
    auroraEmitterP2PCombineTimeTimelinePreviewMode: profile.simulationTimeline?.combineTime
      ? "runtime-combinetime-keyframe-travel-preview"
      : undefined,
    auroraEmitterP2PCombineTimePreviewMode:
      profile.p2pCombineTime !== undefined || profile.simulationTimeline?.combineTime
        ? profile.p2pMotionMode === "gravity"
          ? "gravity-delay-preview"
          : "bezier-transition-factor-preview"
        : undefined,
    auroraEmitterP2PDiagnostics: profile.p2pDiagnostics,
    auroraEmitterBlastRadius: profile.blastRadius,
    auroraEmitterBlastLength: profile.blastLength,
    auroraEmitterExplosionRequestedSpawnCount: profile.explosionRequestedSpawnCount,
    auroraEmitterBlastPreviewMode:
      profile.blastRadius !== undefined || profile.blastLength !== undefined
        ? "blast-radius-length-preview"
        : undefined,
    auroraEmitterLightningScale: profile.lightningScale,
    auroraEmitterLightningDelay: profile.lightningDelay,
    auroraEmitterLightningRadius: profile.lightningRadius,
    auroraEmitterLightningScaleTimeline: profile.simulationTimeline?.lightningScale,
    auroraEmitterLightningDelayTimeline: profile.simulationTimeline?.lightningDelay,
    auroraEmitterLightningRadiusTimeline: profile.simulationTimeline?.lightningRadius,
    auroraEmitterLightningTimelinePreviewMode:
      profile.simulationTimeline?.lightningScale ||
      profile.simulationTimeline?.lightningDelay ||
      profile.simulationTimeline?.lightningRadius
        ? "aurora-lightning-keyframe-peak-profile-preview"
        : undefined,
    auroraEmitterLightningPreviewMode:
      profile.lightningScale !== undefined ||
      profile.lightningDelay !== undefined ||
      profile.lightningRadius !== undefined
        ? "lightning-controller-preview"
        : undefined,
    auroraEmitterRequiresDetonateEvent: profile.requiresDetonateEvent,
    auroraEmitterDetonatePreviewMode: profile.detonatePreviewMode,
    auroraEmitterDetonateDiagnostics: profile.detonateDiagnostics,
    auroraEmitterDetonateControllerValue: profile.detonateControllerValue,
    auroraEmitterDetonateControllerTimeline: profile.detonateControllerTimeline,
    auroraEmitterDetonateControllerPreviewMode: profile.detonateControllerPreviewMode,
    auroraEmitterDetonateControllerEvents: profile.detonateControllerEvents?.map((event) => ({
      time: event.time,
      type: event.type,
      animationName: event.animationName
    })),
    auroraEmitterDetonateEventFilterPreviewMode: profile.detonateEventFilterPreviewMode,
    auroraEmitterDetonateEventFilterAnimationName: profile.detonateEventFilterAnimationName,
    auroraEmitterDetonateEventSourceCount: profile.detonateEventSourceCount,
    auroraEmitterSurfacePreviewMode: resolveAuroraEmitterSurfacePreviewMode(profile),
    auroraEmitterSurfaceSpawnMode: resolveAuroraEmitterSurfaceSpawnMode(profile),
    auroraEmitterSurfaceSamplingPreviewMode: profile.emitterSurfaceSamplingPreviewMode,
    auroraEmitterSurfaceDiagnostics: profile.emitterSurfaceDiagnostics,
    auroraEmitterSurfaceWidth: profile.emitterSurfaceWidth,
    auroraEmitterSurfaceDepth: profile.emitterSurfaceDepth,
    auroraEmitterSurfaceXSizeTimeline: profile.simulationTimeline?.xSize,
    auroraEmitterSurfaceYSizeTimeline: profile.simulationTimeline?.ySize,
    auroraEmitterSurfaceSizeTimelinePreviewMode:
      profile.simulationTimeline?.xSize || profile.simulationTimeline?.ySize
        ? "runtime-xsize-ysize-keyframe-surface-preview"
        : undefined,
    auroraEmitterSurfaceWidthSourceCm: profile.emitterSurfaceWidthSourceCm,
    auroraEmitterSurfaceDepthSourceCm: profile.emitterSurfaceDepthSourceCm,
    auroraEmitterSurfaceEffectiveWidth: profile.emitterSurfaceEffectiveWidth,
    auroraEmitterSurfaceEffectiveDepth: profile.emitterSurfaceEffectiveDepth,
    auroraEmitterSurfaceUnitScale: profile.emitterSurfaceUnitScale,
    auroraEmitterMotionUnitScale: profile.emitterMotionUnitScale,
    auroraEmitterSurfaceAxisGateCm:
      profile.emitterSurfaceSamplingPreviewMode === "below-threshold-axis-gated-preview" ||
      profile.emitterSurfaceDiagnostics?.includes("VFX_EMITTER_SPAWN_RECTANGLE_LT4_AXIS_GATE")
        ? AURORA_EMITTER_SPAWN_RECTANGLE_AXIS_GATE_CM
        : undefined,
    auroraEmitterSpawnType: auroraSimulation?.spawnType,
    auroraEmitterSpawnTypePreviewMode:
      auroraSimulation?.spawnType === 1
        ? "trail-spawn-type-preserved-preview-only"
        : auroraSimulation?.spawnType === 0
          ? "normal-spawn-type-preserved"
          : undefined,
    auroraEmitterTransform: auroraTransform,
    auroraEmitterTransformPreviewMode: auroraTransform ? "node-transform-preview" : undefined,
    auroraEmitterReferenceNodes: auroraEmitter?.referenceNodes,
    auroraEmitterEvents: auroraEmitter?.events,
    auroraEmitterDetonateEvents: profile.detonateEvents?.map((event) => ({
      time: event.time,
      type: event.type,
      animationName: event.animationName
    }))
  };
  applyAuroraEmitterTransformToGroup(group, auroraTransform, objectRadius, 0);
  if (auroraChunkName) {
    const chunkModelStatus = chunkModelTemplate
      ? "chunk-model-applied"
      : chunkModelDeliveryUrl
        ? "chunk-model-loading"
        : "chunk-model-source-only";
    if (chunkModelTemplate && chunkModelAssetId) {
      const chunkParticles = createAuroraChunkModelParticlePreview(
        chunkModelTemplate,
        profile,
        objectRadius,
        chunkModelAssetId,
        chunkModelDeliveryUrl,
        auroraEmitter
      );
      group.add(chunkParticles);
    }
    group.userData = {
      ...group.userData,
      vfxPreviewKind: "generic",
      vfxPreviewLayout: chunkModelTemplate
        ? "chunk_model_particles"
        : "chunk_model_source_only",
      vfxPreviewRole: chunkModelTemplate
        ? "chunk-model-particles"
        : "chunk-model-source-only",
      vfxTextureDeliveryUrl: null,
      vfxTextureStatus: chunkModelStatus,
      vfxChunkModelStatus: chunkModelAssetStatus,
      auroraEmitterChunkResolverDiagnostic: chunkModelDeliveryUrl
        ? "VFX_CHUNK_MODEL_RESOURCE_READY"
        : "VFX_CHUNK_MODEL_RESOLVER_REQUIRED",
      auroraEmitterTextureFallbackForbiddenDiagnostic:
        "VFX_CHUNK_MISSING_MODEL_NO_TEXTURE_FALLBACK"
    };
    return attachAuroraEmitterTransformTimelineSampler(
      group,
      auroraTransform,
      objectRadius,
      nowBaseMs
    );
  }
  applyAuroraParticleDrawRecordUserData(group, auroraParticleDrawRecord);
  const vfxColor = new THREE.Color(emitterColorHex);
  const resolvedParticleTexture = particleTexture
    ? resolveVfxMaterialTexture(particleTexture, {
        alphaTexture: alphaCompanionTexture,
        forceBlackKey:
          profile.additive || shouldForceVfxBlackKeyForEmitterTexture(auroraEmitter, textureDeliveryUrl)
      })
    : null;
  const isBeam = profile.kind === "beam";
  const isSpark = profile.kind === "spark";
  const applyTexturedParticleDrawRecord = (
    mesh: THREE.Mesh,
    geometry: THREE.BufferGeometry,
    material: PlaceableVfxPreviewMaterial
  ): void => {
    applyAuroraParticleDrawRecordUserData(mesh, auroraParticleDrawRecord);
    applyAuroraParticleDrawRecordUserData(geometry, auroraParticleDrawRecord);
    applyAuroraParticleDrawRecordUserData(material, auroraParticleDrawRecord);
  };
  if (profile.layout === "world_z_sheet" || profile.layout === "world_z_billboard") {
    const meshRole =
      profile.layout === "world_z_billboard" ? "world-z-ground-billboard" : "world-z-sheet";
    for (let index = 0; index < profile.count; index += 1) {
      const phase = (index / profile.count) * Math.PI * 2;
      const radial = 0.18 + ((index * 977) % 1000) / 1000;
      const radius = radial * profile.radius;
      const surfaceOffset = resolveVfxSurfaceSpawnOffset(profile, index, phase, radius);
      const baseX = surfaceOffset.x;
      const baseZ = surfaceOffset.z;
      const driftPhase = phase * 1.31;
      const speed = 0.12 + (((index * 571) % 1000) / 1000) * 0.2;
      const baseWidth =
        profile.sizeMin + (((index * 349) % 1000) / 1000) * (profile.sizeMax - profile.sizeMin);
      const baseHeight = resolveVfxParticleSizeYAtAge(profile, baseWidth, 0);
      const geometry = createAuroraTexturedParticleQuadGeometry(baseWidth, baseHeight);
      const material = new THREE.MeshBasicMaterial({
        color: vfxColor,
        transparent: auroraMaterialBlendState.transparent,
        opacity: resolveInitialVfxParticleOpacity(profile, particleTexture, index, phase, speed),
        depthWrite: auroraMaterialBlendState.depthWrite,
        depthTest: true,
        alphaTest: auroraMaterialBlendState.alphaTest,
        side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
        blending: auroraMaterialBlendState.blending
      });
      material.userData = {
        ...material.userData,
        auroraSharedTexture: particleTexture ? true : false,
        auroraBaseOpacity: profile.baseOpacity,
        auroraEmitterAtlas: auroraAtlas,
        auroraEmitterBlendMode: auroraEmitter?.blendMode,
        auroraEmitterAdditivePreview: profile.additive,
        auroraVfxGeneratedMaterial: true,
        vfxTextureDeliveryUrl: textureDeliveryUrl
      };
      applyAuroraEmitterTextureSideAdapter(material, auroraEmitter);
      applyAuroraEmitterMaterialBlendState(material, auroraMaterialBlendState, auroraEmitter);
      applyAuroraEmitterTextureTintAdapter(material, auroraEmitter);
      applyPlaceableVfxPreviewColorAdapter(material, payload, emitterColorHex, auroraEmitter);
      if (resolvedParticleTexture) {
        setVfxMaterialTexture(
          material,
          resolvedParticleTexture,
          vfxColor,
          auroraAtlas ? { atlas: auroraAtlas, frameSeed: index, nowBaseMs } : null
        );
      }

      const mesh = new THREE.Mesh(geometry, material);
      updateVfxMaterialAtlasFrame(material, 0, geometry);
      applyVfxParticleColorAtAge(material, vfxColor, profile, 0, 0, geometry);
      applyVfxParticleOpacity(material, geometry, material.opacity);
      applyAuroraParticleSoftnessState(
        material,
        geometry,
        profile,
        auroraRenderMode,
        baseWidth,
        baseHeight
      );
      const proceduralBaseAngle =
        profile.layout === "world_z_billboard"
          ? phase
          : phase + ((((index * 613) % 1000) / 1000) - 0.5) * Math.PI * 0.7;
      const baseAngle = resolveAuroraSurfaceFlowWorldZSheetAngle(
        profile,
        proceduralBaseAngle
      );
      mesh.rotation.set(-Math.PI / 2, 0, baseAngle);
      mesh.position.set(
        baseX,
        shouldUseAuroraSurfaceFlowWorldZSheet(profile)
          ? profile.baseLift
          : profile.baseLift + (index % 3) * objectRadius * 0.006,
        baseZ
      );
      mesh.userData = {
        ...mesh.userData,
        vfxPreviewKind: profile.kind,
        vfxPreviewLayout: profile.layout,
        vfxPreviewRole: meshRole,
        auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list"
      };
      applyAuroraEmitterRenderOrderAdapter(mesh, auroraEmitter);
      applyTexturedParticleDrawRecord(mesh, geometry, material);
      mesh.onBeforeRender = () => {
        if (!material.map) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-no-texture");
          return;
        }
        const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsed = (nowMs - nowBaseMs) * 0.001;
        const schedule = shouldUseTemporalParticleSchedule(profile)
          ? resolveVfxParticleSchedule(profile, index, elapsed, phase, speed)
          : resolveStaticVfxParticleSchedule(profile);
        if (!schedule.visible) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-schedule");
          return;
        }
        const cycle = schedule.normalizedAge;
        const particleAgeSeconds =
          schedule.ageSeconds ?? resolveVfxParticleAgeSeconds(cycle, profile.lifeSeconds);
        updateVfxMaterialAtlasFrame(material, particleAgeSeconds, mesh.geometry);
        const wave = 0.5 + 0.5 * Math.sin(elapsed * (1.7 + speed) + phase * 2.8);
        const driftWave = elapsed * (0.68 + speed) + driftPhase;
        const driftScale = resolveVfxParticleDriftScale(profile);
        const kinematicOffset = resolveAuroraKinematicOffset(
          profile,
          index,
          phase,
          cycle,
          new THREE.Vector3(baseX, profile.baseLift, baseZ),
          particleAgeSeconds
        );
        if (kinematicOffset && profile.surfaceMotionPreviewMode !== "world-z-sheet-surface-flow") {
          mesh.position.set(
            baseX + kinematicOffset.x,
            profile.baseLift + kinematicOffset.y,
            baseZ + kinematicOffset.z
          );
          mesh.userData = {
            ...mesh.userData,
            auroraEmitterWorldZKinematicsPreviewMode:
              "source-velocity-spread-position-integration",
            auroraEmitterWorldZKinematicOffset: [
              kinematicOffset.x,
              kinematicOffset.y,
              kinematicOffset.z
            ]
          };
        } else {
          mesh.position.x = baseX + Math.cos(driftWave) * profile.drift * 0.72 * driftScale;
          mesh.position.z = baseZ + Math.sin(driftWave) * profile.drift * 0.72 * driftScale;
          mesh.position.y = shouldUseAuroraSurfaceFlowWorldZSheet(profile)
            ? profile.baseLift
            : profile.baseLift +
              (index % 3) * objectRadius * 0.006 +
              resolveAuroraBouncedVerticalOffset(
                profile,
                resolveVfxParticleVerticalOffset(profile, cycle, wave * profile.height),
                particleAgeSeconds
              );
        }
        applyVfxParticleWindOffset(mesh, profile, index, elapsed);
        mesh.rotation.z =
          hasAuroraParticleRotationRateSource(profile)
            ? resolveVfxParticleRotationAtElapsed(profile, baseAngle, elapsed)
            : profile.layout === "world_z_billboard"
              ? baseAngle
              : shouldUseAuroraSurfaceFlowWorldZSheet(profile) ||
                  shouldSuppressProceduralParticleModulation(profile)
                ? baseAngle
                : baseAngle + Math.sin(elapsed * (0.62 + speed) + phase) * 0.12;
        const particleSize = resolveVfxParticleSizeAtAge(profile, baseWidth, cycle, elapsed);
        const particleScale = particleSize / Math.max(0.001, baseWidth);
        const particleSizeY = resolveVfxParticleSizeYAtAge(profile, baseHeight, cycle, elapsed);
        const particleScaleY = particleSizeY / Math.max(0.001, baseHeight);
        applyAuroraParticleSoftnessState(
          material,
          mesh.geometry,
          profile,
          auroraRenderMode,
          particleSize,
          particleSizeY
        );
        const sizeIsAuroraSourceDriven =
          profile.particleSizeSourcePreviewMode === "aurora-source-size-linear";
        const alphaIsAuroraSourceDriven =
          profile.particleAlphaSourcePreviewMode === "aurora-source-alpha-linear";
        const suppressProceduralModulation = shouldSuppressProceduralParticleModulation(profile);
        const surfaceFlowSheet = shouldUseAuroraSurfaceFlowWorldZSheet(profile);
        const scaleX = sizeIsAuroraSourceDriven
          ? particleScale
          : particleScale *
            (surfaceFlowSheet || suppressProceduralModulation ? 1 : 0.92 + wave * 0.18);
        const scaleY =
          particleScaleY *
          (sizeIsAuroraSourceDriven || surfaceFlowSheet || suppressProceduralModulation
            ? 1
            : 0.86 + (1 - wave) * 0.22) *
          resolveVfxParticleBlurStretch(profile);
        mesh.scale.set(scaleX, scaleY, 1);
        applyVfxParticleColorAtAge(material, vfxColor, profile, cycle, elapsed, mesh.geometry);
        applyVfxParticleOpacity(
          material,
          mesh.geometry,
          resolveVfxParticleOpacity(
            profile,
            cycle,
            alphaIsAuroraSourceDriven
              ? profile.baseOpacity
              : suppressProceduralModulation
                ? profile.baseOpacity
              : Math.max(0.06, profile.baseOpacity * (0.72 + wave * 0.28)),
            elapsed
          )
        );
      };
      group.add(mesh);
    }

    return attachAuroraEmitterTransformTimelineSampler(
      group,
      auroraTransform,
      objectRadius,
      nowBaseMs
    );
  }

  if (profile.layout === "world_z_aligned") {
    const worldZAlignedCameraPosition = new THREE.Vector3();
    for (let index = 0; index < profile.count; index += 1) {
      const phase = (index / profile.count) * Math.PI * 2;
      const radial = 0.18 + ((index * 977) % 1000) / 1000;
      const radius = radial * profile.radius;
      const surfaceOffset = resolveVfxSurfaceSpawnOffset(profile, index, phase, radius);
      const baseX = surfaceOffset.x;
      const baseZ = surfaceOffset.z;
      const driftPhase = phase * 1.31;
      const speed = 0.12 + (((index * 571) % 1000) / 1000) * 0.2;
      const baseWidth =
        profile.sizeMin + (((index * 349) % 1000) / 1000) * (profile.sizeMax - profile.sizeMin);
      const baseHeight = resolveVfxParticleSizeYAtAge(profile, baseWidth, 0);
      const geometry = createAuroraTexturedParticleQuadGeometry(baseWidth, baseHeight);
      const material = new THREE.MeshBasicMaterial({
        color: vfxColor,
        transparent: auroraMaterialBlendState.transparent,
        opacity: resolveInitialVfxParticleOpacity(profile, particleTexture, index, phase, speed),
        depthWrite: auroraMaterialBlendState.depthWrite,
        depthTest: true,
        alphaTest: auroraMaterialBlendState.alphaTest,
        side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
        blending: auroraMaterialBlendState.blending
      });
      material.userData = {
        ...material.userData,
        auroraSharedTexture: particleTexture ? true : false,
        auroraBaseOpacity: profile.baseOpacity,
        auroraEmitterAtlas: auroraAtlas,
        auroraEmitterBlendMode: auroraEmitter?.blendMode,
        auroraEmitterAdditivePreview: profile.additive,
        auroraVfxGeneratedMaterial: true,
        vfxTextureDeliveryUrl: textureDeliveryUrl
      };
      applyAuroraEmitterTextureSideAdapter(material, auroraEmitter);
      applyAuroraEmitterMaterialBlendState(material, auroraMaterialBlendState, auroraEmitter);
      applyAuroraEmitterTextureTintAdapter(material, auroraEmitter);
      applyPlaceableVfxPreviewColorAdapter(material, payload, emitterColorHex, auroraEmitter);
      if (resolvedParticleTexture) {
        setVfxMaterialTexture(
          material,
          resolvedParticleTexture,
          vfxColor,
          auroraAtlas ? { atlas: auroraAtlas, frameSeed: index, nowBaseMs } : null
        );
      }

      const mesh = new THREE.Mesh(geometry, material);
      updateVfxMaterialAtlasFrame(material, 0, geometry);
      applyVfxParticleColorAtAge(material, vfxColor, profile, 0, 0, geometry);
      applyVfxParticleOpacity(material, geometry, material.opacity);
      applyAuroraParticleSoftnessState(
        material,
        geometry,
        profile,
        auroraRenderMode,
        baseWidth,
        baseHeight
      );
      const riseOffset = (((index * 839) % 1000) / 1000) * profile.height;
      const initialSize = resolveVfxParticleSizeAtAge(profile, baseWidth, 0);
      const initialScale = initialSize / Math.max(0.001, baseWidth);
      const initialSizeY = resolveVfxParticleSizeYAtAge(profile, baseHeight, 0);
      const initialScaleY = initialSizeY / Math.max(0.001, baseHeight);
      mesh.position.set(baseX, profile.baseLift + riseOffset, baseZ);
      mesh.rotation.set(0, phase, 0);
      mesh.scale.set(initialScale, initialScaleY, 1);
      mesh.userData = {
        ...mesh.userData,
        vfxPreviewKind: profile.kind,
        vfxPreviewLayout: profile.layout,
        vfxPreviewRole: "world-z-aligned",
        auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list"
      };
      applyAuroraEmitterRenderOrderAdapter(mesh, auroraEmitter);
      applyTexturedParticleDrawRecord(mesh, geometry, material);
      mesh.onBeforeRender = (_renderer, _scene, camera) => {
        if (!material.map) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-no-texture");
          return;
        }
        const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsed = (nowMs - nowBaseMs) * 0.001;
        const schedule = shouldUseTemporalParticleSchedule(profile)
          ? resolveVfxParticleSchedule(profile, index, elapsed, phase, speed)
          : resolveStaticVfxParticleSchedule(profile);
        if (!schedule.visible) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-schedule");
          return;
        }
        const cycle = schedule.normalizedAge;
        const particleAgeSeconds =
          schedule.ageSeconds ?? resolveVfxParticleAgeSeconds(cycle, profile.lifeSeconds);
        updateVfxMaterialAtlasFrame(material, particleAgeSeconds, mesh.geometry);
        const driftWave = elapsed * (0.68 + speed) + driftPhase;
        const driftScale = resolveVfxParticleDriftScale(profile);
        mesh.position.x = baseX + Math.cos(driftWave) * profile.drift * 0.72 * driftScale;
        mesh.position.z = baseZ + Math.sin(driftWave) * profile.drift * 0.72 * driftScale;
        const linearOffset =
          profile.height > 0 ? (riseOffset + cycle * profile.height) % profile.height : 0;
        const particleSize = resolveVfxParticleSizeAtAge(profile, baseWidth, cycle, elapsed);
        const particleScale = particleSize / Math.max(0.001, baseWidth);
        const particleSizeY = resolveVfxParticleSizeYAtAge(profile, baseHeight, cycle, elapsed);
        const particleScaleY = particleSizeY / Math.max(0.001, baseHeight);
        applyAuroraParticleSoftnessState(
          material,
          mesh.geometry,
          profile,
          auroraRenderMode,
          particleSize,
          particleSizeY
        );
        const particleBlurStretch = resolveVfxParticleBlurStretch(profile);
        mesh.position.y =
          profile.baseLift +
          resolveAuroraBouncedVerticalOffset(
            profile,
            resolveVfxParticleVerticalOffset(profile, cycle, linearOffset),
            particleAgeSeconds
          );
        applyVfxParticleWindOffset(mesh, profile, index, elapsed);
        let cameraAlignedYaw = phase;
        if (mesh.parent) {
          worldZAlignedCameraPosition.copy(camera.position);
          mesh.parent.worldToLocal(worldZAlignedCameraPosition);
          const lookX = worldZAlignedCameraPosition.x - mesh.position.x;
          const lookZ = worldZAlignedCameraPosition.z - mesh.position.z;
          if (lookX * lookX + lookZ * lookZ > 1e-10) {
            cameraAlignedYaw = Math.atan2(lookX, lookZ);
          }
        }
        mesh.rotation.set(
          0,
          cameraAlignedYaw,
          hasAuroraParticleRotationRateSource(profile)
            ? resolveVfxParticleRotationAtElapsed(profile, 0, elapsed)
            : 0
        );
        mesh.scale.set(particleScale, particleScaleY * particleBlurStretch, 1);
        applyVfxParticleColorAtAge(material, vfxColor, profile, cycle, elapsed, mesh.geometry);
        applyVfxParticleOpacity(
          material,
          mesh.geometry,
          resolveVfxParticleOpacity(
            profile,
            cycle,
            profile.height > 0
              ? Math.max(0.05, profile.baseOpacity * (1 - cycle * 0.45))
              : profile.baseOpacity,
            elapsed
          )
        );
      };
      group.add(mesh);
    }

    return attachAuroraEmitterTransformTimelineSampler(
      group,
      auroraTransform,
      objectRadius,
      nowBaseMs
    );
  }

  if (profile.layout === "local_z_billboard") {
    const localCameraPosition = new THREE.Vector3();
    for (let index = 0; index < profile.count; index += 1) {
      const phase = (index / profile.count) * Math.PI * 2;
      const radial = 0.12 + ((index * 977) % 1000) / 1000;
      const radius = radial * profile.radius;
      const surfaceOffset = resolveVfxSurfaceSpawnOffset(profile, index, phase, radius);
      const baseX = surfaceOffset.x;
      const baseZ = surfaceOffset.z;
      const driftPhase = phase * 1.19;
      const speed = 0.1 + (((index * 571) % 1000) / 1000) * 0.22;
      const baseWidth =
        profile.sizeMin + (((index * 349) % 1000) / 1000) * (profile.sizeMax - profile.sizeMin);
      const baseHeight = resolveVfxParticleSizeYAtAge(profile, baseWidth, 0);
      const geometry = createAuroraTexturedParticleQuadGeometry(baseWidth, baseHeight);
      const material = new THREE.MeshBasicMaterial({
        color: vfxColor,
        transparent: auroraMaterialBlendState.transparent,
        opacity: resolveInitialVfxParticleOpacity(profile, particleTexture, index, phase, speed),
        depthWrite: auroraMaterialBlendState.depthWrite,
        depthTest: true,
        alphaTest: auroraMaterialBlendState.alphaTest,
        side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
        blending: auroraMaterialBlendState.blending
      });
      material.userData = {
        ...material.userData,
        auroraSharedTexture: particleTexture ? true : false,
        auroraBaseOpacity: profile.baseOpacity,
        auroraEmitterAtlas: auroraAtlas,
        auroraEmitterBlendMode: auroraEmitter?.blendMode,
        auroraEmitterAdditivePreview: profile.additive,
        auroraVfxGeneratedMaterial: true,
        vfxTextureDeliveryUrl: textureDeliveryUrl
      };
      applyAuroraEmitterTextureSideAdapter(material, auroraEmitter);
      applyAuroraEmitterMaterialBlendState(material, auroraMaterialBlendState, auroraEmitter);
      applyAuroraEmitterTextureTintAdapter(material, auroraEmitter);
      applyPlaceableVfxPreviewColorAdapter(material, payload, emitterColorHex, auroraEmitter);
      if (resolvedParticleTexture) {
        setVfxMaterialTexture(
          material,
          resolvedParticleTexture,
          vfxColor,
          auroraAtlas ? { atlas: auroraAtlas, frameSeed: index, nowBaseMs } : null
        );
      }

      const mesh = new THREE.Mesh(geometry, material);
      updateVfxMaterialAtlasFrame(material, 0, geometry);
      applyVfxParticleColorAtAge(material, vfxColor, profile, 0, 0, geometry);
      applyVfxParticleOpacity(material, geometry, material.opacity);
      applyAuroraParticleSoftnessState(
        material,
        geometry,
        profile,
        auroraRenderMode,
        baseWidth,
        baseHeight
      );
      const riseOffset =
        profile.motionMode === "single" ? 0 : (((index * 839) % 1000) / 1000) * profile.height;
      mesh.position.set(baseX, profile.baseLift + baseHeight * 0.5 + riseOffset, baseZ);
      mesh.userData = {
        ...mesh.userData,
        vfxPreviewKind: profile.kind,
        vfxPreviewLayout: profile.layout,
        vfxPreviewRole: "local-z-billboard",
        auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list",
        auroraEmitterLocalZBillboard: true
      };
      applyAuroraEmitterRenderOrderAdapter(mesh, auroraEmitter);
      applyTexturedParticleDrawRecord(mesh, geometry, material);
      mesh.onBeforeRender = (_renderer, _scene, camera) => {
        if (!material.map) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-no-texture");
          return;
        }
        const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsed = (nowMs - nowBaseMs) * 0.001;
        const schedule =
          (profile.motionMode === "single" && !profile.loopEmission) ||
          !shouldUseTemporalParticleSchedule(profile)
            ? resolveStaticVfxParticleSchedule(profile)
            : resolveVfxParticleSchedule(profile, index, elapsed, phase, speed);
        if (!schedule.visible) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-schedule");
          return;
        }
        const cycle = schedule.normalizedAge;
        const particleAgeSeconds =
          schedule.ageSeconds ?? resolveVfxParticleAgeSeconds(cycle, profile.lifeSeconds);
        updateVfxMaterialAtlasFrame(material, particleAgeSeconds, mesh.geometry);
        const wave = 0.5 + 0.5 * Math.sin(elapsed * (0.74 + speed) + phase * 2.1);
        const driftWave = elapsed * (0.42 + speed) + driftPhase;
        const driftScale = resolveVfxParticleDriftScale(profile);
        const driftDistance =
          profile.motionMode === "single" ? 0 : profile.drift * 0.48 * driftScale;
        mesh.position.x = baseX + Math.cos(driftWave) * driftDistance;
        mesh.position.z = baseZ + Math.sin(driftWave) * driftDistance;
        const linearOffset =
          profile.height > 0 && profile.motionMode !== "single"
            ? (riseOffset + cycle * profile.height) % profile.height
            : 0;
        mesh.position.y =
          profile.baseLift +
          baseHeight * 0.5 +
          resolveAuroraBouncedVerticalOffset(
            profile,
            resolveVfxParticleVerticalOffset(profile, cycle, linearOffset),
            particleAgeSeconds
          );
        applyVfxParticleWindOffset(mesh, profile, index, elapsed);
        if (mesh.parent) {
          localCameraPosition.copy(camera.position);
          mesh.parent.worldToLocal(localCameraPosition);
          const lookX = localCameraPosition.x - mesh.position.x;
          const lookZ = localCameraPosition.z - mesh.position.z;
          if (lookX * lookX + lookZ * lookZ > 1e-10) {
            mesh.rotation.set(
              0,
              Math.atan2(lookX, lookZ),
              hasAuroraParticleRotationRateSource(profile)
                ? resolveVfxParticleRotationAtElapsed(profile, 0, elapsed)
                : 0
            );
          }
        }
        const particleSize = resolveVfxParticleSizeAtAge(profile, baseWidth, cycle, elapsed);
        const particleScale = particleSize / Math.max(0.001, baseWidth);
        const particleSizeY = resolveVfxParticleSizeYAtAge(profile, baseHeight, cycle, elapsed);
        const particleScaleY = particleSizeY / Math.max(0.001, baseHeight);
        applyAuroraParticleSoftnessState(
          material,
          mesh.geometry,
          profile,
          auroraRenderMode,
          particleSize,
          particleSizeY
        );
        const suppressProceduralModulation = shouldSuppressProceduralParticleModulation(profile);
        mesh.scale.set(
          particleScale * (suppressProceduralModulation ? 1 : 0.96 + wave * 0.08),
          particleScaleY *
            (suppressProceduralModulation ? 1 : 0.94 + (1 - wave) * 0.1) *
            resolveVfxParticleBlurStretch(profile),
          1
        );
        applyVfxParticleColorAtAge(material, vfxColor, profile, cycle, elapsed, mesh.geometry);
        applyVfxParticleOpacity(
          material,
          mesh.geometry,
          resolveVfxParticleOpacity(
            profile,
            cycle,
            profile.motionMode === "single"
              ? profile.baseOpacity
              : suppressProceduralModulation
                ? profile.baseOpacity
              : Math.max(0.05, profile.baseOpacity * (1 - cycle * 0.48)),
            elapsed
          )
        );
      };
      group.add(mesh);
    }

    return attachAuroraEmitterTransformTimelineSampler(
      group,
      auroraTransform,
      objectRadius,
      nowBaseMs
    );
  }

  if (profile.layout === "linked_billboard") {
    const segmentCount = Math.max(0, profile.count - 1);
    const linkedSegmentBatchSlots: Array<
      THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>
    > = [];
    const resolveLinkedPointConfig = (pointIndex: number) => {
      const phase = (pointIndex / Math.max(1, profile.count)) * Math.PI * 2;
      const radial = 0.18 + ((pointIndex * 977) % 1000) / 1000;
      const radius = radial * profile.radius * (isBeam ? 0.66 : 1);
      const surfaceOffset = resolveVfxSurfaceSpawnOffset(profile, pointIndex, phase, radius);
      return {
        pointIndex,
        phase,
        baseX: surfaceOffset.x,
        baseZ: surfaceOffset.z,
        driftPhase: phase * 1.37,
        speed:
          (isSpark ? 0.48 : 0.24) +
          (((pointIndex * 571) % 1000) / 1000) * (isSpark ? 1.12 : 0.78)
      };
    };
    const resolveLinkedPointPosition = (
      config: ReturnType<typeof resolveLinkedPointConfig>,
      elapsed: number,
      cycle: number
    ): THREE.Vector3 => {
      const origin = new THREE.Vector3(config.baseX, profile.baseLift, config.baseZ);
      const kinematicOffset = resolveAuroraKinematicOffset(
        profile,
        config.pointIndex,
        config.phase,
        cycle,
        origin,
        resolveVfxParticleAgeSeconds(cycle, profile.lifeSeconds)
      );
      if (kinematicOffset) {
        return addVfxParticleWindOffset(
          new THREE.Vector3(
            config.baseX + kinematicOffset.x,
            profile.baseLift + kinematicOffset.y,
            config.baseZ + kinematicOffset.z
          ),
          profile,
          config.pointIndex,
          elapsed
        );
      }
      const motionDirection = resolveVfxParticleMotionDirection(
        profile,
        config.phase,
        objectRadius
      );
      const driftWave = elapsed * (1.1 + config.speed) + config.driftPhase;
      const driftScale = resolveVfxParticleDriftScale(profile);
      const travelDistance =
        profile.motionMode === "single"
          ? 0
          : profile.motionMode === "explosion"
            ? profile.height * cycle * 1.15
            : profile.height * cycle;
      const driftX = Math.cos(driftWave) * profile.drift * 0.2 * driftScale;
      const driftZ = Math.sin(driftWave) * profile.drift * 0.2 * driftScale;
      return addVfxParticleWindOffset(
        new THREE.Vector3(
          config.baseX + motionDirection.x * travelDistance + driftX,
          profile.baseLift +
            resolveAuroraBouncedVerticalOffset(
              profile,
              resolveVfxParticleVerticalOffset(
                profile,
                cycle,
                motionDirection.y * travelDistance
              ),
              resolveVfxParticleAgeSeconds(cycle, profile.lifeSeconds)
            ),
          config.baseZ + motionDirection.z * travelDistance + driftZ
        ),
        profile,
        config.pointIndex,
        elapsed
      );
    };

    for (let index = 0; index < segmentCount; index += 1) {
      const startConfig = resolveLinkedPointConfig(index);
      const endConfig = resolveLinkedPointConfig(index + 1);
      const baseWidth =
        profile.sizeMin + (((index * 349) % 1000) / 1000) * (profile.sizeMax - profile.sizeMin);
      const geometry = createAuroraTexturedParticleQuadGeometry(1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: vfxColor,
        transparent: auroraMaterialBlendState.transparent,
        opacity: resolveInitialVfxParticleOpacity(
          profile,
          particleTexture,
          index,
          startConfig.phase,
          startConfig.speed
        ),
        depthWrite: auroraMaterialBlendState.depthWrite,
        depthTest: true,
        alphaTest: auroraMaterialBlendState.alphaTest,
        side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
        blending: auroraMaterialBlendState.blending
      });
      material.userData = {
        ...material.userData,
        auroraSharedTexture: particleTexture ? true : false,
        auroraBaseOpacity: profile.baseOpacity,
        auroraEmitterAtlas: auroraAtlas,
        auroraEmitterBlendMode: auroraEmitter?.blendMode,
        auroraEmitterAdditivePreview: profile.additive,
        auroraVfxGeneratedMaterial: true,
        vfxTextureDeliveryUrl: textureDeliveryUrl
      };
      applyAuroraEmitterTextureSideAdapter(material, auroraEmitter);
      applyAuroraEmitterMaterialBlendState(material, auroraMaterialBlendState, auroraEmitter);
      applyAuroraEmitterTextureTintAdapter(material, auroraEmitter);
      applyPlaceableVfxPreviewColorAdapter(material, payload, emitterColorHex, auroraEmitter);
      if (resolvedParticleTexture) {
        setVfxMaterialTexture(
          material,
          resolvedParticleTexture,
          vfxColor,
          auroraAtlas ? { atlas: auroraAtlas, frameSeed: index, nowBaseMs } : null
        );
      }

      const mesh = new THREE.Mesh(geometry, material);
      updateVfxMaterialAtlasFrame(material, 0, geometry);
      applyVfxParticleColorAtAge(material, vfxColor, profile, 0, 0, geometry);
      applyVfxParticleOpacity(material, geometry, material.opacity);
      applyAuroraParticleSoftnessState(
        material,
        geometry,
        profile,
        auroraRenderMode,
        baseWidth,
        baseWidth
      );
      mesh.userData = {
        ...mesh.userData,
        vfxPreviewKind: profile.kind,
        vfxPreviewLayout: profile.layout,
        vfxPreviewRole: "linked-particle-segment",
        auroraEmitterLinkedSegmentIndex: index,
        auroraEmitterLinkedSegmentPreviewMode: "active-list-adjacent-particle-pair",
        auroraEmitterLinkedSegmentEndpointMode: "active-current-next-particle",
        auroraEmitterLinkedActiveIndexA: index,
        auroraEmitterLinkedActiveIndexB: index + 1
      };
      applyAuroraEmitterRenderOrderAdapter(mesh, auroraEmitter);
      applyTexturedParticleDrawRecord(mesh, geometry, material);
      if (segmentCount > 0) {
        mesh.visible = false;
        mesh.userData = {
          ...mesh.userData,
          auroraParticleSlotPreviewMode:
            "hidden-linked-segment-slot-for-contiguous-batch",
          auroraParticleRenderedByBatch: true
        };
        linkedSegmentBatchSlots.push(
          mesh as THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>
        );
      }
      mesh.onBeforeRender = (_renderer, _scene, camera) => {
        if (!material.map) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-no-texture");
          return;
        }
        const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsed = (nowMs - nowBaseMs) * 0.001;
        const startSchedule = resolveVfxParticleSchedule(
          profile,
          index,
          elapsed,
          startConfig.phase,
          startConfig.speed
        );
        const endSchedule = resolveVfxParticleSchedule(
          profile,
          index + 1,
          elapsed,
          endConfig.phase,
          endConfig.speed
        );
        if (!startSchedule.visible || !endSchedule.visible) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-linked-endpoint");
          return;
        }
        const startPosition = resolveLinkedPointPosition(
          startConfig,
          elapsed,
          startSchedule.normalizedAge
        );
        const endPosition = resolveLinkedPointPosition(
          endConfig,
          elapsed,
          endSchedule.normalizedAge
        );
        const cycle = (startSchedule.normalizedAge + endSchedule.normalizedAge) * 0.5;
        const particleAgeSeconds =
          typeof startSchedule.ageSeconds === "number" && typeof endSchedule.ageSeconds === "number"
            ? (startSchedule.ageSeconds + endSchedule.ageSeconds) * 0.5
            : resolveVfxParticleAgeSeconds(cycle, profile.lifeSeconds);
        updateVfxMaterialAtlasFrame(material, particleAgeSeconds, mesh.geometry);
        applyVfxParticleColorAtAge(material, vfxColor, profile, cycle, elapsed, mesh.geometry);
        const particleWidth = resolveVfxParticleSizeAtAge(profile, baseWidth, cycle, elapsed);
        const segmentLength = updateAuroraEndpointPairQuadGeometry(
          mesh,
          startPosition,
          endPosition,
          camera,
          particleWidth,
          "aurora-linked-current-next-endpoint-vertex-buffer"
        );
        if (segmentLength <= 1e-6) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-degenerate-segment");
          return;
        }
        applyAuroraParticleSoftnessState(
          material,
          mesh.geometry,
          profile,
          auroraRenderMode,
          particleWidth,
          particleWidth
        );
        applyVfxParticleOpacity(
          material,
          mesh.geometry,
          resolveVfxParticleOpacity(
            profile,
            cycle,
            Math.max(0.04, profile.baseOpacity * (1 - cycle * 0.42)),
            elapsed
          )
        );
      };
      group.add(mesh);
    }

    if (linkedSegmentBatchSlots.length > 0) {
      const batchGeometry = createAuroraTexturedParticleBatchGeometry(
        auroraParticleDrawRecord
      );
      const batchMaterial = new THREE.MeshBasicMaterial({
        color: AURORA_UNTINTED_TEXTURE_COLOR,
        transparent: auroraMaterialBlendState.transparent,
        opacity: 1,
        depthWrite: auroraMaterialBlendState.depthWrite,
        depthTest: true,
        alphaTest: auroraMaterialBlendState.alphaTest,
        side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
        blending: auroraMaterialBlendState.blending,
        vertexColors: true
      });
      batchMaterial.userData = {
        ...batchMaterial.userData,
        auroraSharedTexture: particleTexture ? true : false,
        auroraBaseOpacity: profile.baseOpacity,
        auroraEmitterAtlas: auroraAtlas,
        auroraEmitterBlendMode: auroraEmitter?.blendMode,
        auroraEmitterAdditivePreview: profile.additive,
        auroraVfxGeneratedMaterial: true,
        auroraParticleBatchMaterial: true,
        vfxTextureDeliveryUrl: textureDeliveryUrl
      };
      applyAuroraEmitterTextureSideAdapter(batchMaterial, auroraEmitter);
      applyAuroraEmitterMaterialBlendState(batchMaterial, auroraMaterialBlendState, auroraEmitter);
      applyAuroraEmitterTextureTintAdapter(batchMaterial, auroraEmitter);
      applyPlaceableVfxPreviewColorAdapter(batchMaterial, payload, emitterColorHex, auroraEmitter);
      if (resolvedParticleTexture) {
        setVfxMaterialTexture(
          batchMaterial,
          resolvedParticleTexture,
          vfxColor,
          auroraAtlas ? { atlas: auroraAtlas, frameSeed: 0, nowBaseMs } : null
        );
        batchMaterial.vertexColors = true;
        batchMaterial.color.copy(AURORA_UNTINTED_TEXTURE_COLOR);
        batchMaterial.needsUpdate = true;
      }
      const batchMesh = new THREE.Mesh(batchGeometry, batchMaterial);
      batchMesh.frustumCulled = false;
      batchMesh.userData = {
        ...batchMesh.userData,
        vfxPreviewKind: profile.kind,
        vfxPreviewLayout: profile.layout,
        vfxPreviewRole: "linked-particle-segment-batch",
        auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list",
        auroraParticleBatchRendererPreviewMode:
          "aurora-linked-contiguous-segment-vertex-buffer",
        auroraParticleBatchSourceSlotPreviewMode:
          "hidden-linked-segment-slot-for-contiguous-batch",
        auroraThreeSpriteAdapter: false
      };
      applyAuroraEmitterRenderOrderAdapter(batchMesh, auroraEmitter);
      applyTexturedParticleDrawRecord(batchMesh, batchGeometry, batchMaterial);
      batchMesh.onBeforeRender = (renderer, scene, camera) => {
        const firstSlotMaterial = linkedSegmentBatchSlots
          .map((slot) => (Array.isArray(slot.material) ? slot.material[0] : slot.material))
          .find(
            (slotMaterial): slotMaterial is PlaceableVfxPreviewMaterial =>
              slotMaterial instanceof THREE.MeshBasicMaterial &&
              Boolean(slotMaterial.map)
          );
        if (!batchMaterial.map && firstSlotMaterial?.map) {
          batchMaterial.map = firstSlotMaterial.map;
          batchMaterial.alphaMap = firstSlotMaterial.alphaMap;
          batchMaterial.needsUpdate = true;
        }
        if (!batchMaterial.map) {
          for (let index = 0; index < auroraParticleDrawRecord.drawParticleCount; index += 1) {
            hideAuroraParticleInBatchGeometry(batchGeometry, index);
          }
          batchMesh.userData = {
            ...batchMesh.userData,
            auroraParticleBatchVisibleCount: 0,
            auroraParticleBatchHiddenPreviewMode: "hidden-no-texture"
          };
        } else {
          let visibleCount = 0;
          linkedSegmentBatchSlots.forEach((slot, slotIndex) => {
            const slotMaterial = Array.isArray(slot.material) ? slot.material[0] : slot.material;
            if (
              !(slotMaterial instanceof THREE.MeshBasicMaterial) &&
              !(slotMaterial instanceof THREE.SpriteMaterial)
            ) {
              hideAuroraParticleInBatchGeometry(batchGeometry, slotIndex);
              return;
            }
            slot.onBeforeRender(
              renderer,
              scene,
              camera,
              slot.geometry,
              slotMaterial,
              group
            );
            const didCopy = copyAuroraParticleSlotGeometryToBatchGeometry(
              slot,
              batchGeometry,
              slotIndex,
              batchMesh.parent
            );
            if (!didCopy) {
              hideAuroraParticleInBatchGeometry(batchGeometry, slotIndex);
              return;
            }
            if (slotMaterial.opacity > 0) {
              visibleCount += 1;
            }
          });
          batchMesh.userData = {
            ...batchMesh.userData,
            auroraParticleBatchVisibleCount: visibleCount,
            auroraParticleBatchCopiedSlotCount: linkedSegmentBatchSlots.length,
            auroraParticleBatchUpdatePreviewMode:
              "linked-slot-simulated-contiguous-vertex-buffer-copy"
          };
        }
        const position = batchGeometry.getAttribute("position");
        const uv = batchGeometry.getAttribute("uv");
        const color = batchGeometry.getAttribute("color");
        const alpha = batchGeometry.getAttribute("auroraAlpha");
        if (position instanceof THREE.BufferAttribute) {
          position.needsUpdate = true;
        }
        if (uv instanceof THREE.BufferAttribute) {
          uv.needsUpdate = true;
        }
        if (color instanceof THREE.BufferAttribute) {
          color.needsUpdate = true;
        }
        if (alpha instanceof THREE.BufferAttribute) {
          alpha.needsUpdate = true;
        }
        batchGeometry.computeBoundingSphere();
      };
      group.userData = {
        ...group.userData,
        auroraParticleBatchRendererPreviewMode:
          "aurora-linked-contiguous-segment-vertex-buffer",
        auroraParticleBatchSourceSlotPreviewMode:
          "hidden-linked-segment-slot-for-contiguous-batch",
        auroraParticleBatchSlotCount: linkedSegmentBatchSlots.length,
        auroraParticleBatchVisibleMeshRole: "linked-particle-segment-batch"
      };
      group.add(batchMesh);
    }

    return attachAuroraEmitterTransformTimelineSampler(
      group,
      auroraTransform,
      objectRadius,
      nowBaseMs
    );
  }

  if (profile.layout === "motion_blur") {
    const motionBlurLengthSeconds = Math.max(0.001, profile.blurLengthSource ?? 1);
    const motionBlurBatchSlots: Array<
      THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>
    > = [];
    for (let index = 0; index < profile.count; index += 1) {
      const phase = (index / profile.count) * Math.PI * 2;
      const radial = 0.2 + ((index * 977) % 1000) / 1000;
      const radius = radial * profile.radius;
      const surfaceOffset = resolveVfxSurfaceSpawnOffset(profile, index, phase, radius);
      const baseX = surfaceOffset.x;
      const baseZ = surfaceOffset.z;
      const driftPhase = phase * 1.47;
      const speed = 0.28 + (((index * 571) % 1000) / 1000) * 0.82;
      const baseSize =
        profile.sizeMin + (((index * 349) % 1000) / 1000) * (profile.sizeMax - profile.sizeMin);
      const geometry = createAuroraTexturedParticleQuadGeometry(1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: vfxColor,
        transparent: auroraMaterialBlendState.transparent,
        opacity: resolveInitialVfxParticleOpacity(profile, particleTexture, index, phase, speed),
        depthWrite: auroraMaterialBlendState.depthWrite,
        depthTest: true,
        alphaTest: auroraMaterialBlendState.alphaTest,
        side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
        blending: auroraMaterialBlendState.blending
      });
      material.userData = {
        ...material.userData,
        auroraSharedTexture: particleTexture ? true : false,
        auroraBaseOpacity: profile.baseOpacity,
        auroraEmitterAtlas: auroraAtlas,
        auroraEmitterBlendMode: auroraEmitter?.blendMode,
        auroraEmitterAdditivePreview: profile.additive,
        auroraVfxGeneratedMaterial: true,
        vfxTextureDeliveryUrl: textureDeliveryUrl
      };
      applyAuroraEmitterTextureSideAdapter(material, auroraEmitter);
      applyAuroraEmitterMaterialBlendState(material, auroraMaterialBlendState, auroraEmitter);
      applyAuroraEmitterTextureTintAdapter(material, auroraEmitter);
      applyPlaceableVfxPreviewColorAdapter(material, payload, emitterColorHex, auroraEmitter);
      if (resolvedParticleTexture) {
        setVfxMaterialTexture(
          material,
          resolvedParticleTexture,
          vfxColor,
          auroraAtlas ? { atlas: auroraAtlas, frameSeed: index, nowBaseMs } : null
        );
      }

      const mesh = new THREE.Mesh(geometry, material);
      applyAuroraParticleAlignedTextureSidePreviewAdapter(material, auroraEmitter);
      updateVfxMaterialAtlasFrame(material, 0, geometry);
      applyVfxParticleColorAtAge(material, vfxColor, profile, 0, 0, geometry);
      applyVfxParticleOpacity(material, geometry, material.opacity);
      applyAuroraParticleSoftnessState(
        material,
        geometry,
        profile,
        auroraRenderMode,
        baseSize * 2,
        baseSize
      );
      const motionDirection = hasAuroraKinematicMotion(profile)
        ? resolveAuroraKinematicDirection(profile, index, phase)
        : resolveVfxParticleMotionDirection(profile, phase, objectRadius);
      mesh.position.set(baseX, profile.baseLift, baseZ);
      mesh.userData = {
        ...mesh.userData,
        vfxPreviewKind: profile.kind,
        vfxPreviewLayout: profile.layout,
        vfxPreviewRole: "motion-blur-endpoint-particle",
        auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list",
        auroraEmitterMotionBlurEndpointMode: "previous-current-particle-positions",
        auroraEmitterMotionBlurBlurLengthSeconds: motionBlurLengthSeconds,
        auroraEmitterMotionBlurPreviousPositionSource: "runtime-previous-position-slot-preview"
      };
      applyAuroraEmitterRenderOrderAdapter(mesh, auroraEmitter);
      applyTexturedParticleDrawRecord(mesh, geometry, material);
      if (profile.count > 0) {
        mesh.visible = false;
        mesh.userData = {
          ...mesh.userData,
          auroraParticleSlotPreviewMode:
            "hidden-motion-blur-slot-for-contiguous-batch",
          auroraParticleRenderedByBatch: true
        };
        motionBlurBatchSlots.push(
          mesh as THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>
        );
      }

      const previousPositionState = new THREE.Vector3(baseX, profile.baseLift, baseZ);
      let previousElapsedSeconds = 0;
      let hasPreviousPosition = false;
      const resolveMotionBlurPositionAt = (
        cycle: number,
        particleAgeSeconds: number,
        elapsed: number
      ): THREE.Vector3 => {
        const origin = new THREE.Vector3(baseX, profile.baseLift, baseZ);
        const kinematicOffset = resolveAuroraKinematicOffset(
          profile,
          index,
          phase,
          cycle,
          origin,
          particleAgeSeconds
        );
        if (kinematicOffset) {
          return addVfxParticleWindOffset(
            new THREE.Vector3(
              baseX + kinematicOffset.x,
              profile.baseLift + kinematicOffset.y,
              baseZ + kinematicOffset.z
            ),
            profile,
            index,
            elapsed
          );
        }

        const driftWave = elapsed * (1.1 + speed) + driftPhase;
        const driftScale = resolveVfxParticleDriftScale(profile);
        const travelDistance =
          profile.motionMode === "single"
            ? 0
            : profile.motionMode === "explosion"
              ? profile.height * cycle * 1.15
              : profile.height * cycle;
        const driftX = Math.cos(driftWave) * profile.drift * 0.28 * driftScale;
        const driftZ = Math.sin(driftWave) * profile.drift * 0.28 * driftScale;
        return addVfxParticleWindOffset(
          new THREE.Vector3(
            baseX + motionDirection.x * travelDistance + driftX,
            profile.baseLift +
              resolveAuroraBouncedVerticalOffset(
                profile,
                resolveVfxParticleVerticalOffset(
                  profile,
                  cycle,
                  motionDirection.y * travelDistance
                ),
                particleAgeSeconds
              ),
            baseZ + motionDirection.z * travelDistance + driftZ
          ),
          profile,
          index,
          elapsed
        );
      };

      mesh.onBeforeRender = (_renderer, _scene, camera) => {
        if (!material.map) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-no-texture");
          return;
        }
        const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsed = (nowMs - nowBaseMs) * 0.001;
        const schedule = resolveVfxParticleSchedule(profile, index, elapsed, phase, speed);
        if (!schedule.visible) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-schedule");
          return;
        }
        const cycle = schedule.normalizedAge;
        const particleAgeSeconds =
          schedule.ageSeconds ??
          resolveVfxParticleAgeSeconds(cycle, profile.lifeSeconds) ??
          clampNumber(cycle, 0, 1) * Math.max(profile.lifeSeconds ?? motionBlurLengthSeconds, 0.001);
        const evaluatedMotionBlurLengthSeconds = resolveAuroraMotionBlurLengthSecondsAtElapsed(
          profile,
          particleAgeSeconds
        );
        updateVfxMaterialAtlasFrame(material, particleAgeSeconds, mesh.geometry);
        const currentPosition = resolveMotionBlurPositionAt(
          cycle,
          particleAgeSeconds,
          elapsed
        );
        let previousBlendRatio = 0;
        let motionBlurDeltaSeconds = 0;
        if (!hasPreviousPosition) {
          const previousAgeSeconds = Math.max(
            0,
            particleAgeSeconds -
              Math.min(evaluatedMotionBlurLengthSeconds, particleAgeSeconds)
          );
          const lifeSeconds = Math.max(profile.lifeSeconds ?? 1, 0.001);
          previousPositionState.copy(
            resolveMotionBlurPositionAt(
              clampNumber(previousAgeSeconds / lifeSeconds, 0, 1),
              previousAgeSeconds,
              Math.max(0, elapsed - evaluatedMotionBlurLengthSeconds)
            )
          );
          hasPreviousPosition = true;
        } else {
          const deltaSeconds = Math.max(0, elapsed - previousElapsedSeconds);
          motionBlurDeltaSeconds = deltaSeconds;
          previousBlendRatio = clampNumber(
            Math.min(deltaSeconds, evaluatedMotionBlurLengthSeconds) /
              evaluatedMotionBlurLengthSeconds,
            0,
            1
          );
          previousPositionState.lerp(currentPosition, previousBlendRatio);
        }
        previousElapsedSeconds = elapsed;
        const previousPosition = previousPositionState.clone();
        const particleWidth = resolveVfxParticleSizeAtAge(profile, baseSize, cycle, elapsed);
        const doubledParticleWidth = particleWidth * 2;
        const segmentLength = updateAuroraEndpointPairQuadGeometry(
          mesh,
          previousPosition,
          currentPosition,
          camera,
          doubledParticleWidth,
          "aurora-motion-blur-previous-current-endpoint-vertex-buffer"
        );
        if (segmentLength <= 1e-6) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-degenerate-motion-blur");
          return;
        }
        applyAuroraParticleSoftnessState(
          material,
          mesh.geometry,
          profile,
          auroraRenderMode,
          doubledParticleWidth,
          particleWidth
        );
        if (applyAuroraP2PThresholdCullToMesh(mesh, material, profile, particleAgeSeconds)) {
          return;
        }
        if (applyAuroraDeadspaceCullToMesh(mesh, material, profile, motionDirection, camera)) {
          return;
        }
        applyVfxParticleColorAtAge(material, vfxColor, profile, cycle, elapsed, mesh.geometry);
        mesh.userData = {
          ...mesh.userData,
          auroraEmitterMotionBlurPreviousPosition: [
            previousPosition.x,
            previousPosition.y,
            previousPosition.z
          ],
          auroraEmitterMotionBlurCurrentPosition: [
            currentPosition.x,
            currentPosition.y,
            currentPosition.z
          ],
          auroraEmitterMotionBlurEndpointDistance: segmentLength,
          auroraEmitterMotionBlurPreviousBlendRatio: previousBlendRatio,
          auroraEmitterMotionBlurPreviousBlendRatioFormula:
            "min(delta, blurlength) / blurlength",
          auroraEmitterMotionBlurDeltaSeconds: motionBlurDeltaSeconds,
          auroraEmitterMotionBlurEvaluatedBlurLengthSeconds:
            evaluatedMotionBlurLengthSeconds
        };
        const particleOpacity = resolveVfxParticleOpacity(
          profile,
          cycle,
          Math.max(0.04, profile.baseOpacity * Math.max(0.08, 1 - cycle * 0.72)),
          elapsed
        );
        applyVfxParticleOpacity(
          material,
          mesh.geometry,
          particleOpacity
        );
        applyAuroraMotionBlurEndpointAlphaToGeometry(
          mesh.geometry,
          typeof mesh.geometry.userData.auroraVfxParticleVertexAlpha === "number"
            ? mesh.geometry.userData.auroraVfxParticleVertexAlpha
            : material.opacity,
          resolveAuroraMotionBlurPreviousEndpointAlphaScale(
            segmentLength,
            doubledParticleWidth
          )
        );
      };
      group.add(mesh);
    }

    if (motionBlurBatchSlots.length > 0) {
      const batchGeometry = createAuroraTexturedParticleBatchGeometry(
        auroraParticleDrawRecord
      );
      const batchMaterial = new THREE.MeshBasicMaterial({
        color: AURORA_UNTINTED_TEXTURE_COLOR,
        transparent: auroraMaterialBlendState.transparent,
        opacity: 1,
        depthWrite: auroraMaterialBlendState.depthWrite,
        depthTest: true,
        alphaTest: auroraMaterialBlendState.alphaTest,
        side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
        blending: auroraMaterialBlendState.blending,
        vertexColors: true
      });
      batchMaterial.userData = {
        ...batchMaterial.userData,
        auroraSharedTexture: particleTexture ? true : false,
        auroraBaseOpacity: profile.baseOpacity,
        auroraEmitterAtlas: auroraAtlas,
        auroraEmitterBlendMode: auroraEmitter?.blendMode,
        auroraEmitterAdditivePreview: profile.additive,
        auroraVfxGeneratedMaterial: true,
        auroraParticleBatchMaterial: true,
        vfxTextureDeliveryUrl: textureDeliveryUrl
      };
      applyAuroraEmitterTextureSideAdapter(batchMaterial, auroraEmitter);
      applyAuroraEmitterMaterialBlendState(batchMaterial, auroraMaterialBlendState, auroraEmitter);
      applyAuroraEmitterTextureTintAdapter(batchMaterial, auroraEmitter);
      applyAuroraParticleAlignedTextureSidePreviewAdapter(batchMaterial, auroraEmitter);
      applyPlaceableVfxPreviewColorAdapter(batchMaterial, payload, emitterColorHex, auroraEmitter);
      if (resolvedParticleTexture) {
        setVfxMaterialTexture(
          batchMaterial,
          resolvedParticleTexture,
          vfxColor,
          auroraAtlas ? { atlas: auroraAtlas, frameSeed: 0, nowBaseMs } : null
        );
        batchMaterial.vertexColors = true;
        batchMaterial.color.copy(AURORA_UNTINTED_TEXTURE_COLOR);
        batchMaterial.needsUpdate = true;
      }
      const batchMesh = new THREE.Mesh(batchGeometry, batchMaterial);
      batchMesh.frustumCulled = false;
      batchMesh.userData = {
        ...batchMesh.userData,
        vfxPreviewKind: profile.kind,
        vfxPreviewLayout: profile.layout,
        vfxPreviewRole: "motion-blur-endpoint-batch",
        auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list",
        auroraParticleBatchRendererPreviewMode:
          "aurora-motion-blur-contiguous-endpoint-vertex-buffer",
        auroraParticleBatchSourceSlotPreviewMode:
          "hidden-motion-blur-slot-for-contiguous-batch",
        auroraThreeSpriteAdapter: false
      };
      applyAuroraEmitterRenderOrderAdapter(batchMesh, auroraEmitter);
      applyTexturedParticleDrawRecord(batchMesh, batchGeometry, batchMaterial);
      batchMesh.onBeforeRender = (renderer, scene, camera) => {
        const firstSlotMaterial = motionBlurBatchSlots
          .map((slot) => (Array.isArray(slot.material) ? slot.material[0] : slot.material))
          .find(
            (slotMaterial): slotMaterial is PlaceableVfxPreviewMaterial =>
              slotMaterial instanceof THREE.MeshBasicMaterial &&
              Boolean(slotMaterial.map)
          );
        if (!batchMaterial.map && firstSlotMaterial?.map) {
          batchMaterial.map = firstSlotMaterial.map;
          batchMaterial.alphaMap = firstSlotMaterial.alphaMap;
          batchMaterial.needsUpdate = true;
        }
        if (!batchMaterial.map) {
          for (let index = 0; index < auroraParticleDrawRecord.drawParticleCount; index += 1) {
            hideAuroraParticleInBatchGeometry(batchGeometry, index);
          }
          batchMesh.userData = {
            ...batchMesh.userData,
            auroraParticleBatchVisibleCount: 0,
            auroraParticleBatchHiddenPreviewMode: "hidden-no-texture"
          };
        } else {
          let visibleCount = 0;
          motionBlurBatchSlots.forEach((slot, slotIndex) => {
            const slotMaterial = Array.isArray(slot.material) ? slot.material[0] : slot.material;
            if (
              !(slotMaterial instanceof THREE.MeshBasicMaterial) &&
              !(slotMaterial instanceof THREE.SpriteMaterial)
            ) {
              hideAuroraParticleInBatchGeometry(batchGeometry, slotIndex);
              return;
            }
            slot.onBeforeRender(
              renderer,
              scene,
              camera,
              slot.geometry,
              slotMaterial,
              group
            );
            const didCopy = copyAuroraParticleSlotGeometryToBatchGeometry(
              slot,
              batchGeometry,
              slotIndex,
              batchMesh.parent
            );
            if (!didCopy) {
              hideAuroraParticleInBatchGeometry(batchGeometry, slotIndex);
              return;
            }
            if (slotMaterial.opacity > 0) {
              visibleCount += 1;
            }
          });
          batchMesh.userData = {
            ...batchMesh.userData,
            auroraParticleBatchVisibleCount: visibleCount,
            auroraParticleBatchCopiedSlotCount: motionBlurBatchSlots.length,
            auroraParticleBatchUpdatePreviewMode:
              "motion-blur-slot-simulated-contiguous-vertex-buffer-copy"
          };
        }
        const position = batchGeometry.getAttribute("position");
        const uv = batchGeometry.getAttribute("uv");
        const color = batchGeometry.getAttribute("color");
        const alpha = batchGeometry.getAttribute("auroraAlpha");
        if (position instanceof THREE.BufferAttribute) {
          position.needsUpdate = true;
        }
        if (uv instanceof THREE.BufferAttribute) {
          uv.needsUpdate = true;
        }
        if (color instanceof THREE.BufferAttribute) {
          color.needsUpdate = true;
        }
        if (alpha instanceof THREE.BufferAttribute) {
          alpha.needsUpdate = true;
        }
        batchGeometry.computeBoundingSphere();
      };
      group.userData = {
        ...group.userData,
        auroraParticleBatchRendererPreviewMode:
          "aurora-motion-blur-contiguous-endpoint-vertex-buffer",
        auroraParticleBatchSourceSlotPreviewMode:
          "hidden-motion-blur-slot-for-contiguous-batch",
        auroraParticleBatchSlotCount: motionBlurBatchSlots.length,
        auroraParticleBatchVisibleMeshRole: "motion-blur-endpoint-batch"
      };
      group.add(batchMesh);
    }

    return attachAuroraEmitterTransformTimelineSampler(
      group,
      auroraTransform,
      objectRadius,
      nowBaseMs
    );
  }

  if (profile.layout === "particle_aligned") {
    const particleAlignedBatchSlots: Array<
      THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>
    > = [];
    for (let index = 0; index < profile.count; index += 1) {
      const phase = (index / profile.count) * Math.PI * 2;
      const radial = 0.2 + ((index * 977) % 1000) / 1000;
      const radius = radial * profile.radius;
      const surfaceOffset = resolveVfxSurfaceSpawnOffset(profile, index, phase, radius);
      const baseX = surfaceOffset.x;
      const baseZ = surfaceOffset.z;
      const driftPhase = phase * 1.47;
      const speed = 0.28 + (((index * 571) % 1000) / 1000) * 0.82;
      const baseSize =
        profile.sizeMin + (((index * 349) % 1000) / 1000) * (profile.sizeMax - profile.sizeMin);
      const baseHeight = Math.max(baseSize, baseSize * (profile.trailStretch ?? 1));
      const geometry = createAuroraTexturedParticleQuadGeometry(1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: vfxColor,
        transparent: auroraMaterialBlendState.transparent,
        opacity: resolveInitialVfxParticleOpacity(profile, particleTexture, index, phase, speed),
        depthWrite: auroraMaterialBlendState.depthWrite,
        depthTest: true,
        alphaTest: auroraMaterialBlendState.alphaTest,
        side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
        blending: auroraMaterialBlendState.blending
      });
      material.userData = {
        ...material.userData,
        auroraSharedTexture: particleTexture ? true : false,
        auroraBaseOpacity: profile.baseOpacity,
        auroraEmitterAtlas: auroraAtlas,
        auroraEmitterBlendMode: auroraEmitter?.blendMode,
        auroraEmitterAdditivePreview: profile.additive,
        auroraVfxGeneratedMaterial: true,
        vfxTextureDeliveryUrl: textureDeliveryUrl
      };
      applyAuroraEmitterTextureSideAdapter(material, auroraEmitter);
      applyAuroraEmitterMaterialBlendState(material, auroraMaterialBlendState, auroraEmitter);
      applyAuroraEmitterTextureTintAdapter(material, auroraEmitter);
      applyPlaceableVfxPreviewColorAdapter(material, payload, emitterColorHex, auroraEmitter);
      if (resolvedParticleTexture) {
        setVfxMaterialTexture(
          material,
          resolvedParticleTexture,
          vfxColor,
          auroraAtlas ? { atlas: auroraAtlas, frameSeed: index, nowBaseMs } : null
        );
      }

      const mesh = new THREE.Mesh(geometry, material);
      applyAuroraParticleAlignedTextureSidePreviewAdapter(material, auroraEmitter);
      updateVfxMaterialAtlasFrame(material, 0, geometry);
      applyVfxParticleColorAtAge(material, vfxColor, profile, 0, 0, geometry);
      applyVfxParticleOpacity(material, geometry, material.opacity);
      applyAuroraParticleSoftnessState(
        material,
        geometry,
        profile,
        auroraRenderMode,
        baseSize,
        baseHeight
      );
      const motionDirection = hasAuroraKinematicMotion(profile)
        ? resolveAuroraKinematicDirection(profile, index, phase)
        : resolveVfxParticleMotionDirection(profile, phase, objectRadius);
      mesh.position.set(baseX, profile.baseLift, baseZ);
      mesh.userData = {
        ...mesh.userData,
        vfxPreviewKind: profile.kind,
        vfxPreviewLayout: profile.layout,
        vfxPreviewRole: "particle-aligned-trail",
        auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list",
        auroraEmitterAlignedToParticleDirection: profile.alignToParticleDirection === true,
        auroraEmitterTrailStretch: profile.trailStretch
      };
      applyAuroraEmitterRenderOrderAdapter(mesh, auroraEmitter);
      applyTexturedParticleDrawRecord(mesh, geometry, material);
      if (profile.count > 0) {
        mesh.visible = false;
        mesh.userData = {
          ...mesh.userData,
          auroraParticleSlotPreviewMode:
            "hidden-particle-aligned-slot-for-contiguous-batch",
          auroraParticleRenderedByBatch: true
        };
        particleAlignedBatchSlots.push(
          mesh as THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>
        );
      }
      mesh.onBeforeRender = (_renderer, _scene, camera) => {
        if (!material.map) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-no-texture");
          return;
        }
        const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsed = (nowMs - nowBaseMs) * 0.001;
        const schedule = resolveVfxParticleSchedule(profile, index, elapsed, phase, speed);
        if (!schedule.visible) {
          applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-schedule");
          return;
        }
        const cycle = schedule.normalizedAge;
        const particleAgeSeconds =
          schedule.ageSeconds ?? resolveVfxParticleAgeSeconds(cycle, profile.lifeSeconds);
        updateVfxMaterialAtlasFrame(material, particleAgeSeconds, mesh.geometry);
        const kinematicOffset = resolveAuroraKinematicOffset(
          profile,
          index,
          phase,
          cycle,
          new THREE.Vector3(baseX, profile.baseLift, baseZ),
          particleAgeSeconds
        );
        if (kinematicOffset) {
          mesh.position.set(
            baseX + kinematicOffset.x,
            profile.baseLift + kinematicOffset.y,
            baseZ + kinematicOffset.z
          );
        } else {
          const driftWave = elapsed * (1.1 + speed) + driftPhase;
          const driftScale = resolveVfxParticleDriftScale(profile);
          const travelDistance =
            profile.motionMode === "single"
              ? 0
              : profile.motionMode === "explosion"
                ? profile.height * cycle * 1.15
                : profile.height * cycle;
          const driftX = Math.cos(driftWave) * profile.drift * 0.28 * driftScale;
          const driftZ = Math.sin(driftWave) * profile.drift * 0.28 * driftScale;
          mesh.position.x = baseX + motionDirection.x * travelDistance + driftX;
          mesh.position.z = baseZ + motionDirection.z * travelDistance + driftZ;
          mesh.position.y =
            profile.baseLift +
            resolveAuroraBouncedVerticalOffset(
              profile,
              resolveVfxParticleVerticalOffset(
                profile,
                cycle,
                motionDirection.y * travelDistance
              ),
              particleAgeSeconds
            );
        }
        applyVfxParticleWindOffset(mesh, profile, index, elapsed);
        if (applyAuroraP2PThresholdCullToMesh(mesh, material, profile, particleAgeSeconds)) {
          return;
        }
        if (applyAuroraDeadspaceCullToMesh(mesh, material, profile, motionDirection, camera)) {
          return;
        }
        orientVfxParticleAlignedMesh(mesh, motionDirection, camera);
        applyVfxParticleColorAtAge(material, vfxColor, profile, cycle, elapsed, mesh.geometry);
        const fallbackOpacity =
          profile.baseOpacity *
          (profile.motionMode === "trail" ? Math.max(0.08, 1 - cycle * 0.72) : 1);
        applyVfxParticleOpacity(
          material,
          mesh.geometry,
          resolveVfxParticleOpacity(profile, cycle, fallbackOpacity, elapsed)
        );
        const particleSizeX = resolveVfxParticleSizeAtAge(profile, baseSize, cycle, elapsed);
        const particleSizeY = resolveVfxParticleSizeYAtAge(profile, baseHeight, cycle, elapsed);
        applyAuroraParticleSoftnessState(
          material,
          mesh.geometry,
          profile,
          auroraRenderMode,
          particleSizeX,
          particleSizeY
        );
        mesh.scale.set(
          particleSizeX,
          particleSizeY * (profile.trailStretch ?? resolveVfxParticleBlurStretch(profile)),
          1
        );
      };
      group.add(mesh);
    }

    if (particleAlignedBatchSlots.length > 0) {
      const batchGeometry = createAuroraTexturedParticleBatchGeometry(
        auroraParticleDrawRecord
      );
      const batchMaterial = new THREE.MeshBasicMaterial({
        color: AURORA_UNTINTED_TEXTURE_COLOR,
        transparent: auroraMaterialBlendState.transparent,
        opacity: 1,
        depthWrite: auroraMaterialBlendState.depthWrite,
        depthTest: true,
        alphaTest: auroraMaterialBlendState.alphaTest,
        side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
        blending: auroraMaterialBlendState.blending,
        vertexColors: true
      });
      batchMaterial.userData = {
        ...batchMaterial.userData,
        auroraSharedTexture: particleTexture ? true : false,
        auroraBaseOpacity: profile.baseOpacity,
        auroraEmitterAtlas: auroraAtlas,
        auroraEmitterBlendMode: auroraEmitter?.blendMode,
        auroraEmitterAdditivePreview: profile.additive,
        auroraVfxGeneratedMaterial: true,
        auroraParticleBatchMaterial: true,
        vfxTextureDeliveryUrl: textureDeliveryUrl
      };
      applyAuroraEmitterTextureSideAdapter(batchMaterial, auroraEmitter);
      applyAuroraEmitterMaterialBlendState(batchMaterial, auroraMaterialBlendState, auroraEmitter);
      applyAuroraEmitterTextureTintAdapter(batchMaterial, auroraEmitter);
      applyAuroraParticleAlignedTextureSidePreviewAdapter(batchMaterial, auroraEmitter);
      applyPlaceableVfxPreviewColorAdapter(batchMaterial, payload, emitterColorHex, auroraEmitter);
      if (resolvedParticleTexture) {
        setVfxMaterialTexture(
          batchMaterial,
          resolvedParticleTexture,
          vfxColor,
          auroraAtlas ? { atlas: auroraAtlas, frameSeed: 0, nowBaseMs } : null
        );
        batchMaterial.vertexColors = true;
        batchMaterial.color.copy(AURORA_UNTINTED_TEXTURE_COLOR);
        batchMaterial.needsUpdate = true;
      }
      const batchMesh = new THREE.Mesh(batchGeometry, batchMaterial);
      batchMesh.frustumCulled = false;
      batchMesh.userData = {
        ...batchMesh.userData,
        vfxPreviewKind: profile.kind,
        vfxPreviewLayout: profile.layout,
        vfxPreviewRole: "particle-aligned-trail-batch",
        auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list",
        auroraParticleBatchRendererPreviewMode:
          "aurora-particle-aligned-contiguous-trail-vertex-buffer",
        auroraParticleBatchSourceSlotPreviewMode:
          "hidden-particle-aligned-slot-for-contiguous-batch",
        auroraThreeSpriteAdapter: false
      };
      applyAuroraEmitterRenderOrderAdapter(batchMesh, auroraEmitter);
      applyTexturedParticleDrawRecord(batchMesh, batchGeometry, batchMaterial);
      batchMesh.onBeforeRender = (renderer, scene, camera) => {
        const firstSlotMaterial = particleAlignedBatchSlots
          .map((slot) => (Array.isArray(slot.material) ? slot.material[0] : slot.material))
          .find(
            (slotMaterial): slotMaterial is PlaceableVfxPreviewMaterial =>
              slotMaterial instanceof THREE.MeshBasicMaterial &&
              Boolean(slotMaterial.map)
          );
        if (!batchMaterial.map && firstSlotMaterial?.map) {
          batchMaterial.map = firstSlotMaterial.map;
          batchMaterial.alphaMap = firstSlotMaterial.alphaMap;
          batchMaterial.needsUpdate = true;
        }
        if (!batchMaterial.map) {
          for (let index = 0; index < auroraParticleDrawRecord.drawParticleCount; index += 1) {
            hideAuroraParticleInBatchGeometry(batchGeometry, index);
          }
          batchMesh.userData = {
            ...batchMesh.userData,
            auroraParticleBatchVisibleCount: 0,
            auroraParticleBatchHiddenPreviewMode: "hidden-no-texture"
          };
        } else {
          let visibleCount = 0;
          particleAlignedBatchSlots.forEach((slot, slotIndex) => {
            const slotMaterial = Array.isArray(slot.material) ? slot.material[0] : slot.material;
            if (
              !(slotMaterial instanceof THREE.MeshBasicMaterial) &&
              !(slotMaterial instanceof THREE.SpriteMaterial)
            ) {
              hideAuroraParticleInBatchGeometry(batchGeometry, slotIndex);
              return;
            }
            slot.onBeforeRender(
              renderer,
              scene,
              camera,
              slot.geometry,
              slotMaterial,
              group
            );
            const didCopy = copyAuroraParticleSlotGeometryToBatchGeometry(
              slot,
              batchGeometry,
              slotIndex,
              batchMesh.parent
            );
            if (!didCopy) {
              hideAuroraParticleInBatchGeometry(batchGeometry, slotIndex);
              return;
            }
            if (slotMaterial.opacity > 0) {
              visibleCount += 1;
            }
          });
          batchMesh.userData = {
            ...batchMesh.userData,
            auroraParticleBatchVisibleCount: visibleCount,
            auroraParticleBatchCopiedSlotCount: particleAlignedBatchSlots.length,
            auroraParticleBatchUpdatePreviewMode:
              "particle-aligned-slot-simulated-contiguous-vertex-buffer-copy"
          };
        }
        const position = batchGeometry.getAttribute("position");
        const uv = batchGeometry.getAttribute("uv");
        const color = batchGeometry.getAttribute("color");
        const alpha = batchGeometry.getAttribute("auroraAlpha");
        if (position instanceof THREE.BufferAttribute) {
          position.needsUpdate = true;
        }
        if (uv instanceof THREE.BufferAttribute) {
          uv.needsUpdate = true;
        }
        if (color instanceof THREE.BufferAttribute) {
          color.needsUpdate = true;
        }
        if (alpha instanceof THREE.BufferAttribute) {
          alpha.needsUpdate = true;
        }
        batchGeometry.computeBoundingSphere();
      };
      group.userData = {
        ...group.userData,
        auroraParticleBatchRendererPreviewMode:
          "aurora-particle-aligned-contiguous-trail-vertex-buffer",
        auroraParticleBatchSourceSlotPreviewMode:
          "hidden-particle-aligned-slot-for-contiguous-batch",
        auroraParticleBatchSlotCount: particleAlignedBatchSlots.length,
        auroraParticleBatchVisibleMeshRole: "particle-aligned-trail-batch"
      };
      group.add(batchMesh);
    }

    return attachAuroraEmitterTransformTimelineSampler(
      group,
      auroraTransform,
      objectRadius,
      nowBaseMs
    );
  }

  const shouldUseAuroraCameraBillboardBatch =
    profile.layout === "camera_billboard" && profile.count > 0 && profile.splat !== true;
  const shouldDetachAuroraCameraBillboardBatchSlots =
    shouldUseAuroraCameraBillboardBatch &&
    profile.bubblePreviewMode === "source-bubble-particle-preview";
  const cameraBillboardBatchSlots: Array<
    THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>
  > = [];

  for (let index = 0; index < profile.count; index += 1) {
    const phase = (index / profile.count) * Math.PI * 2;
    const radial = 0.2 + ((index * 977) % 1000) / 1000;
    const radius = radial * profile.radius * (isBeam ? 0.66 : 1);
    const surfaceOffset = resolveVfxSurfaceSpawnOffset(profile, index, phase, radius);
    const baseX = surfaceOffset.x;
    const baseZ = surfaceOffset.z;
    const driftPhase = phase * 1.37;
    const speed =
      (isSpark ? 0.48 : 0.24) + (((index * 571) % 1000) / 1000) * (isSpark ? 1.12 : 0.78);
    const riseOffset = (((index * 839) % 1000) / 1000) * profile.height;
    const baseSize =
      profile.sizeMin + (((index * 349) % 1000) / 1000) * (profile.sizeMax - profile.sizeMin);

    const geometry = createAuroraTexturedParticleQuadGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: vfxColor,
      transparent: auroraMaterialBlendState.transparent,
      opacity: resolveInitialVfxParticleOpacity(profile, particleTexture, index, phase, speed),
      depthWrite: auroraMaterialBlendState.depthWrite,
      depthTest: true,
      alphaTest: auroraMaterialBlendState.alphaTest,
      side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
      blending: auroraMaterialBlendState.blending
    });
    material.userData = {
      ...material.userData,
      auroraSharedTexture: particleTexture ? true : false,
      auroraBaseOpacity: profile.baseOpacity,
      auroraEmitterAtlas: auroraAtlas,
      auroraEmitterBlendMode: auroraEmitter?.blendMode,
      auroraEmitterAdditivePreview: profile.additive,
      auroraVfxGeneratedMaterial: true,
      vfxTextureDeliveryUrl: textureDeliveryUrl
    };
    applyAuroraEmitterTextureSideAdapter(material, auroraEmitter);
    applyAuroraEmitterMaterialBlendState(material, auroraMaterialBlendState, auroraEmitter);
    applyAuroraEmitterTextureTintAdapter(material, auroraEmitter);
    applyPlaceableVfxPreviewColorAdapter(material, payload, emitterColorHex, auroraEmitter);
    if (resolvedParticleTexture) {
      setVfxMaterialTexture(
        material,
        resolvedParticleTexture,
        vfxColor,
        auroraAtlas ? { atlas: auroraAtlas, frameSeed: index, nowBaseMs } : null
      );
      applySurfaceEmitterVisibilityFallbackMaterial(material, profile);
    }
    const mesh = new THREE.Mesh(geometry, material);
    updateVfxMaterialAtlasFrame(material, 0, geometry);
    applyVfxParticleColorAtAge(material, vfxColor, profile, 0, 0, geometry);
    applyVfxParticleOpacity(material, geometry, material.opacity);
    const initialSize = resolveVfxParticleSizeAtAge(profile, baseSize, 0);
    const initialSizeY = resolveVfxParticleSizeYAtAge(profile, baseSize, 0);
    applyAuroraParticleSoftnessState(
      material,
      geometry,
      profile,
      auroraRenderMode,
      initialSize,
      initialSizeY
    );
    mesh.position.set(baseX, profile.baseLift + riseOffset, baseZ);
    mesh.scale.set(initialSize, initialSizeY, 1);
    mesh.userData = {
      ...mesh.userData,
      vfxPreviewKind: profile.kind,
      vfxPreviewLayout: profile.layout,
      vfxPreviewRole: "camera-billboard-particle",
      auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list",
      auroraThreeSpriteAdapter: false
    };
    applyAuroraEmitterRenderOrderAdapter(mesh, auroraEmitter);
    applyTexturedParticleDrawRecord(mesh, geometry, material);
    if (shouldUseAuroraCameraBillboardBatch) {
      mesh.visible = false;
      mesh.userData = {
        ...mesh.userData,
        auroraParticleSlotPreviewMode: "hidden-provenance-slot-for-contiguous-batch",
        auroraParticleRenderedByBatch: true
      };
      cameraBillboardBatchSlots.push(
        mesh as THREE.Mesh<THREE.BufferGeometry, PlaceableVfxPreviewMaterial>
      );
    }
    mesh.onBeforeRender = (_renderer, _scene, camera) => {
      if (!material.map) {
        applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-no-texture");
        return;
      }
      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = (nowMs - nowBaseMs) * 0.001;
      const schedule = resolveVfxParticleSchedule(profile, index, elapsed, phase, speed);
      if (!schedule.visible) {
        applyVfxParticleOpacity(material, mesh.geometry, 0, "hidden-schedule");
        return;
      }
      const cycle = schedule.normalizedAge;
      const particleAgeSeconds =
        schedule.ageSeconds ?? resolveVfxParticleAgeSeconds(cycle, profile.lifeSeconds);
      updateVfxMaterialAtlasFrame(material, particleAgeSeconds, mesh.geometry);
      const particleRoll = hasAuroraParticleRotationRateSource(profile)
        ? resolveVfxParticleRotationAtElapsed(profile, phase, elapsed)
        : 0;
      const suppressProceduralModulation = shouldSuppressProceduralParticleModulation(profile);
      const driftWave = elapsed * (1.2 + speed) + driftPhase;
      const driftScale = resolveVfxParticleDriftScale(profile);
      if (profile.motionMode === "single") {
        mesh.position.x = baseX;
        mesh.position.z = baseZ;
      } else if (profile.motionMode === "explosion") {
        const burstScale = 0.18 + cycle * 1.18;
        mesh.position.x =
          baseX * burstScale + Math.cos(phase) * profile.drift * cycle * driftScale;
        mesh.position.z =
          baseZ * burstScale + Math.sin(phase) * profile.drift * cycle * driftScale;
      } else if (profile.motionMode === "lightning") {
        mesh.position.x = baseX;
        mesh.position.z = baseZ;
      } else {
        mesh.position.x =
          baseX + Math.cos(driftWave) * profile.drift * (isBeam ? 0.58 : 1) * driftScale;
        mesh.position.z =
          baseZ + Math.sin(driftWave) * profile.drift * (isBeam ? 0.58 : 1) * driftScale;
      }
      const kinematicOffset = resolveAuroraKinematicOffset(
        profile,
        index,
        phase,
        cycle,
        new THREE.Vector3(baseX, profile.baseLift, baseZ),
        particleAgeSeconds
      );
      if (kinematicOffset) {
        mesh.position.set(
          baseX + kinematicOffset.x,
          profile.baseLift + kinematicOffset.y,
          baseZ + kinematicOffset.z
        );
      } else {
        const linearOffset =
          profile.height > 0 ? (riseOffset + cycle * profile.height) % profile.height : 0;
        const verticalOffset =
          profile.motionMode === "single"
            ? 0
            : profile.motionMode === "explosion"
              ? Math.sin(cycle * Math.PI) * profile.height
              : profile.motionMode === "lightning"
              ? profile.height * 0.5
              : linearOffset;
        mesh.position.y =
          profile.baseLift +
          resolveAuroraBouncedVerticalOffset(
            profile,
            resolveVfxParticleVerticalOffset(profile, cycle, verticalOffset),
            particleAgeSeconds
          );
      }
      applyVfxParticleWindOffset(mesh, profile, index, elapsed);
      const splatLanded = applyAuroraSplatFloorPlaneToMesh(mesh, profile, particleRoll);
      const splatLandedSizeState = splatLanded
        ? resolveAuroraSplatLandedParticleSizeState(profile, baseSize, elapsed)
        : null;
      if (applyAuroraP2PThresholdCullToMesh(mesh, material, profile, particleAgeSeconds)) {
        return;
      }
      if (!splatLanded) {
        orientVfxCameraBillboardMesh(mesh, camera, particleRoll);
      }
      applyVfxParticleColorAtAge(material, vfxColor, profile, cycle, elapsed, mesh.geometry);
      const sizeIsAuroraSourceDriven =
        profile.particleSizeSourcePreviewMode === "aurora-source-size-linear";
      if (isSpark) {
        const jitter = 0.6 + 0.4 * Math.sin(elapsed * 8 + phase * 3);
        applyVfxParticleOpacity(
          material,
          mesh.geometry,
          resolveVfxParticleOpacity(
            profile,
            cycle,
            suppressProceduralModulation
              ? profile.baseOpacity
              : Math.max(0.06, profile.baseOpacity * jitter),
            elapsed
          )
        );
        const interpolatedParticleSize = resolveVfxParticleSizeAtAge(
          profile,
          baseSize,
          cycle,
          elapsed
        );
        const interpolatedParticleSizeY = resolveVfxParticleSizeYAtAge(
          profile,
          baseSize,
          cycle,
          elapsed
        );
        const particleSize =
          splatLandedSizeState?.particleSizeX ?? interpolatedParticleSize;
        const particleSizeY =
          splatLandedSizeState?.particleSizeY ?? interpolatedParticleSizeY;
        applyAuroraParticleSoftnessState(
          material,
          mesh.geometry,
          profile,
          auroraRenderMode,
          particleSize,
          particleSizeY
        );
        const sparkScaleMultiplier =
          sizeIsAuroraSourceDriven || suppressProceduralModulation || splatLandedSizeState
            ? 1
            : 0.62 + jitter * 0.82;
        const scale = particleSize * sparkScaleMultiplier;
        const scaleY = particleSizeY * sparkScaleMultiplier;
        mesh.scale.set(scale, scaleY * resolveVfxParticleBlurStretch(profile), 1);
        if (splatLandedSizeState) {
          applyAuroraSplatLandedParticleSizeState(
            mesh,
            material,
            mesh.geometry,
            splatLandedSizeState,
            interpolatedParticleSize,
            interpolatedParticleSizeY
          );
        }
        return;
      }
      const alpha =
        profile.motionMode === "single" || suppressProceduralModulation
          ? profile.baseOpacity
          : profile.baseOpacity * (1 - cycle * (isBeam ? 0.52 : 0.72));
      applyVfxParticleOpacity(
        material,
        mesh.geometry,
        resolveVfxParticleOpacity(profile, cycle, Math.max(0.04, alpha), elapsed)
      );
      const interpolatedParticleSize = resolveVfxParticleSizeAtAge(
        profile,
        baseSize,
        cycle,
        elapsed
      );
      const interpolatedParticleSizeY = resolveVfxParticleSizeYAtAge(
        profile,
        baseSize,
        cycle,
        elapsed
      );
      const particleSize =
        splatLandedSizeState?.particleSizeX ?? interpolatedParticleSize;
      const particleSizeY =
        splatLandedSizeState?.particleSizeY ?? interpolatedParticleSizeY;
      applyAuroraParticleSoftnessState(
        material,
        mesh.geometry,
        profile,
        auroraRenderMode,
        particleSize,
        particleSizeY
      );
      const scale =
        sizeIsAuroraSourceDriven || suppressProceduralModulation || splatLandedSizeState
          ? particleSize
          : profile.motionMode === "single"
          ? particleSize
          : profile.motionMode === "explosion"
            ? particleSize * (0.45 + (1 - cycle) * 0.95)
            : particleSize * (isBeam ? 0.68 + cycle * 0.54 : 0.72 + cycle * 0.85);
      const scaleY =
        sizeIsAuroraSourceDriven || suppressProceduralModulation || splatLandedSizeState
          ? particleSizeY
          : profile.motionMode === "single"
          ? particleSizeY
          : profile.motionMode === "explosion"
            ? particleSizeY * (0.45 + (1 - cycle) * 0.95)
            : particleSizeY * (isBeam ? 0.68 + cycle * 0.54 : 0.72 + cycle * 0.85);
      mesh.scale.set(scale, scaleY * resolveVfxParticleBlurStretch(profile), 1);
      if (splatLandedSizeState) {
        applyAuroraSplatLandedParticleSizeState(
          mesh,
          material,
          mesh.geometry,
          splatLandedSizeState,
          interpolatedParticleSize,
          interpolatedParticleSizeY
        );
      }
    };
    if (!shouldDetachAuroraCameraBillboardBatchSlots) {
      group.add(mesh);
    }
  }

  if (shouldUseAuroraCameraBillboardBatch) {
    const batchGeometry = createAuroraTexturedParticleBatchGeometry(
      auroraParticleDrawRecord
    );
    const batchMaterial = new THREE.MeshBasicMaterial({
      color: AURORA_UNTINTED_TEXTURE_COLOR,
      transparent: auroraMaterialBlendState.transparent,
      opacity: 1,
      depthWrite: auroraMaterialBlendState.depthWrite,
      depthTest: true,
      alphaTest: auroraMaterialBlendState.alphaTest,
      side: resolveAuroraEmitterTextureMaterialSide(auroraEmitter),
      blending: auroraMaterialBlendState.blending,
      vertexColors: true
    });
    batchMaterial.userData = {
      ...batchMaterial.userData,
      auroraSharedTexture: particleTexture ? true : false,
      auroraBaseOpacity: profile.baseOpacity,
      auroraEmitterAtlas: auroraAtlas,
      auroraEmitterBlendMode: auroraEmitter?.blendMode,
      auroraEmitterAdditivePreview: profile.additive,
      auroraVfxGeneratedMaterial: true,
      auroraParticleBatchMaterial: true,
      vfxTextureDeliveryUrl: textureDeliveryUrl
    };
    applyAuroraEmitterTextureSideAdapter(batchMaterial, auroraEmitter);
    applyAuroraEmitterMaterialBlendState(batchMaterial, auroraMaterialBlendState, auroraEmitter);
    applyAuroraEmitterTextureTintAdapter(batchMaterial, auroraEmitter);
    applyPlaceableVfxPreviewColorAdapter(batchMaterial, payload, emitterColorHex, auroraEmitter);
    if (resolvedParticleTexture) {
      setVfxMaterialTexture(
        batchMaterial,
        resolvedParticleTexture,
        vfxColor,
        auroraAtlas ? { atlas: auroraAtlas, frameSeed: 0, nowBaseMs } : null
      );
      applySurfaceEmitterVisibilityFallbackMaterial(batchMaterial, profile);
      batchMaterial.vertexColors = true;
      batchMaterial.color.copy(AURORA_UNTINTED_TEXTURE_COLOR);
      batchMaterial.needsUpdate = true;
    }
    const batchMesh = new THREE.Mesh(batchGeometry, batchMaterial);
    batchMesh.frustumCulled = false;
    batchMesh.userData = {
      ...batchMesh.userData,
      vfxPreviewKind: profile.kind,
      vfxPreviewLayout: profile.layout,
      vfxPreviewRole: "camera-billboard-batch",
      auroraVfxDrawPrimitivePreview: "non-indexed-six-vertex-triangle-list",
      auroraParticleBatchRendererPreviewMode:
        "aurora-contiguous-particle-vertex-buffer",
      auroraParticleBatchSourceSlotPreviewMode:
        "hidden-provenance-slot-for-contiguous-batch",
      auroraThreeSpriteAdapter: false,
      ...(shouldDetachAuroraCameraBillboardBatchSlots
        ? {
            auroraParticleBatchDetachedSlotCount: cameraBillboardBatchSlots.length,
            auroraParticleBatchSceneSlotMeshCount: 0,
            auroraParticleBatchDetachedSlotPreviewMode:
              "detached-provenance-slots-not-scene-children"
          }
        : {})
    };
    applyAuroraEmitterRenderOrderAdapter(batchMesh, auroraEmitter);
    applyTexturedParticleDrawRecord(batchMesh, batchGeometry, batchMaterial);
    batchMesh.onBeforeRender = (renderer, scene, camera) => {
      const firstSlotMaterial = cameraBillboardBatchSlots
        .map((slot) => (Array.isArray(slot.material) ? slot.material[0] : slot.material))
        .find(
          (slotMaterial): slotMaterial is PlaceableVfxPreviewMaterial =>
            slotMaterial instanceof THREE.MeshBasicMaterial &&
            Boolean(slotMaterial.map)
        );
      if (!batchMaterial.map && firstSlotMaterial?.map) {
        batchMaterial.map = firstSlotMaterial.map;
        batchMaterial.alphaMap = firstSlotMaterial.alphaMap;
        batchMaterial.needsUpdate = true;
      }
      if (!batchMaterial.map) {
        for (let index = 0; index < auroraParticleDrawRecord.drawParticleCount; index += 1) {
          hideAuroraParticleInBatchGeometry(batchGeometry, index);
        }
        batchMesh.userData = {
          ...batchMesh.userData,
          auroraParticleBatchVisibleCount: 0,
          auroraParticleBatchHiddenPreviewMode: "hidden-no-texture"
        };
      } else {
        let visibleCount = 0;
        cameraBillboardBatchSlots.forEach((slot, slotIndex) => {
          const slotMaterial = Array.isArray(slot.material) ? slot.material[0] : slot.material;
          if (
            !(slotMaterial instanceof THREE.MeshBasicMaterial) &&
            !(slotMaterial instanceof THREE.SpriteMaterial)
          ) {
            hideAuroraParticleInBatchGeometry(batchGeometry, slotIndex);
            return;
          }
          slot.onBeforeRender(
            renderer,
            scene,
            camera,
            slot.geometry,
            slotMaterial,
            group
          );
          const didCopy = copyAuroraParticleSlotGeometryToBatchGeometry(
            slot,
            batchGeometry,
            slotIndex,
            batchMesh.parent,
            {
              slotTransformSpace: shouldDetachAuroraCameraBillboardBatchSlots
                ? "detached-parent-local"
                : "scene-child"
            }
          );
          if (!didCopy) {
            hideAuroraParticleInBatchGeometry(batchGeometry, slotIndex);
            return;
          }
          if (slotMaterial.opacity > 0) {
            visibleCount += 1;
          }
        });
        batchMesh.userData = {
          ...batchMesh.userData,
          auroraParticleBatchVisibleCount: visibleCount,
          auroraParticleBatchCopiedSlotCount: cameraBillboardBatchSlots.length,
          auroraParticleBatchUpdatePreviewMode: shouldDetachAuroraCameraBillboardBatchSlots
            ? "detached-slot-simulated-contiguous-vertex-buffer-copy"
            : "slot-simulated-contiguous-vertex-buffer-copy"
        };
      }
      const position = batchGeometry.getAttribute("position");
      const uv = batchGeometry.getAttribute("uv");
      const color = batchGeometry.getAttribute("color");
      const alpha = batchGeometry.getAttribute("auroraAlpha");
      if (position instanceof THREE.BufferAttribute) {
        position.needsUpdate = true;
      }
      if (uv instanceof THREE.BufferAttribute) {
        uv.needsUpdate = true;
      }
      if (color instanceof THREE.BufferAttribute) {
        color.needsUpdate = true;
      }
      if (alpha instanceof THREE.BufferAttribute) {
        alpha.needsUpdate = true;
      }
      batchGeometry.computeBoundingSphere();
    };
    group.userData = {
      ...group.userData,
      auroraParticleBatchRendererPreviewMode:
        "aurora-contiguous-particle-vertex-buffer",
      auroraParticleBatchSourceSlotPreviewMode:
        "hidden-provenance-slot-for-contiguous-batch",
      auroraParticleBatchSlotCount: cameraBillboardBatchSlots.length,
      auroraParticleBatchVisibleMeshRole: "camera-billboard-batch",
      ...(shouldDetachAuroraCameraBillboardBatchSlots
        ? {
            auroraParticleBatchDetachedSlotCount: cameraBillboardBatchSlots.length,
            auroraParticleBatchSceneSlotMeshCount: 0,
            auroraParticleBatchDetachedSlotPreviewMode:
              "detached-provenance-slots-not-scene-children"
          }
        : {})
    };
    group.add(batchMesh);
  }

  return attachAuroraEmitterTransformTimelineSampler(
    group,
    auroraTransform,
    objectRadius,
    nowBaseMs
  );
}

export function applyPlaceableVfxParticleTexture(
  group: THREE.Object3D,
  particleTexture: THREE.Texture,
  textureDeliveryUrl?: string | null,
  alphaTexture?: THREE.Texture | null
): void {
  const auroraAtlas =
    group.userData?.auroraEmitterAtlas &&
    typeof group.userData.auroraEmitterAtlas === "object"
      ? (group.userData.auroraEmitterAtlas as ResolvedAuroraEmitterAtlas)
      : null;
  const nowBaseMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  let atlasFrameSeed = 0;
  let didConvertAlphaOnlyTexture = false;
  let didConvertBlackKeyTexture = false;
  let didApplyAlphaCompanionTexture = false;
  group.userData = {
    ...group.userData,
    vfxTextureStatus: "applied",
    ...(auroraAtlas
      ? {
          auroraEmitterAtlasPreviewMode: "per-particle-vertex-uv-preview"
        }
      : {})
  };
  group.traverse((node) => {
    const materials: THREE.Material[] = [];
    if (node instanceof THREE.Sprite) {
      materials.push(node.material);
    }
    if (
      node instanceof THREE.Mesh &&
      (node.userData?.vfxPreviewRole === "world-z-sheet" ||
        node.userData?.vfxPreviewRole === "world-z-ground-billboard" ||
        node.userData?.vfxPreviewRole === "world-z-aligned" ||
        node.userData?.vfxPreviewRole === "local-z-billboard" ||
        node.userData?.vfxPreviewRole === "linked-particle-segment" ||
        node.userData?.vfxPreviewRole === "linked-particle-segment-batch" ||
        node.userData?.vfxPreviewRole === "motion-blur-endpoint-particle" ||
        node.userData?.vfxPreviewRole === "motion-blur-endpoint-batch" ||
        node.userData?.vfxPreviewRole === "camera-billboard-batch" ||
        node.userData?.vfxPreviewRole === "camera-billboard-particle")
    ) {
      materials.push(...(Array.isArray(node.material) ? node.material : [node.material]));
    }
    if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "particle-aligned-trail") {
      materials.push(...(Array.isArray(node.material) ? node.material : [node.material]));
    }
    if (
      node instanceof THREE.Mesh &&
      node.userData?.vfxPreviewRole === "particle-aligned-trail-batch"
    ) {
      materials.push(...(Array.isArray(node.material) ? node.material : [node.material]));
    }

    materials.forEach((entry) => {
      if (!(entry instanceof THREE.SpriteMaterial) && !(entry instanceof THREE.MeshBasicMaterial)) {
        return;
      }
      const material = entry;
      if (
        textureDeliveryUrl &&
        material.userData.vfxTextureDeliveryUrl !== textureDeliveryUrl
      ) {
        return;
      }
      const materialColor = material.color.clone();
      const resolvedParticleTexture = resolveVfxMaterialTexture(particleTexture, {
        alphaTexture,
        forceBlackKey: shouldForceVfxBlackKeyForMaterial(material, group)
      });
      didConvertAlphaOnlyTexture ||= resolvedParticleTexture.alphaOnlyConverted;
      didConvertBlackKeyTexture ||= resolvedParticleTexture.blackKeyConverted;
      didApplyAlphaCompanionTexture ||= resolvedParticleTexture.alphaCompanionApplied;
      const materialAuroraAtlas =
        material.userData?.auroraEmitterAtlas &&
        typeof material.userData.auroraEmitterAtlas === "object"
          ? (material.userData.auroraEmitterAtlas as ResolvedAuroraEmitterAtlas)
          : auroraAtlas;
      setVfxMaterialTexture(
        material,
        resolvedParticleTexture,
        materialColor,
        materialAuroraAtlas
          ? { atlas: materialAuroraAtlas, frameSeed: atlasFrameSeed++, nowBaseMs }
          : null
      );
      const baseOpacity = material.userData.auroraBaseOpacity;
      applyVfxParticleOpacity(
        material,
        node instanceof THREE.Mesh ? node.geometry : undefined,
        typeof baseOpacity === "number" ? baseOpacity : material.opacity,
        "material-base-opacity-sync"
      );
      applySurfaceEmitterVisibilityFallbackMaterialFromGroup(material, group);
    });
  });
  group.userData = {
    ...group.userData,
    vfxTextureAlphaOnlyConverted: didConvertAlphaOnlyTexture,
    vfxTextureBlackKeyConverted: didConvertBlackKeyTexture,
    vfxTextureAlphaCompanionApplied: didApplyAlphaCompanionTexture
  };
}

export function resolvePlaceableVfxColor(
  payload: PlaceableViewportRenderPayload,
  auroraEmitterOverride: PlaceableAuroraEmitterNode | null = null
): string {
  const auroraEmitterColor = resolveAuroraEmitterColor(payload, auroraEmitterOverride);
  if (auroraEmitterColor && !shouldUseSemanticSceneTintPreviewColor(payload, auroraEmitterOverride)) {
    return auroraEmitterColor;
  }

  return resolvePlaceableVfxSemanticFallbackColor(buildPlaceableVfxFingerprint(payload));
}

function resolvePlaceableVfxSemanticFallbackColor(fingerprint: string): string {
  if (/purple/iu.test(fingerprint)) {
    return "#c58cff";
  }
  if (/red/iu.test(fingerprint)) {
    return "#ff6673";
  }
  if (/(orange|lava|fire|flame|ember)/iu.test(fingerprint)) {
    return "#ff9f43";
  }
  if (/(water|river|shoal|bubble)/iu.test(fingerprint)) {
    return "#58d8ff";
  }
  if (/(slime|acid|poison)/iu.test(fingerprint)) {
    return "#75f28b";
  }
  if (/yellow/iu.test(fingerprint)) {
    return "#ffe066";
  }
  if (/green/iu.test(fingerprint)) {
    return "#63f09a";
  }
  if (/cyan/iu.test(fingerprint)) {
    return "#58e6ff";
  }
  if (/blue/iu.test(fingerprint)) {
    return "#6aa7ff";
  }
  return "#f2f7ff";
}

function shouldUseSemanticSceneTintPreviewColor(
  payload: PlaceableViewportRenderPayload,
  auroraEmitterOverride: PlaceableAuroraEmitterNode | null = null
): boolean {
  const emitter = auroraEmitterOverride ?? resolvePrimaryAuroraEmitter(payload);
  if (emitter?.sourceState?.isTinted !== true) {
    return false;
  }
  const simulation = resolveAuroraEmitterActiveSimulationForPayload(
    payload,
    auroraEmitterOverride
  );
  const sourceColor = simulation?.colorStart ?? simulation?.colorMid ?? simulation?.colorEnd;
  return sourceColor ? isNeutralAuroraEmitterColor(sourceColor) : false;
}

function isNeutralAuroraEmitterColor(color: [number, number, number]): boolean {
  const red = clampNumber(color[0], 0, 1);
  const green = clampNumber(color[1], 0, 1);
  const blue = clampNumber(color[2], 0, 1);
  const min = Math.min(red, green, blue);
  const max = Math.max(red, green, blue);
  return max - min <= 0.04 && max >= 0.35;
}

function buildPlaceableVfxPreviewColorUserData(
  payload: PlaceableViewportRenderPayload,
  colorHex: string,
  auroraEmitterOverride: PlaceableAuroraEmitterNode | null = null
): Record<string, string> {
  if (shouldUseSemanticSceneTintPreviewColor(payload, auroraEmitterOverride)) {
    return {
      auroraEmitterPreviewColor: colorHex,
      auroraEmitterPreviewColorMode: "semantic-scene-tint-preview",
      auroraEmitterTintDiagnostic: "VFX_PARTICLE_TINT_SCENE_CONTEXT_REQUIRED"
    };
  }
  return {
    auroraEmitterPreviewColor: colorHex,
    auroraEmitterPreviewColorMode: resolveAuroraEmitterColor(payload, auroraEmitterOverride)
      ? "aurora-emitter-color"
      : "semantic-fingerprint-fallback"
  };
}

function applyPlaceableVfxPreviewColorAdapter(
  material: PlaceableVfxPreviewMaterial,
  payload: PlaceableViewportRenderPayload,
  colorHex: string,
  auroraEmitterOverride: PlaceableAuroraEmitterNode | null = null
): void {
  material.userData = {
    ...material.userData,
    ...buildPlaceableVfxPreviewColorUserData(payload, colorHex, auroraEmitterOverride)
  };
  if (material.userData.auroraEmitterPreviewColorMode === "semantic-scene-tint-preview") {
    material.color.set(colorHex);
  }
}

function resolveAuroraEmitterActiveSimulationForPayload(
  payload: PlaceableViewportRenderPayload,
  auroraEmitterOverride: PlaceableAuroraEmitterNode | null = null
): ResolvedAuroraEmitterSimulation | null {
  const emitter = auroraEmitterOverride ?? resolvePrimaryAuroraEmitter(payload);
  const selection = resolveAuroraEmitterAnimationSelection(payload, emitter);
  return resolveAuroraEmitterActiveSimulation(emitter, selection);
}

function resolveAuroraEmitterColor(
  payload: PlaceableViewportRenderPayload,
  auroraEmitterOverride: PlaceableAuroraEmitterNode | null = null
): string | null {
  const simulation = resolveAuroraEmitterActiveSimulationForPayload(
    payload,
    auroraEmitterOverride
  );
  const sourceColor = simulation?.colorStart ?? simulation?.colorMid ?? simulation?.colorEnd;
  if (!sourceColor) {
    return null;
  }
  return `#${sourceColor.map(formatAuroraColorChannelHex).join("")}`;
}

function formatAuroraColorChannelHex(value: number): string {
  return Math.round(clampNumber(value, 0, 1) * 255)
    .toString(16)
    .padStart(2, "0");
}

export function resolvePlaceableVfxTextureReference(
  payload: PlaceableViewportRenderPayload
): string | null {
  const emitter = resolvePrimaryAuroraEmitter(payload);
  return resolveAuroraEmitterChunkName(emitter) ? null : emitter?.texture ?? null;
}

function shouldUseLowProfilePlaceableFallback(
  payload: PlaceableViewportRenderPayload
): boolean {
  if (isPlaceableVfxPayload(payload)) {
    return false;
  }

  const renderPackage = payload.renderPackage;
  if (!renderPackage) {
    return true;
  }

  const status =
    typeof renderPackage.status === "string" ? renderPackage.status.trim().toLowerCase() : "";
  if (status !== "ready") {
    return true;
  }

  const hasPackageModelUrl =
    (typeof renderPackage.glbUrl === "string" && renderPackage.glbUrl.trim().length > 0) ||
    (typeof renderPackage.modelUrl === "string" && renderPackage.modelUrl.trim().length > 0);
  const hasDerivedModelReference =
    Array.isArray(renderPackage.assetRefs?.derivedModelAssetIds) &&
    renderPackage.assetRefs.derivedModelAssetIds.length > 0;
  return !hasPackageModelUrl && !hasDerivedModelReference;
}

function buildPlaceableVfxFingerprint(payload: PlaceableViewportRenderPayload): string {
  const metadata = payload.placeable.metadata ?? {};
  const emitterTokens =
    payload.renderPackage?.auroraEmitter?.emitters.flatMap((emitter) => [
      emitter.nodeName,
      emitter.sourceModelFileName,
      emitter.sourceModelObjectKey,
      emitter.texture,
      emitter.chunkName,
      emitter.emitterType,
      emitter.renderMode,
      emitter.blendMode,
      emitter.atlas?.xGridRaw?.toString(),
      emitter.atlas?.yGridRaw?.toString(),
      emitter.atlas?.effectiveXGrid.toString(),
      emitter.atlas?.effectiveYGrid.toString(),
      emitter.atlas?.fps?.toString(),
      emitter.atlas?.frameStart?.toString(),
      emitter.atlas?.frameEnd?.toString(),
      typeof emitter.atlas?.random === "boolean" ? String(emitter.atlas.random) : undefined,
      emitter.simulation?.birthrate?.toString(),
      emitter.simulation?.lifeExp?.toString(),
      emitter.simulation?.mass?.toString(),
      emitter.simulation?.velocity?.toString(),
      emitter.simulation?.randvel?.toString(),
      emitter.simulation?.spread?.toString(),
      emitter.simulation?.particleRot?.toString(),
      typeof emitter.simulation?.bounce === "boolean"
        ? String(emitter.simulation.bounce)
        : undefined,
      emitter.simulation?.bounceCoefficient?.toString(),
      emitter.simulation?.blastRadius?.toString(),
      emitter.simulation?.blastLength?.toString(),
      emitter.simulation?.blurLength?.toString(),
      emitter.simulation?.lightningScale?.toString(),
      emitter.simulation?.lightningDelay?.toString(),
      emitter.simulation?.lightningRadius?.toString(),
      emitter.simulation?.deadspace?.toString(),
      typeof emitter.simulation?.p2p === "boolean" ? String(emitter.simulation.p2p) : undefined,
      emitter.simulation?.p2pType,
      emitter.simulation?.p2pBezier2?.toString(),
      emitter.simulation?.p2pBezier3?.toString(),
      emitter.simulation?.p2pSource?.toString(),
      emitter.simulation?.p2pTarget?.toString(),
      emitter.simulation?.combineTime?.toString(),
      emitter.simulation?.grav?.toString(),
      emitter.simulation?.drag?.toString(),
      emitter.simulation?.threshold?.toString(),
      typeof emitter.simulation?.inherit === "boolean"
        ? String(emitter.simulation.inherit)
        : undefined,
      typeof emitter.simulation?.inheritVel === "boolean"
        ? String(emitter.simulation.inheritVel)
        : undefined,
      typeof emitter.simulation?.inheritLocal === "boolean"
        ? String(emitter.simulation.inheritLocal)
        : undefined,
      typeof emitter.simulation?.inheritPart === "boolean"
        ? String(emitter.simulation.inheritPart)
        : undefined,
      typeof emitter.simulation?.affectedByWind === "boolean"
        ? String(emitter.simulation.affectedByWind)
        : undefined,
      emitter.simulation?.sizeStart?.toString(),
      emitter.simulation?.sizeMid?.toString(),
      emitter.simulation?.sizeEnd?.toString(),
      emitter.simulation?.sizeStartY?.toString(),
      emitter.simulation?.sizeMidY?.toString(),
      emitter.simulation?.sizeEndY?.toString(),
      emitter.simulation?.alphaStart?.toString(),
      emitter.simulation?.alphaMid?.toString(),
      emitter.simulation?.alphaEnd?.toString(),
      emitter.simulation?.colorStart?.join(","),
      emitter.simulation?.colorMid?.join(","),
      emitter.simulation?.colorEnd?.join(","),
      emitter.simulation?.percentStart?.toString(),
      emitter.simulation?.percentMid?.toString(),
      emitter.simulation?.percentEnd?.toString(),
      emitter.simulation?.xSize?.toString(),
      emitter.simulation?.ySize?.toString(),
      emitter.simulation?.spawnType?.toString(),
      emitter.sourceState?.renderOrder?.toString(),
      emitter.sourceState?.renderHintRaw,
      typeof emitter.sourceState?.renderHintMode === "number"
        ? String(emitter.sourceState.renderHintMode)
        : undefined,
      emitter.sourceState?.customShaderVS,
      emitter.sourceState?.customShaderFS,
      emitter.sourceState?.customShaderGS,
      typeof emitter.sourceState?.transparency === "boolean"
        ? String(emitter.sourceState.transparency)
        : undefined,
      typeof emitter.sourceState?.twoSidedMaterial === "boolean"
        ? String(emitter.sourceState.twoSidedMaterial)
        : undefined,
      typeof emitter.sourceState?.twoSidedTexture === "boolean"
        ? String(emitter.sourceState.twoSidedTexture)
        : undefined,
      typeof emitter.sourceState?.sampleFramebuffer === "number" ||
      typeof emitter.sourceState?.sampleFramebuffer === "boolean"
        ? String(emitter.sourceState.sampleFramebuffer)
        : undefined,
      typeof emitter.sourceState?.volumetric === "boolean"
        ? String(emitter.sourceState.volumetric)
        : undefined,
      typeof emitter.sourceState?.loop === "boolean" ? String(emitter.sourceState.loop) : undefined,
      typeof emitter.sourceState?.isTinted === "boolean"
        ? String(emitter.sourceState.isTinted)
        : undefined,
      typeof emitter.sourceState?.splat === "boolean" ? String(emitter.sourceState.splat) : undefined,
      typeof emitter.sourceState?.rotateTexture === "boolean"
        ? String(emitter.sourceState.rotateTexture)
        : undefined,
      emitter.transform?.position?.join(","),
      emitter.transform?.orientation?.axis?.join(","),
      typeof emitter.transform?.orientation?.angleRadians === "number"
        ? emitter.transform.orientation.angleRadians.toString()
        : undefined,
      ...(emitter.referenceNodes?.flatMap((referenceNode) => [
        referenceNode.nodeName,
        referenceNode.parentNodeName,
        referenceNode.transform?.position?.join(","),
        referenceNode.transform?.orientation?.axis?.join(","),
        typeof referenceNode.transform?.orientation?.angleRadians === "number"
          ? referenceNode.transform.orientation.angleRadians.toString()
          : undefined
      ]) ?? [])
    ]) ?? [];
  return [
    payload.templateId,
    payload.placeable.templateId,
    payload.placeable.resref,
    payload.placeable.name,
    metadata.source2daLabel,
    metadata.lookupModelResRef,
    ...emitterTokens
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("|");
}

interface PlaceableVfxPreviewProfile {
  kind: "smoke" | "beam" | "liquid" | "spark" | "generic";
  layout:
    | "camera_billboard"
    | "world_z_sheet"
    | "world_z_billboard"
    | "world_z_aligned"
    | "local_z_billboard"
    | "linked_billboard"
    | "motion_blur"
    | "particle_aligned";
  count: number;
  radius: number;
  height: number;
  drift: number;
  baseLift: number;
  baseOpacity: number;
  sizeMin: number;
  sizeMax: number;
  additive: boolean;
  sourceTransformAnchorPreviewMode?: "node-transform-origin-no-procedural-lift";
  particleRotationRate?: number;
  particleRotationRateSource?: number;
  particleRotationRatePreviewMode?:
    | "aurora-particle-rot-rps-to-radians"
    | "aurora-particle-rot-keyframe-rps-to-radians"
    | "aurora-rotatetexture-no-implicit-particle-rotation-rate";
  emitterSurfaceWidth?: number;
  emitterSurfaceDepth?: number;
  emitterSurfaceWidthSourceCm?: number;
  emitterSurfaceDepthSourceCm?: number;
  emitterSurfaceUnitScale?: number;
  emitterMotionUnitScale?: number;
  emitterSurfaceEffectiveWidth?: number;
  emitterSurfaceEffectiveDepth?: number;
  emitterSurfaceSampling?: boolean;
  emitterSurfacePreviewMode?:
    | "xsize-ysize-spawn-rectangle-preview"
    | "xsize-ysize-spawn-surface-preview"
    | "xsize-ysize-point-origin-preview"
    | "xsize-ysize-axis-gated-preview";
  emitterSurfaceSamplingPreviewMode?:
    | "integer-sign-sampler-preview"
    | "point-origin-no-random-sampling"
    | "below-threshold-axis-gated-preview";
  emitterSurfaceDiagnostics?: string[];
  lifeSeconds?: number;
  birthrate?: number;
  birthrateKeyframes?: ResolvedAuroraEmitterNumberKeyframe[];
  particleCountSource?: number;
  particleCountLimit?: number;
  particleCountPreviewMode?:
    | "birthrate-lifetime-source-count"
    | "birthrate-lifetime-preview-capped"
    | "zero-motion-world-z-symbol-single-draw"
    | "soft-alpha-preview-capped"
    | "trail-distance-stationary-source-count"
    | "texture-null-no-textured-draw";
  sourceBirthrateGateBlocked?: boolean;
  sourceLifeExpGateBlocked?: boolean;
  emissionGatePreviewMode?: "source-birthrate-lifeexp-positive-gate";
  emissionDiagnostics?: string[];
  activeSimulation?: ResolvedAuroraEmitterSimulation;
  availableAnimationNames?: string[];
  selectedAnimationName?: string;
  selectedAnimationLengthSeconds?: number;
  selectedAnimationTransitionSeconds?: number;
  selectedAnimationState?: number;
  selectedAnimationSource?:
    | "placeable-runtime-animation-state"
    | "metadata-animation-state"
    | "metadata-animation-name"
    | "catalog-default-on";
  selectedAnimationPreviewMode?:
    | "placeable-runtime-animation-state-preview"
    | "metadata-animation-state-preview"
    | "metadata-animation-name-preview"
    | "catalog-default-on-animation-preview";
  selectedAnimationDiagnostic?: string;
  selectedAnimationEmissionMuted?: boolean;
  emitterStartDelaySeconds?: number;
  emitterScheduleStepSeconds?: number;
  emitterScheduleDurationSeconds?: number;
  emitterSchedulePreviewMode?:
    | "single-emitter-immediate-local-clock"
    | "source-detonate-event-local-clock"
    | "source-keyframe-local-clock"
    | "multi-emitter-index-staggered-local-clock-preview";
  emitterScheduleDiagnostics?: string[];
  simulationTimeline?: ResolvedAuroraEmitterSimulationTimeline;
  particleSizeStart?: number;
  particleSizeMid?: number;
  particleSizeEnd?: number;
  particleSizeYStart?: number;
  particleSizeYMid?: number;
  particleSizeYEnd?: number;
  particleSizeYFallbackPreviewMode?:
    | "source-size-y-zero-uses-x-axis"
    | "source-size-y-zero-honored-for-bubble";
  particleSizeSourcePreviewMode?: "aurora-source-size-linear";
  particleSizeVisibilityFloorPreviewMode?:
    | "camera-beam-visibility-floor"
    | "surface-emitter-catalog-visibility-floor";
  bubblePreviewMode?: "source-bubble-particle-preview";
  bubbleAlphaPreviewMode?: "lighten-bubble-overdraw-preview-cap";
  bubbleDiagnostics?: string[];
  particleSizeTimelineScale?: number;
  particleAlphaStart?: number;
  particleAlphaMid?: number;
  particleAlphaEnd?: number;
  particleAlphaSourcePreviewMode?: "aurora-source-alpha-linear";
  particleAlphaPreviewClamp?: number;
  particleAlphaPreviewClampMode?: "lighten-bubble-overdraw-alpha-clamp";
  particleColorStart?: [number, number, number];
  particleColorMid?: [number, number, number];
  particleColorEnd?: [number, number, number];
  particleColorTimeline?: ResolvedAuroraEmitterColorTimeline;
  particlePercentStart?: number;
  particlePercentMid?: number;
  particlePercentEnd?: number;
  particleVelocity?: number;
  particleRandomVelocity?: number;
  particleRandomVelocityGate?: number;
  particleSpreadRadians?: number;
  particleAccelerationY?: number;
  particleKinematicCoordinateSpace?: "world" | "emitter-local";
  particleKinematicOrientationInverse?: THREE.Quaternion;
  particleKinematicCoordinateSpacePreviewMode?:
    | "source-inherit-local-emitter-space"
    | "source-no-inherit-world-space";
  kinematicTravelClampDistance?: number;
  kinematicTravelClampPreviewMode?: "velocity-preview-clamped-to-profile-height";
  zeroMotionPreviewMode?:
    | "explicit-zero-kinematics-static-preview"
    | "explicit-zero-kinematics-static-sheet-preview"
    | "explicit-zero-kinematics-temporal-particles-preview";
  gravityBias?: number;
  bounceCoefficient?: number;
  bouncePreviewMode?: "source-bounce-floor-plane-preview";
  bounceDiagnostics?: string[];
  blurLengthSource?: number;
  motionBlurRawBlurLengthSource?: number;
  motionBlurBlurLengthPreviewMode?:
    | "source-blurlength-previous-position-blend"
    | "default-blurlength-1-0"
    | "nonpositive-blurlength-diagnostic-default-1-0";
  blurStretch?: number;
  blurStretchPreviewMode?: "source-blurlength-particle-aligned-stretch";
  motionBlurPreviewMode?: "previous-current-endpoint-pair-preview";
  motionBlurDiagnostics?: string[];
  deadspaceDegrees?: number;
  deadspaceAngleRadians?: number;
  inherit?: boolean;
  inheritVel?: boolean;
  inheritLocal?: boolean;
  inheritPart?: boolean;
  inheritParticlePreviewMode?:
    | "inherit-velocity-particle-stretch"
    | "inherit-particle-requires-inherit-velocity";
  inheritDiagnostics?: string[];
  p2pPreviewMode?: "reference-target-preview" | "preserved-unmapped" | "disabled";
  p2pReferencePreviewMode?: "source-reference-node-target" | "target-reference-required";
  p2pTargetNodeName?: string;
  p2pTargetOffset?: THREE.Vector3;
  p2pMotionMode?: "bezier" | "gravity" | "unknown";
  p2pBezier2?: number;
  p2pBezier3?: number;
  p2pBezierPreviewMode?: "source-target-tangent-arc-preview";
  p2pGravity?: number;
  p2pDrag?: number;
  p2pThreshold?: number;
  p2pThresholdUnitScale?: number;
  p2pCombineTime?: number;
  p2pDiagnostics?: string[];
  blastRadius?: number;
  blastLength?: number;
  lightningScale?: number;
  lightningDelay?: number;
  lightningRadius?: number;
  explosionRequestedSpawnCount?: number;
  requiresDetonateEvent?: boolean;
  detonateEvents?: ResolvedAuroraEmitterAnimationEvent[];
  detonateControllerEvents?: ResolvedAuroraEmitterAnimationEvent[];
  detonateControllerTimeline?: ResolvedAuroraEmitterNumberKeyframe[];
  detonateControllerValue?: number;
  detonateControllerPreviewMode?: "detonate-controller-latch-preview";
  detonatePreviewMode?:
    | "detonate-event-required-muted"
    | "detonate-event-scheduled-preview"
    | "detonate-event-scheduled-muted-zero-spawn"
    | "detonate-event-filtered-by-animation-muted";
  detonateDiagnostics?: string[];
  detonateEventFilterPreviewMode?: "animation-scoped-detonate-events";
  detonateEventFilterAnimationName?: string;
  detonateEventSourceCount?: number;
  motionMode?: "fountain" | "single" | "explosion" | "lightning" | "trail";
  fountainNormalPreviewMode?: "normal-spawn-threshold-scheduled-preview";
  fountainNormalSpawnIntervalSeconds?: number;
  fountainNormalDiagnostics?: string[];
  fountainTrailPreviewMode?: "movement-distance-emission-stationary-muted-preview";
  fountainTrailSpacingMeters?: number;
  fountainTrailDiagnostics?: string[];
  singlePreviewMode?:
    | "aurora-single-max-one-active"
    | "aurora-single-loop-age-reset-existing-particle";
  singleDiagnostics?: string[];
  alignToParticleDirection?: boolean;
  linkedParticles?: boolean;
  trailStretch?: number;
  emissionMode?: "continuous" | "single" | "burst";
  loopEmission?: boolean;
  affectedByWind?: boolean;
  windDrift?: number;
  splat?: boolean;
  splatPreviewMode?: "landed-flag-required";
  splatDiagnostics?: string[];
  rotateTexture?: boolean;
  rotateTexturePreviewMode?: "aurora-source-rotatetexture-runtime-flag";
  rotateTextureDiagnostics?: string[];
  surfaceMotionPreviewMode?: "world-z-sheet-surface-flow";
}

function hasTimedAuroraEmitterNumberKeyframes(
  frames: ResolvedAuroraEmitterNumberKeyframe[] | undefined
): boolean {
  return Boolean(
    frames?.some(
      (frame) =>
        typeof frame.time === "number" &&
        Number.isFinite(frame.time) &&
        frame.time > 1e-6
    )
  );
}

function hasTimedAuroraEmitterColorKeyframes(
  frames: ResolvedAuroraEmitterColorKeyframe[] | undefined
): boolean {
  return Boolean(
    frames?.some(
      (frame) =>
        typeof frame.time === "number" &&
        Number.isFinite(frame.time) &&
        frame.time > 1e-6
    )
  );
}

function resolveAuroraEmitterSourceClockPreviewMode(
  profile: PlaceableVfxPreviewProfile
): PlaceableVfxPreviewProfile["emitterSchedulePreviewMode"] | null {
  if (profile.detonateEvents && profile.detonateEvents.length > 0) {
    return "source-detonate-event-local-clock";
  }
  if (
    (profile.simulationTimeline &&
      Object.values(profile.simulationTimeline).some(hasTimedAuroraEmitterNumberKeyframes)) ||
    (profile.particleColorTimeline &&
      Object.values(profile.particleColorTimeline).some(hasTimedAuroraEmitterColorKeyframes))
  ) {
    return "source-keyframe-local-clock";
  }
  return null;
}

function resolveAuroraEmitterSourceClockDiagnostics(
  previewMode: PlaceableVfxPreviewProfile["emitterSchedulePreviewMode"]
): string[] {
  if (previewMode === "source-detonate-event-local-clock") {
    return ["VFX_EMITTER_SOURCE_DETONATE_EVENT_CLOCK_USED"];
  }
  if (previewMode === "source-keyframe-local-clock") {
    return ["VFX_EMITTER_SOURCE_KEYFRAME_CLOCK_USED"];
  }
  return [];
}

function resolveAuroraEmitterScheduleDurationSeconds(
  profile: PlaceableVfxPreviewProfile
): number {
  const durationCandidates = [
    profile.selectedAnimationLengthSeconds,
    profile.lifeSeconds,
    profile.birthrateKeyframes?.[profile.birthrateKeyframes.length - 1]?.time,
    profile.simulationTimeline?.birthrate?.[profile.simulationTimeline.birthrate.length - 1]?.time,
    profile.simulationTimeline?.alphaEnd?.[profile.simulationTimeline.alphaEnd.length - 1]?.time
  ];
  const duration = durationCandidates.find(
    (candidate): candidate is number =>
      typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0
  );
  return clampNumber(duration ?? 1.2, 0.25, 12);
}

function applyAuroraEmitterLocalClockScheduleToProfile(
  profile: PlaceableVfxPreviewProfile,
  emitterIndex: number,
  emitterCount: number
): PlaceableVfxPreviewProfile {
  const sourceClockPreviewMode = resolveAuroraEmitterSourceClockPreviewMode(profile);
  if (sourceClockPreviewMode) {
    return {
      ...profile,
      emitterStartDelaySeconds: 0,
      emitterScheduleStepSeconds: 0,
      emitterScheduleDurationSeconds: resolveAuroraEmitterScheduleDurationSeconds(profile),
      emitterSchedulePreviewMode: sourceClockPreviewMode,
      emitterScheduleDiagnostics: [
        ...resolveAuroraEmitterSourceClockDiagnostics(sourceClockPreviewMode),
        ...(emitterCount > 1 ? ["VFX_MULTI_EMITTER_SOURCE_CLOCK_PRESERVED"] : [])
      ]
    };
  }

  if (emitterCount <= 1) {
    return {
      ...profile,
      emitterStartDelaySeconds: 0,
      emitterScheduleStepSeconds: 0,
      emitterScheduleDurationSeconds: resolveAuroraEmitterScheduleDurationSeconds(profile),
      emitterSchedulePreviewMode: "single-emitter-immediate-local-clock"
    };
  }

  const scheduleDuration = resolveAuroraEmitterScheduleDurationSeconds(profile);
  const stepSeconds = clampNumber(
    scheduleDuration / Math.max(2, emitterCount),
    0.12,
    0.75
  );
  const startDelaySeconds = Math.max(0, emitterIndex) * stepSeconds;
  return {
    ...profile,
    emitterStartDelaySeconds: startDelaySeconds,
    emitterScheduleStepSeconds: stepSeconds,
    emitterScheduleDurationSeconds: scheduleDuration,
    emitterSchedulePreviewMode: "multi-emitter-index-staggered-local-clock-preview",
    emitterScheduleDiagnostics:
      emitterIndex === 0
        ? ["VFX_MULTI_EMITTER_ROOT_CLOCK_SEQUENCED"]
        : [
            "VFX_MULTI_EMITTER_SAME_FRAME_STACKING_PREVENTED",
            "VFX_EMITTER_START_EVENT_SOURCE_REQUIRED_FOR_CANONICAL_TIMING"
          ]
  };
}

function resolveAuroraEmitterPreviewNowBaseMs(profile: PlaceableVfxPreviewProfile): number {
  const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  return nowMs + Math.max(0, profile.emitterStartDelaySeconds ?? 0) * 1000;
}

type PlaceableAuroraEmitterNode = NonNullable<
  NonNullable<PlaceableViewportRenderPayload["renderPackage"]>["auroraEmitter"]
>["emitters"][number];

type PlaceableAuroraLightNode = NonNullable<
  NonNullable<PlaceableViewportRenderPayload["renderPackage"]>["auroraLight"]
>["lights"][number];

type PlaceableAuroraLightAnimation = NonNullable<
  PlaceableAuroraLightNode["animations"]
>[number];

type PlaceableAssetDeliveryContract =
  PlaceableViewportRenderPayload["assetContracts"]["assets"][number];

function resolveAuroraEmitterSampleFramebufferValue(
  value: unknown
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return undefined;
}

function buildAuroraEmitterFramebufferRenderLaneUserData(
  emitter: PlaceableAuroraEmitterNode | null | undefined
): Record<string, string | number | boolean | string[] | undefined> {
  const sampleFramebuffer = resolveAuroraEmitterSampleFramebufferValue(
    emitter?.sourceState?.sampleFramebuffer
  );
  const volumetric = emitter?.sourceState?.volumetric === true;
  if (sampleFramebuffer === undefined && !volumetric) {
    return {};
  }
  if (sampleFramebuffer === 2) {
    return {
      auroraEmitterFramebufferRenderLane: 6,
      auroraEmitterFramebufferRenderLanePreviewMode:
        "aurora-source-sample-framebuffer-mode2-render-lane",
      auroraEmitterFramebufferRenderLaneSource: "sample_framebuffer",
      auroraEmitterFramebufferRenderLaneDiagnostics: [
        "VFX_SAMPLE_FRAMEBUFFER_MODE2_RUNTIME_LANE_6_REQUIRED",
        "VFX_SAMPLE_FRAMEBUFFER_RENDER_LANE_CAPTURE_REQUIRED"
      ]
    };
  }
  if (sampleFramebuffer === 1) {
    return {
      auroraEmitterFramebufferRenderLane: 5,
      auroraEmitterFramebufferRenderLanePreviewMode:
        "aurora-source-sample-framebuffer-mode1-render-lane",
      auroraEmitterFramebufferRenderLaneSource: "sample_framebuffer",
      auroraEmitterFramebufferRenderLaneDiagnostics: [
        "VFX_SAMPLE_FRAMEBUFFER_MODE1_RUNTIME_LANE_5_REQUIRED",
        "VFX_SAMPLE_FRAMEBUFFER_RENDER_LANE_CAPTURE_REQUIRED"
      ]
    };
  }
  if (volumetric) {
    return {
      auroraEmitterFramebufferRenderLane: 5,
      auroraEmitterFramebufferRenderLanePreviewMode:
        "aurora-source-volumetric-render-lane",
      auroraEmitterFramebufferRenderLaneSource: "volumetric",
      auroraEmitterFramebufferRenderLaneDiagnostics: [
        "VFX_VOLUMETRIC_RUNTIME_LANE_5_REQUIRED",
        "VFX_SAMPLE_FRAMEBUFFER_VOLUME_BRANCH_CAPTURE_REQUIRED"
      ]
    };
  }
  return {
    auroraEmitterFramebufferRenderLanePreviewMode:
      "aurora-source-sample-framebuffer-zero-default-branch",
    auroraEmitterFramebufferRenderLaneSource: "sample_framebuffer",
    auroraEmitterFramebufferRenderLaneDiagnostics: [
      "VFX_SAMPLE_FRAMEBUFFER_ZERO_DEFAULT_BRANCH_CAPTURE_REQUIRED"
    ]
  };
}

function buildAuroraEmitterTwoSidedMaterialRenderLaneUserData(
  emitter: PlaceableAuroraEmitterNode | null | undefined
): Record<string, string | number | boolean | string[] | undefined> {
  const twoSidedMaterial = emitter?.sourceState?.twoSidedMaterial === true;
  const volumetric = emitter?.sourceState?.volumetric === true;
  if (!twoSidedMaterial) {
    return {};
  }
  if (volumetric) {
    return {
      auroraEmitterTwoSidedMaterialRenderWrapperArgument: 0,
      auroraEmitterTwoSidedMaterialRuntimeLane:
        "two_sided_material_volumetric_runtime_arg0",
      auroraEmitterTwoSidedMaterialRuntimeLaneSource:
        "mdl-material-twosided-runtime-branch",
      auroraEmitterTwoSidedMaterialRuntimeLaneDiagnostics: [
        "VFX_TWOSIDED_MATERIAL_VOLUMETRIC_ARG0_REQUIRED"
      ]
    };
  }
  return {
    auroraEmitterTwoSidedMaterialRenderWrapperArgument: 1,
    auroraEmitterTwoSidedMaterialRuntimeLane:
      "two_sided_material_non_volumetric_runtime_arg1",
    auroraEmitterTwoSidedMaterialRuntimeLaneSource:
      "mdl-material-twosided-runtime-branch",
    auroraEmitterTwoSidedMaterialRuntimeLaneDiagnostics: [
      "VFX_TWOSIDED_MATERIAL_RUNTIME_ARG1_REQUIRED"
    ]
  };
}

function resolveAuroraEmitterRenderOrderShort(
  emitter: PlaceableAuroraEmitterNode | null | undefined
): number | null {
  const renderOrder = emitter?.sourceState?.renderOrder;
  if (typeof renderOrder !== "number" || !Number.isFinite(renderOrder)) {
    return null;
  }
  return clampNumber(Math.trunc(renderOrder), -32768, 32767);
}

function resolveAuroraEmitterThreeRenderOrder(
  emitter: PlaceableAuroraEmitterNode | null | undefined
): number {
  const renderOrderShort = resolveAuroraEmitterRenderOrderShort(emitter);
  return renderOrderShort === null
    ? PLACEABLE_VFX_DEFAULT_THREE_RENDER_ORDER
    : PLACEABLE_VFX_DEFAULT_THREE_RENDER_ORDER - renderOrderShort;
}

function buildAuroraEmitterRenderOrderAdapterUserData(
  emitter: PlaceableAuroraEmitterNode | null | undefined
): Record<string, string | number | undefined> {
  const renderOrderShort = resolveAuroraEmitterRenderOrderShort(emitter);
  if (renderOrderShort === null) {
    return {
      auroraEmitterThreeRenderOrder: PLACEABLE_VFX_DEFAULT_THREE_RENDER_ORDER,
      auroraEmitterRenderOrderAdapterPreviewMode: "default-vfx-render-order"
    };
  }
  return {
    auroraEmitterRenderOrder: renderOrderShort,
    auroraEmitterThreeRenderOrder: resolveAuroraEmitterThreeRenderOrder(emitter),
    auroraEmitterRenderOrderAdapterPreviewMode: "aurora-source-renderorder-short-adapter",
    auroraEmitterRenderOrderAdapterDirection:
      "lower-aurora-renderorder-renders-later-preview",
    auroraEmitterRenderOrderAdapterDiagnostic:
      "VFX_RENDERORDER_ADAPTER_DIRECTION_PROVENANCE_REQUIRED"
  };
}

function applyAuroraEmitterRenderOrderAdapter(
  object: THREE.Object3D,
  emitter: PlaceableAuroraEmitterNode | null | undefined
): void {
  object.renderOrder = resolveAuroraEmitterThreeRenderOrder(emitter);
  object.userData = {
    ...object.userData,
    ...buildAuroraEmitterRenderOrderAdapterUserData(emitter)
  };
}

function buildAuroraEmitterTextureSideUserData(
  emitter: PlaceableAuroraEmitterNode | null | undefined
): Record<string, string | boolean | number | undefined> {
  const twoSidedTexture = emitter?.sourceState?.twoSidedTexture;
  if (typeof twoSidedTexture !== "boolean") {
    return {
      auroraEmitterTextureSide: THREE.DoubleSide,
      auroraEmitterTextureSidePreviewMode: "preview-default-double-side-no-source-state",
      auroraEmitterTextureSideDiagnostic: "VFX_TWOSIDEDTEX_SOURCE_LIVE_READ_REQUIRED"
    };
  }
  return {
    auroraEmitterTwoSidedTexture: twoSidedTexture,
    auroraEmitterTextureSide: twoSidedTexture ? THREE.DoubleSide : THREE.FrontSide,
    auroraEmitterCullState3: twoSidedTexture ? "disabled" : "enabled",
    auroraEmitterTextureSidePreviewMode: "aurora-source-twosidedtex-adapter",
    auroraEmitterTextureSideDiagnostic: "VFX_TWOSIDEDTEX_STATE3_CULL_LANE_REQUIRED"
  };
}

function resolveAuroraEmitterTextureMaterialSide(
  emitter: PlaceableAuroraEmitterNode | null | undefined
): THREE.Side {
  return emitter?.sourceState?.twoSidedTexture === false
    ? THREE.FrontSide
    : THREE.DoubleSide;
}

function applyAuroraEmitterTextureSideAdapter(
  material: THREE.Material,
  emitter: PlaceableAuroraEmitterNode | null | undefined
): void {
  material.side = resolveAuroraEmitterTextureMaterialSide(emitter);
  material.userData = {
    ...material.userData,
    ...buildAuroraEmitterTextureSideUserData(emitter)
  };
}

function applyAuroraParticleAlignedTextureSidePreviewAdapter(
  material: THREE.Material,
  emitter: PlaceableAuroraEmitterNode | null | undefined
): void {
  if (emitter?.sourceState?.twoSidedTexture !== false) {
    return;
  }
  material.side = THREE.DoubleSide;
  material.userData = {
    ...material.userData,
    auroraEmitterParticleAlignedTextureSide: THREE.DoubleSide,
    auroraEmitterParticleAlignedSourceTextureSide: THREE.FrontSide,
    auroraEmitterParticleAlignedTextureSidePreviewMode:
      "camera-facing-particle-aligned-double-sided-preview",
    auroraEmitterParticleAlignedTextureSideDiagnostic:
      "VFX_PARTICLE_ALIGNED_FRONTFACE_BASIS_RUNTIME_PARITY_REQUIRED"
  };
}

function buildAuroraEmitterTextureTintUserData(
  emitter: PlaceableAuroraEmitterNode | null | undefined
): Record<string, string | boolean | undefined> {
  const isTinted = emitter?.sourceState?.isTinted;
  if (typeof isTinted !== "boolean") {
    return {
      auroraEmitterTintPreviewMode: "preview-default-tinted-no-source-state"
    };
  }
  return {
    auroraEmitterIsTinted: isTinted,
    auroraEmitterTintPreviewMode: isTinted
      ? "aurora-source-m_istinted-enabled-ambient-tint"
      : "aurora-source-m_istinted-disabled-particle-color-preserved",
    auroraEmitterTintDiagnostic: isTinted
      ? "VFX_AMBIENT_SCENE_TINT_CONTEXT_REQUIRED"
      : "VFX_M_ISTINTED_ZERO_AMBIENT_TINT_DISABLED"
  };
}

function applyAuroraEmitterTextureTintAdapter(
  material: PlaceableVfxPreviewMaterial,
  emitter: PlaceableAuroraEmitterNode | null | undefined
): void {
  material.userData = {
    ...material.userData,
    ...buildAuroraEmitterTextureTintUserData(emitter)
  };
}

function resolveAuroraEmitterChunkName(
  emitter: PlaceableAuroraEmitterNode | null | undefined
): string | null {
  if (typeof emitter?.chunkName !== "string") {
    return null;
  }
  const normalized = emitter.chunkName.trim();
  if (!normalized || /^(null|none)$/iu.test(normalized)) {
    return null;
  }
  return normalized;
}

function resolveAuroraEmitterChunkModelContract(
  payload: PlaceableViewportRenderPayload,
  emitter: PlaceableAuroraEmitterNode | null | undefined
): PlaceableAssetDeliveryContract | null {
  const assetId =
    typeof emitter?.chunkModelAssetId === "string" ? emitter.chunkModelAssetId.trim() : "";
  if (!assetId) {
    return null;
  }
  return (
    payload.assetContracts.assets.find((asset) => asset.assetId.trim() === assetId) ?? null
  );
}

interface ResolvedAuroraEmitterTransform {
  position?: [number, number, number];
  positionTimeline?: ResolvedAuroraEmitterVector3Keyframe[];
  orientation?: {
    axis: [number, number, number];
    angleRadians: number;
  };
  orientationTimeline?: ResolvedAuroraEmitterOrientationKeyframe[];
  scale?: number;
  scaleTimeline?: ResolvedAuroraEmitterNumberKeyframe[];
}

interface ResolvedAuroraEmitterReferenceTarget {
  nodeName: string;
  parentNodeName?: string;
  position: [number, number, number];
  mappedPosition: THREE.Vector3;
}

function mapAuroraVectorToThree(value: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(value[0], value[2], value[1]);
}

function resolveAuroraEmitterTransformQuaternion(
  transform: ResolvedAuroraEmitterTransform | null
): THREE.Quaternion | null {
  if (!transform?.orientation) {
    return null;
  }
  const mappedAxis = mapAuroraVectorToThree(transform.orientation.axis).normalize();
  if (mappedAxis.lengthSq() <= 1e-12) {
    return null;
  }
  return new THREE.Quaternion().setFromAxisAngle(
    mappedAxis,
    transform.orientation.angleRadians
  );
}

function resolveThreeAxisAngleFromQuaternion(
  quaternion: THREE.Quaternion
): { axis: THREE.Vector3; angleRadians: number } | null {
  const normalized = quaternion.clone().normalize();
  const angleRadians = 2 * Math.acos(clampNumber(normalized.w, -1, 1));
  const axisScale = Math.sqrt(Math.max(0, 1 - normalized.w * normalized.w));
  if (axisScale <= 1e-6) {
    return {
      axis: new THREE.Vector3(1, 0, 0),
      angleRadians: 0
    };
  }
  return {
    axis: new THREE.Vector3(
      normalized.x / axisScale,
      normalized.y / axisScale,
      normalized.z / axisScale
    ),
    angleRadians
  };
}

function resolveAuroraEmitterOrientationFrameQuaternion(
  orientation: ResolvedAuroraEmitterTransform["orientation"]
): THREE.Quaternion | null {
  return resolveAuroraEmitterTransformQuaternion(orientation ? { orientation } : null);
}

function sampleAuroraEmitterOrientationKeyframesAtElapsed(
  frames: ResolvedAuroraEmitterOrientationKeyframe[] | undefined,
  elapsedSeconds: number | undefined,
  loop = true
): THREE.Quaternion | null {
  if (!frames || frames.length === 0) {
    return null;
  }
  const sortedFrames = frames
    .map((frame) => ({
      time: frame.time,
      quaternion: resolveAuroraEmitterOrientationFrameQuaternion(frame.value)
    }))
    .filter(
      (frame): frame is { time: number; quaternion: THREE.Quaternion } =>
        Number.isFinite(frame.time) && frame.time >= 0 && Boolean(frame.quaternion)
    )
    .sort((left, right) => left.time - right.time);
  if (sortedFrames.length === 0) {
    return null;
  }
  if (sortedFrames.length === 1) {
    return sortedFrames[0]?.quaternion.clone() ?? null;
  }
  const firstFrame = sortedFrames[0];
  const lastFrame = sortedFrames[sortedFrames.length - 1];
  if (!firstFrame || !lastFrame) {
    return null;
  }
  const duration = lastFrame.time - firstFrame.time;
  let sampleTime =
    typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
      ? elapsedSeconds
      : firstFrame.time;
  if (duration > 1e-6) {
    sampleTime = loop
      ? firstFrame.time + positiveModulo(sampleTime - firstFrame.time, duration)
      : clampNumber(sampleTime, firstFrame.time, lastFrame.time);
  }
  if (sampleTime <= firstFrame.time || duration <= 1e-6) {
    return firstFrame.quaternion.clone();
  }
  if (sampleTime >= lastFrame.time) {
    return lastFrame.quaternion.clone();
  }
  for (let index = 1; index < sortedFrames.length; index += 1) {
    const current = sortedFrames[index];
    const previous = sortedFrames[index - 1];
    if (!current || !previous || sampleTime > current.time) {
      continue;
    }
    const segmentDuration = current.time - previous.time;
    if (segmentDuration <= 1e-6) {
      return current.quaternion.clone();
    }
    return previous.quaternion
      .clone()
      .slerp(
        current.quaternion,
        clampNumber((sampleTime - previous.time) / segmentDuration, 0, 1)
      )
      .normalize();
  }
  return lastFrame.quaternion.clone();
}

function resolveAuroraEmitterTransformSource(
  transform: PlaceableAuroraEmitterNode["transform"] | null | undefined
): ResolvedAuroraEmitterTransform | null {
  if (!transform) {
    return null;
  }
  const position = sanitizeAuroraEmitterTransformVector(transform.position);
  const positionTimeline = sanitizeEmitterVector3Keyframes(transform.positionTimeline);
  const orientation = sanitizeAuroraEmitterTransformOrientation(transform.orientation);
  const orientationTimeline = sanitizeEmitterOrientationKeyframes(transform.orientationTimeline);
  const scale = sanitizeFiniteEmitterNumber(transform.scale);
  const scaleTimeline = sanitizeEmitterNumberKeyframes(transform.scaleTimeline);
  if (
    !position &&
    !positionTimeline &&
    !orientation &&
    !orientationTimeline &&
    scale === undefined &&
    !scaleTimeline
  ) {
    return null;
  }
  return {
    ...(position ? { position } : {}),
    ...(positionTimeline ? { positionTimeline } : {}),
    ...(orientation ? { orientation } : {}),
    ...(orientationTimeline ? { orientationTimeline } : {}),
    ...(scale !== undefined ? { scale } : {}),
    ...(scaleTimeline ? { scaleTimeline } : {})
  };
}

function resolveAuroraEmitterTransform(
  emitter: PlaceableAuroraEmitterNode | null
): ResolvedAuroraEmitterTransform | null {
  return resolveAuroraEmitterTransformSource(emitter?.transform);
}

type PlaceableAuroraEmitterAnimation = NonNullable<
  PlaceableAuroraEmitterNode["animations"]
>[number];

interface ResolvedAuroraEmitterAnimation {
  animationName: string;
  normalizedName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  simulation: ResolvedAuroraEmitterSimulation | null;
  transform: ResolvedAuroraEmitterTransform | null;
}

interface ResolvedAuroraEmitterAnimationSelection {
  availableAnimationNames: string[];
  requestedAnimationName?: string;
  selectedAnimation: ResolvedAuroraEmitterAnimation | null;
  selectedAnimationState?: number;
  selectedAnimationSource?: PlaceableVfxPreviewProfile["selectedAnimationSource"];
  selectedAnimationPreviewMode?: PlaceableVfxPreviewProfile["selectedAnimationPreviewMode"];
  selectedAnimationDiagnostic?: string;
}

function cloneAuroraEmitterNumberKeyframes(
  frames: ResolvedAuroraEmitterNumberKeyframe[] | undefined
): ResolvedAuroraEmitterNumberKeyframe[] | undefined {
  return frames?.map((frame) => ({ time: frame.time, value: frame.value }));
}

function cloneAuroraEmitterColorKeyframes(
  frames: ResolvedAuroraEmitterColorKeyframe[] | undefined
): ResolvedAuroraEmitterColorKeyframe[] | undefined {
  return frames?.map((frame) => ({ time: frame.time, value: [...frame.value] }));
}

function hasResolvedAuroraEmitterSimulationProperty(
  simulation: ResolvedAuroraEmitterSimulation | null | undefined,
  key: ResolvedAuroraEmitterSimulationTimelineKey
): boolean {
  return simulation ? Object.prototype.hasOwnProperty.call(simulation, key) : false;
}

function mergeAuroraEmitterSimulationTimelines(
  base: ResolvedAuroraEmitterSimulationTimeline | undefined,
  override: ResolvedAuroraEmitterSimulationTimeline | undefined,
  overrideSimulation: ResolvedAuroraEmitterSimulation | null | undefined
): ResolvedAuroraEmitterSimulationTimeline | undefined {
  if (!base && !override) {
    return undefined;
  }
  const merged: ResolvedAuroraEmitterSimulationTimeline = {};
  AURORA_EMITTER_SIMULATION_TIMELINE_KEYS.forEach((key) => {
    const overrideFrames = cloneAuroraEmitterNumberKeyframes(override?.[key]);
    const hasStaticOverride = hasResolvedAuroraEmitterSimulationProperty(
      overrideSimulation,
      key
    );
    const frames = overrideFrames ?? (hasStaticOverride ? undefined : cloneAuroraEmitterNumberKeyframes(base?.[key]));
    if (frames && frames.length > 0) {
      merged[key] = frames;
    }
  });
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeAuroraEmitterColorTimelines(
  base: ResolvedAuroraEmitterColorTimeline | undefined,
  override: ResolvedAuroraEmitterColorTimeline | undefined,
  overrideSimulation: ResolvedAuroraEmitterSimulation | null | undefined
): ResolvedAuroraEmitterColorTimeline | undefined {
  if (!base && !override) {
    return undefined;
  }
  const merged: ResolvedAuroraEmitterColorTimeline = {};
  (["colorStart", "colorMid", "colorEnd"] as const).forEach((key) => {
    const overrideFrames = cloneAuroraEmitterColorKeyframes(override?.[key]);
    const hasStaticOverride = overrideSimulation
      ? Object.prototype.hasOwnProperty.call(overrideSimulation, key)
      : false;
    const frames = overrideFrames ?? (hasStaticOverride ? undefined : cloneAuroraEmitterColorKeyframes(base?.[key]));
    if (frames && frames.length > 0) {
      merged[key] = frames;
    }
  });
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeResolvedAuroraEmitterSimulations(
  base: ResolvedAuroraEmitterSimulation | null,
  override: ResolvedAuroraEmitterSimulation | null
): ResolvedAuroraEmitterSimulation | null {
  if (!base && !override) {
    return null;
  }
  const merged: ResolvedAuroraEmitterSimulation = {
    ...(base ?? {}),
    ...(override ?? {})
  };
  const timeline = mergeAuroraEmitterSimulationTimelines(
    base?.timeline,
    override?.timeline,
    override
  );
  const colorTimeline = mergeAuroraEmitterColorTimelines(
    base?.colorTimeline,
    override?.colorTimeline,
    override
  );
  if (timeline) {
    merged.timeline = timeline;
  } else {
    delete merged.timeline;
  }
  if (colorTimeline) {
    merged.colorTimeline = colorTimeline;
  } else {
    delete merged.colorTimeline;
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

function resolveAuroraEmitterAnimations(
  emitter: PlaceableAuroraEmitterNode | null
): ResolvedAuroraEmitterAnimation[] {
  const animations = emitter?.animations;
  if (!Array.isArray(animations) || animations.length === 0) {
    return [];
  }
  return animations
    .map((animation: PlaceableAuroraEmitterAnimation): ResolvedAuroraEmitterAnimation | null => {
      const animationName =
        typeof animation.animationName === "string" ? animation.animationName.trim() : "";
      if (!animationName) {
        return null;
      }
      return {
        animationName,
        normalizedName: normalizeAuroraEmitterToken(animationName),
        ...(typeof animation.lengthSeconds === "number" && Number.isFinite(animation.lengthSeconds)
          ? { lengthSeconds: Math.max(0, animation.lengthSeconds) }
          : {}),
        ...(typeof animation.transitionSeconds === "number" && Number.isFinite(animation.transitionSeconds)
          ? { transitionSeconds: Math.max(0, animation.transitionSeconds) }
          : {}),
        simulation: resolveAuroraEmitterSimulationSource(animation.simulation),
        transform: resolveAuroraEmitterTransformSource(animation.transform)
      };
    })
    .filter((animation): animation is ResolvedAuroraEmitterAnimation => Boolean(animation));
}

function resolveAuroraPlaceableAnimationStateName(animationState: number): string | null {
  switch (Math.trunc(animationState)) {
    case 0:
      return "default";
    case 1:
      return "open";
    case 2:
      return "close";
    case 3:
      return "dead";
    case 4:
      return "on";
    case 5:
      return "off";
    default:
      return null;
  }
}

function readPlaceableMetadataString(
  payload: PlaceableViewportRenderPayload,
  keys: string[]
): string | null {
  const metadata = payload.placeable.metadata;
  if (!metadata) {
    return null;
  }
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function readPlaceableMetadataNumber(
  payload: PlaceableViewportRenderPayload,
  keys: string[]
): number | null {
  const metadata = payload.placeable.metadata;
  if (!metadata) {
    return null;
  }
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function findAuroraEmitterAnimationByName(
  animations: ResolvedAuroraEmitterAnimation[],
  animationName: string | null
): ResolvedAuroraEmitterAnimation | null {
  if (!animationName) {
    return null;
  }
  const normalized = normalizeAuroraEmitterToken(animationName);
  if (!normalized) {
    return null;
  }
  const alias =
    normalized === "activate" || normalized === "activated"
      ? "on"
      : normalized === "deactivate" || normalized === "deactivated"
        ? "off"
        : normalized;
  return (
    animations.find((animation) => animation.normalizedName === alias) ??
    animations.find((animation) => animation.normalizedName === normalized) ??
    null
  );
}

function buildAuroraEmitterAnimationSelection(
  animations: ResolvedAuroraEmitterAnimation[],
  requestedAnimationName: string | null,
  source: PlaceableVfxPreviewProfile["selectedAnimationSource"],
  animationState?: number
): ResolvedAuroraEmitterAnimationSelection {
  const selectedAnimation = findAuroraEmitterAnimationByName(animations, requestedAnimationName);
  const previewMode =
    source === "placeable-runtime-animation-state"
      ? "placeable-runtime-animation-state-preview"
      : source === "metadata-animation-state"
        ? "metadata-animation-state-preview"
        : source === "metadata-animation-name"
          ? "metadata-animation-name-preview"
          : "catalog-default-on-animation-preview";
  return {
    availableAnimationNames: animations.map((animation) => animation.animationName),
    ...(requestedAnimationName ? { requestedAnimationName } : {}),
    selectedAnimation,
    ...(typeof animationState === "number" ? { selectedAnimationState: Math.trunc(animationState) } : {}),
    selectedAnimationSource: source,
    selectedAnimationPreviewMode: previewMode,
    ...(selectedAnimation || !requestedAnimationName
      ? {}
      : { selectedAnimationDiagnostic: "VFX_ANIMATION_STATE_NOT_FOUND_IN_EMITTER" })
  };
}

function resolveAuroraEmitterAnimationSelection(
  payload: PlaceableViewportRenderPayload,
  emitter: PlaceableAuroraEmitterNode | null
): ResolvedAuroraEmitterAnimationSelection {
  const animations = resolveAuroraEmitterAnimations(emitter);
  const availableAnimationNames = animations.map((animation) => animation.animationName);
  if (animations.length === 0) {
    return {
      availableAnimationNames,
      selectedAnimation: null
    };
  }

  const metadataAnimationName = readPlaceableMetadataString(payload, [
    "animationName",
    "animationStateName",
    "auroraAnimationName",
    "vfxAnimationName",
    "animationState"
  ]);
  if (metadataAnimationName) {
    return buildAuroraEmitterAnimationSelection(
      animations,
      metadataAnimationName,
      "metadata-animation-name"
    );
  }

  const runtimeAnimationState = payload.placeable.placeableRuntime?.state?.animationState;
  if (typeof runtimeAnimationState === "number" && Number.isFinite(runtimeAnimationState)) {
    return buildAuroraEmitterAnimationSelection(
      animations,
      resolveAuroraPlaceableAnimationStateName(runtimeAnimationState),
      "placeable-runtime-animation-state",
      runtimeAnimationState
    );
  }

  const metadataAnimationState = readPlaceableMetadataNumber(payload, ["animationState"]);
  if (typeof metadataAnimationState === "number" && Number.isFinite(metadataAnimationState)) {
    return buildAuroraEmitterAnimationSelection(
      animations,
      resolveAuroraPlaceableAnimationStateName(metadataAnimationState),
      "metadata-animation-state",
      metadataAnimationState
    );
  }

  const isVfxCatalogPreview =
    payload.placeable.placeableSubtype === "vfx" ||
    payload.placeable.render.frontendType === "vfx" ||
    payload.placeable.render.isVfx === true;
  if (isVfxCatalogPreview && findAuroraEmitterAnimationByName(animations, "on")) {
    return buildAuroraEmitterAnimationSelection(animations, "on", "catalog-default-on");
  }

  return {
    availableAnimationNames,
    selectedAnimation: null
  };
}

function resolveAuroraEmitterActiveSimulation(
  emitter: PlaceableAuroraEmitterNode | null,
  selection: ResolvedAuroraEmitterAnimationSelection
): ResolvedAuroraEmitterSimulation | null {
  return mergeResolvedAuroraEmitterSimulations(
    resolveAuroraEmitterSimulation(emitter),
    selection.selectedAnimation?.simulation ?? null
  );
}

function resolveAuroraEmitterActiveTransform(
  emitter: PlaceableAuroraEmitterNode | null,
  selection: ResolvedAuroraEmitterAnimationSelection
): ResolvedAuroraEmitterTransform | null {
  const baseTransform = resolveAuroraEmitterTransform(emitter);
  const animationTransform = selection.selectedAnimation?.transform ?? null;
  if (!baseTransform && !animationTransform) {
    return null;
  }
  return {
    ...(baseTransform ?? {}),
    ...(animationTransform ?? {})
  };
}

function isAuroraEmitterAnimationEmissionMuted(
  selection: ResolvedAuroraEmitterAnimationSelection,
  simulation: ResolvedAuroraEmitterSimulation | null
): boolean {
  if (!selection.selectedAnimation || !simulation) {
    return false;
  }
  const selectedSimulation = selection.selectedAnimation.simulation;
  const selectedTimelinePeak = resolveAuroraEmitterNumberKeyframePeak(
    selectedSimulation?.timeline?.birthrate
  );
  const selectedExplicitZeroBirthrate =
    typeof selectedSimulation?.birthrate === "number" &&
    Number.isFinite(selectedSimulation.birthrate) &&
    selectedSimulation.birthrate <= 1e-6 &&
    !isPositiveAuroraSimulationNumber(selectedTimelinePeak);
  const selectedOffState = selection.selectedAnimation.normalizedName === "off";
  return (
    (selectedExplicitZeroBirthrate || selectedOffState) &&
    resolveAuroraEmitterPositiveBirthrate(simulation) === undefined
  );
}

function applyAuroraEmitterAnimationSelectionToPreviewProfile(
  profile: PlaceableVfxPreviewProfile,
  selection: ResolvedAuroraEmitterAnimationSelection,
  simulation: ResolvedAuroraEmitterSimulation | null
): PlaceableVfxPreviewProfile {
  const selectedAnimation = selection.selectedAnimation;
  const muted = isAuroraEmitterAnimationEmissionMuted(selection, simulation);
  const next: PlaceableVfxPreviewProfile = {
    ...profile,
    ...(simulation ? { activeSimulation: simulation } : {}),
    ...(selection.availableAnimationNames.length > 0
      ? { availableAnimationNames: selection.availableAnimationNames }
      : {}),
    ...(selectedAnimation ? { selectedAnimationName: selectedAnimation.animationName } : {}),
    ...(selectedAnimation?.lengthSeconds !== undefined
      ? { selectedAnimationLengthSeconds: selectedAnimation.lengthSeconds }
      : {}),
    ...(selectedAnimation?.transitionSeconds !== undefined
      ? { selectedAnimationTransitionSeconds: selectedAnimation.transitionSeconds }
      : {}),
    ...(selection.selectedAnimationState !== undefined
      ? { selectedAnimationState: selection.selectedAnimationState }
      : {}),
    ...(selection.selectedAnimationSource
      ? { selectedAnimationSource: selection.selectedAnimationSource }
      : {}),
    ...(selection.selectedAnimationPreviewMode
      ? { selectedAnimationPreviewMode: selection.selectedAnimationPreviewMode }
      : {}),
    ...(selection.selectedAnimationDiagnostic
      ? { selectedAnimationDiagnostic: selection.selectedAnimationDiagnostic }
      : {}),
    ...(muted ? { selectedAnimationEmissionMuted: true } : {})
  };
  if (!muted) {
    return next;
  }
  return {
    ...next,
    count: 0,
    birthrate: 0,
    birthrateKeyframes: undefined,
    zeroMotionPreviewMode: undefined,
    emissionMode: "continuous",
    loopEmission: false
  };
}

function sanitizeAuroraEmitterTransformVector(
  value: unknown
): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 3) {
    return undefined;
  }
  const [x, y, z] = value;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof z !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z)
  ) {
    return undefined;
  }
  return [x, y, z];
}

function sanitizeAuroraEmitterTransformOrientation(
  value: unknown
):
  | {
      axis: [number, number, number];
      angleRadians: number;
    }
  | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as {
    axis?: unknown;
    angleRadians?: unknown;
  };
  const axis = sanitizeAuroraEmitterTransformVector(candidate.axis);
  const angleRadians = candidate.angleRadians;
  if (!axis || typeof angleRadians !== "number" || !Number.isFinite(angleRadians)) {
    return undefined;
  }
  const axisLengthSq = axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2];
  if (axisLengthSq <= 1e-12) {
    return undefined;
  }
  return {
    axis,
    angleRadians
  };
}

function applyAuroraEmitterTransformToGroup(
  group: THREE.Object3D,
  transform: ResolvedAuroraEmitterTransform | null,
  objectRadius: number,
  elapsedSeconds?: number
): void {
  if (!transform) {
    return;
  }
  const timelinePosition = sampleAuroraLightVector3KeyframesAtElapsed(
    transform.positionTimeline,
    elapsedSeconds
  );
  const transformPosition = timelinePosition ?? transform.position;
  if (transformPosition) {
    const scale = Math.max(objectRadius, 0.5) / 100;
    const mappedPosition = mapAuroraVectorToThree(transformPosition).multiplyScalar(scale);
    group.position.copy(mappedPosition);
    group.userData = {
      ...group.userData,
      auroraEmitterTransformUnitScale: scale,
      ...(transform.positionTimeline
        ? {
            auroraEmitterTransformPositionTimeline: transform.positionTimeline,
            auroraEmitterTransformPositionTimelineSampleSeconds:
              typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
                ? elapsedSeconds
                : 0,
            auroraEmitterTransformPositionTimelinePreviewMode:
              "runtime-position-keyframe-sampled-preview"
          }
        : {}),
      auroraEmitterTransformMappedPosition: [
        mappedPosition.x,
        mappedPosition.y,
        mappedPosition.z
      ]
    };
  }
  const timelineOrientationQuaternion = sampleAuroraEmitterOrientationKeyframesAtElapsed(
    transform.orientationTimeline,
    elapsedSeconds
  );
  const staticOrientationQuaternion = resolveAuroraEmitterTransformQuaternion(transform);
  const orientationQuaternion = timelineOrientationQuaternion ?? staticOrientationQuaternion;
  if (orientationQuaternion) {
    const axisAngle =
      timelineOrientationQuaternion !== null
        ? resolveThreeAxisAngleFromQuaternion(timelineOrientationQuaternion)
        : transform.orientation
          ? {
              axis: mapAuroraVectorToThree(transform.orientation.axis).normalize(),
              angleRadians: transform.orientation.angleRadians
            }
          : null;
    if (axisAngle && axisAngle.axis.lengthSq() > 1e-12) {
      group.quaternion.copy(orientationQuaternion);
      group.userData = {
        ...group.userData,
        auroraEmitterTransformMappedAxis: [
          axisAngle.axis.x,
          axisAngle.axis.y,
          axisAngle.axis.z
        ],
        auroraEmitterTransformAngleRadians: axisAngle.angleRadians,
        ...(transform.orientationTimeline
          ? {
              auroraEmitterTransformOrientationTimeline: transform.orientationTimeline,
              auroraEmitterTransformOrientationTimelineSampleSeconds:
                typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
                  ? elapsedSeconds
                  : 0,
              auroraEmitterTransformOrientationTimelinePreviewMode:
                "runtime-orientation-keyframe-slerp-preview"
            }
          : {})
      };
    }
  }
  const timelineScale = sampleAuroraEmitterNumberKeyframesAtElapsed(
    transform.scaleTimeline,
    elapsedSeconds
  );
  const transformScale = timelineScale ?? transform.scale;
  if (typeof transformScale === "number" && Number.isFinite(transformScale)) {
    group.scale.setScalar(transformScale);
    group.userData = {
      ...group.userData,
      auroraEmitterTransformScale: transformScale,
      auroraEmitterTransformScalePreviewMode: transform.scaleTimeline
        ? "node-scale-keyframe-preview"
        : "node-scale-preview",
      ...(transform.scaleTimeline
        ? {
            auroraEmitterTransformScaleTimeline: transform.scaleTimeline,
            auroraEmitterTransformScaleTimelineSampleSeconds:
              typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
                ? elapsedSeconds
                : 0,
            auroraEmitterTransformScaleTimelinePreviewMode:
              "runtime-scale-keyframe-sampled-preview"
          }
        : {})
    };
  }
}

function attachAuroraEmitterTransformTimelineSampler(
  group: THREE.Group,
  transform: ResolvedAuroraEmitterTransform | null,
  objectRadius: number,
  nowBaseMs: number
): THREE.Group {
  if (
    !transform?.scaleTimeline?.length &&
    !transform?.positionTimeline?.length &&
    !transform?.orientationTimeline?.length
  ) {
    return group;
  }
  let attachedObjectCount = 0;
  const updateTransform = (): void => {
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsedSeconds = Math.max(0, (nowMs - nowBaseMs) * 0.001);
    applyAuroraEmitterTransformToGroup(group, transform, objectRadius, elapsedSeconds);
  };
  group.traverse((object) => {
    if (object === group) {
      return;
    }
    const previousOnBeforeRender = object.onBeforeRender;
    object.onBeforeRender = (renderer, scene, camera, geometry, material, renderGroup) => {
      updateTransform();
      previousOnBeforeRender.call(
        object,
        renderer,
        scene,
        camera,
        geometry,
        material,
        renderGroup
      );
    };
    attachedObjectCount += 1;
  });
  group.userData = {
    ...group.userData,
    ...(transform.scaleTimeline?.length
      ? {
          auroraEmitterTransformScaleTimelineSamplerPreviewMode:
            "renderable-child-on-before-render-root-scale-sampler",
          auroraEmitterTransformScaleTimelineSamplerObjectCount: attachedObjectCount
        }
      : {}),
    ...(transform.positionTimeline?.length
      ? {
          auroraEmitterTransformPositionTimelineSamplerPreviewMode:
            "renderable-child-on-before-render-root-position-sampler",
          auroraEmitterTransformPositionTimelineSamplerObjectCount: attachedObjectCount
        }
      : {}),
    ...(transform.orientationTimeline?.length
      ? {
          auroraEmitterTransformOrientationTimelineSamplerPreviewMode:
            "renderable-child-on-before-render-root-orientation-sampler",
          auroraEmitterTransformOrientationTimelineSamplerObjectCount: attachedObjectCount
        }
      : {})
  };
  return group;
}

function resolveAuroraEmitterP2PReferenceTarget(
  emitter: PlaceableAuroraEmitterNode | null,
  objectRadius: number
): ResolvedAuroraEmitterReferenceTarget | null {
  const references = emitter?.referenceNodes;
  if (!Array.isArray(references) || references.length === 0) {
    return null;
  }
  const scale = Math.max(objectRadius, 0.5);
  for (const referenceNode of references) {
    const nodeName =
      typeof referenceNode.nodeName === "string" ? referenceNode.nodeName.trim() : "";
    const position = sanitizeAuroraEmitterTransformVector(referenceNode.transform?.position);
    if (!nodeName || !position) {
      continue;
    }
    return {
      nodeName,
      ...(typeof referenceNode.parentNodeName === "string" &&
      referenceNode.parentNodeName.trim().length > 0
        ? { parentNodeName: referenceNode.parentNodeName.trim() }
        : {}),
      position,
      mappedPosition: mapAuroraVectorToThree(position).multiplyScalar(scale)
    };
  }
  return null;
}

function resolveAuroraEmitterSpreadRadians(value: number): number {
  return value > Math.PI * 2 ? (value * Math.PI) / 180 : value;
}

function resolveAuroraParticleRotationRateRadians(rotationsPerSecond: number): number {
  return rotationsPerSecond * Math.PI * 2;
}

function hasExplicitAuroraZeroKinematics(
  simulation: ResolvedAuroraEmitterSimulation
): boolean {
  const motionControllers = [
    simulation.velocity,
    simulation.randvel,
    simulation.spread,
    simulation.grav,
    simulation.mass
  ];
  const hasExplicitMotionController = motionControllers.some(
    (value) => typeof value === "number" && Number.isFinite(value)
  );
  if (!hasExplicitMotionController || simulation.p2p === true || simulation.spawnType === 1) {
    return false;
  }
  return motionControllers.every(
    (value) => typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) < 1e-6
  );
}

function isPositiveAuroraSimulationNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 1e-6;
}

function isNonZeroAuroraSimulationNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) > 1e-6;
}

function resolveAuroraEmitterPositiveBirthrate(
  simulation: ResolvedAuroraEmitterSimulation
): number | undefined {
  const timelinePeak = resolveAuroraEmitterNumberKeyframePeak(simulation.timeline?.birthrate);
  if (isPositiveAuroraSimulationNumber(timelinePeak)) {
    return timelinePeak;
  }
  return isPositiveAuroraSimulationNumber(simulation.birthrate)
    ? simulation.birthrate
    : undefined;
}

function resolveAuroraEmitterPreviewParticleCountLimit(
  profile: PlaceableVfxPreviewProfile,
  surfaceBoundWorldZSheet: boolean,
  hasEmitterSurface: boolean
): number {
  if (profile.bubblePreviewMode) {
    return hasEmitterSurface ? 32 : 24;
  }
  if (surfaceBoundWorldZSheet) {
    return hasEmitterSurface ? 4 : 32;
  }
  if (hasEmitterSurface) {
    if (profile.layout === "camera_billboard") {
      return 256;
    }
    if (
      profile.layout === "world_z_billboard" ||
      profile.layout === "world_z_aligned" ||
      profile.layout === "particle_aligned"
    ) {
      return 192;
    }
    return 160;
  }
  if (profile.layout === "linked_billboard") {
    return 144;
  }
  return 96;
}

function shouldUseAuroraSurfaceFlowWorldZSheet(profile: PlaceableVfxPreviewProfile): boolean {
  return (
    profile.layout === "world_z_sheet" &&
    profile.surfaceMotionPreviewMode === "world-z-sheet-surface-flow"
  );
}

function resolveAuroraSurfaceFlowWorldZSheetAngle(
  profile: PlaceableVfxPreviewProfile,
  fallbackAngle: number
): number {
  if (!shouldUseAuroraSurfaceFlowWorldZSheet(profile)) {
    return fallbackAngle;
  }
  const width = profile.emitterSurfaceWidth ?? 0;
  const depth = profile.emitterSurfaceDepth ?? 0;
  return depth > width ? Math.PI / 2 : 0;
}

function resolveAuroraEmitterParticleSizeScale(
  profile: PlaceableVfxPreviewProfile,
  objectRadius: number,
  modelUnitScale: number
): number {
  return profile.layout === "camera_billboard" ? objectRadius : modelUnitScale;
}

function resolveAuroraEmitterTimelinePeakValue(
  simulation: ResolvedAuroraEmitterSimulation,
  key: ResolvedAuroraEmitterSimulationTimelineKey
): number | undefined {
  return resolveAuroraEmitterNumberKeyframePeak(simulation.timeline?.[key]);
}

function resolveAuroraEmitterNonNegativeNumberWithTimeline(
  simulation: ResolvedAuroraEmitterSimulation,
  key: ResolvedAuroraEmitterSimulationTimelineKey,
  staticValue: number | undefined
): number | undefined {
  const timelinePeak = resolveAuroraEmitterTimelinePeakValue(simulation, key);
  if (typeof timelinePeak === "number" && Number.isFinite(timelinePeak) && timelinePeak >= 0) {
    return timelinePeak;
  }
  return typeof staticValue === "number" && Number.isFinite(staticValue) && staticValue >= 0
    ? staticValue
    : undefined;
}

function hasDynamicAuroraEmitterSimulation(
  simulation: ResolvedAuroraEmitterSimulation | null
): boolean {
  if (!simulation) {
    return false;
  }
  if (simulation.p2p === true || simulation.spawnType === 1) {
    return true;
  }
  if (
    resolveAuroraEmitterPositiveBirthrate(simulation) !== undefined &&
    isPositiveAuroraSimulationNumber(simulation.lifeExp)
  ) {
    return true;
  }
  if (
    simulation.timeline &&
    Object.values(simulation.timeline).some((frames) =>
      Array.isArray(frames) &&
      frames.some((frame) => isNonZeroAuroraSimulationNumber(frame.value))
    )
  ) {
    return true;
  }
  return [
    simulation.velocity,
    simulation.randvel,
    simulation.spread,
    simulation.grav,
    simulation.mass,
    simulation.particleRot,
    simulation.drag,
    simulation.xSize,
    simulation.ySize
  ].some(isNonZeroAuroraSimulationNumber);
}

function hasContinuousAuroraEmitterEmission(
  simulation: ResolvedAuroraEmitterSimulation
): boolean {
  return (
    resolveAuroraEmitterPositiveBirthrate(simulation) !== undefined &&
    isPositiveAuroraSimulationNumber(simulation.lifeExp) &&
    simulation.spawnType !== 1
  );
}

function resolveAuroraEmitterUpdateMode(
  emitter: PlaceableAuroraEmitterNode | null
): PlaceableVfxPreviewProfile["motionMode"] | undefined {
  const emitterType = normalizeAuroraEmitterToken(emitter?.emitterType);
  if (emitterType.includes("lightning")) {
    return "lightning";
  }
  if (emitterType.includes("explosion")) {
    return "explosion";
  }
  if (emitterType.includes("trail")) {
    return "trail";
  }
  if (emitterType.includes("single")) {
    return "single";
  }
  if (emitterType.includes("fountain")) {
    return "fountain";
  }
  return undefined;
}

function resolveAuroraEmitterDetonateEvents(
  emitter: PlaceableAuroraEmitterNode | null
): ResolvedAuroraEmitterAnimationEvent[] {
  const events = emitter?.events;
  if (!Array.isArray(events)) {
    return [];
  }
  return events
    .map((event): ResolvedAuroraEmitterAnimationEvent | null => {
      if (
        typeof event.time !== "number" ||
        !Number.isFinite(event.time) ||
        event.time < 0 ||
        typeof event.type !== "string"
      ) {
        return null;
      }
      const type = event.type.trim();
      if (!normalizeAuroraEmitterToken(type).includes("detonate")) {
        return null;
      }
      const animationName =
        typeof event.animationName === "string" && event.animationName.trim().length > 0
          ? event.animationName.trim()
          : undefined;
      return {
        time: event.time,
        type,
        ...(animationName ? { animationName } : {})
      };
    })
    .filter((event): event is ResolvedAuroraEmitterAnimationEvent => Boolean(event))
    .sort((left, right) => left.time - right.time);
}

function resolveAuroraEmitterDetonateControllerEvents(
  simulation: ResolvedAuroraEmitterSimulation | null
): ResolvedAuroraEmitterAnimationEvent[] {
  if (!simulation) {
    return [];
  }
  const timelineEvents = (simulation.timeline?.detonate ?? [])
    .map((frame): ResolvedAuroraEmitterAnimationEvent | null => {
      if (
        typeof frame.time !== "number" ||
        !Number.isFinite(frame.time) ||
        frame.time < 0 ||
        !isPositiveAuroraSimulationNumber(frame.value)
      ) {
        return null;
      }
      return {
        time: frame.time,
        type: "detonatekey"
      };
    })
    .filter((event): event is ResolvedAuroraEmitterAnimationEvent => event !== null);
  if (timelineEvents.length > 0) {
    return timelineEvents.sort((left, right) => left.time - right.time);
  }
  return isPositiveAuroraSimulationNumber(simulation.detonate)
    ? [{ time: 0, type: "detonate" }]
    : [];
}

function filterAuroraEmitterDetonateEventsForAnimation(
  events: ResolvedAuroraEmitterAnimationEvent[],
  selectedAnimationName: string | undefined
): ResolvedAuroraEmitterAnimationEvent[] {
  const selectedAnimationToken = normalizeAuroraEmitterToken(selectedAnimationName);
  if (!selectedAnimationToken) {
    return events;
  }
  return events.filter((event) => {
    const eventAnimationToken = normalizeAuroraEmitterToken(event.animationName);
    return !eventAnimationToken || eventAnimationToken === selectedAnimationToken;
  });
}

function applyAuroraEmitterUpdateModeToPreviewProfile(
  profile: PlaceableVfxPreviewProfile,
  emitter: PlaceableAuroraEmitterNode | null,
  objectRadius: number,
  selectedAnimationName?: string
): PlaceableVfxPreviewProfile {
  const motionMode = resolveAuroraEmitterUpdateMode(emitter);
  if (!motionMode) {
    return profile;
  }

  const next: PlaceableVfxPreviewProfile = {
    ...profile,
    motionMode
  };

  if (motionMode === "fountain" && profile.motionMode === "trail") {
    if (profile.fountainTrailPreviewMode) {
      return {
        ...profile,
        motionMode: "trail",
        alignToParticleDirection: true,
        emissionMode: undefined,
        loopEmission: false,
        count: 0,
        particleCountSource: 0,
        particleCountPreviewMode: "trail-distance-stationary-source-count",
        zeroMotionPreviewMode: undefined
      };
    }
    if (profile.sourceBirthrateGateBlocked || profile.sourceLifeExpGateBlocked) {
      return {
        ...profile,
        motionMode: "trail",
        emissionMode: "continuous",
        loopEmission: false,
        count: 0,
        particleCountSource: 0,
        particleCountPreviewMode: "birthrate-lifetime-source-count",
        zeroMotionPreviewMode: undefined,
        emissionGatePreviewMode: "source-birthrate-lifeexp-positive-gate",
        emissionDiagnostics: [
          ...(profile.sourceBirthrateGateBlocked
            ? [
                "VFX_FOUNTAIN_BIRTHRATE_POSITIVE_GATE_REQUIRED",
                "VFX_FOUNTAIN_TRAIL_NONPOSITIVE_RATE_CLEARS_RESIDUAL"
              ]
            : []),
          ...(profile.sourceLifeExpGateBlocked
            ? [
                "VFX_RUNTIME_LIFEEXP_ZERO_DRAW_GATE",
                "VFX_RUNTIME_LIFEEXP_PREVIEW_CLAMP_FORBIDDEN"
              ]
            : [])
        ]
      };
    }
    return {
      ...profile,
      motionMode: "trail",
      emissionMode: "continuous",
      loopEmission: true
    };
  }

  if (motionMode === "fountain" && (profile.sourceBirthrateGateBlocked || profile.sourceLifeExpGateBlocked)) {
    next.count = 0;
    next.particleCountSource = 0;
    next.particleCountPreviewMode = "birthrate-lifetime-source-count";
    next.emissionMode = "continuous";
    next.loopEmission = false;
    next.zeroMotionPreviewMode = undefined;
    next.emissionGatePreviewMode = "source-birthrate-lifeexp-positive-gate";
    next.emissionDiagnostics = [
      ...(profile.sourceBirthrateGateBlocked
        ? [
            "VFX_FOUNTAIN_BIRTHRATE_POSITIVE_GATE_REQUIRED",
            "VFX_FOUNTAIN_NORMAL_ACCUMULATOR_ZERO_RESET_REQUIRED"
          ]
        : []),
      ...(profile.sourceLifeExpGateBlocked
        ? [
            "VFX_RUNTIME_LIFEEXP_ZERO_DRAW_GATE",
            "VFX_RUNTIME_LIFEEXP_PREVIEW_CLAMP_FORBIDDEN"
          ]
        : [])
    ];
    return next;
  }

  if (motionMode === "single") {
    const loop = emitter?.sourceState?.loop === true;
    next.emissionMode = "single";
    next.loopEmission = loop;
    next.count = 1;
    next.radius = 0;
    next.drift = 0;
    next.height = 0;
    next.singlePreviewMode = loop
      ? "aurora-single-loop-age-reset-existing-particle"
      : "aurora-single-max-one-active";
    next.singleDiagnostics = [
      "VFX_SINGLE_MAX_ONE_ACTIVE_REQUIRED",
      ...(loop
        ? [
            "VFX_SINGLE_LOOP_AGE_RESET_REQUIRED",
            "VFX_SINGLE_LOOP_DOES_NOT_ALLOCATE_REPLACEMENT",
            "VFX_SINGLE_LOOP_NOT_POC_RESPAWN"
          ]
        : [])
    ];
    next.baseLift = Math.max(next.baseLift, objectRadius * 0.04);
    next.sizeMin = Math.max(next.sizeMin, objectRadius * 0.42);
    next.sizeMax = Math.max(next.sizeMax, next.sizeMin);
    return next;
  }

  if (motionMode === "explosion") {
    const sourceDetonateEvents = [
      ...resolveAuroraEmitterDetonateEvents(emitter),
      ...(profile.detonateControllerEvents ?? [])
    ].sort((left, right) => left.time - right.time);
    const detonateEvents = filterAuroraEmitterDetonateEventsForAnimation(
      sourceDetonateEvents,
      selectedAnimationName
    );
    const blastRadius = profile.blastRadius;
    const blastLength = profile.blastLength;
    const evaluatedBirthrate =
      typeof next.birthrate === "number" && Number.isFinite(next.birthrate)
        ? next.birthrate
        : undefined;
    const evaluatedLifeSeconds =
      typeof next.lifeSeconds === "number" && Number.isFinite(next.lifeSeconds)
        ? next.lifeSeconds
        : undefined;
    const sourceBurstCount =
      evaluatedBirthrate !== undefined &&
      evaluatedBirthrate > 0 &&
      evaluatedLifeSeconds !== undefined &&
      evaluatedLifeSeconds > 0
        ? Math.round(clampNumber(evaluatedBirthrate * evaluatedLifeSeconds, 0, 48))
        : 0;
    next.explosionRequestedSpawnCount = sourceBurstCount;
    next.kind = "spark";
    next.emissionMode = "burst";
    next.loopEmission = false;
    next.baseLift = Math.max(next.baseLift, objectRadius * 0.08);
    next.baseOpacity = Math.max(next.baseOpacity, 0.62);
    next.additive = true;
    if (detonateEvents.length > 0) {
      if (sourceBurstCount <= 0) {
        next.count = 0;
        next.particleCountSource = 0;
        next.particleCountPreviewMode = "birthrate-lifetime-source-count";
        next.detonateEvents = detonateEvents;
        next.requiresDetonateEvent = false;
        next.detonatePreviewMode = "detonate-event-scheduled-muted-zero-spawn";
        next.detonateDiagnostics = [
          "VFX_EXPLOSION_SPAWN_COUNT_NONZERO_GATE_REQUIRED",
          "VFX_EXPLOSION_BIRTHRATE_ZERO_GATE_REQUIRED",
          "VFX_EXPLOSION_DETONATE_LATCH_CLEAR_REQUIRED"
        ];
        return next;
      }
      next.count = sourceBurstCount;
      next.radius = Math.max(next.radius, blastRadius ?? objectRadius * 0.18);
      next.height = Math.max(next.height, blastLength ?? objectRadius * 0.8);
      next.drift = Math.max(
        next.drift,
        blastRadius !== undefined ? blastRadius * 0.35 : objectRadius * 0.28
      );
      next.detonateEvents = detonateEvents;
      next.requiresDetonateEvent = false;
      next.detonatePreviewMode = "detonate-event-scheduled-preview";
      if (selectedAnimationName && sourceDetonateEvents.length > detonateEvents.length) {
        next.detonateEventFilterPreviewMode = "animation-scoped-detonate-events";
        next.detonateEventFilterAnimationName = selectedAnimationName;
        next.detonateEventSourceCount = sourceDetonateEvents.length;
      }
      return next;
    }
    if (selectedAnimationName && sourceDetonateEvents.length > 0) {
      next.count = 0;
      next.birthrate = 0;
      next.birthrateKeyframes = undefined;
      next.loopEmission = false;
      next.requiresDetonateEvent = true;
      next.detonatePreviewMode = "detonate-event-filtered-by-animation-muted";
      next.detonateDiagnostics = [
        "VFX_EXPLOSION_DETONATE_LATCH_PER_EMITTER_REQUIRED",
        "VFX_EXPLOSION_DETONATE_ONE_SHOT_GUARD_REQUIRED"
      ];
      next.detonateEventFilterPreviewMode = "animation-scoped-detonate-events";
      next.detonateEventFilterAnimationName = selectedAnimationName;
      next.detonateEventSourceCount = sourceDetonateEvents.length;
      return next;
    }
    next.count = 0;
    next.birthrate = 0;
    next.birthrateKeyframes = undefined;
    next.particleCountSource = 0;
    next.particleCountPreviewMode = "birthrate-lifetime-source-count";
    next.loopEmission = false;
    next.requiresDetonateEvent = true;
    next.detonatePreviewMode = "detonate-event-required-muted";
    next.detonateDiagnostics = [
      "VFX_EXPLOSION_NO_DETONATE_NO_FALLBACK_BURST",
      "VFX_POC_EXPLOSION_FALLBACK_BURST_PREVIEW_ONLY",
      "VFX_EXPLOSION_DETONATE_LATCH_PER_EMITTER_REQUIRED",
      "VFX_EXPLOSION_DETONATE_ONE_SHOT_GUARD_REQUIRED",
      "VFX_EXPLOSION_DETONATE_LATCH_CLEAR_REQUIRED"
    ];
    return next;
  }

  if (motionMode === "lightning") {
    const lightningScale = clampNumber(profile.lightningScale ?? 1, 0.1, 8);
    const lightningRadius = profile.lightningRadius;
    const lightningDelay = profile.lightningDelay;
    next.kind = "beam";
    next.emissionMode = "single";
    next.loopEmission = true;
    next.count = 1;
    if (typeof lightningDelay === "number" && lightningDelay > 0) {
      next.lifeSeconds = clampNumber(lightningDelay, 0.05, 30);
    }
    next.radius = Math.max(next.radius, lightningRadius ?? objectRadius * 0.18);
    next.height = Math.max(next.height, objectRadius * 2.6 * lightningScale);
    next.drift = lightningRadius !== undefined ? Math.max(next.drift, lightningRadius * 0.18) : 0;
    next.baseLift = Math.max(next.baseLift, objectRadius * 0.12);
    next.baseOpacity = Math.max(next.baseOpacity, 0.74);
    next.sizeMin = Math.max(next.sizeMin, objectRadius * 0.56 * lightningScale);
    next.sizeMax = Math.max(next.sizeMax, next.sizeMin * 1.8);
    next.blurStretch = Math.max(next.blurStretch ?? 1, 1.8 + lightningScale * 0.6);
    next.additive = true;
    return next;
  }

  if (motionMode === "trail") {
    const isMotionBlurLayout = profile.layout === "motion_blur";
    if (!isMotionBlurLayout) {
      next.layout = "particle_aligned";
    }
    next.alignToParticleDirection = true;
    if (profile.fountainTrailPreviewMode) {
      next.emissionMode = undefined;
      next.loopEmission = false;
      next.count = 0;
      next.particleCountSource = 0;
      next.particleCountPreviewMode = "trail-distance-stationary-source-count";
      next.zeroMotionPreviewMode = undefined;
      next.additive = true;
      return next;
    }
    next.emissionMode = "continuous";
    next.loopEmission = true;
    next.count = Math.max(next.count, 12);
    next.radius = Math.max(next.radius, objectRadius * 0.24);
    next.height = Math.max(next.height, objectRadius * 1.1);
    next.drift = Math.max(next.drift, objectRadius * 0.28);
    next.baseLift = Math.max(next.baseLift, objectRadius * 0.06);
    if (!isMotionBlurLayout) {
      next.blurStretch = Math.max(next.blurStretch ?? 1, 2.25);
      next.trailStretch = Math.max(next.trailStretch ?? 1, 2.8);
    }
    next.additive = true;
    return next;
  }

  if (motionMode === "fountain") {
    next.emissionMode = "continuous";
    next.loopEmission = true;
    return next;
  }

  return next;
}

function resolveAuroraEmitterP2PMode(
  simulation: ResolvedAuroraEmitterSimulation
): "bezier" | "gravity" | "unknown" {
  const token = normalizeAuroraEmitterToken(simulation.p2pType);
  if (token.includes("bezier") || token === "0") {
    return "bezier";
  }
  if (token.includes("grav") || token === "1") {
    return "gravity";
  }
  return "unknown";
}

function applyAuroraEmitterSimulationToPreviewProfile(
  profile: PlaceableVfxPreviewProfile,
  simulation: ResolvedAuroraEmitterSimulation | null,
  objectRadius: number,
  p2pReferenceTarget: ResolvedAuroraEmitterReferenceTarget | null = null
): PlaceableVfxPreviewProfile {
  if (!simulation) {
    return profile;
  }

  const next: PlaceableVfxPreviewProfile = { ...profile };
  const modelUnitScale = Math.max(objectRadius, 0.5);
  const centimeterScale = modelUnitScale / 100;
  const motionUnitScale = centimeterScale;
  const xSizeValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "xSize",
    simulation.xSize
  );
  const ySizeValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "ySize",
    simulation.ySize
  );
  const hasXSizeSource = typeof xSizeValue === "number";
  const hasYSizeSource = typeof ySizeValue === "number";
  const hasPositiveSurfaceSource =
    (hasXSizeSource && (xSizeValue ?? 0) > 0) ||
    (hasYSizeSource && (ySizeValue ?? 0) > 0);
  const hasPointSurfaceSource =
    (hasXSizeSource || hasYSizeSource) &&
    (xSizeValue ?? 0) <= 0 &&
    (ySizeValue ?? 0) <= 0;
  const surfaceWidth = hasXSizeSource
    ? clampNumber(Math.max(0, xSizeValue ?? 0) * centimeterScale, 0, objectRadius * 8)
    : undefined;
  const surfaceDepth = hasYSizeSource
    ? clampNumber(Math.max(0, ySizeValue ?? 0) * centimeterScale, 0, objectRadius * 8)
    : undefined;
  const effectiveSurfaceWidth =
    hasXSizeSource && (xSizeValue ?? 0) >= AURORA_EMITTER_SPAWN_RECTANGLE_AXIS_GATE_CM
      ? surfaceWidth
      : undefined;
  const effectiveSurfaceDepth =
    hasYSizeSource && (ySizeValue ?? 0) >= AURORA_EMITTER_SPAWN_RECTANGLE_AXIS_GATE_CM
      ? surfaceDepth
      : undefined;
  const hasEffectiveSurfaceSource =
    (effectiveSurfaceWidth ?? 0) > 0 || (effectiveSurfaceDepth ?? 0) > 0;
  const hasBelowThresholdSurfaceAxis =
    (hasXSizeSource &&
      (xSizeValue ?? 0) > 0 &&
      (xSizeValue ?? 0) < AURORA_EMITTER_SPAWN_RECTANGLE_AXIS_GATE_CM) ||
    (hasYSizeSource &&
      (ySizeValue ?? 0) > 0 &&
      (ySizeValue ?? 0) < AURORA_EMITTER_SPAWN_RECTANGLE_AXIS_GATE_CM);
  if (hasPositiveSurfaceSource || hasPointSurfaceSource) {
    next.emitterSurfaceSampling = true;
  }
  if (hasPointSurfaceSource) {
    next.emitterSurfacePreviewMode = "xsize-ysize-point-origin-preview";
    next.emitterSurfaceSamplingPreviewMode = "point-origin-no-random-sampling";
    next.emitterSurfaceDiagnostics = [
      ...(next.emitterSurfaceDiagnostics ?? []),
      "VFX_EMITTER_SPAWN_RECTANGLE_POINT_ORIGIN_REQUIRED"
    ];
  } else if (hasPositiveSurfaceSource) {
    next.emitterSurfaceSamplingPreviewMode = hasEffectiveSurfaceSource
      ? "integer-sign-sampler-preview"
      : "below-threshold-axis-gated-preview";
    next.emitterSurfaceDiagnostics = [
      ...(next.emitterSurfaceDiagnostics ?? []),
      ...(hasBelowThresholdSurfaceAxis ? ["VFX_EMITTER_SPAWN_RECTANGLE_LT4_AXIS_GATE"] : []),
      "VFX_EMITTER_SPAWN_RECTANGLE_INTEGER_SIGN_SAMPLER_REQUIRED",
      "VFX_EMITTER_SPAWN_RECTANGLE_RUNTIME_BASIS_REQUIRED"
    ];
    if (!hasEffectiveSurfaceSource && hasBelowThresholdSurfaceAxis) {
      next.emitterSurfacePreviewMode = "xsize-ysize-axis-gated-preview";
    }
  }
  if (surfaceWidth !== undefined) {
    next.emitterSurfaceWidth = surfaceWidth;
    next.emitterSurfaceWidthSourceCm = xSizeValue ?? 0;
    next.emitterSurfaceEffectiveWidth = effectiveSurfaceWidth ?? 0;
  }
  if (surfaceDepth !== undefined) {
    next.emitterSurfaceDepth = surfaceDepth;
    next.emitterSurfaceDepthSourceCm = ySizeValue ?? 0;
    next.emitterSurfaceEffectiveDepth = effectiveSurfaceDepth ?? 0;
  }
  if (hasXSizeSource || hasYSizeSource) {
    next.emitterSurfaceUnitScale = centimeterScale;
  }
  const staticWorldZLayout =
    profile.layout === "world_z_billboard" || profile.layout === "world_z_aligned";
  const staticSheetLayout = staticWorldZLayout || profile.layout === "local_z_billboard";
  const surfaceBoundWorldZSheet =
    profile.layout === "world_z_sheet" && profile.kind === "liquid";
  const staticWorldZSymbol =
    staticWorldZLayout &&
    profile.height <= 0 &&
    profile.radius <= 0;
  const birthrateKeyframes = simulation.timeline?.birthrate;
  const lifeExpKeyframes = simulation.timeline?.lifeExp;
  const detonateKeyframes = simulation.timeline?.detonate;
  const detonateControllerEvents = resolveAuroraEmitterDetonateControllerEvents(simulation);
  const lifeExpValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "lifeExp",
    simulation.lifeExp
  );
  const lifeSeconds =
    typeof lifeExpValue === "number" && lifeExpValue > 0
      ? clampNumber(lifeExpValue, 0.12, 30)
      : undefined;
  if (lifeSeconds !== undefined) {
    next.lifeSeconds = lifeSeconds;
  }
  const previewBirthrate = resolveAuroraEmitterPositiveBirthrate(simulation);
  const hasAuthoredBirthrate =
    (typeof simulation.birthrate === "number" && Number.isFinite(simulation.birthrate)) ||
    (Array.isArray(birthrateKeyframes) && birthrateKeyframes.length > 0);
  const hasAuthoredLifeExp =
    (typeof simulation.lifeExp === "number" && Number.isFinite(simulation.lifeExp)) ||
    (Array.isArray(lifeExpKeyframes) && lifeExpKeyframes.length > 0);
  if (simulation.timeline) {
    next.simulationTimeline = simulation.timeline;
  }
  if (simulation.colorTimeline) {
    next.particleColorTimeline = simulation.colorTimeline;
  }
  if (detonateControllerEvents.length > 0) {
    next.detonateControllerEvents = detonateControllerEvents;
    next.detonateControllerPreviewMode = "detonate-controller-latch-preview";
  }
  if (detonateKeyframes) {
    next.detonateControllerTimeline = detonateKeyframes;
  }
  if (typeof simulation.detonate === "number" && Number.isFinite(simulation.detonate)) {
    next.detonateControllerValue = simulation.detonate;
  }
  if (birthrateKeyframes) {
    next.birthrateKeyframes = birthrateKeyframes;
  }
  if (typeof simulation.birthrate === "number" && Number.isFinite(simulation.birthrate)) {
    next.birthrate = simulation.birthrate;
  }
  if (previewBirthrate !== undefined) {
    next.birthrate = previewBirthrate;
  }
  if (hasAuthoredBirthrate && previewBirthrate === undefined) {
    next.sourceBirthrateGateBlocked = true;
  }
  if (hasAuthoredLifeExp && lifeSeconds === undefined) {
    next.sourceLifeExpGateBlocked = true;
  }
  const explicitZeroKinematics = hasExplicitAuroraZeroKinematics(simulation);
  const continuousTemporalEmission = hasContinuousAuroraEmitterEmission(simulation);
  const hasEmitterSurface = (surfaceWidth ?? 0) > 0 || (surfaceDepth ?? 0) > 0;
  const zeroMotionStaticSheetSymbol =
    staticSheetLayout &&
    explicitZeroKinematics &&
    !continuousTemporalEmission &&
    !hasEmitterSurface;
  const zeroMotionStaticWorldZSymbol =
    staticWorldZSymbol &&
    explicitZeroKinematics &&
    !continuousTemporalEmission &&
    !hasEmitterSurface;
  const zeroMotionWorldZSymbol =
    staticWorldZSymbol &&
    explicitZeroKinematics &&
    !continuousTemporalEmission &&
    !hasEmitterSurface;
  const shouldPreserveStaticSheetSymbol =
    zeroMotionStaticSheetSymbol ||
    zeroMotionStaticWorldZSymbol ||
    (staticWorldZSymbol &&
      !continuousTemporalEmission &&
      (explicitZeroKinematics || !hasDynamicAuroraEmitterSimulation(simulation)));

  if (typeof simulation.particleRot === "number" && Number.isFinite(simulation.particleRot)) {
    next.particleRotationRateSource = simulation.particleRot;
    next.particleRotationRate = resolveAuroraParticleRotationRateRadians(simulation.particleRot);
    next.particleRotationRatePreviewMode = "aurora-particle-rot-rps-to-radians";
  }
  if (simulation.timeline?.particleRot?.length) {
    next.particleRotationRatePreviewMode = "aurora-particle-rot-keyframe-rps-to-radians";
  }
  if (simulation.affectedByWind === true) {
    next.affectedByWind = true;
    next.windDrift = Math.max(next.windDrift ?? 0, objectRadius * 0.11);
    if (!shouldPreserveStaticSheetSymbol) {
      next.drift = Math.max(next.drift, objectRadius * 0.08);
    }
  } else if (simulation.affectedByWind === false) {
    next.affectedByWind = false;
  }

  const blastRadiusValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "blastRadius",
    simulation.blastRadius
  );
  const blastLengthValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "blastLength",
    simulation.blastLength
  );
  if (typeof blastRadiusValue === "number") {
    next.blastRadius = clampNumber(blastRadiusValue * modelUnitScale, 0, objectRadius * 12);
  }
  if (typeof blastLengthValue === "number") {
    next.blastLength = clampNumber(blastLengthValue * modelUnitScale, 0, objectRadius * 12);
  }
  const lightningScaleValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "lightningScale",
    simulation.lightningScale
  );
  const lightningDelayValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "lightningDelay",
    simulation.lightningDelay
  );
  const lightningRadiusValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "lightningRadius",
    simulation.lightningRadius
  );
  if (typeof lightningScaleValue === "number") {
    next.lightningScale = clampNumber(lightningScaleValue, 0, 8);
  }
  if (typeof lightningDelayValue === "number") {
    next.lightningDelay = clampNumber(lightningDelayValue, 0, 30);
  }
  if (typeof lightningRadiusValue === "number") {
    next.lightningRadius = clampNumber(lightningRadiusValue * modelUnitScale, 0, objectRadius * 12);
  }
  if (typeof simulation.velocity === "number" && Number.isFinite(simulation.velocity)) {
    next.particleVelocity = simulation.velocity * motionUnitScale;
    next.emitterMotionUnitScale = motionUnitScale;
  }
  if (typeof simulation.randvel === "number" && Number.isFinite(simulation.randvel)) {
    next.particleRandomVelocity = Math.max(0, simulation.randvel) * motionUnitScale;
    next.particleRandomVelocityGate = AURORA_EMITTER_RANDVEL_GATE * motionUnitScale;
    next.emitterMotionUnitScale = motionUnitScale;
  }
  if (typeof simulation.spread === "number" && Number.isFinite(simulation.spread)) {
    next.particleSpreadRadians = resolveAuroraEmitterSpreadRadians(Math.max(0, simulation.spread));
  }
  if (
    simulation.timeline?.velocity?.length ||
    simulation.timeline?.randvel?.length ||
    simulation.timeline?.mass?.length
  ) {
    next.emitterMotionUnitScale = motionUnitScale;
  }
  if (simulation.timeline?.randvel?.length) {
    next.particleRandomVelocityGate = AURORA_EMITTER_RANDVEL_GATE * motionUnitScale;
  }
  const accelerationSource =
    typeof simulation.mass === "number" && Number.isFinite(simulation.mass)
      ? -simulation.mass
      : undefined;
  if (typeof accelerationSource === "number") {
    next.particleAccelerationY = accelerationSource * motionUnitScale;
    next.emitterMotionUnitScale = motionUnitScale;
  }
  if (simulation.bounce === true) {
    next.bounceCoefficient = clampNumber(
      typeof simulation.bounceCoefficient === "number" &&
        Number.isFinite(simulation.bounceCoefficient)
        ? simulation.bounceCoefficient
        : 1,
      0,
      1
    );
    next.bouncePreviewMode = "source-bounce-floor-plane-preview";
    next.bounceDiagnostics = [
      "VFX_PARTICLE_BOUNCE_FLOOR_PLANE_PREVIEW",
      "VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED"
    ];
  }
  if (typeof simulation.inherit === "boolean") {
    next.inherit = simulation.inherit;
  }
  if (typeof simulation.inheritVel === "boolean") {
    next.inheritVel = simulation.inheritVel;
  }
  if (typeof simulation.inheritLocal === "boolean") {
    next.inheritLocal = simulation.inheritLocal;
  }
  if (typeof simulation.inheritPart === "boolean") {
    next.inheritPart = simulation.inheritPart;
  }
  const inheritParticleStretch = simulation.inheritPart === true && simulation.inheritVel === true;
  if (simulation.inheritPart === true) {
    if (inheritParticleStretch) {
      next.inheritParticlePreviewMode = "inherit-velocity-particle-stretch";
      next.inheritDiagnostics = [
        "VFX_INHERIT_PARTICLE_STRETCH_REQUIRES_INHERITVEL",
        "VFX_INHERIT_PARTICLE_SOURCE_FLAGS_APPLIED"
      ];
    } else {
      next.inheritParticlePreviewMode = "inherit-particle-requires-inherit-velocity";
      next.inheritDiagnostics = [
        "VFX_INHERIT_PARTICLE_STRETCH_REQUIRES_INHERITVEL",
        "VFX_INHERIT_PARTICLE_SOURCE_FLAG_PRESERVED_NO_STRETCH"
      ];
    }
  }
  const motionBlurRenderer = profile.layout === "motion_blur";
  const particleAlignedBlurRenderer =
    profile.layout === "particle_aligned" && profile.alignToParticleDirection === true;
  const shouldApplyBlurStretch =
    simulation.spawnType === 1 ||
    inheritParticleStretch ||
    particleAlignedBlurRenderer ||
    motionBlurRenderer;
  const hasBlurLengthTimeline = Boolean(simulation.timeline?.blurLength?.length);
  const rawBlurLength =
    typeof simulation.blurLengthRaw === "number" ? simulation.blurLengthRaw : simulation.blurLength;
  const positiveStaticBlurLength =
    typeof simulation.blurLength === "number" && simulation.blurLength > 0;
  const staticBlurLength = positiveStaticBlurLength ? simulation.blurLength : undefined;
  if (
    shouldApplyBlurStretch &&
    (positiveStaticBlurLength || (motionBlurRenderer && hasBlurLengthTimeline))
  ) {
    next.blurLengthSource = staticBlurLength ?? 1;
    if (motionBlurRenderer) {
      next.motionBlurRawBlurLengthSource = rawBlurLength;
      next.motionBlurBlurLengthPreviewMode = "source-blurlength-previous-position-blend";
      next.motionBlurPreviewMode = "previous-current-endpoint-pair-preview";
      next.motionBlurDiagnostics = [
        "VFX_MOTION_BLUR_PREVIOUS_CURRENT_ENDPOINT_PAIR",
        "VFX_MOTION_BLUR_BLURLENGTH_PREVIOUS_POSITION_BLEND"
      ];
    } else {
      const sourceBlurStretch = clampNumber(1 + (staticBlurLength ?? 0) * 0.28, 1, 4);
      next.blurStretch = sourceBlurStretch;
      next.blurStretchPreviewMode = "source-blurlength-particle-aligned-stretch";
      if (particleAlignedBlurRenderer && simulation.spawnType !== 1 && !inheritParticleStretch) {
        next.trailStretch = sourceBlurStretch;
      }
    }
  } else if (motionBlurRenderer) {
    next.blurLengthSource = 1;
    next.motionBlurRawBlurLengthSource = rawBlurLength;
    next.motionBlurBlurLengthPreviewMode =
      typeof rawBlurLength === "number" && rawBlurLength <= 0
        ? "nonpositive-blurlength-diagnostic-default-1-0"
        : "default-blurlength-1-0";
    next.motionBlurPreviewMode = "previous-current-endpoint-pair-preview";
    next.motionBlurDiagnostics = [
      "VFX_MOTION_BLUR_PREVIOUS_CURRENT_ENDPOINT_PAIR",
      "VFX_MOTION_BLUR_DEFAULT_BLURLENGTH_1_0",
      ...(typeof rawBlurLength === "number" && rawBlurLength <= 0
        ? [
            "VFX_MOTION_BLUR_BLURLENGTH_NONPOSITIVE_DIAGNOSTIC_REQUIRED",
            "VFX_MOTION_BLUR_BLURLENGTH_ZERO_UNVERIFIED"
          ]
        : [])
    ];
  }
  if (simulation.spawnType === 1) {
    if (!motionBlurRenderer) {
      next.layout = "particle_aligned";
    }
    next.motionMode = "trail";
    next.alignToParticleDirection = true;
    next.emissionMode = undefined;
    next.loopEmission = false;
    next.count = 0;
    next.particleCountSource = 0;
    next.particleCountPreviewMode = "trail-distance-stationary-source-count";
    next.fountainTrailPreviewMode = "movement-distance-emission-stationary-muted-preview";
    next.fountainTrailSpacingMeters =
      previewBirthrate !== undefined ? 1 / previewBirthrate : undefined;
    next.fountainTrailDiagnostics = [
      "VFX_FOUNTAIN_TRAIL_DISTANCE_EMISSION_REQUIRED",
      "VFX_FOUNTAIN_TRAIL_RESIDUAL_VECTOR_REQUIRED",
      "VFX_FOUNTAIN_TRAIL_DISTRIBUTES_ALONG_MOTION",
      "VFX_FOUNTAIN_TRAIL_STATIONARY_PREVIEW_MUTED",
      ...(previewBirthrate === undefined
        ? ["VFX_FOUNTAIN_TRAIL_NONPOSITIVE_RATE_CLEARS_RESIDUAL"]
        : [])
    ];
    if (!motionBlurRenderer) {
      next.trailStretch = Math.max(next.trailStretch ?? 1, next.blurStretch ?? 1, 2.2);
    }
  }
  if (inheritParticleStretch) {
    next.blurStretch = Math.max(next.blurStretch ?? 1, 1.45);
  }
  if (typeof simulation.deadspace === "number" && simulation.deadspace > 0) {
    next.deadspaceDegrees = clampNumber(simulation.deadspace, 0, 180);
    next.deadspaceAngleRadians = THREE.MathUtils.degToRad(next.deadspaceDegrees);
  }
  if (simulation.p2p === true) {
    if (p2pReferenceTarget) {
      const p2pMode = resolveAuroraEmitterP2PMode(simulation);
      next.p2pPreviewMode = "reference-target-preview";
      next.p2pReferencePreviewMode = "source-reference-node-target";
      next.p2pTargetNodeName = p2pReferenceTarget.nodeName;
      next.p2pTargetOffset = p2pReferenceTarget.mappedPosition.clone();
      next.p2pMotionMode = p2pMode;
      next.p2pBezier2 =
        typeof simulation.p2pBezier2 === "number" ? simulation.p2pBezier2 : undefined;
      next.p2pBezier3 =
        typeof simulation.p2pBezier3 === "number" ? simulation.p2pBezier3 : undefined;
      next.p2pBezierPreviewMode =
        p2pMode === "bezier" ? "source-target-tangent-arc-preview" : undefined;
      next.p2pGravity = typeof simulation.grav === "number" ? simulation.grav : undefined;
      next.p2pDrag = typeof simulation.drag === "number" ? simulation.drag : undefined;
      next.p2pThreshold =
        typeof simulation.threshold === "number" ? simulation.threshold * modelUnitScale : undefined;
      if (simulation.timeline?.threshold?.length) {
        next.p2pThresholdUnitScale = modelUnitScale;
      }
      next.p2pCombineTime =
        typeof simulation.combineTime === "number" &&
        Number.isFinite(simulation.combineTime) &&
        simulation.combineTime > 0
          ? simulation.combineTime
          : undefined;
      const p2pDiagnostics = [
        "VFX_P2P_TARGET_SOURCE_REFERENCE_NODE_APPLIED",
        p2pMode === "bezier"
          ? "VFX_P2P_BEZIER_TIME_CURVE_PREVIEW"
          : p2pMode === "gravity"
            ? "VFX_P2P_GRAVITY_REFERENCE_TARGET_PREVIEW"
            : "VFX_P2P_SELECTOR_SOURCE_UNKNOWN_PREVIEW"
      ];
      if (p2pMode === "bezier") {
        p2pDiagnostics.push("VFX_P2P_BEZIER_SOURCE_TARGET_TANGENT_ARC_PREVIEW");
      }
      if (next.p2pCombineTime !== undefined) {
        p2pDiagnostics.push(
          p2pMode === "gravity"
            ? "VFX_P2P_COMBINETIME_GRAVITY_DELAY_PREVIEW"
            : "VFX_P2P_COMBINETIME_BEZIER_TRANSITION_PREVIEW"
        );
      }
      if (next.p2pThreshold !== undefined || simulation.timeline?.threshold?.length) {
        p2pDiagnostics.push("VFX_P2P_THRESHOLD_TARGET_KILL_DISTANCE_PREVIEW");
      }
      next.p2pDiagnostics = p2pDiagnostics;
    } else {
      next.p2pPreviewMode = "preserved-unmapped";
      next.p2pReferencePreviewMode = "target-reference-required";
      next.p2pDiagnostics = [
        "VFX_P2P_TARGET_RUNTIME_POINTER_REQUIRED",
        "VFX_P2P_TARGET_ORIGIN_FALLBACK_FORBIDDEN",
        ...(typeof simulation.grav === "number" && Number.isFinite(simulation.grav)
          ? ["VFX_P2P_GRAV_TARGET_ENDPOINT_REQUIRED"]
          : []),
        ...(typeof simulation.drag === "number" && Number.isFinite(simulation.drag)
          ? ["VFX_P2P_DRAG_TIME_EXPONENT_REQUIRED"]
          : [])
      ];
    }
  } else if (simulation.p2p === false) {
    next.p2pPreviewMode = "disabled";
  }

  if (
    !shouldPreserveStaticSheetSymbol &&
    simulation.spawnType !== 1 &&
    previewBirthrate !== undefined &&
    lifeSeconds !== undefined
  ) {
    const sourceParticleCount = previewBirthrate * lifeSeconds;
    const maxParticleCount = resolveAuroraEmitterPreviewParticleCountLimit(
      next,
      surfaceBoundWorldZSheet,
      hasEmitterSurface
    );
    next.particleCountSource = sourceParticleCount;
    next.particleCountLimit = maxParticleCount;
    next.particleCountPreviewMode =
      sourceParticleCount > maxParticleCount
        ? "birthrate-lifetime-preview-capped"
        : "birthrate-lifetime-source-count";
    next.count = Math.max(1, Math.round(clampNumber(sourceParticleCount, 1, maxParticleCount)));
    const shouldUseNormalFountainAccumulatorPreview =
      simulation.spawnType !== 1 &&
      simulation.p2p !== true &&
      next.layout === "camera_billboard";
    if (shouldUseNormalFountainAccumulatorPreview) {
      next.fountainNormalPreviewMode = "normal-spawn-threshold-scheduled-preview";
      next.fountainNormalSpawnIntervalSeconds = 1 / previewBirthrate;
      next.fountainNormalDiagnostics = [
        "VFX_FOUNTAIN_NORMAL_SPAWN_ACCUMULATOR_REQUIRED",
        "VFX_FOUNTAIN_NORMAL_ACCUMULATOR_ZERO_RESET_REQUIRED"
      ];
    }
  }

  if (zeroMotionWorldZSymbol) {
    next.count = 1;
    if (next.particleCountSource !== undefined) {
      next.particleCountPreviewMode = "zero-motion-world-z-symbol-single-draw";
    }
  }

  const sizeStartValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "sizeStart",
    simulation.sizeStart
  );
  const sizeMidValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "sizeMid",
    simulation.sizeMid
  );
  const sizeEndValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "sizeEnd",
    simulation.sizeEnd
  );
  const sizeStartYValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "sizeStartY",
    simulation.sizeStartY
  );
  const sizeMidYValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "sizeMidY",
    simulation.sizeMidY
  );
  const sizeEndYValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "sizeEndY",
    simulation.sizeEndY
  );
  const sizeCandidates = [
    sizeStartValue,
    sizeMidValue,
    sizeEndValue,
    sizeStartYValue,
    sizeMidYValue,
    sizeEndYValue
  ].filter((value): value is number => typeof value === "number" && value > 0);
  const hasSourceSizeCurve =
    typeof sizeStartValue === "number" ||
    typeof sizeMidValue === "number" ||
    typeof sizeEndValue === "number" ||
    typeof sizeStartYValue === "number" ||
    typeof sizeMidYValue === "number" ||
    typeof sizeEndYValue === "number";
  const particleSizeScale = resolveAuroraEmitterParticleSizeScale(
    next,
    objectRadius,
    modelUnitScale
  );
  const maxParticleSize = objectRadius * 12;
  if (sizeCandidates.length > 0) {
    const scaledSizes = sizeCandidates.map((value) => value * particleSizeScale);
    const minSize = Math.min(...scaledSizes);
    const maxSize = Math.max(...scaledSizes);
    next.sizeMin = clampNumber(minSize, objectRadius * 0.06, maxParticleSize);
    next.sizeMax = clampNumber(maxSize, next.sizeMin, maxParticleSize);
    if (typeof sizeStartValue === "number" && sizeStartValue > 0) {
      next.particleSizeStart = clampNumber(
        sizeStartValue * particleSizeScale,
        objectRadius * 0.06,
        maxParticleSize
      );
    }
    if (typeof sizeMidValue === "number" && sizeMidValue > 0) {
      next.particleSizeMid = clampNumber(
        sizeMidValue * particleSizeScale,
        objectRadius * 0.06,
        maxParticleSize
      );
    }
  if (typeof sizeEndValue === "number" && sizeEndValue > 0) {
    next.particleSizeEnd = clampNumber(
      sizeEndValue * particleSizeScale,
      objectRadius * 0.06,
      maxParticleSize
      );
    }
  }
  if (hasSourceSizeCurve) {
    next.particleSizeSourcePreviewMode = "aurora-source-size-linear";
    next.particleSizeTimelineScale = particleSizeScale;
  }
  const hasExplicitZeroYSize =
    (sizeStartYValue === 0 || sizeMidYValue === 0 || sizeEndYValue === 0);
  const shouldHonorSourceZeroYSize =
    next.bubblePreviewMode === "source-bubble-particle-preview";
  const minParticleSizeY = shouldHonorSourceZeroYSize ? 0 : objectRadius * 0.06;
  if (
    typeof sizeStartYValue === "number" &&
    (sizeStartYValue > 0 || (shouldHonorSourceZeroYSize && sizeStartYValue === 0))
  ) {
    next.particleSizeYStart = clampNumber(
      sizeStartYValue * particleSizeScale,
      minParticleSizeY,
      maxParticleSize
    );
  }
  if (
    typeof sizeMidYValue === "number" &&
    (sizeMidYValue > 0 || (shouldHonorSourceZeroYSize && sizeMidYValue === 0))
  ) {
    next.particleSizeYMid = clampNumber(
      sizeMidYValue * particleSizeScale,
      minParticleSizeY,
      maxParticleSize
    );
  }
  if (
    typeof sizeEndYValue === "number" &&
    (sizeEndYValue > 0 || (shouldHonorSourceZeroYSize && sizeEndYValue === 0))
  ) {
    next.particleSizeYEnd = clampNumber(
      sizeEndYValue * particleSizeScale,
      minParticleSizeY,
      maxParticleSize
    );
  }
  if (hasExplicitZeroYSize) {
    next.particleSizeYFallbackPreviewMode = shouldHonorSourceZeroYSize
      ? "source-size-y-zero-honored-for-bubble"
      : "source-size-y-zero-uses-x-axis";
  }
  if (
    !next.bubblePreviewMode &&
    next.layout === "camera_billboard" &&
    hasPositiveSurfaceSource &&
    hasSourceSizeCurve &&
    next.count > 0
  ) {
    const surfaceExtent = Math.max(effectiveSurfaceWidth ?? 0, effectiveSurfaceDepth ?? 0);
    const surfaceVisibilityFloor = clampNumber(
      Math.max(objectRadius * 0.45, surfaceExtent * 0.7),
      objectRadius * 0.45,
      objectRadius * 1.35
    );
    if (next.sizeMin < surfaceVisibilityFloor || next.sizeMax < surfaceVisibilityFloor) {
      next.sizeMin = Math.max(next.sizeMin, surfaceVisibilityFloor);
      next.sizeMax = Math.max(next.sizeMax, surfaceVisibilityFloor);
      next.particleSizeStart =
        next.particleSizeStart === undefined
          ? surfaceVisibilityFloor
          : Math.max(next.particleSizeStart, surfaceVisibilityFloor);
      next.particleSizeMid =
        next.particleSizeMid === undefined
          ? next.particleSizeMid
          : Math.max(next.particleSizeMid, surfaceVisibilityFloor);
      next.particleSizeEnd =
        next.particleSizeEnd === undefined
          ? surfaceVisibilityFloor
          : Math.max(next.particleSizeEnd, surfaceVisibilityFloor);
      next.particleSizeYStart =
        next.particleSizeYStart === undefined
          ? surfaceVisibilityFloor
          : Math.max(next.particleSizeYStart, surfaceVisibilityFloor);
      next.particleSizeYMid =
        next.particleSizeYMid === undefined
          ? next.particleSizeYMid
          : Math.max(next.particleSizeYMid, surfaceVisibilityFloor);
      next.particleSizeYEnd =
        next.particleSizeYEnd === undefined
          ? surfaceVisibilityFloor
          : Math.max(next.particleSizeYEnd, surfaceVisibilityFloor);
      next.particleSizeVisibilityFloorPreviewMode =
        "surface-emitter-catalog-visibility-floor";
    }
  }
  if (next.kind === "beam" && next.layout === "camera_billboard") {
    const beamVisibilityFloor = objectRadius * 0.55;
    if (next.sizeMin < beamVisibilityFloor || next.sizeMax < beamVisibilityFloor) {
      next.sizeMin = Math.max(next.sizeMin, beamVisibilityFloor);
      next.sizeMax = Math.max(next.sizeMax, beamVisibilityFloor);
      next.particleSizeStart =
        next.particleSizeStart === undefined
          ? beamVisibilityFloor
          : Math.max(next.particleSizeStart, beamVisibilityFloor);
      next.particleSizeMid =
        next.particleSizeMid === undefined
          ? next.particleSizeMid
          : Math.max(next.particleSizeMid, beamVisibilityFloor);
      next.particleSizeEnd =
        next.particleSizeEnd === undefined
          ? beamVisibilityFloor
          : Math.max(next.particleSizeEnd, beamVisibilityFloor);
      next.particleSizeVisibilityFloorPreviewMode = "camera-beam-visibility-floor";
    }
  }

  const alphaStartValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "alphaStart",
    simulation.alphaStart
  );
  const alphaMidValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "alphaMid",
    simulation.alphaMid
  );
  const alphaEndValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "alphaEnd",
    simulation.alphaEnd
  );
  if (
    typeof alphaStartValue === "number" ||
    typeof alphaMidValue === "number" ||
    typeof alphaEndValue === "number"
  ) {
    if (typeof alphaStartValue === "number") {
      next.particleAlphaStart = clampNumber(alphaStartValue, 0, 1);
    }
    if (typeof alphaMidValue === "number") {
      next.particleAlphaMid = clampNumber(alphaMidValue, 0, 1);
    }
    if (typeof alphaEndValue === "number") {
      next.particleAlphaEnd = clampNumber(alphaEndValue, 0, 1);
    }
    next.particleAlphaSourcePreviewMode = "aurora-source-alpha-linear";
    next.baseOpacity = clampNumber(
      Math.max(alphaStartValue ?? 0, alphaMidValue ?? 0, alphaEndValue ?? 0),
      0.03,
      1
    );
  }
  if (next.bubblePreviewMode && next.additive) {
    next.baseOpacity = Math.min(next.baseOpacity, 0.16);
    next.particleAlphaPreviewClamp = 0.16;
    next.particleAlphaPreviewClampMode = "lighten-bubble-overdraw-alpha-clamp";
    next.bubbleAlphaPreviewMode = "lighten-bubble-overdraw-preview-cap";
    next.bubbleDiagnostics = [
      ...(next.bubbleDiagnostics ?? []),
      "VFX_BUBBLE_LIGHTEN_OVERDRAW_PREVIEW_CAP",
      "VFX_BUBBLE_LIGHTEN_HIGH_BIRTHRATE_BATCH_CAP",
      "VFX_BUBBLE_SOURCE_SIZE_NO_SURFACE_VISIBILITY_FLOOR"
    ];
  }

  if (simulation.colorStart) {
    next.particleColorStart = simulation.colorStart;
  }
  if (simulation.colorMid) {
    next.particleColorMid = simulation.colorMid;
  }
  if (simulation.colorEnd) {
    next.particleColorEnd = simulation.colorEnd;
  }
  const percentStartValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "percentStart",
    simulation.percentStart
  );
  const percentMidValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "percentMid",
    simulation.percentMid
  );
  const percentEndValue = resolveAuroraEmitterNonNegativeNumberWithTimeline(
    simulation,
    "percentEnd",
    simulation.percentEnd
  );
  if (typeof percentStartValue === "number") {
    next.particlePercentStart = clampNumber(percentStartValue, 0, 1);
  }
  if (typeof percentMidValue === "number") {
    next.particlePercentMid = clampNumber(percentMidValue, 0, 1);
  }
  if (typeof percentEndValue === "number") {
    next.particlePercentEnd = clampNumber(percentEndValue, 0, 1);
  }

  if (!shouldPreserveStaticSheetSymbol && lifeSeconds !== undefined) {
    const baseVelocity = Math.abs(simulation.velocity ?? 0);
    if (surfaceBoundWorldZSheet) {
      if (baseVelocity > 0) {
        next.height = clampNumber(next.height, 0, objectRadius * 0.16);
        next.drift = clampNumber(next.drift, 0, objectRadius * 0.08);
        next.surfaceMotionPreviewMode = "world-z-sheet-surface-flow";
      }
    } else {
      const travelDistance = Math.abs(next.particleVelocity ?? 0) * lifeSeconds;
      if (travelDistance > 0) {
        next.height = clampNumber(travelDistance, objectRadius * 0.05, objectRadius * 6.5);
      }

      if (typeof simulation.spread === "number" && simulation.spread > 0 && next.height > 0) {
        const spread = clampNumber(resolveAuroraEmitterSpreadRadians(simulation.spread), 0, Math.PI);
        const coneRadius = Math.tan(spread * 0.5) * next.height;
        if (Number.isFinite(coneRadius) && coneRadius > 0) {
          next.radius = clampNumber(Math.max(next.radius, coneRadius), 0, objectRadius * 4.5);
        }
      }

      if (
        (next.layout === "particle_aligned" || next.layout === "motion_blur") &&
        next.alignToParticleDirection === true &&
        next.height > 0 &&
        travelDistance > next.height
      ) {
        next.kinematicTravelClampDistance = next.height;
        next.kinematicTravelClampPreviewMode = "velocity-preview-clamped-to-profile-height";
      }
    }
  }

  if (!shouldPreserveStaticSheetSymbol && hasEmitterSurface) {
    const maxSurfaceRadius = Math.max(surfaceWidth ?? 0, surfaceDepth ?? 0) * 0.5;
    next.radius = clampNumber(Math.max(next.radius, maxSurfaceRadius), 0, objectRadius * 4.5);
  }

  if (zeroMotionStaticSheetSymbol || zeroMotionStaticWorldZSymbol) {
    next.radius = 0;
    next.height = 0;
    next.drift = 0;
    next.zeroMotionPreviewMode = continuousTemporalEmission
      ? "explicit-zero-kinematics-temporal-particles-preview"
      : "explicit-zero-kinematics-static-sheet-preview";
  } else if (
    explicitZeroKinematics &&
    !continuousTemporalEmission &&
    !hasEmitterSurface
  ) {
    next.count = 1;
    next.radius = 0;
    next.height = 0;
    next.drift = 0;
    next.zeroMotionPreviewMode = "explicit-zero-kinematics-static-preview";
  } else if (
    explicitZeroKinematics &&
    continuousTemporalEmission &&
    !hasEmitterSurface
  ) {
    next.radius = 0;
    next.height = 0;
    next.drift = 0;
    next.zeroMotionPreviewMode = "explicit-zero-kinematics-temporal-particles-preview";
  }

  return next;
}

function applyAuroraEmitterSourceStateToPreviewProfile(
  profile: PlaceableVfxPreviewProfile,
  emitter: PlaceableAuroraEmitterNode | null
): PlaceableVfxPreviewProfile {
  const sourceState = emitter?.sourceState;
  if (!sourceState) {
    return profile;
  }

  let next: PlaceableVfxPreviewProfile = { ...profile };
  if (sourceState.rotateTexture === true) {
    next.rotateTexture = true;
    next.rotateTexturePreviewMode = "aurora-source-rotatetexture-runtime-flag";
    next.rotateTextureDiagnostics = [
      "VFX_ROTATETEXTURE_RUNTIME_BYTE_FLAG_REQUIRED",
      "VFX_ROTATETEXTURE_RATE_REQUIRES_PARTICLEROT_OR_RUNTIME_CAPTURE"
    ];
    if (
      typeof next.particleRotationRate !== "number" &&
      !next.simulationTimeline?.particleRot?.length
    ) {
      next.particleRotationRatePreviewMode =
        "aurora-rotatetexture-no-implicit-particle-rotation-rate";
    }
  } else if (sourceState.rotateTexture === false) {
    next.rotateTexture = false;
    next.rotateTexturePreviewMode = undefined;
    next.rotateTextureDiagnostics = undefined;
  }

  if (sourceState.splat === true) {
    next.splat = true;
    next.splatPreviewMode = "landed-flag-required";
    next.splatDiagnostics = [
      "VFX_PARTICLE_SPLAT_LANDED_FLAG_REQUIRED",
      "VFX_PARTICLE_SPLAT_NOT_DECAL",
      "VFX_PARTICLE_COLLISION_QUERY_REQUIRED"
    ];
  } else if (sourceState.splat === false) {
    next.splat = false;
    next.splatPreviewMode = undefined;
    next.splatDiagnostics = undefined;
  }

  return next;
}

function resolvePlaceableVfxPreviewProfile(
  payload: PlaceableViewportRenderPayload,
  objectRadius: number,
  auroraEmitterOverride: PlaceableAuroraEmitterNode | null = null
): PlaceableVfxPreviewProfile {
  const auroraEmitterProfile = resolveAuroraEmitterPreviewProfile(
    payload,
    objectRadius,
    auroraEmitterOverride
  );
  if (auroraEmitterProfile) {
    return auroraEmitterProfile;
  }

  const fingerprint = buildPlaceableVfxFingerprint(payload);
  const smokeLike = /(smoke|fog|mist|steam|plume|cloud)/iu.test(fingerprint);
  const beamLike = /(shaft|beam|light|glow|ray)/iu.test(fingerprint);
  const liquidLike = /(water|bubble|lava|slime|acid|puddle)/iu.test(fingerprint);
  const sparkLike = /(spark|pulse|fire|ember|flame|magic)/iu.test(fingerprint);

  if (smokeLike) {
    return {
      kind: "smoke",
      layout: "camera_billboard",
      count: 22,
      radius: objectRadius * 0.5,
      height: objectRadius * 2.7,
      drift: objectRadius * 0.22,
      baseLift: objectRadius * 0.1,
      baseOpacity: 0.46,
      sizeMin: objectRadius * 0.55,
      sizeMax: objectRadius * 1.08,
      additive: false
    };
  }

  if (beamLike) {
    return {
      kind: "beam",
      layout: "camera_billboard",
      count: 14,
      radius: objectRadius * 0.34,
      height: objectRadius * 3.2,
      drift: objectRadius * 0.14,
      baseLift: objectRadius * 0.18,
      baseOpacity: 0.52,
      sizeMin: objectRadius * 0.3,
      sizeMax: objectRadius * 0.82,
      additive: true
    };
  }

  if (liquidLike) {
    return {
      kind: "liquid",
      layout: "world_z_sheet",
      count: 8,
      radius: objectRadius * 0.48,
      height: objectRadius * 0.025,
      drift: objectRadius * 0.1,
      baseLift: objectRadius * 0.035,
      baseOpacity: 0.72,
      sizeMin: objectRadius * 0.74,
      sizeMax: objectRadius * 1.22,
      additive: true
    };
  }

  if (sparkLike) {
    return {
      kind: "spark",
      layout: "camera_billboard",
      count: 24,
      radius: objectRadius * 0.38,
      height: objectRadius * 2.45,
      drift: objectRadius * 0.28,
      baseLift: objectRadius * 0.12,
      baseOpacity: 0.62,
      sizeMin: objectRadius * 0.2,
      sizeMax: objectRadius * 0.52,
      additive: true
    };
  }

  return {
    kind: "generic",
    layout: "camera_billboard",
    count: 12,
    radius: objectRadius * 0.42,
    height: objectRadius * 2.2,
    drift: objectRadius * 0.16,
    baseLift: objectRadius * 0.08,
    baseOpacity: 0.45,
    sizeMin: objectRadius * 0.34,
    sizeMax: objectRadius * 0.68,
    additive: true
  };
}

function resolvePrimaryAuroraEmitter(
  payload: PlaceableViewportRenderPayload
): PlaceableAuroraEmitterNode | null {
  const emitters = payload.renderPackage?.auroraEmitter?.emitters;
  if (!Array.isArray(emitters) || emitters.length === 0) {
    return null;
  }
  return (
    emitters.find((emitter) =>
      Boolean(
        emitter.renderMode ||
          emitter.emitterType ||
          emitter.texture ||
          emitter.chunkName ||
          emitter.simulation ||
          emitter.animations?.length
      )
    ) ?? emitters[0] ?? null
  );
}

function resolveAuroraEmittersForPreview(
  payload: PlaceableViewportRenderPayload
): PlaceableAuroraEmitterNode[] {
  const emitters = payload.renderPackage?.auroraEmitter?.emitters;
  if (!Array.isArray(emitters) || emitters.length === 0) {
    return [];
  }
  const usefulEmitters = emitters.filter((emitter) =>
    Boolean(
      emitter.renderMode ||
        emitter.emitterType ||
        emitter.texture ||
        emitter.chunkName ||
        emitter.simulation ||
        emitter.animations?.length
    )
  );
  const renderableEmitters = usefulEmitters.length > 0 ? usefulEmitters : emitters;
  const sourceModelCandidates = resolveAuroraEmitterSourceModelCandidates(payload);
  if (sourceModelCandidates.size === 0) {
    return renderableEmitters;
  }
  const emittersFromSelectedModel = renderableEmitters.filter((emitter) => {
    const sourceModelName = normalizeAuroraEmitterSourceModelName(emitter.sourceModelFileName);
    return sourceModelName ? sourceModelCandidates.has(sourceModelName) : false;
  });
  return emittersFromSelectedModel.length > 0 ? emittersFromSelectedModel : renderableEmitters;
}

function resolveAuroraLightsForPreview(
  payload: PlaceableViewportRenderPayload
): PlaceableAuroraLightNode[] {
  const lights = payload.renderPackage?.auroraLight?.lights;
  if (!Array.isArray(lights) || lights.length === 0) {
    return [];
  }
  const sourceModelCandidates = resolveAuroraEmitterSourceModelCandidates(payload);
  if (sourceModelCandidates.size === 0) {
    return lights;
  }
  const lightsFromSelectedModel = lights.filter((light) => {
    const sourceModelName = normalizeAuroraEmitterSourceModelName(light.sourceModelFileName);
    return sourceModelName ? sourceModelCandidates.has(sourceModelName) : false;
  });
  return lightsFromSelectedModel.length > 0 ? lightsFromSelectedModel : lights;
}

function resolveAuroraEmitterSourceModelCandidates(
  payload: PlaceableViewportRenderPayload
): Set<string> {
  const metadata = payload.placeable.metadata ?? {};
  return new Set(
    [
      payload.placeable.resref,
      payload.placeable.templateId,
      payload.templateId,
      typeof metadata.lookupModelResRef === "string" ? metadata.lookupModelResRef : undefined,
      typeof metadata.modelResRef === "string" ? metadata.modelResRef : undefined,
      typeof metadata.model === "string" ? metadata.model : undefined
    ]
      .map((value) => normalizeAuroraEmitterSourceModelName(value))
      .filter((value): value is string => Boolean(value))
  );
}

function normalizeAuroraEmitterSourceModelName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\.(mdl|mdb|glb|gltf)$/u, "")
    .replace(/^plc_/u, "");
  return normalized.length > 0 ? normalized : null;
}

function resolveAuroraEmitterPreviewProfile(
  payload: PlaceableViewportRenderPayload,
  objectRadius: number,
  auroraEmitterOverride: PlaceableAuroraEmitterNode | null = null
): PlaceableVfxPreviewProfile | null {
  const emitter = auroraEmitterOverride ?? resolvePrimaryAuroraEmitter(payload);
  if (!emitter) {
    return null;
  }

  const animationSelection = resolveAuroraEmitterAnimationSelection(payload, emitter);
  const simulation = resolveAuroraEmitterActiveSimulation(emitter, animationSelection);
  const activeTransform = resolveAuroraEmitterActiveTransform(emitter, animationSelection);
  const p2pReferenceTarget = resolveAuroraEmitterP2PReferenceTarget(emitter, objectRadius);
  const withSimulation = (profile: PlaceableVfxPreviewProfile): PlaceableVfxPreviewProfile => {
    let resolvedProfile = applyAuroraEmitterAnimationSelectionToPreviewProfile(
      applyAuroraEmitterSourceStateToPreviewProfile(
          applyAuroraEmitterUpdateModeToPreviewProfile(
            applyAuroraEmitterSimulationToPreviewProfile(
              profile,
              simulation,
              objectRadius,
              p2pReferenceTarget
            ),
            emitter,
            objectRadius,
            animationSelection.selectedAnimation?.animationName
          ),
        emitter
      ),
      animationSelection,
      simulation
    );
    const orientationQuaternion = resolveAuroraEmitterTransformQuaternion(activeTransform);
    if (orientationQuaternion && !resolvedProfile.p2pTargetOffset) {
      const usesEmitterLocalKinematics =
        resolvedProfile.inherit === true || resolvedProfile.inheritLocal === true;
      resolvedProfile = {
        ...resolvedProfile,
        particleKinematicCoordinateSpace: usesEmitterLocalKinematics ? "emitter-local" : "world",
        ...(usesEmitterLocalKinematics
          ? {}
          : { particleKinematicOrientationInverse: orientationQuaternion.clone().invert() }),
        particleKinematicCoordinateSpacePreviewMode: usesEmitterLocalKinematics
          ? "source-inherit-local-emitter-space"
          : "source-no-inherit-world-space"
      };
    }
    if (!activeTransform?.position) {
      return resolvedProfile;
    }
    return {
      ...resolvedProfile,
      baseLift: 0,
      sourceTransformAnchorPreviewMode: "node-transform-origin-no-procedural-lift"
    };
  };
  const fingerprint = buildPlaceableVfxFingerprint(payload);
  const auroraRenderMode = resolveAuroraEmitterRenderMode(emitter.renderMode);
  const renderMode = auroraRenderMode.normalized;
  const blendMode = normalizeAuroraEmitterToken(emitter.blendMode);
  const emitterType = normalizeAuroraEmitterToken(emitter.emitterType);
  const texture = normalizeAuroraEmitterToken(emitter.texture);
  const chunkName = normalizeAuroraEmitterToken(emitter.chunkName);
  const combined = [fingerprint, renderMode, blendMode, emitterType, texture, chunkName].join("|");
  const alignedToWorldZ = auroraRenderMode.bucket === "aligned_to_world_z";
  const billboardToWorldZ = auroraRenderMode.bucket === "billboard_to_world_z";
  const billboardToLocalZ = auroraRenderMode.bucket === "billboard_to_local_z";
  const worldZ = alignedToWorldZ || billboardToWorldZ;
  const alignedToParticleDirection = auroraRenderMode.bucket === "aligned_to_particle_dir";
  const motionBlur = auroraRenderMode.bucket === "motion_blur";
  const linked = auroraRenderMode.bucket === "linked";
  const additive =
    /add|additive|light|lighten/iu.test(blendMode) ||
    (!/normal|blend/iu.test(blendMode) && /(glow|pulse|spark|magic|fire)/iu.test(combined));
  const bubbleLike = isAuroraEmitterBubbleLikeToken(combined);

  if (linked) {
    const smokeLike = /(smoke|fog|plume|cloud|mist|steam)/iu.test(combined);
    const beamLike = /(shaft|beam|ray|lightning)/iu.test(combined);
    return withSimulation({
      kind: smokeLike ? "smoke" : beamLike ? "beam" : "spark",
      layout: "linked_billboard",
      count: smokeLike ? 14 : 12,
      radius: objectRadius * (smokeLike ? 0.34 : 0.24),
      height: objectRadius * (smokeLike ? 1.45 : 1.1),
      drift: objectRadius * (smokeLike ? 0.18 : 0.12),
      baseLift: objectRadius * 0.06,
      baseOpacity: additive ? 0.62 : 0.54,
      sizeMin: objectRadius * (smokeLike ? 0.28 : 0.18),
      sizeMax: objectRadius * (smokeLike ? 0.78 : 0.48),
      additive,
      linkedParticles: true,
      trailStretch: 1
    });
  }

  if (alignedToParticleDirection || motionBlur) {
    const trailLike = motionBlur || emitterType.includes("trail");
    return withSimulation({
      kind: /(smoke|fog|plume|cloud)/iu.test(combined)
        ? "smoke"
        : /(shaft|beam|ray|lightning)/iu.test(combined)
          ? "beam"
          : "spark",
      layout: motionBlur ? "motion_blur" : "particle_aligned",
      count: trailLike ? 18 : 12,
      radius: objectRadius * (trailLike ? 0.42 : 0.28),
      height: objectRadius * (trailLike ? 1.9 : 1.2),
      drift: objectRadius * (trailLike ? 0.36 : 0.22),
      baseLift: objectRadius * 0.08,
      baseOpacity: additive ? 0.62 : 0.54,
      sizeMin: objectRadius * (trailLike ? 0.22 : 0.28),
      sizeMax: objectRadius * (trailLike ? 0.74 : 0.64),
      additive,
      alignToParticleDirection: true,
      ...(trailLike
        ? {
            motionMode: "trail" as const,
            ...(motionBlur
              ? {}
              : {
                  blurStretch: 2.1,
                  trailStretch: 2.7
                })
          }
        : {})
    });
  }

  if (billboardToLocalZ) {
    const smokeLike = /(smoke|fog|plume|cloud|mist|steam)/iu.test(combined);
    const textureSymbolLike = isAuroraEmitterSymbolToken(texture);
    const beamLike = !textureSymbolLike && /(shaft|beam|ray|lightning)/iu.test(combined);
    const symbolLike = textureSymbolLike || (!beamLike && isAuroraEmitterSymbolToken(combined));
    const singleLike = emitterType.includes("single") || symbolLike;
    const sheetSize = symbolLike ? objectRadius * 2.25 : objectRadius * 1.18;
    return withSimulation({
      kind: smokeLike ? "smoke" : beamLike ? "beam" : symbolLike ? "generic" : "spark",
      layout: "local_z_billboard",
      count: singleLike ? 1 : smokeLike ? 14 : 8,
      radius: singleLike ? 0 : objectRadius * 0.32,
      height: singleLike ? 0 : objectRadius * (smokeLike ? 1.35 : 0.75),
      drift: singleLike ? 0 : objectRadius * 0.12,
      baseLift: objectRadius * 0.04,
      baseOpacity: additive ? 0.68 : 0.56,
      sizeMin: singleLike ? sheetSize : objectRadius * 0.42,
      sizeMax: singleLike ? sheetSize : objectRadius * 1.18,
      additive
    });
  }

  if (worldZ) {
    const liquidLike = /(water|bubble|lava|slime|acid|puddle|river|shoal)/iu.test(combined);
    const textureSymbolLike = isAuroraEmitterSymbolToken(texture);
    const beamLike = !textureSymbolLike && /(shaft|beam|ray)/iu.test(combined);
    const symbolLike = textureSymbolLike || (!beamLike && isAuroraEmitterSymbolToken(combined));
    const sheetSize = symbolLike ? objectRadius * 2.35 : objectRadius * 1.45;
    if (!liquidLike || alignedToWorldZ) {
      const layout = alignedToWorldZ ? "world_z_aligned" : "world_z_billboard";
      return withSimulation({
        kind: beamLike ? "beam" : symbolLike ? "generic" : "spark",
        layout,
        count: symbolLike || alignedToWorldZ ? 1 : 10,
        radius: symbolLike ? 0 : objectRadius * 0.34,
        height: symbolLike ? 0 : alignedToWorldZ ? objectRadius * 1.4 : objectRadius * 0.2,
        drift: symbolLike ? 0 : objectRadius * 0.12,
        baseLift: objectRadius * 0.04,
        baseOpacity: additive ? 0.72 : 0.62,
        sizeMin: sheetSize,
        sizeMax: symbolLike ? sheetSize : objectRadius * 1.05,
        additive
      });
    }

    return withSimulation({
      kind: "liquid",
      layout: "world_z_sheet",
      count: 4,
      radius: objectRadius * 0.28,
      height: objectRadius * 0.01,
      drift: objectRadius * 0.035,
      baseLift: objectRadius * 0.025,
      baseOpacity: additive ? 0.64 : 0.78,
      sizeMin: sheetSize,
      sizeMax: objectRadius * 1.65,
      additive
    });
  }

  if (/(shaft|beam|ray|lightning)/iu.test(combined)) {
    return withSimulation({
      kind: "beam",
      layout: "camera_billboard",
      count: 14,
      radius: objectRadius * 0.28,
      height: objectRadius * 1.4,
      drift: objectRadius * 0.1,
      baseLift: objectRadius * 0.06,
      baseOpacity: additive ? 0.66 : 0.54,
      sizeMin: objectRadius * 0.18,
      sizeMax: objectRadius * 0.48,
      additive
    });
  }

  if (/(fountain|smoke|fog|plume|cloud)/iu.test(emitterType) || /smoke|fog|plume|cloud/iu.test(combined)) {
    if (bubbleLike) {
      return withSimulation({
        kind: "generic",
        layout: "camera_billboard",
        count: 18,
        radius: objectRadius * 0.34,
        height: objectRadius * 0.7,
        drift: objectRadius * 0.08,
        baseLift: objectRadius * 0.03,
        baseOpacity: additive ? 0.28 : 0.42,
        sizeMin: objectRadius * 0.16,
        sizeMax: objectRadius * 0.46,
        additive,
        bubblePreviewMode: "source-bubble-particle-preview",
        bubbleDiagnostics: ["VFX_BUBBLE_SOURCE_SIZE_NO_SURFACE_VISIBILITY_FLOOR"]
      });
    }
    return withSimulation({
      kind: "smoke",
      layout: "camera_billboard",
      count: 18,
      radius: objectRadius * 0.45,
      height: objectRadius * 2.5,
      drift: objectRadius * 0.2,
      baseLift: objectRadius * 0.08,
      baseOpacity: additive ? 0.54 : 0.46,
      sizeMin: objectRadius * 0.48,
      sizeMax: objectRadius * 1.02,
      additive
    });
  }

  return withSimulation({
    kind: /(spark|pulse|fire|ember|flame|magic)/iu.test(combined) ? "spark" : "generic",
    layout: "camera_billboard",
    count: 14,
    radius: objectRadius * 0.36,
    height: objectRadius * 1.9,
    drift: objectRadius * 0.14,
    baseLift: objectRadius * 0.08,
    baseOpacity: additive ? 0.58 : 0.5,
    sizeMin: objectRadius * 0.28,
    sizeMax: objectRadius * 0.64,
    additive
  });
}

function normalizeAuroraEmitterToken(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "_");
}

export function isPlaceableVfxNullTextureReference(value: unknown): boolean {
  return normalizeAuroraEmitterToken(value) === "null";
}

function isAuroraEmitterSymbolToken(value: string): boolean {
  return /(pent|pntgrm|rune|sigil|circle|glyph|bar|porcupine|amoeba)/iu.test(value);
}

function isAuroraEmitterBubbleLikeToken(value: string): boolean {
  return /(?:bubble|bubbles|fx_bubble|(?:^|[^a-z0-9])bbl(?=$|[^a-z0-9]))/iu.test(
    value
  );
}

export function countRenderableMeshes(model: THREE.Object3D): number {
  let meshCount = 0;
  model.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      meshCount += 1;
    }
  });
  return meshCount;
}

export function summarizePlaceableTextureSourceFormats(
  textures: Iterable<THREE.Texture>
): string {
  const sourceFormats = new Set<string>();
  Array.from(textures).forEach((texture) => {
    const sourceFormat = texture.userData?.auroraSourceFormat;
    if (typeof sourceFormat === "string" && sourceFormat.trim().length > 0) {
      sourceFormats.add(sourceFormat.trim());
    }
  });
  return Array.from(sourceFormats).join(",");
}

export function writePlaceableModelDebugStatus(
  runtime: RuntimeState,
  status: string,
  details: Record<string, string | number | null> = {}
): void {
  const eventDetail: PlaceableModelStatusEventDetail = { status };
  runtime.container.dataset.placeableModelStatus = status;
  Object.entries(details).forEach(([key, value]) => {
    const dataKey = `placeableModel${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    if (value === null) {
      delete runtime.container.dataset[dataKey];
      return;
    }
    runtime.container.dataset[dataKey] = String(value);
    eventDetail[key] = value;
  });
  if (typeof runtime.container.dispatchEvent === "function") {
    runtime.container.dispatchEvent(
      new CustomEvent<PlaceableModelStatusEventDetail>(PLACEABLE_MODEL_STATUS_EVENT, {
        detail: eventDetail
      })
    );
  }
}
