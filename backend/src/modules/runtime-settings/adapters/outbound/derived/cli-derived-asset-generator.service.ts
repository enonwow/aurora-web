import { Injectable, Logger } from "@nestjs/common";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep
} from "node:path";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  DerivedAssetGeneratorInput,
  DerivedAssetGeneratorPort,
  DerivedAssetGeneratorResult
} from "../../../application/ports/derived-asset-generator.port";
import type { PackedModuleFile } from "../../../application/ports/packed-module-extractor.port";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../../domain/derived-asset-versions";
import { convertAuroraMdlToGlb } from "./aurora-mdl-ascii-to-glb.converter";

const MODEL_EXTENSIONS = new Set(["mdl", "mdb"]);
const DEFAULT_ARG_TEMPLATE = ["--input", "{source}", "--output", "{output}"];
const MAX_DETERMINISTIC_FAILURE_CACHE_ENTRIES = 1024;
const HOST_LOCAL_DEFAULT_ARG_TEMPLATE = [
  "-r",
  "{tsNodeRegister}",
  "{converterScript}",
  "--input",
  "{source}",
  "--output",
  "{output}",
  "--resref",
  "{resref}",
  "--extension",
  "{extension}"
];

interface ModelCandidate {
  resref: string;
  extension: string;
  sourceFile: PackedModuleFile;
  sourcePath: string;
}

interface ConverterRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stderr: string;
}

@Injectable()
export class CliDerivedAssetGeneratorService implements DerivedAssetGeneratorPort {
  private readonly logger = new Logger(CliDerivedAssetGeneratorService.name);
  private readonly deterministicFailureByCandidateKey = new Map<string, string>();

  constructor(private readonly config: AppConfigService) {}

  async generateDerivedAssets(
    input: DerivedAssetGeneratorInput
  ): Promise<DerivedAssetGeneratorResult> {
    const candidates = collectModelCandidates(input.sourceFiles).slice(
      0,
      this.config.derivedAssetMaxModels
    );
    if (candidates.length === 0) {
      return buildSkippedResult("no_convertible_models", {
        candidateModels: 0
      });
    }
    const cacheScope = buildDerivedAssetGenerationCacheScope(this.config);
    if (shouldUseInProcessAuroraMdlConverter(this.config)) {
      return generateInProcessAuroraMdlDerivedAssets(
        candidates,
        this.config.derivedAssetOutputExtension,
        this.logger,
        this.deterministicFailureByCandidateKey,
        cacheScope
      );
    }

    const converter = resolveDerivedAssetConverter(this.config);
    const command = converter.command;
    if (!command) {
      return buildSkippedResult("converter_not_configured", {
        candidateModels: candidates.length,
        failureReasons: [
          "Set AURORA_DERIVED_ASSET_CONVERTER_COMMAND, or run with AURORA_HOST_LOCAL_RUNTIME=1 to use scripts/aurora-mdl-to-glb.ts."
        ]
      });
    }

    const argTemplate = converter.argTemplate;

    const workRoot = await mkdtemp(
      resolve(tmpdir(), `aurora-derived-assets-${randomUUID()}-`)
    );
    const inputRoot = resolve(workRoot, "input");
    const outputRoot = resolve(workRoot, "output");
    const files: PackedModuleFile[] = [];
    let failedModels = 0;
    const failureReasons: string[] = [];

    try {
      await writeSourceFiles(
        inputRoot,
        candidates.map((candidate) => candidate.sourceFile)
      );

      for (const candidate of candidates) {
        const outputExtension = this.config.derivedAssetOutputExtension;
        const outputFileName = buildDerivedModelOutputFileName(
          candidate.resref,
          outputExtension
        );
        const cachedFailure = getCachedDeterministicFailure(
          this.deterministicFailureByCandidateKey,
          cacheScope,
          candidate
        );
        if (cachedFailure) {
          failedModels += 1;
          failureReasons.push(cachedFailure);
          continue;
        }
        const sourcePath = resolveSafe(inputRoot, candidate.sourcePath);
        const outputPath = resolveSafe(outputRoot, outputFileName);
        await mkdir(dirname(outputPath), { recursive: true });

        const args = argTemplate.map((item) =>
          replacePlaceholders(item, {
            converterScript: converter.scriptPath ?? "",
            extension: candidate.extension,
            inputRoot,
            output: outputPath,
            resref: candidate.resref,
            source: sourcePath,
            tsNodeRegister: converter.tsNodeRegisterPath ?? "",
            workDir: workRoot
          })
        );

        const run = await runConverter(command, args, workRoot, {
          timeoutMs: this.config.derivedAssetConverterTimeoutMs,
          env: converter.env
        });
        if (run.exitCode !== 0 || run.timedOut || !(await existsAsFile(outputPath))) {
          const failureReason = formatRunFailure(run);
          failedModels += 1;
          failureReasons.push(failureReason);
          rememberDeterministicFailure(
            this.deterministicFailureByCandidateKey,
            cacheScope,
            candidate,
            failureReason
          );
          this.logger.warn(
            `Derived asset conversion failed for ${candidate.sourcePath}: ${failureReason}`
          );
          continue;
        }

        const bytes = await readFile(outputPath);
        if (bytes.length === 0) {
          failedModels += 1;
          failureReasons.push("empty output");
          this.logger.warn(
            `Derived asset conversion produced an empty output for ${candidate.sourcePath}.`
          );
          continue;
        }

        files.push({
          fileName: outputFileName,
          resourceType: 0,
          bytes
        });
      }
    } finally {
      await rm(workRoot, { recursive: true, force: true });
    }

    const generatedBytes = files.reduce((sum, file) => sum + file.bytes.length, 0);
    return {
      files,
      summary: {
        generator: "cli",
        generatedFiles: files.length,
        generatedBytes,
        candidateModels: candidates.length,
        convertedModels: files.length,
        failedModels,
        failureReasons,
        skippedModels: Math.max(0, candidates.length - files.length - failedModels),
        skippedReason: files.length === 0 && failedModels > 0 ? "conversion_failed" : undefined
      }
    };
  }
}

