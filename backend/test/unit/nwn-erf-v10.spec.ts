import {
  buildNwnErfV10,
  parseNwnErfV10,
} from "../../src/modules/runtime-settings/domain/nwn-erf-v10";

describe("NWN ERF V1.0", () => {
  it("round-trips ordered resources and preserves header/localized bytes", () => {
    const header = Buffer.alloc(160);
    header.write("MOD ", 0, "ascii");
    header.write("V1.0", 4, "ascii");
    header.writeUInt32LE(1, 8);
    const localizedStrings = Buffer.from([4, 3, 2, 1]);

    const packed = buildNwnErfV10({
      header,
      localizedStrings,
      entries: [
        { resref: "module", type: 2014, bytes: Buffer.from("ifo") },
        { resref: "area_web", type: 2012, bytes: Buffer.from("are") },
      ],
    });
    const parsed = parseNwnErfV10(packed, "roundtrip.mod");

    expect(parsed.signature).toBe("MOD ");
    expect(parsed.localizedStrings).toEqual(localizedStrings);
    expect(parsed.entries).toEqual([
      { resref: "module", type: 2014, bytes: Buffer.from("ifo") },
      { resref: "area_web", type: 2012, bytes: Buffer.from("are") },
    ]);
    expect(parsed.header.readUInt32LE(8)).toBe(1);
  });

  it("rejects duplicate resource identities before packing", () => {
    const header = Buffer.alloc(160);
    header.write("MOD ", 0, "ascii");
    header.write("V1.0", 4, "ascii");

    expect(() =>
      buildNwnErfV10({
        header,
        localizedStrings: Buffer.alloc(0),
        entries: [
          { resref: "Area_Web", type: 2012, bytes: Buffer.from("one") },
          { resref: "area_web", type: 2012, bytes: Buffer.from("two") },
        ],
      }),
    ).toThrow("duplicate");
  });

  it("rejects malformed resource ranges while parsing", () => {
    const header = Buffer.alloc(160);
    header.write("MOD ", 0, "ascii");
    header.write("V1.0", 4, "ascii");
    header.writeUInt32LE(1, 16);
    header.writeUInt32LE(160, 24);
    header.writeUInt32LE(184, 28);
    const bytes = Buffer.concat([header, Buffer.alloc(24), Buffer.alloc(8)]);
    bytes.write("module", 160, "ascii");
    bytes.writeUInt32LE(0, 176);
    bytes.writeUInt16LE(2014, 180);
    bytes.writeUInt32LE(bytes.length + 100, 184);
    bytes.writeUInt32LE(4, 188);

    expect(() => parseNwnErfV10(bytes, "malformed.mod")).toThrow(
      "payload range",
    );
  });
});
