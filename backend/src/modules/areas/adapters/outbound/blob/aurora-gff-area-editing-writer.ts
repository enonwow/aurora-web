import {
  buildGffBuffer,
  type SupportedGffField
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";

export interface SerializableAreaEditingTile {
  row: number;
  col: number;
  sourceRow?: number;
  sourceCol?: number;
  tileId: number;
  orientation: number;
  height: number;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
}

export interface SerializableAreaEditingDraft {
  areaResRef: string;
  name: string;
  width: number;
  height: number;
  tilesetResRef: string;
  tiles: readonly SerializableAreaEditingTile[];
}

export interface AreaEditingGffPreservation {
  fields: readonly SupportedGffField[];
  rootStructTypeId: number;
}

const ARE_FILE_TYPE = "ARE ";
const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const TILE_STRUCT_TYPE_ID = 0;
const EDITABLE_TILE_FIELD_LABELS = new Set([
  "tile_id",
  "tile_orientation",
  "tile_height",
  "tile_mainlight1",
  "tile_mainlight2",
  "tile_srclight1",
  "tile_srclight2",
  "tile_animloop1",
  "tile_animloop2",
  "tile_animloop3"
]);

/**
 * Writer for a new or locally-authored Area topology. When original GFF fields
 * are supplied, root fields and per-cell Tile_List fields outside the editable
 * topology contract are retained; this writer never fabricates Tile_ResRef or
 * group data.
 */
export function serializeAreaEditingDraftToAreGff(
  draft: SerializableAreaEditingDraft,
  preservation?: AreaEditingGffPreservation
): Buffer {
  if (preservation) {
    const provenanceError = validateAreaEditingSourceProvenance(draft, preservation);
    if (provenanceError) {
      throw new Error(provenanceError);
    }
  }
  const preservedTiles = preservation
    ? readPreservedTilesByCoordinate(preservation.fields, draft.width)
    : new Map<string, { typeId: number; fields: SupportedGffField[] }>();
  const topologyFields: SupportedGffField[] = [
    { label: "Width", type: "dword", value: draft.width },
    { label: "Height", type: "dword", value: draft.height },
    { label: "Tileset", type: "resref", value: draft.tilesetResRef },
    {
      label: "Tile_List",
      type: "list",
      value: draft.tiles
        .slice()
        .sort((left, right) => left.row - right.row || left.col - right.col)
        .map((tile) => {
          const preservedTile = tile.sourceRow !== undefined && tile.sourceCol !== undefined
            ? preservedTiles.get(tileCoordinate(tile.sourceRow, tile.sourceCol))
            : undefined;
          return {
            typeId: preservedTile?.typeId ?? TILE_STRUCT_TYPE_ID,
            fields: buildTileFields(tile, preservedTile?.fields)
          };
        })
    }
  ];
  const fields: SupportedGffField[] = preservation
    ? topologyFields
    : [
        {
          label: "Name",
          type: "cexolocstring",
          value: { text: draft.name }
        },
        { label: "Tag", type: "cexostring", value: draft.areaResRef },
        ...topologyFields
      ];
  const replacementLabels = new Set(fields.map((field) => field.label.toLowerCase()));
  return buildGffBuffer(
    preservation
      ? [
          ...preservation.fields.filter(
            (field) => !replacementLabels.has(field.label.toLowerCase())
          ),
          ...fields
        ]
      : fields,
    ARE_FILE_TYPE,
    preservation?.rootStructTypeId ?? ROOT_STRUCT_TYPE_ID
  );
}

/**
 * Fails closed when an editable cell claims provenance that cannot identify an
 * actual struct in the source ARE Tile_List. Falling back to a canonical tile
 * struct in that case would silently discard unknown per-tile GFF fields.
 * Cells without provenance remain valid: they are genuinely new cells created
 * by an Area resize.
 */
export function validateAreaEditingSourceProvenance(
  draft: Pick<SerializableAreaEditingDraft, "tiles">,
  preservation: AreaEditingGffPreservation
): string | null {
  const claimedSourceTiles = draft.tiles.filter(
    (tile) => tile.sourceRow !== undefined || tile.sourceCol !== undefined
  );
  if (claimedSourceTiles.length === 0) {
    return null;
  }
  const sourceWidth = readNumericField(preservation.fields, "Width");
  const sourceHeight = readNumericField(preservation.fields, "Height");
  const tileList = preservation.fields.find(
    (field) => field.label.toLowerCase() === "tile_list" && field.type === "list"
  );
  if (
    !Number.isInteger(sourceWidth) ||
    !Number.isInteger(sourceHeight) ||
    (sourceWidth ?? 0) <= 0 ||
    (sourceHeight ?? 0) <= 0 ||
    !tileList ||
    tileList.type !== "list" ||
    tileList.value.length !== (sourceWidth as number) * (sourceHeight as number)
  ) {
    return "Source ARE does not contain a complete Width*Height Tile_List for lossless editing.";
  }

  for (const tile of claimedSourceTiles) {
    if ((tile.sourceRow === undefined) !== (tile.sourceCol === undefined)) {
      return `Tile (${tile.row},${tile.col}) has incomplete source Tile_List provenance.`;
    }
    if (tile.sourceRow === undefined || tile.sourceCol === undefined) {
      continue;
    }
    if (
      !Number.isInteger(tile.sourceRow) ||
      !Number.isInteger(tile.sourceCol) ||
      tile.sourceRow < 0 ||
      tile.sourceCol < 0 ||
      tile.sourceRow >= (sourceHeight as number) ||
      tile.sourceCol >= (sourceWidth as number)
    ) {
      return `Tile (${tile.row},${tile.col}) references missing source tile (${tile.sourceRow},${tile.sourceCol}).`;
    }
  }
  return null;
}

function buildTileFields(
  tile: SerializableAreaEditingTile,
  preservedFields: readonly SupportedGffField[] = []
): SupportedGffField[] {
  const editableFields: SupportedGffField[] = [
    { label: "Tile_ID", type: "dword", value: tile.tileId },
    { label: "Tile_Orientation", type: "dword", value: tile.orientation },
    { label: "Tile_Height", type: "dword", value: tile.height }
  ];
  appendByte(editableFields, "Tile_MainLight1", tile.mainLight1);
  appendByte(editableFields, "Tile_MainLight2", tile.mainLight2);
  appendByte(editableFields, "Tile_SrcLight1", tile.sourceLight1);
  appendByte(editableFields, "Tile_SrcLight2", tile.sourceLight2);
  appendByte(editableFields, "Tile_AnimLoop1", tile.animLoop1);
  appendByte(editableFields, "Tile_AnimLoop2", tile.animLoop2);
  appendByte(editableFields, "Tile_AnimLoop3", tile.animLoop3);
  return [
    ...preservedFields.filter(
      (field) => !EDITABLE_TILE_FIELD_LABELS.has(field.label.toLowerCase())
    ),
    ...editableFields
  ];
}

function appendByte(fields: SupportedGffField[], label: string, value: number | undefined): void {
  // Aurora's ARE writer emits all seven per-tile light/animation bytes for
  // every non-empty Tile_List struct. An unset editor value therefore means
  // the runtime/default byte value 0, not omission of the GFF field.
  fields.push({ label, type: "byte", value: value ?? 0 });
}

function readPreservedTilesByCoordinate(
  fields: readonly SupportedGffField[],
  fallbackWidth: number
): Map<string, { typeId: number; fields: SupportedGffField[] }> {
  const sourceWidth = readNumericField(fields, "Width") ?? fallbackWidth;
  const tileList = fields.find(
    (field) => field.label.toLowerCase() === "tile_list" && field.type === "list"
  );
  const result = new Map<string, { typeId: number; fields: SupportedGffField[] }>();
  if (!tileList || tileList.type !== "list" || !Number.isInteger(sourceWidth) || sourceWidth <= 0) {
    return result;
  }
  tileList.value.forEach((tile, index) => {
    result.set(tileCoordinate(Math.floor(index / sourceWidth), index % sourceWidth), tile);
  });
  return result;
}

function readNumericField(fields: readonly SupportedGffField[], label: string): number | undefined {
  const field = fields.find((candidate) => candidate.label.toLowerCase() === label.toLowerCase());
  return field && "value" in field && typeof field.value === "number" ? field.value : undefined;
}

function tileCoordinate(row: number, col: number): string {
  return `${row}:${col}`;
}