function shouldUseInProcessAuroraMdlConverter(config: AppConfigService): boolean {
  return (
    !config.derivedAssetConverterCommand &&
    config.derivedAssetOutputExtension === "glb"
  );
}

function generateInProcessAuroraMdlDerivedAssets(
  candidates: ModelCandidate[],
  outputExtension: string,
  logger: Logger,
  deterministicFailureByCandidateKey: Map<string, string>,
  cacheScope: string
): DerivedAssetGeneratorResult {
  const files: PackedModuleFile[] = [];
  let failedModels = 0;
  const failureReasons: string[] = [];

  for (const candidate of candidates) {
    const outputFileName = buildDerivedModelOutputFileName(candidate.resref, outputExtension);
    const cachedFailure = getCachedDeterministicFailure(
      deterministicFailureByCandidateKey,
      cacheScope,
      candidate
    );
    if (cachedFailure) {
      failedModels += 1;
      failureReasons.push(cachedFailure);
      continue;
    }
    try {
      const result = convertAuroraMdlToGlb(candidate.sourceFile.bytes);
      if (result.bytes.length === 0) {
        failedModels += 1;
        failureReasons.push("empty output");
        logger.warn(
          `In-process derived asset conversion produced an empty output for ${candidate.sourcePath}.`
        );
        continue;
      }

      files.push({
        fileName: outputFileName,
        resourceType: 0,
        bytes: result.bytes
      });
    } catch (error) {
      failedModels += 1;
      const reason = error instanceof Error ? error.message : String(error);
      failureReasons.push(reason);
      rememberDeterministicFailure(
        deterministicFailureByCandidateKey,
        cacheScope,
        candidate,
        reason
      );
      logger.warn(
        `In-process derived asset conversion failed for ${candidate.sourcePath}: ${reason}`
      );
    }
  }

  const generatedBytes = files.reduce((sum, file) => sum + file.bytes.length, 0);
  return {
    files,
    summary: {
      generator: "in-process-aurora-mdl",
      generatedFiles: files.length,
      generatedBytes,
      candidateModels: candidates.length,
      convertedModels: files.length,
      failedModels,
      failureReasons,
      skippedModels: Math.max(0, candidates.length - files.length - failedModels),
      skippedReason: files.length === 0 && failedModels > 0 ? "conversion_failed" : undefined
    }
  };
}

