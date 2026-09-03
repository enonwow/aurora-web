import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  convertAuroraAsciiMdlToGlb,
  convertAuroraMdlToGlb,
  convertAuroraMdlFileToGlb,
  inspectAuroraMdlSource
} from "../../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../src/modules/runtime-settings/domain/derived-asset-versions";

const SAMPLE_ASCII_MDL = `
newmodel plc_test_triangle
setsupermodel plc_test_triangle NULL
classification Character
beginmodelgeom plc_test_triangle
node dummy plc_test_triangle
endnode
node trimesh mesh01
  parent plc_test_triangle
  position 1 2 3
  bitmap plc_test_triangle_diff
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom plc_test_triangle
`;

function buildSmoothingGroupAsciiMdl(smoothingGroup: number): string {
  return `
newmodel c_smoothing_test
beginmodelgeom c_smoothing_test
node trimesh crease_mesh
  parent c_smoothing_test
  verts 4
    0 0 0
    1 0 0
    0 1 0
    0 0 1
  tverts 4
    0 0
    1 0
    0 1
    1 1
  faces 2
    0 1 2 ${smoothingGroup} 0 1 2 1
    0 1 3 ${smoothingGroup} 0 1 3 1
endnode
endmodelgeom c_smoothing_test
`;
}

const MULTI_TEXTURE_ASCII_MDL = `
newmodel plc_test_multi
beginmodelgeom plc_test_multi
node trimesh mesh_wood
  parent plc_test_multi
  texture0 tx_wood
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
node trimesh mesh_metal
  parent plc_test_multi
  bitmap tx_metal
  verts 3
    0 0 1
    1 0 1
    0 1 1
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom plc_test_multi
`;

const SLOT_TEXTURE_ASCII_MDL = `
newmodel plc_test_slots
beginmodelgeom plc_test_slots
node trimesh mesh_slot
  parent plc_test_slots
  bitmap tx_panel_bitmap
  texture0 tx_panel_d
  texture1 tx_panel_n
  texture2 tx_panel_s
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom plc_test_slots
`;

const HIERARCHY_TRANSFORM_ASCII_MDL = `
newmodel plc_test_hierarchy
beginmodelgeom plc_test_hierarchy
node dummy root
  parent plc_test_hierarchy
  position 10 0 0
  orientation 0 0 1 1.5707963267948966
endnode
node trimesh mesh_child
  parent root
  position 1 0 0
  bitmap tx_child
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom plc_test_hierarchy
`;

const EMITTER_ONLY_ASCII_MDL = `
newmodel vfx_smoke_test
beginmodelgeom vfx_smoke_test
node emitter emit_smoke
  parent vfx_smoke_test
  texture fxpa_smoke01
endnode
endmodelgeom vfx_smoke_test
`;

const SUPERMODEL_ASCII_MDL = `
newmodel c_guard
setsupermodel c_guard a_fa
setanimationscale 1.5
classification Character
beginmodelgeom c_guard
node trimesh torso
  parent c_guard
  bitmap c_guard_body
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom c_guard
`;

const SKIN_WEIGHT_ASCII_MDL = `
newmodel c_skin_test
setsupermodel c_skin_test a_fa
classification Character
beginmodelgeom c_skin_test
node skin torso_skin
  parent rootdummy
  bitmap c_skin_body
  verts 4
    0 0 0
    1 0 0
    0 1 0
    1 1 0
  tverts 4
    0 0
    1 0
    0 1
    1 1
  weights 4
    rootdummy 1.0
    rootdummy 0.25 rshin_g 0.75
    rshin_g 1.0
    rootdummy 0.25 rshin_g 0.25
  faces 2
    0 1 2 1 0 1 2 1
    1 3 2 1 1 3 2 1
endnode
endmodelgeom c_skin_test
`;

const DANGLYMESH_ASCII_MDL = `
newmodel c_dangly_test
classification Character
beginmodelgeom c_dangly_test
node danglymesh cloak_dangly
  parent rootdummy
  bitmap c_cloak
  period 2.5
  tightness 0.75
  displacement 0.35
  verts 4
    0 0 0
    1 0 0
    0 1 0
    1 1 0
  tverts 4
    0 0
    1 0
    0 1
    1 1
  constraints 4
    0
    128
    255
    64
  faces 2
    0 1 2 1 0 1 2 1
    1 3 2 1 1 3 2 1
endnode
endmodelgeom c_dangly_test
`;

const DANGLYMESH_ANIMATION_OVERRIDE_ASCII_MDL = `
newmodel c_dangly_anim_test
classification Character
beginmodelgeom c_dangly_anim_test
node danglymesh cloak_dangly
  parent rootdummy
  bitmap c_cloak
  period 2.5
  displacement 0.35
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  constraints 3
    0
    255
    128
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom c_dangly_anim_test
newanim idle c_dangly_anim_test
  length 1.0
  node danglymesh cloak_dangly
    displacement -0.2
    period 0.75
    tightness 0.6
  endnode
doneanim idle c_dangly_anim_test
`;

const ANIMMESH_UV_ANIMATION_ASCII_MDL = `
newmodel c_animmesh_uv_test
classification Character
beginmodelgeom c_animmesh_uv_test
node animmesh glow_panel
  parent rootdummy
  bitmap fx_glow
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom c_animmesh_uv_test
newanim idle c_animmesh_uv_test
  length 1.0
  node animmesh glow_panel
    sampleperiod 0.5
    animverts 6
      0 0 0
      1 0 0
      0 1 0
      0.5 0 0
      1 0 0
      0 1 0
    animtverts 6
      0 0
      1 0
      0 1
      0.5 0
      1 0.5
      0.5 1
  endnode
doneanim idle c_animmesh_uv_test
`;

const SOURCE_NORMAL_TANGENT_ASCII_MDL = `
newmodel c_tangent_test
classification Character
beginmodelgeom c_tangent_test
node trimesh body
  parent rootdummy
  bitmap c_body
  texture1 c_body_n
  renderhint NormalAndSpecMapped
  diffuse 0.2 0.4 0.6
  specular 0.5 0.25 0.1
  shininess 64
  alpha 0.5
  transparencyhint 1
  rotatetexture 1
  selfillumcolor 0.1 0.2 0.3
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  normals 3
    0 0 1
    0 0 1
    0 0 1
  tangents 3
    1 0 0  0 1 0  0 0 1
    1 0 0  0 1 0  0 0 1
    1 0 0  0 1 0  0 0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom c_tangent_test
`;

const SOURCE_VEC4_TANGENT_ASCII_MDL = SOURCE_NORMAL_TANGENT_ASCII_MDL.replace(
  `  tangents 3
    1 0 0  0 1 0  0 0 1
    1 0 0  0 1 0  0 0 1
    1 0 0  0 1 0  0 0 1`,
  `  tangents 3
    1 0 0 1.0
    1 0 0 1.0
    1 0 0 1.0`
);

const SOURCE_ANIMATION_ASCII_MDL = `
newmodel c_anim_test
setsupermodel c_anim_test a_fa
setanimationscale 1.25
classification Character
beginmodelgeom c_anim_test
node trimesh torso
  parent c_anim_test
  bitmap c_anim_body
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom c_anim_test
newanim super_walk c_anim_test
  length 1.5
  transtime 0.25
  animroot rootdummy
  event 0.75 footstep
  node dummy rootdummy
    positionkey 2
      0.0 0 0 0
      1.5 0 0 1
    orientationkey 1
      0.0 0 0 1 0
  endnode
  node dummy rshin_g
    scalekey 1
      0.0 1.0
  endnode
  node trimesh torso
    alphakey 2
      0.0 1.0
      1.5 0.25
    selfillumcolorkey 2
      0.0 0.1 0.2 0.3
      1.5 0.8 0.4 0.2
  endnode
doneanim super_walk c_anim_test
`;

const SUPERMODEL_ANIMATION_ONLY_ASCII_MDL = `
newmodel a_fa
setanimationscale 1.0
classification Character
beginmodelgeom a_fa
node dummy a_fa
endnode
node dummy rootdummy
  parent a_fa
endnode
node dummy rshin_g
  parent rootdummy
endnode
endmodelgeom a_fa
newanim super_walk a_fa
  length 1.0
  transtime 0.1
  node dummy a_fa
    positionkey 2
      0.0 0 0 0
      1.0 0 1 0
  endnode
  node dummy rshin_g
    orientationkey 1
      0.0 0 0 1 0
  endnode
doneanim super_walk a_fa
`;

