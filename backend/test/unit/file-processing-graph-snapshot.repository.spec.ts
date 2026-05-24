import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import { FileProcessingGraphSnapshotRepository } from "../../src/modules/processing-graph/adapters/outbound/file/file-processing-graph-snapshot.repository";
import type { ProcessingGraphSnapshot } from "../../src/modules/processing-graph/domain/processing-graph.types";

describe("FileProcessingGraphSnapshotRepository", () => {
  const tmpDir = path.resolve(
    process.cwd(),
    "test/.tmp/file-processing-graph-snapshot-repository"
  );

  beforeEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null for missing snapshot file and caches missing state", async () => {
    const file = path.join(tmpDir, "missing.json");
    const repository = createRepository(file);

    await expect(repository.getLatest()).resolves.toBeNull();
    await expect(repository.getLatest()).resolves.toBeNull();
  });

  it("saves snapshot and returns cloned cached value", async () => {
    const file = path.join(tmpDir, "saved.json");
    const repository = createRepository(file);
    const snapshot = createSnapshot("hash-1");

    await repository.saveLatest(snapshot);
    const loaded = await repository.getLatest();

    expect(loaded).toEqual(snapshot);
    expect(loaded).not.toBe(snapshot);

    loaded!.datasetHash = "mutated";
    const loadedAgain = await repository.getLatest();
    expect(loadedAgain!.datasetHash).toBe("hash-1");

    const rawFile = await readFile(file, "utf-8");
    expect(rawFile.endsWith("\n")).toBe(true);
  });

  it("reads existing snapshot from file and then serves cached value", async () => {
    const file = path.join(tmpDir, "existing.json");
    const repository = createRepository(file);
    const first = createSnapshot("hash-first");
    const second = createSnapshot("hash-second");

    await writeFile(file, `${JSON.stringify(first)}\n`, "utf-8");

    const loadedFirst = await repository.getLatest();
    expect(loadedFirst?.datasetHash).toBe("hash-first");

    await writeFile(file, `${JSON.stringify(second)}\n`, "utf-8");
    const loadedSecond = await repository.getLatest();

    expect(loadedSecond?.datasetHash).toBe("hash-first");
  });

  it("treats malformed JSON as missing snapshot", async () => {
    const file = path.join(tmpDir, "malformed.json");
    const repository = createRepository(file);
    await writeFile(file, "{ bad json", "utf-8");

    await expect(repository.getLatest()).resolves.toBeNull();
  });

  it("treats invalid snapshot shape as missing snapshot", async () => {
    const file = path.join(tmpDir, "invalid-shape.json");
    const repository = createRepository(file);
    await writeFile(file, `${JSON.stringify({ generatedAt: "x" })}\n`, "utf-8");

    await expect(repository.getLatest()).resolves.toBeNull();
  });
});

function createRepository(snapshotFile: string) {
  const config = {
    processingGraphSnapshotFile: snapshotFile
  } as AppConfigService;
  return new FileProcessingGraphSnapshotRepository(config);
}

function createSnapshot(datasetHash: string): ProcessingGraphSnapshot {
  return {
    generatedAt: "2026-05-24T00:00:00.000Z",
    datasetHash,
    statistics: {
      areas: 1,
      areaObjects: 1,
      templates: 1,
      textureAtlases: 1,
      vfxPresets: 0,
      edges: 1
    },
    resourceGraph: {
      nodes: [],
      edges: []
    },
    sceneGraph: {
      nodes: [],
      edges: []
    },
    indexes: {
      areaByObject: {},
      objectsByArea: {},
      templatesByArea: {},
      objectsByTemplate: {},
      areasByTemplate: {}
    }
  };
}
