# Copy/Paste live proof — 2026-07-14

Verdict: **BLOCKED / function not accepted**. Roadmap: `AUR-S02-06` remains
only `CZĘŚCIOWO`.

## What Aurora proved

- one real Toolset session ran on PID `22912`, frame `9833992`, on `DISPLAY1`;
- the corrected popup helper invoked the exact native item `C&opy`, ID `10`,
  position `4`, by clicking the item center with targeted window messages;
- after exact Copy the module title stayed clean, so Copy did not remove or
  mutate the selected creature;
- native Edit/Paste, command ID `61`, remained disabled after Copy;
- the session closed cleanly with zero Toolset processes;
- the working module ended at the exact approved SHA-256
  `E422D6169727374323775D49B989101DAC24059F0AFB99820700725ADC6C20D0`.

Therefore the helper correction is proven, but Copy/Paste as a complete
function is not proven. The blocker is
`paste_disabled_after_exact_tree_copy`.

## Preserved negative regression

The previous HOME/DOWN/ENTER popup helper reported `C&opy` but dirtied the
module and removed objects. Two native Undos restored the counters
(`creatures 6`, `total 18`), but not the exact object ordering:

- baseline `objects.csv`: `BD25047F...7C491`;
- recovered `objects.csv`: `21BD7B05...38D90`.

That run was rejected, copied to `unsafe-helper-negative/`, and the module was
restored byte-for-byte from the approved BackupMod before the corrected run.

## Direct evidence

- [exact Copy action](exact-copy-blocked/03-copy-fixed-action.json)
- [Aurora after exact Copy](exact-copy-blocked/04-after-copy.png)
- [native menu state after Copy](exact-copy-blocked/05-main-menu-after-copy.json)
- [clean close state](exact-copy-blocked/session-state.json)
- [final hashes and zero-process snapshot](final-state.json)
- [machine-readable verdict](summary.json)
- [validator result](validator-result.json)

The function may be promoted to `TAK` only after a real Aurora run proves
exactly one new saved GIT record, isolated `+1`, screenshot evidence, and an
exact rollback.
