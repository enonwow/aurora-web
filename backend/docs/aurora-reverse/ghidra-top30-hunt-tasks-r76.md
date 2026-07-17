# Ghidra Top-30 Hunt Tasks (R76)

Data: 2026-05-24  
Rola: Agent D14 (Top30-to-Hunt Tasks)  
Cel: zamienic top-30 stringow domenowych na konkretne zadania hunt w Ghidrze dla poczatkujacego.

## Zasada wykonania (dla kazdego zadania)
1. W Ghidrze otworz `Search -> For Strings...` i wyszukaj wskazany string.
2. Otworz co najmniej 1 trafienie z realnym `XREF` do kodu (`Show References To`).
3. Przejdz do funkcji referujacej i zapisz notatke: co funkcja robi z danym polem/API.

## P0 (must-check first)

### 1) `LinkedToFlags`
- krok: Znajdz `LinkedToFlags`, otworz XREF i sprawdz, czy wartosc jest czytana jako flaga/bitmaska.
- expected outcome: Zidentyfikowana funkcja, ktora interpretuje lub waliduje flagi powiazania.
- stop condition: Masz nazwe/adres funkcji + dowod operacji bitowej lub walidacji zakresu.

### 2) `LinkedTo`
- krok: Znajdz `LinkedTo`, przejdz po XREF i sprawdz, czy jest mapowanie na target (tag/resref/id).
- expected outcome: Widzisz, jak silnik czyta cel polaczenia.
- stop condition: Potwierdzony caller, gdzie `LinkedTo` trafia do zmiennej uzywanej dalej w logice przejsc.

### 3) `LoadScreenID`
- krok: Wyszukaj `LoadScreenID` i przeanalizuj funkcje, ktora pobiera wartosc.
- expected outcome: Potwierdzona sciezka odczytu identyfikatora loading screenu.
- stop condition: Masz miejsce, gdzie wartosc jest czytana i przekazywana do dalszego przetwarzania.

### 4) `LoadScreenId`
- krok: Wyszukaj wariant `LoadScreenId` i porownaj z `LoadScreenID`.
- expected outcome: Wiesz, czy to alias (oba wspierane) czy martwy string.
- stop condition: Potwierdzone: ten sam parser/funkcja albo osobna sciezka.

### 5) `TransitionDestin`
- krok: Znajdz `TransitionDestin`, otworz XREF i sprawdz, czy to skrocony alias pola destination.
- expected outcome: Rozpoznanie, czy parser obsluguje skrocone nazwy kluczy.
- stop condition: Potwierdzony branch/mapowanie z `TransitionDestin` na pole docelowe.

### 6) `TransitionDestination`
- krok: Znajdz `TransitionDestination`, porownaj z zadaniem 5.
- expected outcome: Jasny obraz, ktory klucz jest canonical, a ktory kompatybilnosciowy.
- stop condition: Masz dowod kolejnosci obslugi (if/switch/mapa kluczy) lub wspolnej normalizacji.

### 7) `LinkedToModule`
- krok: Znajdz `LinkedToModule` i sprawdz, czy wartosc steruje przejsciem miedzy modulami/obszarami.
- expected outcome: Zidentyfikowany kontekst miedzy-obszarowy lub miedzy-modulowy.
- stop condition: Potwierdzony caller, gdzie wartosc wplywa na wybor docelowego kontekstu.

### 8) `Door List`
- krok: Znajdz `Door List`, sprawdz, czy kod iteruje po kolekcji drzwi.
- expected outcome: Potwierdzona petla po strukturach drzwi.
- stop condition: Masz funkcje z iteracja indeksowa/iteratorowa po liscie drzwi.

### 9) `TriggerList`
- krok: Znajdz `TriggerList` i sprawdz analogicznie iteracje po triggerach.
- expected outcome: Potwierdzony parser/loader triggerow.
- stop condition: Znaleziona funkcja, ktora czyta elementy listy triggerow i przekazuje je dalej.

### 10) `WaypointList`
- krok: Znajdz `WaypointList`, przejdz do XREF i sprawdz sciezke ingest waypointow.
- expected outcome: Wiesz, gdzie tworzony/uzupelniany jest model waypointa.
- stop condition: Masz dowod odczytu listy + operacje na rekordach potomnych.

### 11) `AreaProperties`
- krok: Znajdz `AreaProperties` i sprawdz, jakie pola obszaru sa czytane razem.
- expected outcome: Mapa funkcji odpowiedzialnej za metadane obszaru.
- stop condition: Spisane min. 2 sasiednie pola czytane z tej samej struktury.

### 12) `Mod_HakList`
- krok: Znajdz `Mod_HakList` i sprawdz, czy buduje kolejnosc HAK-ow.
- expected outcome: Potwierdzona sciezka konfiguracji listy HAK.
- stop condition: Masz funkcje, gdzie lista jest iterowana i zapisywana do runtime contextu.

### 13) `Mod_Hak`
- krok: Znajdz `Mod_Hak` i porownaj role z `Mod_HakList`.
- expected outcome: Rozumiesz relacje: pojedynczy wpis vs lista.
- stop condition: Potwierdzony branch obslugi jednego wpisu lub fallbacku.

### 14) `Mod_CustomTlk`
- krok: Znajdz `Mod_CustomTlk` i sprawdz, gdzie ustawiana jest sciezka/identyfikator custom TLK.
- expected outcome: Znana funkcja odpowiedzialna za konfiguracje custom TLK.
- stop condition: Potwierdzone przypisanie wartosci do pola konfiguracyjnego lub resolvera.

