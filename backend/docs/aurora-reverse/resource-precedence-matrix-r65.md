# Resource Precedence Matrix R65 (Agent C3)

Data: 2026-05-24  
Status: Final (Aurora Reverse alignment)

## 1. Scope

Ten dokument domyka finalna macierz precedence dla warstw:
1. `module_decompiled`
2. `module_packed` (w macierzy skrocone jako `module`)
3. `hak` (wg `hakPriorityEffective`)
4. `override`

Uwaga: warstwa `vanilla KEY/BIF` pozostaje fallbackiem koncowym, ale nie jest glownym przedmiotem tej macierzy.

## 2. Globalne zasady precedence (R65)

## 2.1 Kolejnosc warstw (domyslna)
1. `module_decompiled`
2. `module_packed`
3. `hak`
4. `override`
5. `vanilla KEY/BIF` (poza glowna macierza)

## 2.2 Reguly tie-break i determinism
1. `module_decompiled` ma absolutny priorytet nad `module_packed`.
2. W `hak` obowiazuje porzadek `hakPriorityEffective`; najwyzszy efektywny priorytet wygrywa.
3. Dla remisu priorytetu w tej samej warstwie winnerem jest kandydat zaindeksowany pozniej (stabilny porzadek indeksacji).
4. Warstwa `override` nigdy nie przebija `module_packed` ani `hak`.

## 3. Finalna macierz per typ zasobu

| Typ zasobu | 1 | 2 | 3 | 4 | Decyzja R65 |
|---|---|---|---|---|---|
| `ARE` | `module_decompiled` | `module_packed` | `hak` (blocked) | `override` (blocked) | `ARE` jest module-bound: resolve tylko z warstwy modulu (decompiled->packed). `hak/override` nie sa dopuszczone jako source finalny dla area payload. |
| `GIT` | `module_decompiled` | `module_packed` | `hak` (blocked) | `override` (blocked) | Jak dla `ARE`: `GIT` jest module-bound i musi byc sparowany z `ARE` dla tego samego area resref. |
| `UTC` | `module_decompiled` | `module_packed` | `hak` | `override` | Dla `TemplateResRef` (creature) obowiazuje globalny chain. Overlay semantyczny: `UTC -> GIT instance` (instancja nadpisuje blueprint). |
| `UTP` | `module_decompiled` | `module_packed` | `hak` | `override` | Dla `TemplateResRef` (placeable/door lane) obowiazuje globalny chain. Overlay semantyczny: `UTP -> GIT instance`. |
| `models/textures` | `module_decompiled` | `module_packed` | `hak` | `override` | Runtime asset resolve idzie po globalnym chain; `hak` ma precedence nad `override`. |
| `2DA` | `module_decompiled` | `module_packed` | `hak` | `override` | Lookup 2DA jest deterministic i provenance-aware; przy miss fallback do `vanilla` zgodnie z policy. |
| `TLK` | `module_decompiled` | `module_packed` | `hak` | `override` | Najpierw resolve pliku TLK po chainie warstw, potem semantyka tekstu: `locstring inline -> custom TLK (alt) -> base TLK (main)`. |

## 4. Kolizje i rozstrzygniecia

## 4.1 ARE collision (`module_decompiled` vs `module_packed`)
- Przyklad: `wnd_slms_swamp.are` istnieje w obu warstwach.
- Rozstrzygniecie: wygrywa `module_decompiled`.
- Skutek: `ARE` z `module_packed` jest ignorowane, nawet jesli ma nowszy timestamp.

## 4.2 GIT collision (`module_decompiled` vs `module_packed`)
- Przyklad: `wnd_slms_swamp.git` w obu warstwach, ale z inna liczba `Door List`.
- Rozstrzygniecie: wygrywa `module_decompiled`.
- Skutek: pairing `ARE+GIT` pozostaje z jednego source lane (brak cross-lane mix).

## 4.3 UTC collision (`module_packed` vs `hak`)
- Przyklad: `c_wingsmeph.utc` w module i w `foo_creatures.hak`.
- Rozstrzygniecie: wygrywa `module_packed` (bo `module` jest wyzej niz `hak`).
- Skutek: dopiero po wybraniu UTC dzieje sie overlay `UTC -> GIT`.

## 4.4 UTP collision (`hak` vs `override`)
- Przyklad: `ad_top_lion_1.utp` w module HAK i katalogu `override`.
- Rozstrzygniecie: wygrywa `hak`.
- Skutek: `override` nie moze nadpisac module HAK dla tego samego `resref+type`.

## 4.5 Model collision (`hak A` vs `hak B`)
- Przyklad: `plc_x02.mdl` obecny w dwoch HAK.
- Rozstrzygniecie: wygrywa kandydat z wyzszym `hakPriorityEffective`; przy remisie wygrywa pozniej zaindeksowany.
- Skutek: wynik jest deterministyczny i audytowalny przez candidate list.

## 4.6 Texture collision (`override` vs `module_packed`)
- Przyklad: `tno01_d.dds` w `override` i module.
- Rozstrzygniecie: wygrywa `module_packed`.
- Skutek: `override` dziala tylko jako nizsza warstwa po `module` i `hak`.

## 4.7 2DA collision (`module_decompiled` vs `hak`)
- Przyklad: `appearance.2da` lokalnie zdekompilowane i w HAK.
- Rozstrzygniecie: wygrywa `module_decompiled`.
- Skutek: enrichment bierze rowy 2DA z decompiled i zapisuje provenance source.

## 4.8 TLK collision (`custom TLK` vs `base TLK`)
- Przyklad: ten sam `strref` istnieje w `Mod_CustomTlk` i `dialog.tlk`.
- Rozstrzygniecie: dla strref z bitem alt wygrywa custom TLK (alt table), inaczej base TLK; zawsze po sprawdzeniu `locstring inline`.
- Skutek: brak utraty `strref` i brak destrukcyjnej normalizacji tekstu.

## 5. Normatywne guardrails R65

1. `ARE` i `GIT` musza pozostac `module-bound` (bez finalnego resolve z `hak/override`).
2. `UTC`, `UTP`, `models/textures`, `2DA`, `TLK` uzywaja pelnego chaina warstw.
3. Kazde rozstrzygniecie kolizji musi miec provenance (`winner layer`, `winner priority`, `candidate set` w debug).
4. Brak cichych fallbackow: kazdy miss/blocked-layer powinien zostawic diagnostyke.

## 6. Alignment references

1. `module-source-priority-spec-r63.md`
2. `hak-resolution-spec-r63.md`
3. `source-lists-2da-tlk-spec-r63.md`
4. `admin-runtime-settings-contract-spec-r63.md`
5. `creature-enrichment-spec-r63.md`
6. `area-composition-spec-r63.md`
7. `are-git-validation-spec-r63.md`
8. `hex-processing-ports-spec-r63.md`
