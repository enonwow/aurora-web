import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  delimiter,
  extname,
  isAbsolute,
  join,
  resolve,
} from "node:path";
import {
  NWN_SCRIPT_COMPILE_RESULT_SCHEMA_VERSION,
  type NwnScriptCompileInput,
  type NwnScriptCompileResult,
  type NwnScriptCompilerArtifact,
  type NwnScriptCompilerDiagnostic,
  type NwnScriptCompilerPort,
  type NwnScriptCompilerProviderIdentity,
  type NwnScriptSourceResource,
} from "../../../application/ports/nwn-script-compiler.port";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const MAX_SOURCE_BYTES = 256 * 1024;
const MAX_INCLUDE_COUNT = 1_024;
const MAX_TOTAL_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_RUNTIME_LIBRARY_FILES = 128;
const MAX_RUNTIME_LIBRARY_BYTES = 128 * 1024 * 1024;
const MAX_LAUNCHER_FILES = 8;
const MAX_DIAGNOSTICS = 100;
const MAX_DIAGNOSTIC_MESSAGE_BYTES = 512;

export type NwnScriptCompilerErrorCode =
  | "NWNSCRIPT_COMPILER_CONFIG_INVALID"
  | "NWNSCRIPT_COMPILER_INPUT_INVALID"
  | "NWNSCRIPT_COMPILER_UNAVAILABLE"
  | "NWNSCRIPT_COMPILER_IDENTITY_MISMATCH"
  | "NWNSCRIPT_COMPILER_VERSION_MISMATCH"
  | "NWNSCRIPT_COMPILER_TIMEOUT"
  | "NWNSCRIPT_COMPILER_OUTPUT_BUDGET_EXCEEDED"
  | "NWNSCRIPT_COMPILER_ARTIFACT_BUDGET_EXCEEDED"
  | "NWNSCRIPT_COMPILER_OUTPUT_MISSING";

export class NwnScriptCompilerError extends Error {
  constructor(
    readonly code: NwnScriptCompilerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "NwnScriptCompilerError";
  }
}

export interface NwnScriptCompilerAdapterConfig {
  readonly executablePath: string;
  readonly executableArgsPrefix?: readonly string[];
  readonly expectedExecutableSha256: string;
  readonly expectedVersionMarker: string;
  readonly languageSpecPath: string;
  readonly expectedLanguageSpecSha256: string;
  readonly runtimeLibraryDirectories: readonly string[];
  readonly timeoutMs: number;
  readonly maxCapturedOutputBytes: number;
  readonly maxArtifactBytes: number;
}

export class DisabledNwnScriptCompilerAdapter implements NwnScriptCompilerPort {
  async compile(_input: NwnScriptCompileInput): Promise<NwnScriptCompileResult> {
    throw new NwnScriptCompilerError(
      "NWNSCRIPT_COMPILER_UNAVAILABLE",
      "NWScript compiler provider is not configured.",
    );
  }
}

interface ValidatedInput {
  readonly target: NwnScriptSourceResource;
  readonly includes: readonly NwnScriptSourceResource[];
  readonly sourceSha256: string;
  readonly includeSetSha256: string;
}

interface PreparedProvider {
  readonly command: string;
  readonly argsPrefix: readonly string[];
  readonly env: NodeJS.ProcessEnv;
  readonly identityBase: Omit<
    NwnScriptCompilerProviderIdentity,
    "versionOutputSha256"
  >;
}

interface ProcessResult {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly output: Buffer;
  readonly timedOut: boolean;
  readonly outputExceeded: boolean;
  readonly spawnError?: Error;
}

