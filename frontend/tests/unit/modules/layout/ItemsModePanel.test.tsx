import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ItemsModePanel } from "../../../../src/modules/layout/components/ItemsModePanel";
import type { SceneObject } from "../../../../src/modules/layout/contracts";

function buildItemTemplate(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "itm_template_item_nw_maarcl009",
    kind: "items",
    name: "Hide Armor",
    resRef: "nw_maarcl009",
    tag: "NW_MAARCL009",
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceObjectId: "item_nw_maarcl009",
      templateId: "item_nw_maarcl009"
    },
    x: 0.5,
    y: 0.5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    itemProperties: {
      localizedName: "Hide Armor",
      description: "Base armor",
      identifiedDescription: "Identified base armor",
      baseItem: 16,
      baseItemLabel: "Armor",
      baseItemModelType: "AArCl",
      baseItemDefaultModel: "0",
      cost: 19463,
      stackSize: 1,
      charges: 0,
      identified: true,
      armorParts: {
        rFoot: 4,
        lFoot: 4,
        pelvis: 8,
        torso: 43,
        rShoul: 15,
        lShoul: 15
      },
      materialColors: {
        leather1: 5,
        leather2: 7,
        cloth1: 2,
        cloth2: 3,
        metal1: 17,
        metal2: 8
      },
      propertyList: [
        {
          propertyName: 15,
          propertyLabel: "CastSpell",
          subtype: 66,
          subTypeTable: "iprp_spells",
          costTable: 3,
          costValue: 1,
          costTableDefinition: "iprp_chargecost",
          chanceAppear: 100
        }
      ]
    },
    ...overrides
  };
}

