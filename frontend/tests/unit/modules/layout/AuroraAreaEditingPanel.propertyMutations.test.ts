import { describe, expect, it, vi } from "vitest";

import type { AreaPropertiesFacade } from "../../../../src/modules/areas/application/areaPropertiesFacade";
import {
  buildAreaEditingPropertyMutations,
} from "../../../../src/modules/layout/components/AuroraAreaEditingPanel";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";

const visual = {
  dayNightMode: "cycle" as const,
  shadowOpacity: 50,
  chanceRain: 0,
  chanceSnow: 0,
  chanceLightning: 0,
  sun: {
    ambientColor: 0,
    diffuseColor: 0,
    fogColor: 0,
    fogAmount: 0,
    shadows: false,
  },
  moon: {
    ambientColor: 0,
    diffuseColor: 0,
    fogColor: 0,
    fogAmount: 0,
    shadows: false,
  },
};

function facade(lightingSchemeChanged: boolean) {
  const visualEnvironment = {
    expectedValue: visual,
    value: { ...visual, shadowOpacity: 60 },
  };
  const visualEnvironmentScalarControls = {
    expectedValue: { fogClipDistance: 45, windPower: 0 },
    value: { fogClipDistance: 120, windPower: 2 },
  };
  const selection = {
    catalogIdentity: {
      environmentSha256: "a".repeat(64),
      skyBoxesSha256: "b".repeat(64),
    },
    expectedValue: {
      lightingSchemeRowIndex: 0,
      skyBoxRowIndex: 0,
      visualEnvironment: visual,
      visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
    },
    value: {
      lightingSchemeRowIndex: lightingSchemeChanged ? 1 : 0,
      skyBoxRowIndex: 1,
    },
  };
  return {
    value: {
      buildMutation: vi.fn().mockReturnValue(undefined),
      buildEventScriptMutations: vi.fn().mockReturnValue(undefined),
      buildBasicIdentityMutations: vi.fn().mockReturnValue(undefined),
      buildAdvancedFlagMutations: vi.fn().mockReturnValue(undefined),
      buildVisualEnvironmentCatalogSelectionMutation: vi.fn().mockReturnValue(selection),
      buildVisualEnvironmentMutation: vi.fn().mockReturnValue(visualEnvironment),
      buildVisualEnvironmentScalarControlsMutation: vi.fn()
        .mockReturnValue(visualEnvironmentScalarControls),
    } as unknown as AreaPropertiesFacade,
    visualEnvironment,
    visualEnvironmentScalarControls,
    selection,
  };
}

describe("Area editing property mutation composition", () => {
  it("uses the catalog mutation as the sole visual/scalar authority when Lighting Scheme changes", () => {
    const input = facade(true);
    const result = buildAreaEditingPropertyMutations(
      input.value,
      createSeedAreaScene(),
      {},
    );

    expect(result).toEqual({ visualEnvironmentCatalogSelection: input.selection });
    expect(input.value.buildVisualEnvironmentMutation).not.toHaveBeenCalled();
    expect(input.value.buildVisualEnvironmentScalarControlsMutation).not.toHaveBeenCalled();
  });

  it("keeps disjoint visual/scalar CAS members for a Sky-Box-only selection", () => {
    const input = facade(false);
    const result = buildAreaEditingPropertyMutations(
      input.value,
      createSeedAreaScene(),
      {},
    );

    expect(result).toEqual({
      visualEnvironmentCatalogSelection: input.selection,
      visualEnvironment: input.visualEnvironment,
      visualEnvironmentScalarControls: input.visualEnvironmentScalarControls,
    });
    expect(input.value.buildVisualEnvironmentMutation).toHaveBeenCalledOnce();
    expect(input.value.buildVisualEnvironmentScalarControlsMutation).toHaveBeenCalledOnce();
  });
});
