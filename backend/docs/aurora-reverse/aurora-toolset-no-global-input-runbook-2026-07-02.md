# Aurora Toolset - obsluga bez przejmowania myszy i klawiatury

> Canonical executable session workflow: [aurora-toolset-session-workflow.md](aurora-toolset-session-workflow.md). This document remains the detailed safety/evidence reference. Normal Toolset execution must enter through `backend/scripts/aurora-toolset-session.mjs`.

Status: aktywny runbook dla pracy Codex/Aurora

Ten dokument opisuje potwierdzony sposob obslugi Aurora Toolset na tej maszynie
bez globalnego kursora, bez globalnych skrotow klawiaturowych i bez fizycznego
przewijania mysza. Celem jest umiec otworzyc modul, otworzyc area i zebrac
dowod wizualny, kiedy uzytkownik moze rownolegle uzywac komputera.

## Dobre praktyki

Aurora Toolset jest oracle wizualnym, nie stabilnym UI do agresywnej
automatyzacji. Codex ma pomagac przygotowac pliki, uruchomic lekkie odczyty i
zebrac dowody, ale nie powinien "przepychac" Toolsetu przez stany recovery,
loading, wireframe ani access violation.

Bezpieczny cykl pracy:

1. Przygotuj area poza Toolsetem: generator, dry-run `.mod`, mapy placeables,
   raporty i testy plikow.
2. Wlasciwy `.mod` podmieniaj tylko gdy Toolset jest zamkniety albo uzytkownik
   potwierdzi, ze modul nie jest juz otwarty.
3. Toolset startuj czysto, najlepiej recznie albo bardzo prostym startem bez
   argumentow.
4. Codex moze wykonac read-only `PrintWindow`/enumeracje okien i porownanie
   screenshotu, jesli widok jest juz poprawnie zaladowany.
5. Jesli pojawia sie nierozstrzygniete recovery, progress/loading, szary wireframe viewport,
   access violation albo brak teksturowanego widoku area, proof jest zatruty:
   zatrzymaj prace z Toolsetem i nazwij blocker.

Twardy guard wyboru modulu: Toolset proof moze otwierac wylacznie modul
utworzony przez biezacy workflow proof albo modul/lab jawnie zatwierdzony dla
tego konkretnego proofu. Nie otwierac `the_last_city - codex.mod`, wariantu z
Unicode dashem, datowanych kopii ani backupow jako fallbackow tylko dlatego, ze
zawieraja target area albo zgodny tile layout. Jesli zatwierdzony modul nie
istnieje albo jest w kwarantannie, przerwac z blockerem
`approved_toolset_module_missing_or_quarantined`.

Dozwolona lekka automatyzacja jest pomocnicza, nie naprawcza:

- targeted `BM_CLICK`/TreeView messages sa dopuszczalne tylko na czystej,
  responsywnej sesji i dla znanych kontrolek;
- read-only capture jest preferowanym dowodem;
- jesli trzeba zgadywac, klikac toolbar albo restartowac okno, to nie jest juz
  dobry proof loop.

## Antywzorce

Tych rzeczy nie traktowac jako dobrych praktyk, nawet jesli pojawiaja sie w
starych notatkach z debugowania:

- nie robic automatycznego `Stop-Process -Force` Toolsetu jako elementu proof
  loop;
- nie restartowac pustego frame Toolsetu automatem;
- nie wybierac `Tak` ani `Nie` w recovery, zeby "zobaczyc co bedzie";
  dla dokladnie znanego komunikatu stosowac deterministyczna polityke recovery:
  domyslnie niedestrukcyjne `Tak`, a `Nie` tylko po zapisanej w manifeście
  autoryzacji `recoveryPolicy=discard_backup`;
- nie klikac toolbarow display/render na chybil trafil;
- nie uznawac szarego/wireframe viewportu za Aurora oracle;
- nie repakowac aktywnego modulu, gdy Toolset go trzyma;
- nie otwierac pelnych Last City modulow, ich datowanych kopii ani backupow
  jako zamiennika dla brakujacego lab/oracle modulu;
- nie kontynuowac automatyzacji po access violation.

Incydent z 2026-07-02 byl bledem procesu: probowalem ratowac zla sesje
Toolsetu niezweryfikowanymi akcjami. Poprawna reakcja to pauza live lane,
odczyt dokladnego komunikatu i tozsamosci sesji, zastosowanie znanej polityki
recovery oraz ponowny readback. Pytanie do uzytkownika jest wymagane tylko dla
nieznanego albo destrukcyjnie niejednoznacznego stanu.