export class NwnScriptCompilerAdapter implements NwnScriptCompilerPort {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly config: NwnScriptCompilerAdapterConfig) {
    validateConfigShape(config);
  }

  compile(input: NwnScriptCompileInput): Promise<NwnScriptCompileResult> {
    const operation = this.queue.then(() => this.compileOnce(input));
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  private async compileOnce(input: NwnScriptCompileInput): Promise<NwnScriptCompileResult> {
    const validated = validateInput(input);
    const workspace = await mkdtemp(join(tmpdir(), "aurora-nwscript-compiler-"));
    try {
      const providerDirectory = join(workspace, "provider");
      const inputDirectory = join(workspace, "input");
      const outputDirectory = join(workspace, "output");
      await Promise.all([
        mkdir(providerDirectory, { recursive: true }),
        mkdir(inputDirectory, { recursive: true }),
        mkdir(outputDirectory, { recursive: true }),
      ]);

      const provider = await prepareProvider(this.config, providerDirectory);
      const languageSpecBytes = await readBoundFile(
        this.config.languageSpecPath,
        this.config.expectedLanguageSpecSha256,
        "language specification",
      );
      await writeFile(join(inputDirectory, "nwscript.nss"), languageSpecBytes);
      for (const include of validated.includes) {
        await writeFile(join(inputDirectory, `${include.resref}.nss`), include.bytes);
      }
      const targetPath = join(inputDirectory, `${validated.target.resref}.nss`);
      await writeFile(targetPath, validated.target.bytes);

      const versionRun = await runProcess(
        provider.command,
        [...provider.argsPrefix, "--version"],
        providerDirectory,
        provider.env,
        this.config.timeoutMs,
        this.config.maxCapturedOutputBytes,
      );
      assertHealthyProviderRun(versionRun, "version");
      const versionOutput = versionRun.output.toString("utf8");
      if (!versionOutput.includes(this.config.expectedVersionMarker)) {
        throw new NwnScriptCompilerError(
          "NWNSCRIPT_COMPILER_VERSION_MISMATCH",
          "Configured compiler version marker did not match the hash-bound provider profile.",
        );
      }

      const providerIdentity: NwnScriptCompilerProviderIdentity = Object.freeze({
        ...provider.identityBase,
        versionOutputSha256: sha256(versionRun.output),
      });
      const executionProfileSha256 = sha256Json({
        provider: providerIdentity,
        optimizer: 1,
        workers: 1,
        debugSymbols: true,
        maxIncludeDepth: 16,
        nwnEncoding: "windows-1252",
        otherEncoding: "utf-8",
        keysEnabled: false,
        overrideEnabled: false,
      });

      const compileArgs = [
        ...provider.argsPrefix,
        "--no-keys",
        "--no-ovr",
        "--dirs",
        inputDirectory,
        "--max-include-depth=16",
        "--nwn-encoding",
        "windows-1252",
        "--other-encoding",
        "utf-8",
        "-O",
        "1",
        "-j",
        "1",
        "-g",
        "--quiet",
        "-d",
        outputDirectory,
        "-c",
        targetPath,
      ];
      const compileRun = await runProcess(
        provider.command,
        compileArgs,
        providerDirectory,
        provider.env,
        this.config.timeoutMs,
        this.config.maxCapturedOutputBytes,
      );
      assertBoundedCompilerRun(compileRun);

      if (compileRun.exitCode !== 0) {
        const diagnostics = parseDiagnostics(compileRun.output);
        return buildResult({
          status: "rejected",
          validated,
          provider: providerIdentity,
          executionProfileSha256,
          diagnostics,
        });
      }

      const ncs = await readArtifact(
        join(outputDirectory, `${validated.target.resref}.ncs`),
        this.config.maxArtifactBytes,
      );
      const ndb = await readArtifact(
        join(outputDirectory, `${validated.target.resref}.ndb`),
        this.config.maxArtifactBytes,
      );
      return buildResult({
        status: "compiled",
        validated,
        provider: providerIdentity,
        executionProfileSha256,
        diagnostics: parseWarnings(compileRun.output),
        artifacts: Object.freeze({ ncs, ndb }),
      });
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }
}

function validateConfigShape(config: NwnScriptCompilerAdapterConfig): void {
  const prefix = config.executableArgsPrefix ?? [];
  if (
    !isAbsolute(config.executablePath) ||
    !isAbsolute(config.languageSpecPath) ||
    !SHA256_PATTERN.test(config.expectedExecutableSha256) ||
    !SHA256_PATTERN.test(config.expectedLanguageSpecSha256) ||
    config.expectedVersionMarker.length < 1 ||
    config.expectedVersionMarker.length > 256 ||
    prefix.length > MAX_LAUNCHER_FILES ||
    prefix.some((entry) => !isAbsolute(entry)) ||
    config.runtimeLibraryDirectories.some((entry) => !isAbsolute(entry)) ||
    !Number.isSafeInteger(config.timeoutMs) ||
    config.timeoutMs < 1 ||
    config.timeoutMs > 30_000 ||
    !Number.isSafeInteger(config.maxCapturedOutputBytes) ||
    config.maxCapturedOutputBytes < 1 ||
    config.maxCapturedOutputBytes > 64 * 1024 ||
    !Number.isSafeInteger(config.maxArtifactBytes) ||
    config.maxArtifactBytes < 1 ||
    config.maxArtifactBytes > 4 * 1024 * 1024
  ) {
    throw new NwnScriptCompilerError(
      "NWNSCRIPT_COMPILER_CONFIG_INVALID",
      "NWScript compiler provider configuration is invalid.",
    );
  }
}

function validateInput(input: NwnScriptCompileInput): ValidatedInput {
  const target = cloneResource(input?.target);
  const includes = Array.isArray(input?.includes)
    ? input.includes.map(cloneResource)
    : [];
  if (
    !target ||
    target.resref === "nwscript" ||
    includes.length > MAX_INCLUDE_COUNT ||
    includes.some((entry) => entry.resref === "nwscript")
  ) {
    throw inputError();
  }
  const identities = [target.resref, ...includes.map((entry) => entry.resref)];
  if (new Set(identities).size !== identities.length) {
    throw inputError();
  }
  const sortedIncludes = [...includes].sort((left, right) =>
    left.resref.localeCompare(right.resref, "en"),
  );
  const totalBytes = target.bytes.length + sortedIncludes.reduce(
    (sum, entry) => sum + entry.bytes.length,
    0,
  );
  if (
    target.bytes.length > MAX_SOURCE_BYTES ||
    sortedIncludes.some((entry) => entry.bytes.length > MAX_SOURCE_BYTES) ||
    totalBytes > MAX_TOTAL_INPUT_BYTES
  ) {
    throw inputError();
  }
  const includeSet = sortedIncludes.map((entry) => ({
    resref: entry.resref,
    size: entry.bytes.length,
    sha256: sha256(entry.bytes),
  }));
  return Object.freeze({
    target,
    includes: Object.freeze(sortedIncludes),
    sourceSha256: sha256(target.bytes),
    includeSetSha256: sha256Json(includeSet),
  });
}

function cloneResource(resource: NwnScriptSourceResource | undefined): NwnScriptSourceResource {
  if (
    !resource ||
    !RESREF_PATTERN.test(resource.resref) ||
    !Buffer.isBuffer(resource.bytes)
  ) {
    throw inputError();
  }
  return Object.freeze({ resref: resource.resref, bytes: Buffer.from(resource.bytes) });
}

function inputError(): NwnScriptCompilerError {
  return new NwnScriptCompilerError(
    "NWNSCRIPT_COMPILER_INPUT_INVALID",
    "NWScript compiler input is invalid or exceeds its bounded contract.",
  );
}

async function prepareProvider(
  config: NwnScriptCompilerAdapterConfig,
  providerDirectory: string,
): Promise<PreparedProvider> {
  const executableBytes = await readBoundFile(
    config.executablePath,
    config.expectedExecutableSha256,
    "compiler executable",
  );
  const command = join(providerDirectory, `compiler${extname(config.executablePath)}`);
  await writeFile(command, executableBytes);
  await copyExecutableMode(config.executablePath, command);

  const launcherFiles: Array<{ name: string; size: number; sha256: string }> = [];
  const argsPrefix: string[] = [];
  for (const [index, path] of (config.executableArgsPrefix ?? []).entries()) {
    const bytes = await readPlainFile(path, "compiler launcher file");
    const name = `launcher-${index}${extname(path)}`;
    const target = join(providerDirectory, name);
    await writeFile(target, bytes);
    launcherFiles.push({ name, size: bytes.length, sha256: sha256(bytes) });
    argsPrefix.push(target);
  }

  const runtimeLibraries: Array<{ name: string; size: number; sha256: string }> = [];
  let runtimeBytes = 0;
  const seenRuntimeNames = new Set<string>();
  for (const directory of config.runtimeLibraryDirectories) {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => {
      throw unavailableError("Configured compiler runtime library directory is unavailable.");
    });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
      if (!entry.isFile() || entry.isSymbolicLink()) {
        continue;
      }
      const normalizedName = entry.name.toLowerCase();
      if (seenRuntimeNames.has(normalizedName)) {
        throw new NwnScriptCompilerError(
          "NWNSCRIPT_COMPILER_CONFIG_INVALID",
          "Compiler runtime library filenames are ambiguous across configured directories.",
        );
      }
      const bytes = await readPlainFile(join(directory, entry.name), "compiler runtime library");
      runtimeBytes += bytes.length;
      if (
        runtimeLibraries.length >= MAX_RUNTIME_LIBRARY_FILES ||
        runtimeBytes > MAX_RUNTIME_LIBRARY_BYTES
      ) {
        throw new NwnScriptCompilerError(
          "NWNSCRIPT_COMPILER_CONFIG_INVALID",
          "Compiler runtime library set exceeds its bounded contract.",
        );
      }
      seenRuntimeNames.add(normalizedName);
      await writeFile(join(providerDirectory, entry.name), bytes);
      runtimeLibraries.push({
        name: normalizedName,
        size: bytes.length,
        sha256: sha256(bytes),
      });
    }
  }

  return Object.freeze({
    command,
    argsPrefix: Object.freeze(argsPrefix),
    env: Object.freeze({
      ...process.env,
      PATH: `${providerDirectory}${delimiter}${process.env.PATH ?? ""}`,
    }),
    identityBase: Object.freeze({
      providerId: "neverwinter-nim-official-script-compiler",
      executableSha256: config.expectedExecutableSha256,
      versionMarker: config.expectedVersionMarker,
      languageSpecSha256: config.expectedLanguageSpecSha256,
      runtimeLibrarySetSha256: sha256Json(runtimeLibraries),
      launcherFileSetSha256: sha256Json(launcherFiles),
    }),
  });
}

