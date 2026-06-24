import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  createAuroraVfxCanonicalRenderGroup,
  resolveAuroraVfxCanonicalTextureReference
} from "../../layout/adapters/three/auroraVfxCanonicalRenderer";
import {
  createDevAuroraVfxPayload,
  DEV_VFX_DEFAULT_FIXTURE_ID,
  DEV_VFX_TEXTURE_REFERENCE
} from "./vfxFixturePayloads";

const DEV_VFX_ROUTE_PREFIX = "/dev/vfx-fixture";
const RENDER_WIDTH = 960;
const RENDER_HEIGHT = 540;
const DEV_VFX_TEXTURE_PROFILE = "radial-soft-atlas-4x4-v2";
const DEV_VFX_ATLAS_COLUMNS = 4;
const DEV_VFX_ATLAS_ROWS = 4;
const DEV_VFX_ATLAS_CELL_SIZE = 32;
const DEV_VFX_TEXTURE_WIDTH = DEV_VFX_ATLAS_COLUMNS * DEV_VFX_ATLAS_CELL_SIZE;
const DEV_VFX_TEXTURE_HEIGHT = DEV_VFX_ATLAS_ROWS * DEV_VFX_ATLAS_CELL_SIZE;

interface VfxFixtureRunnerRequest {
  fixtureId: string;
  timeSeconds: number;
  seed: number;
  captureDataUrl: boolean;
}

interface VfxFixtureRunnerProps {
  pathname?: string;
  search?: string;
}

interface VfxRenderStatus {
  status: "pending" | "rendered" | "skipped-test" | "webgl-unavailable" | "error";
  objectVisible: boolean;
  objectPixelCount: number;
  renderedDrawParticles: number;
  renderedVertices: number;
  renderedDrawRecordIds: string[];
  renderedEmitterNodeNames: string[];
  renderedDrawRecordLanes: string[];
  renderedParticleIds: number[];
  renderedParticleIndexes: number[];
  renderedPositionX: number[];
  renderedPositionY: number[];
  renderedPositionZ: number[];
  renderedVelocityX: number[];
  renderedVelocityY: number[];
  renderedVelocityZ: number[];
  renderedColorR: number[];
  renderedColorG: number[];
  renderedColorB: number[];
  renderedParticleSizeX: number[];
  renderedParticleSizeY: number[];
  renderedAlpha: number[];
  renderedRecordVerticesPerParticle: number[];
  renderedPltLayers: string[];
  renderedPltLayerColorSources: string[];
  renderedRenderOrder: number;
  renderedRenderMode: string;
  renderedRenderModeRawToken: string;
  renderedBlendMode: string;
  renderedBlendModeRawToken: string;
  renderedBlendModeNumber: number;
  renderedDiagnosticCodes: string[];
  renderedAtlasFrames: number[];
  renderedAtlasUvU0: number[];
  renderedAtlasUvV0: number[];
  renderedAtlasUvU1: number[];
  renderedAtlasUvV1: number[];
  renderedGeometryNonIndexedDrawArrays: string;
  renderedGeometryIndexedDrawArrays: string;
  renderedGeometryDrawModeArgument: number;
  renderedGeometryDrawModeArgumentSource: string;
  renderedGeometryVerticesPerParticle: number;
  renderedGeometryAtlasUvSource: string;
  renderedGeometryPositionAttributeCount: number;
  renderedGeometryPositionAttributeItemSize: number;
  renderedGeometryPositionAttributeXMin: number;
  renderedGeometryPositionAttributeXMax: number;
  renderedGeometryPositionAttributeYMin: number;
  renderedGeometryPositionAttributeYMax: number;
  renderedGeometryPositionAttributeZMin: number;
  renderedGeometryPositionAttributeZMax: number;
  renderedGeometryPositionAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryPositionAttributeMaxUniqueValuesPerRecord: number;
  renderedGeometryColorAttributeCount: number;
  renderedGeometryColorAttributeItemSize: number;
  renderedGeometryColorAttributeUniqueCount: number;
  renderedGeometryColorAttributeRMin: number;
  renderedGeometryColorAttributeRMax: number;
  renderedGeometryColorAttributeGMin: number;
  renderedGeometryColorAttributeGMax: number;
  renderedGeometryColorAttributeBMin: number;
  renderedGeometryColorAttributeBMax: number;
  renderedGeometryColorAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryColorAttributeMaxUniqueValuesPerRecord: number;
  renderedGeometryAlphaAttributeCount: number;
  renderedGeometryAlphaAttributeItemSize: number;
  renderedGeometryAlphaAttributeMin: number;
  renderedGeometryAlphaAttributeMax: number;
  renderedGeometryAlphaAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord: number;
  renderedGeometryParticleSizeAttributeCount: number;
  renderedGeometryParticleSizeAttributeItemSize: number;
  renderedGeometryParticleSizeAttributeXMin: number;
  renderedGeometryParticleSizeAttributeXMax: number;
  renderedGeometryParticleSizeAttributeYMin: number;
  renderedGeometryParticleSizeAttributeYMax: number;
  renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord: number;
  renderedGeometryAtlasFrameAttributeCount: number;
  renderedGeometryAtlasFrameAttributeItemSize: number;
  renderedGeometryAtlasFrameAttributeSource: string;
  renderedGeometryAtlasFrameAttributeUniqueCount: number;
  renderedGeometryAtlasFrameAttributeMin: number;
  renderedGeometryAtlasFrameAttributeMax: number;
  renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord: number;
  renderedGeometryDrawRecordIndexAttributeCount: number;
  renderedGeometryDrawRecordIndexAttributeItemSize: number;
  renderedGeometryDrawRecordIndexAttributeSource: string;
  renderedGeometryDrawRecordIndexAttributeUniqueCount: number;
  renderedGeometryDrawRecordIndexAttributeMin: number;
  renderedGeometryDrawRecordIndexAttributeMax: number;
  renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord: number;
  renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord: number;
  renderedGeometryUvAttributeCount: number;
  renderedGeometryUvAttributeItemSize: number;
  renderedGeometryUvAttributeUMin: number;
  renderedGeometryUvAttributeUMax: number;
  renderedGeometryUvAttributeVMin: number;
  renderedGeometryUvAttributeVMax: number;
  renderedGeometryUvAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryUvAttributeMaxUniqueValuesPerRecord: number;
  renderedBoundsWidth: number;
  renderedBoundsHeight: number;
  renderedBoundsDepth: number;
  renderedBoundsCenterX: number;
  renderedBoundsCenterY: number;
  renderedBoundsCenterZ: number;
  renderedTextureReference: string;
  renderedTextureStatus: string;
  renderedMaterialTransparent: string;
  renderedMaterialDepthWrite: string;
  renderedMaterialDepthTest: string;
  renderedMaterialAlphaTest: number;
  renderedMaterialOpacity: number;
  renderedMaterialColorHex: string;
  renderedMaterialBlending: string;
  renderedMaterialBlendSrc: string;
  renderedMaterialBlendDst: string;
  renderedMaterialBlendEquation: string;
  renderedMaterialMapBound: string;
  renderedMaterialMapReference: string;
  renderedMaterialVertexColors: string;
  renderedMaterialSide: string;
  renderedMaterialStatus: string;
  message: string;
}

