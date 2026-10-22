# 07B title validation: preserve the completed open and finish admission

Date: 2026-09-06. Scope: the observed generic post-open
`REOPEN_READY_MODULE_MISMATCH` failure only. No new launch, preparation, Area
opening, Save, close, input or capture transport is introduced.

## Observed failure and correction

The existing public preparation successfully opened the exact saved r8 MOD and
Area. The final reopen validator then rejected the real window title:
`BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - wyrok08a.mod`.
Its previous comparison invented the shorter application prefix used by a
synthetic fixture. The correction reuses the existing canonical prep-contract
module-name parser, exposed as `parseModuleNameFromTitle`; the regex and native
preparation behavior are unchanged. Dirty, wrong-MOD and similar-name titles
are still rejected. Tests first reproduced the actual recorded title failure.

## Explicit continuation

The original request, source and producer hashes are never rewritten.
`title-validation-upgrade.json` is a separate reviewed compatibility record
binding the exact failed request, blocker, original state, successful prep,
profiles and child steps, plus the previous and corrected producer sets.
Only the four reviewed validation/dispatch source files may change; additions
are limited to the named title-continuation helper. Unrelated source drift,
missing/removed files or a different failure packet are rejected.

The new public commands use the **same existing native inspector**. They never
call prepare or open. A fresh observation must match the original successful
cold-open PID/full StartTime and saved ready/failure frame/viewer/viewport,
exact module/Area, clean responsive state, no NWN/modals, and DISPLAY1 nonprimary.
All original MOD/profile/manifest/ordered-HAK identities are read again.

The original 30-minute request deadline is checked using the actual clock,
before inspection and again during admission. The historical failure state is
used only for identity/history. It is never treated as fresh, and there is no
clock override, timestamp rewrite or expiry extension in the public interface.

Dry-run writes nothing. Successful live continuation creates only
`title-validation-resume/state-admission.json`, a snapshot of the upgrade
record, and the previously missing `reopen-receipt.v1.json`. The old blocker and
all old evidence remain. The receipt records
`aurora-entry-reopen-title-validation-resume/v1`; ARM checks the corrected code
set and snapshots/revalidates the full compatibility chain. A failed or partial
continuation is preserved and must not be manually cleared or replayed.

## Exact same-session commands

From `C:/Projects/aurora-web`, after reviewing the patch and upgrade SHA:

```powershell
node backend/scripts/prepare-aurora-model-proof-120s.mjs entry-reopen-resume-title-validation-dry-run --reopenDir C:/Projects/aurora-web/output/native-entry-07b/r8-reopen-01 --upgradeManifest C:/Projects/aurora-web/output/native-entry-07b/title-validation-upgrade.json
node backend/scripts/prepare-aurora-model-proof-120s.mjs entry-reopen-resume-title-validation --reopenDir C:/Projects/aurora-web/output/native-entry-07b/r8-reopen-01 --upgradeManifest C:/Projects/aurora-web/output/native-entry-07b/title-validation-upgrade.json
```

This exact preserved request is `d04e5e69-34c5-477b-a9d4-f1cbf985a30b`, created
`2026-09-06T09:44:45.841Z`, expiring **2026-09-06T10:14:45.841Z**. The successful
open owner was PID29632 / Start `2026-09-06T09:45:00.8541894Z`, frame264758,
viewer658776, viewport658764. These are historical bindings; the commands must
observe them again. If the deadline, source or session has changed, stop.
Do not run `entry-reopen` again or edit the old request to bypass rejection.

After successful receipt creation and actual human readiness, the existing
`entry-reopen-arm` command uses that receipt and the still-new
`output/native-entry-07b/r8-human-paint-01` directory. Actual human Paint/Save,
response, bound capture, ingest/finalize and NWN acceptance remain required.
The diagnostic frame already captured by the consumer is not a Paint witness.

## Offline validation and provenance

77 tests passed before deployment, including the actual retail title, negative
module names, restricted producer upgrade, original-expiry rejection, foreign
current owner, preservation of the failed packet, and a complete simulated
resume → ARM → Paint/Save → geometry/v2 flow. Public resume rejects fixture
flags; its native inspector was never executed by the implementation team.
Simulated timestamps and human responses exist only in explicitly labelled tests.

The original deployment and cold-open-owner patch manifests remain unchanged.
This patch's before/after hashes are recorded separately in
`output/native-entry-07b/title-validation-patch-deployment.json`, and the
reviewed exact failed-packet/code bridge is
`output/native-entry-07b/title-validation-upgrade.json`. No source file or
artifact in the owned failed packet is changed by delivery.
