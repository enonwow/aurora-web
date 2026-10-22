# NWN per-window observation scope

The authorized change adds an explicit generic PrintWindow observation method
to the existing central PNG/video public entrypoints and NWN MCP capture.
Physical proof gates remain separate. No game/module/asset/settings mutation,
launcher, fixture classifier, product rendering change or new local runner is
part of this scope. This is a Win32 capture/identity contract; no unknown Aurora
format or rendering semantic is implemented.

The canonical procedure, provenance, limits and test command are maintained in
[the AUR-S07 per-window observation section](../../backend/docs/aurora-reverse/aur-s07-runtime-execution-standard.md#discriminated-per-window-observation)
and its [capture safety boundary](../../backend/docs/aurora-reverse/proof-capture-safety-contract-2026-07-10.md).
Offline contract verification does not establish current live game acceptance.
