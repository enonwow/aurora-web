import type { AreaRecord } from "../../src/modules/areas/domain/area.types";
import {
  AREA_PROCESS_CACHE_KEY_VERSION,
  buildAreaProcessCacheKey,
  countAreaObjectsByKind
} from "../../src/modules/areas/domain/area-processing.builders";

describe("area-processing.builders", () => {
  it("counts area object kinds", () => {
    expect(
      countAreaObjectsByKind([
        buildAreaObject({ kind: "placeable" }),
        buildAreaObject({ kind: "door" }),
        buildAreaObject({ kind: "creature" }),
        buildAreaObject({ kind: "encounter" }),
        buildAreaObject({ kind: "item" }),
        buildAreaObject({ kind: "sound" }),
        buildAreaObject({ kind: "store" }),
        buildAreaObject({ kind: "trigger" }),
        buildAreaObject({ kind: "waypoint" })
      ])
    ).toEqual({
      placeables: 1,
      doors: 1,
      creatures: 1,
      encounters: 1,
      items: 1,
      sounds: 1,
      stores: 1,
      triggers: 1,
      waypoints: 1,
      total: 9
    });
  });

  it("uses object localized text in the process cache key", () => {
    const area = buildAreaRecord({
      objects: [
        buildAreaObject({
          tag: "QFoodBins",
          localizedName: "[W] Balustrada",
          description: "[Q]Pallet, Empty"
        })
      ]
    });
    const relabeledArea = buildAreaRecord({
      objects: [
        buildAreaObject({
          tag: "QFoodBins",
          localizedName: "[W] Balustrada",
          description: "[Q]Fence 1, Long (open end)"
        })
      ]
    });

    expect(AREA_PROCESS_CACHE_KEY_VERSION).toBe(
      "area-process/v39-item-base-appearance"
    );
    expect(buildAreaProcessCacheKey(area)).toMatch(/^[a-f0-9]{64}$/u);
    expect(buildAreaProcessCacheKey(area)).not.toBe(buildAreaProcessCacheKey(relabeledArea));
  });

  it("uses exact ordered ground-Item PropertiesList provenance in the process cache key", () => {
    const build = (costValue: number) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "item",
        itemPropertyList: {
          present: true,
          expectedEntries: [{
            sourceIndex: 0,
            propertyName: 1,
            subtype: 0xffff,
            costTable: 2,
            costValue,
            param1: 0xff,
            param1Value: 0,
            chanceAppear: 100,
          }],
        },
      })],
    });
    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "item" })] });

    expect(buildAreaProcessCacheKey(build(3))).not.toBe(buildAreaProcessCacheKey(build(4)));
    expect(buildAreaProcessCacheKey(build(3))).not.toBe(buildAreaProcessCacheKey(absent));
  });

  it("uses the effective baseitems.2da identity and Item BaseItem/appearance provenance in the cache key", () => {
    const build = (catalogSha256: string, modelPart1: number) => buildAreaRecord({
      itemBaseItemCatalog: {
        descriptor: {
          resourceName: "baseitems.2da",
          sourceObjectKey: "modules/current/baseitems.2da",
          sourceLayer: "module",
          sha256: catalogSha256,
          sizeBytes: 128,
          rowCount: 1,
        },
        rows: [{ rowIndex: 0, modelType: 0, displayName: "Base item zero" }],
      },
      objects: [buildAreaObject({
        kind: "item",
        itemBaseAppearance: {
          expectedValue: {
            baseItem: 0,
            modelType: 0,
            appearance: { modelPart1 },
          },
          tableSha256: catalogSha256,
          tableRowCount: 1,
        },
      })],
    });
    const baseline = build("a".repeat(64), 66);

    expect(buildAreaProcessCacheKey(baseline)).not.toBe(
      buildAreaProcessCacheKey(build("b".repeat(64), 66)),
    );
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(
      buildAreaProcessCacheKey(build("a".repeat(64), 67)),
    );
  });

  it("uses exact Area advanced flags in the process cache key", () => {
    const baseline = buildAreaRecord({
      advancedFlags: {
        terrainType: { interior: false, natural: true, subterranean: false },
        playerVsPlayer: 0,
        noRest: false,
        listenCheckModifier: -8,
        spotCheckModifier: 11,
        loadingScreenId: 0,
      },
    });
    const changed = buildAreaRecord({
      advancedFlags: {
        terrainType: { interior: true, natural: false, subterranean: true },
        playerVsPlayer: 3,
        noRest: true,
        listenCheckModifier: 9,
        spotCheckModifier: -12,
        loadingScreenId: 0xffff,
      },
    });
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(changed));
  });

  it.each([
    ["listenCheckModifier", -8, 9],
    ["spotCheckModifier", 11, -12],
  ] as const)("invalidates the process cache when %s changes", (field, before, after) => {
    const build = (value: number) => buildAreaRecord({
      advancedFlags: { [field]: value },
    });
    expect(buildAreaProcessCacheKey(build(before))).not.toBe(
      buildAreaProcessCacheKey(build(after)),
    );
  });

  it("invalidates the process cache when the exact loading-screen Word changes", () => {
    const build = (loadingScreenId: number) => buildAreaRecord({
      advancedFlags: { loadingScreenId },
    });
    expect(buildAreaProcessCacheKey(build(0))).not.toBe(buildAreaProcessCacheKey(build(0xffff)));
  });

  it("invalidates the process cache for the exact module Start Location and IFO provenance", () => {
    const source = buildAreaRecord({
      moduleStartLocation: {
        areaResRef: "area_test_001",
        x: Math.fround(1),
        y: Math.fround(2),
        z: Math.fround(3),
        directionX: Math.fround(0),
        directionY: Math.fround(1),
      },
      sourceResources: {
        areSha256: "a".repeat(64),
        ifoSha256: "b".repeat(64),
      },
      moduleStartLocationTargets: ["area_test_001", "other_area"],
    });
    const moved = buildAreaRecord({
      ...source,
      moduleStartLocation: { ...source.moduleStartLocation!, x: Math.fround(12.5) },
    });
    const repackedIfo = buildAreaRecord({
      ...source,
      sourceResources: { ...source.sourceResources!, ifoSha256: "c".repeat(64) },
    });
    const changedTargets = buildAreaRecord({
      ...source,
      moduleStartLocationTargets: ["area_test_001", "third_area"],
    });

    expect(buildAreaProcessCacheKey(source)).not.toBe(buildAreaProcessCacheKey(moved));
    expect(buildAreaProcessCacheKey(source)).not.toBe(buildAreaProcessCacheKey(repackedIfo));
    expect(buildAreaProcessCacheKey(source)).not.toBe(buildAreaProcessCacheKey(changedTargets));
  });

  it("invalidates the process cache for each exact Area audio-environment value", () => {
    const source = buildAreaRecord({
      audioEnvironment: {
        ambientSoundDayId: 41,
        ambientSoundNightId: 42,
        ambientSoundDayVolume: 101,
        ambientSoundNightVolume: 102,
        environmentAudioId: 7,
        musicBattleId: 13,
        musicDayId: 11,
        musicNightId: 12,
        musicDelayMilliseconds: 3000,
      },
    });
    const changed = buildAreaRecord({
      ...source,
      audioEnvironment: { ...source.audioEnvironment!, musicDelayMilliseconds: 4000 },
    });

    expect(buildAreaProcessCacheKey(source)).not.toBe(buildAreaProcessCacheKey(changed));
  });

  it("invalidates the process cache for each exact Area visual-environment value", () => {
    const source = buildAreaRecord({
      visualEnvironment: {
        dayNightMode: "cycle",
        shadowOpacity: 50,
        chanceRain: 20,
        chanceSnow: 0,
        chanceLightning: 35,
        sun: { ambientColor: 0x112233, diffuseColor: 0x445566, fogColor: 0x778899, fogAmount: 7, shadows: true },
        moon: { ambientColor: 0xaabbcc, diffuseColor: 0xddeeff, fogColor: 0x010203, fogAmount: 15, shadows: false },
      },
    });
    const changed = buildAreaRecord({
      ...source,
      visualEnvironment: {
        ...source.visualEnvironment!,
        sun: { ...source.visualEnvironment!.sun, fogAmount: 8 },
      },
    });
    expect(buildAreaProcessCacheKey(source)).not.toBe(buildAreaProcessCacheKey(changed));
  });

  it("invalidates the process cache for effective Area audio catalog identity and labels", () => {
    const catalog = (sha256: string, displayName: string) => ({
      schemaVersion: "area-audio-environment-catalogs.v1" as const,
      ambientSound: audioCatalog("ambientsound.2da" as const, sha256, displayName),
      ambientMusic: audioCatalog("ambientmusic.2da" as const, "b".repeat(64), "Music"),
      environmentalAudio: audioCatalog("soundeax.2da" as const, "c".repeat(64), "EAX"),
    });
    const baseline = buildAreaRecord({ audioEnvironmentCatalogs: catalog("a".repeat(64), "Sound") });
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(
      buildAreaRecord({ audioEnvironmentCatalogs: catalog("d".repeat(64), "Sound") }),
    ));
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(
      buildAreaRecord({ audioEnvironmentCatalogs: catalog("a".repeat(64), "Relabeled") }),
    ));
  });

  it("invalidates the process cache for effective Area loading-screen catalog identity and labels", () => {
    const baseline = buildAreaRecord({
      loadingScreenCatalog: loadingScreenCatalog("a".repeat(64), "Default"),
    });

    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(
      buildAreaRecord({
        loadingScreenCatalog: loadingScreenCatalog("d".repeat(64), "Default"),
      }),
    ));
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(
      buildAreaRecord({
        loadingScreenCatalog: loadingScreenCatalog("a".repeat(64), "Localized default"),
      }),
    ));
  });

  it("invalidates the process cache for effective Area visual catalog identity and row targets", () => {
    const baseline = buildAreaRecord({
      visualEnvironmentCatalogs: visualEnvironmentCatalog("a".repeat(64), 45),
    });

    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(
      buildAreaRecord({
        visualEnvironmentCatalogs: visualEnvironmentCatalog("b".repeat(64), 45),
      }),
    ));
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(
      buildAreaRecord({
        visualEnvironmentCatalogs: visualEnvironmentCatalog("a".repeat(64), 120),
      }),
    ));
  });

  it("invalidates the process cache for the exact retained visual catalog selection", () => {
    const baseline = buildAreaRecord({
      visualEnvironmentCatalogSelection: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
    });
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(
      buildAreaRecord({
        visualEnvironmentCatalogSelection: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 0 },
      }),
    ));
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(
      buildAreaRecord({
        visualEnvironmentCatalogSelection: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 1 },
      }),
    ));
  });

  it("uses exact Placeable localized-string storage in the process cache key", () => {
    const buildLocalizedArea = (languageId: number, textBytesBase64: string) =>
      buildAreaRecord({
        objects: [buildAreaObject({
          placeableLocalizedStrings: {
            locName: {
              present: true,
              strRef: 0xffff_ffff,
              entries: [{ languageId, textBytesBase64 }],
            },
            description: { present: false },
          },
        })],
      });

    const baseline = buildLocalizedArea(0, "Q2hlc3Q=");
    const absentKey = buildAreaProcessCacheKey(
      buildAreaRecord({ objects: [buildAreaObject()] }),
    );
    expect(absentKey).toBe("5ddaff9fe17b69652f4de80039a78e7d2da4e3d20f5f9bb0c4774e79ea2b1327");
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(absentKey);
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(
      buildAreaProcessCacheKey(buildLocalizedArea(1, "Q2hlc3Q=")),
    );
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(
      buildAreaProcessCacheKey(buildLocalizedArea(0, "Q3JhdGU=")),
    );
  });

  it("uses exact Creature FirstName/LastName storage in the process cache key", () => {
    const buildLocalizedArea = (languageId: number, textBytesBase64: string) =>
      buildAreaRecord({
        objects: [buildAreaObject({
          kind: "creature",
          creatureLocalizedStrings: {
            firstName: {
              present: true,
              strRef: 0xffff_ffff,
              entries: [{ languageId, textBytesBase64 }],
            },
            lastName: { present: false },
          },
        })],
      });

    const baseline = buildLocalizedArea(0, "R3VhcmQ=");
    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "creature" })] });
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(
      buildAreaProcessCacheKey(buildLocalizedArea(1, "R3VhcmQ=")),
    );
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(
      buildAreaProcessCacheKey(buildLocalizedArea(0, "Q2FwdGFpbg==")),
    );
  });

  it("uses exact presence-sensitive Creature Conversation storage in the process cache key", () => {
    const buildConversationArea = (value: string) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureConversation: { present: true, value },
      })],
    });

    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "creature" })] });
    const presentEmpty = buildConversationArea("");
    const presentValue = buildConversationArea("Guard_Dialog");

    expect(buildAreaProcessCacheKey(presentEmpty)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(presentValue)).not.toBe(buildAreaProcessCacheKey(presentEmpty));
    expect(buildAreaProcessCacheKey(presentValue)).not.toBe(
      buildAreaProcessCacheKey(buildConversationArea("guard_dialog")),
    );
  });

  it("uses exact presence-sensitive Creature Interruptable storage in the process cache key", () => {
    const buildInterruptableArea = (value: 0 | 1) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureInterruptable: { present: true, value },
      })],
    });

    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "creature" })] });
    const zero = buildInterruptableArea(0);
    const one = buildInterruptableArea(1);

    expect(buildAreaProcessCacheKey(zero)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(one)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(zero)).not.toBe(buildAreaProcessCacheKey(one));
  });

  it("uses exact presence-sensitive Creature FactionID Word storage in the process cache key", () => {
    const buildFactionArea = (value: number) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureFaction: { present: true, nativeType: "word", value },
      })],
    });

    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "creature" })] });
    const hostile = buildFactionArea(1);
    const defender = buildFactionArea(4);

    expect(buildAreaProcessCacheKey(hostile)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(defender)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(hostile)).not.toBe(buildAreaProcessCacheKey(defender));
  });

  it("uses exact presence-sensitive Creature TemplateResRef storage in the process cache key", () => {
    const buildTemplateArea = (value: string) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureTemplateResRef: { present: true, nativeType: "resref", value },
      })],
    });

    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "creature" })] });
    const guard = buildTemplateArea("nw_guard");
    const alternate = buildTemplateArea("nw_guard_alt");

    expect(buildAreaProcessCacheKey(guard)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(alternate)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(guard)).not.toBe(buildAreaProcessCacheKey(alternate));
  });

  it("uses exact presence-sensitive Creature Subrace/Deity storage in the process cache key", () => {
    const buildSpecialIdentityArea = (subrace: string, deity: string) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureSpecialIdentityStrings: {
          subrace: { present: true, nativeType: "cexostring", value: subrace },
          deity: { present: true, nativeType: "cexostring", value: deity },
        },
      })],
    });

    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "creature" })] });
    const moonElf = buildSpecialIdentityArea("Moon Elf", "Mystra");
    const sunElf = buildSpecialIdentityArea("Sun Elf", "Mystra");
    const selune = buildSpecialIdentityArea("Moon Elf", "Selune");

    expect(buildAreaProcessCacheKey(moonElf)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(moonElf)).not.toBe(buildAreaProcessCacheKey(sunElf));
    expect(buildAreaProcessCacheKey(moonElf)).not.toBe(buildAreaProcessCacheKey(selune));
  });

  it("uses exact presence-sensitive Creature script ResRefs in the process cache key", () => {
    const buildScriptArea = (onSpawn: string) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureScriptResRefs: {
          onHeartbeat: { present: false },
          onPerception: { present: false },
          onSpellCastAt: { present: false },
          onPhysicalAttacked: { present: false },
          onDamaged: { present: false },
          onDisturbed: { present: false },
          onCombatRoundEnd: { present: false },
          onConversation: { present: false },
          onSpawn: { present: true, nativeType: "resref", value: onSpawn },
          onRested: { present: false },
          onDeath: { present: false },
          onUserDefined: { present: false },
          onBlocked: { present: false },
        },
      })],
    });

    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "creature" })] });
    const baseline = buildScriptArea("nw_c2_default9");
    const changed = buildScriptArea("main");

    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(changed)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(baseline)).not.toBe(buildAreaProcessCacheKey(changed));
  });

  it("uses exact bound Creature Gender storage in the process cache key", () => {
    const buildGenderArea = (value: number, sha256: string) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureGender: {
          present: true,
          nativeType: "byte",
          value,
          table: {
            resourceName: "gender.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/gender.2da",
            sourceLayer: "vanilla",
            sha256,
            sizeBytes: 250,
            rowCount: 5,
            rowIndex: value,
          },
        },
      })],
    });
    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "creature" })] });
    const none = buildGenderArea(4, "a".repeat(64));
    const male = buildGenderArea(0, "a".repeat(64));
    const tableChanged = buildGenderArea(4, "b".repeat(64));

    expect(buildAreaProcessCacheKey(none)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(none)).not.toBe(buildAreaProcessCacheKey(male));
    expect(buildAreaProcessCacheKey(none)).not.toBe(buildAreaProcessCacheKey(tableChanged));
  });

  it("uses exact bound Creature PortraitId storage in the process cache key", () => {
    const buildPortraitArea = (value: number, sha256: string) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creaturePortrait: {
          present: true,
          nativeType: "word",
          value,
          selectorContext: { genderValue: 0, raceValue: 4 },
          table: {
            resourceName: "portraits.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
            sourceLayer: "vanilla",
            sha256,
            sizeBytes: 100_000,
            rowCount: 16_001,
            rowIndex: value,
            baseResRef: value === 10 ? "po_hm_guard" : "po_em_guard",
          },
        },
      })],
    });
    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "creature" })] });
    const human = buildPortraitArea(10, "a".repeat(64));
    const elf = buildPortraitArea(11, "a".repeat(64));
    const tableChanged = buildPortraitArea(10, "b".repeat(64));

    expect(buildAreaProcessCacheKey(human)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(human)).not.toBe(buildAreaProcessCacheKey(elf));
    expect(buildAreaProcessCacheKey(human)).not.toBe(buildAreaProcessCacheKey(tableChanged));
  });

  it("uses exact Creature ChallengeRating Float storage in the process cache key", () => {
    const buildChallengeRatingArea = (value: number) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureChallengeRating: {
          present: true,
          nativeType: "float",
          value,
        },
      })],
    });

    expect(buildAreaProcessCacheKey(buildChallengeRatingArea(11))).not.toBe(
      buildAreaProcessCacheKey(buildChallengeRatingArea(11.5)),
    );
  });

  it("uses exact presence-sensitive Creature NaturalAC Byte storage in the process cache key", () => {
    const buildNaturalArmorClassArea = (value: number) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureNaturalArmorClass: {
          present: true,
          nativeType: "byte",
          value,
        },
      })],
    });

    expect(buildAreaProcessCacheKey(buildNaturalArmorClassArea(0))).not.toBe(
      buildAreaProcessCacheKey(buildNaturalArmorClassArea(2)),
    );
  });

  it("uses exact Creature saving-throw Short provenance in the process cache key", () => {
    const buildSavingThrowArea = (value: number) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureSavingThrowBonuses: {
          fortitude: { present: true, nativeType: "short", value },
          reflex: { present: false },
          will: { present: false },
        },
      })],
    });
    expect(buildAreaProcessCacheKey(buildSavingThrowArea(3)))
      .not.toBe(buildAreaProcessCacheKey(buildSavingThrowArea(4)));
  });

  it("uses exact coupled Creature alignment provenance in the process cache key", () => {
    const buildAlignmentArea = (goodEvil: 0 | 50 | 100) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureAlignment: {
          goodEvil: { present: true, nativeType: "byte", value: goodEvil },
          lawfulChaotic: { present: true, nativeType: "byte", value: 50 },
        },
      })],
    });
    expect(buildAreaProcessCacheKey(buildAlignmentArea(0)))
      .not.toBe(buildAreaProcessCacheKey(buildAlignmentArea(100)));
  });

  it("uses exact presence-sensitive Creature ability-score storage in the process cache key", () => {
    const buildAbilityScoreArea = (strength: number) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureAbilityScores: {
          strength: { present: true, nativeType: "byte", value: strength },
          dexterity: { present: true, nativeType: "byte", value: 13 },
          constitution: { present: true, nativeType: "byte", value: 16 },
          intelligence: { present: true, nativeType: "byte", value: 10 },
          wisdom: { present: true, nativeType: "byte", value: 12 },
          charisma: { present: true, nativeType: "byte", value: 8 },
        },
      })],
    });

    expect(buildAreaProcessCacheKey(buildAbilityScoreArea(15))).not.toBe(
      buildAreaProcessCacheKey(buildAbilityScoreArea(17)),
    );
  });

  it("uses exact presence-sensitive Creature appearance-color storage in the process cache key", () => {
    const buildAppearanceColorArea = (skin: number) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureAppearanceColors: {
          skin: { present: true, nativeType: "byte", value: skin },
          hair: { present: true, nativeType: "byte", value: 22 },
          tattoo1: { present: false },
          tattoo2: { present: true, nativeType: "byte", value: 44 },
        },
      })],
    });

    expect(buildAreaProcessCacheKey(buildAppearanceColorArea(11))).not.toBe(
      buildAreaProcessCacheKey(buildAppearanceColorArea(12)),
    );
  });

  it("uses exact Creature body-part compatibility storage in the process cache key", () => {
    const absentMembers = Object.fromEntries([
      "rightFoot", "leftFoot", "rightShin", "leftShin", "leftThigh", "rightThigh",
      "pelvis", "torso", "belt", "neck", "rightForearm", "leftForearm",
      "rightBicep", "leftBicep", "rightShoulder", "leftShoulder", "rightHand",
      "leftHand", "head",
    ].map((key) => [key, { present: false }])) as never;
    const buildBodyPartArea = (value: number) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureBodyParts: {
          ...absentMembers,
          leftFoot: {
            present: true,
            value,
            legacyByte: { present: true, nativeType: "byte", value: value <= 255 ? value : 0 },
            wideWord: { present: true, nativeType: "word", value },
          },
        },
      })],
    });

    expect(buildAreaProcessCacheKey(buildBodyPartArea(23))).not.toBe(
      buildAreaProcessCacheKey(buildBodyPartArea(4096)),
    );
  });

  it("uses exact presence-sensitive Creature advanced flag storage in the process cache key", () => {
    const buildAdvancedFlagsArea = (plot: 0 | 1) => buildAreaRecord({
      objects: [buildAreaObject({
        kind: "creature",
        creatureAdvancedFlags: {
          disarmable: { present: true, value: 1 },
          plot: { present: true, value: plot },
          immortal: { present: false },
          lootable: { present: true, value: 0 },
          noPermanentDeath: { present: false },
        },
      })],
    });

    const absent = buildAreaRecord({ objects: [buildAreaObject({ kind: "creature" })] });
    const zero = buildAdvancedFlagsArea(0);
    const one = buildAdvancedFlagsArea(1);

    expect(buildAreaProcessCacheKey(zero)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(one)).not.toBe(buildAreaProcessCacheKey(absent));
    expect(buildAreaProcessCacheKey(zero)).not.toBe(buildAreaProcessCacheKey(one));
  });

  it("uses area tile light flags in the process cache key", () => {
    const area = buildAreaRecord({
      tiles: [
        buildAreaTile({
          mainLight1: 3,
          mainLight2: 4,
          sourceLight1: 5,
          sourceLight2: 6,
          animLoop1: 1,
          animLoop2: 0,
          animLoop3: 1
        })
      ]
    });
    const relitArea = buildAreaRecord({
      tiles: [
        buildAreaTile({
          mainLight1: 9,
          mainLight2: 4,
          sourceLight1: 5,
          sourceLight2: 6,
          animLoop1: 1,
          animLoop2: 0,
          animLoop3: 1
        })
      ]
    });

    expect(buildAreaProcessCacheKey(area)).toMatch(/^[a-f0-9]{64}$/u);
    expect(buildAreaProcessCacheKey(area)).not.toBe(buildAreaProcessCacheKey(relitArea));
  });

  it("uses resolved area tile light colors in the process cache key", () => {
    const area = buildAreaRecord({
      tiles: [
        buildAreaTile({
          mainLight1: 3,
          mainLight1Color: {
            rowId: 3,
            red: 1,
            green: 0.75,
            blue: 0.25,
            sourceKey: "modules/current/__aurora/sources/vanilla/tilecolor.2da"
          }
        })
      ]
    });
    const recoloredArea = buildAreaRecord({
      tiles: [
        buildAreaTile({
          mainLight1: 3,
          mainLight1Color: {
            rowId: 3,
            red: 0.5,
            green: 0.5,
            blue: 1,
            sourceKey: "modules/current/__aurora/sources/vanilla/tilecolor.2da"
          }
        })
      ]
    });

    expect(buildAreaProcessCacheKey(area)).toMatch(/^[a-f0-9]{64}$/u);
    expect(buildAreaProcessCacheKey(area)).not.toBe(buildAreaProcessCacheKey(recoloredArea));
  });

  it("uses area global lighting fields in the process cache key", () => {
    const area = buildAreaRecord({
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "IsNight", value: 0 },
          { field: "SunShadows", value: 1 },
          { field: "MoonShadows", value: 0 },
          { field: "ShadowOpacity", value: 50 }
        ]
      }
    });
    const reshadedArea = buildAreaRecord({
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "IsNight", value: 1 },
          { field: "SunShadows", value: 1 },
          { field: "MoonShadows", value: 1 },
          { field: "ShadowOpacity", value: 25 }
        ]
      }
    });

    expect(buildAreaProcessCacheKey(area)).toMatch(/^[a-f0-9]{64}$/u);
    expect(buildAreaProcessCacheKey(area)).not.toBe(buildAreaProcessCacheKey(reshadedArea));
  });
});

