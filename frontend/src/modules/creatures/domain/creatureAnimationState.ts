export interface CreatureAnimationStateClipResolution {
  readonly state: number;
  readonly label?: string;
  readonly loopMode?: "loop" | "once";
  readonly candidateClipNames: readonly string[];
  readonly matchedClipName?: string;
}

interface CreatureAnimationStateDefinition {
  readonly label: string;
  readonly loopMode: "loop" | "once";
  readonly candidateClipNames: readonly string[];
}

// State values come from retail nwscript.nss; aliases are verified against retail MDL clips.
const CREATURE_ANIMATION_STATE_DEFINITIONS = new Map<number, CreatureAnimationStateDefinition>([
  [0, { label: "looping pause", loopMode: "loop", candidateClipNames: ["cpause1", "pause1"] }],
  [1, { label: "looping pause 2", loopMode: "loop", candidateClipNames: ["cpause2", "pause2"] }],
  [2, { label: "looping listen", loopMode: "loop", candidateClipNames: ["clisten", "listen"] }],
  [3, { label: "looping meditate", loopMode: "loop", candidateClipNames: ["cmeditate", "meditate"] }],
  [4, { label: "looping worship", loopMode: "loop", candidateClipNames: ["cworship", "worship"] }],
  [5, { label: "looping look far", loopMode: "loop", candidateClipNames: ["clookfar", "lookfar"] }],
  [6, { label: "looping sit chair", loopMode: "loop", candidateClipNames: ["csit", "sit"] }],
  [7, { label: "looping sit cross", loopMode: "loop", candidateClipNames: ["csitcross", "sitcross"] }],
  [8, { label: "looping talk normal", loopMode: "loop", candidateClipNames: ["ctlknorm", "tlknorm"] }],
  [9, { label: "looping talk pleading", loopMode: "loop", candidateClipNames: ["ctlkplead", "tlkplead"] }],
  [10, { label: "looping talk forceful", loopMode: "loop", candidateClipNames: ["ctlkforce", "tlkforce"] }],
  [11, { label: "looping talk laughing", loopMode: "loop", candidateClipNames: ["ctlklaugh", "tlklaugh"] }],
  [12, { label: "looping get low", loopMode: "loop", candidateClipNames: ["cgetlowlp", "getlowlp", "cgetlow", "getlow"] }],
  [13, { label: "looping get mid", loopMode: "loop", candidateClipNames: ["cgetmidlp", "getmidlp", "cgetmid", "getmid"] }],
  [14, { label: "looping pause tired", loopMode: "loop", candidateClipNames: ["cpausetrd", "pausetrd"] }],
  [15, { label: "looping pause drunk", loopMode: "loop", candidateClipNames: ["cpausepsn", "pausepsn"] }],
  [16, { label: "looping dead front", loopMode: "loop", candidateClipNames: ["cdead", "dead"] }],
  [17, { label: "looping dead back", loopMode: "loop", candidateClipNames: ["ckdbckdie", "kdbckdie", "deadbck"] }],
  [18, { label: "looping conjure 1", loopMode: "loop", candidateClipNames: ["cconjure1", "conjure1"] }],
  [19, { label: "looping conjure 2", loopMode: "loop", candidateClipNames: ["cconjure2", "conjure2"] }],
  [20, { label: "looping spasm", loopMode: "loop", candidateClipNames: ["cspasm", "spasm"] }],
  [41, { label: "mount 1", loopMode: "loop", candidateClipNames: ["cmount1lp", "mount1lp"] }],
  [42, { label: "dismount 1", loopMode: "loop", candidateClipNames: ["cdismount1lp", "dismount1lp"] }],
  [100, { label: "head turn left", loopMode: "once", candidateClipNames: ["chturnl", "hturnl"] }],
  [101, { label: "head turn right", loopMode: "once", candidateClipNames: ["chturnr", "hturnr"] }],
  [102, { label: "pause scratch head", loopMode: "once", candidateClipNames: ["cpausesh", "pausesh"] }],
  [103, { label: "pause bored", loopMode: "once", candidateClipNames: ["cpausebrd", "pausebrd"] }],
  [104, { label: "salute", loopMode: "once", candidateClipNames: ["csalute", "salute"] }],
  [105, { label: "bow", loopMode: "once", candidateClipNames: ["cbow", "bow"] }],
  [106, { label: "steal", loopMode: "once", candidateClipNames: ["csteal", "steal"] }],
  [107, { label: "greeting", loopMode: "once", candidateClipNames: ["cgreeting", "greeting"] }],
  [108, { label: "taunt", loopMode: "once", candidateClipNames: ["ctaunt", "taunt"] }],
  [109, { label: "victory 1", loopMode: "once", candidateClipNames: ["cvictorymg", "victorymg"] }],
  [110, { label: "victory 2", loopMode: "once", candidateClipNames: ["cvictoryth", "victoryth"] }],
  [111, { label: "victory 3", loopMode: "once", candidateClipNames: ["cvictoryfr", "victoryfr"] }],
  [112, { label: "read", loopMode: "once", candidateClipNames: ["cread", "read"] }],
  [113, { label: "drink", loopMode: "once", candidateClipNames: ["cdrink", "drink"] }],
  [114, { label: "dodge side", loopMode: "once", candidateClipNames: ["cdodgelr", "dodgelr"] }],
  [115, { label: "dodge duck", loopMode: "once", candidateClipNames: ["cdodges", "dodges"] }],
  [116, { label: "spasm", loopMode: "once", candidateClipNames: ["cspasm", "spasm"] }]
]);

function resolveCustomAnimationStateDefinition(
  state: number
): CreatureAnimationStateDefinition | undefined {
  if (state < 21 || state > 92 || state === 41 || state === 42) {
    return undefined;
  }
  const customNumber = state <= 40 ? state - 20 : state - 22;
  return {
    label: `looping custom ${customNumber}`,
    loopMode: "loop",
    candidateClipNames: [`ccustom${customNumber}lp`, `custom${customNumber}lp`]
  };
}

export function resolveCreatureAnimationStateClip(
  state: number,
  availableClipNames: readonly string[]
): CreatureAnimationStateClipResolution {
  const normalizedState = Math.trunc(state);
  const definition =
    CREATURE_ANIMATION_STATE_DEFINITIONS.get(normalizedState) ??
    resolveCustomAnimationStateDefinition(normalizedState);
  if (!definition) {
    return {
      state: normalizedState,
      candidateClipNames: []
    };
  }

  const availableByNormalizedName = new Map<string, string>();
  availableClipNames.forEach((clipName) => {
    const normalizedName = clipName.trim().toLowerCase();
    if (normalizedName && !availableByNormalizedName.has(normalizedName)) {
      availableByNormalizedName.set(normalizedName, clipName);
    }
  });
  const matchedClipName = definition.candidateClipNames
    .map((candidate) => availableByNormalizedName.get(candidate))
    .find((candidate): candidate is string => Boolean(candidate));

  return {
    state: normalizedState,
    label: definition.label,
    loopMode: definition.loopMode,
    candidateClipNames: definition.candidateClipNames,
    ...(matchedClipName ? { matchedClipName } : {})
  };
}
