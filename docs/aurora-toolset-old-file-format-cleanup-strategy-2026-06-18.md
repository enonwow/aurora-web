# Aurora Toolset Old File Format cleanup strategy - 2026-06-18

## Scope

Rola: modal cleanup strategist.

Zakazy operacyjne:

- nie uruchamiac Aurory;
- nie dotykac okna Toolsetu;
- nie uzywac globalnej myszy, globalnych klikow ani `SendKeys`;
- wykonywac tylko celowane komunikaty Win32 do zweryfikowanych HWND.

## Current evidence

`ORCH-006` folder istnieje:

`.codex-tmp/aurora-live-evidence/orch-006-old-file-format-child-inventory-20260619-000115`

`summary.json` zostal odczytany po oczekiwaniu na manifest. Wynik:

- `createdAt`: `2026-06-19T00:02:31.1964722+02:00`
- `modalPresent`: `null`
- `childCount`: `null`
- `responding`: `null`
- `blocker`: `ORCH-006 interrupted after live-lock limit elapsed; prior passive inventory script failed before screenshot/inventory due to PowerShell uint literal error in EnumWindows callback. Per orchestrator interrupt, no further Aurora inspection was performed.`

Wniosek: ORCH-006 nie dostarcza jeszcze child inventory, caption buttona, control id ani potwierdzenia, ze modal nadal istnieje. To jest blocker dla automatycznego cleanupu, nie dowod skutecznej metody.

Najblizszy negatywny dowod:

- `orch-004c-old-file-format-cleanup-20260618-235605-358/summary.json`
- metoda: targeted `WM_COMMAND IDOK` do `#32770` dialogu `Old File Format`
- `sendResult.sent=true`
- `modalStillPresent=true`
- `responding=true`

Wniosek: samo wyslanie `WM_COMMAND IDOK` do parent dialogu jest juz przetestowane jako niewystarczajace w tym stanie. Nastepna proba nie powinna powtarzac tego samego atomu bez nowego child inventory.

## Cleanup decision tree

### 1. Child `Button` + `BM_CLICK` - recommended first actionable method

Warunki wejscia:

- pasywna enumeracja widzi dokladnie jeden top-level modal-like `#32770` z tytulem `Old File Format`;
- modal jest przypisany do prawdziwego `TfrmFrame` Toolsetu, nie do pustego `TApplication`;
- child inventory potwierdza child window klasy `Button`;
- caption buttona jest jednoznacznie neutralny dla tego modala, np. zamyka ostrzezenie zamiast wybierac zapis/konwersje;
- zapisane sa: dialog HWND, button HWND, button class, caption, rect, control id, target frame title, `responding=true`.

Wykonanie:

- wyslac `SendMessageTimeout(buttonHwnd, BM_CLICK, 0, 0, ...)` bez globalnego inputu;
- po jednej probie od razu re-enumerowac top-level windows i child windows;
- uznac sukces tylko jesli `Old File Format` zniknal, `modalLikeCount=0` albo brak tego konkretnego modala, a Toolset nadal odpowiada.

Ryzyko: niskie do sredniego. Jest to najbardziej lokalna akcja, bo trafia w konkretny child button, ale bez caption/control inventory moze kliknac zly przycisk albo zaakceptowac niechciana semantyke dialogu.

Status: rekomendowane, ale zablokowane do czasu poprawnego ORCH-006 child inventory.

### 2. `WM_COMMAND` z rzeczywistym control id child buttona - fallback po inventory

Warunki wejscia:

- wszystkie warunki z metody 1 sa spelnione;
- child inventory ujawnia rzeczywisty control id buttona;
- control id jest zgodny z buttonem wybranym jako neutralny cleanup target.

Wykonanie:

- wyslac `SendMessageTimeout(dialogHwnd, WM_COMMAND, MAKEWPARAM(controlId, BN_CLICKED), buttonHwnd, ...)`;
- nie uzywac golego `IDOK` bez potwierdzenia, ze child button faktycznie ma taki control id;
- po jednej probie re-enumerowac i zapisac wynik.

Ryzyko: srednie. To nadal jest celowane i bez globalnego inputu, ale poprzedni ORCH-004C pokazal, ze parent-level `WM_COMMAND IDOK` moze zostac przyjety przez Win32 i nie zamknac modala. Control id musi pochodzic z aktualnego child inventory, nie z domyslu.

Status: fallback, jesli `BM_CLICK` jest niedostepny lub nie dziala mimo potwierdzonego button HWND.

### 3. `WM_CLOSE` do `#32770` - last resort only

Warunki wejscia:

- modal jest nadal obecny po metodzie 1 albo 2;
- zapisano dowod, ze child button path nie jest mozliwy albo nie zadzialal;
- istnieje jednoznaczny dialog HWND `Old File Format`;
- nie ma innych modal-like blockerow;
- lane akceptuje, ze wynik moze byc cancel/close semantics, nie explicit OK semantics.

Wykonanie:

- wyslac `SendMessageTimeout(dialogHwnd, WM_CLOSE, 0, 0, ...)`;
- po jednej probie re-enumerowac wszystkie top-level windows;
- jezeli modal nadal istnieje, zatrzymac lane jako `cleanup-required`; nie eskalowac do globalnego inputu.

Ryzyko: srednie do wysokiego. `WM_CLOSE` moze wybrac sciezke zamkniecia inna niz przycisk ostrzezenia, zostawic stan niejednoznaczny albo ukryc realny problem. To jest dopuszczalne tylko jako udokumentowany last resort, nie standardowa metoda.

Status: ostatnia opcja.

## Required proof packet

Kazda proba cleanupu musi zapisac:

- `01-before-modal.txt/png` z dialog HWND, class `#32770`, title `Old File Format`, rect i parent/frame context;
- child inventory z button HWND, caption, class, rect, control id;
- wyslana metoda i wynik `SendMessageTimeout`;
- `02-after-cleanup.txt/png`;
- re-enumeracje top-level windows;
- booleany: `modalBefore`, `cleanupAttempted`, `modalStillPresent`, `responding`, `modalLikeCount`;
- jednoznaczna decyzje: `accepted-cleanup`, `failed-cleanup`, albo `blocked-no-child-inventory`.

## Recommendation

Rekomendowana metoda cleanupu to child `Button` `BM_CLICK` na zweryfikowanym child button HWND modala `Old File Format`.

Nie wykonywac cleanupu na podstawie obecnego ORCH-006, bo jego `summary.json` nie zawiera child inventory. Najpierw naprawic pasywny inventory script po bledzie PowerShell uint literal w `EnumWindows` callback, pozyskac button HWND/caption/control id, a dopiero potem wykonac jedna celowana probe `BM_CLICK`.

Jezeli `BM_CLICK` nie przejdzie mimo poprawnego inventory, drugim wyborem jest `WM_COMMAND` z rzeczywistym control id child buttona. `WM_CLOSE` zostaje wylacznie ostatnia opcja po udokumentowanej porazce lub niedostepnosci obu precyzyjnych metod.
