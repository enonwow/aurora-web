# Asset ID Strategy Spec R63 (Agent K1)

## 1. Cel
Zdefiniowac stabilny i deterministyczny kontrakt identyfikatorow dla:
- `area`
- `placeable`
- `door`
- `creature`

Zakres obejmuje:
- `instanceId`,
- provenance zrodla (`source provenance`),
- hashowanie i wersjonowanie (`hash/versioning`),
- kompatybilnosc z revision-gated write-path.

## 2. Evidence baseline (Aurora reverse)

1. Loader i warstwy GIT sa listowe, a obiekty runtime pochodza z konkretnych list (`Placeable List`, `Door List`, `Creature List`).
- `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\LC_AURORA_RE_KNOWLEDGE_BASE.md:2215,2282,2989,3535`

2. Tozsamosc edycyjna i pipeline web juz pracuja na indeksach list + revision gate (`expectedRevision`), co musi pozostac kompatybilne.
- `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\WEB_AURORA_TECH_STRATEGY.md:215,264,1337,8050,8098-8101`

3. Merge semantyka jest `blueprint -> instance` (instancja nadpisuje blueprint), wiec identyfikator instancji nie moze byc utozsamiany tylko z template.
- `C:\Projects\nwn-last-city\Aurora\reverse\docs\Placeables\AURORA_RE_PLACEABLE_OBJECT_PROPERTIES_2026-05-18.md:45-57`
- `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\LC_AURORA_RE_KNOWLEDGE_BASE.md:3238`

4. Dla instancingu/renderingu potrzebny jest jawny most `instanceId -> placeableIndex/source metadata`.
- `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\WEB_AURORA_TECH_STRATEGY.md:6950-6956,7005,7151`

5. Reverse wskazuje, ze provenance musi byc first-class i audytowalne, a nie implicit/fallback-only.
- `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\WEB_AURORA_TECH_STRATEGY.md:45-57,620,7889-7900`
- `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\DOOR_TRANSITION_PROFILE_GENERATOR_PROVENANCE_GAP_2026-05-20.md`

## 3. Problem i ograniczenia

1. W danych ARE/GIT brak globalnego, trwalego GUID per instancja.
2. Istniejacy write-path edytuje po indeksie listy i rewizji.
3. Czysto indeksowy ID jest deterministyczny, ale moze byc niestabilny po insert/delete przed rekordem.
4. Czysto hashowy ID z pelnej tresci jest stabilny tylko do pierwszej edycji pola i nie nadaje sie samodzielnie do targetowania write-path.

Wniosek: potrzebny jest model wielowarstwowy (identity + location + revision), nie jeden pojedynczy token.

## 4. Model identyfikatorow (3 warstwy)

## 4.1 `areaInstanceId` (tozsamosc area)
Deterministyczny identyfikator obszaru:

`areaInstanceId = "ar1_" + b32lower(sha256(areaIdentityCanonicalBytes))[0:26]`

`areaIdentityCanonicalBytes`:
- `profile` (`xoreos-nwn` / `xoreos-nwn2`),
- `moduleSourceFingerprint`,
- `areaResrefLower`,
- `sourcePolicy` (`DECOMPILED_PRIMARY`/`PACKED_SYNC_REQUIRED` itd.),
- `gitArePairFingerprint`.

`gitArePairFingerprint`:
- `sha256(raw_are_bytes) + ":" + sha256(raw_git_bytes)`.

## 4.2 `instanceAddressId` (adres edycyjny w danej rewizji)
Jednoznaczny adres instancji wewnatrz snapshotu:

`instanceAddressId = "<family>/<sourceList>/<sourceIndex>"`

Przyklady:
- `placeable/Placeable List/17`
- `door/Door List/2`
- `creature/Creature List/4`

To jest canonical target write-path (kompatybilny z obecnym modelem indeksowym).

## 4.3 `instanceId` (stabilna tozsamosc frontendowa)
Publiczny ID dla UI i selekcji:

`instanceId = "ai1_" + b32lower(sha256(instanceIdentityCanonicalBytes))[0:26]`

`instanceIdentityCanonicalBytes` zawiera:
- `areaInstanceId`,
- `family` (`placeable|door|creature`),
- `templateResRefNormalized`,
- `tagNormalized`,
- `positionCanonical` (float canonical),
- `orientationCanonical` (bearing lub x/y orientation),
- `sourceStructTypeId` (jesli dostepne),
- `sourceList`,
- `sourceIndexAtCreation`.

