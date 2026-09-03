const SHA256 = /^[a-f0-9]{64}$/u;
const OPTION_NAMES = Object.freeze([
  "--placeholder-exclusion-mode",
  "--placeholder-evidence-profile",
  "--placeholder-evidence-profile-sha256"
]);

function readUniqueOption(argv, name) {
  const indexes = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === name) indexes.push(index);
  }
  if (indexes.length > 1) throw new Error(`${name} must not be repeated.`);
  if (indexes.length === 0) return null;
  const value = argv[indexes[0] + 1];
  if (typeof value !== "string" || !value.trim() || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value.trim();
}

export function parseAreaTilePlaceholderExclusionConfig(argv) {
  if (!Array.isArray(argv)) throw new Error("Placeholder exclusion arguments are invalid.");
  const values = Object.fromEntries(
    OPTION_NAMES.map((name) => [name, readUniqueOption(argv, name)])
  );
  const mode = values["--placeholder-exclusion-mode"]?.toLowerCase();
  const profilePath = values["--placeholder-evidence-profile"];
  const profileSha256 = values["--placeholder-evidence-profile-sha256"]?.toLowerCase() ?? null;
  if (!mode) throw new Error("--placeholder-exclusion-mode <none|evidence-profile> is required.");
  if (mode === "none") {
    if (profilePath || profileSha256) {
      throw new Error("Placeholder exclusion mode none must not include a placeholder evidence profile.");
    }
    return Object.freeze({ mode, profilePath: null, profileSha256: null });
  }
  if (mode !== "evidence-profile") {
    throw new Error("--placeholder-exclusion-mode must be none or evidence-profile.");
  }
  if (!profilePath || !profileSha256) {
    throw new Error("Placeholder exclusion mode evidence-profile requires both placeholder evidence profile arguments.");
  }
  if (!SHA256.test(profileSha256)) {
    throw new Error("Placeholder evidence profile SHA-256 must be exact and lowercase.");
  }
  return Object.freeze({ mode, profilePath, profileSha256 });
}
