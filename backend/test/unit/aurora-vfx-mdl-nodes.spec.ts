import {
  classifyAuroraGlbEmitterProxyBoundary,
  parseAuroraMdlVfxSource
} from "../../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("aurora MDL VFX source nodes", () => {
  it("preserves ASCII emitter nodes as domain contract with raw tokens, timelines, events, and references", () => {
    const result = parseAuroraMdlVfxSource(
      Buffer.from(
        [
          "newmodel fx_ascii",
          "beginmodelgeom fx_ascii",
          "node emitter emit_lightning",
          "  parent fx_ascii",
          "  position 0 1 2",
          "  positionkey 2",
          "    0.00 0 1 2",
          "    1.00 1 2 3",
          "  orientation 0 0 1 1.5708",
          "  orientationkey 2",
          "    0.00 0 0 1 1.5708",
          "    1.00 0 0 1 3.1416",
          "  scale 2",
          "  scalekey 2",
          "    0.00 2",
          "    1.00 3",
          "  update Lightning",
          "  render Billboard_to_World_Z",
          "  blend Lighten",
          "  texture fxpa_lightning",
          "  renderhint normalandspecmapped",
          "  customShaderVS fx_lightning_vs",
          "  customShaderFS fx_lightning_fs",
          "  customShaderGS fx_lightning_gs",
          "  transparency 1",
          "  twosided 1",
          "  twosidedtex 1",
          "  sample_framebuffer 2",
          "  volumetric 1",
          "  chunkName fx_lightning_chunk",
          "  xgrid 4",
          "  ygrid 2",
          "  fps 12",
          "  random 1",
          "  p2p 1",
          "  p2p_sel Lightning",
          "  lightningScale 1.5",
          "  lightningDelay 0.2",
          "  lightningRadius 0.75",
          "  birthratekey 3",
          "    0.00 0",
          "    0.25 12",
          "    1.00 0",
          "  fpsbezierkey 2",
          "    0.00 4",
          "    1.00 12",
          "  frameStartkey 2",
          "    0.00 4",
          "    1.00 4",
          "  frameEndbezierkey 2",
          "    0.00 7",
          "    1.00 7",
          "  xsizekey 2",
          "    0.00 0",
          "    1.00 80",
          "  ysizebezierkey 2",
          "    0.00 0",
          "    1.00 20",
          "  detonatekey 2",
          "    0.00 0",
          "    0.25 1",
          "  sizeEndbezierkey 2",
          "    0.00 1",
          "    1.00 4",
          "  colorStartkey 2",
          "    0.00 1 0 0",
          "    1.00 0 0 1",
          "  node reference ref_target",
          "    parent emit_lightning",
          "    position 0 0 3",
          "    orientation 0 1 0 0.5",
          "  endnode",
          "endnode",
          "newanim impact fx_ascii",
          "  event 0.25 detonate",
          "doneanim",
          "endmodelgeom fx_ascii"
        ].join("\n"),
        "latin1"
      ),
      {
        sourceModelObjectKey: "modules/current/models/fx_ascii.mdl",
        sourceModelFileName: "fx_ascii.mdl",
        sourceModelHash: "hash-ascii"
      }
    );

    expect(result.source).toBe("aurora-mdl-ascii");
    expect(result.emitters).toHaveLength(1);
    expect(result.referenceNodes).toHaveLength(1);

    const emitter = result.emitters[0]!;
    expect(emitter).toMatchObject({
      nodeKind: "emitter",
      nodeName: "emit_lightning",
      parentNodeName: "fx_ascii",
      sourceFormat: "aurora-mdl-ascii",
      sourceModelObjectKey: "modules/current/models/fx_ascii.mdl",
      sourceModelFileName: "fx_ascii.mdl",
      sourceModelHash: "hash-ascii",
      texture: "fxpa_lightning",
      chunkName: "fx_lightning_chunk",
      emitterTypeRaw: "Lightning",
      renderModeRaw: "Billboard_to_World_Z",
      blendModeRaw: "Lighten",
      atlas: {
        xGridRaw: 4,
        yGridRaw: 2,
        effectiveXGrid: 4,
        effectiveYGrid: 2,
        fps: 12,
        random: true
      },
      sourceState: {
        renderHintRaw: "normalandspecmapped",
        renderHintMode: 2,
        customShaderVS: "fx_lightning_vs",
        customShaderFS: "fx_lightning_fs",
        customShaderGS: "fx_lightning_gs",
        transparency: true,
        twoSidedMaterial: true,
        twoSidedTexture: true,
        sampleFramebuffer: 2,
        volumetric: true
      },
      simulation: {
        p2p: true,
        p2pType: "Lightning",
        lightningScale: 1.5,
        lightningDelay: 0.2,
        lightningRadius: 0.75,
        xSize: 0,
        ySize: 0,
        detonate: 0,
        timeline: {
          birthrate: [
            { time: 0, value: 0 },
            { time: 0.25, value: 12 },
            { time: 1, value: 0 }
          ],
          fps: [
            { time: 0, value: 4 },
            { time: 1, value: 12 }
          ],
          frameStart: [
            { time: 0, value: 4 },
            { time: 1, value: 4 }
          ],
          frameEnd: [
            { time: 0, value: 7 },
            { time: 1, value: 7 }
          ],
          xSize: [
            { time: 0, value: 0 },
            { time: 1, value: 80 }
          ],
          ySize: [
            { time: 0, value: 0 },
            { time: 1, value: 20 }
          ],
          detonate: [
            { time: 0, value: 0 },
            { time: 0.25, value: 1 }
          ],
          sizeEnd: [
            { time: 0, value: 1 },
            { time: 1, value: 4 }
          ]
        },
        colorTimeline: {
          colorStart: [
            { time: 0, value: [1, 0, 0] },
            { time: 1, value: [0, 0, 1] }
          ]
        }
      },
      transform: {
        position: [0, 1, 2],
        positionTimeline: [
          { time: 0, value: [0, 1, 2] },
          { time: 1, value: [1, 2, 3] }
        ],
        scale: 2,
        scaleTimeline: [
          { time: 0, value: 2 },
          { time: 1, value: 3 }
        ],
        orientation: {
          axis: [0, 0, 1],
          angleRadians: 1.5708
        },
        orientationTimeline: [
          {
            time: 0,
            value: {
              axis: [0, 0, 1],
              angleRadians: 1.5708
            }
          },
          {
            time: 1,
            value: {
              axis: [0, 0, 1],
              angleRadians: 3.1416
            }
          }
        ]
      },
      referenceNodes: [
        {
          nodeKind: "reference",
          nodeName: "ref_target",
          parentNodeName: "emit_lightning",
          transform: {
            position: [0, 0, 3],
            orientation: {
              axis: [0, 1, 0],
              angleRadians: 0.5
            }
          }
        }
      ],
      events: [
        {
          time: 0.25,
          type: "detonate",
          animationName: "impact"
        }
      ]
    });
    expect(emitter.directRows.map((row) => row.property)).toEqual(
      expect.arrayContaining(["position", "orientation", "scale", "xGridRaw", "yGridRaw", "fps", "lightningScale"])
    );
    expect(emitter.keyRows.map((row) => row.property)).toEqual(
      expect.arrayContaining([
        "position",
        "orientation",
        "scale",
        "birthrate",
        "frameStart",
        "xSize",
        "detonate",
        "colorStart"
      ])
    );
    expect(emitter.bezierKeyRows.map((row) => row.property)).toEqual(
      expect.arrayContaining(["fps", "frameEnd", "ySize", "sizeEnd"])
    );
    expect(emitter.animationPasses).toEqual([
      {
        animationName: "impact",
        events: [
          {
            time: 0.25,
            type: "detonate",
            animationName: "impact"
          }
        ]
      }
    ]);
  });

  it("preserves Aurora direct detonate scalar as an emitter controller", () => {
    const result = parseAuroraMdlVfxSource(
      Buffer.from(
        [
          "newmodel fx_direct_detonate",
          "beginmodelgeom fx_direct_detonate",
          "node emitter emit_explosion",
          "  parent fx_direct_detonate",
          "  update Explosion",
          "  texture fxpa_explosion",
          "  birthrate 2",
          "  lifeExp 1",
          "  detonate 1",
          "endnode",
          "endmodelgeom fx_direct_detonate"
        ].join("\n"),
        "latin1"
      ),
      {
        sourceModelObjectKey: "modules/current/models/fx_direct_detonate.mdl",
        sourceModelFileName: "fx_direct_detonate.mdl",
        sourceModelHash: "hash-direct-detonate"
      }
    );

    const emitter = result.emitters[0]!;
    expect(emitter.simulation).toMatchObject({
      birthrate: 2,
      lifeExp: 1,
      detonate: 1
    });
    expect(emitter.simulation?.timeline).toBeUndefined();
    expect(emitter.directRows.map((row) => row.property)).toEqual(
      expect.arrayContaining(["birthrate", "lifeExp", "detonate"])
    );
  });

  it("keeps twosided material flag separate from twosidedtex texture cull state", () => {
    const materialOnly = parseAuroraMdlVfxSource(
      Buffer.from(
        [
          "newmodel fx_twosided_material",
          "beginmodelgeom fx_twosided_material",
          "node emitter emit_material_only",
          "  parent fx_twosided_material",
          "  texture fxpa_lightning",
          "  twosided 1",
          "endnode",
          "endmodelgeom fx_twosided_material"
        ].join("\n"),
        "latin1"
      )
    );
    const textureCull = parseAuroraMdlVfxSource(
      Buffer.from(
        [
          "newmodel fx_twosidedtex",
          "beginmodelgeom fx_twosidedtex",
          "node emitter emit_twosidedtex",
          "  parent fx_twosidedtex",
          "  texture fxpa_lightning",
          "  twosidedtex 1",
          "endnode",
          "endmodelgeom fx_twosidedtex"
        ].join("\n"),
        "latin1"
      )
    );

    expect(materialOnly.emitters[0]?.sourceState).toEqual({
      twoSidedMaterial: true
    });
    expect(textureCull.emitters[0]?.sourceState).toEqual({
      twoSidedTexture: true
    });
  });

  it("preserves binary emitter nodes and keyed controller rows without GLB conversion", () => {
    const result = parseAuroraMdlVfxSource(
      buildEmitterOnlyBinaryMdl("fxpa_binary", {
        emitterType: "Fountain",
        renderMode: "Billboard_to_World_Z",
        blendMode: "Normal",
        xGridRaw: 4,
        yGridRaw: 4,
        fps: 12,
        random: true,
        twoSidedTexture: true,
        loop: true,
        renderOrder: -3,
        simulation: {
          birthrateKeyframes: [
            [0, 0],
            [0.5, 10],
            [1, 0]
          ],
          colorStartKeyframes: [
            [0, 1, 0, 0],
            [1, 0, 0, 1]
          ],
          lifeExp: 2,
          mass: -0.25,
          p2p: true,
          p2pBezier: true,
          affectedByWind: true
        },
        animations: [
          {
            name: "on",
            lengthSeconds: 2,
            birthrateValues: [10, 10]
          }
        ]
      }),
      {
        sourceModelObjectKey: "modules/current/models/fx_binary.mdl",
        sourceModelFileName: "fx_binary.mdl",
        sourceModelHash: "hash-binary"
      }
    );

    expect(result.source).toBe("aurora-mdl-binary");
    expect(result.emitters).toHaveLength(1);
    const emitter = result.emitters[0]!;
    expect(emitter).toMatchObject({
      nodeName: "emit_smoke",
      texture: "fxpa_binary",
      emitterTypeRaw: "Fountain",
      renderModeRaw: "Billboard_to_World_Z",
      blendModeRaw: "Normal",
      atlas: {
        xGridRaw: 4,
        yGridRaw: 4,
        effectiveXGrid: 4,
        effectiveYGrid: 4,
        fps: 12,
        random: true
      },
      sourceState: {
        twoSidedTexture: true,
        loop: true,
        renderOrder: -3
      },
      simulation: {
        birthrate: 0,
        lifeExp: 2,
        mass: -0.25,
        p2p: true,
        p2pType: "bezier",
        affectedByWind: true,
        timeline: {
          birthrate: [
            { time: 0, value: 0 },
            { time: 0.5, value: 10 },
            { time: 1, value: 0 }
          ]
        },
        colorTimeline: {
          colorStart: [
            { time: 0, value: [1, 0, 0] },
            { time: 1, value: [0, 0, 1] }
          ]
        }
      }
    });
    expect(emitter.keyRows.map((row) => row.property)).toEqual(
      expect.arrayContaining(["birthrate", "colorStart"])
    );
    expect(emitter.animationPasses?.[0]).toMatchObject({
      animationName: "on",
      lengthSeconds: 2,
      emitterState: {
        simulation: {
          birthrate: 10,
          timeline: {
            birthrate: [
              { time: 0, value: 10 },
              { time: 2, value: 10 }
            ]
          }
        }
      }
    });
  });

  it("drops nonphysical binary animation header durations before building implicit timelines", () => {
    const result = parseAuroraMdlVfxSource(
      buildEmitterOnlyBinaryMdl("fxpa_binary", {
        animations: [
          {
            name: "default",
            lengthSeconds: 9.326937361585483e32,
            transitionSeconds: 9.326937361585483e32,
            birthrateValues: [10, 20]
          }
        ]
      }),
      {
        sourceModelObjectKey: "modules/current/models/fx_binary_bad_duration.mdl",
        sourceModelFileName: "fx_binary_bad_duration.mdl",
        sourceModelHash: "hash-binary-bad-duration"
      }
    );

    expect(result.emitters[0]?.animationPasses?.[0]).toMatchObject({
      animationName: "default",
      emitterState: {
        simulation: {
          birthrate: 10
        }
      }
    });
    expect(result.emitters[0]?.animationPasses?.[0]?.lengthSeconds).toBeUndefined();
    expect(result.emitters[0]?.animationPasses?.[0]?.transitionSeconds).toBeUndefined();
    const animationPass = result.emitters[0]?.animationPasses?.[0];
    expect(animationPass?.emitterState?.simulation?.timeline?.birthrate).toBeUndefined();
  });

  it("drops positive denormal binary animation durations before building implicit timelines", () => {
    const result = parseAuroraMdlVfxSource(
      buildEmitterOnlyBinaryMdl("fxpa_binary", {
        animations: [
          {
            name: "on",
            lengthSeconds: 5.94303010146641e-39,
            transitionSeconds: 6.327680924729715e-39,
            birthrateValues: [6, 3]
          }
        ]
      }),
      {
        sourceModelObjectKey: "modules/current/models/plc_t04.mdl",
        sourceModelFileName: "plc_t04.mdl",
        sourceModelHash: "hash-plc-t04-denormal-duration"
      }
    );

    const animationPass = result.emitters[0]?.animationPasses?.[0];
    expect(animationPass).toMatchObject({
      animationName: "on",
      emitterState: {
        simulation: {
          birthrate: 6
        }
      }
    });
    expect(animationPass?.lengthSeconds).toBeUndefined();
    expect(animationPass?.transitionSeconds).toBeUndefined();
    expect(animationPass?.emitterState?.simulation?.timeline?.birthrate).toBeUndefined();
  });

  it("parses the retail plc_t04 fixture with source animation gates intact", () => {
    const fixturePath = resolve(__dirname, "../fixtures/placeable-vfx/plc_t04.mdl");
    const bytes = readFileSync(fixturePath);
    const sourceModelHash = createHash("sha256").update(bytes).digest("hex");
    const result = parseAuroraMdlVfxSource(bytes, {
      sourceModelObjectKey: "modules/current/__aurora/sources/vanilla/models/plc_t04.mdl",
      sourceModelFileName: "plc_t04.mdl",
      sourceModelHash
    });

    expect(bytes).toHaveLength(18_940);
    expect(sourceModelHash).toBe(
      "8f25d18f37e537483d4280d0ccb55533f87c6b0919e935c76d330b138c1c9c64"
    );
    expect(result.source).toBe("aurora-mdl-binary");
    expect(result.diagnostics).toEqual([]);
    expect(result.emitters.map((emitter) => emitter.nodeName)).toEqual([
      "OmenEmitter240",
      "fire!02"
    ]);
    expect(result.emitters[0]).toMatchObject({
      texture: "fxpa_flame00",
      emitterType: "Fountain",
      renderMode: "Normal",
      blendMode: "Lighten",
      simulation: {
        birthrate: 6,
        lifeExp: 2,
        sizeStart: 2,
        sizeEnd: 4,
        colorStart: [
          0.2549020051956177,
          0.2549020051956177,
          0.2549020051956177
        ],
        colorEnd: [1, 1, 1]
      },
      sourceState: {
        renderOrder: 0,
        twoSidedTexture: false,
        loop: false,
        isTinted: false,
        splat: false
      },
      animations: [
        { animationName: "on", simulation: { birthrate: 6 } },
        { animationName: "off2on", simulation: { birthrate: -4 } },
        { animationName: "on2off", simulation: { birthrate: 3 } },
        { animationName: "off", simulation: { birthrate: -4 } }
      ]
    });
    expect(result.emitters[1]).toMatchObject({
      texture: "fxpa_smoke01",
      emitterType: "Fountain",
      renderMode: "Normal",
      blendMode: "Normal",
      simulation: {
        birthrate: 5,
        lifeExp: 2,
        sizeStart: 2,
        sizeEnd: 4,
        colorStart: [0, 0, 0],
        colorEnd: [0, 0, 0]
      },
      sourceState: {
        renderOrder: 0,
        twoSidedTexture: false,
        loop: false,
        isTinted: false,
        splat: false
      },
      animations: [
        { animationName: "on", simulation: { birthrate: 5 } },
        { animationName: "off2on", simulation: { birthrate: -15 } },
        { animationName: "on2off", simulation: { birthrate: 5 } },
        { animationName: "off", simulation: { birthrate: 5 } }
      ]
    });
    expect(
      result.emitters[1]?.animationPasses
        ?.find((animation) => animation.animationName === "off")
        ?.emitterState?.directRows?.find((row) => row.property === "birthrate")?.values
    ).toEqual([5, -15]);
    result.emitters.flatMap((emitter) => emitter.animationPasses ?? []).forEach((animation) => {
      expect(animation.lengthSeconds).toBeUndefined();
      expect(animation.transitionSeconds).toBeUndefined();
      expect(animation.emitterState?.simulation?.timeline?.birthrate).toBeUndefined();
    });

    const rendererFixture = JSON.parse(
      readFileSync(
        resolve(
          __dirname,
          "../../../frontend/tests/fixtures/placeable-vfx/plc_t04.parser-payload.json"
        ),
        "utf8"
      )
    ) as Record<string, unknown>;
    const parserPayload = {
      source: "source-mdl",
      diagnostics: result.diagnostics,
      emitters: result.emitters.map((emitter) => ({
        source: result.source,
        sourceModelAssetId: "plc-t04-source-model",
        sourceModelFileName: emitter.sourceModelFileName,
        sourceModelObjectKey: emitter.sourceModelObjectKey,
        nodeName: emitter.nodeName,
        texture: emitter.texture,
        emitterType: emitter.emitterType,
        renderMode: emitter.renderMode,
        blendMode: emitter.blendMode,
        atlas: emitter.atlas,
        transform: emitter.transform,
        simulation: emitter.simulation,
        animations: emitter.animations,
        sourceState: emitter.sourceState
      }))
    };
    expect(parserPayload).toMatchObject(rendererFixture);
  });

  it("maps binary emitter controller 216 (0xD8) to lightningScale", () => {
    // Evidence: Aurora Toolset decompilation maps the `lightningScale` MDL token
    // to animation-controller id 0xD8 (216), alongside fps=0x80, particleRot=0xA0,
    // xsize=0xC4, ysize=0xC8 (all already handled). See
    // docs/aurora-reverse/VFX_Lightning_P2P_GapAnalysis_2026-06-17.md (GAP-1).
    const result = parseAuroraMdlVfxSource(
      buildEmitterOnlyBinaryMdl("fxlightning_binary", {
        emitterType: "Lightning",
        renderMode: "Linked",
        blendMode: "Normal",
        simulation: {
          lightningScale: 1.75
        }
      }),
      {
        sourceModelObjectKey: "modules/current/models/fx_lightning.mdl",
        sourceModelFileName: "fx_lightning.mdl",
        sourceModelHash: "hash-lightning"
      }
    );

    expect(result.emitters).toHaveLength(1);
    const emitter = result.emitters[0]!;
    expect(emitter.simulation?.lightningScale).toBeCloseTo(1.75, 5);
  });

  it("preserves binary light nodes with Aurora light controllers and flare payload", () => {
    const result = parseAuroraMdlVfxSource(buildLightOnlyBinaryMdl(), {
      sourceModelObjectKey: "modules/current/models/plc_candle_binary.mdl",
      sourceModelFileName: "plc_candle_binary.mdl",
      sourceModelHash: "hash-binary-light"
    });

    expect(result.source).toBe("aurora-mdl-binary");
    expect(result.emitters).toHaveLength(0);
    expect(result.referenceNodes).toHaveLength(0);
    expect(result.lights).toHaveLength(1);
    expect(result.lights[0]).toMatchObject({
      nodeKind: "light",
      nodeName: "aur_light01",
      sourceFormat: "aurora-mdl-binary",
      sourceModelObjectKey: "modules/current/models/plc_candle_binary.mdl",
      sourceModelFileName: "plc_candle_binary.mdl",
      sourceModelHash: "hash-binary-light",
      provenance: {
        sourceNodeOffset: 232
      },
      transform: {
        position: [1, 2, 3]
      },
      radius: 4,
      shadowRadius: 2,
      verticalDisplacement: 0.5,
      multiplier: 1.5,
      color: [0.25, 0.5, 1],
      ambientOnly: false,
      dynamicType: 1,
      affectDynamic: true,
      shadow: true,
      lightPriority: 2,
      generateFlare: true,
      textureNames: ["fx_flare_core", "fx_flare_ring"],
      flareSizes: [0.25, 0.5],
      flarePositions: [0.125, 0.75],
      flareColorShifts: [
        [1, 0.5, 0.25],
        [0.25, 0.5, 1]
      ],
      flareRadius: 12,
      fadingLight: true,
      animations: [
        {
          animationName: "default",
          lengthSeconds: 4,
          transitionSeconds: 0.25,
          positionTimeline: [
            { time: 0, value: [1, 2, 3] },
            { time: 4, value: [1, 2, 4] }
          ],
          colorTimeline: [
            { time: 0, value: [0.25, 0.5, 1] },
            { time: 4, value: [1, 0.5, 0.25] }
          ],
          radiusTimeline: [
            { time: 0, value: 4 },
            { time: 4, value: 8 }
          ],
          shadowRadiusTimeline: [
            { time: 0, value: 2 },
            { time: 4, value: 3 }
          ],
          verticalDisplacementTimeline: [
            { time: 0, value: 0.5 },
            { time: 4, value: 1 }
          ],
          multiplierTimeline: [
            { time: 0, value: 1.5 },
            { time: 4, value: 2 }
          ]
        }
      ]
    });
  });

  it("preserves ASCII light nodes with radius, color, and position timelines", () => {
    const result = parseAuroraMdlVfxSource(
      Buffer.from(
        [
          "newmodel fx_light",
          "beginmodelgeom fx_light",
          "node light pulse01",
          "  parent fx_light",
          "  position 0 0 2.5",
          "  color 0 0.6 0.14",
          "  radius 3",
          "  shadowradius 1.25",
          "  verticaldisplacement 0.35",
          "  multiplier 2",
          "  ambientonly 0",
          "  isdynamic 1",
          "  affectdynamic 1",
          "  shadow 1",
          "  lightpriority 2",
          "  generateflare 1",
          "  texturenames 2",
          "    fx_flare_core",
          "    fx_flare_ring",
          "  endlist",
          "  flaresizes 2",
          "    0.25",
          "    0.5",
          "  endlist",
          "  flarepositions 2",
          "    0.1",
          "    0.9",
          "  endlist",
          "  flarecolorshifts 2",
          "    1 0.8 0.4",
          "    0.4 0.8 1",
          "  endlist",
          "  flareradius 12",
          "  fadingLight 1",
          "endnode",
          "newanim default fx_light",
          "  length 4",
          "  transtime 0.25",
          "  node light pulse01",
          "    positionkey 2",
          "      0 0 0 2.5",
          "      4 0 0 3",
          "    colorkey 2",
          "      0 0 0.6 0.14",
          "      4 0 1 0.14",
          "    radiuskey 2",
          "      0 3",
          "      4 10",
          "    shadowradiusbezierkey 2",
          "      0 1.25",
          "      4 2.5",
          "    verticaldisplacementkey 2",
          "      0 0.35",
          "      4 0.75",
          "    multiplierbezierkey 2",
          "      0 2",
          "      4 4",
          "  endnode",
          "doneanim",
          "endmodelgeom fx_light"
        ].join("\n"),
        "latin1"
      )
    );

    expect(result.lights).toHaveLength(1);
    expect(result.lights[0]).toMatchObject({
      nodeKind: "light",
      nodeName: "pulse01",
      parentNodeName: "fx_light",
      radius: 3,
      shadowRadius: 1.25,
      verticalDisplacement: 0.35,
      multiplier: 2,
      color: [0, 0.6, 0.14],
      ambientOnly: false,
      dynamicType: 1,
      affectDynamic: true,
      shadow: true,
      lightPriority: 2,
      generateFlare: true,
      textureNames: ["fx_flare_core", "fx_flare_ring"],
      flareSizes: [0.25, 0.5],
      flarePositions: [0.1, 0.9],
      flareColorShifts: [
        [1, 0.8, 0.4],
        [0.4, 0.8, 1]
      ],
      flareRadius: 12,
      fadingLight: true,
      transform: {
        position: [0, 0, 2.5]
      },
      animations: [
        {
          animationName: "default",
          lengthSeconds: 4,
          transitionSeconds: 0.25,
          positionTimeline: [
            { time: 0, value: [0, 0, 2.5] },
            { time: 4, value: [0, 0, 3] }
          ],
          colorTimeline: [
            { time: 0, value: [0, 0.6, 0.14] },
            { time: 4, value: [0, 1, 0.14] }
          ],
          radiusTimeline: [
            { time: 0, value: 3 },
            { time: 4, value: 10 }
          ],
          shadowRadiusTimeline: [
            { time: 0, value: 1.25 },
            { time: 4, value: 2.5 }
          ],
          verticalDisplacementTimeline: [
            { time: 0, value: 0.35 },
            { time: 4, value: 0.75 }
          ],
          multiplierTimeline: [
            { time: 0, value: 2 },
            { time: 4, value: 4 }
          ]
        }
      ]
    });
  });

  it("treats Aurora ASCII sourcelight, placeablelight, and fx_light nodes as light nodes", () => {
    const result = parseAuroraMdlVfxSource(
      Buffer.from(
        [
          "newmodel plc_light_variants",
          "beginmodelgeom plc_light_variants",
          "node dummy plc_light_variants",
          "  parent NULL",
          "endnode",
          "node sourcelight source_fire",
          "  parent plc_light_variants",
          "  position 0 0 1",
          "  color 1 0.5 0.1",
          "  radius 4",
          "endnode",
          "node placeablelight placeable_candle",
          "  parent plc_light_variants",
          "  position 0.25 0 0.5",
          "  color 0.59 0.56 0.37",
          "  radius 2",
          "endnode",
          "node fx_light fx_flash",
          "  parent plc_light_variants",
          "  position 0 0 2",
          "  color 0 0.6 1",
          "  radius 6",
          "endnode",
          "newanim pulse plc_light_variants",
          "  length 1",
          "  node placeablelight placeable_candle",
          "    radiuskey 2",
          "      0 2",
          "      1 3",
          "    endlist",
          "  endnode",
          "doneanim",
          "endmodelgeom plc_light_variants"
        ].join("\n"),
        "latin1"
      )
    );

    expect(result.lights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeKind: "light",
          sourceNodeKind: "sourcelight",
          nodeName: "source_fire",
          radius: 4,
          color: [1, 0.5, 0.1]
        }),
        expect.objectContaining({
          nodeKind: "light",
          sourceNodeKind: "placeablelight",
          nodeName: "placeable_candle",
          radius: 2,
          color: [0.59, 0.56, 0.37],
          animations: [
            expect.objectContaining({
              animationName: "pulse",
              radiusTimeline: [
                { time: 0, value: 2 },
                { time: 1, value: 3 }
              ]
            })
          ]
        }),
        expect.objectContaining({
          nodeKind: "light",
          sourceNodeKind: "fx_light",
          nodeName: "fx_flash",
          radius: 6,
          color: [0, 0.6, 1]
        })
      ])
    );
  });

  it("preserves ASCII shadowblob nodes as source-only shadow evidence without promoting renderer policy", () => {
    const result = parseAuroraMdlVfxSource(
      Buffer.from(
        [
          "newmodel plc_shadow_blob",
          "beginmodelgeom plc_shadow_blob",
          "node dummy plc_shadow_blob",
          "  parent NULL",
          "endnode",
          "node shadowblob source_shadow",
          "  parent plc_shadow_blob",
          "  position 0.25 0 0.02",
          "  orientation 0 0 1 1.5708",
          "  scale 1.5",
          "endnode",
          "endmodelgeom plc_shadow_blob"
        ].join("\n"),
        "latin1"
      )
    );

    expect(result.shadowBlobNodes).toEqual([
      expect.objectContaining({
        nodeKind: "shadowblob",
        sourceNodeKind: "shadowblob",
        nodeName: "source_shadow",
        parentNodeName: "plc_shadow_blob",
        proofStatus: "source-only-no-owning-shadow-policy-callsite",
        transform: {
          position: [0.25, 0, 0.02],
          orientation: {
            axis: [0, 0, 1],
            angleRadians: 1.5708
          },
          scale: 1.5
        }
      })
    ]);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_SPELLS_SHADOWBLOB_NOT_SHADOW_POLICY",
          severity: "warn"
        })
      ])
    );
    expect(result.lights).toHaveLength(0);
  });

  it("preserves propagateillumination as source-only model graph evidence", () => {
    const result = parseAuroraMdlVfxSource(
      Buffer.from(
        [
          "newmodel plc_light_graph",
          "beginmodelgeom plc_light_graph",
          "node dummy plc_light_graph",
          "  parent NULL",
          "  propagateillumination",
          "endnode",
          "endmodelgeom plc_light_graph"
        ].join("\n"),
        "latin1"
      )
    );

    expect(result.propagationEvents).toEqual([
      expect.objectContaining({
        token: "propagateillumination",
        sourceNodeName: "plc_light_graph",
        sourceNodeKind: "other",
        proofStatus: "source-only-model-graph-propagation-no-render-policy"
      })
    ]);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_MODEL_PROPAGATION_SOURCE_ONLY",
          severity: "warn"
        })
      ])
    );
    expect(result.lights).toHaveLength(0);
    expect(result.shadowBlobNodes).toHaveLength(0);
  });

  it("keeps GLB emitter_proxy outside the canonical MDL emitter contract", () => {
    expect(classifyAuroraGlbEmitterProxyBoundary()).toEqual({
      canonicalRuntime: false,
      diagnostics: [
        {
          code: "VFX_GLB_EMITTER_PROXY_NON_CANONICAL",
          severity: "warn",
          message:
            "GLB emitter_proxy is preview provenance only; AuroraMdlEmitterNode must come from source MDL parsing."
        }
      ]
    });
  });
});

