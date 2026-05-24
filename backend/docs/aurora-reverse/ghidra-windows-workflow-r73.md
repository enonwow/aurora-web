# Ghidra Windows Workflow (r73) - Agent E10

Ten dokument opisuje praktyczny, codzienny workflow tylko dla Windows, dla poczatkujacego inzyniera wstecznego pracujacego w Ghidra.

## 1. Cel i zalozenia

- System: Windows 10/11.
- Narzedzie: Ghidra (GUI).
- Priorytet: powtarzalnosc pracy, brak utraty notatek, szybki powrot po awarii.
- Zakres: skroty klawiszowe, panele, zapisy sesji i backup projektu.

## 2. Jednorazowa konfiguracja na start

1. Utworz katalog roboczy, np.:
   - `C:\RE\ghidra-projects\`
2. Utworz katalog backupow:
   - `C:\RE\ghidra-backups\`
3. Pracuj na kopii binarki, nie na oryginale:
   - `sample.exe` kopiuj do `C:\RE\samples\case-YYYYMMDD\`
4. W Ghidra utworz projekt typu **Non-Shared Project**.
5. Nazwa projektu: `case_<nazwa_modulu>_<YYYYMMDD>`.

## 3. Minimalny uklad paneli (poczatkujacy)

Po imporcie binarki i otwarciu CodeBrowser ustaw:

- Lewa strona:
  - `Program Trees`
  - `Symbol Tree`
- Srodek:
  - `Listing`
- Prawa strona:
  - `Decompiler`
- Dol:
  - `Defined Strings`
  - `Console`

Dlaczego ten layout:
- `Listing + Decompiler` daje szybkie mapowanie asm <-> pseudokod.
- `Symbol Tree` i `Defined Strings` to najlatwiejszy punkt startu dla nowej osoby.

## 4. Skroty klawiszowe (Windows) - zestaw dzienny

Uzywaj tych skrotow codziennie, az wejda w nawyk:

- `Ctrl+S` - zapis projektu/sesji.
- `Ctrl+F` - szukanie w aktualnym widoku.
- `G` - przejscie pod adres (Go To).
- `L` - zmiana nazwy symbolu (Label).
- `;` - komentarz end-of-line.
- `Shift+;` - komentarz pre-comment.
- `X` - pokaz referencje (Xrefs) do elementu.
- `F` - utworz funkcje z zaznaczonego kodu.
- `P` - disassemble od zaznaczonego miejsca.
- `D` - redefinicja typu danych.
- `Ctrl+Shift+F` - globalne wyszukiwanie (zaleznie od okna/konfiguracji).

Uwaga:
- Czesci mapowania skrotow moga sie minimalnie roznic miedzy wersjami.
- Gdy cos nie dziala, sprawdz `Edit -> Tool Options -> Key Bindings`.

## 5. Workflow pracy 60-90 min (jedna sesja)

### Krok 1: Otwarcie i sanity check (5 min)

1. Otworz projekt i program.
2. Sprawdz, czy dziala `Decompiler`.
3. Od razu `Ctrl+S`.

### Krok 2: Szybki rekonesans (10-15 min)

1. `Defined Strings` - szukaj:
   - URL-i
   - nazw plikow
   - komunikatow bledow
   - tokenow konfiguracyjnych
2. `Symbol Tree` - znajdz:
   - `entry`
   - importy (`CreateFile`, `RegOpenKey`, `WinHttp`, itp.)
3. Zapisz pierwsze hipotezy komentarzami (`;` / `Shift+;`).

### Krok 3: Analiza funkcji (30-50 min)

1. Wejdz do ciekawej funkcji (double click lub `G`).
2. Nadawaj sensowne nazwy (`L`) od razu.
3. Sprawdz Xrefy (`X`) przed glebsza analiza.
4. Kazda potwierdzona obserwacja:
   - komentarz w kodzie
   - `Ctrl+S` co 5-10 minut

### Krok 4: Podsumowanie sesji (5-10 min)

1. Dodaj 3-5 najwazniejszych notatek (co zrozumiales, co dalej).
2. `Ctrl+S`.
3. Zamknij program dopiero po zapisie.

## 6. Zasada zapisu (anti-loss)

Stosuj prosty rytm:

- Zapis reczny: `Ctrl+S` co 5-10 minut.
- Zapis po kazdej z tych akcji:
  - zmiana nazw wielu symboli
  - dodanie waznych komentarzy
  - zakonczenie analizy jednej funkcji
  - przed uruchomieniem skryptu

Praktyczna regula:
- "Jedna sensowna zmiana = jeden `Ctrl+S`."

## 7. Backup projektu (Windows-only, praktyczny)

## 7.1 Co backupowac

Backupuj caly katalog projektu Ghidra:
- plik `.gpr`
- folder `.rep`
- ewentualne pliki pomocnicze w tym samym katalogu projektu

## 7.2 Kiedy backupowac

- Minimum: na koniec dnia.
- Zalecane: po kazdej wiekszej sesji (np. 60-90 min).
- Obowiazkowo: przed eksperymentami (renaming na duza skale, skrypty, masowe zmiany typow).

## 7.3 Jak backupowac (manualnie)

1. Zamknij projekt w Ghidra (najbezpieczniej).
2. Skopiuj folder projektu do:
   - `C:\RE\ghidra-backups\case_<nazwa>\YYYY-MM-DD_HH-mm\`
3. Zweryfikuj, ze w backupie sa:
   - `.gpr`
   - `.rep`

## 7.4 Jak backupowac (PowerShell - szybka wersja)

Przyklad polecenia:

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$src = "C:\RE\ghidra-projects\case_demo"
$dst = "C:\RE\ghidra-backups\case_demo\$ts"
New-Item -ItemType Directory -Path $dst -Force | Out-Null
Copy-Item -Path $src\* -Destination $dst -Recurse -Force
```

