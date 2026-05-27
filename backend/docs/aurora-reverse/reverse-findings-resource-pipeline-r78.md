# Resource Pipeline Deep Dive (R78)

## Zakres i Ÿród³a
Analiza oparta wy³¹cznie o:
- `C:\Projects\New Folder\export\decompiled_all.c`
- `C:\Projects\New Folder\export\functions.tsv`
- `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\xrefs_domain_mapped.tsv`
- `C:\Projects\New Folder\export\imports.tsv`
- `C:\Projects\New Folder\export\strings.tsv`

## Rekonstrukcja pipeline ³adowania zasobów (2DA/TLK/HAK/modu³)

### 1) Bootstrap œcie¿ek zasobów i aliasów (nwn.ini + alias map)
1. Kod inicjalizacyjny u¿ywa sekcji `[Alias]` i plików `nwn.ini`:
   - `decompiled_all.c:14469` (`s_[Alias]_00c1d6be`)
   - `decompiled_all.c:14529` (`s_nwn.ini_00c1d925`)
2. Ta sama ga³¹Ÿ inicjalizacji trzyma bazowe aliasy dla katalogów zasobów:
   - `decompiled_all.c:14437` (`s_\hak_00c1d712`)
   - `decompiled_all.c:14465` (`s_\tlk_00c1d848`)
3. W `functions.tsv` obecne s¹ thunki INI API (`GetPrivateProfileString*`, `WritePrivateProfileString*`), spójne z modelem aliasów/INI:
   - `functions.tsv:21897`, `21898`, `22003`, `22004`
4. `FUN_0057f8b8` (0x0057f8b8) jest centralnym inicjalizatorem œcie¿ek/konfiguracji (xrefy `\hak`, `\tlk`):
   - `xrefs_domain_mapped.tsv`: wpisy `hak` dla `0058105a..00581131`, wpisy `tlk` dla `00584de0..00584eb7`

Wniosek: pipeline zaczyna siê od zbudowania mapy katalogów i aliasów zasobów (w tym HAK/TLK) z konfiguracji.

Confidence: **0.93 (wysokie)**

### 2) Wczytanie metadanych modu³u z `Module.IFO` (w tym Custom TLK i lista HAK)
1. Nazwy kluczy modu³u s¹ jawnie zdefiniowane:
   - `decompiled_all.c:15501` (`s_Mod_CustomTlk_00c2d566`)
   - `decompiled_all.c:15539` (`s_Mod_HakList_00c2d793`)
2. Funkcja `FUN_005b5bc4` (0x005b5bc4) czyta pola modu³u:
   - definicja: `decompiled_all.c:261667`
   - odczyt `Mod_CustomTlk` przez `FUN_00aef090`: `decompiled_all.c:262330`
   - odczyt listy `Mod_HakList` przez `FUN_00aeeb7c`: `decompiled_all.c:262516`
3. `FUN_005b5bc4` jest wywo³ywana na obiekcie modu³u w sekwencji roboczej:
   - `decompiled_all.c:267612`

Wniosek: `FUN_005b5bc4` jest rdzeniem deserializacji `Module.IFO` do runtime state modu³u, w tym TLK/HAK chain.

Confidence: **0.96 (bardzo wysokie)**

### 3) TLK resolution i otwarcie tabeli dialogowej
1. Dla `TLK` widaæ jednoczeœnie œcie¿ki instalacyjne i fallback `data\tlk`:
   - `strings.tsv:16962` (`data\\tlk`)
   - `strings.tsv:16991` (`TLKINSTALL`)
   - `strings.tsv:16992` (`\\data\\tlk`)
2. Te same symbole s¹ xrefowane z `FUN_00abcfec` (0x00abcfec):
   - `xrefs_domain_mapped.tsv`: `00ac44b8..00ac458f`, `00ac7256..00ac7314`
3. `FUN_005888f0` (0x005888f0) ma bezpoœredni komunikat b³êdu otwarcia `dialog.tlk`:
   - `xrefs_domain_mapped.tsv`: `0058a781 -> s_Error:_could_not_open_dialog.tlk_00c1da79`
   - `strings.tsv:10619`

Wniosek: po odczycie modu³u pipeline sk³ada œcie¿kê TLK (custom + install/fallback) i próbuje otworzyæ `dialog.tlk`; b³¹d jest obs³u¿ony jawnie.

Confidence: **0.90 (wysokie)**

### 4) HAK chain resolution i warstwa nadpisywania zasobów
1. W `Module.IFO` istnieje lista HAK (`Mod_HakList` + elementy `Mod_Hak`):
   - odczyt: `decompiled_all.c:262516` + kolejne odwo³ania do `s_Mod_Hak_...`
   - xrefy: `xrefs_domain_mapped.tsv` wpisy `hak` dla `FUN_005b5bc4`
2. Funkcja `FUN_0057f8b8` obs³uguje root `\hak` (inicjalizacja œcie¿ek zasobów):
   - `xrefs_domain_mapped.tsv`: `0058105a..00581131`
3. Dodatkowy sygna³ warstwy konfliktów/priorytetów z HAK:
   - `xrefs_domain_mapped.tsv`: `FUN_005ce044` + `s_ResourceInHak_00c35c53`
   - `decompiled_all.c:274234` (rejestracja `ResourceInHak`)

Wniosek: pipeline buduje aktywny stos HAK z modu³u, który wp³ywa na koñcow¹ rozstrzygalnoœæ zasobów.

Confidence: **0.88 (wysokie)**

### 5) £adowanie 2DA po zbudowaniu search path
1. Wiele funkcji operuje na `2DAName` (`FUN_004818b0`, `FUN_0052ede0`, `FUN_00532174`, `FUN_00612a44`):
   - `xrefs_domain_mapped.tsv`: wpisy domeny `2da`
