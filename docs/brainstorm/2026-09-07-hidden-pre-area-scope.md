# Same-owner hidden pre-Area continuation

Implementation scope: one existing binary-bootstrap owned clean frame becomes
hidden before Area dispatch. Preserve the original failure and reuse the exact
PID/full StartTime/HWND/module with the existing no-activate restore atom.
No new native transport, module opener, process, human witness, asset mutation,
or change to `$pid`. Authoring/rendering semantics are unchanged; this is native
workflow admission. The existing Area opener's visibility guard precedes any
TreeView/process-memory mutation. Its exact source block will be exercised in
an isolated PowerShell fixture to reproduce the missing state transition.

Acceptance: packet and fresh-state negative contracts, extracted PowerShell
render/parse and admission tests, one-attempt durable receipts, original packet
preservation and same public geometry operation after fresh visible readback.
Implementation and testing are offline in this isolated checkout; the consumer
owns any later live dry-run and execution. No positive native result is claimed.

Completed as `aurora-hidden-pre-area-continuation/v1`: 36 focused tests pass,
including execution of the extracted Area visibility guard, parent failure
reproduction and actual restore guard against mocked Win32. The final combined
regression set passes 66 tests plus 43 runtime-window cases. Delivery preserves
the original failed manifest/queue and does not change `$pid`.

The separate Save/readback-to-S07 extension is documented in
[native-save-runtime-handoff](2026-09-07-native-save-runtime-handoff.md).
