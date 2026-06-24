# Economy, Crafting, Progression

## Source Status

- `docs-verified`: NWN Lexicon Money, Stores, Experience, Item Creation, and related function pages for scripting semantics.
- `docs-verified`: NWNWiki/Fandom Craft Armor, Craft Weapon, and Craft Trap pages for default skill behavior and Toolset/player-facing constraints.
- `docs-verified`: NWNX:EE Store and SkillRanks docs for NWNX-only economy/progression controls.
- `runtime-tested`: required before claiming reward rates, sink rates, shop prices, crafting yields, progression pace, or exploit resistance are safe.

## What This Domain Controls

XP, gold, item sinks, item sources, crafting inputs and outputs, crafting failure costs, vendor stock, vendor buy/sell prices, store gold, identify cost, progression pacing, level gates, skill/feat unlocks, inflation control, repeatable rewards, farming pressure, and live-ops knobs.

## Source-Backed Facts To Preserve

- NWN Lexicon has dedicated Money, Stores, Experience, and Item Creation function categories.
- `GetGold` returns the amount of gold a creature possesses.
- `HasGold` checks whether a holder has at least a given amount and does not remove gold.
- `GiveGoldToCreature` creates gold on the target creature; it does not transfer gold from the caller.
- `TakeGoldFromCreature` can destroy gold when `bDestroy` is TRUE; when the caller is a module or area, it can fail unless assigned/executed through another object.
- Money helpers include party reward variants such as `GiveGoldToAll`, `GiveGoldToAllEqually`, `RewardGP`, and `RewardPartyGP`.
- `GetGoldPieceValue` returns item value, but unidentified items return base cost and plot/low-stack items can produce zero-value edge cases.
- Store functions include gold supply, identify cost, max buy price, infinite-stock flags, and `OpenStore`.
- Stores do not use gold by default; stores that use gold buy only items they can afford, while stores without gold can buy any price unless a max buy price is set.
- Store gold changes automatically after transactions and identify payments.
- `SetStoreGold` can set a store's gold or use `-1` for unlimited/no store-gold behavior.
- `SetStoreMaxBuyPrice` limits the maximum amount a store will pay; default behavior has no max buy price.
- Infinite store items remain available after purchase; non-infinite items disappear when bought.
- Experience functions include direct XP, party XP, journal XP, reward table, and set-XP helpers.
- `GiveXPToCreature` grants XP adjusted by multiclass penalty and cannot grant negative XP.
- `GiveXPToCreature` does nothing for NPCs and Dungeon Masters.
- `SetXP` sets a PC's total XP, can lower XP, bypasses multiclass and party penalties, and is the required lane for XP loss.
- `GetXP` returns PC XP; non-PC creatures return 0.
- `GetJournalQuestExperience` returns XP from a Journal Editor category and `AddJournalQuestEntry` does not automatically award that XP.
- NWNWiki/Fandom Craft Armor and Craft Weapon both require Hordes of the Underdark and are Intelligence-based skills.
- Default Craft Armor cannot create most magical armor, but supports some special-material outcomes and armor appearance modification.
- Default Craft Weapon cannot create most magical weapons, but can modify weapon appearance and craft weapons/components from raw material.
- Craft Armor and Craft Weapon appearance changes charge gold even when the skill check fails.
- A modified Craft Armor or Craft Weapon score of 6 can cause destroyed creatures/placeables/doors to drop basic crafting material based on appearance.
- Craft Trap can create trap kits from components, uses the crafting radial conversation, and failed rolls have a chance to lose components.
- Craft Trap kits are flagged as stolen like recovered traps, which affects merchant sale behavior.
- NWN Lexicon item-creation helpers include CraftBrewPotion, scribe-scroll checks, brew-potion checks, craft item skill checks, item copy/create helpers, and treasure creation helpers.
- `CIUseCraftItemSkill` uses `x2_inc_craft`, performs a skill check against a DC, and creates the requested item in the crafter's inventory on success.
- `CICraftCheckBrewPotion` and `CICraftCheckScribeScroll` check feats, spell restrictions, XP, gold, and target item assumptions, remove XP/gold on success, and are meant for spellhook/spell-script context.
- `CraftBrewPotion` directly creates a potion object and does not itself require the creator to have Brew Potion or pay gold/XP.
- NWNX:EE Store exposes NWNX-only store markup/markdown, black-market markdown, restricted-base-item purchase status, and current customer count helpers.
- NWNX:EE SkillRanks can modify or create skill-related feats, change skill focus values, and apply skill modifiers, including area modifiers, but requires 2DA/script integration and NWNX runtime.