2. Artefakty typów potwierdzaj¹ parser/warstwê 2DA:
   - `strings.tsv:163` (`CResHelper<CRes2DA,2017>`)
   - `strings.tsv:6133`, `6134` (`CRes2DA`)

Wniosek: po zestawieniu Ÿróde³ zasobów (core + modu³ + HAK + TLK) wykonywane s¹ lookupy 2DA na aktywnym resource stack.

Confidence: **0.85 (œrednio-wysokie)**

### 6) Zapis modu³u (`Module.IFO`) i round-trip pól TLK/HAK/entry
1. Funkcja `FUN_005bb574` (0x005bb574) serializuje pola modu³u:
   - `decompiled_all.c:264309` (`Mod_CustomTlk`)
   - `decompiled_all.c:264311` (`Mod_Entry_X` ...)
   - `decompiled_all.c:264318` (`Mod_Expan_List`)
   - `decompiled_all.c:264464` (`Mod_HakList`)
2. Œcie¿ki/formaty modu³u:
   - `decompiled_all.c:10729` (`%s%s%03d.mod`)
   - `decompiled_all.c:10730` (`\Module.IFO`)
   - wywo³anie zapisu: `decompiled_all.c:168740` (call `FUN_005bb574(...)`)

Wniosek: pipeline ma pe³ny round-trip IFO: read (`005b5bc4`) <-> write (`005bb574`) dla TLK/HAK i metadanych modu³u.

Confidence: **0.97 (bardzo wysokie)**

## Kluczowe funkcje (adresy, evidence, confidence)

| Funkcja | Adres | Rola w pipeline | Evidence (skrót) | Confidence |
|---|---:|---|---|---:|
| `FUN_0057f8b8` | `0x0057F8B8` | globalny bootstrap œcie¿ek zasobów | xref `\hak` i `\tlk` (`xrefs_domain_mapped.tsv`, wpisy `0058105a..`, `00584de0..`); definicja `decompiled_all.c:233522` | 0.93 |
| `FUN_00abcfec` | `0x00ABCFEC` | resolver œcie¿ek instalacyjnych TLK/HAK | xrefy `TLKINSTALL`, `TLKLOCINSTALL`, `HAKINSTALL`, `data\tlk` (`xrefs_domain_mapped.tsv`, zakres `00ac44b8..00ac7314`) | 0.89 |
| `FUN_005888f0` | `0x005888F0` | otwarcie/obs³uga TLK (`dialog.tlk`) | xref b³êdu `Error: could not open dialog.tlk` (`xrefs_domain_mapped.tsv: 0058a781`, `strings.tsv:10619`) | 0.90 |
| `FUN_005b5bc4` | `0x005B5BC4` | deserializacja `Module.IFO` (Custom TLK, HakList, entry, expan) | `decompiled_all.c:262330` (`Mod_CustomTlk`), `262516` (`Mod_HakList`), definicja `261667` | 0.96 |
| `FUN_005bb574` | `0x005BB574` | serializacja `Module.IFO` (round-trip) | `decompiled_all.c:264309`, `264311`, `264318`, `264464`; call-site `168740` | 0.97 |
| `FUN_005ce044` | `0x005CE044` | opcje/warstwa diagnostyki konfliktów HAK (`ResourceInHak`) | `xrefs_domain_mapped.tsv` wpis `005ce620`; `decompiled_all.c:274234` | 0.76 |
| `FUN_004818b0` | `0x004818B0` | lookup 2DA (`2DAName`) | `xrefs_domain_mapped.tsv` wpisy `00482d63..00482de6`; `functions.tsv:942` | 0.82 |
| `FUN_0052ede0` | `0x0052EDE0` | lookup 2DA (`2DAName`) | `xrefs_domain_mapped.tsv` wpisy `0052fcdc..0052fd7b`; `functions.tsv:2145` | 0.80 |
| `FUN_00532174` | `0x00532174` | lookup 2DA (`2DAName`) | `xrefs_domain_mapped.tsv` wpisy `00533d45..00533e06`; `functions.tsv:2150` | 0.80 |
| `FUN_00612a44` | `0x00612A44` | lookup `Equip2DA` | `xrefs_domain_mapped.tsv` wpisy `00612b81..00612c04`; `functions.tsv:3498` | 0.78 |

## Syntetyczny przep³yw koñcowy (operacyjny)
1. Inicjalizacja aliasów i œcie¿ek (`nwn.ini`, `[Alias]`, `\hak`, `\tlk`) przez `FUN_0057f8b8` + `FUN_00abcfec`.
2. Odczyt `Module.IFO` przez `FUN_005b5bc4` i pobranie `Mod_CustomTlk` + `Mod_HakList`.
3. Rozwi¹zanie i otwarcie TLK (z fallbackami install/data) przez œcie¿ki z kroku 1 i logikê `FUN_005888f0`.
4. Zbudowanie ³añcucha HAK (order-sensitive) i warstwy konfliktów zasobów.
5. Lookupy 2DA (`2DAName`/`Equip2DA`) na aktywnym resource stack.
6. Przy zapisie/eksportach: `FUN_005bb574` zapisuje zaktualizowane pola do `Module.IFO`/`.mod`.

## Ryzyka i granice pewnoœci
- `FUN_00abcfec` ma status `Unable to decompile` w `decompiled_all.c`, wiêc jego rola opiera siê na bardzo mocnych xrefach stringów konfiguracyjnych (wysokie, ale poœrednie evidence).
- Czêœæ helperów (`FUN_00ae*`, `FUN_00af*`) jest nieroznazwana semantycznie; rola zosta³a wyprowadzona z kontekstu wywo³añ i nazw kluczy (`Mod_*`).
