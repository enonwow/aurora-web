const ERF_HEADER_SIZE = 160;
const KEY_ENTRY_SIZE = 24;
const RESOURCE_ENTRY_SIZE = 8;
const SUPPORTED_SIGNATURES = new Set(["MOD ", "HAK ", "ERF ", "NWM "]);
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;

export interface NwnErfResourceEntry {
  readonly resref: string;
  readonly type: number;
  readonly bytes: Buffer;
}

export interface NwnErfV10Archive {
  readonly signature: string;
  readonly header: Buffer;
  readonly localizedStrings: Buffer;
  readonly entries: readonly NwnErfResourceEntry[];
}

export function parseNwnErfV10(
  input: Uint8Array,
  sourceLabel: string,
): NwnErfV10Archive {
  const bytes = Buffer.from(input);
  if (bytes.length < ERF_HEADER_SIZE) {
    throw erfError(sourceLabel, "header is truncated");
  }
  const signature = bytes.subarray(0, 4).toString("ascii");
  const version = bytes.subarray(4, 8).toString("ascii");
  if (!SUPPORTED_SIGNATURES.has(signature)) {
    throw erfError(sourceLabel, `signature ${JSON.stringify(signature)} is unsupported`);
  }
  if (version !== "V1.0") {
    throw erfError(sourceLabel, `version ${JSON.stringify(version)} is unsupported`);
  }

  const localizedStringSize = bytes.readUInt32LE(12);
  const entryCount = bytes.readUInt32LE(16);
  const localizedStringOffset = bytes.readUInt32LE(20);
  const keyListOffset = bytes.readUInt32LE(24);
  const resourceListOffset = bytes.readUInt32LE(28);
  assertRange(
    bytes.length,
    localizedStringOffset,
    localizedStringSize,
    sourceLabel,
    "localized string",
  );
  assertRange(
    bytes.length,
    keyListOffset,
    entryCount * KEY_ENTRY_SIZE,
    sourceLabel,
    "key table",
  );
  assertRange(
    bytes.length,
    resourceListOffset,
    entryCount * RESOURCE_ENTRY_SIZE,
    sourceLabel,
    "resource table",
  );

  const identities = new Set<string>();
  const resourceIds = new Set<number>();
  const entries: NwnErfResourceEntry[] = [];
  for (let index = 0; index < entryCount; index += 1) {
    const keyOffset = keyListOffset + index * KEY_ENTRY_SIZE;
    const resref = bytes
      .subarray(keyOffset, keyOffset + 16)
      .toString("ascii")
      .replace(/\0.*$/u, "")
      .toLowerCase();
    const resourceId = bytes.readUInt32LE(keyOffset + 16);
    const type = bytes.readUInt16LE(keyOffset + 20);
    if (!RESREF_PATTERN.test(resref)) {
      throw erfError(sourceLabel, `resource ${index} has an invalid ResRef`);
    }
    if (resourceId >= entryCount || resourceIds.has(resourceId)) {
      throw erfError(sourceLabel, `resource ${index} has an invalid resource ID`);
    }
    resourceIds.add(resourceId);
    const identity = `${resref}:${type}`;
    if (identities.has(identity)) {
      throw erfError(sourceLabel, `resource identity is duplicate: ${identity}`);
    }
    identities.add(identity);

    const resourceOffset = resourceListOffset + resourceId * RESOURCE_ENTRY_SIZE;
    const payloadOffset = bytes.readUInt32LE(resourceOffset);
    const payloadSize = bytes.readUInt32LE(resourceOffset + 4);
    assertRange(
      bytes.length,
      payloadOffset,
      payloadSize,
      sourceLabel,
      `resource payload range ${identity}`,
    );
    entries.push({
      resref,
      type,
      bytes: Buffer.from(bytes.subarray(payloadOffset, payloadOffset + payloadSize)),
    });
  }

  return Object.freeze({
    signature,
    header: Buffer.from(bytes.subarray(0, ERF_HEADER_SIZE)),
    localizedStrings: Buffer.from(
      bytes.subarray(
        localizedStringOffset,
        localizedStringOffset + localizedStringSize,
      ),
    ),
    entries: Object.freeze(entries),
  });
}

