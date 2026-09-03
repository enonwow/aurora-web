import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  bindAuroraMtrFramebufferTextures,
  buildAuroraMtrCustomShaderSources,
  installAuroraMtrCustomShaderProgram,
  readAuroraMtrFramebufferRuntimeLane
} from "../../../../src/modules/placeables/adapters/three/auroraMtrCustomShaderProgram";

function createProgram() {
  return {
    version: "aurora-shader-program-source/v1" as const,
    status: "complete" as const,
    stageRoots: { vertex: "vs_test", fragment: "fs_test" },
    sources: [
      {
        resref: "vs_test",
        source: '#define SHADER_TYPE 1\n#include "inc_shared"\nvoid main(){ gl_Position = m_mvp * vPos; }',
        includeRefs: ["inc_shared"]
      },
      {
        resref: "fs_test",
        source: '#define SHADER_TYPE 2\n#include "inc_shared.shd"\nvoid main(){ gl_FragColor = vec4(CustomTint.rgb, 1.0); }',
        includeRefs: ["inc_shared"]
      },
      {
        resref: "inc_shared",
        source: "uniform mat4 m_mvp;\nuniform vec4 CustomTint;\nattribute vec4 vPos;",
        includeRefs: []
      }
    ],
    unresolvedRefs: []
  };
}

