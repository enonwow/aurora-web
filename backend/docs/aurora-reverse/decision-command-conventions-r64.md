# Decision Closure D2: Command Conventions (R64)

## Finalna decyzja
W dokumentacji i instrukcjach uruchamiania stosujemy **wyłącznie `npm`**, nie `npm.cmd`.

## Norma (krótka, wdrożeniowa)
1. We wszystkich przykładach komend piszemy `npm ...` (np. `npm install`, `npm run dev`, `npm test`).
2. Nie używamy rozszerzeń platformowych (`.cmd`, `.exe`, `.bat`) w dokumentacji cross-platform.
3. Na Windows (PowerShell/CMD) wywołanie `npm` jest poprawne i mapuje do właściwego wrappera systemowego automatycznie.
4. Jeśli potrzebna jest zgodność między powłokami, logikę uruchamiania przenosimy do `package.json` (`scripts`) i wywołujemy przez `npm run <script>`.

## Uzasadnienie
`npm.cmd` jest zapisem specyficznym dla Windows i obniża przenośność dokumentacji. `npm` działa poprawnie na Windows, macOS i Linux, więc jest właściwą konwencją domyślną dla całego projektu.