async function readBoundFile(path: string, expectedSha256: string, label: string): Promise<Buffer> {
  const bytes = await readPlainFile(path, label);
  if (sha256(bytes) !== expectedSha256) {
    throw new NwnScriptCompilerError(
      "NWNSCRIPT_COMPILER_IDENTITY_MISMATCH",
      `Configured ${label} does not match its expected identity.`,
    );
  }
  return bytes;
}

async function readPlainFile(path: string, label: string): Promise<Buffer> {
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("not a plain file");
    }
    return await readFile(path);
  } catch {
    throw unavailableError(`Configured ${label} is unavailable.`);
  }
}

function unavailableError(message: string): NwnScriptCompilerError {
  return new NwnScriptCompilerError("NWNSCRIPT_COMPILER_UNAVAILABLE", message);
}

async function copyExecutableMode(source: string, target: string): Promise<void> {
  if (process.platform === "win32") return;
  const metadata = await lstat(source);
  await chmod(target, metadata.mode & 0o777);
}

function runProcess(
  command: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
  maxOutputBytes: number,
): Promise<ProcessResult> {
  return new Promise((resolveRun) => {
    let settled = false;
    let timedOut = false;
    let outputExceeded = false;
    let spawnError: Error | undefined;
    let capturedBytes = 0;
    const chunks: Buffer[] = [];
    const child = spawn(command, [...args], {
      cwd,
      env,
      detached: false,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const capture = (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (capturedBytes + bytes.length > maxOutputBytes) {
        outputExceeded = true;
        child.kill();
        return;
      }
      capturedBytes += bytes.length;
      chunks.push(Buffer.from(bytes));
    };
    child.stdout?.on("data", capture);
    child.stderr?.on("data", capture);
    child.once("error", (error) => {
      spawnError = error;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.once("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveRun(Object.freeze({
        exitCode,
        signal,
        output: Buffer.concat(chunks),
        timedOut,
        outputExceeded,
        spawnError,
      }));
    });
  });
}

