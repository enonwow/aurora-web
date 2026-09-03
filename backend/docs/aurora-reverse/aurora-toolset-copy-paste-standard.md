# Standard Copy/Paste obiektu w Aurora Toolset

Status: `verified for one uniquely identified placeable`. Roadmap ID:
`AUR-S02-06`. Ten standard nie twierdzi jeszcze, że osobna ścieżka dla NPC
albo itemu została udowodniona.

## Funkcja

Skopiować dokładnie jeden wskazany obiekt Area, wkleić go natywną funkcją
Toolsetu, zatwierdzić aktywny preview w viewport i potwierdzić po Save
izolowaną deltę `+1` właściwej rodziny GIT.

## Procedura

1. Zbuduj parserowy baseline: liczniki, `objects.csv`, template, tag i pozycję
   źródłowego obiektu.
2. Otwórz jedną sesję Toolsetu i wskaż jednoznaczny leaf w drzewie Area.
3. Wywołaj natywne `Edit/Copy` wyłącznie po resource/menu readbacku ID `59`.
4. Odczytaj, że `Edit/Paste` ID `61` stało się aktywne, a następnie je wywołaj.
5. Paste tylko uruchamia preview: zatwierdź go jednym targeted kliknięciem w
   zweryfikowanym viewport. Tytuł musi przejść w stan dirty.
6. Save i parserowy readback muszą wykazać dokładnie jeden nowy rekord oraz
   `+1` tylko w rodzinie celu.
7. Uruchom natywne Undo, Save i porównaj ponownie `objects.csv` z baseline.
8. Zamknij sesję dopiero po readbacku rollbacku. Zapisz również hash kontenera
   `.mod`; nie utożsamiaj jego repackingu z rollbackiem semantycznego GIT.

## Kontrakt proof

- źródło jest jednoznacznie wybrane;
- Copy ma command ID `59`, Paste `61`, a Undo `56`;
- po Save: `after[targetKind] = before[targetKind] + 1` oraz `total + 1`;
- nowy rekord zawiera template/tag źródła i pozycję odróżniającą go od źródła;
- po Undo + Save parserowy `objects.csv` jest byte-identyczny z baseline;
- action JSON, PNG z Aurory, parser packs, rollback i clean close są obowiązkowe;
- jeżeli SHA-256 pełnego `.mod` różni się mimo równego GIT, zgłoś jawnie
  repacking kontenera, zamiast fałszywie deklarować byte-identical module.

## Zweryfikowany wynik

W jednej sesji Aurora skopiowała `Water Trough` (`plc_watertrough`), aktywowała
Paste po Copy, zatwierdziła preview, zapisała izolowaną deltę `placeables 3→4`
i `total 18→19`, a potem Undo + Save zwróciło byte-identyczne `objects.csv`.
Pełny dowód i niezależny validator są w
[Copy/Paste placeable live proof](evidence/copy-paste-placeable-live-2026-07-14/README.md).
