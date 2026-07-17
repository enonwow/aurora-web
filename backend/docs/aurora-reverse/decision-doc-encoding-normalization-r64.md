# Decision Closure: Encoding Hygiene (Agent E2, R64)

## Zakres i wynik detekcji
Przeskanowano `backend/docs/**/*.md` pod kątem artefaktów mojibake (UTF-8/CP) oraz poprawności bajtowej UTF-8.

Wynik:
- Bajtowo: wszystkie pliki `.md` są dekodowalne jako UTF-8 (brak plików „invalid UTF-8”).
- Semantycznie: wykryto artefakty UTF-8/CP w 6 dokumentach (poniżej).

## Dokumenty z artefaktami encodingu
1. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-errors-and-validation.md` (47 trafień)
2. `C:\Projects\aurora-web-backend\backend\docs\standards\access-annotations-standard-agent-r41.md` (24 trafienia)
3. `C:\Projects\aurora-web-backend\backend\docs\standards\backend-security-error-observability-ssot-agent-r46.md` (17 trafień)
4. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\asset-id-strategy-spec-r63.md` (1 trafienie)
5. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\ops-runbook-module-refresh-spec-r63.md` (1 trafienie)
6. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\schema-evolution-rules-spec-r63.md` (1 trafienie)

Przykłady artefaktów:
- `zastÄ™puje` -> `zastępuje`
- `WyczyĹ›Ä‡` -> `Wyczyść`
- `byĹ‚o` -> `było`

## Ocena ryzyka
- Niskie ryzyko techniczne: pliki są UTF-8 bajtowo, więc problem dotyczy treści (mojibake), nie uszkodzenia struktury pliku.
- Średnie ryzyko semantyczne: masowe podmiany mogą naruszyć:
  - fragmenty kodu/fenced blocks,
  - identyfikatory, nazwy enumów i literalne wartości,
  - anchory nagłówków i linki wewnętrzne (po zmianie diakrytyki).
- Wysokie ryzyko operacyjne przy „global replace”: możliwe false-positive poza naturalnym tekstem.

## Plan bezpiecznej normalizacji (kolejność)
1. Faza 0: Freeze i baseline
- Pracować na osobnym branchu roboczym.
- Zrobić snapshot listy trafień (`plik:linia`) i liczników per plik.

2. Faza 1: Pilot na niskim wolumenie (aurora-reverse, 3 pliki po 1 trafieniu)
- Naprawić ręcznie 3 pliki z `aurora-reverse`.
- Zweryfikować, że proces nie zmienia składni Markdown ani treści technicznych.

3. Faza 2: Dokumenty standards wg wolumenu (malejąco)
- `processing-pipeline-errors-and-validation.md`
- `access-annotations-standard-agent-r41.md`
- `backend-security-error-observability-ssot-agent-r46.md`
- W tych plikach stosować podmiany partiami (sekcja po sekcji), nie jednorazowo globalnie.

4. Faza 3: Final cleanup
- Ponowny skan wzorców mojibake i porównanie z baseline.
- Korekty punktowe (jeśli zostały pojedyncze przypadki).

## Zasady normalizacji
- Preferować poprawki ręczne lub półautomatyczne z review diff, zamiast ślepego „replace all”.
- Nie modyfikować tokenów w code blockach, ścieżkach, nazwach klas, kodach błędów, kluczach JSON.
- Zachować UTF-8 i dotychczasowy styl pliku (BOM/no-BOM bez wymuszania globalnej zmiany).

## Walidacja po każdej fazie
1. Walidacja techniczna
- Pliki nadal dekodują się jako UTF-8 strict.
- Brak nowych znaków `�` i brak sekwencji mojibake (`Ã`, `Ä`, `Å`, `Ĺ`) w normalnym tekście.

2. Walidacja semantyczna
- Diff zawiera wyłącznie korekty językowe (diakrytyka/znaki), bez zmian merytorycznych.
- Nagłówki i linki wewnętrzne działają (szczególnie po korekcie polskich znaków).
- Fragmenty kodu i identyfikatory bez zmian.

3. Walidacja redakcyjna
- Losowa kontrola min. 5 sekcji w każdym dużym dokumencie standards.
- Kontrola domenowa terminów kluczowych (`Roles`, `Permissions`, `PIPELINE_*`, `retryable`, itp.).

## Kryterium zamknięcia decyzji
Decision closure uznajemy za spełnione, gdy:
- lista 6 dokumentów zostanie znormalizowana,
- skan heurystyczny nie zwraca już artefaktów UTF-8/CP,
- diff potwierdza brak zmian merytorycznych i brak regresji w Markdown.