`sourceIndexAtCreation` to indeks z chwili wygenerowania snapshotu/rewizji. Jest elementem tie-breakera deterministycznosci, nie glownym nosnikiem semantyki.

## 4.4 `instanceRevisionId` (wersja instancji)
Wersja encji po zmianie payloadu:

`instanceRevisionId = "air1_" + b32lower(sha256(instanceContentCanonicalBytes))[0:26]`

Regula:
- `instanceId` reprezentuje tozsamosc encji,
- `instanceRevisionId` reprezentuje konkretna wersje danych tej encji.

## 5. Source provenance contract

Kazda encja MUSI miec `provenance`:

```ts
type SourceFamily = "ARE" | "GIT" | "UTC" | "UTP" | "UTD" | "CATALOG" | "DERIVED";
type RuntimeMaturity = "runtime-consumed" | "preserve-only" | "unknown-runtime";

interface SourceProvenance {
  moduleSourceFingerprint: string;
  sourcePolicy: string;
  areaResref: string;
  family: SourceFamily;
  sourcePath?: string;
  sourceList?: "Placeable List" | "Door List" | "Creature List";
  sourceIndex?: number;
  sourceStructTypeId?: number;
  rawKeyAliases?: Array<{ rawKey: string; canonicalKey: string; occurrence: number }>;
  extractionRunFamily?: string;
  extractionArtifact?: string;
  runtimeMaturity: RuntimeMaturity;
}
```

Wymagania:
1. `sourceList + sourceIndex` sa wymagane dla encji z list GIT.
2. `rawKeyAliases` jest wymagane dla pol aliasowanych/preserve-only (np. drzwi transition keys).
3. `extractionRunFamily` i `extractionArtifact` sa wymagane, gdy provenance generatora jest niepelne/posrednie.

## 6. Hashing i canonicalization

## 6.1 Algorytm
- Hash podstawowy: `SHA-256`.
- Kodowanie: `base32 lowercase` bez paddingu.
- Prefiksy wersji: `ar1_`, `ai1_`, `air1_`, `rev1_`.

## 6.2 Canonical JSON
Przed hashowaniem:
1. UTF-8.
2. Klucze sortowane leksykograficznie.
3. Brak whitespace znaczeniowego.
4. Float canonical:
- `-0.0 -> 0.0`
- finite-only
- zapis decimal round-trip (`%.9g` dla float32-domain).
5. String canonical:
- trim trailing NUL i trailing whitespace tylko tam, gdzie parser reverse to potwierdza.
- oryginalne surowe tokeny trafiaja do `rawToken*`/`rawKeyAliases`, nie gubimy ich.

## 6.3 Rozdzielenie hashy

Kazda encja ma 3 hashe:
1. `identityHash` (dla `instanceId`) - tozsamosc.
2. `contentHash` (dla `instanceRevisionId`) - aktualna tresc.
3. `sourceSliceHash` - hash surowego wycinka zrodla (forensic/audit).

## 7. Area-level revisioning

Area revision dla write-path:

`areaRevision = "rev1_" + b32lower(sha256(areaRevisionCanonicalBytes))[0:32]`

`areaRevisionCanonicalBytes` obejmuje:
- `areaInstanceId`,
- uporzadkowana liste encji (`family`, `instanceAddressId`, `instanceRevisionId`),
- metadane alias/provenance istotne dla round-trip,
- `schemaVersion`.

To revision jest zwracane do frontendu jako `expectedRevision` dla komend mutujacych.

## 8. Kontrakt backend -> frontend (deterministyczny)

```ts
type AreaEntityFamily = "placeable" | "door" | "creature";

interface AreaEntityIdentityDto {
  family: AreaEntityFamily;
  areaInstanceId: string;
  instanceId: string;
  instanceAddressId: string;
  instanceRevisionId: string;
  sourceList: "Placeable List" | "Door List" | "Creature List";
  sourceIndex: number;
  identityHash: string;
  contentHash: string;
  sourceSliceHash: string;
  provenance: SourceProvenance;
}

interface AreaIdentityEnvelopeDto {
  schema: "aurora-area-identity-envelope";
  version: "1.0.0";
  areaInstanceId: string;
  areaRevision: string;
  moduleSourceFingerprint: string;
  entities: AreaEntityIdentityDto[];
}
```