describe("aurora-mdl-ascii-to-glb converter", () => {
  it("converts minimal ASCII trimesh geometry to a valid GLB 2.0 payload", () => {
    const result = convertAuroraAsciiMdlToGlb(SAMPLE_ASCII_MDL);
    const parsed = parseGlb(result.bytes);

    expect(result).toMatchObject({
      modelName: "plc_test_triangle",
      meshCount: 1,
      textureReferences: ["plc_test_triangle_diff"],
      vertexCount: 3,
      triangleCount: 1
    });
    expect(parsed.header).toEqual({
      magic: 0x46546c67,
      version: 2,
      length: result.bytes.length
    });
    expect(parsed.json.asset).toMatchObject({
      version: "2.0",
      generator: expect.stringContaining(AURORA_MDL_TO_GLB_CONVERTER_VERSION)
    });
    expect(parsed.json.extras.aurora.converterVersion).toBe(
      AURORA_MDL_TO_GLB_CONVERTER_VERSION
    );
    expect(parsed.json.meshes[0].primitives[0].attributes).toEqual({
      POSITION: 0,
      NORMAL: 1,
      TEXCOORD_0: 2
    });
    expect(parsed.json.extras.aurora.textureReferences).toEqual(["plc_test_triangle_diff"]);
    expect(parsed.json.meshes[0].primitives[0].material).toBe(0);
    expect(parsed.json.materials[0]).toMatchObject({
      name: "Aurora material plc_test_triangle_diff",
      doubleSided: false,
      extras: {
        aurora: {
          sourceModel: "plc_test_triangle",
          textureReference: "plc_test_triangle_diff",
          textureReferences: ["plc_test_triangle_diff"]
        }
      }
    });
    expect(parsed.json.materials[0].extensions?.KHR_materials_unlit).toBeUndefined();
    expect(parsed.json.extensionsUsed).toBeUndefined();
    expect(result.warnings).toEqual([
      "Aurora MDL texture references were captured in GLB extras; image conversion is resolved through render package texture assets."
    ]);
    expect(parsed.json.accessors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentType: 5126,
          count: 3,
          type: "VEC3",
          min: [1, 3, 2],
          max: [2, 3, 3]
        }),
        expect.objectContaining({
          componentType: 5123,
          count: 3,
          type: "SCALAR"
        })
      ])
    );
    expect(parsed.json.buffers[0].byteLength).toBe(parsed.binary.length);
    expect(parsed.binary.length % 4).toBe(0);
  });

  it("accepts a legacy DOS SUB separator between an ASCII table header and its first row", () => {
    const legacyMdl = SAMPLE_ASCII_MDL.replace(
      "verts 3\n    0 0 0",
      "verts 3\u001a    0 0 0"
    );

    expect(convertAuroraMdlToGlb(legacyMdl)).toMatchObject({
      meshCount: 1,
      vertexCount: 3,
      triangleCount: 1
    });
  });

  it("uses the valid numeric prefix from a damaged Aurora ASCII float token", () => {
    const damagedMdl = SAMPLE_ASCII_MDL.replace(
      "    1 0 0",
      "    2>4000001 0 0"
    );
    const result = convertAuroraMdlToGlb(damagedMdl);
    const parsed = parseGlb(result.bytes);

    expect(result).toMatchObject({
      meshCount: 1,
      vertexCount: 3,
      triangleCount: 1
    });
    expect(parsed.json.accessors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentType: 5126,
          count: 3,
          type: "VEC3",
          min: [1, 3, 2],
          max: [3, 3, 3]
        })
      ])
    );
  });

  it.each([
    ["atj01_black", "atj01_black00"],
    ["atj01_fence02", "tfa01_fence02"],
    ["atj01_crvn02rf", "ttr01_crvn02rf"],
    ["ttr01_circus3", "atj19_circus3"],
    ["atj01_grassrim02", "atj51_grassrim02"],
    ["tbf01_black", "ttf01_black"],
    ["w_metal_tex", "w_metal_lok"]
  ])(
    "canonicalizes the known damaged Aurora texture reference %s to %s",
    (damagedReference, canonicalReference) => {
      const damagedMdl = SAMPLE_ASCII_MDL.replace(
        "plc_test_triangle_diff",
        damagedReference
      );
      const result = convertAuroraMdlToGlb(damagedMdl);
      const parsed = parseGlb(result.bytes);

      expect(result.textureReferences).toEqual([canonicalReference]);
      expect(parsed.json.extras.aurora.textureReferences).toEqual([canonicalReference]);
      expect(parsed.json.materials[0].extras.aurora).toMatchObject({
        textureReference: canonicalReference,
        textureReferences: [canonicalReference]
      });
    }
  );

  it("converts ASCII animmesh geometry used by animated placeables", () => {
    const result = convertAuroraAsciiMdlToGlb(
      SAMPLE_ASCII_MDL.replace("node trimesh mesh01", "node animmesh mesh01")
    );

    expect(result).toMatchObject({
      meshCount: 1,
      vertexCount: 3,
      triangleCount: 1
    });
  });

  it("emits one primitive/material texture reference per renderable trimesh", () => {
    const result = convertAuroraAsciiMdlToGlb(MULTI_TEXTURE_ASCII_MDL);
    const parsed = parseGlb(result.bytes);

    expect(result.textureReferences).toEqual(["tx_metal", "tx_wood"]);
    expect(parsed.json.meshes).toHaveLength(2);
    expect(parsed.json.nodes.map((node) => node.name)).toEqual(["mesh_wood", "mesh_metal"]);
    expect(parsed.json.nodes.map((node) => node.extras.aurora)).toEqual([
      {
        sourceMesh: "mesh_wood",
        sourceNodeType: "trimesh",
        sourceParentNode: "plc_test_multi"
      },
      {
        sourceMesh: "mesh_metal",
        sourceNodeType: "trimesh",
        sourceParentNode: "plc_test_multi"
      }
    ]);
    expect(parsed.json.materials).toHaveLength(2);
    expect(parsed.json.meshes.map((mesh) => mesh.primitives[0].material)).toEqual([0, 1]);
    expect(parsed.json.meshes.map((mesh) => mesh.primitives[0].extras.aurora)).toEqual([
      {
        sourceMesh: "mesh_wood",
        sourceNodeType: "trimesh",
        sourceParentNode: "plc_test_multi",
        textureReference: "tx_wood",
        textureSlots: [
          {
            slot: 0,
            role: "diffuse",
            reference: "tx_wood"
          }
        ]
      },
      {
        sourceMesh: "mesh_metal",
        sourceNodeType: "trimesh",
        sourceParentNode: "plc_test_multi",
        textureReference: "tx_metal",
        textureSlots: [
          {
            slot: 0,
            role: "diffuse",
            reference: "tx_metal"
          }
        ]
      }
    ]);
    expect(parsed.json.materials.map((material) => material.extras.aurora.textureReference)).toEqual([
      "tx_wood",
      "tx_metal"
    ]);
    expect(parsed.json.materials.map((material) => material.extras.aurora.textureReferences)).toEqual([
      ["tx_metal", "tx_wood"],
      ["tx_metal", "tx_wood"]
    ]);
  });

  it("preserves Aurora texture slot order for MTR-style texture0/1/2 fields", () => {
    const result = convertAuroraAsciiMdlToGlb(SLOT_TEXTURE_ASCII_MDL);
    const parsed = parseGlb(result.bytes);

    const textureSlots = [
      { slot: 0, role: "diffuse", reference: "tx_panel_d" },
      { slot: 1, role: "normal", reference: "tx_panel_n" },
      { slot: 2, role: "specular", reference: "tx_panel_s" }
    ];
    expect(result.textureReferences).toEqual([
      "tx_panel_bitmap",
      "tx_panel_d",
      "tx_panel_n",
      "tx_panel_s"
    ]);
    expect(parsed.json.materials[0].extras.aurora).toMatchObject({
      textureReference: "tx_panel_d",
      textureReferences: ["tx_panel_bitmap", "tx_panel_d", "tx_panel_n", "tx_panel_s"],
      textureSlots
    });
    expect(parsed.json.meshes[0].primitives[0].extras.aurora).toMatchObject({
      textureReference: "tx_panel_d",
      textureSlots
    });
  });

  it("applies ASCII node parent/orientation transform chains before writing GLB", () => {
    const result = convertAuroraAsciiMdlToGlb(HIERARCHY_TRANSFORM_ASCII_MDL);
    const parsed = parseGlb(result.bytes);

    expect(result.modelName).toBe("plc_test_hierarchy");
    expect(result.textureReferences).toEqual(["tx_child"]);
    expect(parsed.json.accessors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentType: 5126,
          count: 3,
          type: "VEC3",
          min: [9, 0, 1],
          max: [10, 0, 2]
        })
      ])
    );
    expect(parsed.json.nodes[0].extras.aurora).toEqual({
      sourceMesh: "mesh_child",
      sourceNodeType: "trimesh",
      sourceParentNode: "root"
    });
    expect(result.sourceHierarchy).toEqual([
      {
        name: "root",
        nodeType: "dummy",
        parentName: "plc_test_hierarchy",
        position: [10, 0, 0],
        orientation: [0, 0, 1, 1.5707963267948966],
        orientationFormat: "axis-angle",
        scale: 1
      },
      {
        name: "mesh_child",
        nodeType: "trimesh",
        parentName: "root",
        position: [1, 0, 0],
        scale: 1
      }
    ]);
    expect(parsed.json.extras.aurora).toMatchObject({
      sourceHierarchyNodeCount: 2,
      sourceHierarchyRootNodeNames: ["root"],
      sourceHierarchyNodeTypes: ["dummy", "trimesh"]
    });
    expect(parsed.json.scenes[0].extras.aurora.sourceHierarchy).toEqual(
      parsed.json.extras.aurora.sourceHierarchy
    );
  });

  it("converts emitter-only ASCII MDL to a proxy GLB and preserves emitter texture reference", () => {
    const result = convertAuroraMdlToGlb(EMITTER_ONLY_ASCII_MDL);
    const parsed = parseGlb(result.bytes);

    expect(result).toMatchObject({
      modelName: "vfx_smoke_test",
      meshCount: 1,
      textureReferences: ["fxpa_smoke01"],
      vertexCount: 4,
      triangleCount: 2
    });
    expect(parsed.json.extras.aurora.textureReferences).toEqual(["fxpa_smoke01"]);
  });

  it("preserves ASCII MDL supermodel and animation scale in GLB scene extras", () => {
    const result = convertAuroraMdlToGlb(SUPERMODEL_ASCII_MDL);
    const parsed = parseGlb(result.bytes);

    expect(result).toMatchObject({
      modelName: "c_guard",
      supermodel: "a_fa",
      animationScale: 1.5
    });
    expect(parsed.json.extras.aurora).toMatchObject({
      sourceModel: "c_guard",
      supermodel: "a_fa",
      animationScale: 1.5
    });
    expect(parsed.json.scenes[0].extras.aurora).toMatchObject({
      sourceModel: "c_guard",
      supermodel: "a_fa",
      animationScale: 1.5
    });
  });

  it("preserves ASCII MDL skin weights in GLB node and primitive extras", () => {
    const result = convertAuroraMdlToGlb(SKIN_WEIGHT_ASCII_MDL);
    const parsed = parseGlb(result.bytes);
    const skinPrimitive = parsed.json.meshes[0].primitives[0].extras.aurora;
    const skinNode = parsed.json.nodes[0].extras.aurora;

    expect(result.warnings).toContain(
      "Aurora MDL skin weights were captured in GLB extras for frontend CPU skin deformation."
    );
    expect(skinPrimitive).toMatchObject({
      sourceMesh: "torso_skin",
      sourceNodeType: "skin",
      sourceParentNode: "rootdummy",
      skinWeights: {
        format: "aurora-mdl-original-vertex-weights",
        sourceWeightVertexCount: 4,
        influencingBoneNames: ["rootdummy", "rshin_g"],
        maxInfluencesPerVertex: 2,
        requiresWeightNormalization: true
      }
    });
    expect(skinPrimitive.skinWeights?.gltfVertexSourceIndices).toEqual([0, 2, 1, 3]);
    expect(skinPrimitive.skinWeights?.originalVertexWeights).toEqual([
      [{ bone: "rootdummy", weight: 1 }],
      [
        { bone: "rootdummy", weight: 0.25 },
        { bone: "rshin_g", weight: 0.75 }
      ],
      [{ bone: "rshin_g", weight: 1 }],
      [
        { bone: "rootdummy", weight: 0.25 },
        { bone: "rshin_g", weight: 0.25 }
      ]
    ]);
    expect(skinNode.skinWeights).toEqual(skinPrimitive.skinWeights);
  });

  it("preserves ASCII MDL danglymesh constraints in GLB node and primitive extras", () => {
    const result = convertAuroraMdlToGlb(DANGLYMESH_ASCII_MDL);
    const parsed = parseGlb(result.bytes);
    const danglyPrimitive = parsed.json.meshes[0].primitives[0].extras.aurora;
    const danglyNode = parsed.json.nodes[0].extras.aurora;

    expect(danglyPrimitive).toMatchObject({
      sourceMesh: "cloak_dangly",
      sourceNodeType: "danglymesh",
      sourceParentNode: "rootdummy",
      danglymesh: {
        format: "aurora-mdl-danglymesh-constraints",
        sourceConstraintVertexCount: 4,
        period: 2.5,
        tightness: 0.75,
        displacement: 0.35
      }
    });
    expect(danglyPrimitive.danglymesh?.gltfVertexSourceIndices).toEqual([0, 2, 1, 3]);
    expect(danglyPrimitive.danglymesh?.originalConstraints).toEqual([
      0,
      128 / 255,
      1,
      64 / 255
    ]);
    expect(danglyNode.danglymesh).toEqual(danglyPrimitive.danglymesh);
  });

  it("preserves per-animation danglymesh overrides in source animation metadata", () => {
    const result = convertAuroraMdlToGlb(DANGLYMESH_ANIMATION_OVERRIDE_ASCII_MDL);
    const parsed = parseGlb(result.bytes);

    expect(result.sourceAnimations?.[0]).toMatchObject({
      name: "idle",
      nodeCount: 1,
      nodeNames: ["cloak_dangly"],
      nodes: [
        {
          nodeName: "cloak_dangly",
          positionKeyCount: 0,
          orientationKeyCount: 0,
          scaleKeyCount: 0,
          danglyDisplacement: -0.2,
          danglyPeriod: 0.75,
          danglyTightness: 0.6
        }
      ]
    });
    expect(parsed.json.extras.aurora.sourceAnimations?.[0]?.nodes?.[0]).toMatchObject({
      nodeName: "cloak_dangly",
      danglyDisplacement: -0.2,
      danglyPeriod: 0.75,
      danglyTightness: 0.6
    });
  });

  it("preserves animmesh UV animation metadata for frontend runtime playback", () => {
    const result = convertAuroraMdlToGlb(ANIMMESH_UV_ANIMATION_ASCII_MDL);
    const parsed = parseGlb(result.bytes);
    const animmeshPrimitive = parsed.json.meshes[0].primitives[0].extras.aurora;
    const animmeshNode = parsed.json.nodes[0].extras.aurora;

    expect(animmeshPrimitive).toMatchObject({
      sourceMesh: "glow_panel",
      sourceNodeType: "animmesh",
      animmesh: {
        format: "aurora-mdl-animmesh-tverts",
        sourceVertexCount: 3,
        gltfVertexSourceIndices: [0, 2, 1],
        sourceTvertCount: 3,
        gltfVertexSourceTvertIndices: [0, 2, 1]
      }
    });
    expect(animmeshNode.animmesh).toEqual(animmeshPrimitive.animmesh);
    expect(result.sourceAnimations?.[0]?.nodes?.[0]).toMatchObject({
      nodeName: "glow_panel",
      samplePeriod: 0.5,
      animVertCount: 6,
      animVerts: [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [0.5, 0, 0],
        [1, 0, 0],
        [0, 1, 0]
      ],
      animTvertCount: 6,
      animTverts: [
        [0, 0],
        [1, 0],
        [0, 1],
        [0.5, 0],
        [1, 0.5],
        [0.5, 1]
      ]
    });
    expect(parsed.json.extras.aurora.sourceAnimations?.[0]?.nodes?.[0]).toMatchObject({
      nodeName: "glow_panel",
      samplePeriod: 0.5,
      animVertCount: 6,
      animTvertCount: 6
    });
  });

  it("preserves source normals and tangents as GLB vertex attributes", () => {
    const result = convertAuroraMdlToGlb(SOURCE_NORMAL_TANGENT_ASCII_MDL);
    const parsed = parseGlb(result.bytes);
    const primitive = parsed.json.meshes[0].primitives[0];
    const aurora = primitive.extras.aurora;
    const material = parsed.json.materials[primitive.material];

    expect(primitive.attributes.TANGENT).toEqual(expect.any(Number));
    expect(aurora).toMatchObject({
      sourceMesh: "body",
      sourceNodeType: "trimesh",
      textureSlots: [
        { slot: 0, role: "diffuse", reference: "c_body" },
        { slot: 1, role: "normal", reference: "c_body_n" }
      ],
      vertexShading: {
        format: "aurora-mdl-source-vertex-shading",
        sourceNormalCount: 3,
        sourceTangentCount: 3,
        usesSourceNormals: true,
        usesSourceTangents: true
      },
      material: {
        format: "aurora-mdl-material",
        sourceKeys: [
          "alpha",
          "diffuse",
          "renderhint",
          "rotatetexture",
          "selfillumcolor",
          "shininess",
          "specular",
          "transparencyhint"
        ],
        diffuse: [0.2, 0.4, 0.6],
        specular: [0.5, 0.25, 0.1],
        shininess: 64,
        alpha: 0.5,
        transparencyHint: 1,
        rotateTexture: true,
        renderHint: "NormalAndSpecMapped",
        selfIllumColor: [0.1, 0.2, 0.3]
      }
    });
    expect(material.pbrMetallicRoughness).toMatchObject({
      baseColorFactor: [0.2, 0.4, 0.6, 0.5],
      metallicFactor: 0.25,
      roughnessFactor: 0.6
    });
    expect(material.alphaMode).toBe("BLEND");
    expect(material.emissiveFactor).toEqual([0.1, 0.2, 0.3]);
    expect(material.extensions?.KHR_materials_unlit).toBeUndefined();
    expect(aurora.material).toBeDefined();
    expect(material.extras.aurora.material).toMatchObject(aurora.material!);

    const normals = readAccessorFloatVectors(parsed, primitive.attributes.NORMAL, 3);
    const tangents = readAccessorFloatVectors(parsed, primitive.attributes.TANGENT, 4);
    expectVectorCloseTo(normals[0], [0, 1, 0]);
    expectVectorCloseTo(normals[1], [0, 1, 0]);
    expectVectorCloseTo(normals[2], [0, 1, 0]);
    expectVectorCloseTo(tangents[0], [1, 0, 0, -1]);
    expectVectorCloseTo(tangents[1], [1, 0, 0, -1]);
    expectVectorCloseTo(tangents[2], [1, 0, 0, -1]);
  });

  it("accepts ASCII vec4 tangent rows used by Witcher2 placeable models", () => {
    const result = convertAuroraMdlToGlb(SOURCE_VEC4_TANGENT_ASCII_MDL);
    const parsed = parseGlb(result.bytes);
    const primitive = parsed.json.meshes[0].primitives[0];

    expect(primitive.attributes.TANGENT).toEqual(expect.any(Number));
    expect(primitive.extras.aurora.vertexShading).toMatchObject({
      format: "aurora-mdl-source-vertex-shading",
      sourceNormalCount: 3,
      sourceTangentCount: 3,
      usesSourceNormals: true,
      usesSourceTangents: true
    });

    const tangents = readAccessorFloatVectors(parsed, primitive.attributes.TANGENT, 4);
    expectVectorCloseTo(tangents[0], [1, 0, 0, -1]);
    expectVectorCloseTo(tangents[1], [1, 0, 0, -1]);
    expectVectorCloseTo(tangents[2], [1, 0, 0, -1]);
  });

  it("uses NWN smoothing groups for generated fallback normals", () => {
    const hardResult = convertAuroraMdlToGlb(buildSmoothingGroupAsciiMdl(0));
    const hardParsed = parseGlb(hardResult.bytes);
    const hardPrimitive = hardParsed.json.meshes[0].primitives[0];
    const hardNormals = readAccessorFloatVectors(hardParsed, hardPrimitive.attributes.NORMAL, 3);

    expect(hardNormals).toHaveLength(6);
    expectVectorCloseTo(hardNormals[0], [0, 1, 0]);
    expectVectorCloseTo(hardNormals[1], [0, 1, 0]);
    expectVectorCloseTo(hardNormals[2], [0, 1, 0]);
    expectVectorCloseTo(hardNormals[3], [0, 0, -1]);
    expectVectorCloseTo(hardNormals[4], [0, 0, -1]);
    expectVectorCloseTo(hardNormals[5], [0, 0, -1]);

    const smoothResult = convertAuroraMdlToGlb(buildSmoothingGroupAsciiMdl(1));
    const smoothParsed = parseGlb(smoothResult.bytes);
    const smoothPrimitive = smoothParsed.json.meshes[0].primitives[0];
    const smoothNormals = readAccessorFloatVectors(
      smoothParsed,
      smoothPrimitive.attributes.NORMAL,
      3
    );

    expect(smoothNormals).toHaveLength(4);
    expectVectorCloseTo(smoothNormals[0], [0, Math.SQRT1_2, -Math.SQRT1_2]);
    expectVectorCloseTo(smoothNormals[1], [0, 1, 0]);
    expectVectorCloseTo(smoothNormals[2], [0, Math.SQRT1_2, -Math.SQRT1_2]);
    expectVectorCloseTo(smoothNormals[3], [0, 0, -1]);
  });

  it("accepts negative ASCII face smoothing sentinels used by CEP creature models", () => {
    const result = convertAuroraMdlToGlb(buildSmoothingGroupAsciiMdl(-2147483646));
    const parsed = parseGlb(result.bytes);
    const primitive = parsed.json.meshes[0].primitives[0];
    const normals = readAccessorFloatVectors(parsed, primitive.attributes.NORMAL, 3);

    expect(result.triangleCount).toBe(2);
    expect(normals).toHaveLength(6);
    expectVectorCloseTo(normals[0], [0, 1, 0]);
    expectVectorCloseTo(normals[1], [0, 1, 0]);
    expectVectorCloseTo(normals[2], [0, 1, 0]);
    expectVectorCloseTo(normals[3], [0, 0, -1]);
    expectVectorCloseTo(normals[4], [0, 0, -1]);
    expectVectorCloseTo(normals[5], [0, 0, -1]);
  });

  it("preserves ASCII MDL source animation metadata in GLB scene extras", () => {
    const result = convertAuroraMdlToGlb(SOURCE_ANIMATION_ASCII_MDL);
    const parsed = parseGlb(result.bytes);

    expect(result.sourceAnimations).toEqual([
      {
        name: "super_walk",
        targetModel: "c_anim_test",
        animRoot: "rootdummy",
        animationScale: 1.25,
        length: 1.5,
        transitionTime: 0.25,
        events: [{ time: 0.75, name: "footstep" }],
        nodeCount: 3,
        nodeNames: ["rootdummy", "rshin_g", "torso"],
        positionKeyCount: 2,
        orientationKeyCount: 1,
        scaleKeyCount: 1,
        alphaKeyCount: 2,
        selfIllumColorKeyCount: 2,
        nodes: [
          {
            nodeName: "rootdummy",
            positionKeyCount: 2,
            orientationKeyCount: 1,
            scaleKeyCount: 0,
            positionKeys: [
              { time: 0, value: [0, 0, 0] },
              { time: 1.5, value: [0, 0, 1] }
            ],
            orientationKeys: [
              { time: 0, axisAngle: [0, 0, 1, 0] }
            ],
            scaleKeys: []
          },
          {
            nodeName: "rshin_g",
            positionKeyCount: 0,
            orientationKeyCount: 0,
            scaleKeyCount: 1,
            positionKeys: [],
            orientationKeys: [],
            scaleKeys: [{ time: 0, value: 1 }]
          },
          {
            nodeName: "torso",
            positionKeyCount: 0,
            orientationKeyCount: 0,
            scaleKeyCount: 0,
            alphaKeyCount: 2,
            selfIllumColorKeyCount: 2,
            positionKeys: [],
            orientationKeys: [],
            scaleKeys: [],
            alphaKeys: [
              { time: 0, value: 1 },
              { time: 1.5, value: 0.25 }
            ],
            selfIllumColorKeys: [
              { time: 0, value: [0.1, 0.2, 0.3] },
              { time: 1.5, value: [0.8, 0.4, 0.2] }
            ]
          }
        ]
      }
    ]);
    expect(parsed.json.extras.aurora.sourceAnimationNames).toEqual(["super_walk"]);
    expect(parsed.json.extras.aurora.sourceAnimations?.[0]).toMatchObject({
      name: "super_walk",
      targetModel: "c_anim_test",
      animRoot: "rootdummy",
      animationScale: 1.25,
      events: [{ time: 0.75, name: "footstep" }],
      nodeCount: 3,
      positionKeyCount: 2,
      orientationKeyCount: 1,
      scaleKeyCount: 1,
      alphaKeyCount: 2,
      selfIllumColorKeyCount: 2
    });
    expect(parsed.json.scenes[0].extras.aurora.sourceAnimations).toEqual(
      parsed.json.extras.aurora.sourceAnimations
    );
  });

  it("converts geometryless supermodel animation MDLs into metadata-only GLB assets", () => {
    const result = convertAuroraMdlToGlb(SUPERMODEL_ANIMATION_ONLY_ASCII_MDL);
    const parsed = parseGlb(result.bytes);

    expect(result).toMatchObject({
      modelName: "a_fa",
      meshCount: 0,
      vertexCount: 0,
      triangleCount: 0,
      textureReferences: []
    });
    expect((result.sourceAnimations ?? []).map((animation) => animation.name)).toEqual([
      "super_walk"
    ]);
    expect(parsed.json.meshes).toEqual([]);
    expect(parsed.json.nodes).toEqual([]);
    expect(parsed.json.bufferViews).toEqual([]);
    expect(parsed.json.accessors).toEqual([]);
    expect(parsed.json.buffers[0].byteLength).toBe(0);
    expect(parsed.binary.length).toBe(0);
    expect(parsed.json.extras.aurora).toMatchObject({
      sourceModel: "a_fa",
      sourceAnimationNames: ["super_walk"],
      sourceHierarchyNodeCount: 3,
      sourceHierarchyRootNodeNames: ["a_fa"]
    });
  });

  it("rejects binary MDL/MDB input explicitly", () => {
    expect(() => convertAuroraAsciiMdlToGlb(Buffer.from([0, 1, 2, 3]))).toThrow(
      "Binary Aurora MDL/MDB is not supported"
    );
  });

  it("converts minimal binary MDL trimesh geometry to GLB", () => {
    const result = convertAuroraMdlToGlb(buildMinimalBinaryMdl());
    const parsed = parseGlb(result.bytes);

    expect(result).toMatchObject({
      modelName: "grimbook",
      meshCount: 1,
      textureReferences: ["u_grim"],
      vertexCount: 3,
      triangleCount: 1
    });
    expect(parsed.json.extras.aurora.textureReferences).toEqual(["u_grim"]);
    expect(parsed.json.meshes[0].primitives[0].extras.aurora).toEqual({
      sourceMesh: "u_grim",
      sourceNodeType: "trimesh",
      textureReference: "u_grim",
      textureSlots: [
        {
          slot: 0,
          role: "diffuse",
          reference: "u_grim"
        }
      ]
    });
  });

  it("preserves binary MDL rotatetexture mesh flag in GLB material metadata", () => {
    const result = convertAuroraMdlToGlb(buildMinimalBinaryMdl({ rotateTexture: true }));
    const parsed = parseGlb(result.bytes);
    const primitive = parsed.json.meshes[0].primitives[0];
    const material = parsed.json.materials[primitive.material];
    const primitiveMaterial = primitive.extras.aurora.material;

    expect(primitiveMaterial).toMatchObject({
      format: "aurora-mdl-material",
      sourceKeys: ["rotatetexture"],
      rotateTexture: true
    });
    expect(material.extras.aurora.material).toMatchObject(primitiveMaterial ?? {});
  });

  it("inspects skeleton-only binary MDL node hierarchies instead of rejecting them", () => {
    const bytes = buildSkeletonOnlyBinaryMdl();
    const inspection = inspectAuroraMdlSource(bytes);
    const result = convertAuroraMdlToGlb(bytes);
    const parsed = parseGlb(result.bytes);

    expect(inspection).toMatchObject({
      modelName: "pmh0",
      meshCount: 0,
      textureReferences: [],
      sourceHierarchyRootNodeNames: ["pmh0"],
      sourceHierarchyNodeTypes: ["dummy"],
      sourceHierarchyNodeTypeCounts: {
        dummy: 3
      }
    });
    expect(inspection.sourceHierarchy).toEqual([
      {
        name: "pmh0",
        nodeType: "dummy",
        position: [0, 0, 0],
        scale: 1
      },
      {
        name: "torso_g",
        nodeType: "dummy",
        parentName: "pmh0",
        position: [0, 0, 1],
        scale: 1
      },
      {
        name: "head_g",
        nodeType: "dummy",
        parentName: "torso_g",
        position: [0, 0, 0.25],
        scale: 1
      }
    ]);
    expect(result).toMatchObject({
      modelName: "pmh0",
      meshCount: 0,
      vertexCount: 0,
      triangleCount: 0,
      textureReferences: []
    });
    expect(parsed.json.meshes).toEqual([]);
    expect(parsed.json.extras.aurora).toMatchObject({
      sourceModel: "pmh0",
      sourceHierarchyNodeCount: 3,
      sourceHierarchyRootNodeNames: ["pmh0"]
    });
  });

  it("maps binary skin inverse bind poses through bone node indices", () => {
    const result = convertAuroraMdlToGlb(buildBinarySkinMdlWithNodeIndexedInverseBinds());
    const parsed = parseGlb(result.bytes);
    const skinWeights = parsed.json.meshes[0].primitives[0].extras.aurora.skinWeights;
    const inverseBindPoses = new Map(
      skinWeights?.inverseBindPoses?.map((pose) => [pose.bone, pose]) ?? []
    );

    expect(skinWeights?.influencingBoneNames).toEqual(["bone_a", "bone_b"]);
    expect(skinWeights?.originalVertexWeights[0]).toEqual([
      {
        bone: "bone_a",
        weight: 1
      }
    ]);
    expect(skinWeights?.originalVertexWeights[1]).toEqual([
      {
        bone: "bone_a",
        weight: 0.25
      },
      {
        bone: "bone_b",
        weight: 0.75
      }
    ]);
    expectVectorCloseTo(inverseBindPoses.get("bone_a")?.qboneRefInv, [0.1, 0.2, 0.3, 0.5]);
    expectVectorCloseTo(inverseBindPoses.get("bone_a")?.tboneRefInv, [1, 2, 3]);
    expectVectorCloseTo(inverseBindPoses.get("bone_b")?.qboneRefInv, [-0.4, 0.5, -0.6, 0.6]);
    expectVectorCloseTo(inverseBindPoses.get("bone_b")?.tboneRefInv, [4, 5, 6]);
  });

  it("preserves binary MDL source animation controller metadata for creature playback", () => {
    const result = convertAuroraMdlToGlb(buildBinaryMdlWithSourceAnimation());
    const parsed = parseGlb(result.bytes);

    expect(result.sourceAnimations?.[0]).toMatchObject({
      name: "walk",
      targetModel: "c_anim_bin",
      animRoot: "rootdummy",
      animationScale: 1.5,
      length: 1,
      transitionTime: 0.25,
      events: [{ time: 0.5, name: "footstep" }],
      nodeCount: 1,
      nodeNames: ["rootdummy"],
      positionKeyCount: 3,
      orientationKeyCount: 2,
      scaleKeyCount: 2,
      nodes: [
        {
          nodeName: "rootdummy",
          positionKeyCount: 3,
          orientationKeyCount: 2,
          scaleKeyCount: 2,
          positionKeys: [
            { time: 0, value: [0, 0, 0] },
            { time: 0.5, value: [0, 0, 1] },
            { time: 1, value: [0, 0, 2] }
          ],
          scaleKeys: [
            { time: 0, value: 1 },
            { time: 1, value: 1.25 }
          ]
        }
      ]
    });
    expect(result.supermodel).toBe("a_ba");
    expect(result.animationScale).toBe(1.5);
    expect(result.sourceAnimations?.[0]?.nodes[0]?.orientationKeys[0]).toEqual({
      time: 0,
      axisAngle: [0, 0, 1, 0]
    });
    expect(result.sourceAnimations?.[0]?.nodes[0]?.orientationKeys[1]?.time).toBe(1);
    expectVectorCloseTo(
      result.sourceAnimations?.[0]?.nodes[0]?.orientationKeys[1]?.axisAngle,
      [0, 0, 1, Math.PI / 2]
    );
    expect(parsed.json.extras.aurora.supermodel).toBe("a_ba");
    expect(parsed.json.extras.aurora.animationScale).toBe(1.5);
    expect(parsed.json.extras.aurora.sourceAnimationNames).toEqual(["walk"]);
    expect(parsed.json.scenes[0].extras.aurora.sourceAnimations).toEqual(
      parsed.json.extras.aurora.sourceAnimations
    );
  });

  it("converts emitter-only binary MDL to a proxy GLB and preserves emitter texture reference", () => {
    const result = convertAuroraMdlToGlb(buildEmitterOnlyBinaryMdl("fxpa_smoke01"));
    const parsed = parseGlb(result.bytes);

    expect(result).toMatchObject({
      modelName: "vfx_smoke_bin",
      meshCount: 1,
      textureReferences: ["fxpa_smoke01"],
      vertexCount: 4,
      triangleCount: 2
    });
    expect(parsed.json.extras.aurora.textureReferences).toEqual(["fxpa_smoke01"]);
  });

  it("writes converted GLB files through the CLI-facing file helper", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-mdl-glb-test-"));
    const inputPath = join(tempRoot, "plc_test_triangle.mdl");
    const outputPath = join(tempRoot, "out", "plc_test_triangle.glb");

    try {
      await writeFile(inputPath, SAMPLE_ASCII_MDL, "utf-8");
      const result = await convertAuroraMdlFileToGlb(inputPath, outputPath);
      const output = await readFile(outputPath);

      expect(output.equals(result.bytes)).toBe(true);
      expect(parseGlb(output).json.asset.version).toBe("2.0");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("writes binary MDL conversions through the CLI-facing file helper", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-mdl-glb-binary-test-"));
    const inputPath = join(tempRoot, "grimbook.mdl");
    const outputPath = join(tempRoot, "out", "grimbook.glb");

    try {
      await writeFile(inputPath, buildMinimalBinaryMdl());
      const result = await convertAuroraMdlFileToGlb(inputPath, outputPath);
      const output = await readFile(outputPath);
      const parsed = parseGlb(output);

      expect(output.equals(result.bytes)).toBe(true);
      expect(result.modelName).toBe("grimbook");
      expect(parsed.json.extras.aurora.textureReferences).toEqual(["u_grim"]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

function parseGlb(bytes: Buffer): {
  header: { magic: number; version: number; length: number };
  json: {
    asset: { version: string; generator: string };
    buffers: Array<{ byteLength: number }>;
    bufferViews: Array<{ byteOffset: number; byteLength: number; target: number }>;
    accessors: Array<Record<string, unknown>>;
    extensionsUsed?: string[];
    scenes: Array<{
      extras: {
        aurora: {
          sourceModel: string;
          converterVersion: string;
          textureReferences?: string[];
          supermodel?: string;
          animationScale?: number;
          sourceAnimationNames?: string[];
          sourceAnimations?: AuroraSourceAnimationTestMetadata[];
          sourceHierarchyNodeCount?: number;
          sourceHierarchyRootNodeNames?: string[];
          sourceHierarchyNodeTypes?: string[];
          sourceHierarchy?: AuroraSourceHierarchyTestNode[];
        };
      };
    }>;
    extras: {
      aurora: {
        sourceModel: string;
        converterVersion: string;
        textureReferences?: string[];
        supermodel?: string;
        animationScale?: number;
        sourceAnimationNames?: string[];
        sourceAnimations?: AuroraSourceAnimationTestMetadata[];
        sourceHierarchyNodeCount?: number;
        sourceHierarchyRootNodeNames?: string[];
        sourceHierarchyNodeTypes?: string[];
        sourceHierarchy?: AuroraSourceHierarchyTestNode[];
      };
    };
    materials: Array<{
      pbrMetallicRoughness?: {
        baseColorFactor?: number[];
        metallicFactor?: number;
        roughnessFactor?: number;
      };
      alphaMode?: string;
      alphaCutoff?: number;
      emissiveFactor?: number[];
      extensions?: { KHR_materials_unlit?: Record<string, never> };
      extras: {
        aurora: {
          textureReference?: string;
          textureReferences: string[];
          textureSlots?: Array<{ slot: number; role: string; reference: string }>;
          material?: AuroraMdlMaterialTestMetadata;
        };
      };
      [key: string]: unknown;
    }>;
    meshes: Array<{
      primitives: Array<{
        attributes: Record<string, number>;
        material: number;
        extras: {
          aurora: {
            sourceMesh: string;
            sourceNodeType?: string;
            sourceParentNode?: string;
            textureReference?: string;
            textureSlots?: Array<{ slot: number; role: string; reference: string }>;
            material?: AuroraMdlMaterialTestMetadata;
            skinWeights?: AuroraSkinWeightsTestMetadata;
            danglymesh?: AuroraDanglymeshTestMetadata;
            animmesh?: AuroraAnimmeshTestMetadata;
            vertexShading?: AuroraVertexShadingTestMetadata;
          };
        };
      }>;
    }>;
    nodes: Array<{
      name: string;
      mesh: number;
      extras: {
        aurora: {
          sourceMesh: string;
          sourceNodeType?: string;
          sourceParentNode?: string;
          material?: AuroraMdlMaterialTestMetadata;
          skinWeights?: AuroraSkinWeightsTestMetadata;
          danglymesh?: AuroraDanglymeshTestMetadata;
          animmesh?: AuroraAnimmeshTestMetadata;
          vertexShading?: AuroraVertexShadingTestMetadata;
        };
      };
    }>;
  };
  binary: Buffer;
} {
  const header = {
    magic: bytes.readUInt32LE(0),
    version: bytes.readUInt32LE(4),
    length: bytes.readUInt32LE(8)
  };
  const jsonLength = bytes.readUInt32LE(12);
  const jsonType = bytes.readUInt32LE(16);
  expect(jsonType).toBe(0x4e4f534a);

  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLength;
  const json = JSON.parse(bytes.subarray(jsonStart, jsonEnd).toString("utf-8").trimEnd());

  const binLength = bytes.readUInt32LE(jsonEnd);
  const binType = bytes.readUInt32LE(jsonEnd + 4);
  expect(binType).toBe(0x004e4942);
  const binary = bytes.subarray(jsonEnd + 8, jsonEnd + 8 + binLength);

  return {
    header,
    json,
    binary
  };
}

interface AuroraSkinWeightsTestMetadata {
  format: "aurora-mdl-original-vertex-weights";
  sourceWeightVertexCount: number;
  gltfVertexSourceIndices: number[];
  influencingBoneNames: string[];
  maxInfluencesPerVertex: number;
  requiresWeightNormalization: boolean;
  originalVertexWeights: Array<Array<{ bone: string; weight: number }>>;
  inverseBindPoses?: Array<{
    bone: string;
    qboneRefInv?: [number, number, number, number];
    tboneRefInv?: [number, number, number];
  }>;
}

interface AuroraDanglymeshTestMetadata {
  format: "aurora-mdl-danglymesh-constraints";
  sourceConstraintVertexCount: number;
  gltfVertexSourceIndices: number[];
  originalConstraints: number[];
  period: number;
  tightness: number;
  displacement: number;
}

interface AuroraAnimmeshTestMetadata {
  format: "aurora-mdl-animmesh-tverts";
  sourceVertexCount?: number;
  gltfVertexSourceIndices?: number[];
  sourceTvertCount: number;
  gltfVertexSourceTvertIndices: number[];
}

interface AuroraVertexShadingTestMetadata {
  format: "aurora-mdl-source-vertex-shading";
  sourceNormalCount: number;
  sourceTangentCount: number;
  usesSourceNormals: boolean;
  usesSourceTangents: boolean;
}

interface AuroraMdlMaterialTestMetadata {
  format: "aurora-mdl-material";
  sourceKeys: string[];
  ambient: [number, number, number];
  diffuse: [number, number, number];
  specular: [number, number, number];
  shininess: number;
  alpha: number;
  transparencyHint: number;
  render: number;
  materialName?: string;
  renderHint?: string;
  selfIllumColor?: [number, number, number];
}

interface AuroraSourceAnimationTestMetadata {
  name: string;
  targetModel?: string;
  animRoot?: string;
  animationScale?: number;
  length: number;
  transitionTime: number;
  nodeCount: number;
  nodeNames: string[];
  positionKeyCount: number;
  orientationKeyCount: number;
  scaleKeyCount: number;
  alphaKeyCount?: number;
  nodes: Array<{
    nodeName: string;
    positionKeyCount: number;
    orientationKeyCount: number;
    scaleKeyCount: number;
    alphaKeyCount?: number;
    danglyDisplacement?: number;
    danglyPeriod?: number;
    danglyTightness?: number;
    samplePeriod?: number;
    animVertCount?: number;
    animVerts?: Array<[number, number, number]>;
    animTvertCount?: number;
    animTverts?: Array<[number, number]>;
    positionKeys: Array<{ time: number; value: [number, number, number] }>;
    orientationKeys: Array<{ time: number; axisAngle: [number, number, number, number] }>;
    scaleKeys: Array<{ time: number; value: number }>;
    alphaKeys?: Array<{ time: number; value: number }>;
  }>;
}

interface AuroraSourceHierarchyTestNode {
  name: string;
  nodeType: string;
  parentName?: string;
  position: [number, number, number];
  orientation?: [number, number, number, number];
  orientationFormat?: "axis-angle" | "quaternion";
  scale: number;
}

function readAccessorFloatVectors(
  parsed: ReturnType<typeof parseGlb>,
  accessorIndex: number,
  componentCount: number
): number[][] {
  const accessor = parsed.json.accessors[accessorIndex] as {
    bufferView: number;
    byteOffset?: number;
    count: number;
  };
  const bufferView = parsed.json.bufferViews[accessor.bufferView];
  const byteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const vectors: number[][] = [];
  for (let index = 0; index < accessor.count; index += 1) {
    const vector: number[] = [];
    for (let component = 0; component < componentCount; component += 1) {
      vector.push(
        parsed.binary.readFloatLE(byteOffset + (index * componentCount + component) * 4)
      );
    }
    vectors.push(vector);
  }
  return vectors;
}

function expectVectorCloseTo(actual: number[] | undefined, expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => {
    expect(actual?.[index]).toBeCloseTo(value);
  });
}

function buildMinimalBinaryMdl(options: { rotateTexture?: boolean } = {}): Buffer {
  const modelDataSize = 1024;
  const rawDataSize = 60;
  const bytes = Buffer.alloc(12 + modelDataSize + rawDataSize);
  const rootNodeOffset = 232;
  const rootAbsOffset = 12 + rootNodeOffset;
  const facesOffset = 900;
  const rawBase = 12 + modelDataSize;

  bytes.writeUInt32LE(0, 0);
  bytes.writeUInt32LE(modelDataSize, 4);
  bytes.writeUInt32LE(rawDataSize, 8);
  writeCString(bytes, 20, 64, "grimbook");
  bytes.writeUInt32LE(rootNodeOffset, 84);

  writeCString(bytes, rootAbsOffset + 32, 32, "u_grim");
  bytes.writeUInt32LE(0x0021, rootAbsOffset + 108);
  bytes.writeUInt32LE(facesOffset, rootAbsOffset + 120);
  bytes.writeUInt32LE(1, rootAbsOffset + 124);
  bytes.writeUInt32LE(1, rootAbsOffset + 128);
  bytes.writeUInt32LE(1, rootAbsOffset + 220);
  writeCString(bytes, rootAbsOffset + 232, 64, "u_grim");
  bytes.writeUInt32LE(0, rootAbsOffset + 556);
  bytes.writeUInt16LE(3, rootAbsOffset + 560);
  bytes.writeUInt32LE(36, rootAbsOffset + 564);
  bytes.writeUInt32LE(0xffffffff, rootAbsOffset + 568);
  bytes.writeUInt32LE(0xffffffff, rootAbsOffset + 572);
  bytes.writeUInt32LE(0xffffffff, rootAbsOffset + 576);
  if (options.rotateTexture === true) {
    bytes.writeUInt8(1, rootAbsOffset + 0x265);
  }

  writeVec3(bytes, rawBase, [0, 0, 0]);
  writeVec3(bytes, rawBase + 12, [1, 0, 0]);
  writeVec3(bytes, rawBase + 24, [0, 1, 0]);
  writeVec2(bytes, rawBase + 36, [0, 0]);
  writeVec2(bytes, rawBase + 44, [1, 0]);
  writeVec2(bytes, rawBase + 52, [0, 1]);

  const faceOffset = 12 + facesOffset + 26;
  bytes.writeUInt16LE(0, faceOffset);
  bytes.writeUInt16LE(1, faceOffset + 2);
  bytes.writeUInt16LE(2, faceOffset + 4);

  return bytes;
}

function buildSkeletonOnlyBinaryMdl(): Buffer {
  const modelDataSize = 1024;
  const bytes = Buffer.alloc(12 + modelDataSize);
  const rootNodeOffset = 232;
  const torsoNodeOffset = 360;
  const headNodeOffset = 488;
  let cursor = 640;

  bytes.writeUInt32LE(0, 0);
  bytes.writeUInt32LE(modelDataSize, 4);
  bytes.writeUInt32LE(0, 8);
  writeCString(bytes, 20, 64, "pmh0");
  bytes.writeUInt32LE(rootNodeOffset, 84);

  writeSkeletonBinaryNode(bytes, rootNodeOffset, "pmh0", [torsoNodeOffset], [0, 0, 0], cursor);
  cursor += 4;
  writeSkeletonBinaryNode(
    bytes,
    torsoNodeOffset,
    "torso_g",
    [headNodeOffset],
    [0, 0, 1],
    cursor
  );
  cursor += 40;
  writeSkeletonBinaryNode(bytes, headNodeOffset, "head_g", [], [0, 0, 0.25], cursor);

  return bytes;
}

function buildBinarySkinMdlWithNodeIndexedInverseBinds(): Buffer {
  const modelDataSize = 4096;
  const rawDataSize = 132;
  const bytes = Buffer.alloc(12 + modelDataSize + rawDataSize);
  const rootNodeOffset = 232;
  const boneANodeOffset = 360;
  const boneBNodeOffset = 488;
  const skinNodeOffset = 616;
  const skinAbsOffset = 12 + skinNodeOffset;
  const facesOffset = 2200;
  const qboneOffset = 2600;
  const tboneOffset = 2700;
  const rawBase = 12 + modelDataSize;

  bytes.writeUInt32LE(0, 0);
  bytes.writeUInt32LE(modelDataSize, 4);
  bytes.writeUInt32LE(rawDataSize, 8);
  writeCString(bytes, 20, 64, "c_skin_bin");
  bytes.writeUInt32LE(rootNodeOffset, 84);

  writeSkeletonBinaryNode(
    bytes,
    rootNodeOffset,
    "c_skin_bin",
    [boneANodeOffset, boneBNodeOffset, skinNodeOffset],
    [0, 0, 0],
    1800
  );
  writeSkeletonBinaryNode(bytes, boneANodeOffset, "bone_a", [], [0, 0, 0], 1900);
  writeSkeletonBinaryNode(bytes, boneBNodeOffset, "bone_b", [], [0, 0, 0], 1950);
  bytes.writeInt32LE(0, 12 + rootNodeOffset + 28);
  bytes.writeInt32LE(1, 12 + boneANodeOffset + 28);
  bytes.writeInt32LE(2, 12 + boneBNodeOffset + 28);

  writeCString(bytes, skinAbsOffset + 32, 32, "skin_mesh");
  bytes.writeInt32LE(3, skinAbsOffset + 28);
  bytes.writeUInt32LE(0x0061, skinAbsOffset + 108);
  bytes.writeUInt32LE(facesOffset, skinAbsOffset + 120);
  bytes.writeUInt32LE(1, skinAbsOffset + 124);
  bytes.writeUInt32LE(1, skinAbsOffset + 128);
  bytes.writeUInt32LE(1, skinAbsOffset + 220);
  writeCString(bytes, skinAbsOffset + 232, 64, "skin_diff");
  bytes.writeUInt32LE(0, skinAbsOffset + 556);
  bytes.writeUInt16LE(3, skinAbsOffset + 560);
  bytes.writeUInt32LE(36, skinAbsOffset + 564);
  bytes.writeUInt32LE(0xffffffff, skinAbsOffset + 568);
  bytes.writeUInt32LE(0xffffffff, skinAbsOffset + 572);
  bytes.writeUInt32LE(0xffffffff, skinAbsOffset + 576);
  bytes.writeUInt32LE(60, skinAbsOffset + 0x027c);
  bytes.writeUInt32LE(108, skinAbsOffset + 0x0280);
  bytes.writeUInt32LE(qboneOffset, skinAbsOffset + 0x028c);
  bytes.writeUInt32LE(4, skinAbsOffset + 0x0290);
  bytes.writeUInt32LE(4, skinAbsOffset + 0x0294);
  bytes.writeUInt32LE(tboneOffset, skinAbsOffset + 0x0298);
  bytes.writeUInt32LE(4, skinAbsOffset + 0x029c);
  bytes.writeUInt32LE(4, skinAbsOffset + 0x02a0);
  for (let index = 0; index < 64; index += 1) {
    bytes.writeInt16LE(-1, skinAbsOffset + 0x02b0 + index * 2);
  }
  bytes.writeInt16LE(1, skinAbsOffset + 0x02b0);
  bytes.writeInt16LE(2, skinAbsOffset + 0x02b2);

  writeVec3(bytes, rawBase, [0, 0, 0]);
  writeVec3(bytes, rawBase + 12, [1, 0, 0]);
  writeVec3(bytes, rawBase + 24, [0, 1, 0]);
  writeVec2(bytes, rawBase + 36, [0, 0]);
  writeVec2(bytes, rawBase + 44, [1, 0]);
  writeVec2(bytes, rawBase + 52, [0, 1]);
  writeSkinWeightRow(bytes, rawBase + 60, [1, 0, 0, 0]);
  writeSkinWeightRow(bytes, rawBase + 76, [0.25, 0.75, 0, 0]);
  writeSkinWeightRow(bytes, rawBase + 92, [0, 1, 0, 0]);
  writeSkinBoneRefRow(bytes, rawBase + 108, [0, -1, -1, -1]);
  writeSkinBoneRefRow(bytes, rawBase + 116, [0, 1, -1, -1]);
  writeSkinBoneRefRow(bytes, rawBase + 124, [1, -1, -1, -1]);

  const faceOffset = 12 + facesOffset + 26;
  bytes.writeUInt16LE(0, faceOffset);
  bytes.writeUInt16LE(1, faceOffset + 2);
  bytes.writeUInt16LE(2, faceOffset + 4);

  writeQuaternionWxyz(bytes, 12 + qboneOffset, [1, 0, 0, 0]);
  writeQuaternionWxyz(bytes, 12 + qboneOffset + 16, [0.5, 0.1, 0.2, 0.3]);
  writeQuaternionWxyz(bytes, 12 + qboneOffset + 32, [0.6, -0.4, 0.5, -0.6]);
  writeQuaternionWxyz(bytes, 12 + qboneOffset + 48, [1, 0, 0, 0]);
  writeVec3(bytes, 12 + tboneOffset, [0, 0, 0]);
  writeVec3(bytes, 12 + tboneOffset + 12, [1, 2, 3]);
  writeVec3(bytes, 12 + tboneOffset + 24, [4, 5, 6]);
  writeVec3(bytes, 12 + tboneOffset + 36, [7, 8, 9]);

  return bytes;
}

function buildBinaryMdlWithSourceAnimation(): Buffer {
  const modelDataSize = 4096;
  const bytes = Buffer.alloc(12 + modelDataSize);
  const rootNodeOffset = 232;
  const childNodeOffset = 360;
  const animationArrayOffset = 640;
  const animationOffset = 700;
  const animationRootNodeOffset = 900;
  const animationChildNodeOffset = 1028;
  const animationControllerKeysOffset = 1200;
  const animationControllerDataOffset = 1280;
  const animationEventArrayOffset = 1700;

  bytes.writeUInt32LE(0, 0);
  bytes.writeUInt32LE(modelDataSize, 4);
  bytes.writeUInt32LE(0, 8);
  writeCString(bytes, 20, 64, "c_anim_bin");
  bytes.writeUInt32LE(rootNodeOffset, 84);
  bytes.writeUInt32LE(animationArrayOffset, 132);
  bytes.writeUInt32LE(1, 136);
  bytes.writeUInt32LE(1, 140);
  bytes.writeFloatLE(1.5, 176);
  writeCString(bytes, 180, 64, "a_ba");
  bytes.writeUInt32LE(animationOffset, 12 + animationArrayOffset);

  writeSkeletonBinaryNode(
    bytes,
    rootNodeOffset,
    "c_anim_bin",
    [childNodeOffset],
    [0, 0, 0],
    1500
  );
  writeSkeletonBinaryNode(bytes, childNodeOffset, "rootdummy", [], [0, 0, 0], 1540);

  const animationAbsOffset = 12 + animationOffset;
  writeCString(bytes, animationAbsOffset + 8, 64, "walk");
  bytes.writeUInt32LE(animationRootNodeOffset, animationAbsOffset + 72);
  bytes.writeUInt32LE(2, animationAbsOffset + 76);
  bytes.writeFloatLE(1, animationAbsOffset + 112);
  bytes.writeFloatLE(0.25, animationAbsOffset + 116);
  writeCString(bytes, animationAbsOffset + 120, 64, "rootdummy");
  bytes.writeUInt32LE(animationEventArrayOffset, animationAbsOffset + 184);
  bytes.writeUInt32LE(1, animationAbsOffset + 188);
  bytes.writeFloatLE(0.5, 12 + animationEventArrayOffset + 12);
  writeCString(bytes, 12 + animationEventArrayOffset + 16, 32, "footstep");

  writeAnimationBinaryNode(bytes, animationRootNodeOffset, "c_anim_bin", [
    animationChildNodeOffset
  ]);
  writeAnimationBinaryNode(bytes, animationChildNodeOffset, "rootdummy", []);
  writeBinaryAnimationControllers(
    bytes,
    animationChildNodeOffset,
    animationControllerKeysOffset,
    animationControllerDataOffset,
    [
      {
        type: 8,
        times: [0, 0.5, 1],
        rows: [
          [0, 0, 0],
          [0, 0, 1],
          [0, 0, 2]
        ]
      },
      {
        type: 20,
        times: [0, 1],
        rows: [
          [0, 0, 0, 1],
          [0, 0, Math.SQRT1_2, Math.SQRT1_2]
        ]
      },
      {
        type: 36,
        times: [0, 1],
        rows: [[1], [1.25]]
      }
    ]
  );

  return bytes;
}

function writeSkinWeightRow(
  bytes: Buffer,
  offset: number,
  values: [number, number, number, number]
): void {
  values.forEach((value, index) => {
    bytes.writeFloatLE(value, offset + index * 4);
  });
}

function writeSkinBoneRefRow(
  bytes: Buffer,
  offset: number,
  values: [number, number, number, number]
): void {
  values.forEach((value, index) => {
    bytes.writeInt16LE(value, offset + index * 2);
  });
}

function writeQuaternionWxyz(
  bytes: Buffer,
  offset: number,
  values: [number, number, number, number]
): void {
  values.forEach((value, index) => {
    bytes.writeFloatLE(value, offset + index * 4);
  });
}

function writeAnimationBinaryNode(
  bytes: Buffer,
  nodeOffset: number,
  name: string,
  childOffsets: number[]
): void {
  const absOffset = 12 + nodeOffset;
  writeCString(bytes, absOffset + 32, 32, name);
  bytes.writeUInt32LE(0, absOffset + 108);

  if (childOffsets.length > 0) {
    const childrenOffset = nodeOffset + 112;
    bytes.writeUInt32LE(childrenOffset, absOffset + 72);
    bytes.writeUInt32LE(childOffsets.length, absOffset + 76);
    bytes.writeUInt32LE(childOffsets.length, absOffset + 80);
    childOffsets.forEach((childOffset, index) => {
      bytes.writeUInt32LE(childOffset, 12 + childrenOffset + index * 4);
    });
  }
}

function writeBinaryAnimationControllers(
  bytes: Buffer,
  nodeOffset: number,
  controllerKeysOffset: number,
  controllerDataOffset: number,
  controllers: Array<{ type: number; times: number[]; rows: number[][] }>
): void {
  const nodeAbsOffset = 12 + nodeOffset;
  let dataCount = 0;
  controllers.forEach((controller, index) => {
    const columns = controller.rows[0]?.length ?? 0;
    const keyAbsOffset = 12 + controllerKeysOffset + index * 12;
    const dataStart = dataCount + controller.times.length;
    bytes.writeUInt32LE(controller.type, keyAbsOffset);
    bytes.writeUInt16LE(controller.rows.length, keyAbsOffset + 4);
    bytes.writeUInt16LE(0, keyAbsOffset + 6);
    bytes.writeUInt16LE(dataStart, keyAbsOffset + 8);
    bytes.writeUInt8(columns, keyAbsOffset + 10);
    controller.times.forEach((time, timeIndex) => {
      bytes.writeFloatLE(time, 12 + controllerDataOffset + (dataCount + timeIndex) * 4);
    });
    controller.rows.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        bytes.writeFloatLE(
          value,
          12 +
            controllerDataOffset +
            (dataStart + rowIndex * columns + columnIndex) * 4
        );
      });
    });
    dataCount += controller.times.length + controller.rows.length * columns;
  });

  bytes.writeUInt32LE(controllerKeysOffset, nodeAbsOffset + 84);
  bytes.writeUInt32LE(controllers.length, nodeAbsOffset + 88);
  bytes.writeUInt32LE(controllers.length, nodeAbsOffset + 92);
  bytes.writeUInt32LE(controllerDataOffset, nodeAbsOffset + 96);
  bytes.writeUInt32LE(dataCount, nodeAbsOffset + 100);
  bytes.writeUInt32LE(dataCount, nodeAbsOffset + 104);
}