describe("Aurora MTR custom shader program", () => {
  it("expands the complete SHD graph under the recovered Toolset profile", () => {
    const sources = buildAuroraMtrCustomShaderSources({
      customShaderVS: "vs_test",
      customShaderFS: "fs_test",
      customShaderProgram: createProgram()
    });

    expect(sources).not.toBeNull();
    expect(sources?.vertexShader).toContain("#define MAX_NUM_LIGHTS 32");
    expect(sources?.vertexShader).toContain("#define BUILD_VERSION 8193");
    expect(sources?.vertexShader).toContain("#define BUILD_REVISION 37");
    expect(sources?.vertexShader).toContain("uniform mat4 m_mvp;");
    expect(sources?.vertexShader).not.toContain('#include "inc_shared"');
    expect(sources?.noDiscard).toBe(1);
  });

  it("selects the native discard-enabled variant for Punch-Through", () => {
    const sources = buildAuroraMtrCustomShaderSources({
      customShaderVS: "vs_test",
      customShaderFS: "fs_test",
      customShaderProgram: createProgram(),
      blending: "punchthrough"
    });

    expect(sources?.noDiscard).toBe(0);
    expect(sources?.vertexShader).toContain("#define NO_DISCARD 0");
  });

  it("installs source programs, native attributes, and authored parameter uniforms", () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
    );
    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2)
    );
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    const flowTexture = new THREE.Texture();
    const result = installAuroraMtrCustomShaderProgram({
      mesh,
      material,
      texturesBySlot: new Map([[6, flowTexture]]),
      state: {
        customShaderVS: "vs_test",
        customShaderFS: "fs_test",
        customShaderProgram: createProgram(),
        parameters: [
          { name: "CustomTint", kind: "float", values: [1, 0.5, 0.25, 1], arity: 4 },
          { name: "CustomMode", kind: "int", values: [2], arity: 1 }
        ]
      }
    });
    expect(result.status).toBe("installed");
    if (result.status !== "installed") throw new Error("expected installed shader");
    expect(geometry.getAttribute("vPos").itemSize).toBe(4);
    expect(geometry.getAttribute("vTcIn").itemSize).toBe(2);
    expect(geometry.getAttribute("vNormal").itemSize).toBe(3);
    expect(geometry.getAttribute("vColor").itemSize).toBe(4);
    expect(geometry.getAttribute("vIndex").itemSize).toBe(4);
    expect(geometry.getAttribute("vWeight").itemSize).toBe(4);
    expect(mesh.material).toBe(result.material);
    expect(result.material.vertexShader).toContain("gl_Position = m_mvp * vPos");
    expect(result.material.vertexShader).toContain("#define AURORA_SHADER_TYPE 1");
    expect(result.material.fragmentShader).toContain("gl_FragColor");
    expect((result.material.uniforms.CustomTint.value as THREE.Vector4).toArray()).toEqual([
      1,
      0.5,
      0.25,
      1
    ]);
    expect(result.material.uniforms.CustomMode.value).toBe(2);
    expect(result.material.uniforms.texUnit6.value).toBe(flowTexture);
    expect(result.material.uniforms.texture6Bound.value).toBe(1);
    expect(result.material.uniforms.texUnit15.value).toBeNull();
    expect(result.material.uniforms.texture15Bound.value).toBe(0);
    expect(result.material.userData.auroraMaterialCustomShaderBoundTextureSlots).toEqual([6]);
    expect(material.userData.auroraMaterialCustomShaderParameterUploadOrder).toEqual([
      "CustomTint",
      "CustomMode"
    ]);
  });

  it("updates native matrix uniforms directly from camera and matrixWorld before draw", () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
    );
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(2, 3, 4);
    mesh.updateMatrixWorld(true);
    mesh.modelViewMatrix.makeScale(9, 9, 9);
    const camera = new THREE.PerspectiveCamera(60, 4 / 3, 0.1, 100);
    camera.position.set(0, 1, 8);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    const scene = new THREE.Scene();
    scene.userData.auroraWorldtimerTimeOfDay = 12345.9;
    const result = installAuroraMtrCustomShaderProgram({
      mesh,
      material,
      state: {
        customShaderVS: "vs_test",
        customShaderFS: "fs_test",
        customShaderProgram: createProgram()
      }
    });
    expect(result.status).toBe("installed");
    if (result.status !== "installed") throw new Error("expected installed shader");
    const renderer = {
      info: { render: { frame: 7 } },
      getDrawingBufferSize(target: THREE.Vector2) {
        return target.set(800, 600);
      }
    } as unknown as THREE.WebGLRenderer;

    mesh.onBeforeRender(renderer, scene, camera, geometry, result.material, null);

    const expectedModelView = new THREE.Matrix4().multiplyMatrices(
      camera.matrixWorldInverse,
      mesh.matrixWorld
    );
    const expectedModelViewProjection = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      expectedModelView
    );
    expect((result.material.uniforms.m_mv.value as THREE.Matrix4).elements).toEqual(
      expectedModelView.elements
    );
    expect((result.material.uniforms.m_mvp.value as THREE.Matrix4).elements).toEqual(
      expectedModelViewProjection.elements
    );
    expect(result.material.uniforms.sceneCurrentFrame.value).toBe(7);
    expect(result.material.uniforms.worldtimerTimeOfDay.value).toBe(12345);
  });

  it("installs framebuffer programs for the ordered retail pass and binds color/depth snapshots", () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    const result = installAuroraMtrCustomShaderProgram({
      mesh,
      material: mesh.material,
      state: {
        customShaderVS: "vs_test",
        customShaderFS: "fs_test",
        customShaderProgram: createProgram(),
        sampleFramebuffer: 2
      }
    });
    expect(result.status).toBe("installed");
    if (result.status !== "installed") throw new Error("expected installed shader");
    expect(readAuroraMtrFramebufferRuntimeLane(mesh)).toBe(6);
    expect(result.material.uniforms.texFBColor.value).toBeNull();
    expect(result.material.uniforms.texFBDepth.value).toBeNull();

    const colorTexture = new THREE.Texture();
    const depthTexture = new THREE.DepthTexture(16, 16);
    expect(bindAuroraMtrFramebufferTextures(mesh, colorTexture, depthTexture)).toBe(true);
    expect(result.material.uniforms.texFBColor.value).toBe(colorTexture);
    expect(result.material.uniforms.texFBDepth.value).toBe(depthTexture);
    expect(result.material.userData.auroraMaterialFramebufferExecutionStatus).toBe(
      "source-backed-frame-capture-bound"
    );
  });

  it("refuses geometry-shader lanes instead of inventing them", () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    expect(
      installAuroraMtrCustomShaderProgram({
        mesh,
        material: mesh.material,
        state: {
          customShaderVS: "vs_test",
          customShaderFS: "fs_test",
          customShaderGS: "gs_test",
          customShaderProgram: createProgram()
        }
      })
    ).toMatchObject({ status: "refused", reason: "geometry-shader-unsupported" });
  });

  it("refuses custom programs on skinned meshes when native bone bindings are unavailable", () => {
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), material);

    expect(
      installAuroraMtrCustomShaderProgram({
        mesh,
        material,
        state: {
          customShaderVS: "vs_test",
          customShaderFS: "fs_test",
          customShaderProgram: createProgram()
        }
      })
    ).toMatchObject({
      status: "refused",
      reason: "skinned-mesh-binding-unavailable"
    });
    expect(mesh.material).toBe(material);
  });

  it("refuses an environment-map shader when its native sampler input is missing", () => {
    const program = createProgram();
    program.sources[0].source =
      '#define SHADER_TYPE 1\n#define ENVIRONMENT_MAP 1\n#include "inc_shared"\nvoid main(){ gl_Position = m_mvp * vPos; }';
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);

    expect(
      installAuroraMtrCustomShaderProgram({
        mesh,
        material,
        state: {
          customShaderVS: "vs_test",
          customShaderFS: "fs_test",
          customShaderProgram: program
        }
      })
    ).toMatchObject({ status: "refused", reason: "environment-map-binding-required" });
  });
});
