#!/usr/bin/env node

import fs from "node:fs/promises";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const baseUrl = args.get("--base-url") ?? "http://localhost:3000/api/v1";
const username = args.get("--username") ?? "builder.user";
const password = args.get("--password") ?? "builder123";
const outputPath = args.get("--out") ?? "placeable-render-audit.json";
const concurrency = Number.parseInt(args.get("--concurrency") ?? "8", 10);
const listLimit = 100;
const saveEvery = Number.parseInt(args.get("--save-every") ?? "100", 10);
const maxItems = Number.parseInt(args.get("--max") ?? "0", 10);
const bypassCache = args.get("--bypass-cache") === "true";

function usageError(message) {
  console.error(message);
  process.exit(2);
}

if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 64) {
  usageError("--concurrency must be an integer between 1 and 64");
}

async function jsonFetch(path, init = {}, token = null) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // Keep the HTTP error readable below.
  }
  if (!response.ok) {
    const code = payload?.error?.code ?? "HTTP_ERROR";
    throw new Error(`${response.status} ${code}`);
  }
  return payload;
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function addExample(summary, key, value, limit = 20) {
  if (summary.examples[key].length < limit) {
    summary.examples[key].push(value);
  }
}

function normalizeReference(value) {
  const token = String(value).trim();
  if (!token) {
    return "";
  }
  const withoutQuery = token.split(/[?#]/u, 1)[0] ?? "";
  const fileName = withoutQuery.replace(/\\/gu, "/").split("/").pop() ?? withoutQuery;
  return fileName.replace(/\.[a-z0-9]+$/iu, "").toLowerCase();
}

function collectTextureReferences(placeable) {
  const references = new Set();
  const metadata = placeable.metadata ?? {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value !== "string") {
      continue;
    }
    const normalizedKey = key.toLowerCase();
    if (!normalizedKey.includes("texture")) {
      continue;
    }
    value
      .split(/[|,;\s]+/u)
      .map(normalizeReference)
      .filter((reference) => reference.length >= 3)
      .forEach((reference) => references.add(reference));
  }
  const textureUrls = placeable.renderPackage?.textureUrls;
  if (Array.isArray(textureUrls)) {
    textureUrls
      .map(normalizeReference)
      .filter((reference) => reference.length >= 3)
      .forEach((reference) => references.add(reference));
  }
  return [...references];
}

function createEmptyAudit() {
  return {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    baseUrl,
    total: 0,
    processed: 0,
    cursor: 0,
    resultsByTemplateId: {},
    summary: {
      errors: 0,
      status: {},
      readyWithGlb: 0,
      readyNoGlb: 0,
      readyWithTextureUrls: 0,
      readyNoTextureUrls: 0,
      unsupportedOnly2da: 0,
      unsupportedNoModel: 0,
      missingAssets: 0,
      missingDerived: 0,
      bySourceKind: {},
      textureReferenceMissingUrls: {},
      examples: {
        errors: [],
        unsupported: [],
        readyNoTextureUrls: [],
        readyNoGlb: [],
        missingDerived: [],
        missingAssets: []
      }
    }
  };
}

async function loadAudit() {
  try {
    const raw = await fs.readFile(outputPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...createEmptyAudit(),
      ...parsed,
      summary: {
        ...createEmptyAudit().summary,
        ...(parsed.summary ?? {}),
        examples: {
          ...createEmptyAudit().summary.examples,
          ...(parsed.summary?.examples ?? {})
        }
      },
      resultsByTemplateId: parsed.resultsByTemplateId ?? {}
    };
  } catch {
    return createEmptyAudit();
  }
}

async function saveAudit(audit) {
  audit.updatedAt = new Date().toISOString();
  await fs.writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
}

async function login() {
  const payload = await jsonFetch("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return payload.data.session.accessToken;
}

async function listPlaceables(token) {
  const items = [];
  let total = null;
  for (let offset = 0; ; offset += listLimit) {
    const payload = await jsonFetch(
      `/catalog/placeables?limit=${listLimit}&offset=${offset}`,
      {},
      token
    );
    total ??= payload.data.total;
    items.push(...payload.data.items);
    if (items.length >= total || payload.data.items.length === 0) {
      break;
    }
    if (maxItems > 0 && items.length >= maxItems) {
      return items.slice(0, maxItems);
    }
  }
  return maxItems > 0 ? items.slice(0, maxItems) : items;
}

async function processPlaceable(token, item) {
  const payload = await jsonFetch(
    "/catalog/placeables/process",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        templateId: item.templateId,
        includeBenchmarkMetadata: false,
        bypassCache
      })
    },
    token
  );
  const placeable = payload.data.placeable;
  const renderPackage = placeable.renderPackage ?? {};
  const assets = placeable.assetManifest?.assets ?? [];
  return {
    templateId: item.templateId,
    resref: item.resref,
    resolvedTemplateId: placeable.templateId,
    resolvedResref: placeable.resref,
    status: renderPackage.status ?? "missing_render_package",
    glbUrl: renderPackage.glbUrl ?? null,
    textureUrls: renderPackage.textureUrls ?? [],
    diagnostics: renderPackage.diagnostics ?? [],
    lookupModelResRef: placeable.metadata?.lookupModelResRef ?? null,
    sourceKind: placeable.metadata?.sourceKind ?? "blueprint",
    assetCount: assets.length,
    assetFiles: assets.slice(0, 12).map((asset) => `${asset.role}:${asset.fileName}`),
    textureReferences: collectTextureReferences(placeable)
  };
}