function audioCatalog(
  resourceName: "ambientsound.2da" | "ambientmusic.2da" | "soundeax.2da",
  sha256: string,
  displayName: string,
): NonNullable<AreaRecord["audioEnvironmentCatalogs"]>["ambientSound"] {
  return {
    descriptor: {
      resourceName,
      sourceObjectKey: `module/${resourceName}`,
      sourceLayer: "module",
      sha256,
      sizeBytes: 64,
      rowCount: 1,
    },
    rows: [{
      rowIndex: 0,
      ...(resourceName === "ambientmusic.2da" ? { battleEligible: false } : {}),
      ...(resourceName === "soundeax.2da" ? { label: "EAX_GENERIC" } : {}),
      displayName,
      displaySource: resourceName === "soundeax.2da" ? "label" : "row_index",
    }],
  };
}

function loadingScreenCatalog(
  sha256: string,
  displayName: string,
): NonNullable<AreaRecord["loadingScreenCatalog"]> {
  return {
    schemaVersion: "area-loading-screen-catalog.v1",
    descriptor: {
      resourceName: "loadscreens.2da",
      sourceObjectKey: "modules/current/loadscreens.2da",
      sourceLayer: "module",
      sha256,
      sizeBytes: 96,
      rowCount: 1,
    },
    rows: [{
      rowIndex: 0,
      sourceRowId: 17,
      label: "UnusedRowZeroLabel",
      imageResRef: "ls_default",
      displayName,
      displaySource: "area_default_strref",
      toolsetSelectable: true,
      imageAsset: {
        resourceName: "ls_default.tga",
        sourceObjectKey: "modules/current/ls_default.tga",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 1024,
      },
    }],
  };
}

