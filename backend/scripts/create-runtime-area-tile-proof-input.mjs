#!/usr/bin/env node
/**
 * Captures the exact Area-editor tileset definitions exposed by the running
 * authenticated API. The resulting payload is consumed by the exhaustive
 * pure-editor CUD proof without relying on an older module mirror.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const baseUrl = option("--base-url", "http://127.0.0.1:5173/_aurora/v1").replace(/\/+$/u, "");
const username = option("--username", "builder.user");
const password = option("--password", "builder123");
const outFile = path.resolve(
  repoRoot,
  option(
    "--out",
    ".codex-tmp/runtime-area-tile-editor-proof/proof-input.json"
  )
);
const concurrency = Math.min(
  12,
  Math.max(1, Number.parseInt(option("--concurrency", "12"), 10) || 12)
);

async function request(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(120_000)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `${init.method ?? "GET"} ${url} failed with ${response.status}: ${JSON.stringify(payload)}`
    );
  }
  return payload;
}

const login = await request(`${baseUrl}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username, password })
});
const accessToken = login.data?.session?.accessToken;
if (!accessToken) {
  throw new Error("Runtime proof input capture could not obtain an access token.");
}
const headers = { authorization: `Bearer ${accessToken}` };
const tilesetPayload = await request(`${baseUrl}/areas/editing/tilesets`, { headers });
const tilesets = Array.isArray(tilesetPayload.data) ? tilesetPayload.data : [];
const definitions = new Array(tilesets.length);
let cursor = 0;

await Promise.all(
  Array.from({ length: Math.min(concurrency, tilesets.length) }, async () => {
    while (cursor < tilesets.length) {
      const index = cursor;
      cursor += 1;
      const tilesetResRef = String(
        tilesets[index]?.tilesetResRef ?? ""
      ).trim().toLowerCase();
      if (!tilesetResRef) {
        throw new Error(`Tileset summary at index ${index} has no tilesetResRef.`);
      }
      const payload = await request(
        `${baseUrl}/areas/editing/tilesets/${encodeURIComponent(tilesetResRef)}`,
        { headers }
      );
      definitions[index] = {
        tilesetResRef,
        source: `${baseUrl}/areas/editing/tilesets/${tilesetResRef}`,
        definition: payload.data
      };
    }
  })
);

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceRoot: `${baseUrl}/areas/editing/tilesets`,
  definitions
};
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(result)}\n`);
console.log(
  JSON.stringify(
    {
      outFile: path.relative(repoRoot, outFile).replace(/\\/gu, "/"),
      tilesets: definitions.length,
      tiles: definitions.reduce(
        (total, entry) => total + entry.definition.tiles.length,
        0
      ),
      groups: definitions.reduce(
        (total, entry) => total + entry.definition.groups.length,
        0
      )
    },
    null,
    2
  )
);
