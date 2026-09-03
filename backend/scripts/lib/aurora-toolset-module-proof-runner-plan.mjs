export const AURORA_MODULE_PROOF_RUNNER_VERSION = "1.0.0";

export const DEFAULT_AURORA_MODULE_PROOF_CONFIG = Object.freeze({
  module: "codex_runner_proof",
  area: "proof_area",
  tileset: "MicroSet",
  size: "Tiny",
  hak: "m2a_codex_aproof",
  creature: "Dwarf Mercenary",
  appearance: "M2A_M6_PROOF",
  hardDeadlineMs: 240_000,
});

const STAGES = Object.freeze([
  {
    id: "preflight",
    deadlineMs: 5_000,
    proof: ["zero nwtoolset processes", "toolset executable exists"],
  },
  {
    id: "module-and-area",
    deadlineMs: 45_000,
    proof: ["new-module wizard closed", "area wizard closed", "module frame restored"],
  },
  {
    id: "initial-save",
    deadlineMs: 65_000,
    proof: ["exact module frame title", "wizard-created non-empty MOD file"],
  },
  {
    id: "hak",
    deadlineMs: 105_000,
    proof: ["exact HAK list readback", "build dialog closed", "frame enabled"],
  },
  {
    id: "creature",
    deadlineMs: 145_000,
    proof: ["exact palette leaf", "creatures +1", "Select Objects restored"],
  },
  {
    id: "appearance",
    deadlineMs: 180_000,
    proof: ["one Creature Properties dialog", "exact appearance text readback"],
  },
  {
    id: "save-and-readback",
    deadlineMs: 215_000,
    proof: ["dirty marker cleared", "MOD timestamp/hash changed", "one target creature in tree"],
  },
  {
    id: "visual-proof",
    deadlineMs: 235_000,
    proof: ["validated TScrollBox viewport PNG", "Creature Properties/appearance PNG"],
  },
]);

export function buildAuroraModuleProofRunnerPlan(input = {}) {
  const config = validateAuroraModuleProofRunnerConfig({
    ...DEFAULT_AURORA_MODULE_PROOF_CONFIG,
    ...input,
  });
  return {
    version: AURORA_MODULE_PROOF_RUNNER_VERSION,
    config,
    stages: STAGES.map((stage, index) => ({
      ...stage,
      ordinal: index,
      remainingAfterStageMs: config.hardDeadlineMs - stage.deadlineMs,
    })),
    invariants: [
      "No global cursor, mouse, or keyboard input.",
      "Resolve HWNDs again after every modal, wizard page, palette change, and HAK rebuild.",
      "Select HAK and Appearance by exact text, never by remembered index.",
      "Every mutation has an immediate native readback.",
      "A rainbow placeholder is FAILED, not visual proof.",
      "The runner stops at the hard deadline instead of continuing discovery.",
    ],
  };
}

export function validateAuroraModuleProofRunnerConfig(input) {
  const hakInput = text(input.hak, "hak");
  if (hakInput.toLowerCase().endsWith(".hak")) {
    throw new Error("hak must be a Toolset resref without the .hak extension.");
  }
  const config = {
    module: resref(input.module, "module"),
    area: resref(input.area, "area"),
    tileset: text(input.tileset, "tileset"),
    size: text(input.size, "size"),
    hak: resref(hakInput, "hak"),
    creature: text(input.creature, "creature"),
    appearance: text(input.appearance, "appearance"),
    hardDeadlineMs: positiveInteger(input.hardDeadlineMs, "hardDeadlineMs"),
  };
  if (config.hardDeadlineMs > 240_000) {
    throw new Error("hardDeadlineMs must not exceed 240000.");
  }
  return config;
}

function resref(value, name) {
  const result = text(value, name);
  if (!/^[a-z0-9_]{1,32}$/iu.test(result)) {
    throw new Error(`${name} must be a 1-32 character Aurora resref.`);
  }
  return result;
}

function text(value, name) {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`${name} is required.`);
  return result;
}

function positiveInteger(value, name) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return result;
}
