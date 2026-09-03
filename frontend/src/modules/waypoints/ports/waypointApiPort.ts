import type {
  WaypointApiAppearanceRowsQuery,
  WaypointApiAppearanceRowsResult,
  WaypointApiListQuery,
  WaypointApiListResult,
} from "../contracts";

export interface WaypointApiPort {
  listWaypoints(
    accessToken: string,
    query?: WaypointApiListQuery,
  ): Promise<WaypointApiListResult>;
  listWaypointAppearanceRows?(
    accessToken: string,
    query: WaypointApiAppearanceRowsQuery,
  ): Promise<WaypointApiAppearanceRowsResult>;
}
