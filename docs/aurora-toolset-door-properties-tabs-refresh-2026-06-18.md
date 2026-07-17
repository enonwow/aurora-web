# Aurora Toolset: Door Properties tabs refresh

Data: 2026-06-18

Ten dokument dopisuje heartbeatowy refresh do wczesniejszego rozpoznania
drzwi. Celem bylo przejsc przez wieksza liczbe zakladek `Door Properties`,
zrobic screeny i zamknac dialog bez mutacji.

## Kontekst

- Modul: `the_last_city - codex.mod`.
- Aktywna area: `hx_tygiel_under`.
- Drzewo: `Areas > Arkona, Kanaly - zapomniany odcinek > Doors`.
- Wybrany obiekt: `hx_undertyg_gatemain`.
- Mutacje: brak.
- Zapis modulu: brak, bo operacja byla obserwacyjna.
- Sterowanie: tylko celowane komunikaty do okien/kontrolek Toolsetu; bez
  przejmowania globalnego kursora i bez globalnego `SendKeys`.

## Sekwencja

1. Potwierdzono, ze `hx_tygiel_under` jest aktywne i `Doors` jest rozwiniete.
2. Dla zaznaczonego `hx_undertyg_gatemain` otwarto context menu na
   `TTreeView`.
3. Do popup menu `#32768` wyslano akcelerator `p`, wybierajac `Properties`.
4. W `Door Properties` przechodzono przez zakladki `Basic`, `Scripts`, `Lock`,
   `Description`, `Area Transition`, `Advanced`, `Comments` i `Trap`.
5. Kazde dograne otwarcie zakonczono `Cancel`.

## Zakladki i rozpoznane pola

### Basic

- `Name`: `Door`.
- `Tag`: `hx_undertyg_gatemain`.
- `Appearance Type`: `Use Generic Appearance`.
- `Generic Appearance`: `Strong Metal Door`.
- `Plot`: checked.
- `Hardness`: `20`.
- `Hit Points`: `5000`.
- `Fortitude Save`: `28`.
- `Reflex Save`: `0`.
- `Will Save`: `0`.

### Scripts

- Widoczne sloty eventow drzwi, m.in. `OnAreaTransitionClick`, `OnClose`,
  `OnDamaged`, `OnDeath`, `OnFailToOpen`, `OnHeartbeat`, `OnLock`,
  `OnPhysicalAttacked`, `OnOpen`, `OnSpellCastAt`, `OnUnLock`,
  `OnUserDefined`.
- `OnDeath`: `x2_door_death`.
- Przy kazdym slocie sa przyciski `...` i `Edit`.
- Widoczne przyciski `Save Script Set` i `Load Script Set`.

### Lock

- `Locked`: checked.
- `Can be relocked`: checked.
- `Automatically remove key after use`: disabled/unchecked.
- `Key required to unlock or lock`: unchecked.
- `Open Lock DC`: `99`.
- `Close Lock DC`: `99`.
- `Key Tag`: pusty.

### Description

- Pole opisu zawiera tekst: `Various gears control the locking mechanism of
  this metal-clad door.`
- Widoczny przycisk `...` przy polu opisu.

### Area Transition

- `Destination Tag`: puste/disabled.
- `Destination Type`: `None` selected; opcje `Door` i `Waypoint` sa widoczne.
- `Loading Screen`: `Default`.
- Widoczny przycisk `Setup Area Transition`.
- Nie klikano `Setup Area Transition`.

### Advanced

- `Blueprint ResRef`: `x3_door_met004`.
- `Belongs To Faction`: `Hostile`.
- `Conversation`: puste.
- `No Interrupt`: unchecked.
- `Initial State`: `Closed`.
- Widoczne pola/przyciski dla `Portrait` i `Variables`.

### Comments

- Zakladka `Comments` otwarta; duze pole komentarzy jest puste.

### Trap

- `Is Trapped`: checked.
- `Trap Type`: `Gas Trap, Deadly`.
- `Detection DC`: `20`.
- `Disarm DC`: `28`.
- `One Shot`: unchecked.
- `Detectable`: checked.
- `Disarmable`: unchecked.
- `OnDisarm`: puste.
- `OnTrapTriggered`: puste.
- `Set DC`: `45`.
- `Detect DC Mod. when set by Rogue`: `22`.
- `Disarm DC Mod. when set by Rogue`: `36`.

## Dowody

- Stan po poprawnym rozwinieciu drzwi:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-501-s48-after-corrected-expand-hx-doors.png`
- `Basic`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-502-s48-after-open-door-properties-basic.png`
- `Scripts`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-503-s48-door-tab-scripts.png`
- `Lock`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-504-s48-door-tab-advanced.png`
- `Description`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-505-s48-door-tab-description.png`
- `Area Transition`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-506-s48-door-tab-comments.png`
- `Advanced` recapture:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-512-s48-door-tab-advanced-recapture.png`
- `Comments` recapture:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-513-s48-door-tab-comments-recapture.png`
- Nieudany `Trap` capture, faktycznie `Basic`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-514-s48-door-tab-trap-recapture.png`
- Poprawiony `Trap` capture:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-516-s48-door-tab-trap-recapture2.png`
- Stan po `Cancel`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-517-s48-after-trap-recapture2-cancel.png`

## Pulapki operacyjne

- Pierwsze klikniecie w `Doors` o zbyt niskim Y trafilo w `Encounters`.
  Poprawny expand w tej konfiguracji byl wyzej.
- Klik na wiersz drzwi wybral `hx_undertyg_gatemain`, a nie planowany
  `hx_undertyg_gate`; dokumentacja S48 opisuje faktycznie otwarty obiekt.
- `TPageControl` ma dwurzedowy uklad zakladek. Po zmianie aktywnej zakladki
  klik w te same koordynaty moze trafic w inna karte niz sugeruje nazwa
  pliku. Dlatego recapture `Advanced`, `Comments` i `Trap` wykonano jako
  osobne otwarcia z `Cancel` po kazdym.
- `hb-504-s48-door-tab-advanced.png` pokazuje faktycznie `Lock`.
- `hb-506-s48-door-tab-comments.png` pokazuje faktycznie `Area Transition`.
- `hb-514-s48-door-tab-trap-recapture.png` pokazuje faktycznie `Basic`.
- Podczas enumeracji okien Toolsetu istnialy stare pomocnicze top-level HWND,
  m.in. `Search`, `Find Instance`, `Select Resource`, `Find Text` i preview
  `Door Properties`, ale mialy `Visible=False`. Nie byly modalnym blockerem
  ani realnym elementem na ekranie, ale warto je odfiltrowywac przy inspekcji
  okien pierwszego monitora.

## Status

- `Door Properties`: `opened-live`.
- `Basic`, `Scripts`, `Lock`, `Description`, `Area Transition`, `Advanced`,
  `Comments`, `Trap`: `opened-live`.
- `Setup Area Transition`: `gap`, celowo nie klikane.
- Mutacje: brak.
- Zapis modulu: brak.
