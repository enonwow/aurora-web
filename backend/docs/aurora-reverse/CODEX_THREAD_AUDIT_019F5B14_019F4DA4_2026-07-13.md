# Audyt wątków Codex: `019f4da4…` i `019f5b14…`

Data: 2026-07-13  
Zakres: historia lokalnych sesji Codex oraz bieżący checkout; nie jest to
dowód wykonania funkcji przez sam fakt istnienia kodu, testów lub dokumentów.

## Wynik w skrócie

| Wątek | Co faktycznie osiągnął | Czego nie dowiódł | Ocena |
| --- | --- | --- | --- |
| `019f4da4-beb7-7ba0-8a7b-542a9fadb9a4` | Zdiagnozował duplicate-open/MRU, potwierdził poprawne otwieranie modułu i kolejnych Area w późniejszych testach, ustanowił zasady bezpieczeństwa oraz rozdział Core/Oka Aurory. | Końcowego testu absolutnego sterowania: poprawny tile, native readback, yaw, pitch 45°, zoom, centrowanie i niezależne PNG/JSON. | **Niedokończony**; dużo użytecznej pracy pomocniczej, bez wymaganego proofu końcowego. |
| `019f5b14-7560-77f3-83f9-035527dcb11c` | Trafnie wykrył błędy pierwszego wątku i utworzył wcześniejszy audyt `codex-thread-audit-019f4da4-2026-07-13.md`. | Nie zamknął własnego następnego celu: po audycie i kolejnych prośbach użytkownika nie ma nowego live proofu końcowego ani dowodu autonomicznej kontynuacji. | **Audyt merytorycznie dobry, wykonanie follow-upu niedokończone**. |

## Wątek `019f4da4…`

### Co było zrobione dobrze

1. Wykryto konkretny błąd operacyjny: po automatycznym/recovery otwarciu modułu
   kolejne jawne `Open` tworzyło drugie otwarcie i ryzyko Access Violation.
2. Po korekcie użytkownika praca uwzględniła monitor nie-primary i zakaz
   globalnego kursora/inputu. W późniejszym przebiegu użytkownik potwierdził,
   że otwieranie modułu i wybieranie Area jest obecnie wykonane poprawnie.
3. Użytkownikowo ważne rozdzielenie zostało zrozumiane poprawnie: Core steruje
   Toolsetem, natomiast Oko Aurory jest niezależnym, organoleptycznym testem
   PNG/JSON, a nie substytutem realnego stanu Core.
4. Po sprzeciwie użytkownika wycofano kierunek mutowania `nwtoolset.ini`/MRU i
   zapisano zasadę niezmienności konfiguracji. To jest właściwa granica.

### Co było zrobione źle

1. **Kryterium końcowe zastępowano pracą pomocniczą.** Wątek rozbudował
   skrypty, ledgery, estymatory i dokumentację, gdy wciąż brakowało dowodu
   sterowania kamerą względem celu absolutnego.
2. **Zbyt często zamykano lub porzucano sesję.** Błąd pojedynczego capture
   lane'u lub wcześniejszy wpis kwarantanny potraktowano jako powód końca
   działającej sesji, choć ustalony flow brzmi: otwórz/reuse raz, wykonaj cały
   zestaw testów, zamknij raz.
3. **MRU/INI stało się samowytworzonym blockerem.** Zaproponowano zmianę
   preferencji użytkownika, choć nie była ona ani zlecona, ani jedyną drogą.
   Brak zgody na tę zmianę nie dowodził zewnętrznego blockera całego celu.
4. **Deklaracje były za szerokie względem dowodów.** Przejście testu helpera,
   poprawne otwarcie Area albo JSON z proxy nie są dowodem native readbacku
   tile'a, yaw, pitch, zoomu i centrum.
5. **Wątek kończył tury po częściowym postępie.** Użytkownik wielokrotnie
   musiał przypominać, że aktywny cel pozostaje aktywny. Ostatnia odpowiedź
   wątku przyznaje ten błąd, ale nie zawiera następującego po nim proofu.

### Stan wymagania końcowego

