import {
  parseAreaAudioEnvironmentFromGitGff,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import {
  updateGitAreaAudioEnvironment,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-audio-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

describe("Aurora GIT AreaProperties audio writer", () => {
  const sourceValue = Object.freeze({
    ambientSoundDayId: 31,
    ambientSoundNightId: 32,
    ambientSoundDayVolume: 25,
    ambientSoundNightVolume: 26,
    environmentAudioId: 104,
    musicBattleId: 34,
    musicDayId: 20,
    musicNightId: 21,
    musicDelayMilliseconds: 90_000,
  });

  it("reads and updates one exact type-100 nine-INT tuple while preserving unrelated GIT state", () => {
    const source = git(sourceValue, [
      { label: "CustomSibling", type: "cexostring", value: "preserve-me" },
    ]);
    const target = Object.freeze({
      ...sourceValue,
      ambientSoundDayId: 44,
      ambientSoundDayVolume: 127,
      musicNightId: 55,
      musicDelayMilliseconds: -12_000,
    });

    expect(parseAreaAudioEnvironmentFromGitGff(source)).toEqual(sourceValue);
    const result = updateGitAreaAudioEnvironment(source, {
      expectedValue: sourceValue,
      value: target,
    });

    expect(result.audioEnvironment).toEqual(target);
    expect(parseAreaAudioEnvironmentFromGitGff(result.bytes)).toEqual(target);
    const document = parseRawGffDocument(result.bytes);
    expect(document).toMatchObject({
      fileType: "GIT ",
      fileVersion: "V3.2",
      rootStructTypeId: 0xffff_ffff,
    });
    expect(document?.fields.find((field) => field.label === "CustomRoot")).toMatchObject({
      type: "void",
      value: Buffer.from([1, 2, 3, 4]),
    });
    const areaProperties = document?.fields.find((field) => field.label === "AreaProperties");
    expect(areaProperties).toMatchObject({ type: "struct", value: { typeId: 100 } });
    if (areaProperties?.type !== "struct") throw new Error("Expected AreaProperties struct.");
    expect(areaProperties.value.fields.find(
      (field) => field.label === "CustomSibling",
    )).toEqual({ label: "CustomSibling", type: "cexostring", value: "preserve-me" });
    expect(source.equals(git(sourceValue, [
      { label: "CustomSibling", type: "cexostring", value: "preserve-me" },
    ]))).toBe(true);
  });

  it.each([
    ["missing field", (fields: SupportedGffField[]) => fields.filter((field) => field.label !== "MusicNight")],
    ["duplicate field", (fields: SupportedGffField[]) => [...fields, { label: "MusicNight", type: "int" as const, value: 88 }]],
    ["wrong-case field", (fields: SupportedGffField[]) => fields.map((field) => field.label === "EnvAudio" ? { ...field, label: "envaudio" } as SupportedGffField : field)],
    ["wrong-type field", (fields: SupportedGffField[]) => fields.map((field) => field.label === "MusicDay" ? { label: "MusicDay", type: "dword" as const, value: 20 } : field)],
    ["out-of-range field", (fields: SupportedGffField[]) => fields.map((field) => field.label === "AmbientSndDayVol" ? { ...field, value: 128 } as SupportedGffField : field)],
  ])("keeps a %s preserve-only", (_label, mutate) => {
    const malformed = gitFromFields(mutate(audioFields(sourceValue)));
    expect(parseAreaAudioEnvironmentFromGitGff(malformed)).toBeNull();
  });

  it("rejects malformed AreaProperties identity", () => {
    const wrongStructType = buildGffBuffer([
      { label: "AreaProperties", type: "struct", value: { typeId: 99, fields: audioFields(sourceValue) } },
    ], "GIT ", 0xffff_ffff);
    const duplicateStruct = buildGffBuffer([
      { label: "AreaProperties", type: "struct", value: { typeId: 100, fields: audioFields(sourceValue) } },
      { label: "AreaProperties", type: "struct", value: { typeId: 100, fields: audioFields(sourceValue) } },
    ], "GIT ", 0xffff_ffff);
    const wrongCase = buildGffBuffer([
      { label: "areaproperties", type: "struct", value: { typeId: 100, fields: audioFields(sourceValue) } },
    ], "GIT ", 0xffff_ffff);
    const wrongFile = buildGffBuffer([
      { label: "AreaProperties", type: "struct", value: { typeId: 100, fields: audioFields(sourceValue) } },
    ], "ARE ", 0xffff_ffff);

    for (const candidate of [wrongStructType, duplicateStruct, wrongCase, wrongFile]) {
      expect(parseAreaAudioEnvironmentFromGitGff(candidate)).toBeNull();
    }
  });

  it.each([
    ["stale expected tuple", {
      expectedValue: { ...sourceValue, musicDayId: 99 },
      value: { ...sourceValue, musicNightId: 99 },
    }],
    ["unchanged tuple", { expectedValue: sourceValue, value: sourceValue }],
    ["invalid target tuple", {
      expectedValue: sourceValue,
      value: { ...sourceValue, musicDelayMilliseconds: 1 },
    }],
  ])("rejects a %s", (_label, mutation) => {
    expect(() => updateGitAreaAudioEnvironment(git(sourceValue), mutation)).toThrow();
  });
});

function git(
  value: Parameters<typeof audioFields>[0],
  extraAudioFields: SupportedGffField[] = [],
): Buffer {
  return gitFromFields([...audioFields(value), ...extraAudioFields]);
}

function gitFromFields(fields: SupportedGffField[]): Buffer {
  return buildGffBuffer([
    { label: "AreaProperties", type: "struct", value: { typeId: 100, fields } },
    { label: "Placeable List", type: "list", value: [{
      typeId: 9,
      fields: [{ label: "Tag", type: "cexostring", value: "untouched" }],
    }] },
    { label: "CustomRoot", type: "void", value: Buffer.from([1, 2, 3, 4]) },
  ], "GIT ", 0xffff_ffff);
}

function audioFields(value: Readonly<{
  ambientSoundDayId: number;
  ambientSoundNightId: number;
  ambientSoundDayVolume: number;
  ambientSoundNightVolume: number;
  environmentAudioId: number;
  musicBattleId: number;
  musicDayId: number;
  musicNightId: number;
  musicDelayMilliseconds: number;
}>): SupportedGffField[] {
  return [
    { label: "AmbientSndDay", type: "int", value: value.ambientSoundDayId },
    { label: "AmbientSndNight", type: "int", value: value.ambientSoundNightId },
    { label: "AmbientSndDayVol", type: "int", value: value.ambientSoundDayVolume },
    { label: "AmbientSndNitVol", type: "int", value: value.ambientSoundNightVolume },
    { label: "EnvAudio", type: "int", value: value.environmentAudioId },
    { label: "MusicBattle", type: "int", value: value.musicBattleId },
    { label: "MusicDay", type: "int", value: value.musicDayId },
    { label: "MusicNight", type: "int", value: value.musicNightId },
    { label: "MusicDelay", type: "int", value: value.musicDelayMilliseconds },
  ];
}