function buildDerivedAssetGenerationCacheScope(config: AppConfigService): string {
  return [
    `output=${config.derivedAssetOutputExtension}`,
    `converter=${AURORA_MDL_TO_GLB_CONVERTER_VERSION}`,
    `host=${config.hostLocalRuntime ? "1" : "0"}`,
    `command=${config.derivedAssetConverterCommand ?? ""}`,
    `args=${config.derivedAssetConverterArgs ?? ""}`
  ].join("|");
}

function buildDerivedModelOutputFileName(resref: string, extension: string): string {
  const versionSegment = AURORA_MDL_TO_GLB_CONVERTER_VERSION.replace(
    /[^a-zA-Z0-9._-]+/gu,
    "_"
  );
  return `__aurora/derived/models/${versionSegment}/${resref}.${extension}`;
}

function getCachedDeterministicFailure(
  deterministicFailureByCandidateKey: ReadonlyMap<string, string>,
  cacheScope: string,
  candidate: ModelCandidate
): string | null {
  return deterministicFailureByCandidateKey.get(
    buildDeterministicFailureCacheKey(cacheScope, candidate)
  ) ?? null;
}

function rememberDeterministicFailure(
  deterministicFailureByCandidateKey: Map<string, string>,
  cacheScope: string,
  candidate: ModelCandidate,
  reason: string
): void {
  if (!isDeterministicNoRenderableGeometryFailure(reason)) {
    return;
  }
  if (deterministicFailureByCandidateKey.size >= MAX_DETERMINISTIC_FAILURE_CACHE_ENTRIES) {
    const oldestKey = deterministicFailureByCandidateKey.keys().next().value as
      | string
      | undefined;
    if (oldestKey) {
      deterministicFailureByCandidateKey.delete(oldestKey);
    }
  }
  deterministicFailureByCandidateKey.set(
    buildDeterministicFailureCacheKey(cacheScope, candidate),
    reason
  );
}

function buildDeterministicFailureCacheKey(
  cacheScope: string,
  candidate: ModelCandidate
): string {
  const sourceDigest = createHash("sha256")
    .update(candidate.sourceFile.bytes)
    .digest("hex");
  return [
    cacheScope,
    candidate.extension,
    candidate.resref,
    sourceDigest
  ].join("|");
}

function isDeterministicNoRenderableGeometryFailure(reason: string): boolean {
  return /\bno renderable(?: mesh)? geometry\b/iu.test(reason);
}

function resolveDerivedAssetConverter(config: AppConfigService): {
  command: string;
  argTemplate: string[];
  env?: NodeJS.ProcessEnv;
  scriptPath?: string;
  tsNodeRegisterPath?: string;
} {
  const configuredCommand = config.derivedAssetConverterCommand;
  if (configuredCommand) {
    return {
      command: configuredCommand,
      argTemplate: parseArgTemplate(config.derivedAssetConverterArgs)
    };
  }

  if (!config.hostLocalRuntime) {
    return {
      command: "",
      argTemplate: []
    };
  }

  return {
    command: process.execPath,
    argTemplate: HOST_LOCAL_DEFAULT_ARG_TEMPLATE,
    env: {
      ...process.env,
      TS_NODE_PROJECT: resolve(process.cwd(), "tsconfig.json")
    },
    scriptPath: resolve(process.cwd(), "scripts", "aurora-mdl-to-glb.ts"),
    tsNodeRegisterPath: resolve(
      process.cwd(),
      "node_modules",
      "ts-node",
      "register",
      "transpile-only.js"
    )
  };
}

function buildSkippedResult(
  skippedReason: string,
  extras: Partial<DerivedAssetGeneratorResult["summary"]>
): DerivedAssetGeneratorResult {
  return {
    files: [],
    summary: {
      generator: "cli",
      generatedFiles: 0,
      generatedBytes: 0,
      skippedReason,
      ...extras
    }
  };
}