Opcjonalnie kompresja:

```powershell
$zip = "C:\RE\ghidra-backups\case_demo_$ts.zip"
Compress-Archive -Path "$src\*" -DestinationPath $zip -Force
```

## 8. Plan odzyskiwania po awarii

Gdy projekt sie uszkodzi lub stracisz zmiany:

1. Nie nadpisuj od razu aktualnego projektu.
2. Skopiuj najnowszy backup do nowej lokalizacji, np.:
   - `C:\RE\ghidra-projects\recovered_case_demo\`
3. Otworz odzyskany `.gpr` w Ghidra.
4. Zweryfikuj:
   - czy sa Twoje nazwy funkcji
   - czy sa komentarze
   - czy decompiler dziala
5. Dopiero po weryfikacji kontynuuj analize.

## 9. Checklista "koniec dnia"

- `Ctrl+S` przed zamknieciem.
- Backup projektu utworzony.
- Backup da sie otworzyc (test raz dziennie lub co 2 dni).
- Krotka notatka:
  - co zostalo zrobione
  - od jakiej funkcji zaczac jutro

## 10. Najczestsze bledy poczatkujacych (i jak ich uniknac)

- Brak regularnego zapisu.
  - Rozwiazanie: `Ctrl+S` po kazdej sensownej zmianie.
- Praca na oryginalnej probce.
  - Rozwiazanie: analizuj tylko kopie.
- Chaotyczne nazwy symboli.
  - Rozwiazanie: prefiksy, np. `net_`, `crypto_`, `cfg_`.
- Brak backupu przed masowymi zmianami.
  - Rozwiazanie: backup "przed eksperymentem" jako zelazna zasada.

## 11. Szybki wzorzec nazewnictwa

Przykladowe schematy:

- Funkcje:
  - `net_send_packet`
  - `cfg_load_ini`
  - `crypto_decrypt_blob`
- Zmienne globalne:
  - `g_session_key`
  - `g_config_path`
- Struktury:
  - `player_state_t`
  - `packet_header_t`

Dzieki temu po 2-3 dniach projekt jest czytelny nie tylko dla Ciebie.

## 12. Podsumowanie operacyjne

Jesli zapamietasz tylko 4 rzeczy:

1. Ustaw staly uklad paneli (`Listing + Decompiler + Strings + Symbols`).
2. Komentuj i nazywaj elementy od razu.
3. Zapisuj czesto (`Ctrl+S`).
4. Rób regularny backup calego projektu (`.gpr + .rep`).

To wystarczy, zeby poczatkujacy inzynier reverse unikal 80% najczestszych problemow w codziennej pracy z Ghidra na Windows.
