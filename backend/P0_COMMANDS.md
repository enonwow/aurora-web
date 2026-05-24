# P0 Commands (Backend)

Ten plik jest SSOT dla komend P0 w backendzie (`aurora-backend`).

## Zakres

- Wszystkie komendy uruchamiamy z katalogu `backend/`.
- Node modules muszą być zainstalowane (`npm ci`).

## Poprawne komendy wykonawcze P0

```bash
cd backend
npm ci
npm run build
npm run test:unit
npm run test:e2e
```

Dodatkowo (opcjonalnie lokalnie, nie blokuje merge):

```bash
npm run test
npm run test:cov
```

## Antywzorce (czego NIE odpalać jako P0 gate)

Nie używaj poniższych komend jako kryterium wejścia/wyjścia P0:

```bash
npm run test:watch
npm run test:mutation
npm run start:dev
npm run start
npm run start:prod
```

Powody:

- `test:watch` nie jest deterministycznym gate (tryb interaktywny).
- `test:mutation` jest ciężkie czasowo i nie jest minimalnym verify przed merge.
- `start*` uruchamia aplikację, ale nie weryfikuje jakości zmian.

## Minimalna sekwencja verify przed merge

Wymagane 3 kroki (wszystkie muszą przejść):

1. `npm run build`
2. `npm run test:unit`
3. `npm run test:e2e`

Skrót do użycia w PR-checklist:

```bash
cd backend && npm run build && npm run test:unit && npm run test:e2e
```

## Definition of Done (P0)

- Build backendu przechodzi bez błędów.
- Testy jednostkowe przechodzą.
- Testy e2e przechodzą.
- Brak lokalnych "watch/incremental" procesów traktowanych jako dowód jakości.
