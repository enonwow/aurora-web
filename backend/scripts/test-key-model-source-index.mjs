import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  indexKeyModelResRefs,
  indexKeyModelSources,
  indexKeyResourceSources
} from "./lib/key-model-source-index.mjs";

function buildKey({ bifDeclaredPath = "data/models.bif", bifIndex = 0 } = {}) {
  const headerSize = 64;
  const fileTableOffset = headerSize;
  const fileTableSize = 12;
  const nameBytes = Buffer.from(`${bifDeclaredPath}\0`, "ascii");
  const nameOffset = fileTableOffset + fileTableSize;
  const keyTableOffset = nameOffset + nameBytes.length;
  const bytes = Buffer.alloc(keyTableOffset + 66);
  bytes.write("KEY ", 0, "ascii");
  bytes.write("V1  ", 4, "ascii");
  bytes.writeUInt32LE(1, 8);
  bytes.writeUInt32LE(3, 12);
  bytes.writeUInt32LE(fileTableOffset, 16);
  bytes.writeUInt32LE(keyTableOffset, 20);
  bytes.writeUInt32LE(1, fileTableOffset);
  bytes.writeUInt32LE(nameOffset, fileTableOffset + 4);
  bytes.writeUInt16LE(nameBytes.length, fileTableOffset + 8);
  nameBytes.copy(bytes, nameOffset);
  bytes.write("opaque_model", keyTableOffset, 16, "ascii");
  bytes.writeUInt16LE(2002, keyTableOffset + 16);
  bytes.writeUInt32LE(bifIndex << 20, keyTableOffset + 18);
  bytes.write("not_a_model", keyTableOffset + 22, 16, "ascii");
  bytes.writeUInt16LE(2010, keyTableOffset + 38);
  bytes.writeUInt32LE(0, keyTableOffset + 40);
  bytes.write("opaque_tileset", keyTableOffset + 44, 16, "ascii");
  bytes.writeUInt16LE(2013, keyTableOffset + 60);
  bytes.writeUInt32LE(bifIndex << 20, keyTableOffset + 62);
  return bytes;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-key-model-index-"));
try {
  const dataDirectory = path.join(root, "data");
  fs.mkdirSync(dataDirectory, { recursive: true });
  const bifPath = path.join(dataDirectory, "models.bif");
  fs.writeFileSync(bifPath, "BIF V1  fixture");
  const keyPath = path.join(dataDirectory, "nwn_base.key");
  fs.writeFileSync(keyPath, buildKey());

  assert.deepEqual(indexKeyModelResRefs(keyPath, { resourceRoot: root }), ["opaque_model"]);
  assert.deepEqual(indexKeyModelSources(keyPath, { resourceRoot: root }), [{
    resRef: "opaque_model",
    bifIndex: 0,
    bifPath
  }]);
  assert.deepEqual(indexKeyResourceSources(keyPath, 2013, { resourceRoot: root }), [{
    resRef: "opaque_tileset",
    bifIndex: 0,
    bifPath
  }]);
  assert.throws(
    () => indexKeyResourceSources(keyPath, 65_536, { resourceRoot: root }),
    /Invalid KEY resource type/u
  );

  const invalidBifIndexPath = path.join(dataDirectory, "invalid-bif-index.key");
  fs.writeFileSync(invalidBifIndexPath, buildKey({ bifIndex: 1 }));
  assert.throws(
    () => indexKeyModelSources(invalidBifIndexPath, { resourceRoot: root }),
    /invalid BIF index/u
  );

  const missingBifPath = path.join(dataDirectory, "missing-bif.key");
  fs.writeFileSync(missingBifPath, buildKey({ bifDeclaredPath: "data/missing.bif" }));
  assert.throws(
    () => indexKeyModelSources(missingBifPath, { resourceRoot: root }),
    /BIF source is missing/u
  );

  const truncatedPath = path.join(dataDirectory, "truncated.key");
  const truncated = buildKey();
  truncated.writeUInt32LE(999, 12);
  fs.writeFileSync(truncatedPath, truncated);
  assert.throws(
    () => indexKeyModelSources(truncatedPath, { resourceRoot: root }),
    /resource table bounds/u
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.stdout.write("KEY model source index: PASS\n");
