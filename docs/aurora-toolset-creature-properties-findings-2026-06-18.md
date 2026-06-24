# Aurora Toolset: Creature Properties findings

Data proby: 2026-06-18

Status: `opened-live`

## Kontekst

- Modul: `the_last_city -- codex.mod` / wariant pliku z em-dash w nazwie.
- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Monitor: drugi ekran, `TfrmFrame` na wspolrzednych ujemnych X.
- Area live: `d_und`.
- Obiekt testowy: istniejacy creature `Inzynier`.
- Tag obiektu: `d_und_engineer`.
- Mutacja modulu: nie.
- Zapis modulu: nie.

Najpierw potwierdzono czytelny screenshot drugiego ekranu. To jest bramka
dowodowa: jesli screen jest ciemny, pusty albo nie pokazuje realnego Toolsetu,
atom nie powinien byc promowany jako odtworzony live.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-069-readability-gate-after-user-note.png` | Toolset widoczny i czytelny na drugim ekranie przed atomem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-068-s09-d-und-creatures-expanded.png` | `d_und -> Creatures` rozwiniete, widoczne creature instances. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-072-s09-creature-doubleclick-attempt.png` | Double-click creature nie otworzyl properties, tylko zostawil focus/selection. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-075-s09-creature-properties-basic-visible.png` | `Creature Properties`, karta `Basic`, po podniesieniu dialogu na wierzch. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-076-s09-creature-properties-statistics.png` | Karta `Statistics`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-077-s09-creature-properties-appearance.png` | Karta `Appearance`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-078-s09-creature-properties-classes.png` | Karta `Classes`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-079-s09-creature-properties-skills.png` | Karta `Skills`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-080-s09-creature-properties-scripts.png` | Karta `Scripts`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-081-s09-creature-properties-advanced.png` | Karta `Advanced`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-082-s09-creature-properties-feats.png` | Karta `Feats`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-083-s09-creature-properties-spells.png` | Karta `Spells`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-084-s09-creature-properties-special-abilities.png` | Karta `Special Abilities`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-085-s09-creature-properties-comments.png` | Karta `Comments`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-086-s09-after-creature-properties-cancel.png` | Dialog zamkniety przez `Cancel`. |

## Sekwencja odtworzenia

1. Potwierdzic, ze `nwtoolset.exe` dziala i realny screenshot pokazuje Toolset
   na drugim ekranie.
2. Otworzyc albo wykorzystac juz otwarte area `d_und`.
3. W lewym drzewie rozwinac `d_und -> Creatures`.
4. Zaznaczyc istniejacy creature, np. `Inzynier`.
5. Wywolac `Properties`.
6. Przejsc po kartach properties i zrobic screeny.
7. Zamknac dialog przez `Cancel`.

## Skuteczna metoda otwarcia

Menu kontekstowe dla creature mialo taki sam zestaw komend jak trigger:

| Pos | Id | Text |
| --- | --- | --- |
| 0 | 2 | `Focus on Object` |
| 1 | 3 | `Adjust Location` |
| 3 | 9 | `Cut` |
| 4 | 10 | `Copy` |
| 5 | 12 | `Remove` |
| 7 | 15 | `Add To Palette` |
| 9 | 18 | `Variables` |
| 10 | 19 | `Properties` |

W tym przebiegu `WM_CHAR p` do popup menu i syntetyczny klik pozycji menu nie
otworzyly dialogu. Skuteczna sciezka po zaznaczeniu creature:

1. Zaznaczyc creature w lewym `TTreeView`.
2. Wyslac celowane `WM_COMMAND` z ID `19` do tego `TTreeView`.
3. Jesli `TdlgCreatureEdit` istnieje, ale nie jest widoczny na screenie,
   podniesc jego HWND przez `ShowWindow`/`BringWindowToTop` i dopiero wtedy
   wykonac screenshot.

Nie uzyto globalnego `SendKeys` ani przejmowania kursora.

## Zakladki i pola

### Basic

- Preview 3D creature jest po lewej stronie dialogu.
- `First Name`: `Inzynier`.
- `Tag`: `d_und_engineer`.
- `Race`: `Human`.
- `Appearance`: `Human: Shopkeeper`.
- `Gender`: `Male`.
- `Challenge Rating`: `4`.
- `Portrait`: `po_hu_m_99_`.
- Sekcja `Conversation` ma pole wyboru conversation, przycisk `...`, `Edit`
  oraz checkbox `No Interrupt`.
- Dialog ma przycisk `Inventory ...`.

### Statistics

- Ability Scores: `Strength 16`, `Dexterity 13`, `Constitution 16`,
  `Intelligence 10`, `Wisdom 10`, `Charisma 9`.
- Saves: `Fortitude 5`, `Reflex 1`, `Will 0`.
- Armor Class: `Total Armor Class 11`.
- Hit Points: `Total Hit Points 103`.
- Speed: `Movement Rate = Default`.

### Appearance

- Widoczne sa pola czesci modelu: `Head`, `Neck`, `Torso`, `Pelvis`, konczyny,
  `Wings`, `Tail` oraz `Color ...`.
- Dla probki `Human: Shopkeeper` pola wygladaly na wyszarzone/nieaktywne, wiec
  edycja czesci modelu zalezy od typu appearance.

### Classes

- `Alignment`: `True Neutral`.
- Pierwsza klasa: `Fighter`, poziom `1`.
- Dostepne pola kolejnych klas/poziomow, `Default Package for Autolevelup`
  oraz `Levelup Wizard`.

### Skills

- Lista umiejetnosci jest lokalizowana w UI, np. `Tropienie`,
  `Opanowanie`, `Znajomosc mechanizmow`, `Dyscyplina`.
- Wartosci sa w kolumnie `Rank`.

### Scripts

- Widoczne sloty: `OnBlocked`, `OnCombatRoundEnd`, `OnConversation`,
  `OnDamaged`, `OnDeath`, `OnDisturbed`, `OnHeartbeat`, `OnPerception`,
  `OnPhysicalAttacked`, `OnRested`, `OnSpawn`, `OnSpellCastAt`,
  `OnUserDefined`.
- Kazdy slot ma przyciski `...` i `Edit`.
- Widoczne przyciski: `Save Script Set`, `Load Script Set`.
- Przykladowe wartosci: `OnBlocked = x2_def_onblocked`,
  `OnCombatRoundEnd = d_und_a_e_ai`, `OnDeath = d_und_a_e_dh`,
  `OnSpawn = lib_dungeon_spaw`.

### Advanced

- `Blueprint ResRef`: `d_und_engineer`.
- Checkboxy interface: `Disarmable`, `Plot`, `Leaves Lootable Corpse`,
  `No Permanent Death`, `Immortal`.
- `Treasure Model`, `Corpse Decay Time (s)`, `Faction`, `Edit Factions`.
- `Subrace`, `Deity`, `Apply Template`.
- `Challenge Rating`: calculated/adjustment/final.
- `Sound Set`, `Perception Range`, `Variables`.

### Feats

- Tabela ma kolumny `Name`, `Type`, `Assigned`.
- Jest filtr, przycisk pomocy `?` i `Feats Selection Summary`.
- W probce widoczny summary: `Other Feats -> Keen Sense`.

### Spells

- Tabela ma kolumny `Prepared`, `Name`, `Spell Level`, `Casting Level`.
- Sa filtry `Spell Level`, `Meta-Magic`, wybor klasy oraz przyciski
  `Clear Class Spell List`, `Save Class Spell List`, `Load Class Spell List`.

### Special Abilities

- Tabela ma kolumny `Name`, `Type`, `Caster Level`, `Uses`.
- Widoczne wpisy listy, m.in. `Acid Fog`, `Acid Splash`, `Aid`, `Amplify`
  oraz monster abilities.
- Jest filtr `All Spells and Abilities` i `Special Abilities Selection
  Summary`.

### Comments

- Karta jest widoczna i w tej probce pusta.

## Dodatkowe obserwacje

- Dialog moze istniec jako top-level `TdlgCreatureEdit`, ale nie byc widoczny
  na screenie, dopoki nie zostanie podniesiony na wierzch.
- Wielorzedowy `TPageControl` przestawia wizualnie rzad wybranej grupy kart.
  Po kliknieciu `Advanced` karty `Advanced/Feats/Spells/Special
  Abilities/Comments` przesunely sie do dolnego rzedu.
- Dla creature `WM_COMMAND 19` do lewego `TTreeView` zadzialal, chociaz metoda
  popup-`WM_CHAR p` znana z triggera nie zadzialala.
- Kolejne atomy NPC powinny rozdzielac: properties obserwacyjne, zmiane
  appearance, inventory/equipment, faction, script binding oraz conversation.

## Bezpieczenstwo

- Nie uzyto globalnego kursora.
- Nie uzyto globalnego `SendKeys`.
- Nie klikano w canvas.
- Dialog zamknieto przez `Cancel`.
- Modul nie zostal zapisany.
