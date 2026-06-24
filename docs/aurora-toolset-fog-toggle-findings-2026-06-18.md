# Aurora Toolset: Environment Fog

Data: 2026-06-18  
Modul: `the_last_city - codex.mod`  
Area: `enon_bakery`  
Status: `safe-repeatable` dla widokowego toggle z obowiazkowym restore, bez
zapisu modulu.

## Cel

Nauczyc atom `Environment -> Fog`: wlaczenie podgladu mgly na aktywnym canvasie
area i powrot do stanu startowego.

To jest krok przygotowawczy do prawdziwej edycji fog w `Area Properties`, ale
sam atom nie zmienia wartosci area.

## Stan startowy

- Toolset otwarty na drugim ekranie.
- Aktywny canvas `enon_bakery`.
- Brak modalnych okien.
- `Fog` bylo wylaczone przed testem.
- `Use Area Lighting` bylo juz przywrocone do off po poprzednim atomie.

## Przebieg live

1. Odczytano stan menu `Environment -> Fog`.
2. Pozycja ma ID menu `106`.
3. Stan przed testem: `0x100`, czyli unchecked.
4. Wyslano celowane `WM_COMMAND 106` do ramki `TfrmFrame` (`HWND 458816`).
5. Stan po pierwszym toggle: `0x108`, czyli checked.
6. Screenshot po wlaczeniu pokazuje aktywny podglad fog; na tym kadrze efekt
   wizualny jest subtelny, ale stan toolbar/menu potwierdza przelaczenie.
7. Wyslano `WM_COMMAND 106` drugi raz jako rollback.
8. Stan po rollbacku: `0x100`, czyli taki jak przed testem.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-302-s32-before-fog-toggle.png` | Stan przed wlaczeniem fog. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-303-s32-after-fog-first-toggle.png` | Fog wlaczone; efekt na `enon_bakery` subtelny, ale toolbar/menu potwierdzaja stan. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-304-s32-after-fog-restore.png` | Rollback; fog wylaczone i czytelny widok przywrocony. |

Refresh HB-011 na aktywnym widoku `d_und`:

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/aurora-live-evidence/hb-011-fog-toggle-pulse/01-before-fog-toggle-20260618-225415-136.png` | Stan przed toggle; menu `0x100`, hash startowy `bf75984f...a43e248`. |
| `../.codex-tmp/aurora-live-evidence/hb-011-fog-toggle-pulse/02-after-fog-toggle-20260618-225415-136.png` | Po `WM_COMMAND 106`; menu `0x108`, hash zmieniony `329e3848...45eef5`. |
| `../.codex-tmp/aurora-live-evidence/hb-011-fog-toggle-pulse/03-after-fog-rollback-20260618-225415-136.png` | Rollback do `0x100`; hash identyczny jak before, `Responding=True`. |

## Wniosek operacyjny

`Fog` jest bezpiecznym atomem widokowym, o ile zawsze przywracamy stan
startowy. Na `enon_bakery` sam efekt mgly nie jest bardzo mocny w obecnym
kadrze, wiec przy dokumentowaniu nie wystarcza opis "widac mgle"; trzeba
zachowac rowniez odczyt stanu menu:

```text
0x100 -> 0x108 -> 0x100
```

## Rollback

Po teście przywrocic stan startowy `Fog`. W tym przebiegu start byl off, wiec
rollback to drugie wywolanie `Environment -> Fog`.

## Pulapki

- Nie mylic `Fog` z edycja fog w `Area Properties`; ten atom tylko wlacza
  podglad.
- Efekt wizualny moze byc subtelny, zwlaszcza przy widoku top-down i malym
  obszarze.
- Nie zostawiac fog wlaczonego przed seriami screenshotow properties albo
  obiektow, jezeli nie jest czescia badanego atomu.

## Bezpieczenstwo

- Brak przejecia globalnego kursora.
- Brak globalnego `SendKeys`.
- Brak zapisu modulu.
- Toolset pozostal responsywny po operacji.
