# Toolset AV 004EC141 Investigation

Status: blocking oracle incident, 2026-07-10

## Observed Proof

- Approved target: `C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city - codex.mod`.
- The single supervised module start reached the expected Toolset frame on
  `DISPLAY2` (`left=-8`, `top=-8`) before any Area command was sent.
- Aurora displayed: `Access violation at address 004EC141 in module
  'nwtoolset.exe'. Write of address 000003F4.`
- The same process also displayed `Loading Inventory List`.
- The pre-start `MRU0` value already equalled the approved ASCII module path;
  the launcher reported the same value before and after staging.
- This incident payload predates the action-trace fields, so it does not prove
  whether the Welcome/Open dialog path submitted zero or one module selection.
- The saved read-only `PrintWindow` proof is
  `backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-av-004ec141-the-last-city-codex-20260710T155247Z.png`.

This is a Toolset initialization blocker. It is not an `_IKEA` Area proof and
does not permit any Area visual-comparison claim.

## Decompiled Mapping

Source of truth: `C:\Projects\New Folder\export\decompiled_all.c` and
`functions.tsv`.

- `FUN_004ebe24` starts at `004EBE24` and has 1031 bytes, so it contains
  `004EC141`.
- Disassembly of the installed `nwtoolset.exe` at the fault is:

```text
004EC136  call 004EC3C4
004EC13B  mov  edi, dword ptr [ebx + 0x360]
004EC141  mov  dword ptr [edi + 0x3f4], 2
```

- The corresponding decompilation is `FUN_004ec3c4((int)param_1);`, followed
  by `iVar7 = param_1[0xd8]; *(undefined4 *)(iVar7 + 0x3f4) = 2;`.

Therefore the fault proves that `param_1[0xd8]` was null at this instruction.
The available export does not identify which call established or cleared that
field, so it does not prove a module-data, Area-data, or tile-data cause.
It also does not, by itself, prove a duplicate module-open command.

## Safety Outcome

- No Area was opened after the module start.
- No retry, second `Open Module`, second Toolset start, recovery action, or
  global input was sent.
- `temp0` from the previous session was archived intact before the start:
  834 files and 41,504,436 bytes.
- The original `.mod` SHA-256 was identical before and after that archive:
  `B774037F160A9BE3FCC0E985DDE880A0AE97E10AF2BF868C38A3F6573CBB021E`.

The entire Area oracle queue remains blocked until a separately justified
initialization fix is proven on a clean supervised session.