function writeSkeletonBinaryNode(
  bytes: Buffer,
  nodeOffset: number,
  name: string,
  childOffsets: number[],
  position: [number, number, number],
  dataOffset: number
): void {
  const absOffset = 12 + nodeOffset;
  writeCString(bytes, absOffset + 32, 32, name);
  bytes.writeUInt32LE(0, absOffset + 108);

  if (childOffsets.length > 0) {
    bytes.writeUInt32LE(dataOffset, absOffset + 72);
    bytes.writeUInt32LE(childOffsets.length, absOffset + 76);
    bytes.writeUInt32LE(childOffsets.length, absOffset + 80);
    childOffsets.forEach((childOffset, index) => {
      bytes.writeUInt32LE(childOffset, 12 + dataOffset + index * 4);
    });
  }

  const controllerKeyOffset = dataOffset + childOffsets.length * 4;
  const controllerDataOffset = controllerKeyOffset + 12;
  bytes.writeUInt32LE(controllerKeyOffset, absOffset + 84);
  bytes.writeUInt32LE(1, absOffset + 88);
  bytes.writeUInt32LE(1, absOffset + 92);
  bytes.writeUInt32LE(controllerDataOffset, absOffset + 96);
  bytes.writeUInt32LE(3, absOffset + 100);
  bytes.writeUInt32LE(3, absOffset + 104);

  bytes.writeUInt32LE(8, 12 + controllerKeyOffset);
  bytes.writeUInt16LE(1, 12 + controllerKeyOffset + 4);
  bytes.writeUInt16LE(0, 12 + controllerKeyOffset + 8);
  bytes.writeUInt8(3, 12 + controllerKeyOffset + 10);
  writeVec3(bytes, 12 + controllerDataOffset, position);
}

