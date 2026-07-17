# Decision Closure C2: Backend Verify Gate Standard (R64)

## Finalna decyzja
Wprowadzamy 3-poziomowy standard verify gate backendu (P0/P1/P2), ktory laczy RULES i P0_COMMANDS bez sprzecznosci:

1. `P0` to **minimalny, obowiazkowy gate kazdego PR**: `build + unit + e2e`.
2. `P1` to **gate ryzyka zmian**: `P0 + mutation` tylko dla zmian logic/auth/guard/policy.
3. `P2` to **gate wydaniowy/hardening**: `P0 + mutation` zawsze (niezaleznie od zakresu zmian).

Ta decyzja zamyka konflikt: `test:mutation` nie jest czescia minimalnego P0, ale pozostaje obowiazkowe tam, gdzie RULES wymagaja podwyzszonej pewnosci.

## Rozstrzygniecie konfliktow RULES vs P0_COMMANDS

1. `P0_COMMANDS` zachowuje role SSOT dla minimalnego verify PR (`build`, `unit`, `e2e`).
2. `RULES` zachowuje role SSOT dla polityki ryzyka (mutation dla zmian logic/auth/guard/policy).
3. Gdy wystepuje konflikt interpretacyjny, obowiazuje zasada:
   - `P0` = minimalny gate wejsciowy,
   - `P1/P2` = rozszerzenia gate zalezne od ryzyka i etapu.

## Konwencja komend

Zgodnie z `decision-command-conventions-r64.md`, we wszystkich gate uzywamy `npm`, nie `npm.cmd`.

Wszystkie komendy uruchamiamy z `backend/`.

## Standard gate (jednoznaczny)

### P0 (obowiazkowe dla kazdego PR)

Komendy (wszystkie musza przejsc, exit code `0`):

```bash
cd backend
npm run build
npm run test:unit
npm run test:e2e
```

Wynik:
1. `PASS` tylko gdy 3/3 kroki sa zielone.
2. `FAIL` gdy dowolny krok nie przejdzie.

### P1 (obowiazkowe warunkowo)

P1 uruchamiamy, gdy zmiana dotyka przynajmniej jednego obszaru:
1. AuthN/AuthZ, role, permissions, guards, policy.
2. Logika biznesowa (warstwa application/domain).
3. Kontrola dostepu HTTP/CORS.
4. Pliki objete `mutate[]` w `stryker.config.json`.

Komendy:

```bash
cd backend
npm run build
npm run test:unit
npm run test:e2e
npm run test:mutation
```

Wynik:
1. `PASS` tylko gdy 4/4 kroki sa zielone.
2. `FAIL` gdy dowolny krok nie przejdzie.

### P2 (obowiazkowe dla release/hardening)

P2 uruchamiamy dla:
1. Branchy release.
2. Hardening/security sign-off.
3. Finalnego gate przed cutem wersji.

Komendy:

```bash
cd backend
npm run build
npm run test:unit
npm run test:e2e
npm run test:mutation
```

Wynik:
1. `PASS` tylko gdy 4/4 kroki sa zielone.
2. `FAIL` gdy dowolny krok nie przejdzie.

## Uzasadnienie

1. `build` w P0 eliminuje klase bledow, ktore same testy moga pominac (np. problemy kompilacji/typowania).
2. `unit + e2e` w P0 utrzymuje szybki, ale sensowny minimalny gate PR.
3. Mutation jest kosztowne czasowo, wiec nie moze byc wymagane dla kazdej drobnej zmiany (zgodnie z P0_COMMANDS), ale musi byc obowiazkowe dla zmian ryzykownych (zgodnie z RULES).
4. P2 daje jednoznaczny tryb "maksymalnej pewnosci" przed wydaniem bez oslabiania codziennego flow PR.

## Definition of Done dla C2

Decyzja jest domknieta, gdy kazdy PR/release mozna sklasyfikowac jednoznacznie do P0/P1/P2 i uruchomic odpowiadajacy zestaw komend bez dodatkowej interpretacji.
