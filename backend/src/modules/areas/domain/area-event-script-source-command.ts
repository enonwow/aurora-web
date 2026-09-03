import { createHash } from "node:crypto";

export const AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION =
  "area-event-script-source-command.v1" as const;
export const AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES = 256 * 1024;
export const AREA_EVENT_SCRIPT_INCLUDE_MAX_COUNT = 1_024;
export const AREA_EVENT_SCRIPT_SOURCE_COMMAND_MAX_BODY_BYTES = 512 * 1024;

const COMMAND_KEYS = Object.freeze([
  "expectedModuleRevision",
  "includeResRefs",
  "moduleId",
  "schemaVersion",
  "sourceText",
  "targetResRef",
]);
const MODULE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export interface AreaEventScriptSourceCommand {
  readonly schemaVersion: typeof AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly targetResRef: string;
  readonly expectedModuleRevision: string;
  readonly sourceText: string;
  readonly sourceBytes: Buffer;
  readonly includeResRefs: readonly string[];
}

export interface AreaEventScriptSourceCommandIssue {
  readonly path: string;
  readonly message: string;
}

export type AreaEventScriptSourceCommandValidationResult =
  | Readonly<{
      valid: true;
      value: AreaEventScriptSourceCommand;
      commandHash: string;
    }>
  | Readonly<{
      valid: false;
      issues: readonly AreaEventScriptSourceCommandIssue[];
    }>;

export function validateAndNormalizeAreaEventScriptSourceCommand(
  input: unknown,
): AreaEventScriptSourceCommandValidationResult {
  const issues: AreaEventScriptSourceCommandIssue[] = [];
  if (!isPlainRecord(input)) {
    return invalid("$", "Command must be a plain object.");
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(input);
  } catch {
    return invalid("$", "Command body cannot be serialized as canonical JSON.");
  }
  if (
    Buffer.byteLength(serialized, "utf8") >
    AREA_EVENT_SCRIPT_SOURCE_COMMAND_MAX_BODY_BYTES
  ) {
    return invalid(
      "$",
      `Command body exceeds ${AREA_EVENT_SCRIPT_SOURCE_COMMAND_MAX_BODY_BYTES} UTF-8 bytes.`,
    );
  }
  const keys = Object.keys(input).sort(compareAscii);
  if (!sameStrings(keys, COMMAND_KEYS)) {
    issues.push({ path: "$", message: "Command keys do not match the v1 schema." });
  }

  const schemaVersion = input.schemaVersion;
  const moduleId = input.moduleId;
  const targetResRef = input.targetResRef;
  const expectedModuleRevision = input.expectedModuleRevision;
  const sourceText = input.sourceText;
  const includeResRefs = input.includeResRefs;

  if (schemaVersion !== AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION) {
    issues.push({ path: "schemaVersion", message: "Unsupported schema version." });
  }
  if (typeof moduleId !== "string" || !MODULE_ID_PATTERN.test(moduleId)) {
    issues.push({ path: "moduleId", message: "Module ID is not canonical." });
  }
  if (
    typeof targetResRef !== "string" ||
    !RESREF_PATTERN.test(targetResRef) ||
    targetResRef === "nwscript"
  ) {
    issues.push({ path: "targetResRef", message: "Target ResRef is not canonical." });
  }
  if (
    typeof expectedModuleRevision !== "string" ||
    !SHA256_PATTERN.test(expectedModuleRevision)
  ) {
    issues.push({
      path: "expectedModuleRevision",
      message: "Expected module revision must be lowercase SHA-256.",
    });
  }

  let sourceBytes: Buffer | undefined;
  if (typeof sourceText !== "string" || !hasWellFormedUnicode(sourceText)) {
    issues.push({ path: "sourceText", message: "Source text must be well-formed Unicode." });
  } else {
    sourceBytes = Buffer.from(sourceText, "utf8");
    if (sourceBytes.length > AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES) {
      issues.push({
        path: "sourceText",
        message: `Source text exceeds ${AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES} UTF-8 bytes.`,
      });
    }
  }

  const normalizedIncludes: string[] = [];
  if (!Array.isArray(includeResRefs)) {
    issues.push({ path: "includeResRefs", message: "Include ResRefs must be an array." });
  } else if (includeResRefs.length > AREA_EVENT_SCRIPT_INCLUDE_MAX_COUNT) {
    issues.push({
      path: "includeResRefs",
      message: `Include set exceeds ${AREA_EVENT_SCRIPT_INCLUDE_MAX_COUNT} entries.`,
    });
  } else {
    const seen = new Set<string>();
    for (const [index, value] of includeResRefs.entries()) {
      if (
        typeof value !== "string" ||
        !RESREF_PATTERN.test(value) ||
        value === "nwscript" ||
        value === targetResRef
      ) {
        issues.push({
          path: `includeResRefs.${index}`,
          message: "Include ResRef is not canonical or conflicts with the target.",
        });
        continue;
      }
      if (seen.has(value)) {
        issues.push({
          path: `includeResRefs.${index}`,
          message: "Include ResRefs must be unique.",
        });
        continue;
      }
      seen.add(value);
      normalizedIncludes.push(value);
    }
  }

  if (issues.length > 0 || !sourceBytes) {
    return Object.freeze({ valid: false, issues: freezeIssues(issues) });
  }
  normalizedIncludes.sort(compareAscii);
  const value: AreaEventScriptSourceCommand = Object.freeze({
    schemaVersion: AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION,
    moduleId: moduleId as string,
    targetResRef: targetResRef as string,
    expectedModuleRevision: expectedModuleRevision as string,
    sourceText: sourceText as string,
    sourceBytes,
    includeResRefs: Object.freeze(normalizedIncludes),
  });
  const canonical = canonicalizeAreaEventScriptSourceCommand(value);
  return Object.freeze({
    valid: true,
    value,
    commandHash: createHash("sha256").update(canonical, "utf8").digest("hex"),
  });
}

export function canonicalizeAreaEventScriptSourceCommand(
  command: AreaEventScriptSourceCommand,
): string {
  return JSON.stringify({
    schemaVersion: command.schemaVersion,
    moduleId: command.moduleId,
    targetResRef: command.targetResRef,
    expectedModuleRevision: command.expectedModuleRevision,
    sourceText: command.sourceText,
    includeResRefs: [...command.includeResRefs],
  });
}

function invalid(path: string, message: string): AreaEventScriptSourceCommandValidationResult {
  return Object.freeze({
    valid: false,
    issues: Object.freeze([Object.freeze({ path, message })]),
  });
}

function freezeIssues(
  issues: readonly AreaEventScriptSourceCommandIssue[],
): readonly AreaEventScriptSourceCommandIssue[] {
  return Object.freeze(issues.map((issue) => Object.freeze({ ...issue })));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