function buildEmitterOnlyBinaryMdl(textureName: string): Buffer {
  const modelDataSize = 512;
  const bytes = Buffer.alloc(12 + modelDataSize);
  const rootNodeOffset = 232;
  const rootAbsOffset = 12 + rootNodeOffset;

  bytes.writeUInt32LE(0, 0);
  bytes.writeUInt32LE(modelDataSize, 4);
  bytes.writeUInt32LE(0, 8);
  writeCString(bytes, 20, 64, "vfx_smoke_bin");
  bytes.writeUInt32LE(rootNodeOffset, 84);

  writeCString(bytes, rootAbsOffset + 32, 32, "emit_smoke");
  bytes.writeUInt32LE(0x0004, rootAbsOffset + 108);
  writeCString(bytes, rootAbsOffset + 232, 64, textureName);

  return bytes;
}

function writeCString(bytes: Buffer, offset: number, length: number, value: string): void {
  bytes.write(value, offset, Math.min(length - 1, Buffer.byteLength(value)), "ascii");
}

function writeVec3(bytes: Buffer, offset: number, value: [number, number, number]): void {
  bytes.writeFloatLE(value[0], offset);
  bytes.writeFloatLE(value[1], offset + 4);
  bytes.writeFloatLE(value[2], offset + 8);
}

function writeVec2(bytes: Buffer, offset: number, value: [number, number]): void {
  bytes.writeFloatLE(value[0], offset);
  bytes.writeFloatLE(value[1], offset + 4);
}