## Narzedzia pomocnicze

Jedynym publicznym entrypointem sesji jest manager:

```powershell
npm --prefix backend run areas:toolset-session -- <command>
```

Bezposredni opener i stare wrappery sa adapterami, nie publicznymi workflow.
Live wywolanie poza managerem zwraca `toolset_noncanonical_entrypoint_rejected`.
Manager najpierw obserwuje start pasywnie przez minimum 15 sekund. Kazdy
`TdlgProgress`, tytul modulu, `Loading Inventory List`, `Loading GIT Files` albo
recovery przejmuje wlasciciela ladowania i permanentnie blokuje jawny `Open`.

Aktualizacja 2026-07-03: sam tytul modulu nie wystarcza. Po otwarciu modulu
trzeba odczekac settle window i ponownie zeskanowac wszystkie top-level okna
Toolsetu oraz teksty dzieci. `Access violation`, recovery prompt albo
`Loading Inventory List` po settle oznacza nieudany open, nawet jezeli frame
modulu zdazyl sie pojawic.

Aktualizacja 2026-07-10 po audycie `the_last_city - codex.mod`: `TdlgProgress`
z tytulem `Loading Inventory List` pojawil sie dopiero po pozytywnym zwrocie
TreeView dla `_ikea`. To jest `toolset_stale_progress_modal`: stan zatruty i
prekursor tej samej rodziny AV, nawet gdy pasywny odczyt nie widzi jeszcze
doslownego tekstu `Access violation`. Opener musi wykonac pasywny settle-check
po `Open Area` przed zwroceniem `ok: true`. Po tym sygnale nie wolno przesuwac
okna miedzy ekranami, robic screena, otwierac kolejnego Area ani wykonywac
retry; zapisac blocker i zatrzymac sesje.

Regula `DISPLAY2`: pozycje frame'u trzeba ustawic w `[Application]` pliku
`nwtoolset.ini` przed startem Toolsetu. Dla aktualnego stanowiska Codex jest to
`Left=0`, `Top=0`; opener ustawia te wartosci razem z `MRU0`. Nie wolno uzywac
`SetWindowPos` do przenoszenia pelnego Toolsetu po `Open Area`, zwlaszcza gdy
settle-check jeszcze nie zakonczyl sesji sukcesem.

## Kolejka Oracle Area

Audyt wielu lokacji wymaga jednej, juz zweryfikowanej sesji Toolsetu. Runner
`run-toolset-area-oracle-queue.mjs` nigdy nie uruchamia `nwtoolset.exe` i nigdy
nie wysyla `Open Module`; przechodzi tylko po Area przez ten sam, walidowany
`TTreeView`. Kolejke przygotuj offline z aktualnego snapshotu Aurora Web:

```powershell
node backend\scripts\run-areas-location-audit.mjs --dryRun --outDir .codex-tmp\area-audit-queue
```

Po pojedynczym, czystym otwarciu pierwszego Area uruchom kolejke bez zgadywania
kadru:

```powershell
node backend\scripts\run-toolset-area-oracle-queue.mjs `
  --queue .codex-tmp\area-audit-queue\manifest.json `
  --wheelSteps 0
```

`--wheelSteps` jest swiadomym, targetowanym `WM_MOUSEWHEEL` do aktualnego
`TScrollBox` viewportu. Dodatnia wartosc przybliza, ujemna oddala. Nie wolno
dobierac tej wartosci heurystycznie z rozmiaru Area: kadr zatwierdza sie po
podgladzie pierwszego screena dla danej klasy lokacji. Runner robi tylko
`PrintWindow`, wiec widoczne overlaye pulpitu nie sa powodem do focusu,
topmost, przenoszenia okna ani `CopyFromScreen`.

Kazdy krok kolejki ma settle-check. `Access violation`, recovery albo
`toolset_stale_progress_modal` zatrzymuje caly run przy pierwszym Area; nie ma
przejscia do kolejnej lokacji, retry ani drugiego `Open Module`.

Aktualizacja 2026-07-03 po incydencie MRU: wrapper ustawia tymczasowo `MRU0`
na oczekiwany lab modul przed startem Toolsetu. To chroni przed sytuacja, w
ktorej welcome dialog/fallback odpala poprzedni `the_last_city` z MRU i
wywoluje access violation na zlym module. Po proofie `nwtoolset.ini` trzeba
przywrocic ze snapshotu.

