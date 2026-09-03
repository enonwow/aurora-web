import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "./area-object-construction-profile";
import { createHash } from "node:crypto";

export const AREA_STORE_DEPENDENCY_RESOURCE_TYPE = 2025;
export const AREA_STORE_DEPENDENCY_COUNT = 55;
export const AREA_STORE_DEPENDENCY_SET_SHA256 =
  "301639573ddc3bcdbf894d3c0f39ae79aeb271f7ac1f72b75e45081c14f4e2df";

export const AREA_STORE_CONSTRUCTION_PROFILE = Object.freeze({
  id: "nwn-base-key-utm-x2-merc-dye-v1",
  sourceKind: "store" as const,
  sceneKind: "stores" as const,
  templateResRef: "x2_merc_dye",
  templateTag: "x2_merc_dye",
  sourceSha256: "99b3050edf8697dfd053dbb335c12273de79ae1a16eebb242c354e727ae166e2",
  fileType: "UTM ",
  fileVersion: "V3.2",
  rootStructTypeId: 0xffffffff,
  resourceType: 2051,
  dependencyResourceType: AREA_STORE_DEPENDENCY_RESOURCE_TYPE,
  dependencyCount: AREA_STORE_DEPENDENCY_COUNT,
  dependencySetSha256: AREA_STORE_DEPENDENCY_SET_SHA256,
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaStoreConstructionProfile = typeof AREA_STORE_CONSTRUCTION_PROFILE;

export const AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE = Object.freeze({
  id: "effective-catalog-utm-store-copy-v1",
  sourceKind: "store" as const,
  sceneKind: "stores" as const,
  sourceExtension: "utm" as const,
  fileType: "UTM " as const,
  fileVersion: "V3.2" as const,
  rootStructTypeId: 0xffffffff,
  resourceType: 2051,
  itemDependencyResourceType: 2025,
  bucketTypeIds: Object.freeze([0, 4, 2, 3, 1] as const),
  maxSourceBytes: 1024 * 1024,
  maxNestedDepth: 8,
  maxNestedReferenceOccurrences: 1024,
  maxUniqueDependencies: 256,
  maxDependencyBytes: 16 * 1024 * 1024,
  maxSourceObjectKeyCodeUnits: 2048,
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaStoreDynamicConstructionProfile =
  typeof AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE;

export function hashAreaStoreConstructionDependencies(
  dependencies: readonly Readonly<{
    templateResRef: string;
    resourceType: number;
    sha256: string;
  }>[],
): string {
  return createHash("sha256")
    .update(JSON.stringify(dependencies.map((dependency) => ({
      templateResRef: dependency.templateResRef,
      resourceType: dependency.resourceType,
      sha256: dependency.sha256,
    }))))
    .digest("hex");
}