## Design Questions

- What are the faucet lanes: monster drops, quest rewards, daily rewards, gathering, crafting, vendors, events, DM tools, loot chests, or imports?
- What are the sink lanes: vendor purchases, identify fees, crafting costs, repairs, teleport fees, taxes, consumables, housing, cosmetics, death penalties, auction fees, or decay?
- Which rewards are one-time, repeatable, party-shared, account-bound, character-bound, server-global, seasonal, or event-limited?
- What prevents low-level repeatable content from becoming the best gold/XP/material farm forever?
- What prevents high-level drops, crafted items, or shop stock from trivializing combat, progression, or other players' effort?
- Which values are Toolset-authored, 2DA-authored, script-authored, database-authored, or NWNX-authored?
- Do stores use finite gold, max buy price, identify cost, infinite stock, restricted base-item buys, markup/markdown, black-market rates, or custom sale filters?
- Does crafting consume all required inputs atomically, handle failure costs, prevent duplicate outputs, and survive relog/restart/rollback?
- Does progression use vanilla XP, quest XP, custom XP variables, trainer gates, level caps, database progression, 2DA edits, or NWNX SkillRanks?
- What telemetry proves economy health: gold per hour, XP per hour, sink/source ratio, crafted item volume, vendor buybacks, top farms, item age, and account-level wealth distribution?

## Implementation Path

1. Define source/sink tables before adding rewards: lane, trigger, amount, frequency, eligibility, party/account rules, cooldown, and evidence.
2. Define progression pace: target hours per level/tier, expected party size, quest/run cadence, catch-up rules, and death/repair penalties.
3. Define store policy: stock ownership, infinite flags, store gold, max buy price, identify cost, buy filters, markup/markdown, and restock/reset rules.
4. Define crafting recipe contracts: inputs, station/tool, skill/feat, DC, failure cost, output resref/tag, quality range, bind/trade policy, and sink/source impact.
5. Use `HasGold`/`GetGold` checks before taking gold, and use `TakeGoldFromCreature(..., TRUE)` when a real sink should destroy currency.
6. Re-check gold, items, quest state, and inventory fit in action scripts immediately before rewards or crafting output.
7. Treat `GiveGoldToCreature`, direct item creation, and `CraftBrewPotion` as source creation paths that need explicit economy justification.
8. Treat `SetXP` as a policy-sensitive override because it bypasses normal XP adjustment rules.
9. If using NWNX Store or SkillRanks, document the plugin dependency, 2DA changes, environment setup, and runtime fallback.
10. Add logging/audit points before public release: reward grants, vendor sales, store buybacks, crafting attempts, failures, output creation, and admin adjustments.

## Recommended Output Shape

For economy/crafting/progression tasks, produce:

1. Economy objective and target player tier.
2. Source/sink table.
3. Store/vendor policy table.
4. Crafting recipe and failure table.
5. XP/progression pacing table.
6. Bind/trade/drop/persistence policy.
7. Abuse and farming risk list.
8. Runtime telemetry and QA checklist.

## Runtime Verification

Check at least:

- gold and XP grants happen once per intended trigger;
- repeatable rewards obey cooldown, party, account, and eligibility rules;
- gold sinks actually remove currency rather than move it to the wrong object;
- store gold, max buy price, identify cost, infinite stock, and markups behave as designed;
- crafted inputs are consumed once, failure costs are applied, and outputs cannot duplicate;
- crafting output uses correct resref/tag/properties and handles full inventory;
- player cannot use trade/drop/relog/disconnect to bypass a cost or repeat a reward;
- quest XP, journal XP, and direct XP do not double-award;
- low-level and high-level farms match target gold/XP/material per hour;
- relog, restart, rollback, and migration preserve or intentionally reset economy state.

