import { describe, expect, it } from "vitest";

import { createSceneObjectCatalogQueryFacade } from "../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

function buildSceneObject(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "object_1",
    kind: "creatures",
    name: "Default Object",
    resRef: "default_resref",
    tag: "DEFAULT_TAG",
    x: 0,
    y: 0,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      yaw: 0,
      pitch: 0,
      roll: 0,
      heightOffset: 0
    },
    ...overrides
  };
}

describe("sceneObjectCatalogQueryFacade", () => {
  it("filters catalog rows by visible names and Aurora metadata, not only resrefs", () => {
    const facade = createSceneObjectCatalogQueryFacade();
    const tanarukk = buildSceneObject({
      id: "cre_template_tm_tanarukk_skew",
      kind: "creatures",
      name: "TM_TANARUKK_SKEW",
      resRef: "tm_tanarukk_skew",
      tag: "TM_TANARUKK_SKEW",
      creatureProperties: {
        firstName: "Tanarukk",
        lastName: "",
        race: "Humanoid",
        appearance: "db_tanarukk",
        phenotype: "Normal",
        gender: "Male",
        description: "",
        challengeRating: 1,
        portraitResRef: "",
        conversation: "",
        noInterrupt: false,
        appearanceProfile: {
          raceModel: "db_tanarukk"
        }
      }
    });
    const cloak = buildSceneObject({
      id: "itm_template_l_cloak_0",
      kind: "items",
      name: "Plain Cloak",
      resRef: "l_cloak_0",
      tag: "L_CLOAK_0",
      itemProperties: {
        localizedName: "Plain Cloak",
        baseItemLabel: "Cloak",
        baseItemDefaultIcon: "iit_cloak",
        cloakModelResRef: "pmh0_cloak_001"
      }
    });

    expect(
      facade.query({
        objects: [tanarukk, cloak],
        activeType: "creatures",
        searchQuery: "db_tanarukk"
      }).filteredRows
    ).toEqual([tanarukk]);

    expect(
      facade.query({
        objects: [tanarukk, cloak],
        activeType: "items",
        searchQuery: "pmh0_cloak_001"
      }).filteredRows
    ).toEqual([cloak]);
  });
});