function assertHealthyProviderRun(result: ProcessResult, operation: string): void {
  assertBoundedCompilerRun(result);
  if (result.spawnError || result.exitCode !== 0) {
    throw unavailableError(`Configured compiler ${operation} probe failed.`);
  }
}

function assertBoundedCompilerRun(result: ProcessResult): void {
  if (result.timedOut) {
    throw new NwnScriptCompilerError(
      "NWNSCRIPT_COMPILER_TIMEOUT",
      "NWScript compiler exceeded its bounded execution time.",
    );
  }
  if (result.outputExceeded) {
    throw new NwnScriptCompilerError(
      "NWNSCRIPT_COMPILER_OUTPUT_BUDGET_EXCEEDED",
      "NWScript compiler output exceeded its bounded capture budget.",
    );
  }
  if (result.spawnError) {
    throw unavailableError("Configured compiler process could not be started.");
  }
}

async function readArtifact(path: string, maxBytes: number): Promise<NwnScriptCompilerArtifact> {
  let metadata;
  try {
    metadata = await lstat(path);
  } catch {
    throw new NwnScriptCompilerError(
      "NWNSCRIPT_COMPILER_OUTPUT_MISSING",
      "Compiler reported success without the required output artifacts.",
    );
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new NwnScriptCompilerError(
      "NWNSCRIPT_COMPILER_OUTPUT_MISSING",
      "Compiler output is not a plain file.",
    );
  }
  if (metadata.size > maxBytes) {
    throw new NwnScriptCompilerError(
      "NWNSCRIPT_COMPILER_ARTIFACT_BUDGET_EXCEEDED",
      "Compiler artifact exceeded its bounded size.",
    );
  }
  const bytes = await readFile(path);
  return Object.freeze({ bytes: Buffer.from(bytes), size: bytes.length, sha256: sha256(bytes) });
}