Reguly:
1. Frontend kluczuje selekcje/render po `instanceId`.
2. Frontend targetuje komendy mutacji przez `instanceAddressId` + `expectedRevision=areaRevision`.
3. Po zapisie backend zwraca nowy `areaRevision` + nowe `instanceRevisionId` encji zmienionych.
4. `instanceId` nie powinno sie zmieniac przy zwyklej edycji atrybutow tej samej encji; ma sie zmienic przy realnej zmianie tozsamosci (np. replace na inna encje).

## 9. Zasady dla poszczegolnych rodzin

## 9.1 Placeable
- `sourceList = "Placeable List"`.
- Orientacja: `Bearing`.
- `templateResRef + tag + position + bearing` w identity tuple.

## 9.2 Door
- `sourceList = "Door List"`.
- Transition pola aliasowane musza byc przechowane z `rawKeyAliases`.
- Pola preserve-only nie moga byc tracone w hash-canonicalization; trafiaja do `contentHash` lane.

## 9.3 Creature
- `sourceList = "Creature List"`.
- Orientacja canonical: `XOrientation/YOrientation` (nie wymuszac `Bearing` tam, gdzie nie jest zrodlowy).
- `TemplateResRef` + pozycja + orientacja + tag w identity tuple.

## 9.4 Area
- `areaInstanceId` oparte o `ARE+GIT` fingerprint i module source policy.
- Area-level identity nie moze zalezec od kolejnosci encji w UI.

## 10. Determinism guarantees

1. Te same bajty wejscia + ten sam profil/policy -> identyczne `areaInstanceId`, `instanceId`, `areaRevision`.
2. Zmiana nieistotna dla tozsamosci (np. tylko HP) -> `instanceRevisionId` zmienia sie, `instanceId` pozostaje.
3. Zmiana tozsamosci encji (np. swap template + transform tak, ze encja nie jest ta sama domenowo) -> backend moze wygenerowac nowe `instanceId` i musi to jawnie oznaczyc w `diagnostics`.
4. Zmiana provenance (inne zrodlo modulowe) musi zmienic `areaInstanceId`.

## 11. Diagnostyka i kody

Minimalne kody:
- `ASSET_ID_CANONICALIZATION_ERROR`
- `ASSET_ID_SOURCE_PROVENANCE_MISSING`
- `ASSET_ID_ALIAS_COLLISION_LAST_WINS`
- `ASSET_ID_IDENTITY_REBOUND`
- `ASSET_ID_REVISION_CONFLICT`

`ASSET_ID_IDENTITY_REBOUND`:
- INFO/WARN przy kontrolowanej zmianie `instanceId` miedzy rewizjami,
- ERROR jesli backend nie umie jednoznacznie rozstrzygnac mapowania po mutacji.

## 12. Migracja i kompatybilnosc

Etap A:
1. Dodac `AreaIdentityEnvelopeDto` obok obecnych DTO.
2. Utrzymac dotychczasowe indeksowe komendy.

Etap B:
1. Frontend przechodzi na `instanceId` dla selekcji i render-key.
2. Write-path nadal po `instanceAddressId` + `expectedRevision`.

Etap C:
1. Wlaczyc twarde gate na brak provenance/hash fields.
2. Odrzucac payloady mutacji bez `expectedRevision`.

## 13. Non-goals

1. Spec nie definiuje retail runtime semantyki nierozstrzygnietych pol drzwi (`TransitionDestination/LinkedToModule`) ponad preserve-first.
2. Spec nie zastępuje parser parity testow C++/Python; definiuje kontrakt API dla backend->frontend.
3. Spec nie wymaga zapisu nowych GUID bezposrednio do GFF.

## 14. Acceptance criteria (R63)

1. Backend potrafi wygenerowac `areaInstanceId`, `instanceId`, `instanceRevisionId`, `areaRevision` deterministycznie dla tego samego inputu.
2. Kazda encja `placeable/door/creature` ma pelne `SourceProvenance`.
3. Frontend dostaje jawny most: `instanceId` (UI) + `instanceAddressId` (write target).
4. Revision gate pozostaje kompatybilny z `expectedRevision`.
5. Alias/provenance/preserve-only pola nie sa tracone w hash/versioning.
