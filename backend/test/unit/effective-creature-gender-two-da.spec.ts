import { createHash } from "node:crypto";

import {
  buildEffectiveCreatureGenderTwoDaDescriptor,
  buildEffectiveCreatureGenderTwoDaRowOptions,
  isSupportedEffectiveCreatureGenderTwoDaInput,
  parseEffectiveCreatureGenderTwoDaRows,
} from "../../src/modules/catalog/domain/effective-creature-gender-two-da";

describe("effective creature gender.2da catalog", () => {
  const sourceObjectKey = "modules/current/__aurora/sources/hak/lc_2da/gender.2da";
  const bytes = Buffer.from([
    "2DA V2.0",
    "",
    "NAME GENDER GRAPHIC CONSTANT",
    "0 156 M **** GENDER_MALE",
    "1 157 F **** GENDER_FEMALE",
    "2 4771 B **** GENDER_BOTH",
    "3 201 O **** GENDER_OTHER",
    "4 202 N **** GENDER_NONE",
  ].join("\n"), "utf-8");

  it("describes one complete effective table and preserves physical Byte rows", () => {
    expect(buildEffectiveCreatureGenderTwoDaDescriptor({
      bytes,
      sourceObjectKey,
      sourceLayer: "hak",
    })).toEqual({
      resourceName: "gender.2da",
      sourceObjectKey,
      sourceLayer: "hak",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.length,
      rowCount: 5,
    });
    expect(parseEffectiveCreatureGenderTwoDaRows(bytes)).toEqual([
      { rowIndex: 0, nameStrRef: 156, genderToken: "M", constant: "GENDER_MALE" },
      { rowIndex: 1, nameStrRef: 157, genderToken: "F", constant: "GENDER_FEMALE" },
      { rowIndex: 2, nameStrRef: 4771, genderToken: "B", constant: "GENDER_BOTH" },
      { rowIndex: 3, nameStrRef: 201, genderToken: "O", constant: "GENDER_OTHER" },
      { rowIndex: 4, nameStrRef: 202, genderToken: "N", constant: "GENDER_NONE" },
    ]);
  });

  it.each(["module", "hak", "vanilla"] as const)(
    "admits exact %s source provenance",
    (sourceLayer) => {
      expect(buildEffectiveCreatureGenderTwoDaDescriptor({
        bytes,
        sourceObjectKey,
        sourceLayer,
      })?.sourceLayer).toBe(sourceLayer);
    },
  );

  it("resolves NAME through TLK and never turns display data into row identity", () => {
    const rows = parseEffectiveCreatureGenderTwoDaRows(bytes)!;
    expect(buildEffectiveCreatureGenderTwoDaRowOptions(rows, (strRef) => ({
      156: "Male",
      157: "Female",
      4771: "Both",
      201: "Other",
      202: "None",
    })[strRef])).toEqual([
      { rowIndex: 0, displayName: "Male", displaySource: "strref", nameStrRef: 156, genderToken: "M", constant: "GENDER_MALE" },
      { rowIndex: 1, displayName: "Female", displaySource: "strref", nameStrRef: 157, genderToken: "F", constant: "GENDER_FEMALE" },
      { rowIndex: 2, displayName: "Both", displaySource: "strref", nameStrRef: 4771, genderToken: "B", constant: "GENDER_BOTH" },
      { rowIndex: 3, displayName: "Other", displaySource: "strref", nameStrRef: 201, genderToken: "O", constant: "GENDER_OTHER" },
      { rowIndex: 4, displayName: "None", displaySource: "strref", nameStrRef: 202, genderToken: "N", constant: "GENDER_NONE" },
    ]);
  });

  it("uses bounded StringRef fallback while requiring exact NAME and GENDER cells", () => {
    expect(buildEffectiveCreatureGenderTwoDaRowOptions([
      { rowIndex: 0, nameStrRef: 156, genderToken: "M" },
      { rowIndex: 1, nameStrRef: 0, genderToken: "F" },
      { rowIndex: 2, nameStrRef: 157, genderToken: "" },
      { rowIndex: 0xff, nameStrRef: 201, genderToken: "O" },
      { rowIndex: 0x100, nameStrRef: 202, genderToken: "N" },
    ], () => undefined)).toEqual([
      { rowIndex: 0, displayName: "StringRef 156", displaySource: "strref_id", nameStrRef: 156, genderToken: "M" },
      { rowIndex: 0xff, displayName: "StringRef 201", displaySource: "strref_id", nameStrRef: 201, genderToken: "O" },
    ]);
  });

  it.each([
    { bytes: Buffer.alloc(0), sourceObjectKey, sourceLayer: "hak" },
    { bytes, sourceObjectKey: "", sourceLayer: "hak" },
    { bytes, sourceObjectKey, sourceLayer: "fixture" },
  ])("rejects malformed descriptor input %#", (input) => {
    expect(isSupportedEffectiveCreatureGenderTwoDaInput(input)).toBe(false);
    expect(buildEffectiveCreatureGenderTwoDaDescriptor(input)).toBeNull();
  });

  it.each([
    Buffer.from("2DA V2.0\nNAME gender\n0 156 M", "utf-8"),
    Buffer.from("2DA V2.0\nname GENDER\n0 156 M", "utf-8"),
    Buffer.from("2DA V2.0\nNAME GENDER\nnot-a-row 156 M", "utf-8"),
  ])("rejects tables outside the exact schema %#", (candidate) => {
    expect(parseEffectiveCreatureGenderTwoDaRows(candidate)).toBeNull();
    expect(buildEffectiveCreatureGenderTwoDaDescriptor({
      bytes: candidate,
      sourceObjectKey,
      sourceLayer: "hak",
    })).toBeNull();
  });
});
