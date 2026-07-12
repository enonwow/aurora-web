import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

const options = parseArgs(process.argv.slice(2));
const apiBase = String(options.apiBase ?? "http://127.0.0.1:3000/api/v1").replace(/\/+$/u, "");
const outDir = path.resolve(
  String(
    options.outDir ??
      "../frontend/public/aurora-evidence/creatures/runtime-authoring-blueprint-smoke"
  )
);
const username = String(options.username ?? process.env.AURORA_TEST_USERNAME ?? "builder.user");
const password = String(options.password ?? process.env.AURORA_TEST_PASSWORD ?? "builder123");
const resref = `cx${Date.now().toString(36)}`.slice(0, 16);
const renamedResref = `${resref}r`.slice(0, 16);
const summary = {
  generatedAt: new Date().toISOString(),
  apiBase,
  resref,
  renamedResref,
  status: "failed",
  resourceOptions: null,
  created: null,
  updated: null,
  renamed: null,
  deleted: null,
  error: null
};

let accessToken = "";
let created = false;
let activeResref = resref;

try {
  const login = await request(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  accessToken = String(login?.data?.session?.accessToken ?? "");
  if (!accessToken) {
    throw new Error("Login returned no access token.");
  }

  const resourceKinds = ["conversation", "portrait", "script", "soundset"];
  const resourceResults = await Promise.all(
    resourceKinds.map((kind) =>
      request(`${apiBase}/catalog/creatures/resources?kind=${kind}&limit=5`, {
        headers: authorizedHeaders(accessToken, false)
      })
    )
  );
  summary.resourceOptions = resourceResults.map((result, index) => {
    const kind = resourceKinds[index];
    assertEqual(result?.data?.kind, kind, `${kind} resource kind`);
    return {
      kind,
      total: Number(result?.data?.total ?? 0),
      returned: Array.isArray(result?.data?.items) ? result.data.items.length : 0
    };
  });

  const createPayload = {
    templateResRef: resref,
    name: "Codex Creature Proof",
    overwrite: false,
    blueprint: {
      firstName: "Codex",
      lastName: "Proof",
      tag: resref.toUpperCase(),
      appearanceId: 6,
      gender: 1,
      race: 6,
      phenotype: 2,
      conversation: "guard_talk",
      portraitResRef: "po_hm_guard",
      soundSetFile: 12,
      challengeRating: 2.5,
      strength: 16,
      dexterity: 14,
      hitPoints: 30,
      currentHitPoints: 30,
      maxHitPoints: 30,
      classListEntries: [
        {
          classId: 1,
          level: 3,
          knownSpells: [{ spellId: 5, spellLevel: 1, metaMagic: 0, flags: 0 }],
          memorizedSpells: [{ spellId: 6, spellLevel: 1, metaMagic: 0, flags: 1 }]
        }
      ],
      featListEntries: [{ featId: 7 }],
      specAbilityListEntries: [{ spellId: 8, flags: 1, casterLevel: 3 }],
      variableListEntries: [
        { name: "PatrolCount", type: "int", value: 4 },
        { name: "AlertRadius", type: "float", value: 12.5 },
        { name: "Duty", type: "string", value: "gate" }
      ],
      scripts: { onHeartbeat: "nw_c2_default9" }
    }
  };
  const createResult = await request(`${apiBase}/catalog/creatures/blueprints`, {
    method: "POST",
    headers: authorizedHeaders(accessToken),
    body: JSON.stringify(createPayload)
  });
  created = true;
  assertEqual(createResult?.data?.blueprint?.resref, resref, "created resref");
  assertEqual(createResult?.data?.blueprint?.sourceFileType, "UTC ", "created file type");
  assertEqual(createResult?.data?.creature?.metadata?.conversation, "guard_talk", "created conversation");
  assertEqual(createResult?.data?.creature?.metadata?.portraitResRef, "po_hm_guard", "created portrait");
  assertEqual(createResult?.data?.creature?.metadata?.soundSetFile, 12, "created soundset file");
  assertDeepEqual(
    parseJsonMetadata(createResult?.data?.creature?.metadata?.classListEntries),
    normalizeParsedClassEntries(createPayload.blueprint.classListEntries),
    "created class and spell IDs"
  );
  assertDeepEqual(
    parseJsonMetadata(createResult?.data?.creature?.metadata?.featListEntries),
    createPayload.blueprint.featListEntries,
    "created feat IDs"
  );
  assertDeepEqual(
    parseJsonMetadata(createResult?.data?.creature?.metadata?.specAbilityListEntries),
    createPayload.blueprint.specAbilityListEntries,
    "created special ability IDs"
  );
  assertDeepEqual(
    parseJsonMetadata(createResult?.data?.creature?.metadata?.variableListEntries),
    createPayload.blueprint.variableListEntries,
    "created typed variables"
  );
  summary.created = {
    templateId: createResult.data.blueprint.templateId,
    objectKey: createResult.data.blueprint.objectKey,
    sourceFileType: createResult.data.blueprint.sourceFileType,
    processedResref: createResult.data.creature.resref
  };

  const updatePayload = {
    ...createPayload,
    overwrite: true,
    blueprint: {
      ...createPayload.blueprint,
      description: "Updated by runtime authoring proof.",
      challengeRating: 3.5,
      hitPoints: 42,
      currentHitPoints: 41,
      maxHitPoints: 42,
      variableListEntries: [
        { name: "PatrolCount", type: "int", value: 5 },
        { name: "AlertRadius", type: "float", value: 15.5 },
        { name: "Duty", type: "string", value: "wall" }
      ]
    }
  };
  const updateResult = await request(`${apiBase}/catalog/creatures/blueprints/${resref}`, {
    method: "PUT",
    headers: authorizedHeaders(accessToken),
    body: JSON.stringify(updatePayload)
  });
  assertEqual(updateResult?.data?.blueprint?.resref, resref, "updated resref");
  assertEqual(updateResult?.data?.creature?.metadata?.description, updatePayload.blueprint.description, "updated description");
  assertEqual(updateResult?.data?.creature?.metadata?.challengeRating, 3.5, "updated CR");
  assertDeepEqual(
    parseJsonMetadata(updateResult?.data?.creature?.metadata?.variableListEntries),
    updatePayload.blueprint.variableListEntries,
    "updated typed variables"
  );
  summary.updated = {
    templateId: updateResult.data.blueprint.templateId,
    objectKey: updateResult.data.blueprint.objectKey,
    description: updateResult.data.creature.metadata?.description,
    challengeRating: updateResult.data.creature.metadata?.challengeRating,
    hitPoints: updateResult.data.creature.metadata?.hitPoints
  };

  const renameResult = await request(`${apiBase}/catalog/creatures/blueprints/${resref}/rename`, {
    method: "POST",
    headers: authorizedHeaders(accessToken),
    body: JSON.stringify({ templateResRef: renamedResref })
  });
  assertEqual(renameResult?.data?.previousResRef, resref, "renamed previous resref");
  assertEqual(renameResult?.data?.blueprint?.resref, renamedResref, "renamed resref");
  assertEqual(
    renameResult?.data?.creature?.metadata?.templateResRef,
    renamedResref,
    "renamed template resref"
  );
  assertDeepEqual(
    parseJsonMetadata(renameResult?.data?.creature?.metadata?.variableListEntries),
    updatePayload.blueprint.variableListEntries,
    "renamed typed variables"
  );
  activeResref = renamedResref;
  summary.renamed = {
    previousResref: renameResult.data.previousResRef,
    previousObjectKey: renameResult.data.previousObjectKey,
    objectKey: renameResult.data.blueprint.objectKey,
    processedResref: renameResult.data.creature.resref
  };

  const deleteResult = await request(`${apiBase}/catalog/creatures/blueprints/${activeResref}`, {
    method: "DELETE",
    headers: authorizedHeaders(accessToken, false)
  });
  created = false;
  assertEqual(deleteResult?.data?.resref, activeResref, "deleted resref");
  assertEqual(deleteResult?.data?.deleted, true, "deleted flag");
  summary.deleted = {
    objectKey: deleteResult.data.objectKey,
    deleted: deleteResult.data.deleted
  };
  summary.status = "passed";
} catch (error) {
  summary.error = error instanceof Error ? error.message : String(error);
} finally {
  if (created && accessToken) {
    try {
      const cleanup = await request(`${apiBase}/catalog/creatures/blueprints/${activeResref}`, {
        method: "DELETE",
        headers: authorizedHeaders(accessToken, false)
      });
      summary.deleted = {
        objectKey: cleanup?.data?.objectKey ?? "",
        deleted: Boolean(cleanup?.data?.deleted)
      };
    } catch (error) {
      summary.error ??= `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
}

console.log(JSON.stringify(summary, null, 2));
if (summary.status !== "passed") {
  process.exitCode = 1;
}

function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      continue;
    }
    const [rawKey, inlineValue] = argument.slice(2).split("=", 2);
    const nextValue = inlineValue ?? args[index + 1];
    if (inlineValue === undefined && nextValue && !nextValue.startsWith("--")) {
      index += 1;
    }
    values[rawKey] = inlineValue ?? nextValue ?? "true";
  }
  return values;
}

function authorizedHeaders(token, includeJson = true) {
  return includeJson
    ? {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      }
    : { authorization: `Bearer ${token}` };
}

async function request(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`${init.method ?? "GET"} ${new URL(url).pathname}: ${message}`);
  }
  return payload;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function parseJsonMetadata(value) {
  if (typeof value !== "string") {
    throw new Error(`Expected serialized metadata, got ${JSON.stringify(value)}.`);
  }
  return JSON.parse(value);
}

function assertDeepEqual(actual, expected, label) {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(`${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function normalizeParsedClassEntries(entries) {
  return entries.map((entry) => ({
    classId: entry.classId,
    level: entry.level,
    ...(entry.knownSpells?.length
      ? {
          knownSpellCount: entry.knownSpells.length,
          knownSpells: entry.knownSpells.map(normalizeParsedSpellEntry)
        }
      : {}),
    ...(entry.memorizedSpells?.length
      ? {
          memorizedSpellCount: entry.memorizedSpells.length,
          memorizedSpells: entry.memorizedSpells.map(normalizeParsedSpellEntry)
        }
      : {})
  }));
}

function normalizeParsedSpellEntry(entry) {
  return {
    spellId: entry.spellId,
    metaMagic: entry.metaMagic ?? 0,
    flags: (entry.flags ?? 0) | 1,
    ...(entry.spellLevel === undefined ? {} : { spellLevel: entry.spellLevel })
  };
}
