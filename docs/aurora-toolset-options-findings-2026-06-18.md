# Aurora Toolset: Options findings

Data proby: 2026-06-18

Status: `opened-live`

## Kontekst

- Modul: `the_last_city -- codex.mod` / wariant pliku z em-dash w nazwie.
- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Monitor: drugi ekran, `TfrmFrame` na wspolrzednych ujemnych X.
- Area live w tle: `d_und`.
- Dialog live: `Options`.
- Mutacja ustawien: nie.
- Zapis modulu: nie.

Ten atom dotyczy globalnego dialogu ustawien Toolsetu. Nie klikano checkboxow,
suwakow, pol, `OK` ani innych kontrolek mutujacych. Dialog zamknieto przez
`Cancel`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-128-s14-readability-gate.png` | Bramka czytelnosci przed testem `Tools` ID `129`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-129-s14-tools-command-129-attempt.png` | `Tools` ID `129` nie otworzylo widocznego top-level okna w tym kontekście. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-130-s14-readability-before-tools-130.png` | Bramka czytelnosci przed testem `Tools` ID `130`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-131-s14-tools-command-130-attempt.png` | `Tools` ID `130` otworzylo `Options`, sekcja `General`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-132-s14-options-general.png` | `Options > General`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-133-s14-options-area.png` | `Options > Area`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-134-s14-options-script-editor.png` | `Options > Script Editor`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-135-s14-options-conversation-editor.png` | `Options > Conversation Editor`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-136-s14-options-spell-checking.png` | `Options > Spell Checking`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-137-s14-options-sounds.png` | `Options > Sounds`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-138-s14-options-language.png` | `Options > Language`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-139-s14-after-options-cancel.png` | Dialog zamkniety przez `Cancel`; zostal tylko glowny Toolset. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-269-s24-tools-menu-open.png` | Live screenshot menu `Tools`; pokazuje separator przed `Options`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-270-s24-after-tools-menu-close.png` | Menu `Tools` zamkniete bez wyboru pozycji. |

## Sekwencja odtworzenia

1. Potwierdzic screenshotem, ze Toolset jest widoczny na drugim ekranie i nie
   ma modalnych okien.
2. Wywolac `Tools` ID `129` jako obserwacyjny test; w tym przebiegu brak
   widocznego dialogu.
3. Wywolac `Tools` ID `130` jako `PostMessage(WM_COMMAND, 130)` do `TfrmFrame`.
4. Zweryfikowac `TdlgOptions` z tytulem `Options`.
5. Przejsc po lewej liscie kategorii, robiac screenshot kazdej sekcji.
6. Zamknac przez `Cancel`.
7. Zrobic screenshot po zamknieciu, potwierdzajacy brak modalnego okna.
8. W pozniejszym HB-S24 otworzyc samo menu `Tools` bez wyboru pozycji.
9. Screenshot menu pokazal, ze miedzy `Journal Editor` i `Options` znajduje
   sie separator; to wyjasnia brak widocznego efektu dla ID `129`.

## Mapa `Tools` ID z tego przebiegu

| ID | Wynik live |
| --- | --- |
| `125` | Conversation Editor |
| `126` | Faction Editor |
| `127` | Script Editor |
| `128` | Journal Editor |
| `129` | Brak widocznego top-level okna w tym kontekście |
| `130` | Options |

Aktualizacja HB-S24: live screenshot menu `Tools` pokazuje, ze po
`Journal Editor` znajduje sie separator, a dopiero potem `Options`. Wniosek:
ID `129` nie jest ukrytym edytorem ani gapem, tylko separatorem menu.

## Sekcje Options

### General

- Ostrzezenia i zachowanie startowe Toolsetu:
  - welcome dialog;
  - tworzenie backupow modulu;
  - build module on save;
  - minimize Toolset on test module;
  - warningi ResRef/resource/Hak Pak/creature spell/inventory/color depth;
  - always open module directories;
  - environment mapping on Creatures and Items.

### Area

- Markery i zachowanie widoku area:
  - spawnpoint marker height/width;
  - door orientation arrows;
  - background color;
  - undo levels.
- Widoczna informacja, ze zmiana texture quality albo undo levels wymaga
  restartu aplikacji.

### Script Editor

- Ustawienia edytora skryptow:
  - font i rozmiar;
  - kolory typow tekstu;
  - preview kolorowania;
  - automatically compile scripts on save;
  - generate debug information;
  - code templates directory;
  - external script editor.

### Conversation Editor

- Ustawienia edytora konwersacji:
  - popup przy tworzeniu nowego text entry;
  - speaker name before text;
  - Player/NPC text color;
  - paste link options;
  - drag link options;
  - automatyczny backup conversation files z interwalem minutowym.

### Spell Checking

- Globalny spellcheck:
  - enable spell check;
  - color of text with spelling errors;
  - clear/remember ignore/change word lists;
  - non-conversation automatic spellcheck;
  - conversation editor spell check options.

### Sounds

- Globalne odtwarzanie dzwiekow w edytorze:
  - play ambient sound in area;
  - play ambient music in area i volume;
  - play placed sound objects in area;
  - show listener position for 3D sounds;
  - 2D/3D bias.

### Language

- Jezyk edycji localized text:
  - default language;
  - specified language;
  - lista jezykow, m.in. English, French, German, Italian, Spanish, Polish,
    Korean, Chinese Traditional, Chinese Simplified, Japanese.

## Pulapki

- To sa ustawienia globalne Toolsetu, nie properties konkretnego obiektu.
  Zmiana moze wplynac na wszystkie kolejne heartbeaty i widocznosc sceny.
- `OK` zapisuje ustawienia; w atomie orientacyjnym uzywac tylko `Cancel`.
- Checkboxy, suwaki, kolory i pola sciezek sa mutujace. Klikac tylko lewa liste
  kategorii.
- Aktualizacja HB-S24: ID `129` zostal rozpoznany jako separator menu `Tools`;
  nie ponawiac go jako osobnego eksperymentu.

## Bezpieczenstwo

- Nie uzyto globalnego kursora.
- Nie uzyto globalnego `SendKeys`.
- Nie zmieniano checkboxow, suwakow ani pol.
- Nie klikano `OK`.
- Dialog zamknieto przez `Cancel`.
- Modul nie zostal zapisany.