function visualEnvironmentCatalog(
  environmentSha256: string,
  fogClipDistance: number,
): NonNullable<AreaRecord["visualEnvironmentCatalogs"]> {
  return {
    schemaVersion: "area-visual-environment-catalogs.v1",
    lightingSchemes: {
      descriptor: {
        resourceName: "environment.2da",
        sourceObjectKey: "modules/current/environment.2da",
        sourceLayer: "module",
        sha256: environmentSha256,
        sizeBytes: 512,
        rowCount: 1,
      },
      rows: [{
        rowIndex: 0,
        displayName: "Exterior",
        displaySource: "label",
        visualEnvironment: {
          dayNightMode: "cycle",
          shadowOpacity: 50,
          chanceRain: 0,
          chanceSnow: 0,
          chanceLightning: 0,
          sun: {
            ambientColor: 0,
            diffuseColor: 0,
            fogColor: 0,
            fogAmount: 0,
            shadows: true,
          },
          moon: {
            ambientColor: 0,
            diffuseColor: 0,
            fogColor: 0,
            fogAmount: 0,
            shadows: true,
          },
        },
        visualEnvironmentScalarControls: { fogClipDistance, windPower: 0 },
        skyBoxRowIndex: 0,
      }],
    },
    skyBoxes: {
      descriptor: {
        resourceName: "skyboxes.2da",
        sourceObjectKey: "modules/current/skyboxes.2da",
        sourceLayer: "module",
        sha256: "c".repeat(64),
        sizeBytes: 128,
        rowCount: 1,
      },
      rows: [{ rowIndex: 0, displayName: "None", displaySource: "row_index" }],
    },
  };
}

