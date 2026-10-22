import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  ENTRY_READ_ONLY_SAFETY, readEntrySurfaceModuleBytes, validateBinaryEntrySurfaceSource,
} from "./aurora-binary-entry-surface-contract.mjs";
import { armEntrySurface, ingestEntrySurface, finalizeEntrySurface, validateGeometryArtifact } from "./aurora-binary-entry-surface-workflow.mjs";

const LIMITS = Object.freeze({ json: 16 * 1024 * 1024, module: 128 * 1024 * 1024, hak: 512 * 1024 * 1024 });

// Deliberately separate from the native executable's preflight/failure handler.
// This adapter reads saved files directly and has no child-process imports.
export function loadBinaryEntrySurfaceSource({ profilePath, outDir }) {
  const profileFile = readArtifact(profilePath, LIMITS.json);
  const profile = parseJson(profileFile);
  const manifestFile = readArtifact(resolve(outDir, "binary-native-geometry-manifest.json"), LIMITS.json);
  const manifest = parseJson(manifestFile);
  check(typeof manifest.postSaveProfilePath === "string"
    && samePath(dirname(manifest.postSaveProfilePath), outDir), "ENTRY_POST_SAVE_PROFILE_PATH_INVALID");
  const postSaveFile = readArtifact(manifest.postSaveProfilePath, LIMITS.json);
  const postSaveProfile = parseJson(postSaveFile);
  const moduleFile = readArtifact(profile.module?.path, LIMITS.module);
  check(Array.isArray(profile.orderedHakList) && profile.orderedHakList.length > 0
    && profile.orderedHakList.length <= 256, "ENTRY_HAK_LIST_INVALID");
  const haks = profile.orderedHakList.map((hak) => readArtifact(hak.path, LIMITS.hak).identity);
  const result = validateBinaryEntrySurfaceSource({ manifest, profile, postSaveProfile,
    identities: { profile: profileFile.identity, manifest: manifestFile.identity,
      postSaveProfile: postSaveFile.identity, module: moduleFile.identity, haks },
    packed: readEntrySurfaceModuleBytes(moduleFile.bytes, profile.area?.resref),
  });
  // Detect concurrent changes across the multi-file snapshot. A rejected
  // snapshot never changes any source manifest or other artifact.
  for (const [identity, limit] of [[profileFile.identity, LIMITS.json], [manifestFile.identity, LIMITS.json],
    [postSaveFile.identity, LIMITS.json], [moduleFile.identity, LIMITS.module], ...haks.map((hak) => [hak, LIMITS.hak])]) {
    const current = readArtifact(identity.path, limit).identity;
    check(current.sha256 === identity.sha256 && current.bytes === identity.bytes, "ENTRY_SOURCE_CHANGED_DURING_INSPECT");
  }
  return result;
}

export function runEntrySurfaceInspectCommand(command, argv) {
  try {
    if (command === "geometry-finalize") return { ok: false, command, status: "legacy_unqualified", blockerCode: "ENTRY_V1_REQUALIFICATION_REQUIRED", requiresRequalification: true, safety: { ...ENTRY_READ_ONLY_SAFETY } };
    const allowed = {
      "geometry-entry-surface-inspect": ["--profile", "--outDir"],
      "geometry-entry-surface-arm": ["--profile", "--outDir", "--evidenceDir"],
      "geometry-entry-surface-ingest": ["--evidenceDir", "--handoff"],
      "geometry-entry-surface-finalize": ["--evidenceDir"],
      "geometry-entry-surface-validate": ["--geometryProfile"],
      "validate-geometry": ["--geometryProfile", "--profile", "--outDir"],
    }[command];
    check(allowed, "ENTRY_COMMAND_UNAVAILABLE");
    const options = {};
    for (let index = 0; index < argv.length; index += 2) {
      const key = argv[index], value = argv[index + 1];
      check(allowed.includes(key) && typeof value === "string"
        && value.length > 0 && !value.startsWith("--") && options[key] === undefined, "ENTRY_ARGUMENT_INVALID");
      options[key] = value;
    }
    if (command.endsWith("-arm")) {
      check(options["--profile"] && options["--outDir"] && options["--evidenceDir"], "ENTRY_ARGUMENT_MISSING");
      return armEntrySurface({ profilePath: options["--profile"], outDir: options["--outDir"], evidenceDir: options["--evidenceDir"] });
    }
    if (command.endsWith("-ingest")) { check(options["--evidenceDir"] && options["--handoff"], "ENTRY_ARGUMENT_MISSING"); return ingestEntrySurface({ evidenceDir: options["--evidenceDir"], handoffPath: options["--handoff"] }); }
    if (command.endsWith("-finalize")) { check(options["--evidenceDir"], "ENTRY_ARGUMENT_MISSING"); return finalizeEntrySurface({ evidenceDir: options["--evidenceDir"] }); }
    if (command.endsWith("-validate") || command === "validate-geometry") {
      check(options["--geometryProfile"], "ENTRY_ARGUMENT_MISSING");
      const result = validateGeometryArtifact(options["--geometryProfile"]);
      return { ok: result.status === "verified", command, ...result, safety: { ...ENTRY_READ_ONLY_SAFETY } };
    }
    check(options["--profile"] && options["--outDir"], "ENTRY_ARGUMENT_MISSING");
    return { ok: true, command, ...loadBinaryEntrySurfaceSource({ profilePath: resolve(options["--profile"]), outDir: resolve(options["--outDir"]) }) };
  } catch (error) {
    const writesEvidence = ["geometry-entry-surface-arm", "geometry-entry-surface-ingest", "geometry-entry-surface-finalize"].includes(command);
    return { ok: false, command, blockerCode: error.code ?? "ENTRY_SOURCE_INSPECTION_FAILED",
      message: String(error.message ?? error).slice(0, 1000),
      proofClaimed: false, runtimeClaimed: false, safety: { ...ENTRY_READ_ONLY_SAFETY,
        ...(writesEvidence ? { readsSavedFilesOnly: false, writesNewEvidenceOnly: true, partialArtifactsMayRemain: true } : {}) } };
  }
}

function readArtifact(path, limit) {
  check(typeof path === "string" && path.length > 0, "ENTRY_FILE_PATH_INVALID");
  const absolute = resolve(path);
  const before = statSync(absolute);
  check(before.isFile() && before.size > 0 && before.size <= limit, "ENTRY_FILE_BUDGET_INVALID");
  const bytes = readFileSync(absolute), after = statSync(absolute);
  check(bytes.length === before.size && before.size === after.size && before.mtimeMs === after.mtimeMs,
    "ENTRY_FILE_CHANGED_DURING_READ");
  return { identity: { path: absolute, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length }, bytes };
}
function parseJson(file) { try { return JSON.parse(file.bytes.toString("utf8")); } catch { const error = new Error("ENTRY_JSON_INVALID"); error.code = "ENTRY_JSON_INVALID"; throw error; } }
function samePath(a, b) { return typeof a === "string" && typeof b === "string" && resolve(a).toLowerCase() === resolve(b).toLowerCase(); }
function check(condition, code) { if (!condition) { const error = new Error(code); error.code = code; throw error; } }
