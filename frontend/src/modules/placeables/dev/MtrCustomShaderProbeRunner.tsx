import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  installAuroraMtrCustomShaderProgram,
  type AuroraMtrCustomShaderState
} from "../adapters/three/auroraMtrCustomShaderProgram";

const ROUTE = "/dev/vfx-mtr-custom-shader-probe";
const FIXTURE_URL = "/dev-fixtures/vfx-mtr-custom-shader/fixture.json";
const PROBE_SIZE = 640;

interface ProbeFixture {
  version: "aurora-mtr-custom-shader-webgl-probe/v1";
  status: "retail-source-compile-probe-not-parity-proof";
  source: {
    materialResref: string;
    materialSha256: string;
    toolsetSha256: string;
  };
  materialState: AuroraMtrCustomShaderState;
  parity: {
    retailVisualProof: false;
    purpose: "compile-and-render-capability-gate-only";
  };
}

interface ProbeStatus {
  state: "loading" | "ready" | "error";
  message: string;
  materialResref: string;
  programCount: number;
  compileMessageCount: number;
  glError: number;
  changedPixelCount: number;
  installStatus: string;
  samplerFixture: string;
}

const INITIAL_STATUS: ProbeStatus = {
  state: "loading",
  message: "loading",
  materialResref: "",
  programCount: 0,
  compileMessageCount: 0,
  glError: 0,
  changedPixelCount: 0,
  installStatus: "pending",
  samplerFixture: "diagnostic-data-texture-not-retail-oracle"
};

export function isMtrCustomShaderProbeRunnerPath(pathname: string): boolean {
  return pathname === ROUTE;
}

