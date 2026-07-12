import { fireEvent, render, screen, within } from "@testing-library/react";
import type { CreatureViewportRenderPayload } from "../../../../src/modules/creatures/application/creatureRenderPayloadResolver";
import { CreaturesModeRightPanel } from "../../../../src/modules/layout/components/CreaturesModeRightPanel";
import type { SceneObject } from "../../../../src/modules/layout/contracts";

function buildCreaturePreviewObject(): SceneObject {
  return {
    id: "cre_fixture",
    kind: "creatures",
    resRef: "cre_fixture",
    tag: "CRE_FIXTURE",
    x: 0,
    y: 0,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0
    }
  } as SceneObject;
}

function buildCreaturePayload(): CreatureViewportRenderPayload {
  return {
    templateId: "cre_fixture",
    cacheKey: "cre_fixture",
    cacheHit: false,
    storedAt: "2026-06-26T00:00:00.000Z",
    hits: 0,
    creature: {
      templateId: "cre_fixture",
      kind: "creature",
      resref: "cre_fixture",
      name: "Fixture Creature",
      category: "creature",
      benchmarkCandidate: false,
      render: {
        backendType: "creature",
        frontendType: "creature",
        rendererPreset: "creature-standard"
      },
      creatureRenderPackage: undefined,
      processedAt: "2026-06-26T00:00:00.000Z"
    },
    renderPackage: {
      status: "ready",
      diagnostics: [],
      rendererPreset: "creature-standard",
      appearanceProfile: {
        appearanceType: 6,
        appearanceLabel: "Human",
        modelType: "P",
        raceModel: "P_HHM",
        sizeCategory: 3,
        sizeCategoryLabel: "Medium"
      },
      sourceModelCandidates: [
        {
          resref: "P_HHM",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "assembly-prefix"
        }
      ],
      skeletonModelCandidates: [
        {
          resref: "pfh2",
          role: "base-skeleton",
          source: "part-model-prefix",
          modelPrefix: "pfh2_",
          confidence: "prefix-derived",
          assetId: "asset-pfh2-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cre_fixture/assets/asset-pfh2-glb.glb"
        }
      ],
      partModelCandidates: [
        {
          slot: "rHand",
          partId: 5,
          partModelName: "rhand",
          nodeName: "rhand_g",
          modelResRef: "pfh2_rhand005",
          source: "capart.2da.MDLNAME",
          source2daRow: 7,
          sourceKey: "capart.2da"
        }
      ],
      equipmentModelCandidates: [
        {
          resref: "nw_wswmls001",
          itemTemplateId: "itm_nw_wswmls001",
          slotMask: 16,
          slotLabels: ["right hand"],
          attachmentTargets: ["rhand_g"],
          primaryAttachmentTarget: "rhand_g",
          baseItem: 6,
          itemName: "Longsword",
          itemModelType: "wsw",
          itemModelParts: [2, 1, 3],
          itemModelPartRoles: ["blade", "middle", "top"],
          itemModelPartResRefs: ["wswb_002", "wswm_001", "wswt_003"],
          itemModelPartCandidates: [
            {
              resref: "wswb_002",
              role: "blade",
              partId: 2
            },
            {
              resref: "wswm_001",
              role: "middle",
              partId: 1
            },
            {
              resref: "wswt_003",
              role: "top",
              partId: 3
            }
          ],
          itemModelPartSourceKey: "baseitems.2da",
          source: "utc.Equip_ItemList",
          sourceModelStatus: "model-resrefs-ready"
        }
      ],
      textureBindings: [
        {
          reference: "fx_fire",
          assetId: "asset-fx-fire",
          fileName: "fx_fire.tga",
          objectKey: "modules/current/textures/fx_fire.tga",
          deliveryUrl: "/api/v1/catalog/creatures/cache/cre_fixture/assets/asset-fx-fire.tga"
        }
      ],
      auroraEmitter: {
        source: "source-mdl",
        emitters: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-cre-mdl",
            sourceModelFileName: "cre_fixture.mdl",
            sourceModelObjectKey: "modules/current/models/cre_fixture.mdl",
            nodeName: "fire_emit",
            texture: "fx_fire",
            renderMode: "Billboard_to_World_Z",
            blendMode: "Lighten",
            atlas: {
              effectiveXGrid: 4,
              effectiveYGrid: 4
            },
            simulation: {
              birthrate: 8,
              lifeExp: 2
            }
          }
        ],
        diagnostics: []
      },
      auroraLight: {
        source: "source-mdl",
        lights: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-cre-mdl",
            sourceModelFileName: "cre_fixture.mdl",
            sourceModelObjectKey: "modules/current/models/cre_fixture.mdl",
            nodeName: "glow_l",
            radius: 5,
            multiplier: 1.2,
            color: [1, 0.8, 0.4]
          }
        ],
        diagnostics: []
      },
      auroraMaterial: {
        source: "mtr",
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "asset-body-mtr",
            materialFileName: "cre_body.mtr",
            materialObjectKey: "modules/current/materials/cre_body.mtr",
            state: {
              textureSlots: [
                {
                  slot: 0,
                  role: "diffuse",
                  reference: "cre_body"
                },
                {
                  slot: 1,
                  role: "normal",
                  reference: "cre_body_n"
                }
              ]
            }
          }
        ],
        diagnostics: []
      },
      sourceMdlInspection: {
        source: "source-mdl",
        models: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-cre-mdl",
            sourceModelFileName: "cre_fixture.mdl",
            sourceModelObjectKey: "modules/current/models/cre_fixture.mdl",
            modelName: "cre_fixture",
            supermodel: "a_fa",
            animationScale: 1,
            nodeCount: 5,
            rootNodeNames: ["cre_fixture"],
            nodeTypes: ["danglymesh", "dummy", "emitter", "light", "skin"],
            nodeTypeCounts: {
              dummy: 1,
              skin: 1,
              emitter: 1,
              light: 1,
              danglymesh: 1
            },
            nodes: [
              {
                name: "cre_fixture",
                nodeType: "dummy",
                position: [0, 0, 0],
                scale: 1
              },
              {
                name: "torso_skin",
                nodeType: "skin",
                parentName: "cre_fixture",
                position: [0, 0, 0],
                scale: 1
              }
            ],
            animationCount: 1,
            animationNames: ["walk"],
            animations: [
              {
                name: "walk",
                targetModel: "cre_fixture",
                animRoot: "rootdummy",
                animationScale: 1.25,
                lengthSeconds: 1.2,
                transitionSeconds: 0.25,
                events: [{ timeSeconds: 0.5, name: "footstep" }],
                nodeCount: 2,
                nodeNames: ["cre_fixture", "torso_skin"],
                positionKeyCount: 1,
                orientationKeyCount: 2,
                scaleKeyCount: 0,
                alphaKeyCount: 1,
                danglyNodeCount: 1,
                animmeshNodeCount: 0
              }
            ],
            meshCount: 2,
            textureReferences: ["cre_body", "fx_fire"]
          }
        ],
        diagnostics: []
      },
      materialPipelineEvidence: {
        source: "decompiled-aurora",
        pltVertexShaderName: "vs_pltgen",
        pltFragmentShaderName: "fs_pltgen",
        pltSchemeUniformPattern: "PLTscheme[%d]",
        pltSchemeUniformCount: 15,
        pltReplacementUniformName: "pltreplacement",
        skinPaletteResRef: "pal_skin01"
      },
      skeletonPipelineEvidence: {
        source: "decompiled-aurora",
        supermodelCommandName: "setsupermodel",
        animationScaleCommandName: "setanimationscale",
        skinnedMeshNodeType: "skinmesh",
        requiresComposedSkeleton: true
      },
      bodyParts: {
        head: 1,
        torso: 2,
        rHand: 220
      },
      colors: {
        skin: 12,
        hair: 34,
        cloth1: 220,
        tattoo1: 56,
        tattoo2: 78
      }
    }
  };
}

