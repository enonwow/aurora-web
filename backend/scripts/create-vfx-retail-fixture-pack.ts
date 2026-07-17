import { cp, readFile, stat, writeFile } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";

export const REQUIRED_VFX_RETAIL_FIXTURE_FILES = [
  "retail-build.json",
  "source-table.snapshot.json",
  "effect-context.json",
  "parser-snapshot.json",
  "resolver-trace.json",
  "runtime-tick-dump.json",
  "render-contract-snapshot.json",
  "capture.json",
  "comparison.json"
] as const;

export interface CreateVfxRetailFixturePackOptions {
  fixtureId: string;
  fixturesRoot?: string;
  templateRoot?: string;
}

export interface CreateVfxRetailFixturePackResult {
  fixtureId: string;
  fixturePath: string;
  files: string[];
}

const DEFAULT_FIXTURES_ROOT = resolve(process.cwd(), "test", "fixtures", "vfx-retail");
const DEFAULT_TEMPLATE_ROOT = resolve(DEFAULT_FIXTURES_ROOT, "_template");

export async function createVfxRetailFixturePack(
  options: CreateVfxRetailFixturePackOptions
): Promise<CreateVfxRetailFixturePackResult> {
  const fixtureId = normalizeFixtureId(options.fixtureId);
  const fixturesRoot = resolve(options.fixturesRoot ?? DEFAULT_FIXTURES_ROOT);
  const templateRoot = resolve(options.templateRoot ?? DEFAULT_TEMPLATE_ROOT);
  const fixturePath = resolve(fixturesRoot, fixtureId);

  assertChildPath(fixturesRoot, fixturePath);

  if (await pathExists(fixturePath)) {
    throw new Error(`Refusing to overwrite existing VFX retail fixture pack: ${fixturePath}`);
  }
  if (!(await pathExists(templateRoot))) {
    throw new Error(`VFX retail fixture template does not exist: ${templateRoot}`);
  }

  await cp(templateRoot, fixturePath, {
    recursive: true,
    errorOnExist: true,
    force: false
  });
  await stampFixtureId(fixturePath, fixtureId);

  return {
    fixtureId,
    fixturePath,
    files: [...REQUIRED_VFX_RETAIL_FIXTURE_FILES]
  };
}

function normalizeFixtureId(fixtureId: string): string {
  const trimmed = fixtureId.trim();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(trimmed)) {
    throw new Error(
      "fixtureId must use lowercase letters, numbers, dots, underscores, or hyphens."
    );
  }
  if (trimmed === "_template" || basename(trimmed) !== trimmed) {
    throw new Error("fixtureId must name a new fixture directory, not a template or path.");
  }
  return trimmed;
}

function assertChildPath(root: string, candidate: string): void {
  const candidateRelativePath = relative(root, candidate);
  if (
    candidateRelativePath === "" ||
    candidateRelativePath.startsWith("..") ||
    candidateRelativePath.includes(`..${sep}`)
  ) {
    throw new Error(`Fixture path escapes the VFX retail fixture root: ${candidate}`);
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function stampFixtureId(fixturePath: string, fixtureId: string): Promise<void> {
  for (const file of REQUIRED_VFX_RETAIL_FIXTURE_FILES) {
    const path = resolve(fixturePath, file);
    const parsed = JSON.parse(await readFile(path, "utf-8")) as { fixtureId?: string };
    parsed.fixtureId = fixtureId;
    await writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}

async function main(): Promise<void> {
  const fixtureId = process.argv[2];
  if (!fixtureId) {
    throw new Error("Usage: ts-node --transpile-only scripts/create-vfx-retail-fixture-pack.ts <fixtureId>");
  }

  const result = await createVfxRetailFixturePack({ fixtureId });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
  // eslint-disable-next-line no-console
  console.log(
    "Manifest was not modified. Fill the capture pack with retail evidence, then update docs/aurora-reverse/vfx-retail-parity-fixtures.json manually."
  );
}

if (require.main === module) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}
