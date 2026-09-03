import { createHash } from "node:crypto";

import { parseErfArchive, parseGff } from "./aurora-model-proof-120s-erf-gff-readback.mjs";

const RESOURCE_TYPE = Object.freeze({ ARE: 2012, NSS: 2009, NCS: 2010 });
const SHA256 = /^[a-f0-9]{64}$/u;
const RESREF = /^[a-z0-9_]{1,16}$/u;

export function inspectPathConnectRuntimePackedModule(input, options) {
  const bytes = Buffer.from(input ?? []);
  const areaResref = requireResref(options?.areaResref, "area_resref");
  const scriptResref = requireResref(options?.scriptResref, "script_resref");
  const expectedNormalizedSourceSha256 = requireSha256(options?.expectedNormalizedSourceSha256, "normalized_source_sha256");
  const expectedNcsSha256 = requireSha256(options?.expectedNcsSha256, "ncs_sha256");
  const archive = parseErfArchive(bytes, "MOD ");
  const areBytes = requireResource(archive, areaResref, RESOURCE_TYPE.ARE);
  const nssBytes = requireResource(archive, scriptResref, RESOURCE_TYPE.NSS);
  const ncsBytes = requireResource(archive, scriptResref, RESOURCE_TYPE.NCS);
  const area = parseGff(areBytes, "ARE ");
  const onEnter = readExactResrefField(area.root, "OnEnter");
  if (onEnter !== scriptResref) throw new Error(`packed_runtime_on_enter_mismatch:${onEnter}:${scriptResref}`);

  const normalizedSource = Buffer.from(nssBytes.toString("ascii").replaceAll("\r\n", "\n"), "ascii");
  const normalizedSourceSha256 = sha256(normalizedSource);
  if (normalizedSourceSha256 !== expectedNormalizedSourceSha256) {
    throw new Error(`packed_runtime_nss_hash_mismatch:${normalizedSourceSha256}:${expectedNormalizedSourceSha256}`);
  }
  const ncsSha256 = sha256(ncsBytes);
  if (ncsSha256 !== expectedNcsSha256) {
    throw new Error(`packed_runtime_ncs_hash_mismatch:${ncsSha256}:${expectedNcsSha256}`);
  }

  return {
    schema: "aurora-area-path-connect-runtime-packed-readback/v1",
    status: "packed-runtime-binding-verified",
    module: { sha256: sha256(bytes), bytes: bytes.length, signature: archive.signature, version: archive.version },
    area: { resref: areaResref, areSha256: sha256(areBytes), bytes: areBytes.length, onEnter },
    script: {
      resref: scriptResref,
      nss: {
        sha256: sha256(nssBytes),
        bytes: nssBytes.length,
        normalizedSha256: normalizedSourceSha256,
        normalizedBytes: normalizedSource.length,
        exactlyOneMain: (normalizedSource.toString("ascii").match(/\bvoid\s+main\s*\(/gu) ?? []).length === 1,
        exactNormalizedSource: true,
      },
      ncs: { sha256: ncsSha256, bytes: ncsBytes.length, exactCompiledBytecode: true },
    },
  };
}

function requireResource(archive, resref, type) {
  const matches = archive.resources.filter((resource) => resource.resref === resref && resource.type === type);
  if (matches.length !== 1) throw new Error(`packed_runtime_resource_missing_or_ambiguous:${resref}:${type}:${matches.length}`);
  return matches[0].bytes;
}

function readExactResrefField(root, label) {
  const matches = root?.fields?.filter((field) => field.label === label) ?? [];
  if (matches.length !== 1 || matches[0].typeId !== 11) throw new Error(`packed_runtime_resref_field_invalid:${label}:${matches.length}`);
  const field = matches[0];
  const bytes = field.__context?.bytes;
  const header = field.__context?.header;
  const offset = Number(header?.fieldDataOffset) + field.dataOrOffset;
  if (!Buffer.isBuffer(bytes) || !Number.isInteger(offset) || offset < 0 || offset >= bytes.length) throw new Error(`packed_runtime_resref_field_out_of_range:${label}`);
  const length = bytes.readUInt8(offset);
  if (length > 16 || offset + 1 + length > bytes.length) throw new Error(`packed_runtime_resref_field_out_of_range:${label}`);
  return bytes.subarray(offset + 1, offset + 1 + length).toString("ascii").toLowerCase();
}

function requireResref(value, label) {
  const result = String(value ?? "").toLowerCase();
  if (!RESREF.test(result)) throw new Error(`packed_runtime_${label}_invalid`);
  return result;
}

function requireSha256(value, label) {
  const result = String(value ?? "").toLowerCase();
  if (!SHA256.test(result)) throw new Error(`packed_runtime_${label}_invalid`);
  return result;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