## Guardrails

- Do not call `GiveGoldToCreature` as if it transferred existing gold; it creates new currency.
- Do not take gold from module/area context without assigning/executing through a valid object.
- Do not rely on store defaults for persistent-world economy; define store gold and max buy price intentionally.
- Do not set infinite stock on progression-relevant items without a sink and anti-farm reason.
- Do not use `SetXP` for ordinary rewards unless bypassing normal XP rules is the explicit design.
- Do not assume journal XP is awarded by adding a journal entry.
- Do not treat default NWN crafting as a full server crafting economy without recipe, sink, and telemetry design.
- Do not use NWNX Store or SkillRanks helpers without labeling them NWNX-only and verifying plugin availability.
- Do not promote economy settings without runtime data from representative players or simulated reward loops.

## Sources

- NWN Lexicon Money Functions: https://nwnlexicon.com/Categoryfunction.money.html
- NWN Lexicon Stores Functions: https://nwnlexicon.com/Category%3AStores_Functions
- NWN Lexicon Experience Functions: https://nwnlexicon.com/Category%3AExperience_Functions
- NWN Lexicon Item Creation Functions: https://nwnlexicon.com/Category%3AItem_Creation_Functions
- NWN Lexicon GetGold: https://nwnlexicon.com/GetGold
- NWN Lexicon HasGold: https://nwnlexicon.com/HasGold
- NWN Lexicon GiveGoldToCreature: https://nwnlexicon.com/GiveGoldToCreature
- NWN Lexicon TakeGoldFromCreature: https://nwnlexicon.com/TakeGoldFromCreature
- NWN Lexicon GetGoldPieceValue: https://nwnlexicon.com/GetGoldPieceValue
- NWN Lexicon GetStoreGold: https://www.nwnlexicon.com/GetStoreGold
- NWN Lexicon SetStoreGold: https://www.nwnlexicon.com/SetStoreGold
- NWN Lexicon GetStoreMaxBuyPrice: https://nwnlexicon.com/GetStoreMaxBuyPrice
- NWN Lexicon SetStoreMaxBuyPrice: https://nwnlexicon.com/SetStoreMaxBuyPrice
- NWN Lexicon SetInfiniteFlag: https://nwnlexicon.com/SetInfiniteFlag
- NWN Lexicon GiveXPToCreature: https://nwnlexicon.com/GiveXPToCreature
- NWN Lexicon GetXP: https://nwnlexicon.com/GetXP
- NWN Lexicon SetXP: https://nwnlexicon.com/SetXP
- NWN Lexicon GetJournalQuestExperience: https://nwnlexicon.com/GetJournalQuestExperience
- NWN Lexicon CIUseCraftItemSkill: https://nwnlexicon.com/CIUseCraftItemSkill
- NWN Lexicon CICraftCheckBrewPotion: https://nwnlexicon.com/CICraftCheckBrewPotion
- NWN Lexicon CICraftCheckScribeScroll: https://nwnlexicon.com/CICraftCheckScribeScroll
- NWN Lexicon CraftBrewPotion: https://nwnlexicon.com/CraftBrewPotion
- NWN Lexicon Base Item constants: https://nwnlexicon.com/Base_item
- NWN Lexicon Feat constants: https://nwnlexicon.com/FEAT
- NWNWiki/Fandom Craft Armor: https://nwn.fandom.com/wiki/Craft_armor
- NWNWiki/Fandom Craft Weapon: https://nwn.fandom.com/wiki/Craft_weapon
- NWNWiki/Fandom Craft Trap: https://nwn.fandom.com/wiki/Craft_trap
- NWNWiki/Fandom XP training system: https://nwn.fandom.com/wiki/XP_training_system
- NWNX:EE Store: https://nwnxee.github.io/unified/group__store.html
- NWNX:EE SkillRanks: https://nwnxee.github.io/unified/group__skillranks.html
