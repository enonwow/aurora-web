#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_OUTPUT_ROOT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers";
const DEFAULT_SOURCE_MANIFEST = join(
  DEFAULT_OUTPUT_ROOT,
  "retail-oracle-scene-drivers-manifest.json",
);
const DEFAULT_COMPILED_DIR = join(DEFAULT_OUTPUT_ROOT, "compiled-scripts");
const DEFAULT_COMPILE_MANIFEST = join(
  DEFAULT_OUTPUT_ROOT,
  "retail-oracle-scene-drivers-compile-manifest.json",
);

const DEFAULT_COMPILER_CANDIDATES = [
  "C:/Projects/Claude/Radoub/Trebuchet/Trebuchet/tools/nwn_script_comp.exe",
];

const DEFAULT_RUNTIME_DLL_DIR_CANDIDATES = [
  "C:/Projects/ai-documentations/nwn-repo-audit/repo-audit/niv__neverwinter.nim/dist/pkg-x86_64-windows",
  "C:/Projects/ai-documentations/nwn-repo-audit/repo-audit/dunahan__neverwinter.nim/dist/pkg-x86_64-windows",
];

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    sourceManifest: DEFAULT_SOURCE_MANIFEST,
    outDir: DEFAULT_COMPILED_DIR,
    compileManifest: DEFAULT_COMPILE_MANIFEST,
    compiler: process.env.AURORA_NWN_SCRIPT_COMPILER ?? null,
    compilerPreArgs: [],
    runtimeDllDir: process.env.AURORA_NWN_COMPILER_DLL_DIR ?? null,
    nwnRoot:
      process.env.AURORA_NWN_ROOT ??
      "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights",
    userDirectory:
      process.env.AURORA_NWN_USER_DIRECTORY ??
      join(process.env.USERPROFILE ?? process.env.HOME ?? "", "Documents", "Neverwinter Nights"),
    quiet: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--sourceManifest") {
      index += 1;
      options.sourceManifest = requireValue(arg, argv[index]);
    } else if (arg === "--outDir") {
      index += 1;
      options.outDir = requireValue(arg, argv[index]);
    } else if (arg === "--compileManifest") {
      index += 1;
      options.compileManifest = requireValue(arg, argv[index]);
    } else if (arg === "--compiler") {
      index += 1;
      options.compiler = requireValue(arg, argv[index]);
    } else if (arg === "--compilerPreArg") {
      index += 1;
      options.compilerPreArgs.push(requireValue(arg, argv[index]));
    } else if (arg === "--runtimeDllDir") {
      index += 1;
      options.runtimeDllDir = requireValue(arg, argv[index]);
    } else if (arg === "--nwnRoot") {
      index += 1;
      options.nwnRoot = requireValue(arg, argv[index]);
    } else if (arg === "--userDirectory") {
      index += 1;
      options.userDirectory = requireValue(arg, argv[index]);
    } else if (arg === "--quiet") {
      options.quiet = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: node scripts/compile-area-lighting-retail-oracle-scene-drivers.mjs [options]

Options:
  --repoRoot <path>          Repository root. Defaults to aurora-web root.
  --sourceManifest <path>    Driver source manifest. Defaults to ${DEFAULT_SOURCE_MANIFEST}
  --outDir <path>            Compiled .ncs output directory. Defaults to ${DEFAULT_COMPILED_DIR}
  --compileManifest <path>   Compile manifest output. Defaults to ${DEFAULT_COMPILE_MANIFEST}
  --compiler <path>          nwn_script_comp.exe path. Defaults to env/discovered local tool.
  --compilerPreArg <arg>     Advanced/testing arg inserted before compiler args. Repeatable.
  --runtimeDllDir <path>     Directory prepended to PATH for nwn_script_comp runtime DLLs.
  --nwnRoot <path>           NWN installation root passed as --root.
  --userDirectory <path>     NWN user directory passed as --userdirectory.
  --quiet                    Pass --quiet to nwn_script_comp.
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

function firstExisting(paths) {
  return paths.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

function discoverCompiler(explicitCompiler) {
  if (explicitCompiler) {
    const compilerPath = resolve(explicitCompiler);
    if (!existsSync(compilerPath)) {
      throw new Error(`NWScript compiler not found: ${compilerPath}`);
    }
    return {
      path: compilerPath,
      source: "explicit-or-env",
    };
  }

  const compilerPath = firstExisting(DEFAULT_COMPILER_CANDIDATES.map((candidate) => resolve(candidate)));
  if (!compilerPath) {
    throw new Error(
      [
        "NWScript compiler not found.",
        "Set AURORA_NWN_SCRIPT_COMPILER or pass --compiler <path> to nwn_script_comp.exe.",
      ].join(" "),
    );
  }

  return {
    path: compilerPath,
    source: "local-default-candidate",
  };
}

function discoverRuntimeDllDir(explicitRuntimeDllDir) {
  if (explicitRuntimeDllDir) {
    const runtimeDllDir = resolve(explicitRuntimeDllDir);
    if (!existsSync(runtimeDllDir)) {
      throw new Error(`Compiler runtime DLL directory not found: ${runtimeDllDir}`);
    }
    return {
      path: runtimeDllDir,
      source: "explicit-or-env",
    };
  }

  const runtimeDllDir = firstExisting(
    DEFAULT_RUNTIME_DLL_DIR_CANDIDATES.map((candidate) => resolve(candidate)),
  );
  return runtimeDllDir
    ? {
        path: runtimeDllDir,
        source: "local-default-candidate",
      }
    : null;
}

function buildCompilerEnv(runtimeDllDir) {
  if (!runtimeDllDir) {
    return process.env;
  }
  return {
    ...process.env,
    PATH: `${runtimeDllDir.path};${process.env.PATH ?? ""}`,
  };
}

function compactOutput(output) {
  const text = String(output ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) {
    return "";
  }
  const lines = text.split("\n");
  return lines.slice(-30).join("\n");
}

function compilerVersion(compiler, compilerPreArgs, env) {
  try {
    const output = execFileSync(compiler.path, [...compilerPreArgs, "--version"], {
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return compactOutput(output);
  } catch (error) {
    const stdout = error?.stdout ? String(error.stdout) : "";
    const stderr = error?.stderr ? String(error.stderr) : "";
    return compactOutput(`${stdout}\n${stderr}`) || "version-probe-failed";
  }
}

function driverSources(sourceManifest, repoRoot) {
  const drivers = sourceManifest.drivers ?? [];
  return drivers.map((driver) => {
    const sourcePath = toAbsolute(repoRoot, driver.sourcePath);
    if (!existsSync(sourcePath)) {
      throw new Error(`Driver source missing for ${driver.scriptResref}: ${sourcePath}`);
    }
    return {
      ...driver,
      sourceAbsolutePath: sourcePath,
    };
  });
}

function utilitySources(sourceManifest, repoRoot) {
  const utilities = sourceManifest.utilityScripts ?? [];
  return utilities.map((utility) => {
    const sourcePath = toAbsolute(repoRoot, utility.path);
    if (!existsSync(sourcePath)) {
      throw new Error(`Utility source missing for ${utility.resref}: ${sourcePath}`);
    }
    return {
      ...utility,
      scriptResref: utility.resref,
      sourceAbsolutePath: sourcePath,
    };
  });
}

function compileDrivers({
  compiler,
  compilerPreArgs,
  runtimeDllDir,
  repoRoot,
  sourceManifest,
  sourceManifestPath,
  outDir,
  nwnRoot,
  userDirectory,
  quiet,
}) {
  const sourceDir = toAbsolute(repoRoot, dirname(sourceManifest.generatedFiles[0]?.path ?? ""));
  const drivers = driverSources(sourceManifest, repoRoot);
  const utilities = utilitySources(sourceManifest, repoRoot);
  const compileSources = [...drivers, ...utilities];
  mkdirSync(outDir, { recursive: true });

  const args = [
    ...compilerPreArgs,
    ...(existsSync(nwnRoot) ? ["--root", nwnRoot] : []),
    ...(userDirectory && existsSync(userDirectory) ? ["--userdirectory", userDirectory] : []),
    "--dirs",
    sourceDir,
    "-d",
    outDir,
    "-c",
    ...compileSources.map((source) => source.sourceAbsolutePath),
    ...(quiet ? ["--quiet"] : []),
  ];
  const env = buildCompilerEnv(runtimeDllDir);
  const startedAt = new Date().toISOString();
  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    stdout = execFileSync(compiler.path, args, {
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    stdout = error?.stdout ? String(error.stdout) : "";
    stderr = error?.stderr ? String(error.stderr) : "";
    exitCode = Number.isInteger(error?.status) ? error.status : 1;
  }

  const finishedAt = new Date().toISOString();
  const compiledDrivers = drivers.map((driver) => {
    const compiledPath = join(outDir, `${driver.scriptResref}.ncs`);
    const compiledReady = existsSync(compiledPath);
    const stats = compiledReady ? statSync(compiledPath) : null;
    return {
      caseId: driver.caseId,
      title: driver.title,
      scriptResref: driver.scriptResref,
      sourcePath: toRepoRelative(repoRoot, driver.sourceAbsolutePath),
      sourceSha256: driver.sourceSha256 ?? sha256File(driver.sourceAbsolutePath),
      compiledPath: toRepoRelative(repoRoot, compiledPath),
      compiledReady,
      compiledBytes: stats?.size ?? 0,
      compiledSha256: compiledReady ? sha256File(compiledPath) : null,
      requiredRuntimeArtifacts: driver.requiredRuntimeArtifacts,
    };
  });
  const compiledUtilities = utilities.map((utility) => {
    const compiledPath = join(outDir, `${utility.scriptResref}.ncs`);
    const compiledReady = existsSync(compiledPath);
    const stats = compiledReady ? statSync(compiledPath) : null;
    return {
      title: utility.title,
      purpose: utility.purpose,
      scriptResref: utility.scriptResref,
      sourcePath: toRepoRelative(repoRoot, utility.sourceAbsolutePath),
      sourceSha256: utility.sha256 ?? sha256File(utility.sourceAbsolutePath),
      compiledPath: toRepoRelative(repoRoot, compiledPath),
      compiledReady,
      compiledBytes: stats?.size ?? 0,
      compiledSha256: compiledReady ? sha256File(compiledPath) : null,
    };
  });
  const compiledOutputCount = compiledDrivers.filter((driver) => driver.compiledReady).length;
  const compiledUtilityCount = compiledUtilities.filter((utility) => utility.compiledReady).length;

  return {
    version: "aurora-area-lighting-retail-oracle-scene-driver-compile/v1",
    generatedAt: finishedAt,
    status:
      exitCode === 0 &&
      compiledOutputCount === drivers.length &&
      compiledUtilityCount === utilities.length
        ? "compiled-pack-ready-module-injection-required"
        : "blocked-compiled-pack-incomplete",
    repoRoot,
    sourceManifest: {
      path: toRepoRelative(repoRoot, sourceManifestPath),
      status: sourceManifest.status,
      summary: sourceManifest.summary,
    },
    compiler: {
      path: compiler.path,
      source: compiler.source,
      version: compilerVersion(compiler, compilerPreArgs, env),
      runtimeDllDir: runtimeDllDir
        ? {
            path: runtimeDllDir.path,
            source: runtimeDllDir.source,
          }
        : null,
    },
    nwnRoot,
    userDirectory,
    outputDir: toRepoRelative(repoRoot, outDir),
    command: {
      executable: compiler.path,
      args,
      startedAt,
      finishedAt,
      exitCode,
      stdoutTail: compactOutput(stdout),
      stderrTail: compactOutput(stderr),
    },
    safety: {
      launchesRetailProcess: false,
      injectsModuleResources: false,
      capturesRuntimeArtifacts: false,
      writesCompiledScripts: true,
      doesNotFabricateRetailArtifacts: true,
      canonicalParityPromoted: false,
    },
    summary: {
      driverCount: drivers.length,
      compiledOutputCount,
      missingCompiledOutputCount: drivers.length - compiledOutputCount,
      utilityScriptCount: utilities.length,
      compiledUtilityCount,
      missingCompiledUtilityCount: utilities.length - compiledUtilityCount,
      runtimeArtifactCount: compiledDrivers.reduce(
        (total, driver) => total + driver.requiredRuntimeArtifacts.length,
        0,
      ),
      canonicalParityPromoted: false,
    },
    drivers: compiledDrivers,
    utilityScripts: compiledUtilities,
    nextRequiredActions: [
      "Inject the compiled .ncs driver resources into a disposable retail/toolset oracle module.",
      "Ensure each required area resref and fixture object exists in that module.",
      "Run the staged scene in NWN/toolset and capture the required PNG/JSON artifacts.",
      "Rerun readiness, capture queue, blocked compare reports, and the retail oracle gate.",
    ],
    nonEvidenceNotice:
      "Compiled scene-driver scripts are staging artifacts only. They are not retail pixels, active-slot dumps, or parity proof.",
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const sourceManifestPath = toAbsolute(repoRoot, options.sourceManifest);
  const outDir = toAbsolute(repoRoot, options.outDir);
  const compileManifestPath = toAbsolute(repoRoot, options.compileManifest);
  const compiler = discoverCompiler(options.compiler);
  const runtimeDllDir = discoverRuntimeDllDir(options.runtimeDllDir);

  if (!existsSync(sourceManifestPath)) {
    throw new Error(`Driver source manifest not found: ${sourceManifestPath}`);
  }

  const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, "utf8"));
  const report = compileDrivers({
    compiler,
    compilerPreArgs: options.compilerPreArgs,
    runtimeDllDir,
    repoRoot,
    sourceManifest,
    sourceManifestPath,
    outDir,
    nwnRoot: resolve(options.nwnRoot),
    userDirectory: resolve(options.userDirectory),
    quiet: options.quiet,
  });

  mkdirSync(dirname(compileManifestPath), { recursive: true });
  writeFileSync(compileManifestPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: report.status,
        manifest: toRepoRelative(repoRoot, compileManifestPath),
        outputDir: report.outputDir,
        summary: report.summary,
      },
      null,
      2,
    ),
  );

  if (report.status !== "compiled-pack-ready-module-injection-required") {
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
