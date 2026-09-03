# Waypoint tag live standard proof

Status: `verified`.

W jednej sesji Aurora Toolset PID `46064` zaznaczono waypoint, otwarto dokładny
dialog `TdlgWaypointEdit`, zmieniono wyłącznie pole Tag i zapisano moduł.

- tag: `NW_WAYPOINT001 → CODEX_WAYPOINT_PROOF`;
- template: `nw_waypoint001` bez zmiany;
- pozycja: `(33.1162, 47.7472, 3.5019)` bez zmiany;
- bearing: `270` bez zmiany;
- `waypoints=1`, `total=16` przed i po;
- sesja zamknięta targeted `WM_CLOSE`, zero procesów po zamknięciu;
- źródłowy moduł zachował SHA-256 `6FC8…9309`.

Stary `TEdit` Delphi nie zwraca tekstu pola Tag przez międzyprocesowe
`GetWindowText/WM_GETTEXT`. Dlatego proof łączy [PrintWindow przed](01-before-properties.png),
[PrintWindow z nową wartością](03-new-tag-properties.png) i autorytatywny readback
zapisanego [GIT po Save](after-save/raw.git.summary.json).

Walidacja:

```powershell
node backend/scripts/validate-aurora-toolset-waypoint-tag-proof.mjs
```
