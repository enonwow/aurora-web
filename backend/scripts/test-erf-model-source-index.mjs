import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  findErfModelSources,
  indexErfModelResRefs,
  indexErfResourceResRefs,
  readErfResources
} from "./lib/erf-model-source-index.mjs";

function buildHak(version, resources) {
  const v11 = version === "V1.1";
  const keySize = v11 ? 40 : 24;
  const resRefSize = v11 ? 32 : 16;
  const keyOffset = 160;
  const resourceOffset = keyOffset + keySize * resources.length;
  const payloadOffset = resourceOffset + resources.length * 8;
  const payloadSize = resources.reduce(
    (total, resource) => total + Buffer.byteLength(resource.payload),
    0
  );
  const bytes = Buffer.alloc(payloadOffset + payloadSize);
  bytes.write("HAK ", 0, "ascii");
  bytes.write(version, 4, "ascii");
  bytes.writeUInt32LE(resources.length, 16);
  bytes.writeUInt32LE(keyOffset, 24);
  bytes.writeUInt32LE(resourceOffset, 28);
  let cursor = payloadOffset;
  resources.forEach(({ resRef, resourceType, payload }, index) => {
    const offset = keyOffset + index * keySize;
    const payloadBytes = Buffer.from(payload, "utf8");
    bytes.write(resRef, offset, resRefSize, "ascii");
    bytes.writeUInt32LE(index, offset + resRefSize);
    bytes.writeUInt16LE(resourceType, offset + resRefSize + 4);
    bytes.writeUInt32LE(cursor, resourceOffset + index * 8);
    bytes.writeUInt32LE(payloadBytes.length, resourceOffset + index * 8 + 4);
    payloadBytes.copy(bytes, cursor);
    cursor += payloadBytes.length;
  });
  return bytes;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-erf-model-index-"));
try {
  const hakDirectory = path.join(root, "hak");
  const looseDirectory = path.join(root, "loose");
  fs.mkdirSync(hakDirectory, { recursive: true });
  fs.mkdirSync(looseDirectory, { recursive: true });
  const legacyHak = path.join(hakDirectory, "legacy.hak");
  const enhancedHak = path.join(hakDirectory, "enhanced.hak");
  fs.writeFileSync(legacyHak, buildHak("V1.0", [
    { resRef: "opaque_model", resourceType: 2002, payload: "legacy model" },
    { resRef: "opaque_tileset", resourceType: 2013, payload: "legacy set" }
  ]));
  fs.writeFileSync(enhancedHak, buildHak("V1.1", [
    { resRef: "another_model", resourceType: 2002, payload: "enhanced model" },
    { resRef: "another_tileset", resourceType: 2013, payload: "enhanced set" }
  ]));
  fs.writeFileSync(path.join(looseDirectory, "loose_model.mdl"), "newmodel loose_model\n");

  assert.deepEqual(indexErfModelResRefs(legacyHak), ["opaque_model"]);
  assert.deepEqual(indexErfModelResRefs(enhancedHak), ["another_model"]);
  assert.deepEqual(indexErfResourceResRefs(legacyHak, 2013), ["opaque_tileset"]);
  assert.deepEqual(indexErfResourceResRefs(enhancedHak, 2013), ["another_tileset"]);
  assert.deepEqual(
    readErfResources(legacyHak, 2013, new Set(["opaque_tileset"])).map((entry) => ({
      resRef: entry.resRef,
      resourceType: entry.resourceType,
      payload: entry.bytes.toString("utf8")
    })),
    [{ resRef: "opaque_tileset", resourceType: 2013, payload: "legacy set" }]
  );
  assert.deepEqual(
    readErfResources(enhancedHak, 2013, new Set(["another_tileset"])).map((entry) => ({
      resRef: entry.resRef,
      resourceType: entry.resourceType,
      payload: entry.bytes.toString("utf8")
    })),
    [{ resRef: "another_tileset", resourceType: 2013, payload: "enhanced set" }]
  );
  assert.throws(
    () => indexErfResourceResRefs(legacyHak, -1),
    /Invalid ERF resource type/u
  );
  const matches = findErfModelSources({
    searchDirectories: [hakDirectory, looseDirectory],
    targetModelResRefs: new Set(["opaque_model", "another_model", "loose_model", "missing_model"])
  });
  assert.deepEqual(matches.get("opaque_model"), [{
    kind: "hak",
    sourcePath: legacyHak
  }]);
  assert.deepEqual(matches.get("another_model"), [{
    kind: "hak",
    sourcePath: enhancedHak
  }]);
  assert.deepEqual(matches.get("loose_model"), [{
    kind: "loose_mdl",
    sourcePath: path.join(looseDirectory, "loose_model.mdl")
  }]);
  assert.equal(matches.has("missing_model"), false);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.stdout.write("ERF model source index: PASS\n");
