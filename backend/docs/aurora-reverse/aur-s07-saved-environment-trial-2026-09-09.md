# Saved environment runtime trial

The public binary bootstrap validator additionally consumes
`aurora-toolset-binary-environment-profile/v1`, proofKind
`skybox-environment-trial`. It requires zero model fixtures, the exact module
entry, the full ordered HAK stack, ARE/GIT/GIC hashes, first-HAK resource hashes,
and a matching typed SkyBox BYTE. The Area may contain original world objects.
This profile is for bootstrap `preflight` and `open`, followed by the existing
public `aurora-toolset-rebuild.mjs` stages. It is not a model geometry profile.

The public S07 runtime route accepts `aur-s07-saved-environment-admission/v1`
with scope `saved-environment-runtime-trial`. References `savedProfile`,
`ownerManifest` and `rebuildReceipt` each contain path and SHA-256. The owner
also pins the original profile. Admission re-runs current structural validation,
requires the unchanged environment and entry, identical ordered HAKs, exact
native owner, clean saved frame and a native rebuild reporting No errors found.
Only the resulting saved MOD hash is admitted. Its sole logical fixture is a
runtime-player observation, never an invented GIT creature.

Both runtimeClaimed and walkabilityClaimed must be false. The legacy geometryGate
field carries this typed admission; verified means the trial admission passed,
not that geometry, sky rendering or runtime correctness was already proven.
No viewport proof is claimed by opening or rebuilding. Actual runtime inspection
must follow through existing guarded Test Module, observation, window placement
and physical capture stages. No native atom or transport was added.

Offline validation: seven environment/empty-Area unit cases, seven existing
entry-binding/CLI/frame cases and binary-native-geometry contract pass. The
older `test-aur-s07-runtime-execution-contract.mjs` fixture writes only
`{status:verified}` as its geometry artifact and fails existing typed geometry
validation with ENTRY_GEOMETRY_VERSION_INVALID; that unrelated legacy fixture
was not relaxed. The current v2 public CLI regression passes.
