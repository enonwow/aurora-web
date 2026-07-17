# Standard doprecyzowujący `@Roles` / `@Permissions` (Agent R41)

## Cel
Ujednolicenie stosowania adnotacji autoryzacyjnych tak, aby było zgodne z:
- `backend/RULES.md`
- polityką `AccessGuard` deny-by-default
- rzeczywistą semantyką `Reflector.getAllAndOverride(...)`

## Reguły obowiązkowe
1. Każda akcja kontrolera, która nie jest `@Public()`, MUST mieć mapowanie ról (`@Roles(...)`) bezpośrednio albo przez class-level fallback.
2. Brak mapowania ról dla akcji niepublicznej oznacza `403` (deny-by-default).
3. Gdy akcja wymaga capability biznesowego, MUST mieć jawne `@Permissions(...)` dla tej akcji (bez polegania na samym UI).

## Kiedy class-level jest dopuszczalny
Class-level `@Roles(...)` i/lub `@Permissions(...)` jest dopuszczalny tylko wtedy, gdy:
- wszystkie niepubliczne metody kontrolera mają identyczne wymagania, oraz
- nie ma wyjątków ani endpointów o innej polityce.

## Kiedy method-level jest wymagany (MUST)
Method-level MUST być użyty, gdy:
- choć jedna metoda ma inny zestaw ról niż reszta,
- endpoint ma specyficzne uprawnienie capability (`@Permissions(...)`),
- endpoint jest wyjątkiem od polityki klasy (`@Public()`, zawężenie/rozszerzenie ról, inne permissions).

## Ważna uwaga implementacyjna (`AccessGuard`)
`AccessGuard` używa `getAllAndOverride(handler, class)`, czyli:
- metadata z metody nadpisuje metadata z klasy,
- nie ma automatycznego łączenia (merge) ról ani permissions.

Konsekwencja:
- jeśli metoda deklaruje własne `@Permissions(...)`, to zastępuje class-level `@Permissions(...)`;
- jeśli metoda deklaruje własne `@Roles(...)`, to zastępuje class-level `@Roles(...)`.

## Przykłady

### Dobre
```ts
@Controller("catalog/items")
@Roles("admin") // wszystkie metody mają identyczną politykę ról
export class ItemsController {
  @Get()
  list() {}

  @Post()
  create() {}
}
```

```ts
@Controller("areas")
@Roles("admin", "builder")
export class AreasController {
  @Get()
  list() {}

  @Post()
  @Roles("admin") // wyjątek: metoda ma inną politykę, więc method-level MUST
  @Permissions("areas:write") // capability akcji jawnie na metodzie
  create() {}
}
```

### Złe
```ts
@Controller("runtime-settings")
export class RuntimeSettingsController {
  @Get()
  get() {} // brak @Roles -> dla niepublicznej akcji skończy się 403 deny-by-default
}
```

```ts
@Controller("catalog/creatures")
@Permissions("catalog:read")
export class CreaturesController {
  @Post()
  @Permissions("catalog:write") // nadpisuje class-level, nie dokłada
  create() {}
}
```

W powyższym przypadku `create()` nie ma już `catalog:read`, bo metadata nie są mergowane. Jeśli endpoint potrzebuje obu, trzeba zadeklarować oba jawnie na metodzie.
