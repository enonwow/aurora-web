# Aurora UI Audit - Creature Properties

## Purpose
Capture the current Aurora `Creature Properties` UI surface from screenshots and map it to current `aurora-web` MVP scope decisions.

## Evidence Source
1. User-provided screenshots in this thread (Creature Properties window).
2. Tabs captured: `Basic`, `Statistics`, `Appearance`, `Classes`, `Skills`, `Scripts`, `Advanced`, `Feats`, `Spells`, `Special Abilities`, `Comments`.

## Aurora UI Surface (Observed)

### 1. Basic
1. Profile fields:
- `First Name`
- `Last Name`
- `Tag`
- `Race`
- `Appearance`
- `Phenotype`
- `Gender`
- `Description`
2. `Challenge Rating`
3. Portrait resource picker
4. `Conversation` + `No Interrupt`
5. Left preview panel + `Inventory...` button.

### 2. Statistics
1. Ability scores:
- `Strength`, `Dexterity`, `Constitution`, `Intelligence`, `Wisdom`, `Charisma`
- `Score`, `Racial Modifier`, `Total`, `Bonus`
2. Saves:
- `Fortitude`, `Reflex`, `Will` with base/modifier/bonus/total
3. Armor class block:
- `Natural AC`, `Base`, `Dexterity Bonus`, `Size Modifier`, `Total Armor Class`
4. Hit points block:
- `Base Hit Points`, `Hit Point Bonuses`, `Total Hit Points`
5. `Movement Rate`

### 3. Appearance
1. Body part selectors (head/neck/torso/pelvis and limb segments).
2. Extra selectors:
- `Wings`
- `Tail`
3. `Color...` action.

### 4. Classes
1. `Alignment`
2. Class rows with class + level selectors
3. `Default Package for Autolevelup`
4. `Levelup Wizard`

### 5. Skills
1. Skill table (`Skill`, `Rank`) with large skill list.

### 6. Scripts
1. Creature event script slots:
- `OnBlocked`
- `OnCombatRoundEnd`
- `OnConversation`
- `OnDamaged`
- `OnDeath`
- `OnDisturbed`
- `OnHeartbeat`
- `OnPerception`
- `OnPhysicalAttacked`
- `OnRested`
- `OnSpawn`
- `OnSpellCastAt`
- `OnUserDefined`
2. Extra actions:
- `Save Script Set`
- `Load Script Set`
- per-slot `...` and `Edit` actions.

### 7. Advanced
1. `Blueprint ResRef`
2. Interface flags:
- `Disarmable`
- `Plot`
- `Leaves Lootable Corpse`
- `No Permanent Death`
- `Immortal`
3. `Treasure Model`
4. `Corpse Decay Time (s)`
5. `Faction` + `Edit Factions`
6. Special fields:
- `Subrace`
- `Deity`
- `Apply Template`
7. Challenge rating block:
- `Calculated`
- `Adjustment`
- `Challenge Rating`
8. `Sound Set`
9. `Perception Range`
10. `Variables`

### 8. Feats
1. Feat table with assignment control.
2. Feat filter selector.
3. Feats selection summary.

### 9. Spells
1. Spell table:
- `Prepared`
- `Name`
- `Spell Level`
- `Casting Level`
2. Filters/selectors:
- `Spell Level`
- `Meta-Magic`
- class selection
3. Spell summary.
4. Actions:
- `Clear Class Spell List`
- `Save Class Spell List`
- `Load Class Spell List`

### 10. Special Abilities
1. Ability table:
- `Name`
- `Type`
- `Caster Level`
- `Uses`
2. Filter selector.
3. Special abilities summary.

### 11. Comments
1. Comments pane (toolset note area).

## MVP Mapping (Current Project Decisions)

### In MVP (now)
1. UX shell-first approach is allowed:
- full tab structure can exist now;
- non-MVP tabs/fields can be visible as read-only or marked `Planned`.
2. Creature script-slot assignment support (no full script editor).
3. Minimum creature property editing needed for flow continuity:
- identity/profile subset (`Name/Tag` baseline);
- runtime-critical fields required by contract/save flow;
- script-slot assignment from observed creature slot list.

### Not In MVP (post-MVP)
1. Full script authoring/editor flow (`Edit`, compile/search/wizard).
2. Full conversation authoring/editor flow.
3. Full gameplay authoring parity for:
- `Statistics`
- `Appearance` body-part tuning
- `Classes`
- `Skills`
- `Feats`
- `Spells`
- `Special Abilities`
- full `Advanced` matrix
- `Comments` parity behavior
4. `Save Script Set` / `Load Script Set` parity behavior.

## Gaps To Track Against MVP
1. Define exact MVP subset of creature non-script fields.
2. Define behavior contract for non-MVP tabs in UX shell mode (`read-only`, `coming soon`, or hidden by role).
3. Define backend validation for creature script-slot assignment and persistence/reload parity.
4. Add dedicated tests for creature script-slot assignment and save/reopen integrity.

## UX Modernization Notes
1. Keep Aurora tab coverage as information architecture baseline.
2. Replace dense legacy forms with progressive disclosure and grouped sections.
3. Keep a stable left preview + right properties pattern for muscle memory.
4. Keep non-destructive editing continuity (no area reload after property changes).
