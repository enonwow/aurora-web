# Standard Adjust Location X/Y/Z w Aurora Toolset

Status: `verified`, funkcja `AUR-S02-03`.

## Wejście do funkcji

1. Najpierw wykonaj [standard zaznaczania obiektu](aurora-toolset-object-selection-standard.md).
2. Otwórz menu kontekstowe targeted `WM_RBUTTONDOWN/UP` na zwalidowanym
   obiekcie.
3. Odczytaj aktywne `#32768` przez `MN_GETHMENU`.
4. Wymagaj dokładnie jednego enabled itemu `A&djust Location`, command `192`.
5. Uruchom item w aktywnej pętli menu i potwierdź widoczny `TdlgLocation` o
   tytule `Adjust Location`. Samo wysłanie `WM_COMMAND 192` do frame/viewera lub
   viewportu nie jest proofem i w przebiegu referencyjnym nie otwierało dialogu.

## Mutacja i readback

1. Zapisz przed mutacją pełny `objects.csv` oraz SHA-256 wyciągniętego
   `<area>.git`.
2. Odczytaj X/Y/Z z trzech position edits, osobno od Bearing i Visual
   Transforms.
3. Ustaw nowe wartości targeted `SetWindowText`, odczytaj je ponownie i zrób
   screenshot przed `OK`.
4. Kliknij dokładny przycisk `OK`, zapisz moduł przez rozpoznany przycisk Save.
5. Natychmiast wyciągnij Area GIT. Dokładnie jeden rekord musi zmienić X/Y/Z;
   liczniki oraz wszystkie pozostałe rekordy muszą być identyczne.

## Rollback

Rollback jest zaakceptowany tylko wtedy, gdy:

- post-rollback `objects.csv` jest byte-identical z baseline;
- SHA-256 wyciągniętego Area GIT wraca dokładnie do baseline;
- sesja zostaje zapisana i zamknięta bez force kill.

Wpisanie do TUpDown większej precyzji niż pokazuje UI nie jest rollbackiem,
dopóki parser nie potwierdzi zapisu. Jeżeli UI nie utrwali precyzyjnej wartości,
użyj natywnego Undo i ponownie wykonaj Save/readback. Hash kontenera `.mod` nie
musi wrócić do baseline; rozstrzygające są hash payloadu GIT i rekordy obiektów.

Referencyjny proof:
[live run](evidence/object-selection-adjust-location-live-standard-2026-07-14/README.md).