export function buildNwnErfV10(input: Readonly<{
  header: Uint8Array;
  localizedStrings: Uint8Array;
  entries: readonly NwnErfResourceEntry[];
}>): Buffer {
  const header = Buffer.from(input.header);
  if (header.length !== ERF_HEADER_SIZE) {
    throw new Error("NWN ERF V1.0 header must contain exactly 160 bytes.");
  }
  const signature = header.subarray(0, 4).toString("ascii");
  if (!SUPPORTED_SIGNATURES.has(signature)) {
    throw new Error(`NWN ERF signature ${JSON.stringify(signature)} is unsupported.`);
  }
  if (header.subarray(4, 8).toString("ascii") !== "V1.0") {
    throw new Error("NWN ERF builder accepts only a V1.0 source header.");
  }
  if (input.entries.length > 65_536) {
    throw new Error("NWN ERF entry count exceeds the admitted budget.");
  }

  const localizedStrings = Buffer.from(input.localizedStrings);
  const entryCount = input.entries.length;
  const localizedStringOffset = ERF_HEADER_SIZE;
  const keyListOffset = localizedStringOffset + localizedStrings.length;
  const resourceListOffset = keyListOffset + entryCount * KEY_ENTRY_SIZE;
  const payloadStart = resourceListOffset + entryCount * RESOURCE_ENTRY_SIZE;
  if (payloadStart > 0xffffffff) {
    throw new Error("NWN ERF tables exceed the V1.0 32-bit offset range.");
  }
  header.writeUInt32LE(localizedStrings.length, 12);
  header.writeUInt32LE(entryCount, 16);
  header.writeUInt32LE(localizedStringOffset, 20);
  header.writeUInt32LE(keyListOffset, 24);
  header.writeUInt32LE(resourceListOffset, 28);

  const keys = Buffer.alloc(entryCount * KEY_ENTRY_SIZE);
  const resources = Buffer.alloc(entryCount * RESOURCE_ENTRY_SIZE);
  const payloads: Buffer[] = [];
  const identities = new Set<string>();
  let payloadOffset = payloadStart;
  input.entries.forEach((entry, index) => {
    const resref = entry.resref.toLowerCase();
    if (!RESREF_PATTERN.test(resref)) {
      throw new Error(`NWN ERF resource ResRef is invalid: ${entry.resref}.`);
    }
    if (!Number.isInteger(entry.type) || entry.type < 0 || entry.type > 65_535) {
      throw new Error(`NWN ERF resource type is invalid: ${entry.type}.`);
    }
    const identity = `${resref}:${entry.type}`;
    if (identities.has(identity)) {
      throw new Error(`NWN ERF resource identity is duplicate: ${identity}.`);
    }
    identities.add(identity);
    const payload = Buffer.from(entry.bytes);
    if (payloadOffset + payload.length > 0xffffffff) {
      throw new Error("NWN ERF payload exceeds the V1.0 32-bit offset range.");
    }
    const keyOffset = index * KEY_ENTRY_SIZE;
    keys.write(resref, keyOffset, 16, "ascii");
    keys.writeUInt32LE(index, keyOffset + 16);
    keys.writeUInt16LE(entry.type, keyOffset + 20);
    const resourceOffset = index * RESOURCE_ENTRY_SIZE;
    resources.writeUInt32LE(payloadOffset, resourceOffset);
    resources.writeUInt32LE(payload.length, resourceOffset + 4);
    payloads.push(payload);
    payloadOffset += payload.length;
  });

  return Buffer.concat([header, localizedStrings, keys, resources, ...payloads]);
}

function assertRange(
  total: number,
  offset: number,
  size: number,
  sourceLabel: string,
  subject: string,
): void {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(size) ||
    offset < 0 ||
    size < 0 ||
    offset > total ||
    size > total - offset
  ) {
    throw erfError(sourceLabel, `${subject} is outside the archive`);
  }
}

function erfError(sourceLabel: string, message: string): Error {
  return new Error(`Invalid NWN ERF ${sourceLabel}: ${message}.`);
}
