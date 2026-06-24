import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  convertAuroraAsciiMdlToGlb,
  convertAuroraMdlToGlb,
  convertAuroraMdlFileToGlb
} from "../../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";

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

const HIERARCHY_TRANSFORM_ASCII_MDL = `
newmodel plc_test_hierarchy
beginmodelgeom plc_test_hierarchy
node dummy root
  parent plc_test_hierarchy
  position 10 0 0
  orientation 0 0 0.70710678 0.70710678
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
      generator: "aurora-web aurora-mdl-to-glb"
    });
    expect(parsed.json.meshes[0].primitives[0].attributes).toEqual({
      POSITION: 0,
      NORMAL: 1,
      TEXCOORD_0: 2
    });
    expect(parsed.json.extras.aurora.textureReferences).toEqual(["plc_test_triangle_diff"]);
    expect(parsed.json.meshes[0].primitives[0].material).toBe(0);
    expect(parsed.json.materials[0]).toMatchObject({
      name: "Aurora material plc_test_triangle_diff",
      extras: {
        aurora: {
          sourceModel: "plc_test_triangle",
          textureReference: "plc_test_triangle_diff",
          textureReferences: ["plc_test_triangle_diff"]
        }
      }
    });
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
    expect(parsed.json.meshes[0].primitives).toHaveLength(2);
    expect(parsed.json.materials).toHaveLength(2);
    expect(parsed.json.meshes[0].primitives.map((primitive) => primitive.material)).toEqual([0, 1]);
    expect(parsed.json.meshes[0].primitives.map((primitive) => primitive.extras.aurora)).toEqual([
      {
        sourceMesh: "mesh_wood",
        textureReference: "tx_wood"
      },
      {
        sourceMesh: "mesh_metal",
        textureReference: "tx_metal"
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
      textureReference: "u_grim"
    });
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
    extras: { aurora: { textureReferences: string[] } };
    materials: Array<{
      extras: { aurora: { textureReference?: string; textureReferences: string[] } };
      [key: string]: unknown;
    }>;
    meshes: Array<{
      primitives: Array<{
        attributes: Record<string, number>;
        material: number;
        extras: { aurora: { sourceMesh: string; textureReference?: string } };
      }>;
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

function buildMinimalBinaryMdl(): Buffer {
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
