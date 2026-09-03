# Audyt szybkości i ponownego użycia PoC Aurora Toolset — 2026-07-14

## Werdykt

Spowolnienie nie wynika z braku działającego PoC. Pełny PoC kamery `r7`
istnieje, ma kompletny live proof i zakończył się w **12 min 14 s**. Główny
problem to brak jego przeniesienia z jednorazowego przebiegu do wspólnego,
parametryzowanego runnera funkcji dla modułu NPC/itemów.

Praca po PoC produkowała poprawne pojedyncze proofy, ale ponownie odkrywała
sesję, sterowanie UI, artefakty i rollback dla każdej funkcji. To jest
powtarzalna strata czasu, a nie nieunikniony koszt realnej Aurory.

## Dane źródłowe

| Przebieg | Zakres | Czas / wynik | Co z niego można było użyć ponownie |
| --- | --- | --- | --- |
| `r6` | pełny standard sterowania kamerą | 54 min 20 s, `12/12 verified` | pierwszy pełny ledger, Oko Aurory, native readback, packet i clean close |
| `r7` | świeży rerun tego samego standardu | **12 min 14 s**, `verified` | jeden PID, preflight, open, Area, PNG/JSON, packet, zero procesów po close |
| Bearing + Undo/Redo | jedna mutacja GIT | 13 min 16 s, zaakceptowane `AUR-S02-04`, `AUR-S02-09` | dobry przykład izolowanej delty i rollbacku, ale osobny zestaw helperów |
| Copy/Paste — błędny helper | discovery + recovery | 12 min 02 s, odrzucone | negatywny proof; HOME/DOWN/ENTER wybrało złą akcję i wymagało odtworzenia kopii |
| Copy/Paste — poprawione Copy | exact Copy + odczyt Paste | 2 min 49 s, blocked | poprawne `C&opy`, ale Paste ID `61` nadal disabled |

Źródła czasu to `createdAt` i `closeResult.completedAt` w ledgerach sesji.
`r7` dotyczy innego modułu i Area, więc nie jest gotowym proofem dla NPC/itemów;
jest jednak sprawdzonym szkieletem sesji, capture, walidacji i zamknięcia.

## Co dokładnie zostało niewykorzystane

`r7` ma już wszystkie elementy, które są wspólne dla kolejnych funkcji:

1. preflight dokładnego modułu i hasha;
2. jedna sesja oraz PID-first recovery;
3. otwarcie właściwego Area;
4. screenshoty/read-only observation oraz Oko Aurory;
5. ledger zdarzeń;
6. finalny proof packet i zero procesów po close.

Dla obecnego `npc-item-live` istnieje nawet profil w
`aurora-toolset-session.mjs`, ale jest on słabszy (`requiresSixStageCoverage:
false`) i nie stanowi kontraktu pojedynczej funkcji. Wynik: wspólna warstwa
PoC była używana do startu/zamknięcia, lecz proof operacji obiektu był składany
ręcznie z osobnych helperów i katalogów evidence.

## Znaleziska i przyczyny źródłowe

| Priorytet | Przyczyna | Dowód | Wpływ |
| ---: | --- | --- | --- |
| P0 | PoC nie jest runnerem funkcji | `r7` ma komplet `open → observe → Eye → packet → close`, ale roadmapa nie ma manifestu `funkcja → akcja → delta → rollback → validator`. | Każda funkcja odtwarza własną sekwencję i własne nazwy artefaktów. |
| P0 | Drift profilu NPC/item | Profil `npc-item-live` wskazuje `codex_npc_item_live_20260713.mod`, lecz jego domyślny hash to `6FC8F379…A9309` modułu źródłowego. Aktualna zatwierdzona kopia robocza ma `E422D616…6C20D0`. | Wymagane są ręczne `--expectedSha256`; pomyłka albo restart ponownie blokuje przebieg. |
| P1 | Brak kontraktu akcji UI przed mutacją | Stary helper Copy przesuwał się HOME/DOWN/ENTER zamiast adresować element po tekście, ID i prostokącie. Przebieg dirty, z zaburzoną kolejnością rekordów, został odrzucony. | Koszt recovery, backup/restore i osobnego przebiegu korekcyjnego. |
| P1 | Discovery i proof są pomieszane | Próbki odkrywające menu/klipy i próby mutacji trafiają do tego samego przebiegu funkcji. | Negatywne eksperymenty zwiększają czas funkcji oraz ryzyko trwałej zmiany. |
| P1 | Jedna funkcja nie ma stałej paczki dowodowej | Dla bearing jest parserowy hash + UI screenshot + rollback; dla Copy/Paste dopiero po fakcie dodano summary/validator. | Duplikacja skryptów i niejednolity czas domykania. |
| P2 | Zbyt szeroki PoC kamery traktowany jako coś „innego” | `r7` dowodzi kamery na `the_last_city`, a bieżący zakres to GIT NPC/itemów. Różne adaptery działania są realne, ale sesja, evidence i close są wspólne. | W praktyce odrzucono użyteczny 80% szkielet zamiast wymienić tylko adapter akcji. |