function buildAreaRecord(overrides: Partial<AreaRecord> = {}): AreaRecord {
  return {
    areaId: "area_test_001",
    name: "Test Area",
    biome: "urban",
    width: 2,
    height: 2,
    tags: ["area", "urban"],
    benchmark: false,
    previewImageUrl: "/api/v1/areas/area_test_001/thumbnail",
    textureAtlasId: "atlas_urban_v1",
    textureAtlasObjectKey: "modules/current/areas/atlases/atlas_urban_v1.webp",
    textureAtlasContentType: "image/webp",
    textureAtlasSizeBytes: 1024,
    textureAtlasEtag: "atlas-urban-v1",
    textureAtlasFingerprint: "atlas-fingerprint",
    tileSet: "tno01",
    tiles: [],
    objects: [buildAreaObject()],
    soundscape: {
      bindingKeys: {
        areaKey: "GI_sound_area",
        randomKey: "GI_sound_rndm",
        positionalKey: "GI_sound_pos"
      },
      area: [],
      random: [],
      positional: []
    },
    updatedAt: "2026-06-27T00:00:00.000Z",
    ...overrides
  };
}

function buildAreaObject(
  overrides: Partial<AreaRecord["objects"][number]> = {}
): AreaRecord["objects"][number] {
  return {
    objectId: "obj_plc_qfoodbins",
    kind: "placeable",
    templateId: "plc_qfoodbins",
    resRef: "qfoodbins",
    tag: "QFoodBins",
    x: 1,
    y: 1,
    z: 0,
    bearing: 0,
    ...overrides
  };
}

function buildAreaTile(
  overrides: Partial<NonNullable<AreaRecord["tiles"]>[number]> = {}
): NonNullable<AreaRecord["tiles"]>[number] {
  return {
    tileInstanceId: "area_test_001:tile:0",
    areaId: "area_test_001",
    tilesetResRef: "tno01",
    row: 0,
    col: 0,
    tileIndex: 0,
    tileId: 101,
    modelResRef: "tno01_a01_01",
    modelSource: "set-tile-section",
    orientation: 1,
    source: "are-tile-list",
    ...overrides
  };
}
