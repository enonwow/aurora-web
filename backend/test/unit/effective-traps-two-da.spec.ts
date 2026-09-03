import {
  MAX_EFFECTIVE_TRAPS_TWO_DA_BYTES,
  MAX_EFFECTIVE_TRAPS_TWO_DA_ROWS,
  buildEffectiveTrapsTwoDaRowOptions,
  isEffectiveTrapsTwoDaInputAdmitted,
  isExactEffectiveTrapsTwoDaResolvedTable,
  parseEffectiveTrapsTwoDa,
} from "../../src/modules/catalog/domain/effective-traps-two-da";

describe("effective traps.2da", () => {
  const source = [
    "2DA V2.0",
    "",
    "Label TrapScript SetDC DetectDCMod DisarmDCMod TrapName ResRef IconResRef",
    "0 MinorSpike nw_t1_spike 5 10 22 6846 nw_it_trap001 iit_trap_009",
    "1 DeadlySpike nw_t1_dead 35 22 36 6849 nw_it_trap004 iit_trap_009",
    "",
  ].join("\n");

  it("builds a digest-bound descriptor and exact physical rows", () => {
    const parsed = parseEffectiveTrapsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "modules/current/__aurora/sources/hak/lc_core/traps.2da",
      sourceLayer: "hak",
    });

    expect(parsed).toEqual({
      descriptor: {
        resourceName: "traps.2da",
        sourceObjectKey: "modules/current/__aurora/sources/hak/lc_core/traps.2da",
        sourceLayer: "hak",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        sizeBytes: Buffer.byteLength(source, "ascii"),
        rowCount: 2,
      },
      rows: [
        {
          rowIndex: 0,
          label: "MinorSpike",
          trapNameStrRef: 6846,
          setDc: 5,
          detectDcMod: 10,
          disarmDcMod: 22,
        },
        {
          rowIndex: 1,
          label: "DeadlySpike",
          trapNameStrRef: 6849,
          setDc: 35,
          detectDcMod: 22,
          disarmDcMod: 36,
        },
      ],
    });
  });

  it("accepts exact native boundaries, optional metadata boundaries, and all source layers", () => {
    const boundarySource = [
      "2DA V2.0",
      "",
      "Label TrapName SetDC DetectDCMod DisarmDCMod",
      `0 L 0 0 255 0`,
      `1 ${"x".repeat(256)} 4294967295 255 0 255`,
      "",
    ].join("\n");
    for (const sourceLayer of ["module", "hak", "vanilla"] as const) {
      const parsed = parseEffectiveTrapsTwoDa({
        bytes: Buffer.from(boundarySource, "ascii"),
        sourceObjectKey: sourceLayer === "module" ? "x" : "x".repeat(2048),
        sourceLayer,
      });
      expect(parsed?.descriptor.sourceLayer).toBe(sourceLayer);
      expect(parsed?.rows).toEqual([
        { rowIndex: 0, label: "L", trapNameStrRef: 0, setDc: 0, detectDcMod: 255, disarmDcMod: 0 },
        { rowIndex: 1, label: "x".repeat(256), trapNameStrRef: 0xffff_ffff, setDc: 255, detectDcMod: 0, disarmDcMod: 255 },
      ]);
    }

    const withoutLabelColumn = boundarySource
      .replace("Label TrapName", "TrapName")
      .replace("0 L 0", "0 0")
      .replace(`1 ${"x".repeat(256)} 4294967295`, "1 4294967295");
    const parsedWithoutLabel = parseEffectiveTrapsTwoDa({
      bytes: Buffer.from(withoutLabelColumn, "ascii"),
      sourceObjectKey: "x/traps.2da",
      sourceLayer: "module",
    });
    expect(parsedWithoutLabel?.rows[0]).not.toHaveProperty("label");
    expect(parsedWithoutLabel?.rows[0]).toHaveProperty("trapNameStrRef", 0);
  });

  it("resolves display names through TLK and falls back without changing row order", () => {
    const parsed = parseEffectiveTrapsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "runtime-source/vanilla/base_2da.key/traps.2da",
      sourceLayer: "vanilla",
    });
    expect(parsed).not.toBeNull();

    expect(
      buildEffectiveTrapsTwoDaRowOptions(parsed!.rows, (strRef) =>
        strRef === 6846 ? "Spike Trap, Minor" : undefined,
      ),
    ).toEqual([
      {
        ...parsed!.rows[0],
        displayName: "Spike Trap, Minor",
        displaySource: "strref",
      },
      {
        ...parsed!.rows[1],
        displayName: "DeadlySpike",
        displaySource: "label",
      },
    ]);
  });

  it.each([
    ["wrong version", source.replace("2DA V2.0", "2DA V9.9")],
    ["missing TrapName", source.replace("TrapName", "WrongName")],
    ["missing SetDC", source.replace("SetDC", "WrongSet")],
    ["missing DetectDCMod", source.replace("DetectDCMod", "WrongDetect")],
    ["missing DisarmDCMod", source.replace("DisarmDCMod", "WrongDisarm")],
    ["negative byte", source.replace("5 10 22", "-1 10 22")],
    ["overflow byte", source.replace("5 10 22", "256 10 22")],
    ["non-decimal byte", source.replace("5 10 22", "5.5 10 22")],
    ["coercible non-decimal byte", source.replace("5 10 22", "+5 10 22")],
    ["coercible DetectDCMod", source.replace("5 10 22", "5 +10 22")],
    ["coercible DisarmDCMod", source.replace("5 10 22", "5 10 +22")],
    ["unsafe decimal byte", source.replace("5 10 22", `${"9".repeat(400)} 10 22`)],
    ["invalid TrapName", source.replace("6846", "-1")],
    ["overflow TrapName", source.replace("6846", "4294967296")],
    ["coercible non-decimal TrapName", source.replace("6846", "+6846")],
    ["empty label", source.replace("MinorSpike", '""')],
    ["over-budget label", source.replace("MinorSpike", "x".repeat(257))],
    ["NUL label", source.replace("MinorSpike", "Minor\0Spike")],
  ])("rejects %s", (_label, candidate) => {
    expect(
      parseEffectiveTrapsTwoDa({
        bytes: Buffer.from(candidate, "utf8"),
        sourceObjectKey: "x/traps.2da",
        sourceLayer: "module",
      }),
    ).toBeNull();
  });

  it("rejects invalid source provenance and hard budgets", () => {
    const bytes = Buffer.from(source, "ascii");
    expect(parseEffectiveTrapsTwoDa({ bytes, sourceObjectKey: "", sourceLayer: "hak" })).toBeNull();
    expect(parseEffectiveTrapsTwoDa({ bytes, sourceObjectKey: 7 as never, sourceLayer: "hak" })).toBeNull();
    expect(parseEffectiveTrapsTwoDa({ bytes: source as never, sourceObjectKey: "x", sourceLayer: "hak" })).toBeNull();
    expect(parseEffectiveTrapsTwoDa({ bytes, sourceObjectKey: "x".repeat(2049), sourceLayer: "hak" })).toBeNull();
    expect(parseEffectiveTrapsTwoDa({ bytes, sourceObjectKey: "x", sourceLayer: "override" })).toBeNull();
    expect(
      parseEffectiveTrapsTwoDa({
        bytes: Buffer.alloc(MAX_EFFECTIVE_TRAPS_TWO_DA_BYTES + 1, 0x20),
        sourceObjectKey: "x/traps.2da",
        sourceLayer: "module",
      }),
    ).toBeNull();

    const rows = Array.from({ length: MAX_EFFECTIVE_TRAPS_TWO_DA_ROWS + 1 }, (_, index) =>
      `${index} Row${index} script 1 2 3 4 res icon`,
    );
    expect(
      parseEffectiveTrapsTwoDa({
        bytes: Buffer.from(
          [
            "2DA V2.0",
            "",
            "Label TrapScript SetDC DetectDCMod DisarmDCMod TrapName ResRef IconResRef",
            ...rows,
          ].join("\n"),
          "ascii",
        ),
        sourceObjectKey: "x/traps.2da",
        sourceLayer: "module",
      }),
    ).toBeNull();

    const maxRows = Array.from({ length: MAX_EFFECTIVE_TRAPS_TWO_DA_ROWS }, (_, index) =>
      `${index} Row${index} script 1 2 3 4 res icon`,
    );
    expect(parseEffectiveTrapsTwoDa({
      bytes: Buffer.from([
        "2DA V2.0",
        "",
        "Label TrapScript SetDC DetectDCMod DisarmDCMod TrapName ResRef IconResRef",
        ...maxRows,
      ].join("\n"), "ascii"),
      sourceObjectKey: "x/traps.2da",
      sourceLayer: "module",
    })?.rows).toHaveLength(256);

    expect(parseEffectiveTrapsTwoDa({
      bytes: Buffer.from("2DA V2.0\n\nTrapName SetDC DetectDCMod DisarmDCMod\n", "ascii"),
      sourceObjectKey: "x/traps.2da",
      sourceLayer: "module",
    })).toBeNull();

    const oneRow = source.replace(
      "1 DeadlySpike nw_t1_dead 35 22 36 6849 nw_it_trap004 iit_trap_009\n",
      "",
    );
    expect(parseEffectiveTrapsTwoDa({
      bytes: Buffer.from(oneRow, "ascii"),
      sourceObjectKey: "x/traps.2da",
      sourceLayer: "module",
    })?.rows).toHaveLength(1);
  });

  it("admits only exact input budget boundaries before parsing", () => {
    const admitted = (bytes: Buffer, sourceObjectKey = "x", sourceLayer = "module") =>
      isEffectiveTrapsTwoDaInputAdmitted({ bytes, sourceObjectKey, sourceLayer });
    expect(admitted(Buffer.alloc(1))).toBe(true);
    expect(admitted(Buffer.alloc(MAX_EFFECTIVE_TRAPS_TWO_DA_BYTES))).toBe(true);
    expect(admitted(Buffer.alloc(0))).toBe(false);
    expect(admitted(Buffer.alloc(MAX_EFFECTIVE_TRAPS_TWO_DA_BYTES + 1))).toBe(false);
    expect(admitted(Buffer.alloc(1), "x".repeat(2048))).toBe(true);
    expect(admitted(Buffer.alloc(1), "")).toBe(false);
    expect(admitted(Buffer.alloc(1), "x".repeat(2049))).toBe(false);
    expect(admitted(Buffer.alloc(1), "x", "hak")).toBe(true);
    expect(admitted(Buffer.alloc(1), "x", "vanilla")).toBe(true);
    expect(admitted(Buffer.alloc(1), "x", "override")).toBe(false);
    expect(isEffectiveTrapsTwoDaInputAdmitted({
      bytes: source as never,
      sourceObjectKey: "x",
      sourceLayer: "module",
    })).toBe(false);
    expect(isEffectiveTrapsTwoDaInputAdmitted({
      bytes: Buffer.alloc(1),
      sourceObjectKey: { length: 1 } as never,
      sourceLayer: "module",
    })).toBe(false);
  });

  it("rejects duplicate required columns but accepts non-error parser diagnostics", () => {
    const duplicateTrapName = source
      .replace("TrapName ResRef", "TrapName TrapName ResRef")
      .replace("6846 nw_it_trap001", "6846 6846 nw_it_trap001")
      .replace("6849 nw_it_trap004", "6849 6849 nw_it_trap004");
    expect(parseEffectiveTrapsTwoDa({
      bytes: Buffer.from(duplicateTrapName, "ascii"),
      sourceObjectKey: "x/traps.2da",
      sourceLayer: "module",
    })).toBeNull();

    const warningOnly = source.replace(
      "6846 nw_it_trap001 iit_trap_009",
      "6846 nw_it_trap001 iit_trap_009 ignored-extra-cell",
    );
    expect(parseEffectiveTrapsTwoDa({
      bytes: Buffer.from(warningOnly, "ascii"),
      sourceObjectKey: "x/traps.2da",
      sourceLayer: "module",
    })?.rows).toHaveLength(2);
  });

  it("falls back to the physical row when TLK and label are unavailable", () => {
    const unlabeled = source.replace("MinorSpike", "****").replace("6846", "****");
    const parsed = parseEffectiveTrapsTwoDa({
      bytes: Buffer.from(unlabeled, "ascii"),
      sourceObjectKey: "x/traps.2da",
      sourceLayer: "module",
    });
    expect(parsed).not.toBeNull();
    expect(buildEffectiveTrapsTwoDaRowOptions(parsed!.rows, () => undefined)[0]).toMatchObject({
      rowIndex: 0,
      displayName: "Row 0",
      displaySource: "row_index",
    });
    expect(parsed!.rows[0]).not.toHaveProperty("label");
    expect(parsed!.rows[0]).not.toHaveProperty("trapNameStrRef");
  });

  it("accepts only bounded TLK display strings and never resolves an absent StrRef", () => {
    const parsed = parseEffectiveTrapsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "x/traps.2da",
      sourceLayer: "module",
    })!;
    for (const value of ["X", "x".repeat(1024)]) {
      expect(buildEffectiveTrapsTwoDaRowOptions([parsed.rows[0]!], () => value)[0])
        .toMatchObject({ displayName: value, displaySource: "strref" });
    }
    for (const value of ["", "a\0b", "x".repeat(1025), 7, { length: 1, includes: () => false }]) {
      expect(buildEffectiveTrapsTwoDaRowOptions([parsed.rows[0]!], () => value as never)[0])
        .toMatchObject({ displayName: "MinorSpike", displaySource: "label" });
    }
    expect(buildEffectiveTrapsTwoDaRowOptions([parsed.rows[0]!], () => { throw new Error("TLK offline"); })[0])
      .toMatchObject({ displayName: "MinorSpike", displaySource: "label" });

    const withoutStrRef = { ...parsed.rows[0] };
    delete withoutStrRef.trapNameStrRef;
    const resolver = jest.fn(() => "must not be used");
    expect(buildEffectiveTrapsTwoDaRowOptions([withoutStrRef], resolver)[0])
      .toMatchObject({ displayName: "MinorSpike", displaySource: "label" });
    expect(resolver).not.toHaveBeenCalled();
  });

  it("validates exact resolved-table boundaries consumed by Area update compilation", () => {
    const table = () => ({
      descriptor: {
        resourceName: "traps.2da",
        sourceObjectKey: "x",
        sourceLayer: "module",
        sha256: "d".repeat(64),
        sizeBytes: 1,
        rowCount: 2,
      },
      rows: [
        { rowIndex: 0, label: "L", trapNameStrRef: 0, setDc: 0, detectDcMod: 255, disarmDcMod: 0, displayName: "M", displaySource: "label" },
        { rowIndex: 1, label: "x".repeat(256), trapNameStrRef: 0xffff_ffff, setDc: 255, detectDcMod: 0, disarmDcMod: 255, displayName: "x".repeat(1024), displaySource: "row_index" },
      ],
    });
    for (const sourceLayer of ["module", "hak", "vanilla"]) {
      const value = table();
      value.descriptor.sourceLayer = sourceLayer;
      expect(isExactEffectiveTrapsTwoDaResolvedTable(value)).toBe(true);
    }
    for (const sourceObjectKey of ["x", "x".repeat(2048)]) {
      const value = table();
      value.descriptor.sourceObjectKey = sourceObjectKey;
      expect(isExactEffectiveTrapsTwoDaResolvedTable(value)).toBe(true);
    }
    const maxSize = table();
    maxSize.descriptor.sizeBytes = MAX_EFFECTIVE_TRAPS_TWO_DA_BYTES;
    expect(isExactEffectiveTrapsTwoDaResolvedTable(maxSize)).toBe(true);
    const oneRow = table();
    oneRow.descriptor.rowCount = 1;
    oneRow.rows = [oneRow.rows[0]!];
    expect(isExactEffectiveTrapsTwoDaResolvedTable(oneRow)).toBe(true);
    const maxRows = table();
    maxRows.descriptor.rowCount = MAX_EFFECTIVE_TRAPS_TWO_DA_ROWS;
    (maxRows as any).rows = Array.from({ length: MAX_EFFECTIVE_TRAPS_TWO_DA_ROWS }, (_, rowIndex) => ({
      rowIndex,
      setDc: 0,
      detectDcMod: 0,
      disarmDcMod: 0,
      displayName: `Row ${rowIndex}`,
      displaySource: "row_index",
    }));
    expect(isExactEffectiveTrapsTwoDaResolvedTable(maxRows)).toBe(true);
    const withoutOptionals = table();
    delete (withoutOptionals.rows[0] as any).label;
    delete (withoutOptionals.rows[0] as any).trapNameStrRef;
    withoutOptionals.rows[0]!.displaySource = "strref";
    expect(isExactEffectiveTrapsTwoDaResolvedTable(withoutOptionals)).toBe(true);

    const invalidMutations: Array<(value: any) => void> = [
      (value) => { value.extra = true; },
      (value) => { value.wrong = value.rows; delete value.rows; },
      (value) => { value.descriptor.extra = true; },
      (value) => { value.descriptor.wrong = value.descriptor.rowCount; delete value.descriptor.rowCount; },
      (value) => { value.descriptor.resourceName = "placeables.2da"; },
      (value) => { value.descriptor.sourceObjectKey = 7; },
      (value) => { value.descriptor.sourceObjectKey = ""; },
      (value) => { value.descriptor.sourceObjectKey = "x".repeat(2049); },
      (value) => { value.descriptor.sourceLayer = { toString: () => "module" }; },
      (value) => { value.descriptor.sourceLayer = "override"; },
      (value) => { value.descriptor.sha256 = BigInt("1".repeat(64)); },
      (value) => { value.descriptor.sha256 = "D".repeat(64); },
      (value) => { value.descriptor.sizeBytes = 0; },
      (value) => { value.descriptor.sizeBytes = 16 * 1024 * 1024 + 1; },
      (value) => { value.descriptor.rowCount = 0; value.rows = []; },
      (value) => {
        value.descriptor.rowCount = 257;
        value.rows = Array.from({ length: 257 }, (_entry, rowIndex) => ({
          rowIndex,
          setDc: 0,
          detectDcMod: 0,
          disarmDcMod: 0,
          displayName: `Row ${rowIndex}`,
          displaySource: "row_index",
        }));
      },
      (value) => { value.rows = {}; },
      (value) => { value.rows.pop(); },
      (value) => { value.rows[0] = null; },
      (value) => { value.rows[0].extra = true; },
      (value) => { value.rows[0].rowIndex = 1; },
      (value) => { value.rows[0].setDc = -1; },
      (value) => { value.rows[0].detectDcMod = 256; },
      (value) => { value.rows[0].disarmDcMod = 0.5; },
      (value) => { value.rows[0].label = 7; },
      (value) => { value.rows[0].label = ""; },
      (value) => { value.rows[0].label = "x".repeat(257); },
      (value) => { value.rows[0].label = "a\0b"; },
      (value) => { value.rows[0].trapNameStrRef = -1; },
      (value) => { value.rows[0].trapNameStrRef = 0x1_0000_0000; },
      (value) => { value.rows[0].displayName = 7; },
      (value) => { value.rows[0].displayName = ""; },
      (value) => { value.rows[0].displayName = "x".repeat(1025); },
      (value) => { value.rows[0].displayName = "a\0b"; },
      (value) => { value.rows[0].displaySource = "tlk"; },
    ];
    for (const mutate of invalidMutations) {
      const value = table();
      mutate(value);
      expect(isExactEffectiveTrapsTwoDaResolvedTable(value)).toBe(false);
    }
    expect(isExactEffectiveTrapsTwoDaResolvedTable(null)).toBe(false);
    expect(isExactEffectiveTrapsTwoDaResolvedTable(undefined)).toBe(false);
    expect(isExactEffectiveTrapsTwoDaResolvedTable([])).toBe(false);
    expect(isExactEffectiveTrapsTwoDaResolvedTable(Object.create(table()))).toBe(false);
    expect(isExactEffectiveTrapsTwoDaResolvedTable(
      Object.assign(Object.create({}), table()),
    )).toBe(false);
  });
});