Aktualizacja 2026-07-06 po bledzie double-open: jedna sesja Toolsetu moze miec
tylko jeden `Open Module` i jeden `Open Area`. Po zaladowaniu modulu/area nie
wolno ponownie uruchamiac openerow; dalsze kroki to tylko read-only screenshot,
enumeracja okien i porownanie. Guard `toolset-module-open-session-guard.json`
blokuje drugi opener takze wtedy, gdy pierwszy run jest jeszcze w luce miedzy
zapisem guardu a pojawieniem sie widocznego `nwtoolset.exe`. Automatyczny drugi
`Start-Process` jest zabroniony bez jawnego
`AURORA_TOOLSET_ALLOW_SECOND_TOOLSET_START=1`, ktorego nie uzywac w normalnym
proof loop.

Aktualizacja 2026-07-06 po rozdzieleniu hard/soft blockerow: status
`requires_explicit_override` w `preflight-last-city-toolset-proof.mjs` nie
oznacza, ze kandydat jest zaakceptowany wizualnie. Oznacza tylko, ze offline
GFF/diff/crash-risk sa czyste, a historyczna rodzina access violation wymaga
jednej jawnie nadzorowanej proby. Taka proba musi byc pojedyncza: jeden
`Open Module`, jeden `Open Area`, bez automatycznego restartu i bez kolejnego
openera po zaladowaniu.

Do przygotowania takiej proby uzywaj packet wrappera w trybie domyslnym
bez launchu:

```powershell
node backend\scripts\run-last-city-supervised-toolset-proof.mjs `
  --label tilemap77-nw-couch-bench-material-supervised-20260706
```

Jesli nadzorowana proba da juz PNG z Toolsetu, nie otwieraj modulu drugi raz.
Wepnij istniejacy obraz do tego samego packetu:

```powershell
node backend\scripts\run-last-city-supervised-toolset-proof.mjs `
  --label tilemap77-nw-couch-bench-material-supervised-20260706 `
  --ingestCapture <pngPath-from-supervised-capture>
