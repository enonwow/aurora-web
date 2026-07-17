import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.resolve(
  repoRoot,
  process.env.ITEM_VISUAL_SOURCE_OUT_DIR ??
    path.join(".codex-tmp", "item-proof-all", "26-visual-source-coverage")
);
const EMPTY_GLB_SIZE_THRESHOLD_BYTES = 2048;

const DEFAULT_BASES = [
  process.env.ITEM_AUDIT_API_BASE_URL,
  process.env.ITEM_CAPTURE_API_BASE_URL,
  process.env.ITEM_CAPTURE_BASE_URL
    ? `${process.env.ITEM_CAPTURE_BASE_URL.replace(/\/+$/u, "")}/_aurora/v1`
    : undefined,
  "http://127.0.0.1:3000/api/v1",
  "http://127.0.0.1:5173/_aurora/v1"
].filter(Boolean);

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function safeFilePart(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96);
}

function parseMaybeJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === "object")) {
    return value;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function increment(map, key, amount = 1) {
  map[key] = (map[key] ?? 0) + amount;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, init = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      const error = new Error(`${response.status} ${response.statusText}`);
      error.response = body;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function login(baseUrl) {
  const response = await fetchJson(
    `${baseUrl}/auth/login`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: process.env.AURORA_AUDIT_USERNAME ?? "builder.user",
        password: process.env.AURORA_AUDIT_PASSWORD ?? "builder123"
      })
    },
    30000
  );
  const token = response?.data?.session?.accessToken;
  if (!token) {
    throw new Error(`Login response did not include accessToken for ${baseUrl}`);
  }
  return token;
}

async function connectApi() {
  const errors = [];
  for (const rawBase of DEFAULT_BASES) {
    const baseUrl = rawBase.replace(/\/+$/u, "");
    try {
      const token = await login(baseUrl);
      return { baseUrl, token };
    } catch (error) {
      errors.push({ baseUrl, message: error.message, response: error.response ?? null });
    }
  }
  const error = new Error("Unable to login to any item audit API base");
  error.errors = errors;
  throw error;
}