export function isVfxFixtureRunnerPath(pathname: string): boolean {
  return pathname === DEV_VFX_ROUTE_PREFIX || pathname.startsWith(`${DEV_VFX_ROUTE_PREFIX}/`);
}

export function parseVfxFixtureRunnerRequest(
  pathname: string,
  search: string
): VfxFixtureRunnerRequest {
  const fixturePath = pathname.startsWith(`${DEV_VFX_ROUTE_PREFIX}/`)
    ? pathname.slice(DEV_VFX_ROUTE_PREFIX.length + 1).split("/")[0]
    : "";
  const params = new URLSearchParams(search);
  return {
    fixtureId: decodeURIComponent(fixturePath || DEV_VFX_DEFAULT_FIXTURE_ID),
    timeSeconds: readFiniteQueryNumber(params.get("time"), 0.5),
    seed: Math.trunc(readFiniteQueryNumber(params.get("seed"), 1)),
    captureDataUrl: params.get("capture") === "data-url"
  };
}

export function VfxFixtureRunner({ pathname, search }: VfxFixtureRunnerProps) {
  const request = useMemo(
    () =>
      parseVfxFixtureRunnerRequest(
        pathname ?? window.location.pathname,
        search ?? window.location.search
      ),
    [pathname, search]
  );
  const fixture = useMemo(() => createDevAuroraVfxPayload(request), [request]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderStatus, setRenderStatus] = useState<VfxRenderStatus>({
    status: "pending",
    objectVisible: false,
    objectPixelCount: 0,
    renderedDrawParticles: 0,
    renderedVertices: 0,
    renderedDrawRecordIds: [],
    renderedEmitterNodeNames: [],
    renderedDrawRecordLanes: [],
    renderedParticleIds: [],
    renderedParticleIndexes: [],
    renderedPositionX: [],
    renderedPositionY: [],
    renderedPositionZ: [],
    renderedVelocityX: [],
    renderedVelocityY: [],
    renderedVelocityZ: [],
    renderedColorR: [],
    renderedColorG: [],
    renderedColorB: [],
    renderedParticleSizeX: [],
    renderedParticleSizeY: [],
    renderedAlpha: [],
    renderedRecordVerticesPerParticle: [],
    renderedPltLayers: [],
    renderedPltLayerColorSources: [],
    renderedRenderOrder: 0,
    renderedRenderMode: "pending",
    renderedRenderModeRawToken: "pending",
    renderedBlendMode: "pending",
    renderedBlendModeRawToken: "pending",
    renderedBlendModeNumber: -1,
    renderedDiagnosticCodes: [],
    renderedAtlasFrames: [],
    renderedAtlasUvU0: [],
    renderedAtlasUvV0: [],
    renderedAtlasUvU1: [],
    renderedAtlasUvV1: [],
    renderedGeometryNonIndexedDrawArrays: "pending",
    renderedGeometryIndexedDrawArrays: "pending",
    renderedGeometryDrawModeArgument: 0,
    renderedGeometryDrawModeArgumentSource: "pending",
    renderedGeometryVerticesPerParticle: 0,
    renderedGeometryAtlasUvSource: "pending",
    renderedGeometryPositionAttributeCount: 0,
    renderedGeometryPositionAttributeItemSize: 0,
    renderedGeometryPositionAttributeXMin: 0,
    renderedGeometryPositionAttributeXMax: 0,
    renderedGeometryPositionAttributeYMin: 0,
    renderedGeometryPositionAttributeYMax: 0,
    renderedGeometryPositionAttributeZMin: 0,
    renderedGeometryPositionAttributeZMax: 0,
    renderedGeometryPositionAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryPositionAttributeMaxUniqueValuesPerRecord: 0,
    renderedGeometryColorAttributeCount: 0,
    renderedGeometryColorAttributeItemSize: 0,
    renderedGeometryColorAttributeUniqueCount: 0,
    renderedGeometryColorAttributeRMin: 0,
    renderedGeometryColorAttributeRMax: 0,
    renderedGeometryColorAttributeGMin: 0,
    renderedGeometryColorAttributeGMax: 0,
    renderedGeometryColorAttributeBMin: 0,
    renderedGeometryColorAttributeBMax: 0,
    renderedGeometryColorAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryColorAttributeMaxUniqueValuesPerRecord: 0,
    renderedGeometryAlphaAttributeCount: 0,
    renderedGeometryAlphaAttributeItemSize: 0,
    renderedGeometryAlphaAttributeMin: 0,
    renderedGeometryAlphaAttributeMax: 0,
    renderedGeometryAlphaAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord: 0,
    renderedGeometryParticleSizeAttributeCount: 0,
    renderedGeometryParticleSizeAttributeItemSize: 0,
    renderedGeometryParticleSizeAttributeXMin: 0,
    renderedGeometryParticleSizeAttributeXMax: 0,
    renderedGeometryParticleSizeAttributeYMin: 0,
    renderedGeometryParticleSizeAttributeYMax: 0,
    renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord: 0,
    renderedGeometryAtlasFrameAttributeCount: 0,
    renderedGeometryAtlasFrameAttributeItemSize: 0,
    renderedGeometryAtlasFrameAttributeSource: "pending",
    renderedGeometryAtlasFrameAttributeUniqueCount: 0,
    renderedGeometryAtlasFrameAttributeMin: 0,
    renderedGeometryAtlasFrameAttributeMax: 0,
    renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord: 0,
    renderedGeometryDrawRecordIndexAttributeCount: 0,
    renderedGeometryDrawRecordIndexAttributeItemSize: 0,
    renderedGeometryDrawRecordIndexAttributeSource: "pending",
    renderedGeometryDrawRecordIndexAttributeUniqueCount: 0,
    renderedGeometryDrawRecordIndexAttributeMin: 0,
    renderedGeometryDrawRecordIndexAttributeMax: 0,
    renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord: 0,
    renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord: 0,
    renderedGeometryUvAttributeCount: 0,
    renderedGeometryUvAttributeItemSize: 0,
    renderedGeometryUvAttributeUMin: 0,
    renderedGeometryUvAttributeUMax: 0,
    renderedGeometryUvAttributeVMin: 0,
    renderedGeometryUvAttributeVMax: 0,
    renderedGeometryUvAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryUvAttributeMaxUniqueValuesPerRecord: 0,
    renderedBoundsWidth: 0,
    renderedBoundsHeight: 0,
    renderedBoundsDepth: 0,
    renderedBoundsCenterX: 0,
    renderedBoundsCenterY: 0,
    renderedBoundsCenterZ: 0,
    renderedTextureReference: "",
    renderedTextureStatus: "pending",
    renderedMaterialTransparent: "pending",
    renderedMaterialDepthWrite: "pending",
    renderedMaterialDepthTest: "pending",
    renderedMaterialAlphaTest: 0,
    renderedMaterialOpacity: 0,
    renderedMaterialColorHex: "pending",
    renderedMaterialBlending: "pending",
    renderedMaterialBlendSrc: "pending",
    renderedMaterialBlendDst: "pending",
    renderedMaterialBlendEquation: "pending",
    renderedMaterialMapBound: "pending",
    renderedMaterialMapReference: "",
    renderedMaterialVertexColors: "pending",
    renderedMaterialSide: "pending",
    renderedMaterialStatus: "pending",
    message: "pending"
  });
  const [screenshotCaptured, setScreenshotCaptured] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    if (import.meta.env.MODE === "test") {
      setRenderStatus({
        status: "skipped-test",
        objectVisible: false,
        objectPixelCount: 0,
        renderedDrawParticles: 0,
        renderedVertices: 0,
        renderedDrawRecordIds: [],
        renderedEmitterNodeNames: [],
        renderedDrawRecordLanes: [],
        renderedParticleIds: [],
        renderedParticleIndexes: [],
        renderedPositionX: [],
        renderedPositionY: [],
        renderedPositionZ: [],
        renderedVelocityX: [],
        renderedVelocityY: [],
        renderedVelocityZ: [],
        renderedColorR: [],
        renderedColorG: [],
        renderedColorB: [],
        renderedParticleSizeX: [],
        renderedParticleSizeY: [],
        renderedAlpha: [],
        renderedRecordVerticesPerParticle: [],
        renderedPltLayers: [],
        renderedPltLayerColorSources: [],
        renderedRenderOrder: 0,
        renderedRenderMode: "skipped-test",
        renderedRenderModeRawToken: "skipped-test",
        renderedBlendMode: "skipped-test",
        renderedBlendModeRawToken: "skipped-test",
        renderedBlendModeNumber: -1,
        renderedDiagnosticCodes: [],
        renderedAtlasFrames: [],
        renderedAtlasUvU0: [],
        renderedAtlasUvV0: [],
        renderedAtlasUvU1: [],
        renderedAtlasUvV1: [],
        renderedGeometryNonIndexedDrawArrays: "skipped-test",
        renderedGeometryIndexedDrawArrays: "skipped-test",
        renderedGeometryDrawModeArgument: 0,
        renderedGeometryDrawModeArgumentSource: "skipped-test",
        renderedGeometryVerticesPerParticle: 0,
        renderedGeometryAtlasUvSource: "skipped-test",
        renderedGeometryPositionAttributeCount: 0,
        renderedGeometryPositionAttributeItemSize: 0,
        renderedGeometryPositionAttributeXMin: 0,
        renderedGeometryPositionAttributeXMax: 0,
        renderedGeometryPositionAttributeYMin: 0,
        renderedGeometryPositionAttributeYMax: 0,
        renderedGeometryPositionAttributeZMin: 0,
        renderedGeometryPositionAttributeZMax: 0,
        renderedGeometryPositionAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryPositionAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryColorAttributeCount: 0,
        renderedGeometryColorAttributeItemSize: 0,
        renderedGeometryColorAttributeUniqueCount: 0,
        renderedGeometryColorAttributeRMin: 0,
        renderedGeometryColorAttributeRMax: 0,
        renderedGeometryColorAttributeGMin: 0,
        renderedGeometryColorAttributeGMax: 0,
        renderedGeometryColorAttributeBMin: 0,
        renderedGeometryColorAttributeBMax: 0,
        renderedGeometryColorAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryColorAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryAlphaAttributeCount: 0,
        renderedGeometryAlphaAttributeItemSize: 0,
        renderedGeometryAlphaAttributeMin: 0,
        renderedGeometryAlphaAttributeMax: 0,
        renderedGeometryAlphaAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryParticleSizeAttributeCount: 0,
        renderedGeometryParticleSizeAttributeItemSize: 0,
        renderedGeometryParticleSizeAttributeXMin: 0,
        renderedGeometryParticleSizeAttributeXMax: 0,
        renderedGeometryParticleSizeAttributeYMin: 0,
        renderedGeometryParticleSizeAttributeYMax: 0,
        renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryAtlasFrameAttributeCount: 0,
        renderedGeometryAtlasFrameAttributeItemSize: 0,
        renderedGeometryAtlasFrameAttributeSource: "skipped-test",
        renderedGeometryAtlasFrameAttributeUniqueCount: 0,
        renderedGeometryAtlasFrameAttributeMin: 0,
        renderedGeometryAtlasFrameAttributeMax: 0,
        renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryDrawRecordIndexAttributeCount: 0,
        renderedGeometryDrawRecordIndexAttributeItemSize: 0,
        renderedGeometryDrawRecordIndexAttributeSource: "skipped-test",
        renderedGeometryDrawRecordIndexAttributeUniqueCount: 0,
        renderedGeometryDrawRecordIndexAttributeMin: 0,
        renderedGeometryDrawRecordIndexAttributeMax: 0,
        renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord: 0,
        renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord: 0,
        renderedGeometryUvAttributeCount: 0,
        renderedGeometryUvAttributeItemSize: 0,
        renderedGeometryUvAttributeUMin: 0,
        renderedGeometryUvAttributeUMax: 0,
        renderedGeometryUvAttributeVMin: 0,
        renderedGeometryUvAttributeVMax: 0,
        renderedGeometryUvAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryUvAttributeMaxUniqueValuesPerRecord: 0,
        renderedBoundsWidth: 0,
        renderedBoundsHeight: 0,
        renderedBoundsDepth: 0,
        renderedBoundsCenterX: 0,
        renderedBoundsCenterY: 0,
        renderedBoundsCenterZ: 0,
        renderedTextureReference: "",
        renderedTextureStatus: "skipped-test",
        renderedMaterialTransparent: "skipped-test",
        renderedMaterialDepthWrite: "skipped-test",
        renderedMaterialDepthTest: "skipped-test",
        renderedMaterialAlphaTest: 0,
        renderedMaterialOpacity: 0,
        renderedMaterialColorHex: "skipped-test",
        renderedMaterialBlending: "skipped-test",
        renderedMaterialBlendSrc: "skipped-test",
        renderedMaterialBlendDst: "skipped-test",
        renderedMaterialBlendEquation: "skipped-test",
        renderedMaterialMapBound: "skipped-test",
        renderedMaterialMapReference: "",
        renderedMaterialVertexColors: "skipped-test",
        renderedMaterialSide: "skipped-test",
        renderedMaterialStatus: "skipped-test",
        message: "WebGL render skipped under unit test runtime."
      });
      return;
    }

    const texture = createFixtureTexture();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#071018");
    const camera = new THREE.OrthographicCamera(-1.2, 1.2, 0.78, -0.78, 0.1, 10);
    camera.position.set(0, 0, 2);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: true
      });
      renderer.setPixelRatio(1);
      renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
      renderer.setClearColor("#071018", 1);
      const group = createAuroraVfxCanonicalRenderGroup(fixture.payload, {
        particleTexturesByReference: new Map([[DEV_VFX_TEXTURE_REFERENCE, texture]]),
        objectRadius: 0.32
      });
      scene.add(group);
      renderer.render(scene, camera);
      const probe = readObjectPixelSignal(renderer, RENDER_WIDTH, RENDER_HEIGHT);
      const dataUrl = request.captureDataUrl ? canvas.toDataURL("image/png") : null;
      if (dataUrl) {
        setScreenshotDataUrl(dataUrl);
        setScreenshotCaptured(true);
      }
      const drawMesh = findCanonicalDrawMesh(group);
      setRenderStatus({
        status: "rendered",
        objectVisible: probe.objectVisible,
        objectPixelCount: probe.objectPixelCount,
        renderedDrawParticles:
          readNumber(group.userData.auroraVfxCanonicalRenderedDrawParticleCount) ?? 0,
        renderedVertices: readNumber(group.userData.auroraVfxCanonicalRenderedVertexCount) ?? 0,
        renderedDrawRecordIds: readStringList(group.userData.auroraVfxCanonicalDrawRecordIds),
        renderedEmitterNodeNames: readStringList(group.userData.auroraVfxCanonicalEmitterNodeNames),
        renderedDrawRecordLanes: readStringList(group.userData.auroraVfxCanonicalDrawRecordLanes),
        renderedParticleIds: readNumberList(group.userData.auroraVfxCanonicalParticleIds),
        renderedParticleIndexes: readNumberList(group.userData.auroraVfxCanonicalParticleIndexes),
        renderedPositionX: readNumberList(group.userData.auroraVfxCanonicalPositionX),
        renderedPositionY: readNumberList(group.userData.auroraVfxCanonicalPositionY),
        renderedPositionZ: readNumberList(group.userData.auroraVfxCanonicalPositionZ),
        renderedVelocityX: readNumberList(group.userData.auroraVfxCanonicalVelocityX),
        renderedVelocityY: readNumberList(group.userData.auroraVfxCanonicalVelocityY),
        renderedVelocityZ: readNumberList(group.userData.auroraVfxCanonicalVelocityZ),
        renderedColorR: readNumberList(group.userData.auroraVfxCanonicalColorR),
        renderedColorG: readNumberList(group.userData.auroraVfxCanonicalColorG),
        renderedColorB: readNumberList(group.userData.auroraVfxCanonicalColorB),
        renderedParticleSizeX: readNumberList(group.userData.auroraVfxCanonicalParticleSizeX),
        renderedParticleSizeY: readNumberList(group.userData.auroraVfxCanonicalParticleSizeY),
        renderedAlpha: readNumberList(group.userData.auroraVfxCanonicalAlpha),
        renderedRecordVerticesPerParticle: readNumberList(
          group.userData.auroraVfxCanonicalRecordVerticesPerParticle
        ),
        renderedPltLayers: readStringList(group.userData.auroraVfxCanonicalPltLayers),
        renderedPltLayerColorSources: readStringList(
          group.userData.auroraVfxCanonicalPltLayerColorSources
        ),
        renderedRenderOrder: readNumber(group.userData.auroraVfxCanonicalRenderOrder) ?? 0,
        renderedRenderMode: readString(group.userData.auroraVfxCanonicalRenderMode),
        renderedRenderModeRawToken: readString(
          group.userData.auroraVfxCanonicalRenderModeRawToken
        ),
        renderedBlendMode: readString(group.userData.auroraVfxCanonicalBlendMode),
        renderedBlendModeRawToken: readString(
          group.userData.auroraVfxCanonicalBlendModeRawToken
        ),
        renderedBlendModeNumber:
          readNumber(group.userData.auroraVfxCanonicalBlendModeNumber) ?? -1,
        renderedDiagnosticCodes: readStringList(
          group.userData.auroraVfxCanonicalDiagnosticCodes
        ),
        renderedAtlasFrames: readNumberList(group.userData.auroraVfxCanonicalAtlasFrames),
        renderedAtlasUvU0: readNumberList(group.userData.auroraVfxCanonicalAtlasUvU0),
        renderedAtlasUvV0: readNumberList(group.userData.auroraVfxCanonicalAtlasUvV0),
        renderedAtlasUvU1: readNumberList(group.userData.auroraVfxCanonicalAtlasUvU1),
        renderedAtlasUvV1: readNumberList(group.userData.auroraVfxCanonicalAtlasUvV1),
        renderedGeometryNonIndexedDrawArrays: readBooleanString(
          drawMesh?.geometry.userData.auroraVfxCanonicalNonIndexedDrawArrays
        ),
        renderedGeometryIndexedDrawArrays: readBooleanString(
          drawMesh?.geometry.userData.auroraVfxCanonicalIndexedDrawArrays
        ),
        renderedGeometryDrawModeArgument:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalDrawModeArgument) ?? 0,
        renderedGeometryDrawModeArgumentSource: readString(
          drawMesh?.geometry.userData.auroraVfxCanonicalDrawModeArgumentSource
        ),
        renderedGeometryVerticesPerParticle:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalVerticesPerParticle) ?? 0,
        renderedGeometryAtlasUvSource: readString(
          drawMesh?.geometry.userData.auroraVfxCanonicalAtlasUvSource
        ),
        renderedGeometryPositionAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeCount) ?? 0,
        renderedGeometryPositionAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeItemSize) ?? 0,
        renderedGeometryPositionAttributeXMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeXMin) ?? 0,
        renderedGeometryPositionAttributeXMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeXMax) ?? 0,
        renderedGeometryPositionAttributeYMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeYMin) ?? 0,
        renderedGeometryPositionAttributeYMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeYMax) ?? 0,
        renderedGeometryPositionAttributeZMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeZMin) ?? 0,
        renderedGeometryPositionAttributeZMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeZMax) ?? 0,
        renderedGeometryPositionAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryPositionAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryColorAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeCount) ?? 0,
        renderedGeometryColorAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeItemSize) ?? 0,
        renderedGeometryColorAttributeUniqueCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeUniqueCount) ??
          0,
        renderedGeometryColorAttributeRMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeRMin) ?? 0,
        renderedGeometryColorAttributeRMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeRMax) ?? 0,
        renderedGeometryColorAttributeGMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeGMin) ?? 0,
        renderedGeometryColorAttributeGMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeGMax) ?? 0,
        renderedGeometryColorAttributeBMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeBMin) ?? 0,
        renderedGeometryColorAttributeBMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeBMax) ?? 0,
        renderedGeometryColorAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryColorAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryAlphaAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAlphaAttributeCount) ?? 0,
        renderedGeometryAlphaAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAlphaAttributeItemSize) ?? 0,
        renderedGeometryAlphaAttributeMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAlphaAttributeMin) ?? 0,
        renderedGeometryAlphaAttributeMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAlphaAttributeMax) ?? 0,
        renderedGeometryAlphaAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalAlphaAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalAlphaAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryParticleSizeAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeCount) ?? 0,
        renderedGeometryParticleSizeAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeItemSize) ??
          0,
        renderedGeometryParticleSizeAttributeXMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeXMin) ?? 0,
        renderedGeometryParticleSizeAttributeXMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeXMax) ?? 0,
        renderedGeometryParticleSizeAttributeYMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeYMin) ?? 0,
        renderedGeometryParticleSizeAttributeYMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeYMax) ?? 0,
        renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalParticleSizeAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalParticleSizeAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryAtlasFrameAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeCount) ?? 0,
        renderedGeometryAtlasFrameAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeItemSize) ?? 0,
        renderedGeometryAtlasFrameAttributeSource: readString(
          drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeSource
        ),
        renderedGeometryAtlasFrameAttributeUniqueCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeUniqueCount) ??
          0,
        renderedGeometryAtlasFrameAttributeMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeMin) ?? 0,
        renderedGeometryAtlasFrameAttributeMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeMax) ?? 0,
        renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalAtlasFrameAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalAtlasFrameAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeCount:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeCount
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeItemSize:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeItemSize
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeSource: readString(
          drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeSource
        ),
        renderedGeometryDrawRecordIndexAttributeUniqueCount:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeUniqueCount
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeMin:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeMin
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeMax:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeMax
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalDrawRecordIndexAttributeMinVerticesPerRecord
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalDrawRecordIndexAttributeMaxVerticesPerRecord
          ) ?? 0,
        renderedGeometryUvAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeCount) ?? 0,
        renderedGeometryUvAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeItemSize) ?? 0,
        renderedGeometryUvAttributeUMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeUMin) ?? 0,
        renderedGeometryUvAttributeUMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeUMax) ?? 0,
        renderedGeometryUvAttributeVMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeVMin) ?? 0,
        renderedGeometryUvAttributeVMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeVMax) ?? 0,
        renderedGeometryUvAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryUvAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedBoundsWidth:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsWidth) ?? 0,
        renderedBoundsHeight:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsHeight) ?? 0,
        renderedBoundsDepth:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsDepth) ?? 0,
        renderedBoundsCenterX:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsCenterX) ?? 0,
        renderedBoundsCenterY:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsCenterY) ?? 0,
        renderedBoundsCenterZ:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsCenterZ) ?? 0,
        renderedTextureReference: readString(group.userData.auroraVfxCanonicalTextureReference),
        renderedTextureStatus: readString(group.userData.auroraVfxCanonicalTextureStatus),
        renderedMaterialTransparent: readBooleanString(
          group.userData.auroraVfxCanonicalMaterialTransparent
        ),
        renderedMaterialDepthWrite: readBooleanString(
          group.userData.auroraVfxCanonicalMaterialDepthWrite
        ),
        renderedMaterialDepthTest: readBooleanString(
          group.userData.auroraVfxCanonicalMaterialDepthTest
        ),
        renderedMaterialAlphaTest:
          readNumber(group.userData.auroraVfxCanonicalMaterialAlphaTest) ?? 0,
        renderedMaterialOpacity:
          readNumber(group.userData.auroraVfxCanonicalMaterialOpacity) ?? 0,
        renderedMaterialColorHex: readString(group.userData.auroraVfxCanonicalMaterialColorHex),
        renderedMaterialBlending: readString(group.userData.auroraVfxCanonicalMaterialBlending),
        renderedMaterialBlendSrc: readString(group.userData.auroraVfxCanonicalMaterialBlendSrc),
        renderedMaterialBlendDst: readString(group.userData.auroraVfxCanonicalMaterialBlendDst),
        renderedMaterialBlendEquation: readString(
          group.userData.auroraVfxCanonicalMaterialBlendEquation
        ),
        renderedMaterialMapBound: readBooleanString(
          group.userData.auroraVfxCanonicalMaterialMapBound
        ),
        renderedMaterialMapReference: readString(
          group.userData.auroraVfxCanonicalMaterialMapReference
        ),
        renderedMaterialVertexColors: readBooleanString(
          group.userData.auroraVfxCanonicalMaterialVertexColors
        ),
        renderedMaterialSide: readString(group.userData.auroraVfxCanonicalMaterialSide),
        renderedMaterialStatus: readString(group.userData.auroraVfxCanonicalMaterialStatus),
        message: probe.objectVisible ? "visible" : "blank"
      });
    } catch (error) {
      setRenderStatus({
        status: renderer ? "error" : "webgl-unavailable",
        objectVisible: false,
        objectPixelCount: 0,
        renderedDrawParticles: 0,
        renderedVertices: 0,
        renderedDrawRecordIds: [],
        renderedEmitterNodeNames: [],
        renderedDrawRecordLanes: [],
        renderedParticleIds: [],
        renderedParticleIndexes: [],
        renderedPositionX: [],
        renderedPositionY: [],
        renderedPositionZ: [],
        renderedVelocityX: [],
        renderedVelocityY: [],
        renderedVelocityZ: [],
        renderedColorR: [],
        renderedColorG: [],
        renderedColorB: [],
        renderedParticleSizeX: [],
        renderedParticleSizeY: [],
        renderedAlpha: [],
        renderedRecordVerticesPerParticle: [],
        renderedPltLayers: [],
        renderedPltLayerColorSources: [],
        renderedRenderOrder: 0,
        renderedRenderMode: "error",
        renderedRenderModeRawToken: "error",
        renderedBlendMode: "error",
        renderedBlendModeRawToken: "error",
        renderedBlendModeNumber: -1,
        renderedDiagnosticCodes: [],
        renderedAtlasFrames: [],
        renderedAtlasUvU0: [],
        renderedAtlasUvV0: [],
        renderedAtlasUvU1: [],
        renderedAtlasUvV1: [],
        renderedGeometryNonIndexedDrawArrays: "error",
        renderedGeometryIndexedDrawArrays: "error",
        renderedGeometryDrawModeArgument: 0,
        renderedGeometryDrawModeArgumentSource: "error",
        renderedGeometryVerticesPerParticle: 0,
        renderedGeometryAtlasUvSource: "error",
        renderedGeometryPositionAttributeCount: 0,
        renderedGeometryPositionAttributeItemSize: 0,
        renderedGeometryPositionAttributeXMin: 0,
        renderedGeometryPositionAttributeXMax: 0,
        renderedGeometryPositionAttributeYMin: 0,
        renderedGeometryPositionAttributeYMax: 0,
        renderedGeometryPositionAttributeZMin: 0,
        renderedGeometryPositionAttributeZMax: 0,
        renderedGeometryPositionAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryPositionAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryColorAttributeCount: 0,
        renderedGeometryColorAttributeItemSize: 0,
        renderedGeometryColorAttributeUniqueCount: 0,
        renderedGeometryColorAttributeRMin: 0,
        renderedGeometryColorAttributeRMax: 0,
        renderedGeometryColorAttributeGMin: 0,
        renderedGeometryColorAttributeGMax: 0,
        renderedGeometryColorAttributeBMin: 0,
        renderedGeometryColorAttributeBMax: 0,
        renderedGeometryColorAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryColorAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryAlphaAttributeCount: 0,
        renderedGeometryAlphaAttributeItemSize: 0,
        renderedGeometryAlphaAttributeMin: 0,
        renderedGeometryAlphaAttributeMax: 0,
        renderedGeometryAlphaAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryParticleSizeAttributeCount: 0,
        renderedGeometryParticleSizeAttributeItemSize: 0,
        renderedGeometryParticleSizeAttributeXMin: 0,
        renderedGeometryParticleSizeAttributeXMax: 0,
        renderedGeometryParticleSizeAttributeYMin: 0,
        renderedGeometryParticleSizeAttributeYMax: 0,
        renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryAtlasFrameAttributeCount: 0,
        renderedGeometryAtlasFrameAttributeItemSize: 0,
        renderedGeometryAtlasFrameAttributeSource: "error",
        renderedGeometryAtlasFrameAttributeUniqueCount: 0,
        renderedGeometryAtlasFrameAttributeMin: 0,
        renderedGeometryAtlasFrameAttributeMax: 0,
        renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryDrawRecordIndexAttributeCount: 0,
        renderedGeometryDrawRecordIndexAttributeItemSize: 0,
        renderedGeometryDrawRecordIndexAttributeSource: "error",
        renderedGeometryDrawRecordIndexAttributeUniqueCount: 0,
        renderedGeometryDrawRecordIndexAttributeMin: 0,
        renderedGeometryDrawRecordIndexAttributeMax: 0,
        renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord: 0,
        renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord: 0,
        renderedGeometryUvAttributeCount: 0,
        renderedGeometryUvAttributeItemSize: 0,
        renderedGeometryUvAttributeUMin: 0,
        renderedGeometryUvAttributeUMax: 0,
        renderedGeometryUvAttributeVMin: 0,
        renderedGeometryUvAttributeVMax: 0,
        renderedGeometryUvAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryUvAttributeMaxUniqueValuesPerRecord: 0,
        renderedBoundsWidth: 0,
        renderedBoundsHeight: 0,
        renderedBoundsDepth: 0,
        renderedBoundsCenterX: 0,
        renderedBoundsCenterY: 0,
        renderedBoundsCenterZ: 0,
        renderedTextureReference: "",
        renderedTextureStatus: "error",
        renderedMaterialTransparent: "error",
        renderedMaterialDepthWrite: "error",
        renderedMaterialDepthTest: "error",
        renderedMaterialAlphaTest: 0,
        renderedMaterialOpacity: 0,
        renderedMaterialColorHex: "error",
        renderedMaterialBlending: "error",
        renderedMaterialBlendSrc: "error",
        renderedMaterialBlendDst: "error",
        renderedMaterialBlendEquation: "error",
        renderedMaterialMapBound: "error",
        renderedMaterialMapReference: "",
        renderedMaterialVertexColors: "error",
        renderedMaterialSide: "error",
        renderedMaterialStatus: "error",
        message: error instanceof Error ? error.message : "WebGL render failed."
      });
    }

    return () => {
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          const material = node.material;
          if (Array.isArray(material)) {
            material.forEach((entry) => entry.dispose());
          } else {
            material.dispose();
          }
        }
      });
      texture.dispose();
      renderer?.dispose();
    };
  }, [fixture]);

  const textureReference = resolveAuroraVfxCanonicalTextureReference(fixture.payload);
  const drawLane = readDrawLane(fixture.payload.contracts.renderContract);
  const captureScreenshot = () => {
    if (canvasRef.current) {
      setScreenshotDataUrl(canvasRef.current.toDataURL("image/png"));
      setScreenshotCaptured(true);
    }
  };

  return (
    <main
      className="vfx-fixture-shell"
      data-testid="vfx-fixture-runner"
      data-fixture-id={fixture.fixtureId}
      data-oracle={fixture.oracle}
      data-comparison-result={fixture.comparisonResult}
      data-canonical-parity-promoted={String(fixture.canonicalParityPromoted)}
      data-render-status={renderStatus.status}
      data-canvas-nonblank={String(renderStatus.objectVisible)}
      data-object-pixels={renderStatus.objectPixelCount}
      data-draw-lane={drawLane}
      data-rendered-draw-particles={renderStatus.renderedDrawParticles}
      data-rendered-vertices={renderStatus.renderedVertices}
      data-rendered-draw-record-ids={renderStatus.renderedDrawRecordIds.join(",")}
      data-rendered-emitter-node-names={renderStatus.renderedEmitterNodeNames.join(",")}
      data-rendered-draw-record-lanes={renderStatus.renderedDrawRecordLanes.join(",")}
      data-rendered-particle-ids={renderStatus.renderedParticleIds.join(",")}
      data-rendered-particle-indexes={renderStatus.renderedParticleIndexes.join(",")}
      data-rendered-position-x={renderStatus.renderedPositionX.join(",")}
      data-rendered-position-y={renderStatus.renderedPositionY.join(",")}
      data-rendered-position-z={renderStatus.renderedPositionZ.join(",")}
      data-rendered-velocity-x={renderStatus.renderedVelocityX.join(",")}
      data-rendered-velocity-y={renderStatus.renderedVelocityY.join(",")}
      data-rendered-velocity-z={renderStatus.renderedVelocityZ.join(",")}
      data-rendered-color-r={renderStatus.renderedColorR.join(",")}
      data-rendered-color-g={renderStatus.renderedColorG.join(",")}
      data-rendered-color-b={renderStatus.renderedColorB.join(",")}
      data-rendered-particle-size-x={renderStatus.renderedParticleSizeX.join(",")}
      data-rendered-particle-size-y={renderStatus.renderedParticleSizeY.join(",")}
      data-rendered-alpha={renderStatus.renderedAlpha.join(",")}
      data-rendered-record-vertices-per-particle={
        renderStatus.renderedRecordVerticesPerParticle.join(",")
      }
      data-rendered-plt-layers={renderStatus.renderedPltLayers.join(",")}
      data-rendered-plt-layer-color-sources={renderStatus.renderedPltLayerColorSources.join(",")}
      data-rendered-render-order={renderStatus.renderedRenderOrder}
      data-rendered-render-mode={renderStatus.renderedRenderMode}
      data-rendered-render-mode-raw-token={renderStatus.renderedRenderModeRawToken}
      data-rendered-blend-mode={renderStatus.renderedBlendMode}
      data-rendered-blend-mode-raw-token={renderStatus.renderedBlendModeRawToken}
      data-rendered-blend-mode-number={renderStatus.renderedBlendModeNumber}
      data-rendered-diagnostic-codes={renderStatus.renderedDiagnosticCodes.join(",")}
      data-rendered-atlas-frames={renderStatus.renderedAtlasFrames.join(",")}
      data-rendered-atlas-frame-count={renderStatus.renderedAtlasFrames.length}
      data-rendered-atlas-uv-u0={renderStatus.renderedAtlasUvU0.join(",")}
      data-rendered-atlas-uv-v0={renderStatus.renderedAtlasUvV0.join(",")}
      data-rendered-atlas-uv-u1={renderStatus.renderedAtlasUvU1.join(",")}
      data-rendered-atlas-uv-v1={renderStatus.renderedAtlasUvV1.join(",")}
      data-rendered-geometry-non-indexed-draw-arrays={
        renderStatus.renderedGeometryNonIndexedDrawArrays
      }
      data-rendered-geometry-indexed-draw-arrays={
        renderStatus.renderedGeometryIndexedDrawArrays
      }
      data-rendered-geometry-draw-mode-argument={renderStatus.renderedGeometryDrawModeArgument}
      data-rendered-geometry-draw-mode-argument-source={
        renderStatus.renderedGeometryDrawModeArgumentSource
      }
      data-rendered-geometry-vertices-per-particle={
        renderStatus.renderedGeometryVerticesPerParticle
      }
      data-rendered-geometry-atlas-uv-source={renderStatus.renderedGeometryAtlasUvSource}
      data-rendered-geometry-position-attribute-count={
        renderStatus.renderedGeometryPositionAttributeCount
      }
      data-rendered-geometry-position-attribute-item-size={
        renderStatus.renderedGeometryPositionAttributeItemSize
      }
      data-rendered-geometry-position-attribute-x-min={
        renderStatus.renderedGeometryPositionAttributeXMin
      }
      data-rendered-geometry-position-attribute-x-max={
        renderStatus.renderedGeometryPositionAttributeXMax
      }
      data-rendered-geometry-position-attribute-y-min={
        renderStatus.renderedGeometryPositionAttributeYMin
      }
      data-rendered-geometry-position-attribute-y-max={
        renderStatus.renderedGeometryPositionAttributeYMax
      }
      data-rendered-geometry-position-attribute-z-min={
        renderStatus.renderedGeometryPositionAttributeZMin
      }
      data-rendered-geometry-position-attribute-z-max={
        renderStatus.renderedGeometryPositionAttributeZMax
      }
      data-rendered-geometry-position-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryPositionAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-position-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryPositionAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-geometry-color-attribute-count={
        renderStatus.renderedGeometryColorAttributeCount
      }
      data-rendered-geometry-color-attribute-item-size={
        renderStatus.renderedGeometryColorAttributeItemSize
      }
      data-rendered-geometry-color-attribute-unique-count={
        renderStatus.renderedGeometryColorAttributeUniqueCount
      }
      data-rendered-geometry-color-attribute-r-min={renderStatus.renderedGeometryColorAttributeRMin}
      data-rendered-geometry-color-attribute-r-max={renderStatus.renderedGeometryColorAttributeRMax}
      data-rendered-geometry-color-attribute-g-min={renderStatus.renderedGeometryColorAttributeGMin}
      data-rendered-geometry-color-attribute-g-max={renderStatus.renderedGeometryColorAttributeGMax}
      data-rendered-geometry-color-attribute-b-min={renderStatus.renderedGeometryColorAttributeBMin}
      data-rendered-geometry-color-attribute-b-max={renderStatus.renderedGeometryColorAttributeBMax}
      data-rendered-geometry-color-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryColorAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-color-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryColorAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-geometry-alpha-attribute-count={
        renderStatus.renderedGeometryAlphaAttributeCount
      }
      data-rendered-geometry-alpha-attribute-item-size={
        renderStatus.renderedGeometryAlphaAttributeItemSize
      }
      data-rendered-geometry-alpha-attribute-min={renderStatus.renderedGeometryAlphaAttributeMin}
      data-rendered-geometry-alpha-attribute-max={renderStatus.renderedGeometryAlphaAttributeMax}
      data-rendered-geometry-alpha-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryAlphaAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-alpha-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-geometry-particle-size-attribute-count={
        renderStatus.renderedGeometryParticleSizeAttributeCount
      }
      data-rendered-geometry-particle-size-attribute-item-size={
        renderStatus.renderedGeometryParticleSizeAttributeItemSize
      }
      data-rendered-geometry-particle-size-attribute-x-min={
        renderStatus.renderedGeometryParticleSizeAttributeXMin
      }
      data-rendered-geometry-particle-size-attribute-x-max={
        renderStatus.renderedGeometryParticleSizeAttributeXMax
      }
      data-rendered-geometry-particle-size-attribute-y-min={
        renderStatus.renderedGeometryParticleSizeAttributeYMin
      }
      data-rendered-geometry-particle-size-attribute-y-max={
        renderStatus.renderedGeometryParticleSizeAttributeYMax
      }
      data-rendered-geometry-particle-size-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-particle-size-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-geometry-atlas-frame-attribute-count={
        renderStatus.renderedGeometryAtlasFrameAttributeCount
      }
      data-rendered-geometry-atlas-frame-attribute-item-size={
        renderStatus.renderedGeometryAtlasFrameAttributeItemSize
      }
      data-rendered-geometry-atlas-frame-attribute-source={
        renderStatus.renderedGeometryAtlasFrameAttributeSource
      }
      data-rendered-geometry-atlas-frame-attribute-unique-count={
        renderStatus.renderedGeometryAtlasFrameAttributeUniqueCount
      }
      data-rendered-geometry-atlas-frame-attribute-min={
        renderStatus.renderedGeometryAtlasFrameAttributeMin
      }
      data-rendered-geometry-atlas-frame-attribute-max={
        renderStatus.renderedGeometryAtlasFrameAttributeMax
      }
      data-rendered-geometry-atlas-frame-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-atlas-frame-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-geometry-draw-record-index-attribute-count={
        renderStatus.renderedGeometryDrawRecordIndexAttributeCount
      }
      data-rendered-geometry-draw-record-index-attribute-item-size={
        renderStatus.renderedGeometryDrawRecordIndexAttributeItemSize
      }
      data-rendered-geometry-draw-record-index-attribute-source={
        renderStatus.renderedGeometryDrawRecordIndexAttributeSource
      }
      data-rendered-geometry-draw-record-index-attribute-unique-count={
        renderStatus.renderedGeometryDrawRecordIndexAttributeUniqueCount
      }
      data-rendered-geometry-draw-record-index-attribute-min={
        renderStatus.renderedGeometryDrawRecordIndexAttributeMin
      }
      data-rendered-geometry-draw-record-index-attribute-max={
        renderStatus.renderedGeometryDrawRecordIndexAttributeMax
      }
      data-rendered-geometry-draw-record-index-attribute-min-vertices-per-record={
        renderStatus.renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord
      }
      data-rendered-geometry-draw-record-index-attribute-max-vertices-per-record={
        renderStatus.renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord
      }
      data-rendered-geometry-uv-attribute-count={renderStatus.renderedGeometryUvAttributeCount}
      data-rendered-geometry-uv-attribute-item-size={
        renderStatus.renderedGeometryUvAttributeItemSize
      }
      data-rendered-geometry-uv-attribute-u-min={renderStatus.renderedGeometryUvAttributeUMin}
      data-rendered-geometry-uv-attribute-u-max={renderStatus.renderedGeometryUvAttributeUMax}
      data-rendered-geometry-uv-attribute-v-min={renderStatus.renderedGeometryUvAttributeVMin}
      data-rendered-geometry-uv-attribute-v-max={renderStatus.renderedGeometryUvAttributeVMax}
      data-rendered-geometry-uv-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryUvAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-uv-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryUvAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-bounds-width={renderStatus.renderedBoundsWidth}
      data-rendered-bounds-height={renderStatus.renderedBoundsHeight}
      data-rendered-bounds-depth={renderStatus.renderedBoundsDepth}
      data-rendered-bounds-center-x={renderStatus.renderedBoundsCenterX}
      data-rendered-bounds-center-y={renderStatus.renderedBoundsCenterY}
      data-rendered-bounds-center-z={renderStatus.renderedBoundsCenterZ}
      data-rendered-texture-reference={renderStatus.renderedTextureReference}
      data-rendered-texture-status={renderStatus.renderedTextureStatus}
      data-rendered-material-transparent={renderStatus.renderedMaterialTransparent}
      data-rendered-material-depth-write={renderStatus.renderedMaterialDepthWrite}
      data-rendered-material-depth-test={renderStatus.renderedMaterialDepthTest}
      data-rendered-material-alpha-test={renderStatus.renderedMaterialAlphaTest}
      data-rendered-material-opacity={renderStatus.renderedMaterialOpacity}
      data-rendered-material-color-hex={renderStatus.renderedMaterialColorHex}
      data-rendered-material-blending={renderStatus.renderedMaterialBlending}
      data-rendered-material-blend-src={renderStatus.renderedMaterialBlendSrc}
      data-rendered-material-blend-dst={renderStatus.renderedMaterialBlendDst}
      data-rendered-material-blend-equation={renderStatus.renderedMaterialBlendEquation}
      data-rendered-material-map-bound={renderStatus.renderedMaterialMapBound}
      data-rendered-material-map-reference={renderStatus.renderedMaterialMapReference}
      data-rendered-material-vertex-colors={renderStatus.renderedMaterialVertexColors}
      data-rendered-material-side={renderStatus.renderedMaterialSide}
      data-rendered-material-status={renderStatus.renderedMaterialStatus}
      data-screenshot-captured={String(screenshotCaptured)}
      data-screenshot-export={request.captureDataUrl ? "data-url" : "disabled"}
      data-screenshot-bytes={screenshotDataUrl ? estimateDataUrlBytes(screenshotDataUrl) : 0}
      data-texture-profile={DEV_VFX_TEXTURE_PROFILE}
      data-texture-atlas-columns={DEV_VFX_ATLAS_COLUMNS}
      data-texture-atlas-rows={DEV_VFX_ATLAS_ROWS}
      data-texture-atlas-cell-size={DEV_VFX_ATLAS_CELL_SIZE}
      data-texture-atlas-cell-count={DEV_VFX_ATLAS_COLUMNS * DEV_VFX_ATLAS_ROWS}
      data-texture-width={DEV_VFX_TEXTURE_WIDTH}
      data-texture-height={DEV_VFX_TEXTURE_HEIGHT}
    >
      <canvas
        ref={canvasRef}
        className="vfx-fixture-canvas"
        width={RENDER_WIDTH}
        height={RENDER_HEIGHT}
        aria-label={`VFX fixture ${fixture.fixtureId} render canvas`}
      />
      <aside className="vfx-fixture-panel" aria-label="VFX fixture status">
        <p className="eyebrow">VFX Fixture</p>
        <h1>{fixture.title}</h1>
        <dl>
          <div>
            <dt>Fixture</dt>
            <dd>{fixture.fixtureId}</dd>
          </div>
          <div>
            <dt>Time / seed</dt>
            <dd>
              {fixture.timeSeconds.toFixed(2)} / {fixture.seed}
            </dd>
          </div>
          <div>
            <dt>Texture</dt>
            <dd>{textureReference ?? "missing"}</dd>
          </div>
          <div>
            <dt>Particles</dt>
            <dd>{renderStatus.renderedDrawParticles}</dd>
          </div>
          <div>
            <dt>Vertices</dt>
            <dd>{renderStatus.renderedVertices}</dd>
          </div>
          <div>
            <dt>Canvas</dt>
            <dd>{renderStatus.message}</dd>
          </div>
          <div>
            <dt>Oracle</dt>
            <dd>{fixture.oracle}</dd>
          </div>
        </dl>
        <button className="vfx-fixture-capture-btn" type="button" onClick={captureScreenshot}>
          Capture
        </button>
        {screenshotDataUrl ? (
          <output
            aria-label="VFX fixture PNG data URL"
            className="vfx-fixture-data-url"
            data-testid="vfx-fixture-data-url"
          >
            {screenshotDataUrl}
          </output>
        ) : null}
      </aside>
    </main>
  );
}