function rebuildSummary(resultsByTemplateId) {
  const summary = createEmptyAudit().summary;
  for (const result of Object.values(resultsByTemplateId)) {
    if (result.error) {
      summary.errors += 1;
      addExample(summary, "errors", result);
      continue;
    }
    increment(summary.status, result.status);
    increment(summary.bySourceKind, result.sourceKind ?? "unknown");
    const hasGlb = typeof result.glbUrl === "string" && result.glbUrl.trim().length > 0;
    const textureCount = Array.isArray(result.textureUrls) ? result.textureUrls.length : 0;
    if (result.status === "ready" && hasGlb) {
      summary.readyWithGlb += 1;
    }
    if (result.status === "ready" && !hasGlb) {
      summary.readyNoGlb += 1;
      addExample(summary, "readyNoGlb", result);
    }
    if (result.status === "ready" && textureCount > 0) {
      summary.readyWithTextureUrls += 1;
    }
    if (result.status === "ready" && textureCount === 0) {
      summary.readyNoTextureUrls += 1;
      for (const reference of result.textureReferences ?? []) {
        increment(summary.textureReferenceMissingUrls, reference);
      }
      addExample(summary, "readyNoTextureUrls", result);
    }
    if (result.status === "unsupported") {
      const only2da =
        result.assetFiles.length > 0 &&
        result.assetFiles.every((asset) => asset.toLowerCase().endsWith(":placeables.2da"));
      if (only2da) {
        summary.unsupportedOnly2da += 1;
      }
      if (!result.assetFiles.some((asset) => asset.startsWith("model:"))) {
        summary.unsupportedNoModel += 1;
      }
      addExample(summary, "unsupported", result);
    }
    if (result.status === "missing_assets") {
      summary.missingAssets += 1;
      addExample(summary, "missingAssets", result);
    }
    if (result.status === "missing_derived") {
      summary.missingDerived += 1;
      addExample(summary, "missingDerived", result);
    }
  }
  summary.textureReferenceMissingUrls = Object.fromEntries(
    Object.entries(summary.textureReferenceMissingUrls)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 50)
  );
  return summary;
}

const audit = await loadAudit();
const token = await login();
const placeables = await listPlaceables(token);
audit.total = placeables.length;

let nextIndex = 0;
let processedSinceSave = 0;
async function worker() {
  while (nextIndex < placeables.length) {
    const item = placeables[nextIndex++];
    if (audit.resultsByTemplateId[item.templateId]) {
      continue;
    }
    try {
      audit.resultsByTemplateId[item.templateId] = await processPlaceable(token, item);
    } catch (error) {
      audit.resultsByTemplateId[item.templateId] = {
        templateId: item.templateId,
        resref: item.resref,
        error: error instanceof Error ? error.message : String(error)
      };
    }
    audit.processed = Object.keys(audit.resultsByTemplateId).length;
    processedSinceSave += 1;
    if (processedSinceSave >= saveEvery) {
      audit.summary = rebuildSummary(audit.resultsByTemplateId);
      await saveAudit(audit);
      processedSinceSave = 0;
      console.error(
        `processed ${audit.processed}/${audit.total} ready=${audit.summary.readyWithGlb} unsupported=${audit.summary.status.unsupported ?? 0} errors=${audit.summary.errors}`
      );
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
audit.processed = Object.keys(audit.resultsByTemplateId).length;
audit.summary = rebuildSummary(audit.resultsByTemplateId);
await saveAudit(audit);
console.log(JSON.stringify({
  outputPath,
  total: audit.total,
  processed: audit.processed,
  summary: audit.summary
}, null, 2));