async function fetchAllItems(api) {
  const limit = Number(process.env.ITEM_VISUAL_SOURCE_PAGE_LIMIT ?? 500);
  const hardLimit = Number(process.env.ITEM_VISUAL_SOURCE_HARD_LIMIT ?? 0);
  const pageTimeoutMs = Number(process.env.ITEM_VISUAL_SOURCE_LIST_TIMEOUT_MS ?? 120000);
  const items = [];
  let total = null;
  for (let offset = 0; total === null || offset < total; offset += limit) {
    if (hardLimit > 0 && items.length >= hardLimit) {
      break;
    }
    const url = new URL(`${api.baseUrl}/catalog/items`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    const body = await fetchJson(
      url.toString(),
      { headers: { authorization: `Bearer ${api.token}` } },
      pageTimeoutMs
    );
    const page = Array.isArray(body?.data?.items) ? body.data.items : [];
    total = Number(body?.data?.total ?? page.length);
    items.push(...page);
    await fs.writeFile(
      path.join(outDir, "26-item-visual-source-coverage-progress.json"),
      JSON.stringify(
        {
          phase: "list",
          generatedAt: new Date().toISOString(),
          apiBaseUrl: api.baseUrl,
          fetched: items.length,
          total,
          limit,
          offset
        },
        null,
        2
      )
    );
    if (page.length === 0) {
      break;
    }
  }
  return hardLimit > 0 ? items.slice(0, hardLimit) : items;
}

function isInvalidIconResRef(value) {
  const normalized = normalizeText(value);
  return normalized === "iinvalid" || normalized.startsWith("iinvalid_");
}

function splitRefs(value) {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function modelRefsFromMetadata(metadata) {
  const direct = splitRefs(metadata.itemModelRefs);
  if (direct.length > 0) {
    return direct;
  }
  return [metadata.modelPartResRef1, metadata.modelPartResRef2, metadata.modelPartResRef3]
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
}

function assetReference(asset) {
  return normalizeText(asset?.reference || asset?.fileName || asset?.objectKey || asset?.assetUrl);
}

function assetExtension(asset) {
  return normalizeText(asset?.extension || path.extname(String(asset?.fileName ?? "")).slice(1));
}

function assetRole(asset) {
  return normalizeText(asset?.role || "unknown");
}

function assetMatchesReference(asset, reference) {
  const normalizedReference = normalizeText(reference);
  if (!normalizedReference) {
    return false;
  }
  const candidates = [
    asset?.reference,
    asset?.fileName,
    asset?.objectKey,
    asset?.assetUrl
  ].map(normalizeText);
  return candidates.some(
    (candidate) =>
      candidate === normalizedReference ||
      candidate.startsWith(`${normalizedReference}.`) ||
      candidate.includes(`/${normalizedReference}.`) ||
      candidate.includes(`\\${normalizedReference}.`)
  );
}

function classifyKind(metadata) {
  const label = normalizeText(metadata.baseItem2daLabel);
  const modelType = normalizeText(metadata.baseItemModelType || metadata.baseItem2daItemClass);
  if (
    label === "armor" ||
    Number.isFinite(Number(metadata.bodyPartTorso)) ||
    normalizeText(metadata.itemModelRefs).startsWith("pm")
  ) {
    return "armor";
  }
  if (label === "robe" || modelType.includes("cloak") || modelType.includes("robe")) {
    return "robe-cloak";
  }
  const parts = [metadata.modelPart1, metadata.modelPart2, metadata.modelPart3]
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
  return parts.length >= 2 ? "multipart" : "single";
}

function hasRenderableWebModelAsset(asset) {
  if (assetRole(asset) !== "model") {
    return false;
  }
  if (assetExtension(asset) !== "glb") {
    return false;
  }
  const size = Number(asset.sizeBytes);
  return !Number.isFinite(size) || size > EMPTY_GLB_SIZE_THRESHOLD_BYTES;
}

function hasEmptyWebModelAsset(asset) {
  if (assetRole(asset) !== "model" || assetExtension(asset) !== "glb") {
    return false;
  }
  const size = Number(asset.sizeBytes);
  return Number.isFinite(size) && size > 0 && size <= EMPTY_GLB_SIZE_THRESHOLD_BYTES;
}

function classifyItem(item) {
  const metadata = item.metadata ?? {};
  const assets = Array.isArray(item.assetManifest?.assets)
    ? item.assetManifest.assets
    : parseMaybeJson(metadata.modelAssetCandidates, []);
  const modelPartCandidates = parseMaybeJson(metadata.modelPartCandidates, []);
  const armorPartCandidates = parseMaybeJson(metadata.partModelCandidates, []);
  const modelRefs = modelRefsFromMetadata(metadata);
  const iconRefs = splitRefs(metadata.itemIconRefs);
  const defaultIcon = normalizeText(metadata.baseItemDefaultIcon || iconRefs[0]);
  const invalidIcon = isInvalidIconResRef(defaultIcon);
  const modelAssets = assets.filter((asset) => assetRole(asset) === "model");
  const textureAssets = assets.filter((asset) => assetRole(asset) === "texture");
  const renderableWebModels = modelAssets.filter(hasRenderableWebModelAsset);
  const emptyWebModels = modelAssets.filter(hasEmptyWebModelAsset);
  const realIconTextures = invalidIcon
    ? []
    : textureAssets.filter((asset) => assetMatchesReference(asset, defaultIcon));
  const anyModelMetadata =
    modelRefs.length > 0 ||
    modelPartCandidates.length > 0 ||
    armorPartCandidates.length > 0 ||
    modelAssets.length > 0;
  const hasRenderableWebModel = renderableWebModels.length > 0;
  const hasRealIconTexture = realIconTextures.length > 0;
  const hasEmptyWebModel = emptyWebModels.length > 0;

  let status = "ready-model";
  let webBugCandidate = false;
  let sourceBlocked = false;
  if (hasRenderableWebModel) {
    status = hasRealIconTexture ? "ready-model-and-icon" : "ready-model-only";
  } else if (hasRealIconTexture) {
    status = anyModelMetadata ? "ready-icon-fallback-model-missing" : "ready-icon-only";
  } else if (hasEmptyWebModel) {
    status = "empty-model-and-missing-real-icon-texture";
    sourceBlocked = true;
  } else if (invalidIcon) {
    status = "authored-invalid-icon-no-renderable-model";
    sourceBlocked = true;
  } else if (anyModelMetadata) {
    status = "missing-renderable-model-and-icon-source";
    sourceBlocked = true;
    webBugCandidate = modelAssets.length > 0;
  } else {
    status = "missing-real-visual-source-asset";
    sourceBlocked = true;
  }

  const kind = classifyKind(metadata);
  const baseLabel = normalizeText(metadata.baseItem2daLabel);
  const modelType = normalizeText(metadata.baseItemModelType || metadata.baseItem2daItemClass);
  const signature = [
    kind,
    metadata.baseItem ?? metadata.baseItem2daRow ?? "",
    baseLabel,
    modelType,
    modelRefs.join("/"),
    defaultIcon
  ].join("|");

  return {
    templateId: item.templateId ?? "",
    resref: item.resref ?? metadata.templateResRef ?? "",
    name: item.name ?? metadata.displayName ?? "",
    kind,
    status,
    sourceBlocked,
    webBugCandidate,
    baseItem: metadata.baseItem ?? metadata.baseItem2daRow ?? null,
    baseLabel,
    modelType,
    defaultIcon,
    invalidIcon,
    modelRefs,
    iconRefs,
    assetCount: assets.length,
    modelAssetCount: modelAssets.length,
    textureAssetCount: textureAssets.length,
    renderableWebModelCount: renderableWebModels.length,
    emptyWebModelCount: emptyWebModels.length,
    realIconTextureCount: realIconTextures.length,
    modelAssetNames: modelAssets.map((asset) => asset.fileName ?? asset.reference ?? asset.assetUrl ?? ""),
    textureAssetNames: textureAssets.map((asset) => asset.fileName ?? asset.reference ?? asset.assetUrl ?? ""),
    signature
  };
}

async function processRepresentative(api, representative) {
  const response = await fetchJson(
    `${api.baseUrl}/catalog/items/process`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${api.token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        templateId: representative.templateId,
        resref: representative.resref,
        includeBenchmarkMetadata: true
      })
    },
    120000
  );
  const item = response?.data?.item;
  if (!item) {
    throw new Error(`Process response did not include item for ${representative.resref}`);
  }
  return item;
}

