import type { AreaCapabilityCatalog } from "../../../../src/modules/areas/domain/areaCapabilityCatalog";

export function capabilityFixture(): AreaCapabilityCatalog {
  return {
    schemaVersion: "area-capabilities.v1",
    catalogRevision: "2026-08-20.1",
    items: [
      {
        id: "lifecycle_create_local_draft",
        scope: "lifecycle",
        label: "Create a local Area draft",
        owner: "shared",
        auroraEvidence: "project_policy",
        implementation: "implemented",
        release: "available",
        testIds: [],
        proofIds: [],
        blockers: [],
      },
      {
        id: "topology_select_connected_region",
        scope: "topology",
        label: "Select a connected tile region",
        owner: "frontend",
        auroraEvidence: "missing",
        implementation: "not_started",
        release: "hidden",
        testIds: [],
        proofIds: [],
        blockers: ["connected_region_selection_not_implemented"],
      },
    ],
    summary: {
      total: 2,
      implementation: { implemented: 1, partial: 0, preserve_only: 0, not_started: 1 },
      release: { available: 1, blocked: 0, hidden: 1 },
    },
  };
}
