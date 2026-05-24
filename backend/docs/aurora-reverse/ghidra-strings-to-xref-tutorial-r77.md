# Strings to XREF Tutorial (R77)

## Cel
Szybko dojść od **pojedynczego stringa** do **miejsca użycia (XREF)** i dalej do **funkcji**, którą warto analizować w pierwszej kolejności.

## Krok po kroku (Ghidra)

1. Otwórz program i upewnij się, że analiza (`Auto Analyze`) została wykonana.
2. Otwórz okno `Search -> For Strings`.
3. Wyszukaj string domenowy, np. fragment komunikatu błędu, nazwę endpointu, klucz JSON albo frazę UI.
4. W wynikach wybierz najbardziej specyficzny wpis (unikaj bardzo krótkich i ogólnych stringów).
5. Kliknij string, aby przejść do jego adresu w Listing.
6. Wywołaj referencje: `Right click -> References -> Show References to Address`.
7. W oknie XREF przejrzyj wszystkie odwołania:
   - `READ` zwykle oznacza użycie danych,
   - `DATA` może być tylko wskaźnikiem,
   - `UNCONDITIONAL_CALL`/`CALL` bywa lepszym tropem do logiki.
8. Kliknij najciekawszy XREF i przejdź do miejsca użycia.
9. Ustal funkcję właściciela:
   - jeśli Ghidra już ją rozpoznała, zobaczysz nazwę funkcji,
   - jeśli nie, utwórz funkcję (`F`) i nadaj roboczą nazwę.
10. Otwórz `Decompiler` i sprawdź kontekst:
    - jakie argumenty są budowane przy stringu,
    - czy to walidacja, logowanie, routing, serializacja itp.
11. Oznacz wynik:
    - rename funkcji na znaczącą nazwę,
    - dodaj komentarz, skąd przyszedł trop (nazwa stringa + adres).
12. Powtórz dla kolejnego stringa z tej samej domeny, aby budować mapę funkcji.

## Scenariusz (1 przykład)

### Sytuacja
Chcesz znaleźć logikę odpowiedzialną za walidację tokena w backendzie.

### Start od stringa
W `For Strings` znajdujesz frazę: `Invalid token`.

### Przejście do XREF
Otwierasz `Show References to Address` i widzisz 4 odwołania:
- 2x ścieżki logowania błędów,
- 1x helper formatujący komunikat,
- 1x funkcja z warunkiem i zwrotem błędu.

### Wybór funkcji docelowej
Przechodzisz do XREF z warunkiem (`if (...) { ... "Invalid token" ... }`).
W dekompilatorze widzisz:
- odczyt nagłówka/autoryzacji,
- wywołanie funkcji sprawdzającej podpis,
- gałąź błędu zwracającą komunikat.

To jest właściwy punkt wejścia do analizy. Nadajesz funkcji roboczą nazwę, np. `auth_validate_token_path`, i oznaczasz ją jako kandydat P0.

## Szybkie wskazówki jakościowe
- Najpierw wybieraj stringi specyficzne domenowo, nie ogólne (`error`, `failed`).
- Jeden string może mieć wiele XREF: nie każdy prowadzi do logiki biznesowej.
- Jeśli XREF prowadzi tylko do tablicy/wskaźników, idź poziom wyżej po call graph.
- Po każdym trafieniu rób mały log: `string -> xref -> function -> wniosek`.

## Efekt końcowy
Po 10-20 minutach tej metody masz shortlistę realnych funkcji do głębokiego reverse engineeringu, zamiast przeszukiwać kod binarny losowo.
