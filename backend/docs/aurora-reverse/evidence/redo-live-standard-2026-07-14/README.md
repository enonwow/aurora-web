# Undo/Redo live run — verified negative result

Werdykt funkcji: `failed`, blocker `redo_no_structural_delta`.
Status roadmapy `AUR-S02-09` pozostaje `CZĘŚCIOWO`.

Jedna sesja Aurora PID `29136` wykonała kontrolowaną mutację `Adjust Location`
dla `nw_dwarfmerc001`, targeted Undo i natychmiastowy targeted Redo. Read-only
probe natywnych `TBBUTTON` potwierdził:

| Faza | Undo enabled | Redo enabled |
| --- | --- | --- |
| po mutacji | true | false |
| po Undo | false | true |
| po Redo | true | false |

Jednak końcowy zapisany GIT miał ten sam SHA-256 co baseline
`e9bc923e...8d37`, a pozycja pozostała `(60.97, 27.18, 0)` zamiast żądanej
`(61.47, 27.18, 0.25)`. Stany toolbaru nie są więc samodzielnym proofem Redo.

Dowody: [mutation](30-retry-location-action.json),
[before Undo](31-retry-toolbar-before-undo.json),
[after Undo](33-retry-toolbar-after-undo.json),
[after Redo](35-retry-toolbar-after-redo.json),
[baseline GIT](retry-baseline/demo-retry-baseline/raw.git.summary.json),
[after Redo GIT](retry-redo/demo-retry-redo/raw.git.summary.json) oraz
[negative validator](validator-result.json).
