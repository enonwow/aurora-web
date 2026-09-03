export function areaEventScriptCatalogFixture() {
  return {
    schemaVersion: "area-event-script-catalog.v1" as const,
    moduleId: "module-current",
    moduleRevision: "c".repeat(64),
    coverage: "committed_module_only" as const,
    items: [
      {
        resRef: "alpha",
        artifactStatus: "source_and_bytecode" as const,
        freshness: "unverified" as const,
        source: {
          logicalKey: "alpha.nss",
          resourceType: 2009 as const,
          size: 10,
          sha256: "a".repeat(64),
        },
        bytecode: {
          logicalKey: "alpha.ncs",
          resourceType: 2010 as const,
          size: 11,
          sha256: "b".repeat(64),
        },
      },
      {
        resRef: "beta",
        artifactStatus: "source_only" as const,
        freshness: null,
        source: {
          logicalKey: "beta.nss",
          resourceType: 2009 as const,
          size: 12,
          sha256: "d".repeat(64),
        },
      },
      {
        resRef: "gamma",
        artifactStatus: "bytecode_only" as const,
        freshness: null,
        bytecode: {
          logicalKey: "gamma.ncs",
          resourceType: 2010 as const,
          size: 13,
          sha256: "e".repeat(64),
        },
      },
    ],
    total: 3,
    limit: 100,
    offset: 0,
    summary: {
      admittedCatalogCount: 3,
      sourceAndBytecode: 1,
      sourceOnly: 1,
      bytecodeOnly: 1,
      rejectedDescriptors: 0,
    },
    diagnostics: [
      "external_runtime_layers_not_resolved" as const,
      "paired_freshness_unverified" as const,
    ],
  };
}
