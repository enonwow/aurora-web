# Binary explicit-open v3 semantic-OK audit

Status: `MISSING AURORA SEMANTIC EVIDENCE`; no Toolset, module, HAK, INI, MRU,
or process mutation was performed by this audit.

## Preserved live evidence

The v3 packet for the unchanged `m2a_now01` binary-bootstrap candidate records:

- `Open an existing Module=checked` and `Start normally=unchecked` before,
  after `BM_SETCHECK`, and after synchronous radio `BM_CLICK`;
- a posted Welcome `OK` message;
- two different post-Welcome progress windows: an empty `TdlgProgress` and a
  separate `Loading Custom Palettes` `TdlgProgress`;
- no exact module-list selection and no handled Open dialog; and
- a wrong `m2a_m0r25.mod` frame owned as external startup loading.

Therefore neither radio-group state nor accepting a posted `OK` proves the
semantic transition selected by the Welcome dialog. The candidate has not
reached Toolset geometry, visual, or NWN runtime work:
`modelVisibility=not_tested`, `proofCompleteness=missing`.

## Aurora reverse evidence

The retail `nwtoolset.exe` RCDATA `TDLGWELCOME` resource is at RVA
`0x00BBD438` in the existing RCDATA audit. It identifies:

- form class `TdlgWelcome`;
- radio components `rbOpenExisting` and `rbDoNothing` (`Start normally`);
- a default `TButton`; and
- an `OnClick` method name `bOKClick`.

The resource does **not** contain `ModalResult`. Unlike the separately audited
Area Resize form, its positive transition is consequently custom handler
semantics rather than a resource-proven `ModalResult=1` close. The RCDATA
method name does not provide a code address, a VMT method-table xref, a dialog
control ID, or the implementation of `TdlgWelcome.bOKClick`.

## Existing local-client click precedent

`click-aurora-toolset-dialog-button-client-no-global-input.mjs` is a verified
precedent for exact `TdlgLocation` `Apply`/`OK`: it resolves one visible enabled
button and synchronously sends local-client `WM_LBUTTONDOWN` and
`WM_LBUTTONUP`, then verifies its declared close outcome. It is composed only
by the vertical-slice Adjust Location recovery.

It is not an automatically transferable Welcome transport:

1. it uses synchronous `SendMessage`, while `bOKClick` may create a successor
   Open dialog or progress window;
2. it is proved only for `TdlgLocation`, not `TdlgWelcome`;
3. the shared scripts have asynchronous local-client clicks for tabs and list
   controls, but no verified asynchronous **modal TButton** precedent whose
   success condition is disappearance of one dialog plus creation of another;
4. the Welcome resource has custom `bOKClick` semantics, so simple dialog
   disappearance would not prove that the exact Open path was chosen.

`WM_COMMAND/BN_CLICKED`, focus activation, a different `BM_CLICK` transport,
or a direct/internal atom call are not evidenced substitutes and remain
prohibited.

## Exact missing reverse artifact

The missing artifact is the code pointer and xref chain for
`TdlgWelcome.bOKClick` in this retail Toolset build, including the branch for
`rbOpenExisting` and the native transition which creates the module-list
dialog. The current workspace contains the RCDATA extraction but no mounted
Ghidra project/export or `analyzeHeadless` executable that exposes this xref.

The next safe investigation is read-only static research on a copy of:

```text
C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe
```

In Ghidra: parse the `TDLGWELCOME` Delphi form resource, resolve the
`bOKClick` method-table entry for class `TdlgWelcome`, then record the method
address, all branches from the `rbOpenExisting` condition, and the call that
creates or populates the module-list dialog. Export the decompiler listing and
xref table as the new audit artifact. This is static-only work and does not
touch PID 51048.

## Publication gate for a future route

A new public startup route may be added only after the preceding reverse
artifact identifies one native transition. Its contract must require one clean
Welcome, one exact enabled `OK` target, asynchronous message posting, bounded
modal drain, Welcome disappearance, exactly one exact module-list dialog, and
visible exact-list selection readback. It must fail before any wrong module is
accepted. Add an executable contract test and a negative MRU-wins test before
any live execution.

Until then preserve the v1/v2/v3 packets and responsive PID 51048. No archive,
restart, close, retry, File/Open, INI/MRU write, or model classification is
authorized by this audit.
