# Aurora Toolset: Object Filters Show None / Show All

Data: 2026-06-18  
Modul: `the_last_city - codex.mod`  
Area: `enon_bakery`  
Status: `safe-repeatable` dla widokowego filtra obiektow, bez zapisu modulu.

## Cel

Nauczyc atom `View -> Object Filters -> Show None` oraz rollback
`View -> Object Filters -> Show All`.

To jest operacja widokowa, przydatna do walidacji sceny i robienia czytelnych
screenshotow:

- `Show None` ukrywa placeable/dekoracje/obiekty, zostawiajac geometrię area;
- `Show All` przywraca pelny widok obiektow.

## Stan startowy

- Toolset otwarty na drugim ekranie.
- `enon_bakery` otwarta przez `View Area`.
- Brak modalnych okien.
- Zielony terrain preview z poprzedniego atomu byl nadal widoczny w lewym dole
  canvasu; ten atom go nie czysci.

## Przebieg live

1. Wykonano screenshot stanu przed filtrem.
2. Pierwsza proba przez bezposrednie ID menu nie dala dobrego dowodu
   wizualnego; menu nadal pokazywalo tylko podswietlenie pierwszej pozycji.
3. Pewna sciezka:
   `View -> Object Filters -> Show None`, wybrane przez celowane komunikaty do
   popup menu.
4. Po `Show None` w kadrze zniknely widoczne obiekty/dekoracje.
5. Rollback:
   `View -> Object Filters -> Show All`, rowniez przez popup menu.
6. Po `Show All` dekoracje/placeable wrocily.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-288-s29-before-object-filter-show-none.png` | Stan przed filtrem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-289-s29-after-object-filter-show-none.png` | Wczesna proba przez ID menu; efekt nie byl dobrym dowodem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-291-s29-object-filters-menu-after-show-none.png` | Menu `Object Filters` po probie; samo podswietlenie pozycji nie jest dowodem stanu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-294-s29-after-selecting-show-none-through-menu.png` | Dobry dowod `Show None`: zniknely obiekty, zostala geometria/tileset. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-295-s29-after-selecting-show-all-through-menu.png` | Rollback `Show All`: obiekty/dekoracje wrocily. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-293-s29-final-after-object-filters-restore.png` | Stan koncowy po przywroceniu widoku. |

## Wniosek operacyjny

Najpewniejsza metoda dla tego atomu to otwarcie realnego submenu i wybranie
pozycji z popupu. Samo wyslanie ID menu moze byc za slabe jako dowod, jezeli
nie ma wyraznej zmiany na screenshotach.

`Show None` nie jest filtrem geometrii/tile. Ukrywa obiekty, ale zostawia
podloge, sciany, tile bounds i terrain preview.

## Rollback

Po kazdym teście `Show None` wykonac:

```text
View -> Object Filters -> Show All
```

Zrobic screenshot po rollbacku. Dopiero wtedy przechodzic do kolejnych
screenow/properties, zeby nie dokumentowac przypadkiem pustego widoku.

## Pulapki

- Nie mylic `Show None` z czyszczeniem zielonego terrain preview. Preview
  nadal zostaje i wymaga osobnego atomu.
- Nie uznawac podswietlonej pozycji w menu za stan checkboxa/filtra.
- Nie zostawiac area na `Show None`, bo kolejne screenshoty moga wygladac jak
  brak obiektow w lokacji.

## Bezpieczenstwo

- Brak przejecia globalnego kursora.
- Brak globalnego `SendKeys`.
- Brak zapisu modulu.
- Toolset pozostal responsywny po operacji.
