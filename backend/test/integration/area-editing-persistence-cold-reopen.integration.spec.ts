import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  runAreaNewPersistenceColdReopenProof,
  type AreaNewPersistenceColdReopenProofArtifact
} from "../../scripts/prove-area-new-persistence-cold-reopen";

describe("New Area isolated persistence and cold reopen", () => {
  it("persists, independently reads back, and reopens through new repository/service instances", async () => {
    const tempRoot = await mkdtemp(resolve(tmpdir(), "aurora-area-cold-reopen-"));
    const artifactPath = resolve(tempRoot, "proof.summary.json");
    try {
      const artifact = await runAreaNewPersistenceColdReopenProof({
        sandboxRoot: resolve(tempRoot, "snapshot-store"),
        artifactPath
      });
      const persistedArtifact = JSON.parse(
        await readFile(artifactPath, "utf8")
      ) as AreaNewPersistenceColdReopenProofArtifact;

      expect(artifact).toEqual(persistedArtifact);
      expect(artifact).toMatchObject({
        status: "captured",
        proofBoundary: {
          toolsetReopen: false,
          runtimeRender: "not-run-no-durable-model-pack"
        },
        safety: {
          isolatedFilesystemStore: true,
          userModuleSnapshotMutated: false,
          decompilationOracleMutated: false
        },
        persistence: {
          result: { areaResRef: "codex_reopen", created: true },
          moduleIfoSemanticAreaPresent: true
        },
        coldReopen: {
          newRepositoryInstance: true,
          newAreasServiceInstance: true,
          newAreaEditingServiceInstance: true,
          area: {
            areaId: "area_codex_reopen",
            name: "Codex sandbox cold reopen",
            width: 2,
            height: 2,
            tilesetResRef: "tms01",
            tileCount: 4,
            objectCount: 0
          },
          editingSource: {
            tilesetTileCount: 16,
            reopenedModelResRef: "tms01_c01_01"
          }
        }
      });
      expect(Object.values(artifact.persistence.files).every((file) =>
        file.exactBytes && file.expectedSha256 === file.persistedSha256
      )).toBe(true);
      expect(artifact.coldReopen.editingSource.areaFingerprint).toBe(
        artifact.persistence.files["codex_reopen.are"].persistedSha256
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
