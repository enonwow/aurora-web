# Audyt domknięcia Etapu 2 — zaznaczanie i transformacje

Data: 2026-07-14  
Zakres: AUR-S02-01, AUR-S02-03, AUR-S02-06, AUR-S02-07 i AUR-S02-10.

## Werdykt

Pakiet audytowy Etapu 2 jest domknięty: cztery funkcje mają zaakceptowany,
native live proof, a `AUR-S02-07` pozostaje **blokadą**, nie wynikiem
pozytywnym. Nie oznacza to, że wszystkie funkcje Etapu 2 są zielone.

| ID | Status | Co dowodzi wyniku | Jawna granica |
| --- | --- | --- | --- |
| AUR-S02-01 | TAK | [selection/adjust-location proof](evidence/object-selection-adjust-location-live-standard-2026-07-14/README.md), manifest i validator `ok=true`. | Zaznaczenie jednego obiektu bez overlapu. |
| AUR-S02-03 | TAK | Ten sam proof: native `Adjust Location`, zapisany GIT i native Undo do baseline. | Nie dowodzi dragowania myszą. |
| AUR-S02-06 | TAK — placeable | [copy/paste proof](evidence/copy-paste-placeable-live-2026-07-14/README.md): `Copy 59`, `Paste 61`, commit preview, `18→19`, Undo `56`, parserowy rollback. | Dotyczy `Water Trough`, nie każdej rodziny obiektów. |
| AUR-S02-07 | BLOKADA — niezaliczone | [native action discovery](evidence/stage2-native-action-discovery-2026-07-14/README.md) oraz manifest: w zasobie głównego menu i w sesji live brak `Duplicate`. | Nie zgadywać identyfikatora komendy; wznowić po znalezieniu aktywnej akcji kontekstowej/paletowej. |
| AUR-S02-10 | TAK — deterministic topmost selection | [overlap proof](evidence/overlap-topmost-selection-live-2026-07-14/README.md): dwa obiekty różnych rodzin w tych samych współrzędnych GIT, dwa kliknięcia, ten sam caret `Water Trough`/HWND, `18→20→18`, dwa Undo, czyste zamknięcie. | Nie dowodzi cycling ani zaznaczenia obiektu zasłoniętego. |

## Integralność ostatniej sesji overlapu

- Jeden PID Toolsetu (`16740`) obsłużył pełny przebieg `place → save → select
  twice → undo twice → save`; nie było restartu między funkcjami.
- Sterowanie było targetowane do kontrolek Toolsetu; artefakty raportują
  `globalInput=false`.
- Parserowy `objects.csv` po rollbacku jest byte-identical z baseline.
- Kontener `.mod` ma inny hash po clean close, ponieważ Toolset go repackuje;
  nie jest to przedstawione jako exact-container rollback.

## Artefakty i walidacja

- [Overlap summary](evidence/overlap-topmost-selection-live-2026-07-14/summary.json)
- [Overlap validator](../../scripts/validate-aurora-overlap-topmost-selection-proof.mjs)
- [Manifest AUR-S02-10](function-manifests/AUR-S02-10-overlap-resolution.json)
- [Manifest AUR-S02-07](function-manifests/AUR-S02-07-duplicate.json)

Kolejny krok dla Etapu 2 nie polega na ponownym otwieraniu Aurory dla
udowodnionych funkcji. Wymaga wyłącznie odnalezienia prawdziwego natywnego
`Duplicate` i przejścia pełnego kontraktu proof dla AUR-S02-07.
