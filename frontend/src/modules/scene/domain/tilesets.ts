export type TilesetMetadataPrimitive = string | number | boolean | null;

export type TilesetMetadataValue =
  | TilesetMetadataPrimitive
  | readonly TilesetMetadataPrimitive[];

export type TilesetMetadataRecord = Readonly<
  Record<string, TilesetMetadataValue | undefined>
>;

export interface TilesetDimensions {
  width: number;
  height: number;
  tileCount: number;
}

export interface TilesetTileDescriptor {
  tileId: number;
  metadata?: TilesetMetadataRecord;
}

export interface TilesetGroupMember {
  tileIndex: number;
  metadata?: TilesetMetadataRecord;
}

export interface TilesetGroupDescriptor {
  id: string;
  members: readonly TilesetGroupMember[];
  metadata?: TilesetMetadataRecord;
}

export interface TilesetDomainModel {
  tilesetId: string;
  dimensions: TilesetDimensions;
  tiles: readonly TilesetTileDescriptor[];
  groups: readonly TilesetGroupDescriptor[];
  metadata?: TilesetMetadataRecord;
}

export interface CreateTilesetDomainModelInput {
  tilesetId: string;
  dimensions: TilesetDimensions;
  tiles?: readonly TilesetTileDescriptor[];
  groups?: readonly TilesetGroupDescriptor[];
  metadata?: TilesetMetadataRecord;
}

function cloneMetadataRecord(
  metadata: TilesetMetadataRecord | undefined
): TilesetMetadataRecord | undefined {
  if (!metadata) {
    return undefined;
  }
  const entries = Object.entries(metadata).map(([key, value]) => {
    if (Array.isArray(value)) {
      return [key, [...value] as const] as const;
    }
    return [key, value] as const;
  });
  return Object.freeze(Object.fromEntries(entries));
}

function cloneTileDescriptor(tile: TilesetTileDescriptor): TilesetTileDescriptor {
  return Object.freeze({
    tileId: tile.tileId,
    metadata: cloneMetadataRecord(tile.metadata)
  });
}

function cloneGroupMember(member: TilesetGroupMember): TilesetGroupMember {
  return Object.freeze({
    tileIndex: member.tileIndex,
    metadata: cloneMetadataRecord(member.metadata)
  });
}

function cloneGroupDescriptor(group: TilesetGroupDescriptor): TilesetGroupDescriptor {
  return Object.freeze({
    id: group.id,
    members: Object.freeze(group.members.map(cloneGroupMember)),
    metadata: cloneMetadataRecord(group.metadata)
  });
}

/**
 * Preserve-first container for tileset/group metadata.
 * No runtime behavior is inferred here; this function only snapshots typed input.
 */
export function createTilesetDomainModel(
  input: CreateTilesetDomainModelInput
): TilesetDomainModel {
  return Object.freeze({
    tilesetId: input.tilesetId,
    dimensions: Object.freeze({
      width: input.dimensions.width,
      height: input.dimensions.height,
      tileCount: input.dimensions.tileCount
    }),
    tiles: Object.freeze((input.tiles ?? []).map(cloneTileDescriptor)),
    groups: Object.freeze((input.groups ?? []).map(cloneGroupDescriptor)),
    metadata: cloneMetadataRecord(input.metadata)
  });
}

