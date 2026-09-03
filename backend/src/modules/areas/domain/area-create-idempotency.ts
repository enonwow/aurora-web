const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export type AreaCreateJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly AreaCreateJsonValue[]
  | Readonly<{ [key: string]: AreaCreateJsonValue }>;

export type AreaCreateIdempotencyKeyResult =
  | Readonly<{ valid: true; value: string }>
  | Readonly<{ valid: false; code: "missing" | "invalid" }>;

export interface AreaCreateIdempotencyAttempt {
  readonly moduleId: string;
  readonly key: string;
  readonly commandHash: string;
}

export interface AreaCreateIdempotencyEntry<
  TResult = AreaCreateJsonValue,
> extends AreaCreateIdempotencyAttempt {
  readonly createdAt: string;
  readonly result: TResult;
}

export type AreaCreateIdempotencyResolution<
  TResult = AreaCreateJsonValue,
> =
  | Readonly<{ kind: "new" }>
  | Readonly<{ kind: "replay"; entry: AreaCreateIdempotencyEntry<TResult> }>
  | Readonly<{
      kind: "conflict";
      existingCommandHash: string;
      attemptedCommandHash: string;
    }>
  | Readonly<{ kind: "scope_mismatch" }>;

export function parseAreaCreateIdempotencyKey(
  value: string | undefined,
): AreaCreateIdempotencyKeyResult {
  if (value === undefined || value.length === 0) {
    return Object.freeze({ valid: false, code: "missing" });
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(value)) {
    return Object.freeze({ valid: false, code: "invalid" });
  }
  return Object.freeze({ valid: true, value });
}

export function createAreaCreateIdempotencyEntry<
  TResult,
>(
  input: AreaCreateIdempotencyEntry<TResult>,
): AreaCreateIdempotencyEntry<TResult> {
  if (!SHA256_PATTERN.test(input.commandHash)) {
    throw new Error("Area Create idempotency command hash must be lowercase SHA-256.");
  }
  const result = cloneJson(input.result) as TResult;
  return Object.freeze({
    moduleId: input.moduleId,
    key: input.key,
    commandHash: input.commandHash,
    createdAt: input.createdAt,
    result: deepFreezeJson(result),
  });
}

export function resolveAreaCreateIdempotency<
  TResult,
>(
  existing: AreaCreateIdempotencyEntry<TResult> | null,
  attempt: AreaCreateIdempotencyAttempt,
): AreaCreateIdempotencyResolution<TResult> {
  if (existing === null) {
    return Object.freeze({ kind: "new" });
  }
  if (existing.moduleId !== attempt.moduleId || existing.key !== attempt.key) {
    return Object.freeze({ kind: "scope_mismatch" });
  }
  if (existing.commandHash === attempt.commandHash) {
    return Object.freeze({ kind: "replay", entry: existing });
  }
  return Object.freeze({
    kind: "conflict",
    existingCommandHash: existing.commandHash,
    attemptedCommandHash: attempt.commandHash,
  });
}

function cloneJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneJson(entry));
  }
  if (typeof value === "object" && value !== null) {
    if (!isPlainJsonObject(value)) {
      throw new Error("Area Create idempotency results must contain only JSON objects.");
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]),
    );
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    Number.isFinite(value as number)
  ) {
    return value;
  }
  throw new Error("Area Create idempotency results must be JSON-compatible.");
}

function isPlainJsonObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype === null) {
    return true;
  }
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }
  const constructor = Object.prototype.hasOwnProperty.call(prototype, "constructor")
    ? prototype.constructor
    : null;
  return typeof constructor === "function" && constructor.name === "Object";
}

function deepFreezeJson<T>(value: T): T {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezeJson(child);
  }
  return Object.freeze(value);
}
