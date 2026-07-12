export const BLANK_CELL = "****";

export type AuroraTwoDaDiagnosticSeverity = "info" | "warn" | "error";

export interface AuroraTwoDaDiagnostic {
  code: string;
  severity: AuroraTwoDaDiagnosticSeverity;
  message: string;
}

export type AuroraTwoDaSourceLayer = "module" | "hak" | "vanilla" | "external_fixture" | string;

export interface AuroraTwoDaSourceMetadata {
  objectKey?: string;
  layer?: AuroraTwoDaSourceLayer;
  hash?: string;
}

export interface AuroraTwoDaCell {
  column: string;
  raw: string;
  value: string;
  quoted: boolean;
  blank: boolean;
  missing: boolean;
}

export interface AuroraTwoDaRow {
  rowId: number;
  rowIdRaw: string;
  label: string;
  rawLine: string;
  physicalRowIndex: number;
  physicalLineNumber: number;
  cells: AuroraTwoDaCell[];
  cellsByColumn: Record<string, AuroraTwoDaCell>;
  extraCells: string[];
  missingColumns: string[];
  source?: AuroraTwoDaSourceMetadata;
}

export interface AuroraTwoDaTable {
  tableName: string;
  profile: string;
  version: string;
  header: string[];
  rows: AuroraTwoDaRow[];
  defaultTokens: string[];
  diagnostics: AuroraTwoDaDiagnostic[];
  source?: AuroraTwoDaSourceMetadata;
}

export interface AuroraTwoDaParseOptions {
  tableName: string;
  profile?: string;
  source?: AuroraTwoDaSourceMetadata;
  sourceObjectKey?: string;
  sourceLayer?: AuroraTwoDaSourceLayer;
  sourceHash?: string;
}

interface TokenizedCell {
  raw: string;
  value: string;
  quoted: boolean;
}

interface TokenizedLine {
  tokens: TokenizedCell[];
}

function diagnostic(
  code: string,
  severity: AuroraTwoDaDiagnosticSeverity,
  message: string
): AuroraTwoDaDiagnostic {
  return { code, severity, message };
}

function decodeInput(input: Buffer | string): string {
  return Buffer.isBuffer(input) ? input.toString("utf-8") : input;
}

function isBlankCellValue(value: string | undefined): boolean {
  return !value || value === BLANK_CELL;
}

function stripTwoDaComment(line: string): string {
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === "#") {
      return line.slice(0, index);
    }
    if (!quoted && char === "/" && next === "/") {
      return line.slice(0, index);
    }
  }
  return line;
}

function tokenizeTwoDaLine(line: string): TokenizedLine {
  const tokens: TokenizedCell[] = [];
  let index = 0;
  while (index < line.length) {
    while (index < line.length && /\s/u.test(line[index])) {
      index += 1;
    }
    if (index >= line.length) {
      break;
    }

    if (line[index] === '"') {
      let raw = '"';
      let value = "";
      index += 1;
      while (index < line.length) {
        const char = line[index];
        raw += char;
        index += 1;
        if (char === '"') {
          break;
        }
        value += char;
      }
      tokens.push({ raw, value, quoted: true });
      continue;
    }

    const start = index;
    while (index < line.length && !/\s/u.test(line[index])) {
      index += 1;
    }
    const raw = line.slice(start, index);
    tokens.push({ raw, value: raw, quoted: false });
  }
  return { tokens };
}

function buildSourceMetadata(options: AuroraTwoDaParseOptions): AuroraTwoDaSourceMetadata | undefined {
  const source = {
    ...(options.source ?? {}),
    ...(options.sourceObjectKey ? { objectKey: options.sourceObjectKey } : {}),
    ...(options.sourceLayer ? { layer: options.sourceLayer } : {}),
    ...(options.sourceHash ? { hash: options.sourceHash } : {})
  };

  return Object.keys(source).length > 0 ? source : undefined;
}

function buildEmptyTable(
  options: AuroraTwoDaParseOptions,
  source: AuroraTwoDaSourceMetadata | undefined,
  diagnostics: AuroraTwoDaDiagnostic[]
): AuroraTwoDaTable {
  return {
    tableName: options.tableName,
    profile: options.profile ?? "unknown",
    version: "",
    header: [],
    rows: [],
    defaultTokens: [],
    diagnostics,
    ...(source ? { source } : {})
  };
}

