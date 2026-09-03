export const AURORA_PLT_PALETTE_LAYER_COUNT = 10;
export const AURORA_PLT_PALETTE_ROW_COUNT = 176;
export const AURORA_PLT_PALETTE_ROW_MAX = AURORA_PLT_PALETTE_ROW_COUNT - 1;
export const AURORA_PLT_PALETTE_COLOR_COUNT = 256;

export const AURORA_PLT_PALETTE_CHANNEL_COUNT = 4;
const AURORA_PLT_PALETTE_TABLE_BYTE_LENGTH =
  AURORA_PLT_PALETTE_ROW_COUNT *
  AURORA_PLT_PALETTE_COLOR_COUNT *
  AURORA_PLT_PALETTE_CHANNEL_COUNT;

type AuroraPltPaletteTables = ReadonlyMap<number, Uint8Array>;

let auroraPltPaletteTablesByLayer: AuroraPltPaletteTables | null = null;
let auroraPltPaletteLoadPromise: Promise<boolean> | null = null;

type Base64BufferCtor = {
  from(value: string, encoding: "base64"): Uint8Array;
};

function decodeBase64ToBytes(value: string): Uint8Array | null {
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  const bufferCtor = (globalThis as typeof globalThis & { Buffer?: Base64BufferCtor })
    .Buffer;
  if (bufferCtor) {
    return new Uint8Array(bufferCtor.from(value, "base64"));
  }
  return null;
}

function isValidPaletteLayerIndex(layerIndex: number): boolean {
  return (
    Number.isInteger(layerIndex) &&
    layerIndex >= 0 &&
    layerIndex < AURORA_PLT_PALETTE_LAYER_COUNT
  );
}

function normalizePaletteByteIndex(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(AURORA_PLT_PALETTE_COLOR_COUNT - 1, Math.trunc(value)));
}

export function normalizeAuroraPltPaletteRow(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(AURORA_PLT_PALETTE_ROW_MAX, Math.trunc(value)));
}

function buildAuroraPltPaletteTables(
  tablesByLayer: Readonly<Record<number, string>>
): AuroraPltPaletteTables | null {
  const decodedTables = new Map<number, Uint8Array>();
  Object.entries(tablesByLayer).forEach(([layerKey, encodedTable]) => {
    const layerIndex = Number(layerKey);
    if (!isValidPaletteLayerIndex(layerIndex) || typeof encodedTable !== "string") {
      return;
    }
    const decoded = decodeBase64ToBytes(encodedTable);
    if (!decoded || decoded.byteLength !== AURORA_PLT_PALETTE_TABLE_BYTE_LENGTH) {
      return;
    }
    decodedTables.set(layerIndex, decoded);
  });

  return decodedTables.size > 0 ? decodedTables : null;
}

function shouldAutoLoadAuroraPltPaletteData(): boolean {
  return import.meta.env.MODE !== "test";
}

export function isAuroraPltPaletteDataReady(): boolean {
  return Boolean(auroraPltPaletteTablesByLayer && auroraPltPaletteTablesByLayer.size > 0);
}

export function resolveAuroraPltPaletteRgbaSync(
  layerIndex: number,
  row: number,
  colorIndex: number
): [number, number, number, number] | null {
  if (!isValidPaletteLayerIndex(layerIndex) || !auroraPltPaletteTablesByLayer) {
    return null;
  }
  const table = auroraPltPaletteTablesByLayer.get(layerIndex);
  if (!table) {
    return null;
  }

  const safeRow = normalizeAuroraPltPaletteRow(row);
  const safeColorIndex = normalizePaletteByteIndex(colorIndex);
  const offset =
    (safeRow * AURORA_PLT_PALETTE_COLOR_COUNT + safeColorIndex) *
    AURORA_PLT_PALETTE_CHANNEL_COUNT;
  if (offset + 3 >= table.byteLength) {
    return null;
  }

  return [
    table[offset] ?? 0,
    table[offset + 1] ?? 0,
    table[offset + 2] ?? 0,
    table[offset + 3] ?? 0
  ];
}

export function ensureAuroraPltPaletteDataLoaded(): Promise<boolean> {
  if (isAuroraPltPaletteDataReady()) {
    return Promise.resolve(true);
  }
  if (!shouldAutoLoadAuroraPltPaletteData()) {
    return Promise.resolve(false);
  }
  auroraPltPaletteLoadPromise ??= import("./auroraPltPaletteData")
    .then((module) => {
      auroraPltPaletteTablesByLayer = buildAuroraPltPaletteTables(
        module.AURORA_PLT_PALETTE_B64
      );
      return isAuroraPltPaletteDataReady();
    })
    .catch(() => false);
  return auroraPltPaletteLoadPromise;
}

export function installAuroraPltPaletteDataForTests(
  tablesByLayer: Readonly<Record<number, Uint8Array>>
): void {
  const decodedTables = new Map<number, Uint8Array>();
  Object.entries(tablesByLayer).forEach(([layerKey, table]) => {
    const layerIndex = Number(layerKey);
    if (
      !isValidPaletteLayerIndex(layerIndex) ||
      table.byteLength !== AURORA_PLT_PALETTE_TABLE_BYTE_LENGTH
    ) {
      return;
    }
    decodedTables.set(layerIndex, table);
  });
  auroraPltPaletteTablesByLayer = decodedTables.size > 0 ? decodedTables : null;
  auroraPltPaletteLoadPromise = null;
}

export function resetAuroraPltPaletteDataForTests(): void {
  auroraPltPaletteTablesByLayer = null;
  auroraPltPaletteLoadPromise = null;
}