export function MtrCustomShaderProbeRunner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState(INITIAL_STATUS);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer | undefined;
    let geometry: THREE.BufferGeometry | undefined;
    let material: THREE.MeshStandardMaterial | undefined;
    let executionMaterial: THREE.RawShaderMaterial | undefined;
    let environmentTexture: THREE.DataTexture | undefined;

    const run = async () => {
      const response = await fetch(FIXTURE_URL);
      if (!response.ok) throw new Error(`fixture HTTP ${response.status}`);
      const fixture = (await response.json()) as ProbeFixture;
      assertProbeFixture(fixture);

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
      });
      renderer.setPixelRatio(1);
      renderer.setSize(PROBE_SIZE, PROBE_SIZE, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const background = new THREE.Color(0.035, 0.043, 0.051);
      scene.background = background;
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
      camera.position.set(0, 0.15, 3.2);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld(true);

      geometry = new THREE.SphereGeometry(1, 64, 32);
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.42, 0.68, 0.88),
        roughness: 0.65,
        metalness: 0.001
      });
      environmentTexture = createDiagnosticEnvironmentTexture();
      material.envMap = environmentTexture;
      material.userData = {
        ...material.userData,
        auroraMtrProbeEnvironmentSampler:
          "diagnostic-data-texture-not-retail-oracle"
      };
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.set(-0.12, 0.42, 0);
      scene.add(mesh);
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.4);
      keyLight.position.set(2.5, 3.5, 4);
      scene.add(keyLight);
      const fillLight = new THREE.PointLight(0x6fb7ff, 3, 8);
      fillLight.position.set(-2.5, 0.5, 2.5);
      scene.add(fillLight);

      const install = installAuroraMtrCustomShaderProgram({
        mesh,
        material,
        state: fixture.materialState
      });
      if (install.status !== "installed") {
        throw new Error(`custom shader install refused: ${install.reason}`);
      }
      executionMaterial = install.material;

      const compileMessages: string[] = [];
      const previousConsoleError = console.error;
      console.error = (...values: unknown[]) => {
        compileMessages.push(values.map(formatConsoleValue).join(" "));
        previousConsoleError(...values);
      };
      try {
        renderer.render(scene, camera);
      } finally {
        console.error = previousConsoleError;
      }

      const gl = renderer.getContext();
      const glError = gl.getError();
      const changedPixelCount = countChangedPixels(gl);
      const programCount = renderer.info.programs?.length ?? 0;
      const compileFailure = compileMessages.some((message) =>
        /shader error|program info log|validate_status false|error:/iu.test(message)
      );
      if (glError !== gl.NO_ERROR) {
        throw new Error(`WebGL error ${glError}`);
      }
      if (compileFailure || programCount < 1) {
        throw new Error(
          compileMessages.find((message) => message.trim()) ?? "WebGL program did not compile"
        );
      }
      if (changedPixelCount < 100) {
        throw new Error(`pixel readback remained blank (${changedPixelCount} changed pixels)`);
      }
      if (disposed) return;
      setStatus({
        state: "ready",
        message: "retail-source-compile-probe-not-parity-proof",
        materialResref: fixture.source.materialResref,
        programCount,
        compileMessageCount: compileMessages.length,
        glError,
        changedPixelCount,
        installStatus: install.reason,
        samplerFixture: "diagnostic-data-texture-not-retail-oracle"
      });
    };

    void run().catch((error: unknown) => {
      if (disposed) return;
      setStatus((current) => ({
        ...current,
        state: "error",
        message: error instanceof Error ? error.message : String(error),
        installStatus: "failed"
      }));
    });

    return () => {
      disposed = true;
      geometry?.dispose();
      material?.dispose();
      executionMaterial?.dispose();
      environmentTexture?.dispose();
      renderer?.dispose();
    };
  }, []);

  return (
    <main
      data-testid="mtr-custom-shader-probe-runner"
      data-state={status.state}
      data-message={status.message}
      data-material-resref={status.materialResref}
      data-program-count={status.programCount}
      data-compile-message-count={status.compileMessageCount}
      data-gl-error={status.glError}
      data-changed-pixel-count={status.changedPixelCount}
      data-install-status={status.installStatus}
      data-sampler-fixture={status.samplerFixture}
      data-proof-kind="compile-probe-not-parity-proof"
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        background: "#090b0d"
      }}
    >
      <canvas
        ref={canvasRef}
        width={PROBE_SIZE}
        height={PROBE_SIZE}
        aria-label="Retail MTR custom shader compile probe"
        style={{ width: "min(100vw, 100vh)", height: "min(100vw, 100vh)" }}
      />
      {status.state === "error" ? (
        <output style={{ position: "fixed", color: "#ffffff" }}>{status.message}</output>
      ) : null}
    </main>
  );
}

function createDiagnosticEnvironmentTexture(): THREE.DataTexture {
  const data = new Uint8Array([
    54, 94, 130, 255,
    100, 154, 196, 255,
    188, 215, 232, 255,
    86, 126, 164, 255,
    34, 48, 66, 255,
    64, 92, 120, 255,
    142, 176, 202, 255,
    48, 68, 88, 255
  ]);
  const texture = new THREE.DataTexture(data, 4, 2, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function assertProbeFixture(fixture: ProbeFixture): void {
  if (
    fixture?.version !== "aurora-mtr-custom-shader-webgl-probe/v1" ||
    fixture.status !== "retail-source-compile-probe-not-parity-proof" ||
    fixture.parity?.retailVisualProof !== false ||
    fixture.materialState?.customShaderProgram?.status !== "complete"
  ) {
    throw new Error("invalid retail MTR custom shader probe fixture");
  }
}

function formatConsoleValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function countChangedPixels(
  gl: WebGLRenderingContext | WebGL2RenderingContext
): number {
  const pixels = new Uint8Array(PROBE_SIZE * PROBE_SIZE * 4);
  gl.readPixels(0, 0, PROBE_SIZE, PROBE_SIZE, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const red = pixels[0];
  const green = pixels[1];
  const blue = pixels[2];
  let changed = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (
      Math.abs(pixels[index] - red) > 3 ||
      Math.abs(pixels[index + 1] - green) > 3 ||
      Math.abs(pixels[index + 2] - blue) > 3
    ) {
      changed += 1;
    }
  }
  return changed;
}