### 15) `CExoResMan`
- krok: Znajdz `CExoResMan`, otworz XREF i ustal, czy to punkt wejscia managera zasobow.
- expected outcome: Zidentyfikowany obszar kodu odpowiedzialny za resource management.
- stop condition: Potwierdzony co najmniej 1 caller zwiazany z pobieraniem zasobu.

### 16) `GetResObject`
- krok: Znajdz `GetResObject` i sprawdz argumenty/zwracany uchwyt.
- expected outcome: Wiesz, jak kod pobiera obiekt zasobu.
- stop condition: Potwierdzone miejsce, gdzie wynik jest dalej parsowany lub walidowany.

### 17) `Demand`
- krok: Znajdz `Demand`, sprawdz czy wystepuje w parze acquire/use.
- expected outcome: Potwierdzone ladowanie zasobu do pamieci.
- stop condition: Masz funkcje, gdzie po `Demand` nastepuje odczyt danych zasobu.

### 18) `Release`
- krok: Znajdz `Release` i sparuj z miejscem `Demand`.
- expected outcome: Potwierdzony cykl zycia zasobu (acquire -> release).
- stop condition: Dla co najmniej jednej sciezki masz obie strony pary (`Demand` i `Release`).

### 19) `Exists`
- krok: Znajdz `Exists` i sprawdz, czy to check warunkowy przed operacja krytyczna.
- expected outcome: Rozpoznana logika guard-check przed odczytem/parse.
- stop condition: Potwierdzony warunek `if` sterujacy dalsza sciezka wykonania.

### 20) `CResGFF`
- krok: Znajdz `CResGFF` i zmapuj funkcje, ktore przechodza z resource managera do parsera GFF.
- expected outcome: Jasny punkt wejscia do parsowania GFF.
- stop condition: Potwierdzony przeplyw `GetResObject/Demand` -> `CResGFF`.

### 21) `GetTopLevelStruct`
- krok: Znajdz `GetTopLevelStruct` i sprawdz, jaka struktura glowna jest pobierana.
- expected outcome: Zidentyfikowany poczatek traversalu danych GFF.
- stop condition: Masz caller, ktory od top-level przechodzi do pol potomnych.

### 22) `GetStructByIndex`
- krok: Znajdz `GetStructByIndex` i sprawdz petle po indeksach.
- expected outcome: Potwierdzona iteracja po rekordach listy/struktur.
- stop condition: Zlokalizowana petla (for/while) z indeksowym odczytem struktur.

### 23) `dialog`
- krok: Znajdz `dialog` i sprawdz kontekst (resource lookup, rozszerzenie, nazwa bazowa).
- expected outcome: Rozpoznanie sciezki ladowania bazowego dialog TLK/resource.
- stop condition: Potwierdzony caller wykorzystujacy ten string do resolve zasobu.

### 24) `dialogf`
- krok: Znajdz `dialogf` i porownaj z `dialog`.
- expected outcome: Ustalony fallback/wariant lookup (np. female/custom).
- stop condition: Potwierdzony warunek wyboru miedzy `dialog` i `dialogf`.

## P1 (follow-up / completeness)

### 25) `placeables.2da`
- krok: Znajdz `placeables.2da`, przejdz do XREF i sprawdz, jakie kolumny sa czytane.
- expected outcome: Potwierdzony punkt enrichmentu placeable.
- stop condition: Spisane min. 2 odczytywane pola/kolumny z tej tabeli.

### 26) `appearance.2da`
- krok: Znajdz `appearance.2da` i sprawdz, czy jest mapowanie wygladu/visuali.
- expected outcome: Zidentyfikowana funkcja lookup wygladu.
- stop condition: Potwierdzony przeplyw id -> rekord appearance -> uzycie runtime.

### 27) `racialtypes.2da`
- krok: Znajdz `racialtypes.2da` i ustal, gdzie kod mapuje race id.
- expected outcome: Znaleziony lookup ras i jego consumer.
- stop condition: Potwierdzony caller, ktory po lookupu ustawia/odczytuje dane rasy.

### 28) `phenotype.2da`
- krok: Znajdz `phenotype.2da` i sprawdz, czy sluzy do wyboru wariantu modelu/animacji.
- expected outcome: Rozpoznana rola tabeli phenotype.
- stop condition: Potwierdzone uzycie wartosci phenotype w dalszej logice obiektu.

### 29) `portraits.2da`
- krok: Znajdz `portraits.2da` i sprawdz mapowanie portrait id -> zasob obrazu.
- expected outcome: Potwierdzona sciezka budowania danych portretu.
- stop condition: Masz miejsce, gdzie wynik lookupu jest przekazywany do warstwy prezentacji/runtime.

### 30) `ambientsound.2da`
- krok: Znajdz `ambientsound.2da` i sprawdz odczyt parametrow ambientu.
- expected outcome: Zidentyfikowany parser/lookup dzwiekow ambient.
- stop condition: Potwierdzone min. 1 pole ambientu, ktore wplywa na konfiguracje obszaru.

## Done Definition (beginner-friendly)
- Dla kazdego z 30 stringow masz: 1 adres stringa, 1 funkcje referujaca, 1 zdanie o roli funkcji.
- Co najmniej 10 zadan P0 ma status `verified` (dowod: string + xref + efekt w kodzie).
- Brak "zgadywania": jesli brak xref, oznacz `no-signal` i przejdz dalej.
