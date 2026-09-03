#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..");

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const baseUrl = option(
  "--base-url",
  "http://127.0.0.1:5173/_aurora/v1"
).replace(/\/+$/u, "");
const username = option("--username", "builder.user");
const password = option("--password", "builder123");
const tileIds = option(
  "--tile-ids",
  "tile_tdc01_p11_01,tile_tdc01_t20_01,tile_tdc01_a02_03"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const outputPath = path.resolve(
  repoRoot,
  option(
    "--output",
    "output/proof/targeted-tile-runtime-contract-proof.json"
  )
);
const timeoutMs = Number.parseInt(option("--timeout-ms", "900000"), 10);

if (tileIds.length === 0) {
  throw new Error("--tile-ids must contain at least one tile id.");
}
if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
  throw new Error("--timeout-ms must be a positive integer.");
}

async function fetchWithTimeout(url, init = {}) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs)
  });
}

async function requestJson(url, init = {}) {
  const response = await fetchWithTimeout(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `${init.method ?? "GET"} ${url} failed with ${response.status}: ` +
        JSON.stringify(payload)
    );
  }
  return payload;
}

const login = await requestJson(`${baseUrl}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username, password })
});
const accessToken = login.data?.session?.accessToken;
if (!accessToken) {
  throw new Error("Could not obtain an authenticated runtime proof token.");
}
const authorization = { authorization: `Bearer ${accessToken}` };

function apiDeliveryUrl(deliveryPath) {
  const normalized = String(deliveryPath ?? "");
  if (/^https?:\/\//u.test(normalized)) {
    return normalized;
  }
  if (normalized.startsWith("/api/v1/")) {
    return `${baseUrl}${normalized.slice("/api/v1".length)}`;
  }
  if (normalized.startsWith("/")) {
    return `${new URL(baseUrl).origin}${normalized}`;
  }
  return `${baseUrl}/${normalized}`;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseGlbJson(bytes) {
  if (
    bytes.length < 20 ||
    bytes.toString("ascii", 0, 4) !== "glTF" ||
    bytes.readUInt32LE(4) !== 2
  ) {
    return null;
  }
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > bytes.length) {
      return null;
    }
    if (chunkType === 0x4e4f534a) {
      return JSON.parse(
        bytes
          .subarray(chunkStart, chunkEnd)
          .toString("utf8")
          .replace(/\0+$/u, "")
      );
    }
    offset = chunkEnd;
  }
  return null;
}

function normalizeReference(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value
    .trim()
    .replace(/^"+|"+$/gu, "")
    .replace(/\\/gu, "/")
    .split("/")
    .pop()
    ?.replace(/\.(dds|tga|plt|txi|mtr|bmp)$/iu, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .slice(0, 64);
  return normalized && /[a-z0-9]/u.test(normalized) ? normalized : null;
}

function collectMaterialTextureReferences(modelJson) {
  const references = new Set();
  const absorbExtras = (extrasValue) => {
    const extras =
      extrasValue && typeof extrasValue === "object" ? extrasValue : null;
    const aurora =
      extras?.aurora && typeof extras.aurora === "object"
        ? extras.aurora
        : null;
    const scopedReference = normalizeReference(aurora?.textureReference);
    if (scopedReference) {
      references.add(scopedReference);
    }
    if (Array.isArray(aurora?.textureSlots)) {
      for (const slot of aurora.textureSlots) {
        const reference = normalizeReference(slot?.reference);
        if (reference) {
          references.add(reference);
        }
      }
    }
  };
  for (const material of Array.isArray(modelJson?.materials)
    ? modelJson.materials
    : []) {
    absorbExtras(material?.extras);
  }
  for (const mesh of Array.isArray(modelJson?.meshes) ? modelJson.meshes : []) {
    for (const primitive of Array.isArray(mesh?.primitives)
      ? mesh.primitives
      : []) {
      absorbExtras(primitive?.extras);
    }
  }
  return [...references].sort((left, right) => left.localeCompare(right));
}

function equalStringArrays(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function contractIsReady(contract) {
  const requiredStatuses = [
    contract?.sourceAssetStatus,
    contract?.mdlSourceStatus,
    contract?.glbGeometryStatus,
    contract?.textureDeliveryStatus,
    contract?.materialBindingStatus,
    contract?.rendererHandoffStatus,
    contract?.modelDeliveryStatus
  ];
  return (
    requiredStatuses.every((status) =>
      String(status ?? "").includes("ready")
    ) &&
    Array.isArray(contract?.blockers) &&
    contract.blockers.length === 0
  );
}

const results = [];
for (const tileId of tileIds) {
  const processPayload = await requestJson(
    `${baseUrl}/catalog/tiles/process/batch`,
    {
      method: "POST",
      headers: {
        ...authorization,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        items: [{ tileId, bypassCache: true }]
      })
    }
  );
  const item = processPayload.data?.items?.[0];
  const processed = item?.result ?? item;
  const contract = processed?.tile?.renderAssetContract;
  const modelAsset = contract?.modelAsset;

  let deliveredModel = {
    status: 0,
    bytes: 0,
    sha256: null,
    materialTextureReferences: []
  };
  if (modelAsset?.deliveryPath || modelAsset?.deliveryUrl) {
    const modelResponse = await fetchWithTimeout(
      apiDeliveryUrl(modelAsset.deliveryPath ?? modelAsset.deliveryUrl),
      { headers: authorization }
    );
    const bytes = Buffer.from(await modelResponse.arrayBuffer());
    const modelJson = modelResponse.ok ? parseGlbJson(bytes) : null;
    deliveredModel = {
      status: modelResponse.status,
      bytes: bytes.length,
      sha256: modelResponse.ok ? sha256(bytes) : null,
      materialTextureReferences: collectMaterialTextureReferences(modelJson)
    };
  }

  const assetChecks = [];
  for (const asset of Array.isArray(contract?.materialTextureAssets)
    ? contract.materialTextureAssets
    : []) {
    const deliveryPath = asset.deliveryPath ?? asset.deliveryUrl;
    if (!deliveryPath) {
      assetChecks.push({
        reference: asset.reference,
        status: 0,
        bytes: 0,
        error: "missing_delivery_path"
      });
      continue;
    }
    const response = await fetchWithTimeout(apiDeliveryUrl(deliveryPath), {
      headers: authorization
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    assetChecks.push({
      reference: asset.reference,
      status: response.status,
      bytes: bytes.length
    });
  }

  const contractReferences = [
    ...new Set(contract?.requiredMaterialTextureReferences ?? [])
  ].sort((left, right) => left.localeCompare(right));
  const deliveredReferences = deliveredModel.materialTextureReferences;
  const exactReferenceClosure = equalStringArrays(
    contractReferences,
    deliveredReferences
  );
  const exactModelDelivery =
    deliveredModel.status === 200 &&
    modelAsset?.sizeBytes === deliveredModel.bytes &&
    modelAsset?.contentSha256 === deliveredModel.sha256;
  const allAssetDeliveriesOk = assetChecks.every(
    (asset) => asset.status === 200 && asset.bytes > 0
  );
  const materialAssetReferences = [
    ...new Set(
      (contract?.materialTextureAssets ?? []).map((asset) => asset.reference)
    )
  ].sort((left, right) => left.localeCompare(right));
  const completeMaterialAssetClosure = contractReferences.every((reference) =>
    materialAssetReferences.includes(reference)
  );
  const accepted =
    item?.status === "ready" &&
    contractIsReady(contract) &&
    exactReferenceClosure &&
    exactModelDelivery &&
    allAssetDeliveriesOk &&
    completeMaterialAssetClosure;

  results.push({
    tileId,
    status: item?.status ?? "missing",
    cache: processed?.cache,
    contract,
    deliveredModel,
    assetChecks,
    exactReferenceClosure,
    exactModelDelivery,
    allAssetDeliveriesOk,
    completeMaterialAssetClosure,
    accepted
  });
}

const healthResponse = await fetchWithTimeout(`${baseUrl}/health`);
const proof = {
  schema: "aurora-tile-contract-targeted-proof/v2-content-closure",
  capturedAt: new Date().toISOString(),
  requestedTiles: tileIds,
  freshness: "bypassCache=true",
  backendHealth: healthResponse.ok ? "healthy" : `http_${healthResponse.status}`,
  skillSources: [
    {
      name: "aurora-toolset-prove",
      contractVersion: "1.0.1",
      role: "proof acceptance and artifact policy"
    },
    {
      name: "playwright",
      role: "subsequent guarded browser capture"
    }
  ],
  accepted:
    healthResponse.ok &&
    results.length === tileIds.length &&
    results.every((result) => result.accepted),
  results
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const temporaryPath = `${outputPath}.tmp-${process.pid}`;
fs.writeFileSync(temporaryPath, `${JSON.stringify(proof, null, 2)}\n`);
fs.renameSync(temporaryPath, outputPath);
process.stdout.write(
  `${JSON.stringify({
    outputPath,
    accepted: proof.accepted,
    results: results.map((result) => ({
      tileId: result.tileId,
      accepted: result.accepted,
      contractSha256: result.contract?.modelAsset?.contentSha256,
      deliveredSha256: result.deliveredModel.sha256,
      references: result.deliveredModel.materialTextureReferences.length,
      assetChecks: result.assetChecks.length
    }))
  }, null, 2)}\n`
);
process.exitCode = proof.accepted ? 0 : 1;
