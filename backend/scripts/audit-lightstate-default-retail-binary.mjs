import { readFileSync } from "node:fs";

const DEFAULT_NWSERVER_PATH =
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwserver.exe";
const nwserverPath = process.argv[2] ?? DEFAULT_NWSERVER_PATH;
const data = readFileSync(nwserverPath);

function readUInt16(offset) {
  return data.readUInt16LE(offset);
}

function readUInt32(offset) {
  return data.readUInt32LE(offset);
}

function readInt32(offset) {
  return data.readInt32LE(offset);
}

function readUInt64(offset) {
  return Number(data.readBigUInt64LE(offset));
}

function toHex(value) {
  return `0x${value.toString(16)}`;
}

const peOffset = readUInt32(0x3c);
const numberOfSections = readUInt16(peOffset + 6);
const optionalHeaderSize = readUInt16(peOffset + 20);
const optionalHeaderOffset = peOffset + 24;
const magic = readUInt16(optionalHeaderOffset);
const isPe32Plus = magic === 0x20b;
const imageBase = isPe32Plus
  ? readUInt64(optionalHeaderOffset + 24)
  : readUInt32(optionalHeaderOffset + 28);
const sectionOffset = optionalHeaderOffset + optionalHeaderSize;

const sections = Array.from({ length: numberOfSections }, (_, index) => {
  const offset = sectionOffset + index * 40;
  const name = data
    .subarray(offset, offset + 8)
    .toString("ascii")
    .replace(/\0+$/u, "");
  return {
    name,
    virtualSize: readUInt32(offset + 8),
    virtualAddress: readUInt32(offset + 12),
    rawSize: readUInt32(offset + 16),
    rawPointer: readUInt32(offset + 20)
  };
});

function offsetToRva(offset) {
  const section = sections.find(
    (candidate) =>
      offset >= candidate.rawPointer && offset < candidate.rawPointer + candidate.rawSize
  );
  return section ? section.virtualAddress + (offset - section.rawPointer) : undefined;
}

function rvaToOffset(rva) {
  const section = sections.find((candidate) => {
    const size = Math.max(candidate.virtualSize, candidate.rawSize);
    return rva >= candidate.virtualAddress && rva < candidate.virtualAddress + size;
  });
  return section ? section.rawPointer + (rva - section.virtualAddress) : undefined;
}

const lightStateNeedle = Buffer.from("LightState\0", "ascii");
const lightStateOffset = data.indexOf(lightStateNeedle);
if (lightStateOffset < 0) {
  throw new Error(`LightState string not found in ${nwserverPath}`);
}
const lightStateRva = offsetToRva(lightStateOffset);
const lightStateVa = imageBase + lightStateRva;

const ripLeaPrefixes = [
  "488d05",
  "488d0d",
  "488d15",
  "4c8d05",
  "4c8d0d",
  "4c8d15"
];
const refs = [];
for (let offset = 0; offset < data.length - 7; offset += 1) {
  const prefix = data.subarray(offset, offset + 3).toString("hex");
  if (!ripLeaPrefixes.includes(prefix)) {
    continue;
  }
  const rva = offsetToRva(offset);
  if (rva === undefined) {
    continue;
  }
  const targetVa = imageBase + rva + 7 + readInt32(offset + 3);
  if (targetVa === lightStateVa) {
    refs.push({
      fileOffset: offset,
      rva,
      va: imageBase + rva,
      bytes: data.subarray(offset, offset + 7).toString("hex")
    });
  }
}

const pdata = sections.find((section) => section.name === ".pdata");
const functionEntries = [];
if (pdata) {
  for (
    let offset = pdata.rawPointer;
    offset + 12 <= pdata.rawPointer + pdata.rawSize;
    offset += 12
  ) {
    const beginRva = readUInt32(offset);
    const endRva = readUInt32(offset + 4);
    const unwindRva = readUInt32(offset + 8);
    if (beginRva || endRva) {
      functionEntries.push({ beginRva, endRva, unwindRva });
    }
  }
}

const defaultOnInstruction = Buffer.from("c7836803000001000000", "hex");
const refProofs = refs.map((ref) => {
  const functionEntry = functionEntries.find(
    (entry) => ref.rva >= entry.beginRva && ref.rva < entry.endRva
  );
  const beginOffset =
    functionEntry !== undefined ? rvaToOffset(functionEntry.beginRva) : undefined;
  const endOffset =
    functionEntry !== undefined ? rvaToOffset(functionEntry.endRva) : undefined;
  const body =
    beginOffset !== undefined && endOffset !== undefined
      ? data.subarray(beginOffset, endOffset)
      : Buffer.alloc(0);
  const movOffsetInBody = body.indexOf(defaultOnInstruction);
  return {
    ...ref,
    function:
      functionEntry !== undefined
        ? {
            beginVa: imageBase + functionEntry.beginRva,
            endVa: imageBase + functionEntry.endRva
          }
        : undefined,
    defaultOnInstruction:
      movOffsetInBody >= 0 && beginOffset !== undefined
        ? {
            va: imageBase + functionEntry.beginRva + movOffsetInBody,
            bytes: defaultOnInstruction.toString("hex"),
            meaning:
              "mov dword ptr [rbx+0x368], 1 before optional LightState read"
          }
        : undefined
  };
});

console.log(
  JSON.stringify(
    {
      source: nwserverPath,
      imageBase: toHex(imageBase),
      lightStateString: {
        fileOffset: toHex(lightStateOffset),
        rva: toHex(lightStateRva),
        va: toHex(lightStateVa)
      },
      references: refProofs.map((proof) => ({
        fileOffset: toHex(proof.fileOffset),
        rva: toHex(proof.rva),
        va: toHex(proof.va),
        bytes: proof.bytes,
        function: proof.function
          ? {
              beginVa: toHex(proof.function.beginVa),
              endVa: toHex(proof.function.endVa)
            }
          : undefined,
        defaultOnInstruction: proof.defaultOnInstruction
          ? {
              va: toHex(proof.defaultOnInstruction.va),
              bytes: proof.defaultOnInstruction.bytes,
              meaning: proof.defaultOnInstruction.meaning
            }
          : undefined
      })),
      proofStatus:
        refProofs.some((proof) => proof.defaultOnInstruction)
          ? "retail-binary-backed-nwserver-lightstate-default-on-xref"
          : "blocked-no-default-on-instruction-near-lightstate-xref"
    },
    null,
    2
  )
);
