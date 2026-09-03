import type { AreaCapabilityCatalog } from "../domain/areaCapabilityCatalog";

export interface AreaCapabilityPort {
  getAreaCapabilities(accessToken: string): Promise<AreaCapabilityCatalog>;
}