## Co było nieuniknione, a co nie

Nieuniknione: start Toolsetu, sprawdzenie MRU, ładowanie Area, natywny odczyt
po mutacji oraz backup/rollback. Należy je mierzyć i zachować w proofie.

Uniknione mogły być: ponowne budowanie organizacji sesji, inne formaty
evidence per funkcja, ręczne nadpisywanie hasha i mutujący discovery helper.
To one wyjaśniają, dlaczego istniejący PoC nie dał jeszcze szybkiej seryjnej
realizacji standardów.

## Plan naprawczy: PoC jako wspólna fabryka proofów

### Etap A — stabilizacja wejścia (warunek dla następnej funkcji)

1. Rozdzielić w profilu `sourceModuleSha256` od `workingModuleSha256`; preflight
   ma akceptować wyłącznie zatwierdzony hash kopii roboczej, bez ręcznego
   override jako normalnej ścieżki.
2. Dodać `aurora-toolset-function-manifest/v1`: `functionId`, `module`,
   `area`, `target identity`, `action adapter`, `before/after contract`,
   `rollback contract`, `validator` i `proof paths`.
3. Wyciągnąć wszystkie bezmutacyjne obserwacje (menu, drzewo, kontrolki) do
   etapu discovery, zanim zostanie otwarta sesja mutująca.

### Etap B — adaptery działań, nie nowe workflowy

1. Jeden adapter Tree/Popup: wybór dokładnie po `(text,id,position,rect)`;
   brak sekwencji zależnych od focusu.
2. Jeden adapter Property: ustawienie pola → UI readback → Save → GIT
   readback.
3. Jeden adapter Canvas/Placement: paleta → click → GIT delta → rollback.
4. Wszystkie adaptery zapisują do tego samego ledgeru i packetu `r7`.

### Etap C — szybki benchmark na właściwym module

Nie należy deklarować „12 minut” dla NPC/itemów, dopóki nie powstanie świeży
rerun. Pierwszy mierzalny cel to jeden prosty standard (np. Duplicate albo
Delete) w **jednej sesji**, z pełnym packetem i bez ręcznego override hasha.
Ten czas stanie się baseline dla funkcji GIT; dopiero wtedy można ustalić SLO.

### Bramka kontynuacji

Kolejny standard może dostać `TAK` tylko gdy manifest, native action,
after-save parser delta, rollback, screenshot, finalny validator i close są
produkowane przez ten sam runner. Jeśli od preflightu do packetu potrzeba
nowego jednorazowego skryptu bez adaptera, to jest to dług techniczny do
uzasadnienia w proofie, nie domyślna droga.

## Decyzja audytu

Nie brakuje PoC. Brakuje **produktowego połączenia PoC z macierzą 75 funkcji**.
Najpierw trzeba zamienić PoC w parametryzowany runner funkcji i naprawić drift
profilu/hasha. Dopiero potem seryjnie wykonywać roadmapę; w przeciwnym razie
każda kolejna funkcja będzie znów kosztowała discovery, ręczny proof i recovery.

## Wdrożenie standardu po audycie

Standard wykonania funkcji `v1` został wpisany do kanonicznego
`aurora-toolset-operating-standard.md`. Profil `npc-item-live` ma od teraz hash
zatwierdzonej kopii roboczej `E422D616…6C20D0`, zamiast hasha źródła.
Readonly preflight potwierdził ten profil bez uruchamiania Toolsetu, przy zero
procesów i bez automatycznych override'ów.

Dowód: `evidence/standard-v1-profile-preflight-2026-07-14/session-state.json`.

## Odnośniki do dowodów

- `AURORA_TOOLSET_LIVE_COMPLETION_AUDIT_2026-07-13.md`
- `AURORA_TOOLSET_FAST_RERUN_PROOF_2026-07-13.md`
- `.codex-tmp/aurora-standard-live-20260713-r7/session-state.json`
- `backend/docs/aurora-reverse/evidence/bearing-undo-redo-live-standard-2026-07-14/summary.json`
- `backend/docs/aurora-reverse/evidence/copy-paste-live-standard-2026-07-14/summary.json`
- `backend/scripts/aurora-toolset-session.mjs`