function createFixtureTexture(): THREE.DataTexture {
  const pixels = new Uint8Array(DEV_VFX_TEXTURE_WIDTH * DEV_VFX_TEXTURE_HEIGHT * 4);
  for (let y = 0; y < DEV_VFX_TEXTURE_HEIGHT; y += 1) {
    for (let x = 0; x < DEV_VFX_TEXTURE_WIDTH; x += 1) {
      const cellX = x % DEV_VFX_ATLAS_CELL_SIZE;
      const cellY = y % DEV_VFX_ATLAS_CELL_SIZE;
      const frameColumn = Math.floor(x / DEV_VFX_ATLAS_CELL_SIZE);
      const frameRow = Math.floor(y / DEV_VFX_ATLAS_CELL_SIZE);
      const frameTint = (frameColumn + frameRow) / (DEV_VFX_ATLAS_COLUMNS + DEV_VFX_ATLAS_ROWS - 2);
      const u = (cellX + 0.5) / DEV_VFX_ATLAS_CELL_SIZE;
      const v = (cellY + 0.5) / DEV_VFX_ATLAS_CELL_SIZE;
      const centeredX = u * 2 - 1;
      const centeredY = v * 2 - 1;
      const distance = Math.sqrt(centeredX * centeredX + centeredY * centeredY);
      const core = clamp01(1 - distance * 1.45);
      const spark =
        clamp01(1 - Math.abs(centeredX + centeredY) * 3.4) * clamp01(1 - distance * 1.2) * 0.12;
      const alpha = clamp01(core * core * (1.25 - distance) + spark);
      const shapedAlpha = alpha < 0.035 ? 0 : alpha;
      const pixelIndex = (y * DEV_VFX_TEXTURE_WIDTH + x) * 4;
      pixels[pixelIndex] = Math.round(255 * shapedAlpha);
      pixels[pixelIndex + 1] = Math.round((188 + 52 * core + 22 * frameTint) * shapedAlpha);
      pixels[pixelIndex + 2] = Math.round((118 + 100 * (1 - distance) + 30 * frameTint) * shapedAlpha);
      pixels[pixelIndex + 3] = Math.round(255 * shapedAlpha);
    }
  }
  const texture = new THREE.DataTexture(
    pixels,
    DEV_VFX_TEXTURE_WIDTH,
    DEV_VFX_TEXTURE_HEIGHT,
    THREE.RGBAFormat
  );
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function readObjectPixelSignal(
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number
): { objectVisible: boolean; objectPixelCount: number } {
  const gl = renderer.getContext();
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const red = pixels[0] ?? 0;
  const green = pixels[1] ?? 0;
  const blue = pixels[2] ?? 0;
  let objectPixelCount = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const delta =
      Math.abs((pixels[index] ?? 0) - red) +
      Math.abs((pixels[index + 1] ?? 0) - green) +
      Math.abs((pixels[index + 2] ?? 0) - blue);
    if (delta > 36) {
      objectPixelCount += 1;
    }
  }
  return {
    objectVisible: objectPixelCount > 80,
    objectPixelCount
  };
}

function readFiniteQueryNumber(value: string | null, fallback: number): number {
  if (value === null || value.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNumberList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry));
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry : String(entry)))
    .filter((entry) => entry.length > 0);
}

function findCanonicalDrawMesh(group: THREE.Group): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  group.traverse((node) => {
    if (found || !(node instanceof THREE.Mesh)) {
      return;
    }
    if (node.userData.auroraVfxCanonicalDrawMesh === true) {
      found = node;
    }
  });
  return found;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBooleanString(value: unknown): string {
  return typeof value === "boolean" ? String(value) : "";
}

function readDrawLane(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "unknown";
  }
  const drawLane = (value as { drawLane?: unknown }).drawLane;
  return typeof drawLane === "string" && drawLane.length > 0 ? drawLane : "unknown";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    return 0;
  }
  const base64 = dataUrl.slice(commaIndex + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}