describe("CreaturesModeRightPanel", () => {
  it("shows creature PLT layer rows from the render payload colors", () => {
    render(
      <CreaturesModeRightPanel
        activePayload={buildCreaturePayload()}
        activePreviewObject={buildCreaturePreviewObject()}
        previewErrorMessage={null}
      />
    );

    expect(screen.getByText("PLT layers:")).toBeInTheDocument();
    expect(screen.getByText("5/10")).toBeInTheDocument();
    expect(screen.getByText("body parts:")).toBeInTheDocument();
    expect(screen.getByText("3/18")).toBeInTheDocument();
    expect(screen.getByText("appearance:")).toBeInTheDocument();
    expect(screen.getByText("Human")).toBeInTheDocument();
    expect(screen.getByText("race model:")).toBeInTheDocument();
    const appearanceProfile = screen.getByRole("region", {
      name: "creature appearance profile"
    });
    expect(within(appearanceProfile).getByText("P_HHM")).toBeInTheDocument();
    expect(screen.getByText("PLT shader:")).toBeInTheDocument();
    expect(screen.getByText("vs_pltgen/fs_pltgen")).toBeInTheDocument();
    const pipelineEvidence = screen.getByRole("region", {
      name: "creature render pipeline evidence"
    });
    expect(within(pipelineEvidence).getByText("supermodel:")).toBeInTheDocument();
    expect(within(pipelineEvidence).getByText("-")).toBeInTheDocument();
    expect(screen.getByText("source features:")).toBeInTheDocument();
    expect(screen.getByText("E1 / L1 / M1 / T1")).toBeInTheDocument();
    expect(screen.getByText("source MDL:")).toBeInTheDocument();
    expect(screen.getByText("1 models / 5 nodes / 1 anims")).toBeInTheDocument();

    const sourceMdlModelRows = screen.getByRole("list", {
      name: "creature source MDL model rows"
    });
    expect(within(sourceMdlModelRows).getByText("cre_fixture -> a_fa")).toBeInTheDocument();
    expect(
      within(sourceMdlModelRows).getByText("danglymesh 1 / dummy 1 / emitter 1 / light 1 / skin 1")
    ).toBeInTheDocument();

    const sourceMdlNodeRows = screen.getByRole("list", {
      name: "creature source MDL node rows"
    });
    expect(within(sourceMdlNodeRows).getByText("cre_fixture")).toBeInTheDocument();
    expect(within(sourceMdlNodeRows).getByText("torso_skin")).toBeInTheDocument();
    expect(within(sourceMdlNodeRows).getByText("skin <- cre_fixture")).toBeInTheDocument();

    const sourceMdlAnimationRows = screen.getByRole("list", {
      name: "creature source MDL animation rows"
    });
    expect(within(sourceMdlAnimationRows).getByText("walk")).toBeInTheDocument();
    expect(
      within(sourceMdlAnimationRows).getByText(
        "1.2s / 2 nodes / root rootdummy / scale 1.25 / events 1:footstep"
      )
    ).toBeInTheDocument();

    const animationControls = screen.getByRole("region", {
      name: "creature animation controls"
    });
    expect(within(animationControls).getByText("preview playback:")).toBeInTheDocument();
    expect(within(animationControls).getByText("auto idle")).toBeInTheDocument();
    expect(within(animationControls).getByText("direct model idle preview")).toBeInTheDocument();
    const animationSelect = within(animationControls).getByRole("combobox", {
      name: "Creature animation"
    });
    expect(animationSelect).toHaveValue("");
    expect(
      within(animationControls).getByRole("option", {
        name: "walk (1.2s / 2 nodes)"
      })
    ).toBeInTheDocument();

    const emitterRows = screen.getByRole("list", { name: "creature emitter rows" });
    expect(within(emitterRows).getByText("fire_emit")).toBeInTheDocument();
    expect(within(emitterRows).getByText("fx_fire 4x4")).toBeInTheDocument();

    const lightRows = screen.getByRole("list", { name: "creature light rows" });
    expect(within(lightRows).getByText("glow_l")).toBeInTheDocument();
    expect(within(lightRows).getByText("r5")).toBeInTheDocument();

    const materialRows = screen.getByRole("list", { name: "creature material rows" });
    expect(within(materialRows).getByText("cre_body.mtr")).toBeInTheDocument();
    expect(within(materialRows).getByText("2 slots")).toBeInTheDocument();

    const layerRows = screen.getByRole("list", { name: "PLT layer rows" });
    expect(within(layerRows).getByText("skin")).toBeInTheDocument();
    expect(within(layerRows).getByText("hair")).toBeInTheDocument();
    expect(within(layerRows).getByText("cloth1")).toBeInTheDocument();
    expect(within(layerRows).getByText("tattoo1")).toBeInTheDocument();
    expect(within(layerRows).getByText("tattoo2")).toBeInTheDocument();
    expect(within(layerRows).getByText("12")).toBeInTheDocument();
    expect(within(layerRows).getByText("34")).toBeInTheDocument();
    expect(within(layerRows).getByText("175")).toBeInTheDocument();
    expect(within(layerRows).getByText("56")).toBeInTheDocument();
    expect(within(layerRows).getByText("78")).toBeInTheDocument();

    const bodyPartRows = screen.getByRole("list", { name: "body part rows" });
    expect(within(bodyPartRows).getByText("head")).toBeInTheDocument();
    expect(within(bodyPartRows).getByText("torso")).toBeInTheDocument();
    expect(within(bodyPartRows).getByText("r hand")).toBeInTheDocument();
    expect(within(bodyPartRows).getByText("1")).toBeInTheDocument();
    expect(within(bodyPartRows).getByText("2")).toBeInTheDocument();
    expect(within(bodyPartRows).getByText("220")).toBeInTheDocument();

    const partModelRows = screen.getByRole("list", { name: "part model rows" });
    expect(within(partModelRows).getByText("rHand")).toBeInTheDocument();
    expect(within(partModelRows).getByText("pfh2_rhand005 -> rhand_g")).toBeInTheDocument();
    const equipmentModelRows = screen.getByRole("list", { name: "equipment model rows" });
    expect(within(equipmentModelRows).getByText("right hand")).toBeInTheDocument();
    expect(
      within(equipmentModelRows).getByText(
        "nw_wswmls001 (Longsword) models wswb_002/wswm_001/wswt_003 -> rhand_g"
      )
    ).toBeInTheDocument();
    const skeletonModelRows = screen.getByRole("list", { name: "skeleton model rows" });
    expect(within(skeletonModelRows).getByText("pfh2")).toBeInTheDocument();
    expect(within(skeletonModelRows).getByText("url-ready")).toBeInTheDocument();
  });

  it("labels special direct-model creature equipment as template data, not rendered source MDL", () => {
    const payload = buildCreaturePayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      glbUrl: "/api/v1/catalog/placeables/cache/cre_fixture/assets/asset-zcp-horse-cart.glb",
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Travel: Waggon and Donkey* (CCP)",
        modelType: "S",
        raceModel: "zcp_horse_cart"
      },
      sourceModelCandidates: [
        {
          resref: "zcp_horse_cart",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model"
        }
      ],
      skeletonModelCandidates: [],
      partModelCandidates: [],
      equipmentModelCandidates: [
        {
          resref: "nw_wswss001",
          itemTemplateId: "itm_nw_wswss001",
          slotMask: 16,
          slotLabels: ["right hand"],
          attachmentTargets: ["rhand_g"],
          primaryAttachmentTarget: "rhand_g",
          baseItem: 0,
          itemName: "Short Sword",
          itemModelType: "wswss",
          itemModelPartResRefs: ["wswss_b_011", "wswss_m_011", "wswss_t_011"],
          itemModelPartCandidates: [
            { resref: "wswss_b_011", role: "blade", partId: 11 },
            { resref: "wswss_m_011", role: "middle", partId: 11 },
            { resref: "wswss_t_011", role: "top", partId: 11 }
          ],
          source: "utc.Equip_ItemList",
          sourceModelStatus: "model-resrefs-ready"
        }
      ],
      sourceMdlInspection: {
        ...payload.renderPackage!.sourceMdlInspection!,
        models: [
          {
            ...payload.renderPackage!.sourceMdlInspection!.models[0],
            sourceModelAssetId: "asset-zcp-horse-cart-mdl",
            sourceModelFileName: "zcp_horse_cart.mdl",
            modelName: "zcp_horse_cart",
            supermodel: "zcp_pegasus_l"
          },
          {
            ...payload.renderPackage!.sourceMdlInspection!.models[0],
            sourceModelAssetId: "asset-wswss-b-mdl",
            sourceModelFileName: "wswss_b_011.mdl",
            modelName: "wswss_b_011",
            supermodel: undefined,
            nodeCount: 2,
            animationCount: 0,
            nodes: [],
            animations: []
          }
        ]
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    render(
      <CreaturesModeRightPanel
        activePayload={payload}
        activePreviewObject={buildCreaturePreviewObject()}
        previewErrorMessage={null}
      />
    );

    const equipmentModelRows = screen.getByRole("list", { name: "equipment model rows" });
    expect(
      within(equipmentModelRows).getByText(
        "not rendered (model type S): nw_wswss001 (Short Sword) models wswss_b_011/wswss_m_011/wswss_t_011 -> rhand_g"
      )
    ).toBeInTheDocument();

    expect(screen.getByText("source MDL:")).toBeInTheDocument();
    expect(screen.getByText("1 models / 5 nodes / 1 anims")).toBeInTheDocument();
    const sourceMdlModelRows = screen.getByRole("list", {
      name: "creature source MDL model rows"
    });
    expect(within(sourceMdlModelRows).getByText("zcp_horse_cart -> zcp_pegasus_l")).toBeInTheDocument();
    expect(within(sourceMdlModelRows).queryByText("wswss_b_011")).not.toBeInTheDocument();
  });

  it("labels source MDL emitter and light payloads as viewport previews without model URLs", () => {
    const payload = buildCreaturePayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      skeletonModelCandidates: [],
      partModelCandidates: [],
      equipmentModelCandidates: []
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    render(
      <CreaturesModeRightPanel
        activePayload={payload}
        activePreviewObject={buildCreaturePreviewObject()}
        previewErrorMessage={null}
      />
    );

    expect(screen.getByText("viewport model:")).toBeInTheDocument();
    expect(screen.getByText("emitter/light preview")).toBeInTheDocument();
    expect(screen.queryByText("primitive fallback")).not.toBeInTheDocument();
  });

  it("hides empty direct driver animations when part models provide the viewport geometry", () => {
    const payload = buildCreaturePayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      glbUrl: "/api/v1/catalog/placeables/cache/cre_fixture/assets/asset-c-gennode-glb.glb",
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "[Invis] Horse: Half-Elf",
        modelType: "FT",
        raceModel: "c_gennode"
      },
      sourceModelCandidates: [
        {
          resref: "c_gennode",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model"
        }
      ],
      skeletonModelCandidates: [],
      partModelCandidates: [
        {
          slot: "tail",
          partId: 4,
          partModelName: "tail",
          nodeName: "tail_g",
          modelResRef: "c_tail_brs",
          assetId: "asset-tail-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cre_fixture/assets/asset-tail-glb.glb",
          source: "tailmodel.2da.MODEL",
          source2daRow: 4,
          sourceKey: "tailmodel.2da.MODEL"
        }
      ],
      sourceMdlInspection: {
        ...payload.renderPackage!.sourceMdlInspection!,
        models: payload.renderPackage!.sourceMdlInspection!.models.map((model) => ({
          ...model,
          modelName: "c_gennode",
          animationNames: ["1hslashl"],
          animations: model.animations.map((animation) => ({
            ...animation,
            name: "1hslashl"
          }))
        }))
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    render(
      <CreaturesModeRightPanel
        activePayload={payload}
        activePreviewObject={buildCreaturePreviewObject()}
        previewErrorMessage={null}
        onSelectedAnimationNameChange={() => undefined}
      />
    );

    expect(screen.getByText("viewport model:")).toBeInTheDocument();
    expect(screen.getByText("part model group")).toBeInTheDocument();
    const animationControls = screen.getByRole("region", {
      name: "creature animation controls"
    });
    expect(within(animationControls).getByText("no source clips")).toBeInTheDocument();
    expect(within(animationControls).getByText("no source MDL animations")).toBeInTheDocument();
    expect(
      within(animationControls).queryByRole("option", {
        name: /1hslashl/u
      })
    ).not.toBeInTheDocument();
  });

  it("emits source MDL animation selection changes for the active creature", () => {
    const selected: string[] = [];

    render(
      <CreaturesModeRightPanel
        activePayload={buildCreaturePayload()}
        activePreviewObject={buildCreaturePreviewObject()}
        previewErrorMessage={null}
        onSelectedAnimationNameChange={(_, animationName) => selected.push(animationName)}
      />
    );

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "Creature animation"
      }),
      {
        target: { value: "walk" }
      }
    );

    expect(selected).toEqual(["walk"]);
  });

  it("emits a creature animation state override for the active preview", () => {
    const selected: Array<number | undefined> = [];

    render(
      <CreaturesModeRightPanel
        activePayload={buildCreaturePayload()}
        activePreviewObject={buildCreaturePreviewObject()}
        previewErrorMessage={null}
        onSelectedAnimationStateChange={(_, animationState) => selected.push(animationState)}
      />
    );

    fireEvent.change(screen.getByLabelText("Creature animation state"), {
      target: { value: "2" }
    });

    expect(selected).toEqual([2]);
  });

  it("marks selected multipart creature animations as anchored selected-clip playback", () => {
    const activePreviewObject = buildCreaturePreviewObject();
    activePreviewObject.creatureProperties = {
      advancedSettings: {
        animationName: "walk"
      }
    };
    const payload = buildCreaturePayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      partModelCandidates: payload.renderPackage!.partModelCandidates.map((candidate) => ({
        ...candidate,
        glbUrl: "/api/v1/catalog/placeables/cache/cre_fixture/assets/asset-rhand-glb.glb"
      }))
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    render(
      <CreaturesModeRightPanel
        activePayload={payload}
        activePreviewObject={activePreviewObject}
        previewErrorMessage={null}
        onSelectedAnimationNameChange={() => undefined}
      />
    );

    const animationControls = screen.getByRole("region", {
      name: "creature animation controls"
    });
    expect(within(animationControls).getByText("preview playback:")).toBeInTheDocument();
    expect(within(animationControls).getByText("selected clip")).toBeInTheDocument();
    expect(within(animationControls).getByText("anchored multipart playback")).toBeInTheDocument();
  });

  it("reports a known creature state when this model lacks its canonical clip", () => {
    const activePreviewObject = buildCreaturePreviewObject();
    activePreviewObject.creatureProperties = {
      advancedSettings: {
        animationState: 2
      }
    };
    const payload = buildCreaturePayload();

    render(
      <CreaturesModeRightPanel
        activePayload={payload}
        activePreviewObject={activePreviewObject}
        previewErrorMessage={null}
        onSelectedAnimationNameChange={() => undefined}
      />
    );

    const animationControls = screen.getByRole("region", {
      name: "creature animation controls"
    });
    expect(within(animationControls).getByText("animation state:")).toBeInTheDocument();
    expect(within(animationControls).getByText("2")).toBeInTheDocument();
    expect(within(animationControls).getByText("state mapping:")).toBeInTheDocument();
    expect(within(animationControls).getByText("state clip unavailable")).toBeInTheDocument();
    expect(within(animationControls).getByText("clisten | listen")).toBeInTheDocument();
  });

  it("marks creature animation state as overridden when an explicit clip is selected", () => {
    const activePreviewObject = buildCreaturePreviewObject();
    activePreviewObject.creatureProperties = {
      advancedSettings: {
        animationState: 2,
        animationName: "walk"
      }
    };
    const payload = buildCreaturePayload();

    render(
      <CreaturesModeRightPanel
        activePayload={payload}
        activePreviewObject={activePreviewObject}
        previewErrorMessage={null}
        onSelectedAnimationNameChange={() => undefined}
      />
    );

    const animationControls = screen.getByRole("region", {
      name: "creature animation controls"
    });
    expect(within(animationControls).getByText("state mapping:")).toBeInTheDocument();
    expect(within(animationControls).getByText("overridden by animation")).toBeInTheDocument();
    expect(within(animationControls).getByText("state detail:")).toBeInTheDocument();
    expect(within(animationControls).getAllByText("walk")).toHaveLength(2);
  });

  it("marks selected direct source-skinned creature animations as playable source-skinning previews", () => {
    const activePreviewObject = buildCreaturePreviewObject();
    activePreviewObject.creatureProperties = {
      advancedSettings: {
        animationName: "walk"
      }
    };
    const payload = buildCreaturePayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      glbUrl: "/api/v1/catalog/placeables/cache/cre_fixture/assets/asset-cre-fixture.glb",
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        modelType: "S",
        raceModel: "cre_fixture"
      },
      partModelCandidates: [],
      skeletonModelCandidates: []
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    render(
      <CreaturesModeRightPanel
        activePayload={payload}
        activePreviewObject={activePreviewObject}
        previewErrorMessage={null}
        onSelectedAnimationNameChange={() => undefined}
      />
    );

    const animationControls = screen.getByRole("region", {
      name: "creature animation controls"
    });
    const pipelineEvidence = screen.getByRole("region", {
      name: "creature render pipeline evidence"
    });
    expect(within(pipelineEvidence).getByText("a_fa")).toBeInTheDocument();
    expect(within(animationControls).getByText("preview playback:")).toBeInTheDocument();
    expect(within(animationControls).getByText("selected clip")).toBeInTheDocument();
    expect(within(animationControls).getByText("source skinning playback")).toBeInTheDocument();
  });

  it("marks selected direct supermodel creature animations as retargeted playback", () => {
    const activePreviewObject = buildCreaturePreviewObject();
    activePreviewObject.creatureProperties = {
      advancedSettings: {
        animationName: "custom15start"
      }
    };
    const payload = buildCreaturePayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      glbUrl: "/api/v1/catalog/placeables/cache/cre_fixture/assets/asset-cre-fixture.glb",
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        raceModel: "cre_fixture"
      },
      partModelCandidates: [],
      skeletonModelCandidates: [],
      sourceMdlInspection: {
        ...payload.renderPackage!.sourceMdlInspection!,
        models: [
          ...payload.renderPackage!.sourceMdlInspection!.models,
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-super-mdl",
            sourceModelFileName: "a_fa.mdl",
            sourceModelObjectKey: "modules/current/models/a_fa.mdl",
            modelName: "a_fa",
            supermodel: "",
            animationScale: 1,
            nodeCount: 2,
            rootNodeNames: ["rootdummy"],
            nodeTypes: ["dummy"],
            nodeTypeCounts: {
              dummy: 1
            },
            nodes: [
              {
                name: "rootdummy",
                nodeType: "dummy",
                position: [0, 0, 0],
                scale: 1
              }
            ],
            animationCount: 1,
            animationNames: ["custom15start"],
            animations: [
              {
                name: "custom15start",
                targetModel: "cre_fixture",
                lengthSeconds: 1.4,
                transitionSeconds: 0.25,
                nodeCount: 2,
                nodeNames: ["torso_g", "head_g"],
                positionKeyCount: 1,
                orientationKeyCount: 2,
                scaleKeyCount: 0,
                alphaKeyCount: 0,
                danglyNodeCount: 0,
                animmeshNodeCount: 0
              }
            ],
            meshCount: 0,
            textureReferences: []
          }
        ]
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    render(
      <CreaturesModeRightPanel
        activePayload={payload}
        activePreviewObject={activePreviewObject}
        previewErrorMessage={null}
        onSelectedAnimationNameChange={() => undefined}
      />
    );

    const animationControls = screen.getByRole("region", {
      name: "creature animation controls"
    });
    expect(within(animationControls).getByText("preview playback:")).toBeInTheDocument();
    expect(within(animationControls).getByText("selected clip")).toBeInTheDocument();
    expect(within(animationControls).getByText("retargeted supermodel playback")).toBeInTheDocument();
  });

  it("marks selected simple direct-source creature animations as direct model playback", () => {
    const activePreviewObject = buildCreaturePreviewObject();
    activePreviewObject.creatureProperties = {
      advancedSettings: {
        animationName: "walk"
      }
    };
    const payload = buildCreaturePayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      glbUrl: "/api/v1/catalog/placeables/cache/cre_fixture/assets/asset-cre-fixture.glb",
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        modelType: "S",
        raceModel: "cre_fixture"
      },
      partModelCandidates: [],
      skeletonModelCandidates: [],
      sourceMdlInspection: {
        ...payload.renderPackage!.sourceMdlInspection!,
        models: payload.renderPackage!.sourceMdlInspection!.models.map((model) => ({
          ...model,
          nodeTypes: ["dummy", "trimesh"],
          nodeTypeCounts: {
            dummy: 1,
            trimesh: 1
          },
          nodes: model.nodes.filter((node) => node.nodeType !== "skin")
        }))
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    render(
      <CreaturesModeRightPanel
        activePayload={payload}
        activePreviewObject={activePreviewObject}
        previewErrorMessage={null}
        onSelectedAnimationNameChange={() => undefined}
      />
    );

    const animationControls = screen.getByRole("region", {
      name: "creature animation controls"
    });
    expect(within(animationControls).getByText("preview playback:")).toBeInTheDocument();
    expect(within(animationControls).getByText("selected clip")).toBeInTheDocument();
    expect(within(animationControls).getByText("direct model playback")).toBeInTheDocument();
  });

  it("does not label direct playback as source skinning when the selected clip skips skin nodes", () => {
    const activePreviewObject = buildCreaturePreviewObject();
    activePreviewObject.creatureProperties = {
      advancedSettings: {
        animationName: "walk"
      }
    };
    const payload = buildCreaturePayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      glbUrl: "/api/v1/catalog/placeables/cache/cre_fixture/assets/asset-cre-fixture.glb",
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        modelType: "S",
        raceModel: "cre_fixture"
      },
      partModelCandidates: [],
      skeletonModelCandidates: [],
      sourceMdlInspection: {
        ...payload.renderPackage!.sourceMdlInspection!,
        models: payload.renderPackage!.sourceMdlInspection!.models.map((model) => ({
          ...model,
          animations: model.animations.map((animation) => ({
            ...animation,
            nodeNames: ["cre_fixture"]
          }))
        }))
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    render(
      <CreaturesModeRightPanel
        activePayload={payload}
        activePreviewObject={activePreviewObject}
        previewErrorMessage={null}
        onSelectedAnimationNameChange={() => undefined}
      />
    );

    const animationControls = screen.getByRole("region", {
      name: "creature animation controls"
    });
    expect(within(animationControls).getByText("preview playback:")).toBeInTheDocument();
    expect(within(animationControls).getByText("selected clip")).toBeInTheDocument();
    expect(within(animationControls).getByText("direct model playback")).toBeInTheDocument();
    expect(within(animationControls).queryByText("source skinning playback")).not.toBeInTheDocument();
  });
});
