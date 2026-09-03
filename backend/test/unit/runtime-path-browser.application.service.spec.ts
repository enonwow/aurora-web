import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuntimePathBrowserApplicationService } from "../../src/modules/runtime-settings/application/runtime-path-browser.application.service";

describe("RuntimePathBrowserApplicationService", () => {
  let root: string;
  let service: RuntimePathBrowserApplicationService;
  const originalMode = process.env.AURORA_RUNTIME_PATH_MODE;

  beforeEach(async () => {
    process.env.AURORA_RUNTIME_PATH_MODE = "host";
    root = await mkdtemp(join(tmpdir(), "aurora-runtime-browser-"));
    await mkdir(join(root, "Modules"));
    await mkdir(join(root, ".hidden"));
    await writeFile(join(root, "Modules", "city.mod"), "module");
    await writeFile(join(root, "Modules", "notes.txt"), "notes");
    service = new RuntimePathBrowserApplicationService();
  });

  afterEach(async () => {
    if (originalMode === undefined) {
      delete process.env.AURORA_RUNTIME_PATH_MODE;
    } else {
      process.env.AURORA_RUNTIME_PATH_MODE = originalMode;
    }
    await rm(root, { recursive: true, force: true });
  });

  it("lists server directories without hidden entries or file contents", async () => {
    const result = await service.browse({
      scope: "item-generator",
      path: root
    });

    expect(result.currentPath).toBe(root);
    expect(result.entries).toEqual([
      expect.objectContaining({
        name: "Modules",
        kind: "directory",
        selectable: true
      })
    ]);
    expect(result.roots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "filesystem",
          available: true
        })
      ])
    );
  });

  it("shows directories and only .mod files for packed module selection", async () => {
    const result = await service.browse({
      scope: "module-packed",
      path: join(root, "Modules")
    });

    expect(result.selectionKind).toBe("file");
    expect(result.entries).toEqual([
      expect.objectContaining({ name: "city.mod", kind: "file", selectable: true })
    ]);
    expect(result.entries).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "notes.txt" })])
    );
  });

  it("opens the containing directory when the current value is a file", async () => {
    const result = await service.browse({
      scope: "module-packed",
      path: join(root, "Modules", "city.mod")
    });

    expect(result.currentPath).toBe(join(root, "Modules"));
    expect(result.entries).toEqual([
      expect.objectContaining({ name: "city.mod", kind: "file" })
    ]);
  });

  it("returns a concrete not-found error for an unavailable path", async () => {
    await expect(
      service.browse({
        scope: "hak-directory",
        path: join(root, "missing")
      })
    ).rejects.toMatchObject({
      code: "PATH_NOT_FOUND"
    });
  });
});
