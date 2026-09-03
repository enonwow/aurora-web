# Audyt tasku `019f6a87-6584-7a70-a815-4b0ab316b4a7`

Data audytu: 2026-07-17. Zakres: weryfikacja historii tasku „Audyt tile obszaru Aurora”, bieżącego kodu i możliwych do uruchomienia bramek lokalnych. Ten dokument nie traktuje komunikatów tasku jako proofu bez ponownej weryfikacji.

## Werdykt

**Częściowo wykonane, nie domknięte.** Task poprawnie zawęził problem z obszarów/tile do rzeczywistych kontraktów `SET -> MDL -> GLB -> Three`, wdrożył znaczący kod i ma zielone testy bezpośrednio dotyczące tej ścieżki. Nie ma jednak aktualnego dowodu runtime po ostatniej poprawce ani proofu pełnego flow edycji na świeżym bundle; ostatni turn został przerwany właśnie przed jego uzyskaniem.

## Co jest potwierdzone

- Dekomplilacja została użyta do prawidłowej granicy: `ARE` zawiera `Tileset`, `Tile_List`, `Tile_ID` i `Tile_Orientation`; natywny loader iteruje rekordy użyte w obszarze. Otwarcie modułu nie waliduje całej palety `.SET`.
- Macierz `docs/aurora-area-tile-audit-2026-07-17.md` dokumentuje skan 99 tilesetów / 53 700 rekordów SET i 34 deklarowane modele nieobecne w badanym łańcuchu HAK/vanilla. To są blokery konkretnych wpisów palety, a nie dowód, że cały tileset jest nieobsługiwany.
- Bieżący kod zawiera materialne zmiany dla tego toru: wybór najwyżej-priorytetowego `.SET`, progresywne publikowanie kontraktów GLB, warunkowe wyłączenie mesh-a zastępczego po gotowości wszystkich modeli oraz bezpieczną ścieżkę pustego Area bez requestu do fikcyjnego `blank_builder_v1`.
- Ponowna walidacja 2026-07-17: frontendowe testy tile `19/19`, backendowe testy area/tile `57/57`, frontend `npm run build` i backend `npm run build` przeszły.

## Co nie jest udowodnione

1. **Runtime po ostatniej zmianie.** Historyczny task wykrył, że uruchomiony frontend serwował stary bundle, a następnie został przerwany przed odbudową i trzecim, identycznym proofem CEP `atj02` / `Crystal (1x1)`.
2. **Edycja end-to-end.** Brakuje jednego aktualnego pakietu: before/after canvas, diagnostyka `Tile process runtime`, nowy resref modelu po mutacji, undo/redo oraz parserowy odczyt zapisanego ARE dla co najmniej jednego reprezentatywnego tile.
3. **Pełne pokrycie palety.** `atj02` ma potwierdzoną reprezentatywną grupę, ale trzy inne rekordy tego SET są oznaczone jako niedostępne. Nie wolno z wyniku 16/16 dla grupy wnioskować o 100% tilesetu.
4. **Aktualne środowisko runtime.** Pierwszy odczyt ekranu logowania pokazał `Backend: unavailable`, ale późniejsza kontrola wykazała, że to nie był brak usługi ani uprawnień: Docker zgłasza backend jako `healthy`, a `GET /api/v1/health` bezpośrednio i przez proxy frontendu zwraca `200`. To był przejściowy albo nieodświeżony wskaźnik UI; do proofu brakuje zalogowanej sesji i wykonania scenariusza, nie ręcznego uruchamiania usługi przez użytkownika.

## Ryzyka i stan repo

- Pełny frontendowy suite jest obecnie czerwony poza zakresem tile (m.in. creature-render delivery oraz coordinate parity). Nie przypisano tych regresji temu taskowi, ponieważ wspólny worktree zawiera rozległe, równoległe i niezatwierdzone zmiany.
- Z tego samego powodu nie można obecnie niezależnie przypisać każdego diffu do tego tasku ani bezpiecznie wykonywać szerokiego refaktoru/rollbacku.
- Kompilacja obu aplikacji przechodzi, a backend oraz proxy są obecnie zdrowe. Blokerem domknięcia jest brak żywego proofu na zalogowanej sesji i aktualnym bundle, nie brak dostępu do usług.

## Wymagane do domknięcia

1. Użyć już działającego, zdrowego backendu i frontendu z bieżącego checkoutu, zalogować sesję testową i nie dopuścić do równoległego katalogowania dźwięków blokującego Areas.
2. Wykonać deterministyczny proof dla `atj02`: utworzyć nowe 2x2, wstawić `Crystal (1x1)`, poczekać na kontrakt nowego `atj01_*`, zapisać PNG i JSON runtime.
3. Powtórzyć dla jednego pozytywnego `tcr10/tcn01_*` oraz jednego negatywnego wpisu palety (np. `tcr10` Tile_ID 1200) z jawnym resrefem i komunikatem blokady.
4. Dodać Undo/Redo oraz odczyt po zapisie/cold reopen. Dopiero wtedy można nazwać tworzenie i edycję tile funkcjonalnie potwierdzonymi.