```

Korekta 2026-07-10 po AV `004EC141`: archiwizacja `temp0` nie jest sama w
sobie dowodem awarii i nie moze oznaczac modulu jako `rejected`. Jej jedynym
celem jest zachowanie workspace przed czystym preflightem. Snapshot
`nwtoolset.ini` moze nie istniec; wtedy cleanup musi jawnie zwrocic
`snapshot_missing` i nie wolno twierdzic, ze INI zostalo przywrocone. Przed
kolejna nadzorowana proba raport AV musi zawierac pola `welcomeHandled`,
`openModuleDialogHandled` oraz `moduleOpenActionSubmitted`; bez nich nie wolno
wnioskowac, czy wybor modulu zostal wyslany raz czy zero razy.

Korekta `temp0` 2026-07-10: sam katalog `modules\\temp0` nie jest dowodem
uszkodzenia. Moze zawierac niepelny, bajtowo zgodny podzbior zasobow `.mod`.
Nie wolno go automatycznie przenosic ani kasowac tylko dlatego, ze istnieje.
Przed jawnie nadzorowanym uzyciem cache musi zawierac `module.ifo`; bez tego
Toolset pokazuje recovery dialog i zadne `Tak`/`Nie` nie moze byc klikniete
automatycznie. `cleanup-aurora-toolset-critical-stop.mjs` zachowuje teraz
`temp0` domyslnie; przeniesienie wymaga `--archiveTemp0`.

Korekta 2026-07-24 zastępuje wyłącznie powyższy ogólny zakaz dla dokładnie
związanego proofu modelu. Samo istnienie `module.ifo` nadal nie wystarcza.
Publiczna trasa binary-bootstrap może kliknąć niedestrukcyjne `Tak` dokładnie
raz tylko po utworzeniu i bezpośredniej rewalidacji
`aurora-toolset-verified-temp0-recovery-admission/v1`: zainstalowany MOD musi
mieć przypięty hash źródła, każdy obsługiwany zasób ERF musi odpowiadać dokładnie
jednemu zwykłemu plikowi `temp0` o identycznych bajtach, a katalog nie może
zawierać braków, dodatków, reparse pointów ani wpisów niebędących plikami.
Akcja jest kierowanym `BM_CLICK` na dokładnie znanym modalu, bez globalnego
inputu, archiwizacji/kasowania `temp0`, zmian INI/MRU lub późniejszego
`File > Open`. Każda niezgodność nadal zatrzymuje trasę.

Ten tryb waliduje PNG i uruchamia porownanie konceptu bez startowania
`nwtoolset.exe`, bez MRU staging i bez kolejnego `Open Module`.

Ten tryb zapisuje manifest i komendy, ale nie otwiera Toolsetu. Realny launch
jest blokowany, chyba ze komenda ma jednoczesnie `--execute 1` oraz
`--i-understand-toolset-av-risk 1`. Brak tego drugiego parametru musi konczyc
sie odmowa bez procesu `nwtoolset.exe`.

Standardowy cleanup po access violation:

```powershell
node backend\scripts\cleanup-aurora-toolset-critical-stop.mjs --reason access-violation
```

To jest narzedzie krytycznego stopu: zamyka procesy Aurory, archiwizuje
`modules/temp0` i przywraca `nwtoolset.ini`. Nie uzywac go jako zwyklego
restartu w petli proof.

## Zasady bezpieczenstwa

- Dozwolone: odczyt `EnumWindows` / `EnumChildWindows`, `GetWindowText`,
  `GetClassName`, `GetWindowRect`, `PrintWindow`.
- Dozwolone: targeted window messages do znanego okna/kontrolki Toolsetu, np.
  `PostMessage(WM_COMMAND)` dla komend menu otwierajacych modale, `SendMessage`
  dla odczytow i prostych kontrolek, `BM_CLICK`, `TVM_EXPAND`, `TVM_SELECTITEM`, `TVM_GETITEM`,
  `TVM_GETITEMRECT`, `WM_LBUTTONDBLCLK` wyslany do samego `TTreeView`.
- Dozwolone: odczyt tekstow `TreeView` przez `VirtualAllocEx`,
  `WriteProcessMemory`, `ReadProcessMemory`, kiedy kontrolka wymaga wskaznika w
  pamieci procesu Toolsetu.
- Niedozwolone bez swiezej zgody uzytkownika: `SetCursorPos`, globalne
  `SendKeys`, globalne klikniecia, globalne kolko myszy, drag and drop,
  przejmowanie fokusu na glownym ekranie.
- Jesli operacja wymaga realnego fokusu albo globalnego inputu, przerwac i
  nazwac blocker zamiast wykonywac ja po cichu.

## Potwierdzony flow: the_last_city / cdx_mapflat01

Ten flow jest historycznym, waskim dowodem dla `cdx_mapflat01`; nie jest ogolna
zgoda na otwieranie pelnych modulow `the_last_city - codex.mod`, wariantow z
Unicode dashem, datowanych kopii ani backupow przy innych proofach.

Srodowisko potwierdzone 2026-07-02:

- Toolset: `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`
- Modul: `C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city — codex.mod`
- Area testowa: `cdx_mapflat01`
- Nazwa area: `Ostatnie Miasto - Port, Mieszkanie Kartografa`

1. Uruchom Toolset bez argumentow:

   ```powershell
   Start-Process -FilePath "C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe"
   ```

2. Jezeli pojawi sie recovery confirmation:

   - Ta historyczna procedura ręczna jest zastąpiona przez korektę z
     2026-07-24 wyłącznie dla dokładnego
     `aurora-toolset-verified-temp0-recovery-admission/v1`.
   - Bez tego admission recovery pozostaje blockerem automatycznego proofu i
     nie wolno wybierać `Tak` ani `Nie` automatem.
   - Po recovery nie uznawaj sesji za proof-ready, dopoki nie ma normalnego,
     teksturowanego viewportu area i responsywnego Toolsetu.

3. Jezeli pojawi sie welcome dialog, nie klikaj globalnie i nie filtruj go
   wylacznie po klasie `TdlgWelcome`. Na tej maszynie stabilnym sygnalem jest
   top-level window z tytulem `BioWare Aurora Neverwinter Nights Toolset` oraz
   widocznymi dziecmi:

   - `TRadioButton` z tekstem `Open an existing Module`
   - `TButton` z tekstem `OK`

   Nastepnie ustaw radio przez `BM_SETCHECK`, wykonaj synchroniczne
   `BM_CLICK` na radio i dopiero potem `BM_CLICK` na `OK`. Sam `PostMessage`
   na radio moze przegrac z domyslnym `Start normally`, a wtedy Toolset
   zaladuje MRU0.

4. Jezeli welcome nie otwiera modulu, ale istnieje pusty frame Toolsetu, nie
   traktuj tego jako pewnego stanu proof-ready. Historycznie dzialala komenda:

   ```text
   PostMessage(hwndFrame, WM_COMMAND=0x0111, wParam=44, lParam=0)
   ```

   Mozna jej uzyc tylko na czystej, responsywnej sesji i tylko gdy nie ma
   recovery/progress/access violation. Potem dialog `Open` da sie obsluzyc
   przez:

   ```text
   LB_GETCOUNT -> 65
   LB_SETCURSEL -> 51
   BM_CLICK -> przycisk Open
   ```

   Preferuj odczyt tekstow listy przez `LB_GETTEXTLEN` + `LB_GETTEXT` z
   `SendMessageW`, a dopiero jako fallback uzywaj indeksu. Potwierdzone
   2026-07-03: lista `Open` zwrocila m.in. `the_last_city — codex` pod
   indeksem `51` i `codex_training_field` pod wlasnym wpisem. Dopasowanie
   musi najpierw szukac dokladnej nazwy bez `.mod`, bo substring
   `the_last_city|codex` moze omylkowo trafic w `the_last_city — codex — new vfx`.

5. Poczekaj na zaladowanie modulu. Poprawny top-level frame ma tytul w stylu:

   ```text
   BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - the_last_city — codex.mod
   ```

   W niektorych manifestach tytul bywa znormalizowany do `the_last_city - codex.mod`.
   Traktuj dopasowanie po czesciach `the_last_city` oraz `codex.mod` jako stabilniejsze
   niz doslowny znak myslnika.

6. Rozwin galaz `Areas` w widocznym `TTreeView`:

   - `TVM_GETNEXTITEM` + `TVGN_ROOT` zwraca uchwyt root item.
   - `TVM_EXPAND` + `TVE_EXPAND` na root item rozwija liste area.

7. Znajdz area bez przewijania:

   - Pobierz pierwsze dziecko root item przez `TVM_GETNEXTITEM` + `TVGN_CHILD`.
   - Iteruj rodzenstwo przez `TVM_GETNEXTITEM` + `TVGN_NEXT`.
   - Tekst pozycji czytaj przez `TVM_GETITEMA`; dla procesu 32-bitowego Toolsetu
     przygotuj 32-bitowy `TVITEMA` w pamieci Toolsetu przez `VirtualAllocEx`.
   - Dla `cdx_mapflat01` potwierdzony wpis drzewa ma tekst:

     ```text
     Ostatnie Miasto - Port, Mieszkanie Kartografa
     ```

8. Otworz area bez fizycznego klikniecia:

   - `TVM_SELECTITEM` + `TVGN_CARET` na znalezionym item.
   - `TVM_ENSUREVISIBLE` na tym samym item.
   - `TVM_GETITEMRECT` zwraca prostokat tekstu w koordynatach klienta `TTreeView`.
   - Wyslij do `TTreeView` sekwencje `WM_LBUTTONDOWN`, `WM_LBUTTONUP`,
     `WM_LBUTTONDBLCLK`, `WM_LBUTTONUP` w srodek prostokata. To jest targeted
     message do kontrolki, nie globalne klikniecie.

9. Zbierz dowod:

   ```powershell
   $env:AURORA_TOOLSET_EXPECTED_MODULE='the_last_city — codex.mod'
   $env:AURORA_TOOLSET_EXPECTED_MODULE_PARTS='the_last_city|codex.mod'
   $env:AURORA_TOOLSET_EXPECTED_AREA='cdx_mapflat01'
   npm run areas:toolset-window-capture
   ```

   Sukces dla area view wymaga:

   - `captureSuccess=true`
   - `canRunVisualComparison=true`
   - `areaViewerOpen=true`
   - `contextMismatch=false`
   - teksturowany, normalny viewport area na screenshotcie

## Natywny Area Wizard

Potwierdzone w lab module `codex_training_field.mod` 2026-07-03:

- czysty open malego modulu przeszedl bez access violation;
- `WM_COMMAND 133` wyslany przez `PostMessage` do top-level `TfrmFrame`
  otwiera `Area Wizard` (`TdlgAreaWizard`);
- ten sam `133` wyslany do `TApplication` nie otworzyl dialogu;
- `WM_COMMAND 134` nie otworzyl `Area Wizard`;
- `SendMessage(WM_COMMAND)` jest niebezpieczne dla komend menu, bo blokuje
  watek wywolujacy, gdy komenda otwiera modal. Uzywaj `PostMessage`, potem
  obserwuj top-level okna;
- nie skanuj szerokich zakresow komend w Toolsecie. Probe 130-146 otworzyl
  `Options` (`TdlgOptions`) i utknal na modalu. Komendy musza byc znane albo
  testowane pojedynczo w labie.

Dowod:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-wizard-postmessage-133-134-probe-20260703T114647.json
```