function parseWarnings(output: Buffer): readonly NwnScriptCompilerDiagnostic[] {
  return parseDiagnostics(output).filter((diagnostic) => diagnostic.severity === "warning");
}

function parseDiagnostics(output: Buffer): readonly NwnScriptCompilerDiagnostic[] {
  const raw = output.toString("utf8");
  const diagnostics: NwnScriptCompilerDiagnostic[] = [];
  for (const line of raw.split(/\r?\n/u)) {
    const match = line.match(
      /([a-z0-9_]{1,16})\.nss\((\d+)(?:,(\d+))?\):\s*(ERROR|WARNING):\s*(.*?)(?:\s+\[[^\]]*ms\])?$/iu,
    );
    if (!match) continue;
    const severity = match[4]!.toLowerCase() === "warning" ? "warning" : "error";
    const message = boundMessage(match[5]!.trim());
    diagnostics.push(Object.freeze({
      code: severity === "warning" ? "NWNSCRIPT_COMPILE_WARNING" : "NWNSCRIPT_COMPILE_ERROR",
      severity,
      line: Number(match[2]),
      ...(match[3] ? { column: Number(match[3]) } : {}),
      message,
    }));
    if (diagnostics.length >= MAX_DIAGNOSTICS) break;
  }
  if (diagnostics.length > 0) return Object.freeze(diagnostics);
  return Object.freeze([
    Object.freeze({
      code: "NWNSCRIPT_COMPILER_REJECTED" as const,
      severity: "error" as const,
      message: "The compiler rejected the source without a recognized bounded diagnostic.",
      detailSha256: sha256(output),
    }),
  ]);
}

function boundMessage(message: string): string {
  const normalized = message.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim();
  const bytes = Buffer.from(normalized, "utf8");
  if (bytes.length <= MAX_DIAGNOSTIC_MESSAGE_BYTES) return normalized;
  return bytes.subarray(0, MAX_DIAGNOSTIC_MESSAGE_BYTES).toString("utf8").replace(/\uFFFD$/u, "");
}

function buildResult(input: {
  status: "compiled" | "rejected";
  validated: ValidatedInput;
  provider: NwnScriptCompilerProviderIdentity;
  executionProfileSha256: string;
  diagnostics: readonly NwnScriptCompilerDiagnostic[];
  artifacts?: Readonly<{ ncs: NwnScriptCompilerArtifact; ndb: NwnScriptCompilerArtifact }>;
}): NwnScriptCompileResult {
  const receiptPayload = {
    schemaVersion: NWN_SCRIPT_COMPILE_RESULT_SCHEMA_VERSION,
    status: input.status,
    targetResref: input.validated.target.resref,
    sourceSha256: input.validated.sourceSha256,
    includeSetSha256: input.validated.includeSetSha256,
    executionProfileSha256: input.executionProfileSha256,
    provider: input.provider,
    diagnostics: input.diagnostics,
    artifacts: input.artifacts
      ? {
          ncs: { size: input.artifacts.ncs.size, sha256: input.artifacts.ncs.sha256 },
          ndb: { size: input.artifacts.ndb.size, sha256: input.artifacts.ndb.sha256 },
        }
      : undefined,
  };
  return Object.freeze({
    schemaVersion: NWN_SCRIPT_COMPILE_RESULT_SCHEMA_VERSION,
    status: input.status,
    targetResref: input.validated.target.resref,
    sourceSha256: input.validated.sourceSha256,
    includeSetSha256: input.validated.includeSetSha256,
    executionProfileSha256: input.executionProfileSha256,
    provider: input.provider,
    diagnostics: Object.freeze([...input.diagnostics]),
    ...(input.artifacts ? { artifacts: input.artifacts } : {}),
    receiptSha256: sha256Json(receiptPayload),
  });
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Json(value: unknown): string {
  return sha256(Buffer.from(JSON.stringify(value), "utf8"));
}
