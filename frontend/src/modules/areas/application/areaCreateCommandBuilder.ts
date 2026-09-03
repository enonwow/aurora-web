import type {
  AreaCreateCommand,
  AreaCreateGroupInstance,
  AreaCreateProfile,
  AreaCreateProfileCatalog,
  AreaCreateTile,
} from "../areaCreateContracts";
import type { AuroraAreaEditingState } from "../../scene/domain/auroraAreaEditing";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export type AreaCreateDraftPreparationResult =
  | Readonly<{
      ok: true;
      profile: AreaCreateProfile;
      command: AreaCreateCommand;
    }>
  | Readonly<{
      ok: false;
      code:
        | "AREA_CREATE_IDENTITY_INVALID"
        | "AREA_CREATE_PROFILE_UNAVAILABLE"
        | "AREA_CREATE_DRAFT_PROFILE_MISMATCH"
        | "AREA_CREATE_DRAFT_HASH_INVALID";
      message: string;
    }>;

export interface PrepareAreaCreateCommandInput {
  readonly catalog: AreaCreateProfileCatalog;
  readonly state: AuroraAreaEditingState;
  readonly areaName: string;
  readonly areaTag: string;
  readonly draftId: string;
  readonly draftRevision: number;
  readonly clientCommandId: string;
  readonly hashDraft: (canonicalDraft: string) => Promise<string>;
}

export async function prepareAreaCreateCommand(
  input: PrepareAreaCreateCommandInput,
): Promise<AreaCreateDraftPreparationResult> {
  if (
    !isPreservedNonBlank(input.areaName) ||
    !isPreservedNonBlank(input.areaTag) ||
    !OPAQUE_ID_PATTERN.test(input.draftId) ||
    !OPAQUE_ID_PATTERN.test(input.clientCommandId) ||
    !Number.isSafeInteger(input.draftRevision) ||
    input.draftRevision < 0
  ) {
    return failure(
      "AREA_CREATE_IDENTITY_INVALID",
      "Area name, tag, draft identity, and command identity must satisfy the v1 Create contract.",
    );
  }

  const normalizedTiles = normalizeTiles(input.state);
  const normalizedGroups = normalizeGroups(input.state);
  const profile = input.catalog.profiles.find(
    (candidate) =>
      candidate.tilesetResRef === input.state.tilesetResRef.toLowerCase() &&
      candidate.setFingerprintSha256 === input.state.tilesetFingerprint.toLowerCase() &&
      candidate.width === input.state.width &&
      candidate.height === input.state.height &&
      canonicalJson(candidate.tiles) === canonicalJson(normalizedTiles) &&
      canonicalJson(candidate.groupInstances) === canonicalJson(normalizedGroups),
  );
  if (!profile) {
    return failure(
      input.catalog.profiles.length === 0
        ? "AREA_CREATE_PROFILE_UNAVAILABLE"
        : "AREA_CREATE_DRAFT_PROFILE_MISMATCH",
      input.catalog.profiles.length === 0
        ? "The workspace does not expose an Area creation profile."
        : "The local Area topology does not match an admitted immutable creation profile.",
    );
  }

  const draftCanonical = canonicalJson({
    schemaVersion: 1,
    areaResRef: input.state.areaResRef.toLowerCase(),
    tilesetResRef: input.state.tilesetResRef.toLowerCase(),
    tilesetFingerprint: input.state.tilesetFingerprint.toLowerCase(),
    width: input.state.width,
    height: input.state.height,
    tiles: normalizedTiles,
    groupInstances: normalizedGroups,
  });
  let normalizedSha256: string;
  try {
    normalizedSha256 = (await input.hashDraft(draftCanonical)).toLowerCase();
  } catch {
    return failure(
      "AREA_CREATE_DRAFT_HASH_INVALID",
      "The local Area draft could not be bound to a SHA-256 fingerprint.",
    );
  }
  if (!SHA256_PATTERN.test(normalizedSha256)) {
    return failure(
      "AREA_CREATE_DRAFT_HASH_INVALID",
      "The local Area draft hash is outside the SHA-256 contract.",
    );
  }

  return Object.freeze({
    ok: true,
    profile,
    command: Object.freeze({
      schemaVersion: "area-create-command.v1",
      moduleId: input.catalog.moduleId,
      expectedModuleRevision: input.catalog.moduleRevision,
      creationProfile: Object.freeze({
        id: profile.id,
        fingerprintSha256: profile.fingerprintSha256,
      }),
      area: Object.freeze({
        name: input.areaName,
        resRef: input.state.areaResRef.toLowerCase(),
        tag: input.areaTag,
      }),
      tileset: Object.freeze({
        resRef: profile.tilesetResRef,
        setFingerprintSha256: profile.setFingerprintSha256,
      }),
      dimensions: Object.freeze({ width: profile.width, height: profile.height }),
      initializer: Object.freeze({
        algorithmVersion: profile.initializerAlgorithmVersion,
        seed: profile.initializerSeed,
      }),
      tiles: Object.freeze(normalizedTiles),
      groupInstances: Object.freeze(normalizedGroups),
      draft: Object.freeze({
        id: input.draftId,
        revision: input.draftRevision,
        normalizedSha256,
      }),
      clientCommandId: input.clientCommandId,
    }),
  });
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeTiles(state: AuroraAreaEditingState): AreaCreateTile[] {
  return [...state.tiles]
    .sort((left, right) => left.row - right.row || left.col - right.col)
    .map((tile) => ({
      row: tile.row,
      col: tile.col,
      tileId: tile.tileId,
      orientation: tile.orientation,
      height: tile.height,
      mainLight1: tile.mainLight1 ?? 0,
      mainLight2: tile.mainLight2 ?? 0,
      sourceLight1: tile.sourceLight1 ?? 0,
      sourceLight2: tile.sourceLight2 ?? 0,
      animLoop1: tile.animLoop1 ?? 1,
      animLoop2: tile.animLoop2 ?? 1,
      animLoop3: tile.animLoop3 ?? 1,
    }));
}

function normalizeGroups(state: AuroraAreaEditingState): AreaCreateGroupInstance[] {
  return state.groupInstances
    .map((group) => ({
      groupId: group.groupId.toLowerCase(),
      anchorRow: group.anchorRow,
      anchorCol: group.anchorCol,
      orientation: group.orientation,
      cells: [...group.cells]
        .sort((left, right) => left.row - right.row || left.col - right.col)
        .map((cell) => ({ row: cell.row, col: cell.col })),
    }))
    .sort(
      (left, right) =>
        left.anchorRow - right.anchorRow ||
        left.anchorCol - right.anchorCol ||
        left.groupId.localeCompare(right.groupId) ||
        left.orientation - right.orientation,
    );
}

function isPreservedNonBlank(value: string): boolean {
  return value.length >= 1 && value.length <= 256 && value.trim().length > 0;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function failure(
  code: Extract<AreaCreateDraftPreparationResult, { ok: false }>["code"],
  message: string,
): AreaCreateDraftPreparationResult {
  return Object.freeze({ ok: false, code, message });
}