async function mapWithConcurrency(entries, concurrency, mapper) {
  const results = new Array(entries.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (nextIndex < entries.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(entries[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function markdownTable(entries) {
  const rows = [
    "| status | resref | kind | base | modelType | defaultIcon | modelRefs | models | icon |",
    "| --- | --- | --- | --- | --- | --- | --- | ---: | ---: |"
  ];
  for (const entry of entries) {
    rows.push(
      [
        entry.status,
        entry.resref,
        entry.kind,
        entry.baseLabel || entry.baseItem || "-",
        entry.modelType || "-",
        entry.defaultIcon || "-",
        entry.modelRefs.join(", ") || "-",
        String(entry.renderableWebModelCount),
        String(entry.realIconTextureCount)
      ]
        .map((value) => String(value).replace(/\|/gu, "\\|"))
        .join(" | ")
        .replace(/^/u, "| ")
        .replace(/$/u, " |")
    );
  }
  return rows.join("\n");
}

async function run() {
  await fs.mkdir(outDir, { recursive: true });
  const api = await connectApi();
  const items = await fetchAllItems(api);
  const listEntries = items.map(classifyItem);
  const representativesBySignature = new Map();
  for (const entry of listEntries) {
    if (!representativesBySignature.has(entry.signature)) {
      representativesBySignature.set(entry.signature, { ...entry, groupSize: 0 });
    }
    representativesBySignature.get(entry.signature).groupSize += 1;
  }
  const listRepresentatives = [...representativesBySignature.values()].sort((a, b) =>
    a.kind.localeCompare(b.kind) || a.resref.localeCompare(b.resref)
  );

  const processLimit = Number(process.env.ITEM_VISUAL_SOURCE_PROCESS_LIMIT ?? 0);
  const processMode = normalizeText(process.env.ITEM_VISUAL_SOURCE_PROCESS_MODE || "risk");
  const requestedProcessResrefs = new Set(
    normalizeText(process.env.ITEM_VISUAL_SOURCE_PROCESS_RESREFS || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
  const shouldProcessRepresentative = (entry) => {
    if (processMode === "all") {
      return true;
    }
    if (requestedProcessResrefs.has(normalizeText(entry.resref))) {
      return true;
    }
    return entry.sourceBlocked || entry.webBugCandidate;
  };
  const representativesToProcess =
    processLimit > 0
      ? listRepresentatives.filter(shouldProcessRepresentative).slice(0, processLimit)
      : listRepresentatives.filter(shouldProcessRepresentative);
  const processConcurrency = Number(process.env.ITEM_VISUAL_SOURCE_PROCESS_CONCURRENCY ?? 4);
  const processedRepresentatives = await mapWithConcurrency(
    representativesToProcess,
    processConcurrency,
    async (representative, index) => {
      try {
        const processedItem = await processRepresentative(api, representative);
        const processed = classifyItem(processedItem);
        return {
          ...processed,
          signature: representative.signature,
          groupSize: representative.groupSize,
          processed: true,
          cacheKey: processedItem.cache?.key ?? "",
          processError: null
        };
      } catch (error) {
        await sleep(250);
        return {
          ...representative,
          status: "process-failed",
          sourceBlocked: false,
          webBugCandidate: true,
          processed: false,
          processError: error.message,
          processIndex: index + 1
        };
      }
    }
  );
  await fs.writeFile(
    path.join(outDir, "26-item-visual-source-coverage-progress.json"),
    JSON.stringify(
      {
        phase: "process",
        generatedAt: new Date().toISOString(),
        apiBaseUrl: api.baseUrl,
        totalItems: items.length,
        uniqueVisualSignatures: listRepresentatives.length,
        processMode,
        representativesToProcess: representativesToProcess.length,
        processedRepresentatives: processedRepresentatives.length,
        processConcurrency
      },
      null,
      2
    )
  );
  const processedBySignature = new Map(
    processedRepresentatives.map((entry) => [entry.signature, entry])
  );
  const representatives = listRepresentatives.map((entry) => {
    const processed = processedBySignature.get(entry.signature);
    if (processed) {
      return processed;
    }
    if (!shouldProcessRepresentative(entry)) {
      return { ...entry, processed: false, processError: null };
    }
    return {
      ...entry,
      status: "not-processed",
      sourceBlocked: false,
      webBugCandidate: true,
      processed: false,
      processError: "Skipped by ITEM_VISUAL_SOURCE_PROCESS_LIMIT"
    };
  });
  const classifiedBySignature = new Map(representatives.map((entry) => [entry.signature, entry]));
  const entries = listEntries.map((entry) => {
    const representative = classifiedBySignature.get(entry.signature);
    return representative
      ? {
          ...entry,
          status: representative.status,
          sourceBlocked: representative.sourceBlocked,
          webBugCandidate: representative.webBugCandidate,
          processedRepresentative: representative.resref,
          processError: representative.processError ?? null
        }
      : entry;
  });
  const issueEntries = entries
    .filter((entry) => entry.sourceBlocked || entry.webBugCandidate)
    .sort((a, b) => a.status.localeCompare(b.status) || a.resref.localeCompare(b.resref));
  const issueRepresentatives = representatives.filter(
    (entry) => entry.sourceBlocked || entry.webBugCandidate
  );

  const statusCounts = {};
  const kindCounts = {};
  const representativeStatusCounts = {};
  for (const entry of entries) {
    increment(statusCounts, entry.status);
    increment(kindCounts, entry.kind);
  }
  for (const entry of representatives) {
    increment(representativeStatusCounts, entry.status);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    apiBaseUrl: api.baseUrl,
    processMode,
    processedRepresentativeCount: processedRepresentatives.length,
    skippedRepresentativeCount: listRepresentatives.length - processedRepresentatives.length,
    totalItems: entries.length,
    uniqueVisualSignatures: representatives.length,
    issueItemCount: issueEntries.length,
    issueSignatureCount: issueRepresentatives.length,
    sourceBlockedItemCount: entries.filter((entry) => entry.sourceBlocked).length,
    webBugCandidateItemCount: entries.filter((entry) => entry.webBugCandidate).length,
    statusCounts,
    kindCounts,
    representativeStatusCounts,
    issueResrefs: issueEntries.map((entry) => entry.resref),
    issueRepresentatives: issueRepresentatives.map((entry) => ({
      status: entry.status,
      resref: entry.resref,
      kind: entry.kind,
      baseLabel: entry.baseLabel,
      modelType: entry.modelType,
      defaultIcon: entry.defaultIcon,
      modelRefs: entry.modelRefs,
      groupSize: entry.groupSize
    })),
    entries,
    representatives
  };

  const summaryPath = path.join(outDir, "26-item-visual-source-coverage-summary.json");
  const issuesPath = path.join(outDir, "26-item-visual-source-coverage-issues.md");
  const representativesPath = path.join(outDir, "26-item-visual-source-coverage-representatives.json");
  const captureCasesPath = path.join(outDir, "26-item-visual-source-coverage-capture-cases.txt");

  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  await fs.writeFile(representativesPath, JSON.stringify(representatives, null, 2));
  await fs.writeFile(captureCasesPath, issueRepresentatives.map((entry) => entry.resref).join(","));

  const issueMd = [
    "# Item Visual Source Coverage Issues",
    "",
    `Generated: ${summary.generatedAt}`,
    `API: ${summary.apiBaseUrl}`,
    "",
    `Total items: ${summary.totalItems}`,
    `Unique visual signatures: ${summary.uniqueVisualSignatures}`,
    `Issue items: ${summary.issueItemCount}`,
    `Issue signatures: ${summary.issueSignatureCount}`,
    `Source-blocked items: ${summary.sourceBlockedItemCount}`,
    `Web bug candidates: ${summary.webBugCandidateItemCount}`,
    "",
    "## Status Counts",
    "",
    "```json",
    JSON.stringify(statusCounts, null, 2),
    "```",
    "",
    "## Issue Representatives",
    "",
    markdownTable(issueRepresentatives),
    "",
    "## Full Issue List",
    "",
    markdownTable(issueEntries)
  ].join("\n");
  await fs.writeFile(issuesPath, issueMd);

  console.log(
    JSON.stringify(
      {
        ok: summary.webBugCandidateItemCount === 0,
        summaryPath,
        issuesPath,
        representativesPath,
        captureCasesPath,
        totalItems: summary.totalItems,
        uniqueVisualSignatures: summary.uniqueVisualSignatures,
        issueItemCount: summary.issueItemCount,
        issueSignatureCount: summary.issueSignatureCount,
        sourceBlockedItemCount: summary.sourceBlockedItemCount,
        webBugCandidateItemCount: summary.webBugCandidateItemCount,
        statusCounts
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error.message,
        errors: error.errors ?? undefined,
        stack: error.stack
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