function buildEmitterOnlyBinaryMdl(
  textureName: string,
  options: {
    emitterType?: string;
    renderMode?: string;
    blendMode?: string;
    xGridRaw?: number;
    yGridRaw?: number;
    fps?: number;
    random?: boolean;
    twoSidedTexture?: boolean;
    loop?: boolean;
    renderOrder?: number;
    simulation?: {
      birthrateKeyframes?: number[][];
      colorStartKeyframes?: number[][];
      lifeExp?: number;
      mass?: number;
      lightningScale?: number;
      p2p?: boolean;
      p2pBezier?: boolean;
      affectedByWind?: boolean;
    };
    animations?: Array<{
      name: string;
      lengthSeconds?: number;
      transitionSeconds?: number;
      birthrateValues?: number[];
    }>;
  } = {}
): Buffer {
  const modelDataSize = options.animations && options.animations.length > 0 ? 7200 : 1800;
  const bytes = Buffer.alloc(12 + modelDataSize);
  const rootNodeOffset = 232;
  const rootAbsOffset = 12 + rootNodeOffset;

  bytes.writeUInt32LE(0, 0);
  bytes.writeUInt32LE(modelDataSize, 4);
  bytes.writeUInt32LE(0, 8);
  bytes.writeUInt32LE(rootNodeOffset, 84);

  writeCString(bytes, rootAbsOffset + 32, 32, "emit_smoke");
  bytes.writeUInt32LE(0x0004, rootAbsOffset + 108);
  if (options.xGridRaw !== undefined) {
    bytes.writeUInt32LE(options.xGridRaw, rootAbsOffset + 0x7c);
  }
  if (options.yGridRaw !== undefined) {
    bytes.writeUInt32LE(options.yGridRaw, rootAbsOffset + 0x80);
  }
  if (options.emitterType) {
    writeCString(bytes, rootAbsOffset + 0x88, 64, options.emitterType);
  }
  if (options.renderMode) {
    writeCString(bytes, rootAbsOffset + 0xa8, 64, options.renderMode);
  }
  if (options.blendMode) {
    writeCString(bytes, rootAbsOffset + 0xc8, 64, options.blendMode);
  }
  let emitterFlags = options.random ? 0x20 : 0;
  if (options.simulation?.p2p) {
    emitterFlags |= 0x1;
  }
  if (options.simulation?.p2pBezier) {
    emitterFlags |= 0x2;
  }
  if (options.simulation?.affectedByWind) {
    emitterFlags |= 0x4;
  }
  if (emitterFlags !== 0) {
    bytes.writeUInt32LE(emitterFlags, rootAbsOffset + 0x144);
  }
  if (options.twoSidedTexture !== undefined) {
    bytes.writeUInt32LE(options.twoSidedTexture ? 1 : 0, rootAbsOffset + 0x138);
  }
  if (options.loop !== undefined) {
    bytes.writeUInt32LE(options.loop ? 1 : 0, rootAbsOffset + 0x13c);
  }
  if (options.renderOrder !== undefined) {
    bytes.writeInt16LE(options.renderOrder, rootAbsOffset + 0x140);
  }
  writeCString(bytes, rootAbsOffset + 232, 64, textureName);

  const controllerKeysOffset = 620;
  const controllerDataOffset = 1120;
  let controllerCount = 0;
  let dataCount = 0;
  const writeControllerRows = (type: number, rows: number[][]): void => {
    const columns = rows[0]?.length ?? 0;
    if (rows.length === 0 || columns === 0 || rows.some((row) => row.length !== columns)) {
      return;
    }
    const keyAbsOffset = 12 + controllerKeysOffset + controllerCount * 12;
    bytes.writeUInt32LE(type, keyAbsOffset);
    bytes.writeUInt16LE(rows.length, keyAbsOffset + 4);
    bytes.writeUInt16LE(dataCount, keyAbsOffset + 8);
    bytes.writeUInt8(columns, keyAbsOffset + 10);
    rows.forEach((rowValues, row) => {
      rowValues.forEach((value, index) => {
        bytes.writeFloatLE(
          value,
          12 + controllerDataOffset + (dataCount + row * columns + index) * 4
        );
      });
    });
    controllerCount += 1;
    dataCount += columns * rows.length;
  };
  const writeNumberController = (type: number, value: number | undefined): void => {
    if (value !== undefined) {
      writeControllerRows(type, [[value]]);
    }
  };

  writeNumberController(128, options.fps);
  if (options.simulation?.birthrateKeyframes) {
    writeControllerRows(88, options.simulation.birthrateKeyframes);
  }
  if (options.simulation?.colorStartKeyframes) {
    writeControllerRows(108, options.simulation.colorStartKeyframes);
  }
  writeNumberController(144, options.simulation?.lifeExp);
  writeNumberController(148, options.simulation?.mass);
  writeNumberController(216, options.simulation?.lightningScale);
  if (controllerCount > 0 && dataCount > 0) {
    bytes.writeUInt32LE(controllerKeysOffset, rootAbsOffset + 84);
    bytes.writeUInt32LE(controllerCount, rootAbsOffset + 88);
    bytes.writeUInt32LE(controllerDataOffset, rootAbsOffset + 96);
    bytes.writeUInt32LE(dataCount, rootAbsOffset + 100);
  }

  if (options.animations && options.animations.length > 0) {
    const animationArrayOffset = 1800;
    const animationBlockStartOffset = 1840;
    const animationBlockSize = 900;
    bytes.writeUInt32LE(animationArrayOffset, 12 + 120);
    bytes.writeUInt32LE(options.animations.length, 12 + 124);

    options.animations.forEach((animation, index) => {
      const animationOffset = animationBlockStartOffset + index * animationBlockSize;
      const animationAbsOffset = 12 + animationOffset;
      const animationNodeOffset = animationOffset + 160;
      const animationNodeAbsOffset = 12 + animationNodeOffset;
      const animationControllerKeysOffset = animationNodeOffset + 360;
      const animationControllerDataOffset = animationControllerKeysOffset + 160;
      let animationControllerCount = 0;
      let animationDataCount = 0;

      bytes.writeUInt32LE(animationOffset, 12 + animationArrayOffset + index * 4);
      bytes.writeFloatLE(animation.lengthSeconds ?? 2, animationAbsOffset);
      bytes.writeFloatLE(animation.transitionSeconds ?? 0, animationAbsOffset + 4);
      writeCString(bytes, animationAbsOffset + 8, 64, animation.name);
      bytes.writeUInt32LE(animationNodeOffset, animationAbsOffset + 72);
      bytes.writeUInt32LE(11, animationAbsOffset + 76);
      writeCString(bytes, animationNodeAbsOffset + 32, 32, "emit_smoke");
      bytes.writeUInt32LE(0x0004, animationNodeAbsOffset + 108);

      const writeAnimationScalarController = (type: number, values?: number[]): void => {
        if (!values || values.length === 0) {
          return;
        }
        const keyAbsOffset =
          12 + animationControllerKeysOffset + animationControllerCount * 12;
        bytes.writeUInt32LE(type, keyAbsOffset);
        bytes.writeUInt16LE(values.length, keyAbsOffset + 4);
        bytes.writeUInt16LE(animationDataCount, keyAbsOffset + 8);
        bytes.writeUInt8(1, keyAbsOffset + 10);
        values.forEach((value, valueIndex) => {
          bytes.writeFloatLE(
            value,
            12 + animationControllerDataOffset + (animationDataCount + valueIndex) * 4
          );
        });
        animationControllerCount += 1;
        animationDataCount += values.length;
      };

      writeAnimationScalarController(88, animation.birthrateValues);
      if (animationControllerCount > 0 && animationDataCount > 0) {
        bytes.writeUInt32LE(animationControllerKeysOffset, animationNodeAbsOffset + 84);
        bytes.writeUInt32LE(animationControllerCount, animationNodeAbsOffset + 88);
        bytes.writeUInt32LE(animationControllerDataOffset, animationNodeAbsOffset + 96);
        bytes.writeUInt32LE(animationDataCount, animationNodeAbsOffset + 100);
      }
    });
  }

  return bytes;
}

