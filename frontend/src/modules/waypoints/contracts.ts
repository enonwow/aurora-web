export type WaypointApiMetadataPrimitive = string | number | boolean;

export interface WaypointApiListQuery {
  query?: string;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface WaypointApiListItem {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  previewImageUrl: string;
  metadata?: Record<string, WaypointApiMetadataPrimitive>;
}

export interface WaypointApiListResult {
  items: WaypointApiListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface WaypointApiAppearanceRowsQuery {
  tableSha256: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface WaypointApiAppearanceRow {
  rowIndex: number;
  modelResRef: string;
  strRef: number;
  label?: string;
  displayName: string;
  displaySource: "strref" | "label" | "model_resref";
}

export interface WaypointApiAppearanceRowsResult {
  resourceName: "waypoint.2da";
  sha256: string;
  rowCount: number;
  items: WaypointApiAppearanceRow[];
  total: number;
  limit: number;
  offset: number;
}
