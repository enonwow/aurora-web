# Aurora Toolset: Environment Use Area Lighting

Data: 2026-06-18  
Modul: `the_last_city - codex.mod`  
Area: `enon_bakery`  
Status: `safe-repeatable` dla widokowego toggle z obowiazkowym restore, bez
zapisu modulu.

## Cel

Nauczyc atom `Environment -> Use Area Lighting`: wlaczenie podgladu oswietlenia
area i natychmiastowy powrot do czytelnego stanu screenshotow.

To jest krok przygotowawczy do prawdziwego uczenia lighting/fog w
`Area Properties`, ale sam atom nie edytuje wartosci area.

## Stan startowy

- Toolset otwarty na drugim ekranie.
- Aktywny canvas `enon_bakery`.
- Brak modalnych okien.
- `Use Area Lighting` bylo wylaczone przed testem.
- `Display Grid` byl przywrocony do stanu startowego po poprzednim atomie.

## Przebieg live

1. Odczytano stan menu `Environment -> Use Area Lighting`.
2. Pozycja ma ID menu `107`.
3. Stan przed testem: `0x100`, czyli unchecked.
4. Wyslano celowane `WM_COMMAND 107` do ramki `TfrmFrame` (`HWND 458816`).
5. Stan po pierwszym toggle: `0x108`, czyli checked.
6. Screenshot po wlaczeniu byl prawie caly czarny; widoczne byly glownie
   punkty swiatla/markery i czerwone granice tile.
7. Wyslano `WM_COMMAND 107` drugi raz jako rollback.
8. Stan po rollbacku: `0x100`, czyli taki jak przed testem.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-299-s31-before-use-area-lighting-toggle.png` | Stan przed wlaczeniem area lighting. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-300-s31-after-use-area-lighting-first-toggle.png` | Area lighting wlaczone; scena prawie czarna, widac glownie swiatla/markery. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-301-s31-after-use-area-lighting-restore.png` | Rollback; czytelny widok przywrocony. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-479-s46-use-area-lighting-before.png` | Refresh HB-S46: stan przed ponownym toggle na aktywnym `enon_bakery`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-480-s46-use-area-lighting-after-toggle.png` | Refresh HB-S46: po toggle scena jest prawie czarna. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-481-s46-use-area-lighting-restored.png` | Refresh HB-S46: drugi toggle przywrocil czytelny widok. |

## Wniosek operacyjny

`Use Area Lighting` jest bardzo uzyteczne jako podglad realnego oswietlenia, ale
na `enon_bakery` po wlaczeniu prawie nic nie widac. To potwierdza zasade
operacyjna: po testach oswietlenia natychmiast przywrocic stan domyslny, bo
inaczej kolejne screenshoty beda malo czytelne.

## Rollback

Zawsze zapisac stan startowy menu i przywrocic go po tescie.

W tym przebiegu:

```text
0x100 -> 0x108 -> 0x100
```

Czyli start: off, test: on, koniec: off.

Refresh HB-S46:

```text
before -> toggle -> restored
pixel diff before/toggle: 24.347%
pixel diff toggle/restored: 24.347%
pixel diff before/restored: 0.305%
```

W HB-S46 nie ponawiano odczytu flag menu; dowodem jest screenshot przed/po i
niski diff po rollbacku. Widok zostal przywrocony do czytelnego stanu.

## Pulapki

- Nie zostawiac `Use Area Lighting` wlaczonego przed dokumentowaniem innych
  properties/dialogow.
- Nie uznawac ciemnego screena za blad renderu area, jezeli `Use Area Lighting`
  jest wlaczone.
- To nie jest jeszcze edycja lighting w `Area Properties`; to tylko podglad
  renderu.

## Bezpieczenstwo

- Brak przejecia globalnego kursora.
- Brak globalnego `SendKeys`.
- Brak zapisu modulu.
- Toolset pozostal responsywny po operacji.
