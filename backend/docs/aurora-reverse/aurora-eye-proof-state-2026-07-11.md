# Aurora Eye — stan dowodu

Status: częściowo udowodnione, fail-closed. Nie deklarować ukończenia całego
„oka Aurory”, dopóki nie istnieje poprawny live capture i rozpoznawanie semantyczne.

## Co działa

`analyze-aurora-toolset-grid-pose.mjs` analizuje obraz samego viewportu
Toolsetu, a nie deklarację wysłania przycisku. Z czerwono-zielonej siatki mierzy:

| Wielkość | Znaczenie |
| --- | --- |
| `yawDegreesModulo90` | orientacja siatki w obrazie modulo 90 stopni |
| `pitchDegrees` | wizualna elewacja kamery; 90 oznacza top-down |
| `zoomPixelsPerTile` | zoom widoczny w obrazie, nie zgadywany dystans kamery |
| `confidence` | pewność wynikająca z wsparcia linii i prostopadłości |

Na zapisanym, rzeczywistym viewportcie `enon_test_mount`
`.codex-tmp/aurora-eye-repair-20260711/mount-printwindow-viewport.png` obecna
wersja zwróciła:

```json
{
  "yawDegreesModulo90": 0,
  "pitchDegrees": 90,
  "zoomPixelsPerTile": 204,
  "confidence": 1
}
```

`observe-aurora-toolset-scene.mjs` dołącza tę analizę do ogólnego
`scene-observation.json` dla dowolnego modułu i Area. Test kontraktu obejmuje
zarówno odrzucenie nieobserwowanej pozy, jak i promocję pozy tylko po spełnieniu
progu pewności.

## Twarde granice bezpieczeństwa

Capture nie może przejść wyłącznie dlatego, że odnalazł uchwyt okna. Wymaga:

1. jednej instancji `nwtoolset.exe`, dokładnego modułu i dokładnego Area;
2. dużego `TScrollBox` pod właściwym `TfrmViewerArea`;
3. niejednolitych pikseli sceny dla `GetWindowDC` lub `PrintWindow`; oraz
4. przy fizycznym fallbacku pięciu punktów `WindowFromPoint` należących do
   oczekiwanego Area Toolsetu.

Jeśli choć jeden punkt jest własnością innego okna, nie zapisuje się obraz z
monitora. Wynik kończy się `toolset_viewport_obscured_by_foreground_window`.
To usuwa poprzedni błąd, w którym zrzut innego ekranu mógł być mylony z dowodem
Aurory.

## Bieżący blocker live

Podczas ostatniej próby środek oczekiwanego viewportu należał do
`DirectUIHWND` procesu `explorer.exe` (PID 9568), a odczyty hwnd Aurory były
jednolite. Nie wykonano ruchu kamery, zoomu, przejęcia fokusu ani zapisu proofu.
Ten stan jest poprawnie zablokowany — nie jest dowodem, że scena działa ani że
kamera ma jakąkolwiek pozycję.

## Jeszcze nieudowodnione

- pełny yaw świata 0–360 stopni: wymaga kalibracji przez kierunkową kotwicę ze
  źródłowego Area albo sekwencji wizualnych obserwacji przed/po;
- rozpoznanie tożsamości tile, placeable, emittera i VFX;
- temporalne śledzenie VFX.

Kolejny live test może nastąpić tylko gdy pięciopunktowa walidacja potwierdzi,
że viewport jest faktycznie widoczny. Wtedy kontroler wykona pojedynczą,
targetowaną operację, a „oko” porówna pose przed i po bez używania czasu jako
jednostki wyniku.