Wazne: do lab-probe uzyto tymczasowego MRU0 w `nwtoolset.ini`, a po probe
oryginalny plik zostal przywrocony z:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/nwtoolset.ini.snapshot-20260703T1135.txt
```

## Dowody i historia debugowania

Ta sekcja dokumentuje co sie wydarzylo. Nie wszystkie wymienione kroki sa
zalecane; dobre praktyki sa w sekcjach wyzej.

- Modul zostal zaladowany w Toolsecie jako `the_last_city — codex.mod`.
- Automatyczne otwarcie area wykonuje skrypt:
  `backend/scripts/open-last-city-area-toolset-no-global-input.mjs`.
- Pelny wrapper od pustego Toolsetu do otwartego area byl testowany, ale po
  incydencie access violation nie jest juz zalecanym domyslnym proof loopiem:
  `backend/scripts/open-last-city-module-and-area-toolset-no-global-input.mjs`.
- Test wrappera od zera przeszedl z `startedToolset=true`, `welcomeHandled=true`
  i `areaItemText=Ostatnie Miasto - Port, Mieszkanie Kartografa`.
- Skrypt wybiera widoczne `TTreeView` po rootach `Areas / Conversations / Scripts`, a potem skanuje tylko bezposrednie dzieci `Areas`. Nie wolno wchodzic DFS-em w podgalezie pierwszego area, bo wtedy skrypt utknie w `Placeables/Scripts` istniejacego obszaru.
- Finalny read-only capture po otwarciu `cdx_mapflat01`:
  `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260702T150629Z.png`
- Swiezy capture po naprawie wrappera:
  `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260702T170628Z.png`
- Capture po pelnym tescie od zera:
  `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260702T171351Z.png`
- Capture po iteracji mieszkania z silhouette pass:
  `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260702T191735Z.png`
- Nieprawidlowy capture po cold recovery/wireframe, zachowany tylko jako
  negatywny przyklad:
  `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260702T194244Z.png`.
  Ten plik dokumentuje znany zly stan widoku, ale nie jest dowodem parity.
- Concept comparison dla `cdx_mapflat01`:
  `backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/comparison-contact-sheet.png`
  oraz `backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/comparison-report.json`.
- Manifest po otwarciu area raportowal:

  ```json
  {
    "captureSuccess": true,
    "canRunVisualComparison": true,
    "contextMismatch": false,
    "loadedModule": "the_last_city - codex.mod",
    "areaViewerOpen": true,
    "expectedArea": "cdx_mapflat01",
    "blockerCode": null
  }
  ```
- Przy ponownym generowaniu modulu Toolset moze trzymac lock na `.mod`.
  Najlepsza praktyka: uzytkownik zamyka Toolset recznie, Codex robi repack, a
  potem proof zaczyna sie od czystego startu.
- Nie uzywaj automatycznego force-close Toolsetu jako elementu proof loop.
  W tej sesji taki cykl doprowadzil do access violation; poprawny runbookowy
  stan po takim bledzie to pauza i manualne zamkniecie okna bledu przez
  uzytkownika.
- Przy pisaniu callbackow PowerShell/Win32 nie uzywaj nazw zmiennych `pid`,
  `R`, `C`, `T` ani `cls`; w tej sesji `pid` bylo readonly, a krotkie nazwy
  latwo kolidowaly z aliasami albo wbudowanymi poleceniami.

## Znane drobiazgi

- Skrypt `capture-areas-toolset-window-readonly.mjs` historycznie ma tekst
  blockera `missing_ikea_area_viewer`. Przy pracy na innym area sprawdzaj
  rownoczesnie `expectedArea` oraz `areaViewerOpen`; sam tekst blockera moze byc
  stary.
- Uchwyty okien i itemow `TreeView` sa efemeryczne. Nie wpisywac ich na stale do
  automatyzacji; zawsze enumerowac aktualny proces Toolsetu.
- Nie uruchamiac `nwtoolset.exe` z argumentem sciezki modulu. Na tej maszynie
  potwierdzony flow to start bez argumentow i wybor modulu z UI Toolsetu.