function collectModelCandidates(files: PackedModuleFile[]): ModelCandidate[] {
  const byResref = new Map<string, ModelCandidate>();
  const sorted = files
    .filter((file) => !normalizeRelativePath(file.fileName).startsWith("__aurora/derived/"))
    .map((file) => {
      const sourcePath = normalizeRelativePath(file.fileName);
      const extension = extname(sourcePath).replace(/^\./u, "").toLowerCase();
      const rawResref = basename(sourcePath, extname(sourcePath));
      return {
        extension,
        resref: sanitizeResref(rawResref),
        sourceFile: file,
        sourcePath
      };
    })
    .filter((candidate) => MODEL_EXTENSIONS.has(candidate.extension) && candidate.resref)
    .sort((left, right) => {
      const resrefDelta = left.resref.localeCompare(right.resref);
      if (resrefDelta !== 0) {
        return resrefDelta;
      }
      return modelExtensionPriority(left.extension) - modelExtensionPriority(right.extension);
    });

  for (const candidate of sorted) {
    if (!byResref.has(candidate.resref)) {
      byResref.set(candidate.resref, candidate);
    }
  }

  return [...byResref.values()];
}

function modelExtensionPriority(extension: string): number {
  return extension === "mdl" ? 0 : 1;
}

function parseArgTemplate(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((item) => typeof item === "string")
    ) {
      return parsed;
    }
  } catch {
    return DEFAULT_ARG_TEMPLATE;
  }
  return DEFAULT_ARG_TEMPLATE;
}

async function writeSourceFiles(root: string, files: PackedModuleFile[]): Promise<void> {
  for (const file of files) {
    const target = resolveSafe(root, file.fileName);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.bytes);
  }
}

function replacePlaceholders(
  value: string,
  replacements: Record<
    | "converterScript"
    | "extension"
    | "inputRoot"
    | "output"
    | "resref"
    | "source"
    | "tsNodeRegister"
    | "workDir",
    string
  >
): string {
  return value.replace(
    /\{(converterScript|extension|inputRoot|output|resref|source|tsNodeRegister|workDir)\}/gu,
    (_match, key) => replacements[key as keyof typeof replacements]
  );
}

function runConverter(
  command: string,
  args: string[],
  cwd: string,
  options: { timeoutMs: number; env?: NodeJS.ProcessEnv }
): Promise<ConverterRunResult> {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd,
      env: options.env,
      shell: false,
      windowsHide: true
    });
    const stderrChunks: Buffer[] = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeoutMs);

    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolveRun({
        exitCode: 1,
        signal: null,
        timedOut,
        stderr: error.message
      });
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolveRun({
        exitCode,
        signal,
        timedOut,
        stderr: Buffer.concat(stderrChunks).toString("utf-8")
      });
    });
  });
}

function formatRunFailure(result: ConverterRunResult): string {
  if (result.timedOut) {
    return "converter timed out";
  }
  const stderr = result.stderr.trim();
  if (stderr) {
    return `exitCode=${String(result.exitCode)} stderr=${stderr.slice(0, 500)}`;
  }
  return `exitCode=${String(result.exitCode)} signal=${String(result.signal)}`;
}

async function existsAsFile(pathValue: string): Promise<boolean> {
  try {
    const metadata = await stat(pathValue);
    return metadata.isFile();
  } catch {
    return false;
  }
}

function resolveSafe(root: string, relativePath: string): string {
  const normalizedRoot = resolve(root);
  const cleanedRelativePath = normalizeRelativePath(relativePath).replace(/^\/+/u, "");
  const target = resolve(normalizedRoot, cleanedRelativePath);
  if (!isPathInside(normalizedRoot, target)) {
    throw new Error(`Derived asset generator path escapes workspace: ${relativePath}`);
  }
  return target;
}

function isPathInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith(sep) && !isAbsolute(rel));
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/gu, "/");
}

function sanitizeResref(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 64);
}