describe("ItemsModePanel", () => {
  it("creates an Aurora-style item blueprint from the New Item wizard", () => {
    const onCreateItem = vi.fn();
    const template = buildItemTemplate();

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={onCreateItem}
        isLoading={false}
        loadErrorMessage={null}
        createSequence={394}
      />
    );

    expect(screen.getByTitle("Total items")).toHaveTextContent("393");

    fireEvent.click(screen.getByRole("button", { name: /new item/i }));
    const wizard = screen.getByRole("form", { name: /item creation wizard/i });

    fireEvent.click(within(wizard).getByRole("tab", { name: /identity/i }));
    fireEvent.change(within(wizard).getByLabelText("Name"), {
      target: { value: "Custom Hide Armor" }
    });
    fireEvent.change(within(wizard).getByLabelText("ResRef"), {
      target: { value: "custom hide armor" }
    });
    fireEvent.change(within(wizard).getByLabelText("Tag"), {
      target: { value: "custom hide armor" }
    });
    fireEvent.change(within(wizard).getByLabelText("Description"), {
      target: { value: "Draft item description" }
    });

    fireEvent.click(within(wizard).getByRole("tab", { name: /visual/i }));
    fireEvent.change(within(wizard).getByLabelText("Armor Mannequin"), {
      target: { value: "pfh2" }
    });
    fireEvent.change(within(wizard).getByLabelText("Torso"), {
      target: { value: "44" }
    });
    fireEvent.change(within(wizard).getByLabelText("Pelvis"), {
      target: { value: "9" }
    });
    fireEvent.change(within(wizard).getByLabelText("Leather 1"), {
      target: { value: "12" }
    });

    fireEvent.click(within(wizard).getByRole("tab", { name: /properties/i }));
    fireEvent.change(within(wizard).getByLabelText("Add Cost"), {
      target: { value: "250" }
    });
    fireEvent.click(within(wizard).getByLabelText("Plot"));
    fireEvent.click(within(wizard).getByRole("button", { name: /add property/i }));
    fireEvent.change(within(wizard).getByLabelText("Property 1"), {
      target: { value: "15" }
    });
    expect(within(wizard).getByText("CastSpell / iprp_spells / iprp_chargecost")).toBeInTheDocument();
    fireEvent.change(within(wizard).getByLabelText("Subtype 1"), {
      target: { value: "66" }
    });
    fireEvent.change(within(wizard).getByLabelText("Cost Table 1"), {
      target: { value: "3" }
    });
    fireEvent.change(within(wizard).getByLabelText("Cost Value 1"), {
      target: { value: "1" }
    });
    fireEvent.click(within(wizard).getByRole("button", { name: /create item/i }));

    expect(onCreateItem).toHaveBeenCalledTimes(1);
    const created = onCreateItem.mock.calls[0]?.[0] as SceneObject;
    expect(created.id).toBe("itm_wizard_custom_hide_armo_394");
    expect(created.name).toBe("Custom Hide Armor");
    expect(created.resRef).toBe("custom_hide_armo");
    expect(created.tag).toBe("CUSTOM_HIDE_ARMOR");
    expect(created.source?.templateId).toBe("item_nw_maarcl009");
    expect(created.source?.sourceModelResRef).toBe("nw_maarcl009");
    expect(created.itemProperties?.baseItem).toBe(16);
    expect(created.itemProperties?.armorPreviewContext).toMatchObject({
      modelPrefix: "pfh2_",
      label: "Human Female P2",
      gender: 1,
      phenotype: 2,
      raceModel: "human"
    });
    expect(created.itemProperties?.armorParts).toMatchObject({
      torso: 44,
      pelvis: 9
    });
    expect(created.itemProperties?.materialColors).toMatchObject({
      leather1: 12
    });
    expect(created.itemProperties?.addCost).toBe(250);
    expect(created.itemProperties?.plot).toBe(true);
    expect(created.itemProperties?.propertyList).toEqual([
      expect.objectContaining({
        propertyName: 15,
        propertyLabel: "CastSpell",
        subtype: 66,
        subTypeTable: "iprp_spells",
        costTable: 3,
        costValue: 1,
        costTableDefinition: "iprp_chargecost",
        chanceAppear: 100
      })
    ]);
  });

  it("shows item generator support as unsupported when sources are LTR lexicons", () => {
    const template = buildItemTemplate();

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
        generatorSupport={{
          generatedAt: "2026-07-01T00:00:00.000Z",
          supported: false,
          status: "unsupported",
          sourceCount: 4,
          gffCandidateCount: 0,
          parseableGffCount: 0,
          ltrLexiconCount: 4,
          parserImplemented: false,
          notes: [
            "Detected .utg resources are LTR V1.0 lexicons, not item-generator blueprints."
          ],
          sources: [
            {
              objectKey: "C:\\Projects\\New Folder\\item-retail-extract\\utg\\animal.utg",
              fileName: "animal.utg",
              sizeBytes: 273177,
              source: "local-retail-extract",
              header: "LTR V1.0",
              classification: "ltr-lexicon",
              supported: false,
              parseable: false,
              reason: "LTR V1.0 resource, not a GFF item-generator blueprint."
            }
          ]
        }}
      />
    );

    const status = screen.getByLabelText("item generator support");
    expect(status).toHaveTextContent("Item Generator Unsupported");
    expect(status).toHaveTextContent("0/0 GFF ready / 4 LTR");
    expect(status).toHaveTextContent("animal.utg: LTR V1.0");
  });

  it("guards item creation against duplicate ResRefs and supports rename or overwrite", () => {
    const onCreateItem = vi.fn();
    const template = buildItemTemplate();
    const existingCustomItem = buildItemTemplate({
      id: "itm_wizard_custom_hide_armo_393",
      name: "Existing Hide Armor",
      resRef: "custom_hide_armo",
      tag: "CUSTOM_HIDE_ARMOR"
    });

    render(
      <ItemsModePanel
        objects={[template, existingCustomItem]}
        creationBaseObjects={[template]}
        total={394}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={onCreateItem}
        isLoading={false}
        loadErrorMessage={null}
        createSequence={394}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /new item/i }));
    const wizard = screen.getByRole("form", { name: /item creation wizard/i });
    fireEvent.click(within(wizard).getByRole("tab", { name: /identity/i }));
    fireEvent.change(within(wizard).getByLabelText("ResRef"), {
      target: { value: "custom hide armo" }
    });

    expect(within(wizard).getByText(/resref already exists/i)).toBeInTheDocument();
    expect(within(wizard).getByRole("button", { name: /create item/i })).toBeDisabled();

    fireEvent.click(within(wizard).getByRole("button", { name: /use custom_hide_394/i }));
    expect(within(wizard).getByLabelText("ResRef")).toHaveValue("custom_hide_394");
    fireEvent.click(within(wizard).getByRole("button", { name: /create item/i }));

    expect(onCreateItem).toHaveBeenCalledTimes(1);
    expect(onCreateItem.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        resRef: "custom_hide_394"
      })
    );
    expect(onCreateItem.mock.calls[0]?.[1]).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: /new item/i }));
    const overwriteWizard = screen.getByRole("form", { name: /item creation wizard/i });
    fireEvent.click(within(overwriteWizard).getByRole("tab", { name: /identity/i }));
    fireEvent.change(within(overwriteWizard).getByLabelText("ResRef"), {
      target: { value: "custom hide armo" }
    });
    fireEvent.click(within(overwriteWizard).getByLabelText("Overwrite existing ResRef"));
    fireEvent.click(within(overwriteWizard).getByRole("button", { name: /create item/i }));

    expect(onCreateItem).toHaveBeenCalledTimes(2);
    expect(onCreateItem.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        resRef: "custom_hide_armo"
      })
    );
    expect(onCreateItem.mock.calls[1]?.[1]).toEqual({ overwrite: true });
  });

  it("shows delete only for wizard-created custom item blueprints", () => {
    const template = buildItemTemplate();
    const customItem = buildItemTemplate({
      id: "itm_wizard_custom_hide_armo_394",
      name: "Custom Hide Armor",
      resRef: "custom_hide_armo",
      tag: "CUSTOM_HIDE_ARMOR"
    });
    const onDeleteItem = vi.fn();

    render(
      <ItemsModePanel
        objects={[customItem, template]}
        creationBaseObjects={[template]}
        total={394}
        activeObjectId={customItem.id}
        searchQuery="hide"
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        onDeleteItem={onDeleteItem}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    expect(screen.getByTitle("Filtered loaded items / total items")).toHaveTextContent("2/394");
    const deleteButtons = screen.getAllByRole("button", { name: /delete custom item/i });
    expect(deleteButtons).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /delete custom item custom_hide_armor/i }));

    expect(onDeleteItem).toHaveBeenCalledTimes(1);
    expect(onDeleteItem).toHaveBeenCalledWith(customItem);
  });

  it("renders item list thumbnails from real Aurora icon assets", () => {
    const baseTemplate = buildItemTemplate();
    const template = buildItemTemplate({
      itemProperties: {
        ...baseTemplate.itemProperties,
        baseItemDefaultIcon: "iwswss",
        baseItemInvSlotWidth: 1,
        baseItemInvSlotHeight: 3,
        modelParts: [1, 2, 3],
        modelPartResRefs: ["w_swsws_001", "w_swsws_002", "w_swsws_003"],
        modelAssetCandidates: [
          {
            assetId: "asset-icon-png",
            role: "texture",
            fileName: "iwswss.png",
            objectKey: "modules/current/iwswss.png",
            extension: "png",
            reference: "iwswss",
            assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-icon-png.png"
          }
        ]
      }
    });

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    const image = screen.getByRole("img", { name: /NW_MAARCL009 2D preview/i });
    expect(image.getAttribute("src")).toBe(
      "/api/v1/catalog/placeables/cache/icon/assets/asset-icon-png.png"
    );
    const inventoryGrid = screen.getByLabelText("NW_MAARCL009 inventory icon grid 1 x 3");
    expect(inventoryGrid).toHaveAttribute("data-grid-width", "1");
    expect(inventoryGrid).toHaveAttribute("data-grid-height", "3");
    expect(inventoryGrid).toHaveAttribute("data-grid-cells", "3");
    expect(inventoryGrid).toHaveStyle("--item-inventory-frame-width: 18px");
    expect(inventoryGrid).toHaveStyle("--item-inventory-frame-height: 44px");
    expect(screen.getByText("ICON iwswss")).toBeInTheDocument();
  });

  it("uses the real 3D torch model under the Aurora 2D icon contract", () => {
    const baseTemplate = buildItemTemplate();
    const template = buildItemTemplate({
      id: "itm_template_item_nw_it_torch001",
      name: "Torch",
      resRef: "nw_it_torch001",
      tag: "NW_IT_TORCH001",
      itemProperties: {
        ...baseTemplate.itemProperties,
        baseItem: 15,
        baseItemLabel: "Torch",
        baseItemModelType: "it_torch",
        baseItemDefaultModel: "it_bag",
        baseItemDefaultIcon: "iit_torch_000",
        baseItemInvSlotWidth: 1,
        baseItemInvSlotHeight: 3,
        baseItemCanRotateIcon: 1,
        armorParts: undefined,
        materialColors: undefined,
        modelParts: [1],
        modelPartResRefs: ["it_torch001"],
        modelAssetCandidates: [
          {
            assetId: "asset-torch-model",
            role: "model",
            fileName: "it_torch001.glb",
            objectKey: "modules/current/it_torch001.glb",
            extension: "glb",
            reference: "it_torch001",
            assetUrl: "/api/v1/catalog/placeables/cache/item/assets/asset-torch-model.glb"
          },
          {
            assetId: "asset-torch-icon",
            role: "texture",
            fileName: "iit_torch_000.png",
            objectKey: "modules/current/iit_torch_000.png",
            extension: "png",
            reference: "iit_torch_000",
            assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-torch-icon.png"
          }
        ]
      }
    });

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    const inventoryGrid = screen.getByLabelText("NW_IT_TORCH001 inventory icon grid 1 x 3");
    const thumbnail = inventoryGrid.querySelector(".scene-object-thumbnail");
    expect(thumbnail).toHaveAttribute("data-thumbnail-model-source-count", "1");
    expect(thumbnail).toHaveAttribute("data-thumbnail-render-enabled", "true");
    expect(thumbnail).toHaveAttribute("data-thumbnail-render-mode", "model-3d");
    expect(thumbnail).toHaveAttribute("data-thumbnail-aurora-2d-default-icon", "iit_torch_000");
    expect(thumbnail).toHaveAttribute("data-thumbnail-aurora-2d-slot-width", "1");
    expect(thumbnail).toHaveAttribute("data-thumbnail-aurora-2d-slot-height", "3");
    expect(thumbnail).toHaveAttribute("data-thumbnail-aurora-2d-can-rotate-icon", "1");
    expect(thumbnail).toHaveAttribute("data-thumbnail-item-icon-resref", "iit_torch_000");
    expect(thumbnail).toHaveClass("scene-object-thumbnail-item-model");
    expect(thumbnail).not.toHaveClass("scene-object-thumbnail-fallback");
    expect(screen.queryByRole("img", { name: /NW_IT_TORCH001 2D preview/i })).toBeNull();
    expect(screen.getByText("ICON iit_torch_000")).toBeInTheDocument();
  });

  it("uses renderable 3D item thumbnails instead of Aurora DefaultIcon inventory assets", () => {
    const baseTemplate = buildItemTemplate();
    const template = buildItemTemplate({
      id: "itm_template_item_x2_wdrowls001",
      name: "Longsword",
      resRef: "x2_wdrowls001",
      tag: "X2_WDROWLS001",
      itemProperties: {
        ...baseTemplate.itemProperties,
        baseItem: 1,
        baseItemLabel: "Longsword",
        baseItemModelType: "wswls",
        baseItemDefaultIcon: "iwswls",
        baseItemInvSlotWidth: 1,
        baseItemInvSlotHeight: 3,
        armorParts: undefined,
        materialColors: undefined,
        modelParts: [24, 34, 54],
        modelPartResRefs: ["wswls_024", "wswls_034", "wswls_054"],
        modelAssetCandidates: [
          {
            assetId: "asset-longsword-blade",
            role: "model",
            fileName: "wswls_024.glb",
            objectKey: "modules/current/wswls_024.glb",
            extension: "glb",
            reference: "wswls_024",
            assetUrl: "/api/v1/catalog/placeables/cache/item/assets/wswls_024.glb"
          },
          {
            assetId: "asset-longsword-hilt",
            role: "model",
            fileName: "wswls_034.glb",
            objectKey: "modules/current/wswls_034.glb",
            extension: "glb",
            reference: "wswls_034",
            assetUrl: "/api/v1/catalog/placeables/cache/item/assets/wswls_034.glb"
          },
          {
            assetId: "asset-longsword-top",
            role: "model",
            fileName: "wswls_054.glb",
            objectKey: "modules/current/wswls_054.glb",
            extension: "glb",
            reference: "wswls_054",
            assetUrl: "/api/v1/catalog/placeables/cache/item/assets/wswls_054.glb"
          },
          {
            assetId: "asset-longsword-icon",
            role: "texture",
            fileName: "iwswls.png",
            objectKey: "modules/current/iwswls.png",
            extension: "png",
            reference: "iwswls",
            assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/iwswls.png"
          }
        ]
      }
    });

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    const inventoryGrid = screen.getByLabelText("X2_WDROWLS001 inventory icon grid 1 x 3");
    const thumbnail = inventoryGrid.querySelector(".scene-object-thumbnail");
    expect(thumbnail).toHaveAttribute("data-thumbnail-model-source-count", "3");
    expect(thumbnail).toHaveAttribute("data-thumbnail-render-enabled", "true");
    expect(thumbnail).toHaveAttribute("data-thumbnail-render-mode", "model-3d");
    expect(thumbnail).toHaveAttribute("data-thumbnail-item-icon-resref", "iwswls");
    expect(thumbnail).toHaveClass("scene-object-thumbnail-item-model");
    expect(screen.queryByRole("img", { name: /X2_WDROWLS001 2D preview/i })).toBeNull();
    expect(screen.getByText("ICON iwswls")).toBeInTheDocument();
  });

  it("uses assembled armor model thumbnails instead of the base 2DA chest icon", () => {
    const baseTemplate = buildItemTemplate();
    const template = buildItemTemplate({
      itemProperties: {
        ...baseTemplate.itemProperties,
        baseItemDefaultIcon: "iit_chest",
        baseItemInvSlotWidth: 2,
        baseItemInvSlotHeight: 3,
        armorPreviewContext: {
          modelPrefix: "pmh0_",
          label: "human-male-phenotype0",
          gender: 0,
          phenotype: 0,
          raceModel: "human"
        },
        armorPartModelCandidates: [
          {
            slot: "torso",
            partId: 43,
            partModelName: "chest",
            modelPrefix: "pmh0_",
            modelResRef: "pmh0_chest043",
            modelUrl: "/api/v1/catalog/placeables/cache/armor/assets/pmh0_chest043.glb"
          }
        ],
        modelAssetCandidates: [
          {
            assetId: "asset-armor-model",
            role: "model",
            fileName: "pmh0_chest043.glb",
            objectKey: "modules/current/pmh0_chest043.glb",
            extension: "glb",
            reference: "pmh0_chest043",
            assetUrl: "/api/v1/catalog/placeables/cache/armor/assets/pmh0_chest043.glb"
          },
          {
            assetId: "asset-armor-icon",
            role: "texture",
            fileName: "iit_chest.png",
            objectKey: "modules/current/iit_chest.png",
            extension: "png",
            reference: "iit_chest",
            assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/iit_chest.png"
          }
        ]
      }
    });

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    const inventoryGrid = screen.getByLabelText("NW_MAARCL009 inventory icon grid 2 x 3");
    const thumbnail = inventoryGrid.querySelector(".scene-object-thumbnail");
    expect(thumbnail).toHaveAttribute("data-thumbnail-model-source-count", "1");
    expect(thumbnail).toHaveAttribute("data-thumbnail-render-enabled", "true");
    expect(thumbnail).toHaveAttribute("data-thumbnail-render-mode", "model-3d");
    expect(thumbnail).toHaveAttribute("data-thumbnail-item-icon-resref", "iit_chest");
    expect(thumbnail).toHaveClass("scene-object-thumbnail-item-model");
    expect(screen.queryByRole("img", { name: /NW_MAARCL009 2D preview/i })).toBeNull();
    expect(screen.getByText("ICON iit_chest")).toBeInTheDocument();
  });

  it("decodes protected raw Aurora icon assets with the backend session token", async () => {
    const previousFetch = globalThis.fetch;
    const previousImageData = globalThis.ImageData;
    class MockImageData {
      readonly data: Uint8ClampedArray;
      readonly width: number;
      readonly height: number;
      readonly colorSpace = "srgb";

      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    }
    globalThis.ImageData = MockImageData as unknown as typeof ImageData;
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      putImageData: vi.fn()
    } as unknown as CanvasRenderingContext2D);
    const toDataUrlSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/png;base64,REAL_AURORA_ICON");
    const tgaBytes = new Uint8Array([
      0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 32, 8,
      64, 128, 255, 255
    ]);
    const fetchMock = vi.fn(async () => new Response(tgaBytes, { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const template = buildItemTemplate({
        itemProperties: {
          ...buildItemTemplate().itemProperties,
          baseItemDefaultIcon: "iwlcfg",
          modelParts: [49],
          modelPartResRefs: ["wlcfg_b_049"],
          modelAssetCandidates: [
            {
              assetId: "asset-gloves-tga",
              role: "texture",
              fileName: "iwlcfg_049.tga",
              objectKey: "modules/current/__aurora/sources/hak/lc_icons/iwlcfg_049.tga",
              extension: "tga",
              reference: "iwlcfg_049",
              assetUrl: "/api/v1/catalog/placeables/cache/icon/assets/asset-gloves-tga.tga"
            }
          ]
        }
      });

      render(
        <ItemsModePanel
          objects={[template]}
          creationBaseObjects={[template]}
          total={393}
          activeObjectId={template.id}
          searchQuery=""
          onSearchQueryChange={vi.fn()}
          onResetFilters={vi.fn()}
          onObjectClick={vi.fn()}
          backendAccessToken="token-real"
          isLoading={false}
          loadErrorMessage={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("img", { name: /NW_MAARCL009 2D preview/i })).toHaveAttribute(
          "src",
          "data:image/png;base64,REAL_AURORA_ICON"
        );
      });
      const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
      expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer token-real");
      expect(screen.queryByLabelText("NW_MAARCL009 real preview unavailable")).toBeNull();
    } finally {
      globalThis.fetch = previousFetch;
      globalThis.ImageData = previousImageData;
      getContextSpy.mockRestore();
      toDataUrlSpy.mockRestore();
    }
  });

  it("does not render any item thumbnail when no real icon asset exists", () => {
    const template = buildItemTemplate({
      itemProperties: {
        ...buildItemTemplate().itemProperties,
        baseItemDefaultIcon: "iwswss"
      }
    });

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    expect(screen.queryByRole("img", { name: /NW_MAARCL009 2D preview/i })).toBeNull();
    expect(screen.queryByLabelText(/NW_MAARCL009 inventory icon grid/i)).toBeNull();
    expect(screen.queryByLabelText("NW_MAARCL009 real preview unavailable")).toBeNull();
    expect(document.querySelector(".scene-object-thumbnail-missing-preview")).toBeNull();
    expect(screen.queryByText("ICON iwswss")).toBeNull();
    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
  });

  it("uses processed preview assets when labeling item visual support", () => {
    const template = buildItemTemplate({
      id: "itm_template_itm_nw_ashlw001",
      name: "Nw Ashlw001",
      resRef: "nw_ashlw001",
      tag: "NW_ASHLW001",
      itemProperties: {
        baseItem: 1550,
        baseItemLabel: "largeshield",
        baseItemModelType: "ashlw",
        baseItemDefaultIcon: "iashlw"
      }
    });
    const processedTemplate = buildItemTemplate({
      ...template,
      itemProperties: {
        ...template.itemProperties,
        modelPartCandidates: [
          {
            resRef: "ashlw_011",
            partId: 11,
            glbUrl: "/api/v1/catalog/items/nw_ashlw001/assets/ashlw_011.glb"
          }
        ]
      }
    });

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        processedPreviewObjectsById={{ [template.id]: processedTemplate }}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    expect(screen.queryByText("Preview unavailable")).toBeNull();
    expect(screen.getByText("3D model only")).toHaveAttribute(
      "data-visual-support-code",
      "model-without-real-icon"
    );
  });

  it("labels item rows whose source visual is unsupported", () => {
    const template = buildItemTemplate({
      name: "Creature Item",
      tag: "CREATURE_ITEM",
      itemProperties: {
        baseItem: 77,
        baseItemLabel: "creatureitem",
        baseItemDefaultIcon: "iinvalid_2x2"
      }
    });

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    expect(screen.getByText("Preview unsupported")).toHaveAttribute(
      "title",
      expect.stringContaining("invalid inventory icon")
    );
    expect(screen.getByText("Preview unsupported")).toHaveAttribute(
      "data-visual-support-code",
      "invalid-icon-no-renderable-model"
    );
    expect(screen.getByText("Preview unsupported")).toHaveAttribute(
      "data-visual-support-kind",
      "unsupported"
    );
  });

  it("does not use cached preview images for unsupported item visuals", () => {
    const template = buildItemTemplate({
      name: "Creature Item",
      tag: "CREATURE_ITEM",
      itemProperties: {
        baseItem: 77,
        baseItemLabel: "creatureitem",
        baseItemDefaultIcon: "iinvalid_2x2"
      }
    });

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        previewThumbnailUrlsByObjectId={{
          [template.id]: "data:image/png;base64,iVBORw0KGgo="
        }}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    expect(screen.queryByRole("img", { name: /CREATURE_ITEM 2D preview/i })).toBeNull();
    expect(screen.queryByLabelText(/CREATURE_ITEM inventory icon grid/i)).toBeNull();
    expect(screen.getByText("Preview unsupported")).toHaveAttribute(
      "data-visual-support-code",
      "invalid-icon-no-renderable-model"
    );
  });

  it("does not render metadata-only model assets as item thumbnails", () => {
    const template = buildItemTemplate({
      name: "Metadata Only Item",
      tag: "METADATA_ONLY_ITEM",
      itemProperties: {
        ...buildItemTemplate().itemProperties,
        baseItemDefaultIcon: "",
        modelPartCandidates: [
          {
            resRef: "empty_001",
            partId: 1,
            glbUrl: "/api/v1/catalog/items/empty/assets/empty_001.glb",
            assetId: "empty-model-asset"
          }
        ],
        modelAssetCandidates: [
          {
            assetId: "empty-model-asset",
            role: "model",
            fileName: "empty_001.glb",
            objectKey: "items/empty/empty_001.glb",
            extension: "glb",
            reference: "empty_001",
            assetUrl: "/api/v1/catalog/items/empty/assets/empty_001.glb",
            sizeBytes: 512
          }
        ]
      }
    });

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    expect(screen.queryByRole("img", { name: /METADATA_ONLY_ITEM 2D preview/i })).toBeNull();
    expect(screen.queryByLabelText(/METADATA_ONLY_ITEM inventory icon grid/i)).toBeNull();
    expect(screen.getByText("Preview unavailable")).toHaveAttribute(
      "data-visual-support-code",
      "empty-model-no-real-icon"
    );
  });

  it("edits, duplicates, and deletes wizard-created item blueprints", async () => {
    const template = buildItemTemplate();
    const customItem = buildItemTemplate({
      id: "itm_wizard_custom_hide_armo_394",
      name: "Custom Hide Armor",
      resRef: "custom_hide_armo",
      tag: "CUSTOM_HIDE_ARMOR",
      source: {
        ...template.source,
        sourceObjectId: "itm_custom_hide_armo",
        templateId: "itm_custom_hide_armo",
        sourceFileType: "UTI ",
        sourceFileVersion: "V3.2"
      }
    });
    const onCreateItem = vi.fn();
    const onUpdateItem = vi.fn();
    const onDeleteItem = vi.fn();

    render(
      <ItemsModePanel
        objects={[customItem]}
        creationBaseObjects={[template]}
        total={394}
        activeObjectId={customItem.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={onCreateItem}
        onUpdateItem={onUpdateItem}
        onDeleteItem={onDeleteItem}
        isLoading={false}
        loadErrorMessage={null}
        createSequence={400}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /edit custom item custom_hide_armor/i }));
    let wizard = screen.getByRole("form", { name: /item creation wizard/i });
    expect(within(wizard).getByLabelText("Name")).toHaveValue("Custom Hide Armor");
    expect(within(wizard).getByLabelText("ResRef")).toHaveValue("custom_hide_armo");
    expect(within(wizard).getByLabelText("ResRef")).toBeDisabled();

    fireEvent.change(within(wizard).getByLabelText("Name"), {
      target: { value: "Updated Hide Armor" }
    });
    fireEvent.click(within(wizard).getByRole("button", { name: /update item/i }));

    await waitFor(() => expect(onUpdateItem).toHaveBeenCalledTimes(1));
    expect(onUpdateItem).toHaveBeenCalledWith(
      "custom_hide_armo",
      expect.objectContaining({
        name: "Updated Hide Armor",
        resRef: "custom_hide_armo",
        tag: "CUSTOM_HIDE_ARMOR"
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /duplicate item custom_hide_armor/i }));
    wizard = screen.getByRole("form", { name: /item creation wizard/i });
    expect(within(wizard).getByLabelText("Name")).toHaveValue("Custom Hide Armor Copy");
    expect(within(wizard).getByLabelText("ResRef")).toHaveValue("custom_hid_400");
    fireEvent.click(within(wizard).getByRole("button", { name: /create item/i }));

    await waitFor(() => expect(onCreateItem).toHaveBeenCalledTimes(1));
    expect(onCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Custom Hide Armor Copy",
        resRef: "custom_hid_400"
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /delete custom item custom_hide_armor/i }));

    expect(onDeleteItem).toHaveBeenCalledTimes(1);
    expect(onDeleteItem).toHaveBeenCalledWith(customItem);
  });

  it("creates an Aurora UTM store blueprint from the New Store wizard", async () => {
    const onCreateStore = vi.fn();
    const template = buildItemTemplate();

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        onCreateStore={onCreateStore}
        isLoading={false}
        loadErrorMessage={null}
        storeCreateSequence={7}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /new store/i }));
    const wizard = screen.getByRole("form", { name: /store creation wizard/i });

    fireEvent.change(within(wizard).getByLabelText("Store Name"), {
      target: { value: "Potion Store" }
    });
    fireEvent.change(within(wizard).getByLabelText("Store ResRef"), {
      target: { value: "Potion Store" }
    });
    fireEvent.change(within(wizard).getByLabelText("Store Tag"), {
      target: { value: "Potion Store" }
    });
    fireEvent.change(within(wizard).getByLabelText("Mark Up"), {
      target: { value: "135" }
    });
    fireEvent.change(within(wizard).getByLabelText("Mark Down"), {
      target: { value: "45" }
    });
    fireEvent.click(within(wizard).getByLabelText("Black Market"));
    fireEvent.change(within(wizard).getByLabelText("Bucket 1 item 1 resref"), {
      target: { value: "nw_it_mpotion021" }
    });
    fireEvent.change(within(wizard).getByLabelText("Bucket 1 item 1 x"), {
      target: { value: "2" }
    });
    fireEvent.change(within(wizard).getByLabelText("Bucket 1 item 1 y"), {
      target: { value: "3" }
    });
    fireEvent.click(within(wizard).getByLabelText("Bucket 1 item 1 infinite"));
    fireEvent.click(within(wizard).getByRole("button", { name: /add bucket 1 item/i }));
    fireEvent.change(within(wizard).getByLabelText("Bucket 1 item 2 random resref"), {
      target: { value: "rnd_store_item" }
    });
    fireEvent.change(within(wizard).getByLabelText("Bucket 1 item 2 random list"), {
      target: { value: "rl_store_loot" }
    });
    fireEvent.change(within(wizard).getByLabelText("Bucket 1 item 2 x"), {
      target: { value: "4" }
    });
    fireEvent.change(within(wizard).getByLabelText("Bucket 1 item 2 y"), {
      target: { value: "5" }
    });
    fireEvent.change(within(wizard).getByLabelText("Will Not Buy"), {
      target: { value: "16, 22" }
    });
    fireEvent.change(within(wizard).getByLabelText("Will Only Buy"), {
      target: { value: "5" }
    });
    fireEvent.click(within(wizard).getByRole("button", { name: /create store/i }));

    await waitFor(() => expect(onCreateStore).toHaveBeenCalledTimes(1));
    expect(onCreateStore).toHaveBeenCalledWith(
      expect.objectContaining({
        resRef: "potion_store",
        name: "Potion Store",
        tag: "POTION_STORE",
        markUp: 135,
        markDown: 45,
        blackMarket: true,
        willNotBuyBaseItems: [16, 22],
        willOnlyBuyBaseItems: [5],
        storeListEntries: expect.arrayContaining([
          expect.objectContaining({
            bucketTypeId: 0,
            itemListEntries: [
              {
                resRef: "nw_it_mpotion021",
                x: 2,
                y: 3,
                infinite: true
              },
              {
                randomResRef: "rnd_store_item",
                randomList: "rl_store_loot",
                x: 4,
                y: 5,
                infinite: false
              }
            ]
          })
        ])
      })
    );
  });

  it("guards store creation against existing retail ResRefs and supports rename or module shadow-copy", async () => {
    const template = buildItemTemplate();
    const existingRetailStore = {
      templateId: "str_retail_custom_store_007",
      resref: "custom_store_007",
      name: "Retail Custom Store",
      category: "retail",
      tags: ["retail"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "custom_store_007",
        localizedName: "Retail Custom Store",
        tag: "CUSTOM_STORE_007"
      }
    };
    const onCreateStore = vi.fn();

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        onCreateStore={onCreateStore}
        stores={[existingRetailStore]}
        isLoading={false}
        loadErrorMessage={null}
        storeCreateSequence={7}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /new store/i }));
    let wizard = screen.getByRole("form", { name: /store creation wizard/i });

    expect(within(wizard).getByText(/store resref already exists/i)).toBeInTheDocument();
    expect(within(wizard).getByRole("button", { name: /create store/i })).toBeDisabled();

    fireEvent.click(within(wizard).getByRole("button", { name: /use custom_store_008/i }));
    expect(within(wizard).getByLabelText("Store ResRef")).toHaveValue("custom_store_008");
    fireEvent.click(within(wizard).getByRole("button", { name: /create store/i }));

    await waitFor(() => expect(onCreateStore).toHaveBeenCalledTimes(1));
    expect(onCreateStore.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        resRef: "custom_store_008",
        overwrite: false
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /new store/i }));
    wizard = screen.getByRole("form", { name: /store creation wizard/i });
    fireEvent.click(within(wizard).getByLabelText("Overwrite existing store ResRef"));
    fireEvent.click(within(wizard).getByRole("button", { name: /create store/i }));

    await waitFor(() => expect(onCreateStore).toHaveBeenCalledTimes(2));
    expect(onCreateStore.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        resRef: "custom_store_007",
        overwrite: true
      })
    );
  });

  it("edits a retail/source store as a module shadow-copy instead of PUTing a missing module file", async () => {
    const template = buildItemTemplate();
    const retailStore = {
      templateId: "str_retail_magic_shop",
      resref: "retail_magic",
      name: "Retail Magic Shop",
      category: "retail",
      tags: ["retail"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "retail_magic",
        localizedName: "Retail Magic Shop",
        tag: "RETAIL_MAGIC",
        markUp: 115
      }
    };
    const onCreateStore = vi.fn();
    const onUpdateStore = vi.fn();
    const onDeleteStore = vi.fn();

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        onCreateStore={onCreateStore}
        onUpdateStore={onUpdateStore}
        onDeleteStore={onDeleteStore}
        stores={[retailStore]}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    const storesSection = screen.getByRole("region", { name: /store blueprints/i });
    expect(within(storesSection).getByText("SOURCE UTM")).toHaveAttribute(
      "title",
      expect.stringContaining("module shadow copy")
    );
    expect(within(storesSection).getByRole("button", { name: /delete store retail_magic/i })).toBeDisabled();

    fireEvent.click(within(storesSection).getByRole("button", { name: /edit store retail_magic/i }));
    const wizard = screen.getByRole("form", { name: /store creation wizard/i });
    expect(within(wizard).getByLabelText("Store ResRef")).toHaveValue("retail_magic");

    fireEvent.change(within(wizard).getByLabelText("Store Name"), {
      target: { value: "Shadow Magic Shop" }
    });
    fireEvent.click(within(wizard).getByRole("button", { name: /update store/i }));

    await waitFor(() => expect(onCreateStore).toHaveBeenCalledTimes(1));
    expect(onUpdateStore).not.toHaveBeenCalled();
    expect(onCreateStore).toHaveBeenCalledWith(
      expect.objectContaining({
        resRef: "retail_magic",
        name: "Shadow Magic Shop",
        overwrite: true
      })
    );
  });

  it("edits, duplicates, and deletes existing UTM store blueprints", async () => {
    const template = buildItemTemplate();
    const existingStore = {
      templateId: "str_existing_store",
      resref: "existing_store",
      name: "Existing Store",
      category: "custom",
      tags: ["custom", "wizard"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "existing_store",
        localizedName: "Existing Potion Store",
        tag: "EXISTING_STORE",
        markUp: 140,
        markDown: 35,
        storeListEntries: JSON.stringify([
          {
            bucketIndex: 0,
            bucketTypeId: 0,
            itemListEntries: [
              {
                resRef: "nw_it_mpotion021",
                randomResRef: "rnd_potion",
                randomList: "rl_potions",
                x: 2,
                y: 3,
                infinite: true
              },
              {
                embeddedItem: {
                  sourceStructTypeId: 4294967295,
                  templateResRef: "emb_store_ring",
                  tag: "EMB_STORE_RING",
                  localizedName: "Embedded Ring",
                  baseItem: 52,
                  itemPropertyListCount: 1,
                  fieldCount: 5
                },
                x: 4,
                y: 5,
                infinite: true
              }
            ]
          }
        ]),
        willOnlyBuyBaseItems: JSON.stringify([5])
      }
    };
    const onCreateStore = vi.fn();
    const onUpdateStore = vi.fn();
    const onDeleteStore = vi.fn();

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        onCreateStore={onCreateStore}
        onUpdateStore={onUpdateStore}
        onDeleteStore={onDeleteStore}
        stores={[existingStore]}
        isLoading={false}
        loadErrorMessage={null}
        storeCreateSequence={6}
      />
    );

    const storesSection = screen.getByRole("region", { name: /store blueprints/i });
    expect(within(storesSection).getByText("Existing Store")).toBeInTheDocument();
    expect(within(storesSection).getByText("MODULE UTM")).toHaveAttribute(
      "title",
      expect.stringContaining("edited")
    );

    fireEvent.click(within(storesSection).getByRole("button", { name: /edit store existing_store/i }));
    let wizard = screen.getByRole("form", { name: /store creation wizard/i });
    expect(within(wizard).getByLabelText("Store Name")).toHaveValue("Existing Potion Store");
    expect(within(wizard).getByLabelText("Store ResRef")).toHaveValue("existing_store");
    expect(within(wizard).getByLabelText("Store ResRef")).toBeDisabled();
    expect(within(wizard).getByLabelText("Mark Up")).toHaveValue(140);
    expect(within(wizard).getByLabelText("Bucket 1 item 1 resref")).toHaveValue(
      "nw_it_mpotion021"
    );
    expect(within(wizard).getByLabelText("Bucket 1 item 1 random resref")).toHaveValue(
      "rnd_potion"
    );
    expect(within(wizard).getByLabelText("Bucket 1 item 1 random list")).toHaveValue(
      "rl_potions"
    );
    expect(within(wizard).getByLabelText("Bucket 1 item 1 infinite")).toBeChecked();
    expect(
      within(wizard).getByText("Embedded emb_store_ring (Embedded Ring, Base 52, 1 props)")
    ).toBeInTheDocument();

    fireEvent.change(within(wizard).getByLabelText("Store Name"), {
      target: { value: "Updated Potion Store" }
    });
    fireEvent.change(within(wizard).getByLabelText("Mark Up"), {
      target: { value: "160" }
    });
    fireEvent.click(within(wizard).getByRole("button", { name: /update store/i }));

    await waitFor(() => expect(onUpdateStore).toHaveBeenCalledTimes(1));
    expect(onUpdateStore).toHaveBeenCalledWith(
      "existing_store",
      expect.objectContaining({
        resRef: "existing_store",
        name: "Updated Potion Store",
        markUp: 160,
        overwrite: true,
        willOnlyBuyBaseItems: [5],
        storeListEntries: expect.arrayContaining([
          expect.objectContaining({
            bucketTypeId: 0,
            itemListEntries: expect.arrayContaining([
              expect.objectContaining({
                resRef: "nw_it_mpotion021",
                randomResRef: "rnd_potion",
                randomList: "rl_potions",
                x: 2,
                y: 3,
                infinite: true
              }),
              expect.objectContaining({
                embeddedItem: expect.objectContaining({
                  sourceStructTypeId: 4294967295,
                  templateResRef: "emb_store_ring",
                  tag: "EMB_STORE_RING",
                  localizedName: "Embedded Ring",
                  baseItem: 52
                }),
                x: 4,
                y: 5,
                infinite: true
              })
            ])
          })
        ])
      })
    );

    fireEvent.click(
      within(storesSection).getByRole("button", { name: /duplicate store existing_store/i })
    );
    wizard = screen.getByRole("form", { name: /store creation wizard/i });
    expect(within(wizard).getByLabelText("Store Name")).toHaveValue(
      "Existing Potion Store Copy"
    );
    expect(within(wizard).getByLabelText("Store ResRef")).toHaveValue("existing_sto_006");
    fireEvent.click(within(wizard).getByRole("button", { name: /cancel/i }));

    fireEvent.click(
      within(storesSection).getByRole("button", { name: /delete store existing_store/i })
    );

    expect(onDeleteStore).toHaveBeenCalledTimes(1);
    expect(onDeleteStore).toHaveBeenCalledWith(existingStore);
  });

  it("filters store blueprints by resref before store actions", () => {
    const template = buildItemTemplate();
    const hiddenStore = {
      templateId: "str_hidden_store",
      resref: "hidden_store",
      name: "Hidden Store",
      category: "custom",
      tags: ["custom"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "hidden_store",
        localizedName: "Hidden Store",
        tag: "HIDDEN_STORE"
      }
    };
    const proofStore = {
      templateId: "str_proof_store",
      resref: "proof_store",
      name: "Proof Store",
      category: "custom",
      tags: ["custom", "wizard"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "proof_store",
        localizedName: "Proof Store",
        tag: "PROOF_STORE"
      }
    };

    render(
      <ItemsModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={393}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        onCreateStore={vi.fn()}
        onUpdateStore={vi.fn()}
        onDeleteStore={vi.fn()}
        stores={[hiddenStore, proofStore]}
        isLoading={false}
        loadErrorMessage={null}
      />
    );

    const storesSection = screen.getByRole("region", { name: /store blueprints/i });
    fireEvent.change(within(storesSection).getByLabelText("Filter stores"), {
      target: { value: "proof_store" }
    });

    expect(within(storesSection).getByText("Proof Store")).toBeInTheDocument();
    expect(within(storesSection).queryByText("Hidden Store")).not.toBeInTheDocument();
    expect(within(storesSection).getByText("1/2")).toBeInTheDocument();
  });

  it("filters loaded items by Aurora ITP palette branch", () => {
    const armor = buildItemTemplate();
    const dagger = buildItemTemplate({
      id: "itm_template_item_cnr_b_dagger",
      name: "Bronze Dagger",
      resRef: "cnr_b_dagger",
      tag: "CNR_B_DAGGER",
      itemProperties: {
        baseItem: 22,
        baseItemLabel: "Dagger",
        baseItemModelType: "WSwDg",
        modelPart1: 11,
        modelPart2: 13,
        modelPart3: 63,
        modelParts: [11, 13, 63]
      }
    });

    render(
      <ItemsModePanel
        objects={[armor, dagger]}
        creationBaseObjects={[armor, dagger]}
        total={2}
        activeObjectId={armor.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
        paletteTree={{
          generatedAt: "2026-06-30T00:00:00.000Z",
          activeSource: "itempalstd",
          sources: [],
          rootCount: 1,
          leafCount: 2,
          folderCount: 2,
          categoryLeafCount: 0,
          maxDepth: 2,
          roots: [
            {
              nodeId: "0",
              kind: "folder",
              depth: 0,
              label: "Standard Items",
              strRef: 335,
              leafCount: 2,
              folderCount: 2,
              categoryLeafCount: 0,
              children: [
                {
                  nodeId: "0/0",
                  kind: "folder",
                  depth: 1,
                  label: "Armor",
                  strRef: 1001,
                  leafCount: 1,
                  folderCount: 1,
                  categoryLeafCount: 0,
                  children: [
                    {
                      nodeId: "0/0/0",
                      kind: "leaf",
                      depth: 2,
                      label: "nw_maarcl009",
                      strRef: 12928,
                      resRef: "nw_maarcl009",
                      leafCount: 1,
                      folderCount: 0,
                      categoryLeafCount: 0,
                      children: []
                    }
                  ]
                },
                {
                  nodeId: "0/1",
                  kind: "leaf",
                  depth: 1,
                  label: "cnr_b_dagger",
                  strRef: 2001,
                  resRef: "cnr_b_dagger",
                  leafCount: 1,
                  folderCount: 0,
                  categoryLeafCount: 0,
                  children: []
                }
              ]
            }
          ]
        }}
      />
    );

    fireEvent.change(screen.getByLabelText("Item palette category"), {
      target: { value: "0/0" }
    });

    expect(screen.getByTitle("Filtered loaded items / total items")).toHaveTextContent("1/2");
    expect(screen.getByText("NW_MAARCL009")).toBeInTheDocument();
    expect(screen.queryByText("CNR_B_DAGGER")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reset items filters/i }));

    expect(screen.getByTitle("Total items")).toHaveTextContent("2");
    expect(screen.getByText("CNR_B_DAGGER")).toBeInTheDocument();
  });

  it("builds a custom itempalcus palette payload from filtered items", () => {
    const armor = buildItemTemplate({
      itemProperties: {
        ...buildItemTemplate().itemProperties,
        baseItemStorePanel: 0
      }
    });
    const dagger = buildItemTemplate({
      id: "itm_template_item_cnr_b_dagger",
      name: "Bronze Dagger",
      resRef: "cnr_b_dagger",
      tag: "CNR_B_DAGGER",
      itemProperties: {
        baseItem: 22,
        baseItemLabel: "Dagger",
        baseItemModelType: "WSwDg",
        baseItemStorePanel: 1,
        modelPart1: 11,
        modelPart2: 13,
        modelPart3: 63,
        modelParts: [11, 13, 63]
      }
    });
    const onWriteCustomPalette = vi.fn();

    render(
      <ItemsModePanel
        objects={[armor, dagger]}
        creationBaseObjects={[armor, dagger]}
        total={2}
        activeObjectId={armor.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateItem={vi.fn()}
        onWriteCustomPalette={onWriteCustomPalette}
        isLoading={false}
        loadErrorMessage={null}
        paletteTree={{
          generatedAt: "2026-06-30T00:00:00.000Z",
          activeSource: "itempalstd",
          sources: [],
          rootCount: 1,
          leafCount: 2,
          folderCount: 1,
          categoryLeafCount: 0,
          maxDepth: 1,
          roots: [
            {
              nodeId: "0",
              kind: "folder",
              depth: 0,
              label: "All",
              leafCount: 2,
              folderCount: 1,
              categoryLeafCount: 0,
              children: [
                {
                  nodeId: "0/0",
                  kind: "leaf",
                  depth: 1,
                  label: "nw_maarcl009",
                  resRef: "nw_maarcl009",
                  leafCount: 1,
                  folderCount: 0,
                  categoryLeafCount: 0,
                  children: []
                },
                {
                  nodeId: "0/1",
                  kind: "leaf",
                  depth: 1,
                  label: "cnr_b_dagger",
                  resRef: "cnr_b_dagger",
                  leafCount: 1,
                  folderCount: 0,
                  categoryLeafCount: 0,
                  children: []
                }
              ]
            }
          ]
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /write custom item palette/i }));

    expect(onWriteCustomPalette).toHaveBeenCalledWith({
      roots: [
        {
          label: "Custom Items",
          children: [
            {
              label: "Armor",
              children: [{ label: "Hide Armor", resRef: "nw_maarcl009" }]
            },
            {
              label: "Weapons",
              children: [{ label: "Bronze Dagger", resRef: "cnr_b_dagger" }]
            }
          ]
        }
      ]
    });
  });
});