function buildLightOnlyBinaryMdl(): Buffer {
  const modelDataSize = 7200;
  const bytes = Buffer.alloc(12 + modelDataSize);
  const rootNodeOffset = 232;
  const rootAbsOffset = 12 + rootNodeOffset;

  bytes.writeUInt32LE(0, 0);
  bytes.writeUInt32LE(modelDataSize, 4);
  bytes.writeUInt32LE(0, 8);
  bytes.writeUInt32LE(rootNodeOffset, 84);

  writeCString(bytes, rootAbsOffset + 32, 32, "aur_light01");
  bytes.writeUInt32LE(0x0002, rootAbsOffset + 108);
  bytes.writeFloatLE(12, rootAbsOffset + 0x70);
  bytes.writeUInt32LE(2, rootAbsOffset + 0xb0);
  bytes.writeUInt32LE(0, rootAbsOffset + 0xb4);
  bytes.writeUInt32LE(1, rootAbsOffset + 0xb8);
  bytes.writeUInt32LE(1, rootAbsOffset + 0xbc);
  bytes.writeUInt32LE(1, rootAbsOffset + 0xc0);
  bytes.writeUInt32LE(1, rootAbsOffset + 0xc4);
  bytes.writeUInt32LE(1, rootAbsOffset + 0xc8);

  const controllerKeysOffset = 760;
  const controllerDataOffset = 1240;
  let controllerCount = 0;
  let dataCount = 0;
  const writeControllerRows = (type: number, rows: number[][]): void => {
    const columns = rows[0]?.length ?? 0;
    if (rows.length === 0 || columns === 0 || rows.some((row) => row.length !== columns)) {
      return;
    }
    const keyAbsOffset = 12 + controllerKeysOffset + controllerCount * 12;
    bytes.writeUInt32LE(type, keyAbsOffset);
    bytes.writeUInt16LE(rows.length, keyAbsOffset + 4);
    bytes.writeUInt16LE(dataCount, keyAbsOffset + 8);
    bytes.writeUInt8(columns, keyAbsOffset + 10);
    rows.forEach((rowValues, row) => {
      rowValues.forEach((value, index) => {
        bytes.writeFloatLE(
          value,
          12 + controllerDataOffset + (dataCount + row * columns + index) * 4
        );
      });
    });
    controllerCount += 1;
    dataCount += columns * rows.length;
  };

  writeControllerRows(8, [[1, 2, 3]]);
  writeControllerRows(76, [[0.25, 0.5, 1]]);
  writeControllerRows(88, [[4]]);
  writeControllerRows(96, [[2]]);
  writeControllerRows(100, [[0.5]]);
  writeControllerRows(140, [[1.5]]);
  bytes.writeUInt32LE(controllerKeysOffset, rootAbsOffset + 84);
  bytes.writeUInt32LE(controllerCount, rootAbsOffset + 88);
  bytes.writeUInt32LE(controllerDataOffset, rootAbsOffset + 96);
  bytes.writeUInt32LE(dataCount, rootAbsOffset + 100);

  const texturePointerArrayOffset = 1560;
  const textureStringAOffset = 1600;
  const textureStringBOffset = 1664;
  bytes.writeUInt32LE(texturePointerArrayOffset, rootAbsOffset + 0xa4);
  bytes.writeUInt32LE(2, rootAbsOffset + 0xa8);
  bytes.writeUInt32LE(textureStringAOffset, 12 + texturePointerArrayOffset);
  bytes.writeUInt32LE(textureStringBOffset, 12 + texturePointerArrayOffset + 4);
  writeCString(bytes, 12 + textureStringAOffset, 64, "fx_flare_core");
  writeCString(bytes, 12 + textureStringBOffset, 64, "fx_flare_ring");

  const flareSizesOffset = 1736;
  bytes.writeUInt32LE(flareSizesOffset, rootAbsOffset + 0x80);
  bytes.writeUInt32LE(2, rootAbsOffset + 0x84);
  bytes.writeFloatLE(0.25, 12 + flareSizesOffset);
  bytes.writeFloatLE(0.5, 12 + flareSizesOffset + 4);

  const flarePositionsOffset = 1760;
  bytes.writeUInt32LE(flarePositionsOffset, rootAbsOffset + 0x8c);
  bytes.writeUInt32LE(2, rootAbsOffset + 0x90);
  bytes.writeFloatLE(0.125, 12 + flarePositionsOffset);
  bytes.writeFloatLE(0.75, 12 + flarePositionsOffset + 4);

  const flareColorShiftsOffset = 1792;
  bytes.writeUInt32LE(flareColorShiftsOffset, rootAbsOffset + 0x98);
  bytes.writeUInt32LE(2, rootAbsOffset + 0x9c);
  [
    [1, 0.5, 0.25],
    [0.25, 0.5, 1]
  ].forEach((color, colorIndex) => {
    color.forEach((value, valueIndex) => {
      bytes.writeFloatLE(value, 12 + flareColorShiftsOffset + colorIndex * 12 + valueIndex * 4);
    });
  });

  const animationArrayOffset = 2400;
  const animationOffset = 2440;
  const animationAbsOffset = 12 + animationOffset;
  const animationNodeOffset = animationOffset + 160;
  const animationNodeAbsOffset = 12 + animationNodeOffset;
  const animationControllerKeysOffset = animationNodeOffset + 360;
  const animationControllerDataOffset = animationControllerKeysOffset + 160;
  let animationControllerCount = 0;
  let animationDataCount = 0;

  bytes.writeUInt32LE(animationArrayOffset, 12 + 120);
  bytes.writeUInt32LE(1, 12 + 124);
  bytes.writeUInt32LE(animationOffset, 12 + animationArrayOffset);
  bytes.writeFloatLE(4, animationAbsOffset);
  bytes.writeFloatLE(0.25, animationAbsOffset + 4);
  writeCString(bytes, animationAbsOffset + 8, 64, "default");
  bytes.writeUInt32LE(animationNodeOffset, animationAbsOffset + 72);
  bytes.writeUInt32LE(11, animationAbsOffset + 76);
  writeCString(bytes, animationNodeAbsOffset + 32, 32, "aur_light01");
  bytes.writeUInt32LE(0x0002, animationNodeAbsOffset + 108);

  const writeAnimationControllerRows = (type: number, rows: number[][]): void => {
    const columns = rows[0]?.length ?? 0;
    if (rows.length === 0 || columns === 0 || rows.some((row) => row.length !== columns)) {
      return;
    }
    const keyAbsOffset =
      12 + animationControllerKeysOffset + animationControllerCount * 12;
    bytes.writeUInt32LE(type, keyAbsOffset);
    bytes.writeUInt16LE(rows.length, keyAbsOffset + 4);
    bytes.writeUInt16LE(animationDataCount, keyAbsOffset + 8);
    bytes.writeUInt8(columns, keyAbsOffset + 10);
    rows.forEach((rowValues, row) => {
      rowValues.forEach((value, index) => {
        bytes.writeFloatLE(
          value,
          12 + animationControllerDataOffset + (animationDataCount + row * columns + index) * 4
        );
      });
    });
    animationControllerCount += 1;
    animationDataCount += columns * rows.length;
  };

  writeAnimationControllerRows(8, [
    [0, 1, 2, 3],
    [4, 1, 2, 4]
  ]);
  writeAnimationControllerRows(76, [
    [0, 0.25, 0.5, 1],
    [4, 1, 0.5, 0.25]
  ]);
  writeAnimationControllerRows(88, [
    [0, 4],
    [4, 8]
  ]);
  writeAnimationControllerRows(96, [
    [0, 2],
    [4, 3]
  ]);
  writeAnimationControllerRows(100, [
    [0, 0.5],
    [4, 1]
  ]);
  writeAnimationControllerRows(140, [
    [0, 1.5],
    [4, 2]
  ]);
  bytes.writeUInt32LE(animationControllerKeysOffset, animationNodeAbsOffset + 84);
  bytes.writeUInt32LE(animationControllerCount, animationNodeAbsOffset + 88);
  bytes.writeUInt32LE(animationControllerDataOffset, animationNodeAbsOffset + 96);
  bytes.writeUInt32LE(animationDataCount, animationNodeAbsOffset + 100);

  return bytes;
}

function writeCString(bytes: Buffer, offset: number, length: number, value: string): void {
  const slice = value.slice(0, Math.max(0, length - 1));
  for (let index = 0; index < length; index += 1) {
    bytes.writeUInt8(0, offset + index);
  }
  bytes.write(slice, offset, "latin1");
}
