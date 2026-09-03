# AUR-S02-10 — overlap resolution: negative live proof

Jedna sesja Aurora Toolset (PID `16116`) utworzyła dwie instancje `nw_dwarfmerc001` w tym samym punkcie co istniejąca instancja: `creatures 6 → 8`, `total 18 → 20`. Po dwóch natywnych Undo i zapisach parser GIT wrócił dokładnie do baseline (`objects.csv` jest identyczny); Toolset zamknięto czysto.

To jest rollback semantyczny GIT, nie bitowo identyczny kontener modułu: hash pliku zmienił się z `E422…C20D0` na `D4AB…4FA5D` po zapisach Toolsetu. Ten fakt jest zapisany przez walidator i nie może być przedstawiany jako full-module exact rollback.

Nie zalicza to AUR-S02-10. Dwa targeted clicki viewportu zostały wykonane w trybie Select Objects bez globalnego inputu, lecz Toolset nie wystawił czytelnej tożsamości wybranej instancji. Zrzuty `selection-after-1.png` i `selection-after-2.png` pokazują stan UI, nie dowód wyboru każdego z trzech obiektów. Dlatego `functionAccepted:false` jest oczekiwanym wynikiem walidatora.

Wznowienie: znaleźć natywny odczyt zaznaczenia lub utworzyć dwie nakładające się instancje o rozróżnialnej tożsamości, a następnie udowodnić wybór każdej z nich w tej samej sesji i po zapisie.