export function parseAuroraTwoDaTable(
  input: Buffer | string,
  options: AuroraTwoDaParseOptions
): AuroraTwoDaTable {
  const sourceMetadata = buildSourceMetadata(options);
  const source = decodeInput(input).replace(/^\uFEFF/u, "");
  const lines = source.split(/\r?\n/u);
  const diagnostics: AuroraTwoDaDiagnostic[] = [];
  const significantLines: Array<{ text: string; raw: string; lineNumber: number }> = [];

  lines.forEach((rawLine, index) => {
    const text = stripTwoDaComment(rawLine).trim();
    if (text.length === 0) {
      return;
    }
    significantLines.push({ text, raw: rawLine, lineNumber: index + 1 });
  });

  const versionLine = significantLines.shift();
  if (!versionLine) {
    return buildEmptyTable(options, sourceMetadata, [
      diagnostic("VFX_2DA_EMPTY_SOURCE", "error", "2DA source is empty.")
    ]);
  }

  const versionTokens = tokenizeTwoDaLine(versionLine.text).tokens;
  const version = versionTokens.map((token) => token.value).join(" ");
  if (!/^2DA\s+V2\.0$/iu.test(version)) {
    diagnostics.push(
      diagnostic(
        "VFX_2DA_LOCAL_HEADER_MAGIC_REQUIRED",
        "error",
        "2DA source does not start with the expected 2DA V2.0 header."
      )
    );
  }

  let headerLine = significantLines.shift();
  let defaultTokens: string[] = [];
  if (headerLine) {
    const tokens = tokenizeTwoDaLine(headerLine.text).tokens;
    if (tokens[0]?.value.toUpperCase().startsWith("DEFAULT")) {
      defaultTokens = tokens.map((token) => token.raw);
      headerLine = significantLines.shift();
    }
  }

  const header = headerLine
    ? tokenizeTwoDaLine(headerLine.text).tokens.map((token) => token.value)
    : [];
  if (header.length === 0) {
    diagnostics.push(
      diagnostic("VFX_2DA_HEADER_REQUIRED", "error", "2DA source has no column header.")
    );
  }

  const rows: AuroraTwoDaRow[] = [];
  significantLines.forEach((line, physicalRowIndex) => {
    const tokenized = tokenizeTwoDaLine(line.text);
    const [rowIdToken, ...cellTokens] = tokenized.tokens;
    const rowIdRawValue = rowIdToken?.value ?? "";
    const rowId = /^\d+$/u.test(rowIdRawValue)
      ? Number.parseInt(rowIdRawValue, 10)
      : Number.NaN;
    if (!Number.isInteger(rowId)) {
      diagnostics.push(
        diagnostic(
          "VFX_2DA_ROW_ID_REQUIRED",
          "warn",
          `Skipping 2DA row without a non-negative integer row id at physical line ${line.lineNumber}.`
        )
      );
      return;
    }

    const missingColumns: string[] = [];
    const cells = header.map((column, index) => {
      const token = cellTokens[index];
      const missing = !token;
      if (missing) {
        missingColumns.push(column);
      }
      const raw = token?.raw ?? BLANK_CELL;
      const value = token?.value ?? BLANK_CELL;
      return {
        column,
        raw,
        value,
        quoted: token?.quoted ?? false,
        blank: isBlankCellValue(value),
        missing
      };
    });
    const cellsByColumn = Object.fromEntries(cells.map((cell) => [cell.column, cell]));
    const extraCells = cellTokens.slice(header.length).map((token) => token.raw);
    rows.push({
      rowId,
      rowIdRaw: rowIdToken?.raw ?? "",
      label: rowIdToken?.value ?? "",
      rawLine: line.raw,
      physicalRowIndex,
      physicalLineNumber: line.lineNumber,
      cells,
      cellsByColumn,
      extraCells,
      missingColumns,
      ...(sourceMetadata ? { source: sourceMetadata } : {})
    });

    if (missingColumns.length > 0) {
      diagnostics.push(
        diagnostic(
          "VFX_2DA_ROW_MISSING_CELLS_PRESERVED",
          "warn",
          `Row ${rowId} is missing ${missingColumns.length} trailing cell(s); blanks were preserved.`
        )
      );
    }
    if (extraCells.length > 0) {
      diagnostics.push(
        diagnostic(
          "VFX_2DA_ROW_EXTRA_CELLS_PRESERVED",
          "warn",
          `Row ${rowId} has ${extraCells.length} extra cell(s); extras were preserved.`
        )
      );
    }
  });

  return {
    tableName: options.tableName,
    profile: options.profile ?? "unknown",
    version,
    header,
    rows,
    defaultTokens,
    diagnostics,
    ...(sourceMetadata ? { source: sourceMetadata } : {})
  };
}