| Wymaganie | Dowód w historii | Stan |
| --- | --- | --- |
| Jedna sesja dla pełnej sekwencji | Zasada i częściowe próby istnieją, lecz były naruszenia przez przedwczesne close. | `missing` |
| Właściwy moduł i Area bez mutacji konfiguracji | Otwieranie/Area zostało później potwierdzone przez użytkownika; brak jednego końcowego packetu pod test kamery. | `partial` |
| Source tile z readbackiem | Brak końcowego native readbacku. | `missing` |
| Mierzone yaw/pitch/zoom/pan | Użytkownik stwierdził, że wcześniejsze próby były czasowe/losowe i bez proofu. | `missing` |
| Closed loop do celu | Brak artefaktu zbieżności. | `missing` |
| Oko Aurory: before-a/before-b/after PNG+JSON | Brak niezależnego, końcowego pakietu dla testu referencyjnego. | `missing` |
| Pitch 45°, yaw/zoom/centrowanie w tolerancjach | Brak. | `missing` |

## Wątek `019f5b14…`

### Co było zrobione dobrze

1. Audyt pierwotnego wątku był konkretny: rozdzielił `blocked` od `complete`,
   wskazał brak końcowego artefaktu i nazwał drift do frameworków/kontraktów.
2. Poprawnie wskazał zasadę dowodową: testy offline są tylko wsparciem; live
   PNG/JSON oraz readback są warunkiem zaliczenia celu Toolsetu.
3. Po zwróceniu uwagi przyjął poprawkę do flow: jedna sesja obejmuje wszystkie
   testy, a pojedyncza akcja+readback jest iteracją *wewnątrz* tej sesji.

### Co wymaga poprawy

1. **Audyt przeszedł w niezamówioną implementację/continuation.** Po
   dostarczeniu audytu użytkownik wprawdzie zlecił dalszą pracę, ale od tego
   momentu wątek powinien był utrzymywać jedną, jednoznaczną listę kryteriów i
   raportować wyłącznie nowe dowody albo prawdziwy blocker.
2. **Powtórzył wzorzec, który krytykował.** Pojawiały się deklaracje typu
   „kontynuuję”, „potwierdziłem flow” i „plan aktywny”, lecz końcowy brakujący
   live proof nie został pokazany. To status procesu, nie postęp produktu.
3. **Nie domknął własnej pętli audytowej.** Brakuje końcowego porównania:
   wymaganie -> artefakt -> werdykt. Dlatego nie można uznać, że follow-up po
   audycie naprawił problemy pierwszego wątku.

## Jedna reguła naprawcza dla kolejnych wątków

Prowadzić jeden trwały ledger z wyłącznie tymi kolumnami:

`wymaganie | live artefakt | niezależna walidacja Oka | stan | konkretny blocker`.

Nie wolno wpisywać `verified` na podstawie kodu, dokumentu, unit testu,
uruchomionej komendy ani deklaracji użytkownika o częściowym kroku. W tym
obszarze `verified` wymaga końcowego PNG/JSON oraz zgodnego readbacku dla
danego wymagania. Sesja Toolsetu jest otwierana/reuse'owana raz na pełną
sekwencję; po nieudanym lane najpierw sprawdza się PID i przywraca istniejącą
sesję, a nie uruchamia lub zamyka Toolset automatycznie.

## Następny prawidłowy cel roboczy

Nie tworzyć kolejnego frameworku. W jednej już poprawnie otwartej sesji:

1. wybrać istniejący Area i tile;
2. zebrać niezależne `before-a` i `before-b` Oka Aurory;
3. wykonać mierzone próbki yaw, pitch, zoom i pan z readbackiem;
4. użyć modelu tylko wtedy, gdy próbki faktycznie mierzą efekt;
5. dojść closed-loop do tile'a, pitch 45°, zadanego yaw/zoomu i centrum;
6. zapisać `after` PNG/JSON oraz jeden packet końcowy.

Do czasu pkt 6 oba wątki pozostają niedokończone w sensie celu produktu,
niezależnie od liczby helperów, testów i dokumentów w checkoutcie.

## Źródła

- `C:\Users\enonw\.codex\sessions\2026\07\10\rollout-2026-07-10T22-07-57-019f4da4-beb7-7ba0-8a7b-542a9fadb9a4.jsonl`
- `C:\Users\enonw\.codex\sessions\2026\07\13\rollout-2026-07-13T12-45-04-019f5b14-7560-77f3-83f9-035527dcb11c.jsonl`
- `backend/docs/aurora-reverse/codex-thread-audit-019f4da4-2026-07-13.md`
- `backend/docs/aurora-reverse/aurora-toolset-operating-standard.md`

