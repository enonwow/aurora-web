# S05-06 — audyt rozjazdu stanu runtime i źródła

Data: 2026-07-16

## Wynik

Próby `positive-3x3`, `positive-native-small-4x4`, `positive-native-click-small-4x4`, `positive-native-click-exit-small-4x4` oraz `recovered-after-av-tiny-2x2` są dowodami negatywnymi i nie mogą być użyte jako pozytywny dowód resize.

Pakiet `recovered-after-av-tiny-2x2/manifest.json` ma:

- `Width = 4`,
- `Height = 4`,
- `Tile_List` zawierający 4 kafle.

Kontrakt spójności wymaga `Width * Height == Tile_List.length`; tutaj `16 != 4`. Zapisane źródło jest więc niespójne.

Odczyt live z obiektu `TfrmViewerArea` (`viewer + 0x5A4`, wymiary obszaru pod `+0xA8/+0xA9`) również pokazał `4 x 4`. Oznacza to, że wcześniejsze usunięcie i odtworzenie zasobu pod tym samym resrefem `area002` nie zapewniło czystego stanu runtime. Próba zmniejszenia takiego obszaru zakończyła się AV pod `nwtoolset.exe+0x28339B` (`0x0068339B`), ponieważ metadane wymiarów wskazywały 16 pól, a macierz kafli miała tylko 4 wpisy.

## Przyczyna powtarzania błędu

Po pierwszej niepoprawnej zmianie metadanych kolejne próby używały ponownie tego samego resrefu `area002` w tej samej instancji Toolsetu. Tym samym testy pozornie zaczynały od nowo utworzonego obszaru, ale odziedziczyły skażony obiekt viewer/runtime. To narusza izolację próby i tłumaczy powtarzanie AV.

## Reguła standardu

Po nieudanym resize zasób i jego resref są skażone do końca życia bieżącej instancji Toolsetu. Nie wolno ponawiać resize na tym resrefie ani uznawać samej zmiany `Width/Height` za sukces. Kolejna próba musi użyć świeżego resrefu oraz przed i po operacji spełnić równocześnie:

1. wymiary live viewera są zgodne z oczekiwanymi,
2. zapisane `Width` i `Height` są zgodne z live,
3. `Tile_List.length == Width * Height`,
4. nie pozostało żadne okno modalne,
5. operacja nie użyła globalnego kursora, klawiatury ani przejęcia fokusu.

### Uzupełnienie: aktywny cel MDI

Izolowana próba na `area003` ujawniła osobny błąd routingu. Helper potwierdził jeden widoczny viewer i odczytał z niego live `2 x 2`, ale ramkowa komenda `WM_COMMAND 63` została obsłużona przez inne aktywne dziecko MDI: `Demo - home`. Skutek po zapisie był mierzalny: `Demo - home` zmieniło się z `8 x 8 / 64` na `4 x 4 / 16`, podczas gdy `area003` pozostało `2 x 2 / 4`. Operację natychmiast cofnięto natywnym `Edit > Undo` (`command 56`), a zapis ponownie potwierdził `Demo - home = 8 x 8 / 64` oraz `area003 = 2 x 2 / 4`.

Wniosek: widoczność viewera, jego unikalny HWND ani poprawny odczyt jego obiektu VCL nie dowodzą, że jest on aktywnym dzieckiem MDI obsługującym ramkową komendę menu. Przed mutującą komendą obszaru standard wymaga jawnej, PID-scoped aktywacji dokładnego dziecka MDI oraz odczytu zwrotnego aktywnego HWND. Bez tego helper ma przerwać przed `WM_COMMAND`.

## Plan izolowanej próby

Aktualny `area002` zostaje usunięty. Następnie powstaje obszar-dummy zajmujący ponownie `area002`, a właściwy nośnik testowy zostaje utworzony jako nowy `area003`. Dopiero na nim wolno wykonać jedną atomową próbę natywnego resize.
