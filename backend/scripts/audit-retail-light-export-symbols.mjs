import { readFileSync } from "node:fs";

const DEFAULT_BINARIES = [
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwserver.exe",
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwmain.exe"
];

const requestedSymbols = [
  "?ApplyLight@CNWSItemPropertyHandler@@QEAAHPEAVCNWSItem@@PEAVCNWItemProperty@@PEAVCNWSCreature@@IH@Z",
  "?OnApplyLight@CNWSEffectListHandler@@QEAAHPEAVCNWSObject@@PEAVCGameEffect@@H@Z",
  "?OnRemoveLight@CNWSEffectListHandler@@QEAAHPEAVCNWSObject@@PEAVCGameEffect@@@Z",
  "?OnItemPropertyApplied@CNWSItemPropertyHandler@@UEAAHPEAVCNWSItem@@PEAVCNWItemProperty@@PEAVCNWSCreature@@IH@Z",
  "?AddLight@LightManager@@UEAAXPEAVPartLight@@@Z",
  "?RemoveLight@LightManager@@UEAAXPEAVPartLight@@@Z",
  "?PrioritizeLights@LightManager@@UEAAXAEBVVector@@@Z",
  "?UpdateLights@LightManager@@UEAAXXZ",
  "?OnApplyVisualEffect@CNWSEffectListHandler@@QEAAHPEAVCNWSObject@@PEAVCGameEffect@@H@Z",
  "?OnRemoveVisualEffect@CNWSEffectListHandler@@QEAAHPEAVCNWSObject@@PEAVCGameEffect@@@Z",
  "?ExecuteCommandEffectVisualEffect@CNWSVirtualMachineCommands@@QEAAHHH@Z"
];

const binaries = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_BINARIES;

function readUInt16(data, offset) {
  return data.readUInt16LE(offset);
}

function readUInt32(data, offset) {
  return data.readUInt32LE(offset);
}

function readUInt64(data, offset) {
  return Number(data.readBigUInt64LE(offset));
}

function toHex(value) {
  return `0x${value.toString(16)}`;
}

function parsePeExports(path) {
  const data = readFileSync(path);
  const peOffset = readUInt32(data, 0x3c);
  const numberOfSections = readUInt16(data, peOffset + 6);
  const optionalHeaderSize = readUInt16(data, peOffset + 20);
  const optionalHeaderOffset = peOffset + 24;
  const magic = readUInt16(data, optionalHeaderOffset);
  const isPe32Plus = magic === 0x20b;
  const imageBase = isPe32Plus
    ? readUInt64(data, optionalHeaderOffset + 24)
    : readUInt32(data, optionalHeaderOffset + 28);
  const dataDirectoryOffset = optionalHeaderOffset + (isPe32Plus ? 112 : 96);
  const exportRva = readUInt32(data, dataDirectoryOffset);
  const sectionOffset = optionalHeaderOffset + optionalHeaderSize;

  const sections = Array.from({ length: numberOfSections }, (_, index) => {
    const offset = sectionOffset + index * 40;
    const name = data
      .subarray(offset, offset + 8)
      .toString("ascii")
      .replace(/\0+$/u, "");
    return {
      name,
      virtualSize: readUInt32(data, offset + 8),
      virtualAddress: readUInt32(data, offset + 12),
      rawSize: readUInt32(data, offset + 16),
      rawPointer: readUInt32(data, offset + 20)
    };
  });

  function rvaToOffset(rva) {
    const section = sections.find((candidate) => {
      const size = Math.max(candidate.virtualSize, candidate.rawSize);
      return rva >= candidate.virtualAddress && rva < candidate.virtualAddress + size;
    });
    return section ? section.rawPointer + (rva - section.virtualAddress) : undefined;
  }

  const exportOffset = rvaToOffset(exportRva);
  if (exportOffset === undefined) {
    return { source: path, imageBase, exports: [] };
  }

  const numberOfFunctions = readUInt32(data, exportOffset + 20);
  const numberOfNames = readUInt32(data, exportOffset + 24);
  const functionsRva = readUInt32(data, exportOffset + 28);
  const namesRva = readUInt32(data, exportOffset + 32);
  const ordinalsRva = readUInt32(data, exportOffset + 36);
  const functionsOffset = rvaToOffset(functionsRva);
  const namesOffset = rvaToOffset(namesRva);
  const ordinalsOffset = rvaToOffset(ordinalsRva);
  if (
    functionsOffset === undefined ||
    namesOffset === undefined ||
    ordinalsOffset === undefined
  ) {
    return { source: path, imageBase, exports: [] };
  }

  const exported = [];
  for (let index = 0; index < numberOfNames; index += 1) {
    const nameRva = readUInt32(data, namesOffset + index * 4);
    const nameOffset = rvaToOffset(nameRva);
    if (nameOffset === undefined) {
      continue;
    }
    const end = data.indexOf(0, nameOffset);
    const name = data.subarray(nameOffset, end).toString("ascii");
    const ordinalIndex = readUInt16(data, ordinalsOffset + index * 2);
    if (ordinalIndex >= numberOfFunctions) {
      continue;
    }
    const functionRva = readUInt32(data, functionsOffset + ordinalIndex * 4);
    if (requestedSymbols.includes(name)) {
      exported.push({
        name,
        rva: functionRva,
        va: imageBase + functionRva
      });
    }
  }

  return { source: path, imageBase, exports: exported };
}

const reports = binaries.map(parsePeExports);
console.log(
  JSON.stringify(
    reports.map((report) => ({
      source: report.source,
      imageBase: toHex(report.imageBase),
      exports: report.exports.map((entry) => ({
        name: entry.name,
        rva: toHex(entry.rva),
        va: toHex(entry.va)
      }))
    })),
    null,
    2
  )
);
